<?php

namespace App\Services;

use App\Models\Committee;
use App\Models\CommitteeAssignment;
use App\Models\DefenseSession;
use App\Models\DoctorAvailability;
use App\Models\AcademicStageConfig;
use App\Models\Project;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CommitteeService
{
    public const MIN_MEMBERS = 2;
    public const MAX_MEMBERS = 5;

    public function __construct(
        protected NotificationService $notifications,
    ) {
    }

    public function create(User $admin, array $data): Committee
    {
        $members = $data['members'] ?? [];
        $this->assertMemberCount($members);

        $universityId = (int) $admin->university_id;
        $this->assertUniqueName($universityId, $data['name']);
        $this->assertSingleChair($members);

        return DB::transaction(function () use ($admin, $data, $members, $universityId) {
            $committee = Committee::create([
                'university_id' => $universityId,
                'name' => $data['name'],
                'description' => $data['description'] ?? null,
                'is_active' => true,
                'version' => 1,
            ]);

            foreach ($members as $member) {
                $user = $this->resolveSupervisor((int) $member['user_id'], $universityId);
                $role = $member['role'] ?? 'member';
                $this->assertNotInOtherActiveCommittee($user->id, $universityId);
                $committee->members()->attach($user->id, ['role' => $role]);
                $this->notifyMemberAdded($user, $committee, $role);
            }

            return $committee->load('members');
        });
    }

    public function update(Committee $committee, array $data, int $expectedVersion): Committee
    {
        if ((int) $committee->version !== $expectedVersion) {
            throw ValidationException::withMessages([
                'version' => ['Committee was modified by another user. Please refresh and try again.'],
            ]);
        }

        if (isset($data['name']) && $data['name'] !== $committee->name) {
            $this->assertUniqueName((int) $committee->university_id, $data['name'], $committee->id);
        }

        $committee->update([
            'name' => $data['name'] ?? $committee->name,
            'description' => array_key_exists('description', $data) ? $data['description'] : $committee->description,
            'version' => $committee->version + 1,
        ]);

        return $committee->fresh(['members']);
    }

    public function addMember(Committee $committee, User $user, string $role): Committee
    {
        if ($committee->members()->count() >= self::MAX_MEMBERS) {
            throw ValidationException::withMessages([
                'members' => ['Committee already has maximum 5 members.'],
            ]);
        }

        if ($committee->members()->where('users.id', $user->id)->exists()) {
            throw ValidationException::withMessages([
                'user_id' => ['User is already a member of this committee.'],
            ]);
        }

        $this->resolveSupervisor($user->id, (int) $committee->university_id);
        $this->assertNotInOtherActiveCommittee($user->id, (int) $committee->university_id, $committee->id);

        if ($role === 'chair' && $committee->members()->wherePivot('role', 'chair')->exists()) {
            throw ValidationException::withMessages([
                'role' => ['Committee already has a chair. Demote existing chair first.'],
            ]);
        }

        $committee->members()->attach($user->id, ['role' => $role]);
        $this->bumpVersion($committee);
        $this->notifyMemberAdded($user, $committee, $role);

        return $committee->fresh(['members']);
    }

    public function removeMember(Committee $committee, User $user): Committee
    {
        if ($committee->members()->count() <= self::MIN_MEMBERS) {
            throw ValidationException::withMessages([
                'members' => ['Committee must have at least 2 members.'],
            ]);
        }

        if (!$committee->members()->where('users.id', $user->id)->exists()) {
            throw ValidationException::withMessages([
                'user_id' => ['User is not a member of this committee.'],
            ]);
        }

        $committee->members()->detach($user->id);
        $this->bumpVersion($committee);
        $this->notifyMemberRemoved($user, $committee);

        return $committee->fresh(['members']);
    }

    public function updateMemberRole(Committee $committee, User $user, string $role): array
    {
        if (!$committee->members()->where('users.id', $user->id)->exists()) {
            throw ValidationException::withMessages([
                'user_id' => ['User is not a member of this committee.'],
            ]);
        }

        $demotedMember = null;

        if ($role === 'chair') {
            $existingChair = $committee->members()->wherePivot('role', 'chair')->first();
            if ($existingChair && $existingChair->id !== $user->id) {
                $committee->members()->updateExistingPivot($existingChair->id, ['role' => 'member']);
                $demotedMember = $existingChair->fresh();
            }
        }

        $committee->members()->updateExistingPivot($user->id, ['role' => $role]);
        $this->bumpVersion($committee);

        if ($role === 'chair') {
            $this->notifications->notifyUser(
                $user,
                'committee_role_changed',
                'Committee role updated',
                sprintf('Your role in committee "%s" has been updated to chair.', $committee->name),
                [
                    'committee_id' => $committee->id,
                    'committee_name' => $committee->name,
                    'role' => $role,
                    'url' => '/dashboard/committees',
                ]
            );
        }

        return [
            'committee' => $committee->fresh(['members']),
            'demoted_member' => $demotedMember,
        ];
    }

    public function deactivate(Committee $committee): Committee
    {
        $upcomingCount = $committee->defenseSessions()
            ->where('status', 'scheduled')
            ->where(function ($query) {
                $query->whereDate('scheduled_date', '>=', now()->toDateString())
                    ->orWhereNull('scheduled_date');
            })
            ->count();

        if ($upcomingCount > 0) {
            throw ValidationException::withMessages([
                'committee' => [
                    "Committee is assigned to {$upcomingCount} upcoming defense session(s). Please reassign them first.",
                ],
            ]);
        }

        $committee->update(['is_active' => false]);

        return $committee->fresh();
    }

    public function reactivate(Committee $committee): Committee
    {
        $activeMemberCount = $committee->members()
            ->where('users.status', 'active')
            ->count();

        if ($activeMemberCount < self::MIN_MEMBERS) {
            throw ValidationException::withMessages([
                'members' => ['Committee must have at least 2 active members before reactivation.'],
            ]);
        }

        foreach ($committee->members as $member) {
            $this->assertNotInOtherActiveCommittee($member->id, (int) $committee->university_id, $committee->id);
        }

        $committee->update(['is_active' => true]);

        return $committee->fresh(['members']);
    }

    public function validateNoSupervisorConflict(Committee $committee, Project $project): void
    {
        if (!$project->supervisor_id) {
            return;
        }

        $conflictingMember = $committee->members()
            ->where('users.id', $project->supervisor_id)
            ->first();

        if ($conflictingMember) {
            throw ValidationException::withMessages([
                'committee_id' => [
                    "Committee member '{$conflictingMember->name}' is the project supervisor. Please select a different committee.",
                ],
            ]);
        }
    }

    public function assignCommitteeToDefense(DefenseSession $defense, Committee $committee): DefenseSession
    {
        if (!$committee->is_active) {
            throw ValidationException::withMessages([
                'committee_id' => ['Committee is inactive and cannot be assigned.'],
            ]);
        }

        if ($committee->members()->count() < self::MIN_MEMBERS) {
            throw ValidationException::withMessages([
                'committee_id' => ['Committee must have at least 2 members.'],
            ]);
        }

        $defense->loadMissing('project');
        $this->validateNoSupervisorConflict($committee, $defense->project);

        return DB::transaction(function () use ($defense, $committee) {
            $defense->update(['committee_id' => $committee->id]);

            CommitteeAssignment::where('defense_session_id', $defense->id)->delete();

            foreach ($committee->members as $member) {
                CommitteeAssignment::create([
                    'defense_session_id' => $defense->id,
                    'user_id' => $member->id,
                ]);
            }

            return $defense->fresh(['committee.members', 'project', 'room']);
        });
    }

    public function getActiveCommittees(int $universityId): Collection
    {
        return Committee::query()
            ->where('university_id', $universityId)
            ->where('is_active', true)
            ->with('members:id,name,email')
            ->get()
            ->filter(fn (Committee $committee) => $committee->members->count() >= self::MIN_MEMBERS)
            ->values();
    }

    public function countCommitteeMembersWithStageAvailability(int $universityId, int $stageId): int
    {
        $memberIds = $this->getActiveCommittees($universityId)
            ->flatMap(fn (Committee $committee) => $committee->members->pluck('id'))
            ->unique()
            ->values();

        if ($memberIds->isEmpty()) {
            return 0;
        }

        return User::query()
            ->whereIn('id', $memberIds)
            ->whereHas('availabilities', fn ($q) => $q->where('academic_stage_id', $stageId))
            ->count();
    }

    public function countCommitteesWithCommonAvailability(int $universityId, int $stageId): int
    {
        return $this->getActiveCommittees($universityId)
            ->filter(function (Committee $committee) use ($stageId) {
                $availability = $this->getCommitteeAvailability($committee, $stageId);

                return !empty($availability['common_availability']);
            })
            ->count();
    }

    public function hasSchedulableCommitteeAvailability(int $universityId, AcademicStageConfig $stage): bool
    {
        return $this->getActiveCommittees($universityId)->isNotEmpty();
    }

    public function getCommitteeAvailability(Committee $committee, ?int $academicStageId = null): array
    {
        $committee->load('members');
        $memberIds = $committee->members->pluck('id')->all();
        $memberCount = count($memberIds);

        if ($memberCount === 0) {
            return [
                'committee_id' => $committee->id,
                'committee_name' => $committee->name,
                'member_count' => 0,
                'academic_stage_id' => $academicStageId,
                'common_availability' => [],
                'member_availability' => [],
            ];
        }

        $commonSlotsQuery = DoctorAvailability::query()->whereIn('user_id', $memberIds);

        if ($academicStageId !== null) {
            $commonSlotsQuery->where('academic_stage_id', $academicStageId);
        }

        $commonSlots = $commonSlotsQuery
            ->select('day_of_week', 'start_time', 'end_time')
            ->groupBy('day_of_week', 'start_time', 'end_time')
            ->havingRaw('COUNT(DISTINCT user_id) = ?', [$memberCount])
            ->get()
            ->map(fn ($slot) => [
                'day_of_week' => (int) $slot->day_of_week,
                'day_name' => $this->dayName((int) $slot->day_of_week),
                'start_time' => substr((string) $slot->start_time, 0, 5),
                'end_time' => substr((string) $slot->end_time, 0, 5),
            ])
            ->values()
            ->all();

        $memberAvailability = $committee->members->map(function (User $member) use ($academicStageId) {
            $memberQuery = DoctorAvailability::query()->where('user_id', $member->id);

            if ($academicStageId !== null) {
                $memberQuery->where('academic_stage_id', $academicStageId);
            }

            $slots = $memberQuery
                ->get()
                ->map(fn ($slot) => [
                    'day_of_week' => (int) $slot->day_of_week,
                    'start_time' => substr((string) $slot->start_time, 0, 5),
                    'end_time' => substr((string) $slot->end_time, 0, 5),
                ])
                ->values()
                ->all();

            return [
                'user_id' => $member->id,
                'name' => $member->name,
                'slots' => $slots,
            ];
        })->values()->all();

        return [
            'committee_id' => $committee->id,
            'committee_name' => $committee->name,
            'member_count' => $memberCount,
            'academic_stage_id' => $academicStageId,
            'common_availability' => $commonSlots,
            'member_availability' => $memberAvailability,
        ];
    }

    public function getAvailableSupervisors(int $universityId, ?int $excludeCommitteeId = null): Collection
    {
        $busyUserIds = Committee::query()
            ->where('university_id', $universityId)
            ->where('is_active', true)
            ->when($excludeCommitteeId, fn ($query) => $query->where('id', '!=', $excludeCommitteeId))
            ->with('members:id')
            ->get()
            ->flatMap(fn (Committee $committee) => $committee->members->pluck('id'))
            ->unique()
            ->values()
            ->all();

        return User::query()
            ->where('status', 'active')
            ->whereHas('role', fn ($q) => $q->where('name', 'supervisor'))
            ->where(function ($query) use ($universityId) {
                $query->where('university_id', $universityId)
                    ->orWhereHas('supervisorUniversities', function ($q) use ($universityId) {
                        $q->where('universities.id', $universityId)
                            ->where('supervisor_universities.status', 'active');
                    });
            })
            ->when(count($busyUserIds) > 0, fn ($query) => $query->whereNotIn('id', $busyUserIds))
            ->select('id', 'name', 'email', 'university_id')
            ->orderBy('name')
            ->get();
    }

    public function hasUpcomingDefenses(Committee $committee): bool
    {
        return $committee->defenseSessions()
            ->where('status', 'scheduled')
            ->where(function ($query) {
                $query->whereDate('scheduled_date', '>=', now()->toDateString())
                    ->orWhereNull('scheduled_date');
            })
            ->exists();
    }

    private function resolveSupervisor(int $userId, int $universityId): User
    {
        $supervisor = User::query()
            ->where('id', $userId)
            ->where('status', 'active')
            ->whereHas('role', fn ($q) => $q->where('name', 'supervisor'))
            ->where(function ($query) use ($universityId) {
                $query->where('university_id', $universityId)
                    ->orWhereHas('supervisorUniversities', function ($q) use ($universityId) {
                        $q->where('universities.id', $universityId)
                            ->where('supervisor_universities.status', 'active');
                    });
            })
            ->first();

        if (!$supervisor) {
            throw ValidationException::withMessages([
                'members' => ['User is not a supervisor in this university.'],
            ]);
        }

        return $supervisor;
    }

    private function assertMemberCount(array $members): void
    {
        $count = count($members);

        if ($count < self::MIN_MEMBERS || $count > self::MAX_MEMBERS) {
            throw ValidationException::withMessages([
                'members' => ['Committee must have between 2 and 5 members.'],
            ]);
        }
    }

    private function assertUniqueName(int $universityId, string $name, ?int $excludeId = null): void
    {
        $query = Committee::withoutGlobalScopes()
            ->where('university_id', $universityId)
            ->where('name', $name);

        if ($excludeId) {
            $query->where('id', '!=', $excludeId);
        }

        if ($query->exists()) {
            throw ValidationException::withMessages([
                'name' => ['The name has already been taken.'],
            ]);
        }
    }

    private function assertSingleChair(array $members): void
    {
        $chairs = array_filter($members, fn ($member) => ($member['role'] ?? 'member') === 'chair');

        if (count($chairs) > 1) {
            throw ValidationException::withMessages([
                'members' => ['Only one committee member can be designated as chair.'],
            ]);
        }
    }

    private function assertNotInOtherActiveCommittee(int $userId, int $universityId, ?int $excludeCommitteeId = null): void
    {
        $exists = Committee::query()
            ->where('university_id', $universityId)
            ->where('is_active', true)
            ->when($excludeCommitteeId, fn ($query) => $query->where('id', '!=', $excludeCommitteeId))
            ->whereHas('members', fn ($query) => $query->where('users.id', $userId))
            ->exists();

        if ($exists) {
            throw ValidationException::withMessages([
                'user_id' => ['This supervisor is already assigned to another active committee. Deactivate that committee first.'],
            ]);
        }
    }

    private function notifyMemberAdded(User $user, Committee $committee, string $role): void
    {
        $this->notifications->notifyUser(
            $user,
            'committee_member_added',
            'Added to committee',
            sprintf('You have been added to committee "%s" as %s.', $committee->name, $role),
            [
                'committee_id' => $committee->id,
                'committee_name' => $committee->name,
                'role' => $role,
                'url' => '/dashboard/committees',
            ]
        );
    }

    private function notifyMemberRemoved(User $user, Committee $committee): void
    {
        $this->notifications->notifyUser(
            $user,
            'committee_member_removed',
            'Removed from committee',
            sprintf('You have been removed from committee "%s".', $committee->name),
            [
                'committee_id' => $committee->id,
                'committee_name' => $committee->name,
                'url' => '/dashboard/committees',
            ]
        );
    }

    private function dayName(int $dayOfWeek): string
    {
        $days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

        return $days[$dayOfWeek] ?? 'Unknown';
    }

    private function bumpVersion(Committee $committee): void
    {
        $committee->increment('version');
    }
}

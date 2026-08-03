<?php

namespace App\Services;

use App\Models\Project;
use App\Models\ProjectProposal;
use App\Models\StudentInvitation;
use App\Models\SupervisorInvitation;
use App\Models\Track;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ProjectProposalService
{
    public const MAX_PROPOSALS_PER_STUDENT = 3;

    public function __construct(
        protected NotificationService $notifications,
        protected TrackService $trackService,
    ) {
    }

    public function submit(User $student, array $data): ProjectProposal
    {
        return DB::transaction(function () use ($student, $data) {
            $this->assertStudentCanSubmit($student, lock: true);
            $this->assertTrackStageProvided($student, $data);

            if (!empty($data['track_stage_id'])) {
                // Validate only — do not assign track until a proposal is approved.
                $this->trackService->assertPrerequisitesMet($student, (int) $data['track_stage_id']);
                $this->trackService->assertStageIsCurrentForStudent($student, (int) $data['track_stage_id']);
            }

            $supervisor = $this->resolveSupervisor(
                (int) $data['requested_supervisor_id'],
                (int) $student->university_id
            );

            $proposal = ProjectProposal::create([
                'university_id' => $student->university_id,
                'student_id' => $student->id,
                'requested_supervisor_id' => $supervisor->id,
                'title' => $data['title'],
                'description' => $data['description'],
                'status' => 'pending',
                'track_stage_id' => $data['track_stage_id'] ?? null,
                'resubmission_count' => 0,
            ]);

            $proposal->load(['student', 'requestedSupervisor']);

            $this->notifications->notifyUser(
                $supervisor,
                'proposal_submitted',
                'New project proposal',
                sprintf('New project proposal from %s: %s', $student->name, $proposal->title),
                [
                    'proposal_id' => $proposal->id,
                    'student_name' => $student->name,
                    'title' => $proposal->title,
                    'url' => '/dashboard/proposal-review',
                ]
            );

            return $proposal;
        });
    }

    public function getAvailableSupervisors(int $universityId): Collection
    {
        return $this->supervisorsAvailableForUniversityQuery(User::query(), $universityId)
            ->withCount([
                'receivedProposals as pending_proposals_count' => fn ($q) => $q->where('status', 'pending'),
            ])
            ->select('id', 'name', 'email', 'university_id')
            ->orderBy('name')
            ->get();
    }

    public function getProposalsForStudent(User $student, ?string $status = null, int $perPage = 15): LengthAwarePaginator
    {
        $query = ProjectProposal::query()
            ->where('student_id', $student->id)
            ->with(['requestedSupervisor:id,name,email', 'project:id,proposal_id,title']);

        if ($status) {
            $query->where('status', $status);
        }

        return $query->orderByDesc('created_at')->paginate($perPage);
    }

    public function getProposalsForSupervisor(User $supervisor, ?string $status = null, int $perPage = 15): LengthAwarePaginator
    {
        $query = ProjectProposal::query()
            ->where('requested_supervisor_id', $supervisor->id)
            ->with(['student:id,name,email']);

        if ($status) {
            $query->where('status', $status);
        }

        return $query->orderByDesc('created_at')->paginate($perPage);
    }

    public function getAllProposals(User $admin, ?string $status = null, int $perPage = 15): LengthAwarePaginator
    {
        $query = ProjectProposal::query()
            ->with([
                'student:id,name,email',
                'requestedSupervisor:id,name,email',
            ]);

        if ($status) {
            $query->where('status', $status);
        }

        return $query->orderByDesc('created_at')->paginate($perPage);
    }

    public function approve(ProjectProposal $proposal, User $supervisor): array
    {
        $this->assertSupervisorOwnsProposal($proposal, $supervisor);

        if ($proposal->status !== 'pending') {
            throw ValidationException::withMessages([
                'status' => ['proposal_not_pending'],
            ]);
        }

        return DB::transaction(function () use ($proposal, $supervisor) {
            $student = User::query()->findOrFail($proposal->student_id);

            if ($proposal->track_stage_id) {
                $stageId = (int) $proposal->track_stage_id;
                $this->trackService->assertPrerequisitesMet($student, $stageId);
                $this->trackService->assertStageIsCurrentForStudent($student, $stageId);
                $this->trackService->autoAssignTrack($student, $stageId);
            }

            $proposal->update(['status' => 'approved']);

            $project = Project::create([
                'title' => $proposal->title,
                'description' => $proposal->description,
                'user_id' => $proposal->student_id,
                'supervisor_id' => $supervisor->id,
                'university_id' => $proposal->university_id,
                'proposal_id' => $proposal->id,
                'status' => 'pending',
            ]);

            $this->deleteSiblingProposals($proposal);

            $proposal->load(['student', 'requestedSupervisor', 'project']);

            $this->notifications->notifyUser(
                $proposal->student,
                'proposal_approved',
                'Proposal approved',
                sprintf("Your proposal '%s' has been approved!", $proposal->title),
                [
                    'proposal_id' => $proposal->id,
                    'project_id' => $project->id,
                    'title' => $proposal->title,
                    'url' => '/dashboard/projects/' . $project->id,
                ]
            );

            return [
                'proposal' => $proposal->fresh(['student', 'requestedSupervisor', 'project']),
                'project' => $project,
            ];
        });
    }

    public function reject(ProjectProposal $proposal, User $supervisor, ?string $feedback = null): ProjectProposal
    {
        $this->assertSupervisorOwnsProposal($proposal, $supervisor);

        if ($proposal->status !== 'pending') {
            throw ValidationException::withMessages([
                'status' => ['proposal_not_pending'],
            ]);
        }

        $proposal->update([
            'status' => 'rejected',
            'supervisor_feedback' => $feedback,
        ]);

        $proposal->load(['student', 'requestedSupervisor']);

        $this->notifications->notifyUser(
            $proposal->student,
            'proposal_rejected',
            'Proposal requires changes',
            sprintf("Your proposal '%s' requires changes - see feedback", $proposal->title),
            [
                'proposal_id' => $proposal->id,
                'title' => $proposal->title,
                'url' => '/dashboard/proposals',
            ]
        );

        return $proposal->fresh(['student', 'requestedSupervisor']);
    }

    public function delete(ProjectProposal $proposal, User $student): void
    {
        if ((int) $proposal->student_id !== (int) $student->id) {
            abort(403, 'You do not have permission to delete this proposal.');
        }

        if ($proposal->status === 'approved') {
            throw ValidationException::withMessages([
                'status' => ['proposal_cannot_delete_approved'],
            ]);
        }

        DB::transaction(function () use ($proposal, $student) {
            $trackStageId = $proposal->track_stage_id
                ? (int) $proposal->track_stage_id
                : null;

            $this->purgeProposalAndRelated($proposal);
            $this->trackService->releaseTrackAssignmentIfProposalWithdrawn(
                $student->fresh(),
                $trackStageId,
            );
        });
    }

    public function countActiveProposals(User $student): int
    {
        return ProjectProposal::query()
            ->where('student_id', $student->id)
            ->whereIn('status', ['pending', 'rejected'])
            ->count();
    }

    public function canResubmit(ProjectProposal $proposal): bool
    {
        return $proposal->status === 'rejected' && $proposal->resubmission_count < 3;
    }

    public function resubmit(ProjectProposal $proposal, User $student, array $data): ProjectProposal
    {
        if ($proposal->student_id !== $student->id) {
            abort(403, 'You do not have permission to update this proposal.');
        }

        if ($proposal->status !== 'rejected') {
            throw ValidationException::withMessages([
                'status' => ['proposal_not_rejected'],
            ]);
        }

        return DB::transaction(function () use ($proposal, $student, $data) {
            $this->assertTrackStageProvided($student, $data);

            if (!empty($data['track_stage_id'])) {
                // Validate only — track assignment happens on approve.
                $this->trackService->assertPrerequisitesMet($student, (int) $data['track_stage_id']);
                $this->trackService->assertStageIsCurrentForStudent($student, (int) $data['track_stage_id']);
            }

            $supervisorId = isset($data['requested_supervisor_id'])
                ? (int) $data['requested_supervisor_id']
                : (int) $proposal->requested_supervisor_id;

            $supervisorChanged = $supervisorId !== (int) $proposal->requested_supervisor_id;
            $supervisor = $this->resolveSupervisor($supervisorId, (int) $student->university_id);

            if (!$supervisorChanged && !$this->canResubmit($proposal)) {
                throw ValidationException::withMessages([
                    'resubmission' => ['max_resubmissions_reached'],
                ]);
            }

            if ($supervisorChanged) {
                $priorRejections = ProjectProposal::query()
                    ->where('student_id', $student->id)
                    ->where('requested_supervisor_id', $supervisorId)
                    ->where('id', '!=', $proposal->id)
                    ->where('status', 'rejected')
                    ->count();

                if ($priorRejections >= 3) {
                    throw ValidationException::withMessages([
                        'resubmission' => ['max_resubmissions_reached'],
                    ]);
                }
            }

            $nextCount = $supervisorChanged ? 0 : $proposal->resubmission_count + 1;

            $proposal->update([
                'title' => $data['title'],
                'description' => $data['description'],
                'requested_supervisor_id' => $supervisor->id,
                'status' => 'pending',
                'track_stage_id' => $data['track_stage_id'] ?? $proposal->track_stage_id,
                'resubmission_count' => $nextCount,
                'supervisor_feedback' => null,
            ]);

            $proposal->load(['student', 'requestedSupervisor']);

            $this->notifications->notifyUser(
                $supervisor,
                'proposal_submitted',
                'Proposal resubmitted',
                sprintf('Proposal resubmitted by %s: %s', $student->name, $proposal->title),
                [
                    'proposal_id' => $proposal->id,
                    'student_name' => $student->name,
                    'title' => $proposal->title,
                    'resubmission_count' => $proposal->resubmission_count,
                    'url' => '/dashboard/proposal-review',
                ]
            );

            return $proposal->fresh(['student', 'requestedSupervisor']);
        });
    }

    public function reassign(ProjectProposal $proposal, int $newSupervisorId): ProjectProposal
    {
        if ($proposal->status !== 'pending') {
            throw ValidationException::withMessages([
                'status' => ['proposal_not_pending'],
            ]);
        }

        $supervisor = $this->resolveSupervisor($newSupervisorId, (int) $proposal->university_id);
        $oldSupervisorId = (int) $proposal->requested_supervisor_id;

        $proposal->update(['requested_supervisor_id' => $supervisor->id]);
        $proposal->load(['student', 'requestedSupervisor']);

        if ($proposal->student) {
            $this->notifications->notifyUser(
                $proposal->student,
                'proposal_reassigned',
                'Proposal reassigned',
                sprintf("Your proposal '%s' has been reassigned to %s", $proposal->title, $supervisor->name),
                [
                    'proposal_id' => $proposal->id,
                    'title' => $proposal->title,
                    'new_supervisor_id' => $supervisor->id,
                    'url' => '/dashboard/proposals',
                ]
            );
        }

        if ($supervisor->id !== $oldSupervisorId) {
            $this->notifications->notifyUser(
                $supervisor,
                'proposal_reassigned',
                'Proposal assigned to you',
                sprintf('Proposal "%s" has been assigned to you for review', $proposal->title),
                [
                    'proposal_id' => $proposal->id,
                    'title' => $proposal->title,
                    'url' => '/dashboard/proposal-review',
                ]
            );
        }

        return $proposal->fresh(['student', 'requestedSupervisor']);
    }

    public function userCanView(ProjectProposal $proposal, User $user): bool
    {
        $role = strtolower($user->role?->name ?? '');

        if ($role === 'admin' || $role === 'super_admin') {
            return (int) $proposal->university_id === (int) $user->university_id
                || $role === 'super_admin';
        }

        if ($role === 'student') {
            return (int) $proposal->student_id === (int) $user->id;
        }

        if ($role === 'supervisor') {
            return (int) $proposal->requested_supervisor_id === (int) $user->id;
        }

        return false;
    }

    private function assertStudentCanSubmit(User $student, bool $lock = false): void
    {
        if ($student->isGraduated()) {
            throw ValidationException::withMessages([
                'student' => ['graduated_cannot_submit'],
            ]);
        }

        $this->trackService->releaseTrackAssignmentIfProposalWithdrawn($student);
        $student->refresh();

        $this->assertProposalLimitNotReached($student, $lock);

        $projectQuery = Project::query()
            ->where('user_id', $student->id)
            ->whereNotIn('status', ['completed', 'cancelled', 'closed']);

        if ($lock) {
            $projectQuery->lockForUpdate();
        }

        if ($projectQuery->exists()) {
            throw ValidationException::withMessages([
                'project' => ['existing_active_project'],
            ]);
        }
    }

    private function assertProposalLimitNotReached(User $student, bool $lock = false): void
    {
        $query = ProjectProposal::query()
            ->where('student_id', $student->id)
            ->whereIn('status', ['pending', 'rejected']);

        if ($lock) {
            $query->lockForUpdate();
        }

        if ($query->count() >= self::MAX_PROPOSALS_PER_STUDENT) {
            throw ValidationException::withMessages([
                'proposal' => ['max_proposals_reached'],
            ]);
        }
    }

    private function deleteSiblingProposals(ProjectProposal $approvedProposal): void
    {
        ProjectProposal::query()
            ->where('student_id', $approvedProposal->student_id)
            ->where('id', '!=', $approvedProposal->id)
            ->get()
            ->each(fn (ProjectProposal $other) => $this->purgeProposalAndRelated($other));
    }

    private function purgeProposalAndRelated(ProjectProposal $proposal): void
    {
        $project = Project::query()->where('proposal_id', $proposal->id)->first();

        if ($project) {
            SupervisorInvitation::query()->where('project_id', $project->id)->delete();
            StudentInvitation::query()->where('project_id', $project->id)->delete();
            $project->delete();
        }

        $proposal->delete();
    }

    private function assertSupervisorOwnsProposal(ProjectProposal $proposal, User $supervisor): void
    {
        if ((int) $proposal->requested_supervisor_id !== (int) $supervisor->id) {
            abort(403, 'Only the targeted supervisor can perform this action.');
        }
    }

    private function resolveSupervisor(int $supervisorId, int $universityId): User
    {
        $supervisor = $this->supervisorsAvailableForUniversityQuery(User::query(), $universityId)
            ->whereKey($supervisorId)
            ->first();

        if (!$supervisor) {
            throw ValidationException::withMessages([
                'requested_supervisor_id' => ['The selected supervisor is not available.'],
            ]);
        }

        return $supervisor;
    }

    private function assertTrackStageProvided(User $student, array $data): void
    {
        $requiresStage = Track::query()
            ->where('university_id', $student->university_id)
            ->where('is_active', true)
            ->whereHas('stages')
            ->exists();

        if ($requiresStage && empty($data['track_stage_id'])) {
            throw ValidationException::withMessages([
                'track_stage_id' => ['track_stage_required'],
            ]);
        }
    }

    /** Active supervisors accepting supervision for a university. */
    private function supervisorsAvailableForUniversityQuery($query, int $universityId)
    {
        return $query
            ->where('status', 'active')
            ->whereHas('role', fn ($q) => $q->where('name', 'supervisor'))
            ->where(function ($outer) use ($universityId) {
                $outer->whereHas('supervisorUniversities', function ($q) use ($universityId) {
                    $q->where('universities.id', $universityId)
                        ->where('supervisor_universities.status', 'active')
                        ->where('supervisor_universities.accepting_supervision', true);
                })->orWhere(function ($direct) use ($universityId) {
                    $direct->where('university_id', $universityId)
                        ->whereDoesntHave('supervisorUniversities', function ($q) use ($universityId) {
                            $q->where('universities.id', $universityId);
                        });
                });
            });
    }
}

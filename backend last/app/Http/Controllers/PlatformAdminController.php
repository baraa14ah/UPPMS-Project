<?php

namespace App\Http\Controllers;

use App\Models\AcademicStageConfig;
use App\Models\ApprovedSchedule;
use App\Models\AvailableRoom;
use App\Models\Committee;
use App\Models\Project;
use App\Models\ProjectProposal;
use App\Models\Role;
use App\Models\Track;
use App\Models\University;
use App\Models\User;
use App\Services\UserDeletionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PlatformAdminController extends Controller
{
    /** Return platform-wide dashboard statistics including academic feature usage. */
    public function dashboardStats()
    {
        return response()->json([
            'stats' => [
                'universities' => University::query()->count(),
                'users' => User::query()
                    ->whereHas('role', fn ($q) => $q->where('name', '!=', 'super_admin'))
                    ->count(),
                'projects' => Project::query()->count(),
                'pending_users' => User::query()
                    ->where('status', 'pending')
                    ->whereHas('role', fn ($q) => $q->whereNotIn('name', ['super_admin', 'admin']))
                    ->count(),
                'tracks' => Track::withoutGlobalScopes()->count(),
                'active_tracks' => Track::withoutGlobalScopes()->where('is_active', true)->count(),
                'active_schedules' => ApprovedSchedule::withoutGlobalScopes()
                    ->where('status', 'active')
                    ->count(),
                'committees' => Committee::withoutGlobalScopes()->where('is_active', true)->count(),
                'pending_proposals' => ProjectProposal::withoutGlobalScopes()
                    ->where('status', 'pending')
                    ->count(),
                'defense_rooms' => AvailableRoom::withoutGlobalScopes()->count(),
                'defense_types' => AcademicStageConfig::withoutGlobalScopes()->count(),
            ],
            'universities_breakdown' => $this->universitiesOverview(),
        ]);
    }

    /** Public overview used by dashboard and universities listing. */
    public function universitiesOverview(): array
    {
        return $this->universitiesUsersBreakdown();
    }

    /** Build per-university user, project, and academic-feature breakdown. */
    private function universitiesUsersBreakdown(): array
    {
        $roleIds = Role::query()->pluck('id', 'name');

        $trackCounts = Track::withoutGlobalScopes()
            ->selectRaw('university_id, COUNT(*) as aggregate')
            ->groupBy('university_id')
            ->pluck('aggregate', 'university_id');

        $activeTrackCounts = Track::withoutGlobalScopes()
            ->selectRaw('university_id, COUNT(*) as aggregate')
            ->where('is_active', true)
            ->groupBy('university_id')
            ->pluck('aggregate', 'university_id');

        $scheduleCounts = ApprovedSchedule::withoutGlobalScopes()
            ->selectRaw('university_id, COUNT(*) as aggregate')
            ->where('status', 'active')
            ->groupBy('university_id')
            ->pluck('aggregate', 'university_id');

        $committeeCounts = Committee::withoutGlobalScopes()
            ->selectRaw('university_id, COUNT(*) as aggregate')
            ->where('is_active', true)
            ->groupBy('university_id')
            ->pluck('aggregate', 'university_id');

        $pendingProposalCounts = ProjectProposal::withoutGlobalScopes()
            ->selectRaw('university_id, COUNT(*) as aggregate')
            ->where('status', 'pending')
            ->groupBy('university_id')
            ->pluck('aggregate', 'university_id');

        $roomCounts = AvailableRoom::withoutGlobalScopes()
            ->selectRaw('university_id, COUNT(*) as aggregate')
            ->groupBy('university_id')
            ->pluck('aggregate', 'university_id');

        $stageCounts = AcademicStageConfig::withoutGlobalScopes()
            ->selectRaw('university_id, COUNT(*) as aggregate')
            ->groupBy('university_id')
            ->pluck('aggregate', 'university_id');

        return University::query()
            ->orderBy('name')
            ->get()
            ->map(function (University $uni) use (
                $roleIds,
                $trackCounts,
                $activeTrackCounts,
                $scheduleCounts,
                $committeeCounts,
                $pendingProposalCounts,
                $roomCounts,
                $stageCounts,
            ) {
                $base = User::query()
                    ->whereHas('role', fn ($q) => $q->where('name', '!=', 'super_admin'))
                    ->where(function ($q) use ($uni) {
                        $q->where('university_id', $uni->id)
                            ->orWhereHas(
                                'supervisorUniversities',
                                fn ($sq) => $sq->where('universities.id', $uni->id),
                            );
                    });

                $countByRole = function (string $role) use ($base, $roleIds) {
                    $roleId = $roleIds->get($role);
                    if (!$roleId) {
                        return 0;
                    }

                    return (clone $base)->where('role_id', $roleId)->count();
                };

                return [
                    'id' => $uni->id,
                    'name' => $uni->name,
                    'slug' => $uni->slug,
                    'is_active' => (bool) $uni->is_active,
                    'users_total' => (clone $base)->count(),
                    'students' => $countByRole('student'),
                    'supervisors' => $countByRole('supervisor'),
                    'admins' => $countByRole('admin'),
                    'pending' => (clone $base)->where('status', 'pending')->count(),
                    'projects' => Project::query()->where('university_id', $uni->id)->count(),
                    'tracks' => (int) ($trackCounts[$uni->id] ?? 0),
                    'active_tracks' => (int) ($activeTrackCounts[$uni->id] ?? 0),
                    'active_schedules' => (int) ($scheduleCounts[$uni->id] ?? 0),
                    'committees' => (int) ($committeeCounts[$uni->id] ?? 0),
                    'pending_proposals' => (int) ($pendingProposalCounts[$uni->id] ?? 0),
                    'defense_rooms' => (int) ($roomCounts[$uni->id] ?? 0),
                    'defense_types' => (int) ($stageCounts[$uni->id] ?? 0),
                ];
            })
            ->values()
            ->all();
    }

    /** List all platform users with optional filters. */
    public function indexUsers(Request $request)
    {
        $query = User::query()
            ->with(['role', 'university', 'supervisorUniversities:id,name'])
            ->whereHas('role', fn ($q) => $q->where('name', '!=', 'super_admin'))
            ->where('id', '!=', $request->user()->id)
            ->applyUserListFilters($request)
            ->orderByDesc('created_at');

        if ($request->filled('university_id')) {
            $uniId = (int) $request->university_id;
            $query->where(function ($q) use ($uniId) {
                $q->where('university_id', $uniId)
                    ->orWhereHas('supervisorUniversities', fn ($sq) => $sq->where('universities.id', $uniId));
            });
        }

        return response()->json(['users' => $query->get()]);
    }

    /** Create a new platform user. */
    public function storeUser(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|min:6',
            'role' => 'required|string|in:admin,supervisor,student',
            'university_id' => 'required|integer|exists:universities,id',
            'university_ids' => 'nullable|array',
            'university_ids.*' => 'integer|exists:universities,id',
            'status' => 'nullable|string|in:pending,active,rejected',
        ]);

        $role = Role::where('name', $request->role)->first();
        if (!$role) {
            return response()->json(['message' => 'Role not found'], 422);
        }

        $primaryUniversityId = (int) $request->university_id;
        $university = University::whereKey($primaryUniversityId)->where('is_active', true)->first();
        if (!$university) {
            return response()->json(['message' => 'University is not active.'], 422);
        }

        if ($request->role === 'student') {
            $request->validate([
                'student_number' => [
                    'required',
                    'string',
                    'max:50',
                    \Illuminate\Validation\Rule::unique('users', 'student_number')
                        ->where(fn ($q) => $q->where('university_id', $primaryUniversityId)),
                ],
            ]);
        }

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => $request->password,
            'role_id' => $role->id,
            'university_id' => $primaryUniversityId,
            'student_number' => $request->role === 'student' ? $request->student_number : null,
            'status' => $request->input('status', 'active'),
        ]);

        $this->syncSupervisorUniversitiesFromRequest($user, $request);
        $this->syncStudentProfile($user);
        $user->load(['role', 'university', 'supervisorUniversities:id,name']);

        return response()->json([
            'message' => 'User created successfully.',
            'user' => $user,
        ], 201);
    }

    /** Update an existing platform user. */
    public function updateUser(Request $request, $id)
    {
        $user = User::query()->whereKey($id)->first();
        if (!$user) {
            return response()->json(['message' => 'User not found'], 404);
        }

        if ($user->isSuperAdmin()) {
            return response()->json(['message' => 'Cannot modify platform super admin accounts.'], 403);
        }

        $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|email|unique:users,email,' . $id,
            'password' => 'sometimes|min:6',
            'role' => 'sometimes|string|in:admin,supervisor,student',
            'university_id' => 'sometimes|integer|exists:universities,id',
            'university_ids' => 'nullable|array',
            'university_ids.*' => 'integer|exists:universities,id',
            'status' => 'sometimes|string|in:pending,active,rejected',
            'student_number' => 'nullable|string|max:50',
        ]);

        if ($request->has('name')) {
            $user->name = $request->name;
        }
        if ($request->has('email')) {
            $user->email = $request->email;
        }
        if ($request->has('password')) {
            $user->password = $request->password;
        }
        if ($request->has('status')) {
            $user->status = $request->status;
        }
        if ($request->has('university_id')) {
            $user->university_id = $request->university_id;
        }
        if ($request->has('role')) {
            $role = Role::where('name', $request->role)->first();
            if (!$role) {
                return response()->json(['message' => 'Role not found'], 422);
            }
            $user->role_id = $role->id;
        }
        if ($request->has('student_number')) {
            $user->student_number = $request->student_number;
        }

        $user->load('role');
        if ($user->role?->name === 'student') {
            $request->validate([
                'student_number' => [
                    'required',
                    'string',
                    'max:50',
                    \Illuminate\Validation\Rule::unique('users', 'student_number')
                        ->where(fn ($q) => $q->where('university_id', $user->university_id))
                        ->ignore($user->id),
                ],
            ]);
        } else {
            $user->student_number = null;
        }

        $user->save();
        $this->syncSupervisorUniversitiesFromRequest($user, $request);
        $this->syncStudentProfile($user);
        $user->load(['role', 'university', 'supervisorUniversities:id,name']);

        return response()->json([
            'message' => 'User updated successfully.',
            'user' => $user,
        ]);
    }

    /** Delete a platform user. */
    public function destroyUser(Request $request, $id, UserDeletionService $deletionService)
    {
        $user = User::query()->with('role')->whereKey($id)->first();
        if (!$user) {
            return response()->json(['message' => 'User not found'], 404);
        }

        if ($user->isSuperAdmin()) {
            return response()->json(['message' => 'Cannot delete platform super admin accounts.'], 403);
        }

        $actorId = (int) $request->user()?->id;
        if ($actorId && $actorId === (int) $user->id) {
            return response()->json(['message' => 'Cannot delete your own account.'], 403);
        }

        $result = $deletionService->delete($user);

        return response()->json(['message' => $result['message']], $result['status']);
    }

    /** List all platform projects with optional filters. */
    public function indexProjects(Request $request)
    {
        $query = Project::query()
            ->with([
                'user:id,name,email',
                'supervisor:id,name,email',
                'university:id,name',
                'proposal:id,track_stage_id',
                'proposal.trackStage:id,name,parent_id',
                'proposal.trackStage.parent:id,name',
            ])
            ->orderByDesc('created_at');

        if ($request->filled('search')) {
            $term = '%' . trim($request->search) . '%';
            $query->where(function ($q) use ($term) {
                $q->where('title', 'like', $term)
                    ->orWhere('description', 'like', $term);
            });
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('university_id')) {
            $query->where('university_id', (int) $request->university_id);
        }

        $projects = $query->get()->map(function (Project $project) {
            $phaseName = $project->proposal?->trackStage?->parent?->name;
            $project->setAttribute('phase_name', $phaseName);

            return $project;
        });

        return response()->json(['projects' => $projects]);
    }

    /** Update a platform project. */
    public function updateProject(Request $request, $id)
    {
        $project = Project::query()->whereKey($id)->first();
        if (!$project) {
            return response()->json(['message' => 'Project not found'], 404);
        }

        $request->validate([
            'title' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'status' => 'nullable|in:pending,in_progress,completed',
        ]);

        $project->update($request->only(['title', 'description', 'status']));
        $project->load(['user:id,name', 'supervisor:id,name', 'university:id,name']);

        return response()->json([
            'message' => 'Project updated successfully.',
            'project' => $project,
        ]);
    }

    /** Delete a platform project and related records. */
    public function destroyProject($id)
    {
        $project = Project::query()->whereKey($id)->first();
        if (!$project) {
            return response()->json(['message' => 'Project not found'], 404);
        }

        DB::transaction(function () use ($project) {
            $pid = $project->id;
            DB::table('comments')->where('project_id', $pid)->delete();
            DB::table('project_versions')->where('project_id', $pid)->delete();
            DB::table('project_activities')->where('project_id', $pid)->delete();
            DB::table('ratings')->where('project_id', $pid)->delete();
            DB::table('student_invitations')->where('project_id', $pid)->delete();
            DB::table('supervisor_invitations')->where('project_id', $pid)->delete();
            DB::table('project_members')->where('project_id', $pid)->delete();
            $project->tasks()->delete();
            $project->delete();
        });

        return response()->json(['message' => 'Project deleted successfully.']);
    }

    /** Sync supervisor university memberships from the request. */
    private function syncSupervisorUniversitiesFromRequest(User $user, Request $request): void
    {
        if (!$user->isSupervisorRole()) {
            return;
        }

        $ids = $request->input('university_ids', []);
        if (!is_array($ids)) {
            $ids = [];
        }
        if (empty($ids) && $request->filled('university_id')) {
            $ids = [(int) $request->university_id];
        }

        $user->syncSupervisorUniversities($ids, 'active', auth()->id());
        $user->refreshAccountStatusFromMemberships();
    }

    /** Sync student profile data from the user record. */
    private function syncStudentProfile(User $user): void
    {
        $user->loadMissing('role');
        if ($user->role?->name !== 'student' || !$user->student_number) {
            return;
        }

        $user->profile()->updateOrCreate(
            ['user_id' => $user->id],
            ['student_number' => $user->student_number],
        );
    }
}

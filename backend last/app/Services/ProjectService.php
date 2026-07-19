<?php

namespace App\Services;

use App\Models\DefenseSession;
use App\Models\Project;
use App\Models\ProjectActivity;
use App\Models\ProjectProposal;
use App\Models\StudentInvitation;
use App\Models\SupervisorInvitation;
use App\Models\Task;
use App\Models\User;
use App\Repositories\ProjectRepository;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class ProjectService
{
    /** Injects project and track dependencies. */
    public function __construct(
        protected ProjectRepository $projects,
        protected TrackService $trackService,
    ) {
    }

    /** Creates a new project for the authenticated user. */
    public function create(Request $request): Project
    {
        $data = $request->validate([
            'title'            => 'required|string|max:255',
            'description'      => 'nullable|string',
            'github_repo_url'  => 'nullable|url',
            'supervisor_id'    => 'nullable|exists:users,id',
        ]);

        $data['user_id'] = $request->user()->id;
        $data['university_id'] = $request->user()->university_id;
        $data['status']  = 'pending';

        return $this->projects->create($data);
    }

    /** Returns all projects visible to the given user. */
    public function listForUser($user)
    {
        return $this->projects->getForUser($user);
    }

    /** Returns projects for the index API with progress metrics attached. */
    public function listForIndex(User $user): Collection
    {
        $roleName = strtolower($user->role?->name ?? '');
        $query = Project::query()->with([
            'user:id,name,email,track_id,status',
            'user.track:id,name',
            'supervisor:id,name,email',
            'proposal:id,track_stage_id',
            'proposal.trackStage:id,name,parent_id,academic_stage_id,track_id',
            'proposal.trackStage.parent:id,name',
            'proposal.trackStage.academicStage:id,name',
            'proposal.trackStage.track:id,name',
            'activeDefenseSession:' . implode(',', DefenseSession::DETAIL_COLUMNS),
        ]);

        if ($roleName === 'super_admin') {
            $query->with('university:id,name');
        } elseif ($roleName === 'supervisor' || $roleName === 'manager') {
            $query->where('supervisor_id', $user->id);
        } elseif ($roleName === 'student') {
            $query->where(function (Builder $q) use ($user) {
                $q->where('user_id', $user->id)
                    ->orWhereHas('members', function (Builder $memberQ) use ($user) {
                        $memberQ->where('users.id', $user->id)
                            ->where('project_members.status', 'accepted');
                    });
            });
        }

        $projects = $query->orderByDesc('created_at')->get();

        return $this->attachTrackStageMetadata($this->attachProgressMetrics($projects));
    }

    /** Attaches task progress metrics to each project in the collection. */
    public function attachProgressMetrics(Collection $projects): Collection
    {
        if ($projects->isEmpty()) {
            return $projects;
        }

        $ids = $projects->pluck('id');
        $counts = Task::query()
            ->whereIn('project_id', $ids)
            ->selectRaw('project_id')
            ->selectRaw('COUNT(*) as total_tasks')
            ->selectRaw("SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_tasks")
            ->groupBy('project_id')
            ->get()
            ->keyBy('project_id');

        return $projects->map(function (Project $project) use ($counts) {
            $row = $counts->get($project->id);
            $total = (int) ($row->total_tasks ?? 0);
            $completed = (int) ($row->completed_tasks ?? 0);

            $project->setAttribute('total_tasks', $total);
            $project->setAttribute('completed_tasks', $completed);
            $project->setAttribute(
                'progress_percentage',
                $total > 0 ? round(($completed / $total) * 100, 2) : 0,
            );

            return $project;
        });
    }

    /** Attaches proposal track step metadata for project cards and details. */
    public function attachTrackStageMetadata(Collection $projects): Collection
    {
        $trackService = app(TrackService::class);

        return $projects->map(function (Project $project) use ($trackService) {
            $project->setAttribute(
                'track_stage',
                $trackService->describeProjectTrackStage($project),
            );

            return $project;
        });
    }

    /** Enriches a single project with track step metadata. */
    public function enrichProjectWithTrackStage(?Project $project): ?Project
    {
        if (!$project) {
            return null;
        }

        $project->setAttribute(
            'track_stage',
            app(TrackService::class)->describeProjectTrackStage($project),
        );

        return $project;
    }

    /** Updates a project if the user is authorized. */
    public function update(Request $request, int $id, $user)
    {
        $project = $this->projects->findById($id);

        if (!$project) {
            return null;
        }

        $data = $request->validate([
            'title'            => 'sometimes|string|max:255',
            'description'      => 'nullable|string',
            'status'           => 'nullable|in:pending,in_progress,completed',
            'github_repo_url'  => 'nullable|url',
            'supervisor_id'    => 'nullable|exists:users,id',
        ]);

        $isAdmin = $user->role?->name === 'admin';

        if (!$isAdmin && $project->user_id !== $user->id) {
            return 'unauthorized';
        }

        $data['status'] = $data['status'] ?? $project->status;

        return $this->projects->update($project, $data);
    }

    /** Deletes a project — university admins only. */
    public function delete(int $id, $user)
    {
        $project = $this->projects->findById($id);

        if (!$project) {
            return null;
        }

        $role = strtolower($user->role?->name ?? '');
        if (!in_array($role, ['admin', 'super_admin'], true)) {
            return 'unauthorized';
        }

        $this->projects->delete($project);

        return true;
    }

    /**
     * Student leaves a project.
     * Solo owners delete the project. Owners with members transfer ownership.
     * Incomplete sub-track progress is reset for the leaving student.
     *
     * @return array<string, mixed>|string
     */
    public function leaveProject(int $id, User $user): array|string
    {
        $project = Project::query()->with('proposal:id,track_stage_id')->whereKey($id)->first();
        if (!$project) {
            return 'not_found';
        }

        if (strtolower($user->role?->name ?? '') !== 'student') {
            return 'forbidden';
        }

        $isOwner = (int) $project->user_id === (int) $user->id;
        $isMember = DB::table('project_members')
            ->where('project_id', $project->id)
            ->where('student_id', $user->id)
            ->where('status', 'accepted')
            ->exists();

        if (!$isOwner && !$isMember) {
            return 'forbidden';
        }

        $trackStageId = $this->trackService->resolveProjectTrackStageId($project);

        if ($isOwner) {
            $successorRow = DB::table('project_members')
                ->where('project_id', $project->id)
                ->where('status', 'accepted')
                ->where('student_id', '!=', $user->id)
                ->orderBy('created_at')
                ->orderBy('id')
                ->first();

            $newOwner = $successorRow
                ? User::query()->find($successorRow->student_id)
                : null;

            if (!$newOwner) {
                return DB::transaction(function () use ($project, $user, $trackStageId) {
                    $progress = $this->trackService->handleProgressOnProjectLeave($user, $trackStageId);
                    $this->deleteProjectAfterSoloLeave($project);

                    return [
                        'left' => true,
                        'project_deleted' => true,
                        'ownership_transferred' => false,
                        'phase_reset' => $progress['phase_reset'],
                        'phase_completed' => $progress['phase_completed'],
                        'phase_name' => $progress['phase_name'],
                    ];
                });
            }

            return DB::transaction(function () use ($project, $user, $newOwner, $trackStageId) {
                $progress = $this->trackService->handleProgressOnProjectLeave($user, $trackStageId);

                $project->update(['user_id' => $newOwner->id]);

                DB::table('project_members')
                    ->where('project_id', $project->id)
                    ->where('student_id', $newOwner->id)
                    ->delete();

                ProjectActivity::create([
                    'project_id' => $project->id,
                    'user_id' => $user->id,
                    'action' => "غادر المشروع وانتقلت الملكية إلى {$newOwner->name}",
                    'action_key' => 'ownerLeftTransferred',
                    'meta' => [
                        'new_owner_id' => $newOwner->id,
                        'new_owner_name' => $newOwner->name,
                        'phase_reset' => $progress['phase_reset'],
                    ],
                    'type' => 'join',
                ]);

                return [
                    'left' => true,
                    'project_deleted' => false,
                    'ownership_transferred' => true,
                    'new_owner' => [
                        'id' => $newOwner->id,
                        'name' => $newOwner->name,
                    ],
                    'phase_reset' => $progress['phase_reset'],
                    'phase_completed' => $progress['phase_completed'],
                    'phase_name' => $progress['phase_name'],
                ];
            });
        }

        return DB::transaction(function () use ($project, $user, $trackStageId) {
            $progress = $this->trackService->handleProgressOnProjectLeave($user, $trackStageId);

            DB::table('project_members')
                ->where('project_id', $project->id)
                ->where('student_id', $user->id)
                ->delete();

            ProjectActivity::create([
                'project_id' => $project->id,
                'user_id' => $user->id,
                'action' => 'غادر المشروع كعضو فريق',
                'action_key' => 'memberLeft',
                'meta' => [
                    'phase_reset' => $progress['phase_reset'],
                ],
                'type' => 'join',
            ]);

            return [
                'left' => true,
                'project_deleted' => false,
                'ownership_transferred' => false,
                'phase_reset' => $progress['phase_reset'],
                'phase_completed' => $progress['phase_completed'],
                'phase_name' => $progress['phase_name'],
            ];
        });
    }

    /** Deletes a solo-owned project and its linked proposal/invitations. */
    private function deleteProjectAfterSoloLeave(Project $project): void
    {
        SupervisorInvitation::query()->where('project_id', $project->id)->delete();
        StudentInvitation::query()->where('project_id', $project->id)->delete();

        $proposalId = $project->proposal_id;
        $projectId = $project->id;

        $project->delete();

        if ($proposalId) {
            ProjectProposal::query()->whereKey($proposalId)->delete();
        }

        DB::table('project_members')->where('project_id', $projectId)->delete();
    }

    /** Returns task progress stats and auto-updates project status. */
    public function progress(int $id): ?array
    {
        $project = Project::query()->with('tasks')->whereKey($id)->first();

        if (!$project) {
            return null;
        }

        $totalTasks      = $project->tasks->count();
        $pendingTasks    = $project->tasks->where('status', 'pending')->count();
        $inProgressTasks = $project->tasks->where('status', 'in_progress')->count();
        $completedTasks  = $project->tasks->where('status', 'completed')->count();

        $progress = $totalTasks > 0
            ? round(($completedTasks / $totalTasks) * 100, 2)
            : 0;

        $newStatus = 'pending';
        if ($totalTasks > 0 && $completedTasks === $totalTasks) {
            $newStatus = 'completed';
        } elseif ($completedTasks > 0 || $inProgressTasks > 0) {
            $newStatus = 'in_progress';
        }

        if ($project->status !== $newStatus) {
            $project->status = $newStatus;
            $project->save();
        }

        return [
            'project_id'          => $project->id,
            'total_tasks'         => $totalTasks,
            'pending_tasks'       => $pendingTasks,
            'in_progress_tasks'   => $inProgressTasks,
            'completed_tasks'     => $completedTasks,
            'progress_percentage' => $progress,
        ];
    }

    /** Returns a project with all related details loaded. */
    public function getProjectFullDetails(int $id)
    {
        return Project::query()->with([
            'user:id,name,email,track_id,status',
            'user.track:id,name',
            'supervisor:id,name,email',
            'proposal:id,track_stage_id',
            'proposal.trackStage:id,name,parent_id,academic_stage_id',
            'proposal.trackStage.parent:id,name',
            'proposal.trackStage.academicStage:id,name',
            'activeDefenseSession:' . implode(',', DefenseSession::DETAIL_COLUMNS),
            'activeDefenseSession.trackStage:id,name,parent_id,academic_stage_id,is_decisive',
            'activeDefenseSession.trackStage.parent:id,name',
            'activeDefenseSession.trackStage.academicStage:id,name',
            'tasks',
            'comments.user:id,name',
            'versions.user:id,name',
            'members',
            'activeDefenseSession.committee:id,name',
            'activeDefenseSession.committee.members:id,name,email',
            'activeDefenseSession.committeeMembers:id,name',
            'activeDefenseSession.room:id,name',
            'activeDefenseSession.approvedSchedule.academicStage:id,name',
        ])->whereKey($id)->first();
    }

    /** Returns the most recent defense session tied to the project's active approved schedule. */
    public function getLatestActiveScheduleDefenseSession(Project $project): ?DefenseSession
    {
        return DefenseSession::query()
            ->where('project_id', $project->id)
            ->whereHas('approvedSchedule', function ($query) {
                $query->withoutGlobalScopes()->where('status', 'active');
            })
            ->with([
                'trackStage:id,name,parent_id,academic_stage_id,is_decisive',
                'trackStage.parent:id,name',
                'trackStage.academicStage:id,name',
                'committee:id,name',
                'committee.members:id,name,email',
                'committeeMembers:id,name',
                'room:id,name',
                'approvedSchedule.academicStage:id,name',
            ])
            ->latest('id')
            ->first();
    }

    /** Delegates to progress() for controller compatibility. */
    public function calculateProgress(int $id): ?array
    {
        return $this->progress($id);
    }

    /** Returns students eligible for invitation to a project. */
    public function getAvailableStudentsForInvite(int $projectId, ?string $search = null)
    {
        $students = app(StudentService::class)->getAvailableStudents($projectId, $search);

        return $students
            ->map(fn ($user) => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'student_number' => $user->student_number,
                'university_id' => $user->university_id,
            ])
            ->values();
    }
}

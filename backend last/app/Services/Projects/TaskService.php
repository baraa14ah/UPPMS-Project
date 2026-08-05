<?php

namespace App\Services\Projects;


use App\Services\Notifications\NotificationService;
use App\Models\Project;
use App\Models\ProjectActivity;
use App\Models\Task;
use App\Models\User;
use App\Support\ProjectAccess;
use Illuminate\Support\Facades\DB;

class TaskService
{
    public function __construct(
        protected NotificationService $notifications,
    ) {}

    /** Checks whether the user can access the project. */
    private function canAccessProject(User $user, Project $project): bool
    {
        return ProjectAccess::canAccess($user, $project);
    }

    /** Returns the Arabic label for a task status. */
    private function statusLabel(string $status): string
    {
        return match ($status) {
            'completed'   => 'مكتملة',
            'in_progress' => 'قيد التنفيذ',
            default       => 'قيد الانتظار',
        };
    }

    /** Returns the activity type for a task status change. */
    private function statusActivityType(string $status): string
    {
        return match ($status) {
            'completed'   => 'complete',
            'in_progress' => 'progress',
            default       => 'update',
        };
    }

    /** Calculates task completion percentage for a project. */
    public function calculateProjectProgress(int|string $projectId): int
    {
        $total = Task::query()->where('project_id', $projectId)->count();
        if ($total === 0) {
            return 0;
        }

        $completed = Task::query()
            ->where('project_id', $projectId)
            ->where('status', 'completed')
            ->count();

        return (int) round(($completed / $total) * 100);
    }

    public function getProjectTasks(int|string $projectId, User $user): array
    {
        $project = Project::query()->whereKey($projectId)->first();
        if (!$project) {
            return ['status' => 404, 'message' => 'Project not found'];
        }
        if (!$this->canAccessProject($user, $project)) {
            return ['status' => 403, 'message' => 'Unauthorized'];
        }

        $tasks = Task::query()
            ->where('project_id', $projectId)
            ->with('assignedTo')
            ->orderByDesc('created_at')
            ->get();

        return ['status' => 200, 'tasks' => $tasks];
    }

    public function createTask(array $data, User $user): array
    {
        $project = Project::query()->whereKey($data['project_id'])->first();
        if (!$project) {
            return ['status' => 404, 'message' => 'Project not found'];
        }
        if (!$this->canAccessProject($user, $project)) {
            return ['status' => 403, 'message' => 'Unauthorized'];
        }

        $task = Task::create([
            'project_id'    => $project->id,
            'university_id' => $project->university_id,
            'title'         => $data['title'],
            'description'   => $data['description'] ?? null,
            'deadline'      => $data['deadline'] ?? null,
            'status'        => 'pending',
            'created_by'    => $user->id,
            'assigned_to'   => $user->id,
        ]);

        ProjectActivity::create([
            'project_id' => $project->id,
            'user_id'    => $user->id,
            'action'     => "أضاف مهمة جديدة: {$task->title}",
            'action_key' => 'taskCreated',
            'meta'       => ['title' => $task->title],
            'type'       => 'create',
        ]);

        $this->notifications->notifyProjectParticipants(
            projectId: (int) $project->id,
            actorUserId: (int) $user->id,
            type: 'task.created',
            title: 'مهمة جديدة',
            body: "{$user->name} أضاف مهمة جديدة: {$task->title}",
            data: [
                'project_id'    => $project->id,
                'task_id'       => $task->id,
                'url'           => "/dashboard/projects/{$project->id}",
                'actor_name'    => $user->name,
                'task_title'    => $task->title,
                'project_title' => $project->title,
            ],
        );

        $task->load('assignedTo');

        return [
            'status'       => 201,
            'task'         => $task,
            'new_progress' => $this->calculateProjectProgress($project->id),
        ];
    }

    /** Updates a task and logs status changes with notifications. */
    public function updateTask(int|string $taskId, array $data, User $user): array
    {
        $task = Task::query()->whereKey($taskId)->first();
        if (!$task) {
            return ['status' => 404, 'message' => 'Task not found'];
        }

        $project = Project::query()->whereKey($task->project_id)->first();
        if (!$project) {
            return ['status' => 404, 'message' => 'Project not found'];
        }
        if (!$this->canAccessProject($user, $project)) {
            return ['status' => 403, 'message' => 'Unauthorized'];
        }

        $oldStatus = $task->status;
        $task->update($data);

        if (isset($data['status']) && $oldStatus !== $task->status) {
            $statusName = $this->statusLabel($task->status);

            ProjectActivity::create([
                'project_id' => $project->id,
                'user_id'    => $user->id,
                'action'     => "غيّر حالة المهمة '{$task->title}' إلى {$statusName}",
                'action_key' => 'taskStatusChanged',
                'meta'       => ['title' => $task->title, 'status' => $task->status],
                'type'       => $this->statusActivityType($task->status),
            ]);

            $this->notifications->notifyProjectParticipants(
                projectId: (int) $project->id,
                actorUserId: (int) $user->id,
                type: 'task.status_changed',
                title: 'تحديث حالة مهمة',
                body: "{$user->name} غيّر حالة المهمة '{$task->title}' إلى {$statusName}",
                data: [
                    'project_id' => $project->id,
                    'task_id'    => $task->id,
                    'new_status' => $task->status,
                    'url'        => "/dashboard/projects/{$project->id}",
                    'actor_name' => $user->name,
                    'task_title' => $task->title,
                    'project_title' => $project->title,
                ],
            );
        }

        return [
            'status'       => 200,
            'task'         => $task,
            'new_progress' => $this->calculateProjectProgress($project->id),
        ];
    }

    /** Deletes a task if the user is owner, supervisor, or accepted member. */
    public function deleteTask(int|string $taskId, User $user): array
    {
        $task = Task::query()->whereKey($taskId)->first();
        if (!$task) {
            return ['status' => 404, 'message' => 'Task not found'];
        }

        $project = Project::query()->whereKey($task->project_id)->first();
        if (!$project) {
            return ['status' => 404, 'message' => 'Project not found'];
        }

        $isOwner = (int) $project->user_id === (int) $user->id;
        $isSupervisor = (int) $project->supervisor_id === (int) $user->id;
        $isMember = DB::table('project_members')
            ->join('projects', 'project_members.project_id', '=', 'projects.id')
            ->where('projects.id', $project->id)
            ->where('projects.university_id', $user->university_id)
            ->where('project_members.student_id', $user->id)
            ->where('project_members.status', 'accepted')
            ->exists();

        if (!$isOwner && !$isSupervisor && !$isMember) {
            return ['status' => 403, 'message' => 'Unauthorized'];
        }

        ProjectActivity::create([
            'project_id' => $project->id,
            'user_id'    => $user->id,
            'action'     => "حذف المهمة: {$task->title}",
            'action_key' => 'taskDeleted',
            'meta'       => ['title' => $task->title],
            'type'       => 'update',
        ]);

        $task->delete();

        return [
            'status'       => 200,
            'message'      => 'Task deleted successfully',
            'new_progress' => $this->calculateProjectProgress($project->id),
        ];
    }

    /** Returns quick task statistics for a project. */
    public function getProjectStats(int|string $projectId): array
    {
        $tasks = Task::query()->where('project_id', $projectId)->get();
        $total = $tasks->count();
        $completed = $tasks->where('status', 'completed')->count();

        return [
            'total_tasks'      => $total,
            'completed_tasks'  => $completed,
            'progress_percent' => $total > 0 ? (int) round(($completed / $total) * 100) : 0,
            'latest_activity'  => $tasks->max('updated_at'),
        ];
    }
}

<?php

namespace App\Services\Notifications;

use App\Models\Project;
use App\Models\Role;
use App\Models\User;
use App\Notifications\SystemNotification;
use Illuminate\Notifications\DatabaseNotification;
use Illuminate\Support\Facades\DB;

class NotificationService
{
    /** Builds the base query for a user's database notifications. */
    private function baseQuery(int $userId)
    {
        return DatabaseNotification::query()
            ->where('notifiable_id', $userId)
            ->where('notifiable_type', User::class);
    }

    /** Returns paginated notifications and unread count for a user. */
    public function getAll($user)
    {
        $items = $this->baseQuery($user->id)
            ->orderByDesc('created_at')
            ->paginate(15);

        return [
            'notifications' => $items->items(),
            'unread_count'  => $user->unreadNotifications()->count(),
            'meta' => [
                'current_page' => $items->currentPage(),
                'last_page'    => $items->lastPage(),
                'total'        => $items->total(),
            ],
        ];
    }

    /** Marks one or all notifications as read for a user. */
    public function markAsRead($user, $id = null)
    {
        if ($id) {
            $user->unreadNotifications()->where('id', $id)->update(['read_at' => now()]);
        } else {
            $user->unreadNotifications()->update(['read_at' => now()]);
        }

        return ['unread_count' => 0];
    }

    /** Sends a system notification to a single user. */
    public function notifyUser(User $user, string $type, string $title, ?string $body = null, array $data = []): void
    {
        $user->notify(new SystemNotification($type, $title, $body, $data));
    }

    /** Sends a notification to active admins of the given universities. */
    public function notifyUniversityAdmins(
        int|array $universityIds,
        string $type,
        string $title,
        ?string $body = null,
        array $data = [],
    ): void {
        $ids = array_values(array_unique(array_filter(array_map('intval', (array) $universityIds))));
        if (empty($ids)) {
            return;
        }

        $adminRoleId = Role::query()->where('name', 'admin')->value('id');
        if (!$adminRoleId) {
            return;
        }

        $admins = User::query()
            ->whereIn('university_id', $ids)
            ->where('role_id', $adminRoleId)
            ->where('status', 'active')
            ->get();

        foreach ($admins as $admin) {
            $this->notifyUser($admin, $type, $title, $body, $data);
        }
    }

    /** Notifies all project participants except the acting user. */
    public function notifyProjectParticipants(int $projectId, int $actorUserId, string $type, string $title, ?string $body = null, array $data = []): void
    {
        $project = Project::query()->whereKey($projectId)->first();
        if (!$project) return;

        $ids = DB::table('project_members')
            ->join('projects', 'project_members.project_id', '=', 'projects.id')
            ->where('projects.id', $projectId)
            ->where('projects.university_id', auth()->user()->university_id ?? $project->university_id)
            ->where('project_members.status', 'accepted')
            ->pluck('project_members.student_id')
            ->toArray();

        $ids[] = $project->user_id;
        if ($project->supervisor_id) $ids[] = $project->supervisor_id;

        $targetIds = array_unique(array_filter($ids, fn($id) => $id != $actorUserId));

        if (empty($targetIds)) return;

        $users = User::query()->whereIn('id', $targetIds)->get();
        foreach ($users as $u) {
            $this->notifyUser($u, $type, $title, $body, $data);
        }
    }

    /** Delegates to notifyProjectParticipants using a Project model. */
    public function notifyProject(Project $project, string $type, string $title, string $body, array $data = [], int $ignoreUserId = null)
    {
        $this->notifyProjectParticipants($project->id, $ignoreUserId ?? 0, $type, $title, $body, $data);
    }
}

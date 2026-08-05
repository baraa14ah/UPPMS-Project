<?php

namespace App\Http\Controllers\Dashboard;


use App\Http\Controllers\Controller;
use App\Models\Task;
use App\Models\User;
use App\Services\Invitations\InvitationService;
use App\Services\Auth\PasswordResetHelpService;
use App\Services\Projects\ProjectService;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    /** Initialize dashboard dependencies. */
    public function __construct(
        protected ProjectService $projectService,
        protected InvitationService $invitationService,
        protected PasswordResetHelpService $passwordResetHelp,
    ) {}

    /** Return dashboard summary stats and recent activity. */
    public function summary(Request $request)
    {
        $user = $request->user();
        $user->loadMissing('role');
        $roleName = strtolower($user->role?->name ?? '');

        $projects = $this->projectService->listForIndex($user);
        $projectIds = $projects->pluck('id');

        $tasksTotal = (int) $projects->sum('total_tasks');
        $tasksCompleted = (int) $projects->sum('completed_tasks');

        $recentTasks = collect();
        if ($projectIds->isNotEmpty()) {
            $recentTasks = Task::query()
                ->whereIn('project_id', $projectIds)
                ->with('project:id,title')
                ->orderByDesc('updated_at')
                ->limit(12)
                ->get()
                ->map(fn (Task $t) => [
                    'id'            => $t->id,
                    'title'         => $t->title,
                    'status'        => $t->status,
                    'project_id'    => $t->project_id,
                    'project_title' => $t->project?->title,
                    'updated_at'    => $t->updated_at,
                ]);
        }

        return response()->json([
            'stats' => array_merge([
                'projects_total'   => $projects->count(),
                'tasks_total'      => $tasksTotal,
                'tasks_completed'  => $tasksCompleted,
                'progress'         => $tasksTotal > 0
                    ? round(($tasksCompleted / $tasksTotal) * 100, 1)
                    : 0,
                'pending_invites'  => $this->pendingInvitesCount($user, $roleName),
            ], $roleName === 'admin' && $user->university_id ? [
                'pending_users' => User::pendingApprovalCountForUniversity((int) $user->university_id),
            ] : []),
            'recent_projects' => $projects->take(6)->values(),
            'recent_tasks'    => $recentTasks->take(6)->values(),
        ]);
    }

    /** Return badge counts for sidebar notifications. */
    public function badges(Request $request)
    {
        $user = $request->user();
        $user->loadMissing('role');
        $roleName = strtolower($user->role?->name ?? '');

        $passwordResetRequests = 0;
        $pendingUsers = 0;
        if ($roleName === 'admin' && $user->university_id) {
            $uniId = (int) $user->university_id;
            $passwordResetRequests = $this->passwordResetHelp->pendingCountForUniversity($uniId);
            $pendingUsers = User::pendingApprovalCountForUniversity($uniId);
        }

        return response()->json([
            'unread_notifications' => (int) $user->unreadNotifications()->count(),
            'student_invitations'  => $this->studentInvitesCount($user, $roleName),
            'supervisor_invitations' => $this->supervisorInvitesCount($user, $roleName),
            'password_reset_requests' => $passwordResetRequests,
            'pending_users' => $pendingUsers,
        ]);
    }

    /** Count total pending student and supervisor invitations. */
    private function pendingInvitesCount($user, string $roleName): int
    {
        return $this->studentInvitesCount($user, $roleName)
            + $this->supervisorInvitesCount($user, $roleName);
    }

    /** Count pending student invitations for the current role. */
    private function studentInvitesCount($user, string $roleName): int
    {
        if ($roleName !== 'student') {
            return 0;
        }

        return $this->invitationService->getStudentInvitations($user->id)->count();
    }

    /** Count pending supervisor invitations for the current role. */
    private function supervisorInvitesCount($user, string $roleName): int
    {
        if ($roleName !== 'supervisor') {
            return 0;
        }

        return $this->invitationService->getSupervisorInvitations($user->id)->count();
    }
}

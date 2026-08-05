<?php

namespace App\Services\Projects;

use App\Models\Comment;
use App\Models\Project;
use App\Models\Task;
use App\Services\Notifications\NotificationService;
use Illuminate\Support\Facades\DB;

class CommentService
{
    protected NotificationService $notifications;

    public function __construct(NotificationService $notifications)
    {
        $this->notifications = $notifications;
    }

    public function getProjectComments($projectId)
    {
        return Comment::query()->forCurrentUniversity()
            ->where('project_id', $projectId)
            ->with('user:id,name')
            ->orderBy('created_at', 'desc')
            ->get();
    }

    public function getTaskComments($taskId)
    {
        return Comment::query()->forCurrentUniversity()
            ->where('task_id', $taskId)
            ->with('user:id,name')
            ->orderBy('created_at', 'desc')
            ->get();
    }

    /** Adds a comment to a project and notifies participants. */
    public function addProjectComment($projectId, $commentText, $user)
    {
        $project = Project::query()->whereKey($projectId)->first();
        if (!$project) return null;

        $comment = Comment::create([
            'project_id' => $projectId,
            'user_id'    => $user->id,
            'comment'    => $commentText,
        ]);

        $this->notifications->notifyProjectParticipants(
            projectId: (int)$projectId,
            actorUserId: (int)$user->id,
            type: 'comment.project',
            title: 'تعليق جديد على المشروع',
            body: "{$user->name} أضاف تعليقاً على مشروع {$project->title}",
            data: [
                'project_id' => (int)$projectId,
                'comment_id' => (int)$comment->id,
                'url' => "/dashboard/projects/{$projectId}",
                'actor_name' => $user->name,
                'project_title' => $project->title,
            ],
        );

        return $comment->load('user:id,name');
    }

    /** Adds a comment to a task and notifies project participants. */
    public function addTaskComment($taskId, $commentText, $user)
    {
        $task = Task::query()->whereKey($taskId)->first();
        if (!$task) return null;

        $comment = Comment::create([
            'task_id' => $taskId,
            'user_id' => $user->id,
            'comment' => $commentText,
        ]);

        $projectId = (int)($task->project_id ?? 0);
        if ($projectId) {
            $project = Project::query()->whereKey($projectId)->first();
            $this->notifications->notifyProject(
                project: $project,
                type: 'comment_added',
                title: 'تعليق جديد على مهمة',
                body: "{$user->name} أضاف تعليقًا على المهمة: {$task->title}",
                data: [
                    'project_id' => $projectId,
                    'task_id' => (int)$taskId,
                    'comment_id' => (int)$comment->id,
                    'url' => "/dashboard/projects/{$projectId}",
                    'actor_name' => $user->name,
                    'task_title' => $task->title,
                    'project_title' => $project?->title,
                ],
                ignoreUserId: $user->id
            );
        }

        return $comment->load('user:id,name');
    }

    /** Updates a comment if the user is the author. */
    public function updateComment($id, $commentText, $user)
    {
        $comment = Comment::query()->forCurrentUniversity()->whereKey($id)->first();
        if (!$comment) return ['status' => 404, 'message' => 'Comment not found'];

        if ((int)$comment->user_id !== (int)$user->id) {
            return ['status' => 403, 'message' => 'Unauthorized'];
        }

        $comment->update(['comment' => $commentText]);
        return ['status' => 200, 'comment' => $comment->load('user:id,name')];
    }

    /** Deletes a comment if the user is the author. */
    public function deleteComment($id, $user)
    {
        $comment = Comment::query()->forCurrentUniversity()->whereKey($id)->first();
        if (!$comment) return ['status' => 404, 'message' => 'Comment not found'];

        if ((int)$comment->user_id !== (int)$user->id) {
            return ['status' => 403, 'message' => 'Unauthorized'];
        }

        $comment->delete();
        return ['status' => 200, 'message' => 'Comment deleted'];
    }
}

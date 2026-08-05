<?php

namespace App\Http\Controllers\Projects;


use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Project;
use App\Models\Task;
use App\Services\Projects\CommentService;
use App\Support\ProjectAccess;

class CommentController extends Controller
{
    protected CommentService $commentService;

    public function __construct(CommentService $commentService)
    {
        $this->commentService = $commentService;
    }

    /** Verify the user can access the given project. */
    private function checkAccess($user, $projectId): bool
    {
        $project = Project::query()->whereKey($projectId)->first();

        return ProjectAccess::canAccess($user, $project);
    }

    /** Add a comment to a project. */
    public function storeProjectComment(Request $request, $projectId)
    {
        if (!$this->checkAccess($request->user(), $projectId)) return response()->json(['message' => 'Resource not found.'], 404);

        $request->validate(['comment' => 'required|string']);
        $comment = $this->commentService->addProjectComment($projectId, $request->comment, $request->user());

        return response()->json(['message' => 'Comment added', 'comment' => $comment], 201);
    }

    /** List comments for a project. */
    public function projectComments(Request $request, $projectId)
    {
        if (!$this->checkAccess($request->user(), $projectId)) return response()->json(['message' => 'Resource not found.'], 404);

        $comments = $this->commentService->getProjectComments($projectId);
        return response()->json(['comments' => $comments]);
    }

    /** Add a comment to a task. */
    public function storeTaskComment(Request $request, $taskId)
    {
        $task = Task::query()->whereKey($taskId)->firstOrFail();
        if (!$this->checkAccess($request->user(), $task->project_id)) return response()->json(['message' => 'Resource not found.'], 404);

        $request->validate(['comment' => 'required|string']);
        $comment = $this->commentService->addTaskComment($taskId, $request->comment, $request->user());

        return response()->json(['message' => 'Comment added', 'comment' => $comment], 201);
    }

    /** List comments for a task. */
    public function taskComments(Request $request, $taskId)
    {
        $task = Task::query()->whereKey($taskId)->firstOrFail();
        if (!$this->checkAccess($request->user(), $task->project_id)) return response()->json(['message' => 'Resource not found.'], 404);

        $comments = $this->commentService->getTaskComments($taskId);
        return response()->json(['comments' => $comments]);
    }

    /** Update an existing comment. */
    public function update(Request $request, $id)
    {
        $request->validate(['comment' => 'required|string']);
        $result = $this->commentService->updateComment($id, $request->comment, $request->user());

        return response()->json($result, $result['status']);
    }

    public function delete(Request $request, $id)
    {
        $result = $this->commentService->deleteComment($id, $request->user());
        return response()->json($result, $result['status']);
    }
}

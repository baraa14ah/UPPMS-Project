<?php

namespace App\Http\Controllers\Projects;


use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\ProjectVersion;
use Illuminate\Http\Request;
use App\Services\Notifications\NotificationService;
use App\Support\ProjectAccess;
use App\Services\Projects\ProjectVersionService;

class ProjectVersionController extends Controller
{
    protected NotificationService $notifications;

    public function __construct(NotificationService $notifications)
    {
        $this->notifications = $notifications;
    }

    /** Check whether the user can access the project. */
    private function canAccessProject(Request $request, Project $project): bool
    {
        return ProjectAccess::canAccess($request->user(), $project);
    }

    /** List versions for a project. */
    public function index(Request $request, $projectId)
    {
        $project = Project::query()->whereKey($projectId)->first();
        if (!$project) return response()->json(['message' => 'Resource not found.'], 404);

        if (!$this->canAccessProject($request, $project)) return response()->json(['message' => 'Unauthorized'], 403);

        $versions = ProjectVersion::query()->forCurrentUniversity()
            ->where('project_id', $projectId)
            ->with('user:id,name')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'project_id' => $projectId,
            'versions' => $versions->map(fn($v) => [
                'id' => $v->id,
                'user_id'=> $v->user_id,
                'version_title' => $v->version_title,
                'version_description' => $v->version_description,
                'file_url' => $v->file_path ? asset('storage/' . $v->file_path) : null,
                'uploaded_by' => $v->user?->name,
                'created_at' => $v->created_at,
            ])
        ]);
    }

    /** Upload a new project version file. */
    public function upload(Request $request, $projectId, ProjectVersionService $versionService)
    {
        $request->validate([
            'version_title' => 'required|string|max:255',
            'version_description' => 'nullable|string',
            'file' => 'required|file|max:20480',
        ]);

        $data = [
            'project_id' => $projectId,
            'version_title' => $request->version_title,
            'version_description' => $request->version_description,
        ];

        $result = $versionService->uploadVersion($data, $request->file('file'), $request->user());

        return response()->json($result, $result['status'] ?? 200);
    }

    /** Update version title and description. */
    public function update(Request $request, $versionId)
    {
        $version = ProjectVersion::query()->forCurrentUniversity()->whereKey($versionId)->first();
        if (!$version) return response()->json(['message' => 'Resource not found.'], 404);

        $project = Project::query()->whereKey($version->project_id)->first();
        if (!$this->canAccessProject($request, $project)) return response()->json(['message' => 'Unauthorized'], 403);

        $request->validate([
            'version_title' => 'required|string|max:255',
            'version_description' => 'nullable|string',
        ]);

        $version->update([
            'version_title' => $request->version_title,
            'version_description' => $request->version_description,
        ]);

        return response()->json([
            'message' => 'Version updated successfully',
            'version' => $version
        ]);
    }

    public function destroy(Request $request, $versionId, ProjectVersionService $versionService)
    {
        $result = $versionService->deleteVersion($versionId, $request->user());
        return response()->json($result, $result['status'] ?? 200);
    }

    /** Route alias that delegates to destroy. */
    public function delete(Request $request, $versionId, ProjectVersionService $versionService)
    {
        return $this->destroy($request, $versionId, $versionService);
    }

    /** Return version timeline for a project. */
    public function timeline(Request $request, $projectId, ProjectVersionService $versionService)
    {
        $result = $versionService->getTimeline($projectId, $request->user());
        return response()->json($result, $result['status'] ?? 200);
    }

    /** Push a project version to GitHub. */
    public function pushToGithub(Request $request, $id, ProjectVersionService $versionService)
    {
        $user = $request->user();

        if (!$user->github_token) {
            return response()->json(['message' => 'يرجى ربط حسابك بـ GitHub أولاً.'], 403);
        }

        $result = $versionService->pushToGithub($id, $user);

        return response()->json($result, $result['status'] ?? 200);
    }
}

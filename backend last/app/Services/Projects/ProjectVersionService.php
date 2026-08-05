<?php

namespace App\Services\Projects;


use App\Services\Auth\GithubService;
use App\Services\Notifications\NotificationService;
use App\Models\Project;
use App\Models\ProjectActivity;
use App\Models\ProjectVersion;
use App\Models\User;
use App\Support\ProjectAccess;
use Carbon\Carbon;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

class ProjectVersionService
{
    /** Injects notification and GitHub service dependencies. */
    public function __construct(
        protected NotificationService $notifications,
        protected GithubService $githubService,
    ) {}

    /** Checks whether the user can access the project. */
    private function canAccessProject(User $user, Project $project): bool
    {
        return ProjectAccess::canAccess($user, $project);
    }

    /** Maps a version model to an API payload. */
    private function formatVersion(ProjectVersion $version): array
    {
        return [
            'id'                  => $version->id,
            'user_id'             => $version->user_id,
            'version_title'       => $version->version_title,
            'version_description' => $version->version_description,
            'file_url'            => $version->file_path ? asset('storage/' . $version->file_path) : null,
            'uploaded_by'         => $version->user?->name,
            'created_at'          => $version->created_at,
        ];
    }

    /** Uploads a new project version file and logs the activity. */
    public function uploadVersion(array $data, UploadedFile $file, User $user): array
    {
        $project = Project::query()->whereKey($data['project_id'])->first();
        if (!$project) {
            return ['status' => 404, 'message' => 'Resource not found.'];
        }
        if (!$this->canAccessProject($user, $project)) {
            return ['status' => 403, 'message' => 'Unauthorized'];
        }

        $path = $file->store('versions', 'public');

        $version = ProjectVersion::create([
            'project_id'          => $project->id,
            'user_id'             => $user->id,
            'version_title'       => $data['version_title'],
            'version_description' => $data['version_description'] ?? null,
            'file_path'           => $path,
        ]);

        ProjectActivity::create([
            'project_id' => $project->id,
            'user_id'    => $user->id,
            'action'     => 'رفع إصداراً جديداً: ' . $version->version_title,
            'action_key' => 'versionUploaded',
            'meta'       => ['title' => $version->version_title],
            'type'       => 'create',
        ]);

        try {
            $this->notifications->notifyProject(
                project: $project,
                type: 'version_uploaded',
                title: 'تم رفع إصدار جديد',
                body: "قام {$user->name} برفع إصدار {$version->version_title} داخل مشروع {$project->title}",
                data: [
                    'project_id'    => $project->id,
                    'version_id'    => $version->id,
                    'url'           => "/dashboard/projects/{$project->id}",
                    'actor_name'    => $user->name,
                    'version_title' => $version->version_title,
                    'project_title' => $project->title,
                ],
                ignoreUserId: $user->id,
            );
        } catch (\Throwable $e) {
            report($e);
        }

        return [
            'status'  => 201,
            'message' => 'Version uploaded successfully',
            'version' => $version->load('user:id,name'),
        ];
    }

    public function getVersions(int|string $projectId, User $user): array
    {
        $project = Project::query()->whereKey($projectId)->first();
        if (!$project) {
            return ['status' => 404, 'message' => 'Resource not found.'];
        }
        if (!$this->canAccessProject($user, $project)) {
            return ['status' => 403, 'message' => 'Unauthorized'];
        }

        $versions = ProjectVersion::query()
            ->forCurrentUniversity()
            ->where('project_id', $projectId)
            ->with('user:id,name')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (ProjectVersion $version) => $this->formatVersion($version));

        return ['status' => 200, 'versions' => $versions];
    }

    /** Deletes a version if the user is the project or version owner. */
    public function deleteVersion(int|string $versionId, User $user): array
    {
        $version = ProjectVersion::query()->forCurrentUniversity()->whereKey($versionId)->first();
        if (!$version) {
            return ['status' => 404, 'message' => 'Resource not found.'];
        }

        $project = Project::query()->whereKey($version->project_id)->first();
        if (!$project) {
            return ['status' => 404, 'message' => 'Resource not found.'];
        }

        $isOwnerProject = (int) $project->user_id === (int) $user->id;
        $isOwnerVersion = (int) $version->user_id === (int) $user->id;

        if (!$isOwnerProject && !$isOwnerVersion) {
            return ['status' => 403, 'message' => 'Unauthorized'];
        }

        ProjectActivity::create([
            'project_id' => $project->id,
            'user_id'    => $user->id,
            'action'     => 'حذف الإصدار: ' . $version->version_title,
            'action_key' => 'versionDeleted',
            'meta'       => ['title' => $version->version_title],
            'type'       => 'update',
        ]);

        if ($version->file_path && Storage::disk('public')->exists($version->file_path)) {
            Storage::disk('public')->delete($version->file_path);
        }

        $version->delete();

        return ['status' => 200, 'message' => 'Version deleted successfully'];
    }

    /** Returns versions grouped by month for timeline display. */
    public function getTimeline(int|string $projectId, User $user): array
    {
        $project = Project::query()->whereKey($projectId)->first();
        if (!$project) {
            return ['status' => 404, 'message' => 'Resource not found.'];
        }
        if (!$this->canAccessProject($user, $project)) {
            return ['status' => 403, 'message' => 'Unauthorized'];
        }

        $versions = ProjectVersion::query()
            ->forCurrentUniversity()
            ->where('project_id', $projectId)
            ->with('user:id,name')
            ->orderByDesc('created_at')
            ->get();

        $timeline = $versions
            ->groupBy(fn (ProjectVersion $version) => Carbon::parse($version->created_at)->format('F Y'))
            ->map(fn ($items, string $month) => [
                'month'    => $month,
                'versions' => $items->map(fn (ProjectVersion $version) => [
                    'id'            => $version->id,
                    'version_title' => $version->version_title,
                    'created_at'    => Carbon::parse($version->created_at)->format('Y-m-d H:i'),
                ])->values(),
            ])
            ->values();

        return ['status' => 200, 'timeline' => $timeline];
    }

    /** Pushes a version file to GitHub on behalf of the project owner. */
    public function pushToGithub(int|string $versionId, User $user): array
    {
        $version = ProjectVersion::query()->forCurrentUniversity()->whereKey($versionId)->first();
        if (!$version) {
            return ['status' => 404, 'message' => 'Resource not found.'];
        }

        $project = Project::query()->whereKey($version->project_id)->first();
        if (!$project) {
            return ['status' => 404, 'message' => 'Resource not found.'];
        }
        if (!$this->canAccessProject($user, $project)) {
            return ['status' => 403, 'message' => 'Unauthorized'];
        }
        if ((int) $project->user_id !== (int) $user->id) {
            return ['status' => 403, 'message' => 'Only the project owner can push to GitHub.'];
        }
        if (!$user->github_token) {
            return ['status' => 403, 'message' => 'Please link your GitHub account first.'];
        }

        return $this->githubService->pushVersionToGithub(
            $project,
            $version->version_title,
            $version->version_description,
            $version->file_path,
        );
    }
}

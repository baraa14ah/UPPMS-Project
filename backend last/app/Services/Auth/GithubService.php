<?php

namespace App\Services\Auth;

use App\Models\Project;
use App\Models\GitCommit;
use App\Models\ProjectActivity;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class GithubService
{
    /** Fetches and stores recent commits from the project's GitHub repository. */
    public function syncProjectCommits(Project $project)
    {
        if (!$project->github_repo_url) {
            return ['status' => 422, 'message' => 'GitHub repo URL is missing'];
        }

        $url = trim($project->github_repo_url, '/');
        $url = preg_replace('/\.git$/', '', $url);

        if (!preg_match('~github\.com/([^/]+)/([^/\?]+)~i', $url, $m)) {
            return [
                'status' => 422,
                'message' => 'Invalid GitHub repo URL',
                'details' => $project->github_repo_url
            ];
        }

        $owner = $m[1];
        $repo  = $m[2];

        $token = env('GITHUB_TOKEN');
        if (!$token) {
            return [
                'status' => 500,
                'message' => 'GITHUB_TOKEN is missing in .env file. Please add it.'
            ];
        }

        $apiUrl = "https://api.github.com/repos/{$owner}/{$repo}/commits?per_page=30";

        try {
            $res = Http::withHeaders([
                'Accept' => 'application/vnd.github+json',
                'Authorization' => "Bearer {$token}",
                'X-GitHub-Api-Version' => '2022-11-28',
                'User-Agent' => 'Project-Management-System'
            ])->get($apiUrl);

            if (!$res->successful()) {
                Log::error("GitHub API Failed for Project {$project->id}: " . $res->body());
                
                $errorMessage = $res->status() === 404 
                    ? 'Repository not found. Make sure the URL is correct and the Token has access to private repos.' 
                    : 'Failed to fetch commits from GitHub';

                return [
                    'status' => $res->status() === 404 ? 404 : 500,
                    'message' => $errorMessage,
                    'details' => $res->json()
                ];
            }

            $items = $res->json() ?? [];
            $saved = 0;

            foreach ($items as $item) {
                $sha = $item['sha'] ?? null;
                if (!$sha) continue;

                GitCommit::updateOrCreate(
                    [
                        'project_id'  => $project->id,
                        'commit_hash' => $sha,
                    ],
                    [
                        'author_name'  => $item['commit']['author']['name'] ?? null,
                        'message'      => $item['commit']['message'] ?? null,
                        'committed_at' => $item['commit']['author']['date'] ?? null,
                        'url'          => $item['html_url'] ?? null,
                    ]
                );
                $saved++;
            }

            if ($saved > 0) {
                ProjectActivity::create([
                    'project_id' => $project->id,
                    'user_id' => auth()->id() ?? $project->user_id,
                    'action' => "قام بمزامنة الكود وجلب {$saved} تحديثات من مستودع GitHub",
                    'action_key' => 'githubSynced',
                    'meta' => ['count' => $saved],
                    'type' => 'update',
                ]);
            }

            return [
                'status' => 200,
                'message' => 'Commits synced successfully',
                'count' => $saved
            ];

        } catch (\Throwable $e) {
            Log::error("GitHub Sync Exception: " . $e->getMessage());
            return [
                'status' => 500,
                'message' => 'Server error while syncing commits',
                'details' => $e->getMessage()
            ];
        }
    }

    /** Uploads a version file to the project's GitHub repository. */
    public function pushVersionToGithub($project, $title, $description, $filePath)
    {
        $user = auth()->user();
        if (!$user || !$user->github_token) {
            return ['status' => 403, 'message' => 'يرجى ربط حسابك بـ GitHub أولاً.'];
        }
        $cleanToken = trim($user->github_token);

        $repoUrl = rtrim($project->github_repo_url, '/');
        $urlParts = explode('github.com/', $repoUrl);
        if (count($urlParts) < 2) {
            return ['status' => 400, 'message' => 'رابط المستودع غير صالح.'];
        }
        $repoPath = trim($urlParts[1]);

        if (!\Illuminate\Support\Facades\Storage::disk('public')->exists($filePath)) {
            return ['status' => 404, 'message' => 'الملف غير موجود على السيرفر'];
        }
        $fileContent = \Illuminate\Support\Facades\Storage::disk('public')->get($filePath);
        $base64Content = base64_encode($fileContent);

        $extension = pathinfo($filePath, PATHINFO_EXTENSION);
        $safeVersionName = str_replace(' ', '_', $title);
        $fileName = rawurlencode($safeVersionName . '.' . $extension);

        $commitMessage = $description ? $description : "تحديث جديد للإصدار: {$title}";

        $response = \Illuminate\Support\Facades\Http::withToken($cleanToken)
            ->withoutVerifying()
            ->timeout(60)
            ->withHeaders([
                'User-Agent' => 'My-Graduation-Project',
                'Accept' => 'application/vnd.github.v3+json',
            ])
            ->put("https://api.github.com/repos/{$repoPath}/contents/versions/{$fileName}", [
                'message' => $commitMessage,
                'content' => $base64Content,
            ]);

        if ($response->successful()) {
            ProjectActivity::create([
                'project_id' => $project->id,
                'user_id' => $user->id,
                'action' => "دفع الإصدار '{$title}' مباشرة إلى مستودع GitHub",
                'action_key' => 'githubPushed',
                'meta' => ['title' => $title],
                'type' => 'create',
            ]);

            return ['status' => 200, 'message' => 'تم الرفع إلى GitHub بنجاح! 🚀'];
        }

        $errorMsg = $response->json('message') ?? 'فشل الرفع لسبب غير معروف';
        return ['status' => $response->status(), 'message' => 'خطأ من GitHub: ' . $errorMsg];
    }
}

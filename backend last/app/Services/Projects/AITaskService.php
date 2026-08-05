<?php

namespace App\Services\Projects;



use App\Services\Notifications\NotificationService;
use App\Services\BaseService;
use App\Models\Project;
use App\Models\ProjectActivity;
use App\Models\Task;
use App\Models\TaskGenerationLog;
use App\Models\User;
use Exception;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class AITaskService extends BaseService
{
    private string $apiKey;
    private string $endpoint;
    private int $timeout;
    private int $maxRetries;

    public function __construct(
        protected NotificationService $notifications,
    ) {
        $this->apiKey = (string) config('services.gemini.api_key', '');
        $this->endpoint = (string) config('services.gemini.endpoint', '');
        $this->timeout = (int) config('services.gemini.timeout', 60);
        $this->maxRetries = (int) config('services.gemini.retry_attempts', 3);
    }

    /** Generate tasks for a project from its title and description. */
    public function generateTasks(User $user, Project $project, bool $regenerate = false): array
    {
        if ($this->apiKey === '' || $this->endpoint === '') {
            throw new Exception('AI service configuration error. Contact support.');
        }

        $startTime = microtime(true);

        try {
            $description = trim($project->description ?? '');
            if (mb_strlen($description) < 20) {
                throw ValidationException::withMessages([
                    'description' => ['Project description must be at least 20 characters to generate tasks.'],
                ]);
            }

            $this->assertGenerationAllowed($project, $regenerate);

            $response = $this->callGeminiWithRetry($project);
            $tasks = $this->parseAndValidateResponse($response);
            $result = $this->saveTasksTransactionally($user, $project, $tasks, $regenerate);

            $this->logRequest($user, $project, 'success', count($result['tasks']), null, $startTime);

            return $result;
        } catch (ValidationException $e) {
            $message = collect($e->errors())->flatten()->first() ?? 'Validation failed.';
            $this->logRequest($user, $project, 'error', null, $message, $startTime);
            throw $e;
        } catch (Exception $e) {
            $status = str_contains(strtolower($e->getMessage()), 'timeout') ? 'timeout' : 'error';
            $this->logRequest($user, $project, $status, null, $e->getMessage(), $startTime);
            throw $e;
        }
    }

    /** Sanitize project text before sending to the AI. */
    private function sanitizeProjectInput(string $input, int $maxLength): string
    {
        $sanitized = strip_tags($input);
        $sanitized = preg_replace('/[<>{}\\[\\]]/u', '', $sanitized);
        $sanitized = mb_substr($sanitized, 0, $maxLength);
        $sanitized = preg_replace('/\s+/', ' ', trim($sanitized));

        return $sanitized;
    }

    /** Reject duplicate generation or regeneration when AI tasks were already started. */
    private function assertGenerationAllowed(Project $project, bool $regenerate): void
    {
        $hasAiTasks = $project->tasks()->where('ai_generated', true)->exists();

        if (!$hasAiTasks) {
            return;
        }

        if (!$regenerate) {
            throw ValidationException::withMessages([
                'regenerate' => ['AI tasks already exist. Set regenerate=true to replace them.'],
            ]);
        }

        $modifiedAiTasks = $project->tasks()
            ->where('ai_generated', true)
            ->where('status', '!=', 'pending')
            ->exists();

        if ($modifiedAiTasks) {
            throw ValidationException::withMessages([
                'regenerate' => ['Cannot regenerate tasks after AI-generated tasks have been started or completed.'],
            ]);
        }
    }

    /** Detect Arabic characters in text. */
    private function inputIsArabic(string $input): bool
    {
        return (bool) preg_match('/[\x{0600}-\x{06FF}\x{0750}-\x{077F}\x{08A0}-\x{08FF}]/u', $input);
    }

    /** Build the prompt with language instruction. */
    private function buildPrompt(Project $project): string
    {
        $title = $this->sanitizeProjectInput($project->title ?? '', 200);
        $description = $this->sanitizeProjectInput($project->description ?? '', 5000);
        $combined = $title . ' ' . $description;

        $isArabic = $this->inputIsArabic($combined);
        $languageInstruction = $isArabic
            ? 'LANGUAGE: The project is in Arabic. Write task titles and descriptions in Modern Standard Arabic. Keep technology names in English.'
            : 'LANGUAGE: Write task titles and descriptions in English.';

        $template = (string) config('ai.task_breakdown_prompt', '');
        $taskCount = (int) config('ai.task_generation_count', 10);

        return str_replace(
            ['{language_instruction}', '{project_title}', '{project_description}', '{task_count}'],
            [$languageInstruction, $title, $description, (string) $taskCount],
            $template,
        );
    }

    /** Call Gemini API with retry logic. */
    private function callGeminiWithRetry(Project $project): string
    {
        $prompt = $this->buildPrompt($project);

        try {
            $response = Http::timeout($this->timeout)
                ->retry(
                    $this->maxRetries,
                    500,
                    function ($exception) {
                        if ($exception instanceof ConnectionException) {
                            return true;
                        }

                        if ($exception instanceof RequestException) {
                            $status = $exception->response?->status();
                            return $status === null || $status >= 500;
                        }

                        return false;
                    },
                    throw: false,
                )
                ->withHeaders([
                    'Content-Type' => 'application/json',
                    'x-goog-api-key' => $this->apiKey,
                ])
                ->post($this->endpoint, [
                    'contents' => [
                        ['parts' => [['text' => $prompt]]],
                    ],
                    'generationConfig' => [
                        'temperature' => 0.7,
                        'maxOutputTokens' => 4096,
                        'responseMimeType' => 'application/json',
                    ],
                ]);

            if ($response->successful()) {
                $data = $response->json();
                $text = $data['candidates'][0]['content']['parts'][0]['text'] ?? '';

                if ($text === '') {
                    throw new Exception('Unable to process AI response. Please try again.');
                }

                return $text;
            }

            if ($response->status() >= 500) {
                throw new Exception('AI service temporarily unavailable. Please try again later.');
            }

            $apiError = $response->json('error.message') ?? $response->body();
            Log::warning('Gemini API client error (tasks)', [
                'status' => $response->status(),
                'message' => is_string($apiError) ? mb_substr($apiError, 0, 500) : $apiError,
            ]);

            if ($response->status() === 404) {
                throw new Exception('AI model is unavailable. Contact support.');
            }

            if ($response->status() === 401 || $response->status() === 403) {
                throw new Exception('AI service configuration error. Contact support.');
            }

            throw new Exception('Unable to process AI response. Please try again.');
        } catch (ConnectionException $e) {
            Log::warning('Gemini API connection failed (tasks): ' . $e->getMessage());
            throw new Exception('AI service temporarily unavailable. Please try again later.');
        }
    }

    /** Parse and validate the JSON response from Gemini. */
    private function parseAndValidateResponse(string $response): array
    {
        $cleaned = preg_replace('/```json\s*|\s*```/', '', $response);
        $cleaned = trim($cleaned);

        $data = json_decode($cleaned, true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new Exception('Unable to process AI response. Please try again.');
        }

        $maxTasks = (int) config('ai.task_generation_count', 10);

        $validator = Validator::make($data, [
            'tasks' => "required|array|min:1|max:{$maxTasks}",
            'tasks.*.title' => 'required|string|max:100',
            'tasks.*.description' => 'required|string|max:500',
            'tasks.*.estimated_hours' => 'required|integer|min:1|max:40',
        ]);

        if ($validator->fails()) {
            throw new Exception('Unable to process AI response. Please try again.');
        }

        return array_slice($data['tasks'], 0, $maxTasks);
    }

    /** Save tasks within a transaction. Optionally delete existing AI tasks. */
    private function saveTasksTransactionally(User $user, Project $project, array $tasks, bool $regenerate): array
    {
        return DB::transaction(function () use ($user, $project, $tasks, $regenerate) {
            $replacedCount = 0;

            if ($regenerate) {
                $replacedCount = $project->tasks()->where('ai_generated', true)->count();
                $project->tasks()->where('ai_generated', true)->delete();
            }

            $savedTasks = [];
            foreach ($tasks as $taskData) {
                $savedTasks[] = Task::create([
                    'project_id' => $project->id,
                    'university_id' => $project->university_id,
                    'title' => $taskData['title'],
                    'description' => $taskData['description'],
                    'estimated_hours' => $taskData['estimated_hours'],
                    'ai_generated' => true,
                    'status' => 'pending',
                ]);
            }

            $this->recordGenerationActivity($user, $project, count($savedTasks), $replacedCount);

            return ['tasks' => $savedTasks, 'replaced_count' => $replacedCount];
        });
    }

    /** Log project activity and notify participants after AI task generation. */
    private function recordGenerationActivity(
        User $user,
        Project $project,
        int $taskCount,
        int $replacedCount = 0,
    ): void {
        $isRegenerate = $replacedCount > 0;
        $actionKey = $isRegenerate ? 'tasksAiRegenerated' : 'tasksAiGenerated';
        $action = $isRegenerate
            ? "قام بإعادة توليد {$taskCount} مهمة للمشروع بالذكاء الاصطناعي"
            : "قام بتوليد {$taskCount} مهمة للمشروع بالذكاء الاصطناعي";

        ProjectActivity::create([
            'project_id' => $project->id,
            'user_id' => $user->id,
            'action' => $action,
            'action_key' => $actionKey,
            'meta' => ['count' => $taskCount, 'replaced' => $replacedCount],
            'type' => 'create',
        ]);

        $notificationTitle = $isRegenerate
            ? 'إعادة توليد مهام بالذكاء الاصطناعي'
            : 'توليد مهام بالذكاء الاصطناعي';
        $notificationBody = $isRegenerate
            ? "{$user->name} قام بإعادة توليد {$taskCount} مهمة للمشروع بالذكاء الاصطناعي"
            : "{$user->name} قام بتوليد {$taskCount} مهمة للمشروع بالذكاء الاصطناعي";

        $this->notifications->notifyProjectParticipants(
            projectId: (int) $project->id,
            actorUserId: (int) $user->id,
            type: 'task.ai_generated',
            title: $notificationTitle,
            body: $notificationBody,
            data: [
                'project_id' => $project->id,
                'url' => "/dashboard/projects/{$project->id}",
                'actor_name' => $user->name,
                'task_count' => $taskCount,
                'project_title' => $project->title,
            ],
        );
    }

    /** Log the generation request for analytics. */
    private function logRequest(User $user, Project $project, string $status, ?int $taskCount, ?string $error, float $startTime): void
    {
        $responseTimeMs = (int) ((microtime(true) - $startTime) * 1000);

        TaskGenerationLog::create([
            'user_id' => $user->id,
            'project_id' => $project->id,
            'status' => $status,
            'task_count' => $taskCount,
            'response_time_ms' => $responseTimeMs,
            'error_message' => $error ? mb_substr($error, 0, 255) : null,
            'created_at' => now(),
        ]);
    }
}

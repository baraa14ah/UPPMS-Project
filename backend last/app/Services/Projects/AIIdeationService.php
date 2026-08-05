<?php

namespace App\Services\Projects;


use App\Services\BaseService;
use App\Models\BookmarkedIdea;
use App\Models\IdeationRequest;
use App\Models\User;
use Exception;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class AIIdeationService extends BaseService
{
    private string $apiKey;
    private string $endpoint;
    private int $timeout;
    private int $maxRetries;

    /** Load Gemini API settings from config. */
    public function __construct()
    {
        $this->apiKey = (string) config('services.gemini.api_key', '');
        $this->endpoint = (string) config('services.gemini.endpoint', '');
        $this->timeout = (int) config('services.gemini.timeout', 60);
        $this->maxRetries = (int) config('services.gemini.retry_attempts', 3);
    }

    /** Generate project suggestions from student interests via Gemini. */
    public function generateSuggestions(User $user, string $interests, array $excludeNames = []): array
    {
        if ($this->apiKey === '' || $this->endpoint === '') {
            throw new Exception('AI service configuration error. Contact support.');
        }

        $sanitizedInterests = $this->sanitizeInput($interests);
        $this->assertMinimumInterestsLength($sanitizedInterests);

        $excludeNames = $this->normalizeExcludeNames($excludeNames);
        $startTime = microtime(true);

        try {
            $response = $this->callGeminiWithRetry($sanitizedInterests, $excludeNames);
            $suggestions = $this->parseAndValidateResponse($response);

            $this->logRequest($user, $sanitizedInterests, 'success', null, $startTime);

            return $suggestions;
        } catch (Exception $e) {
            $status = str_contains(strtolower($e->getMessage()), 'timeout') ? 'timeout' : 'error';
            $this->logRequest($user, $sanitizedInterests, $status, $e->getMessage(), $startTime);
            throw $e;
        }
    }

    /** Save a suggestion as a bookmark with auto-archive when limit exceeded. */
    public function bookmark(User $user, array $suggestion): array
    {
        return DB::transaction(function () use ($user, $suggestion) {
            $activeBookmarks = $user->bookmarkedIdeas()
                ->active()
                ->orderBy('created_at')
                ->lockForUpdate()
                ->get();

            $archivedOldest = false;

            if ($activeBookmarks->count() >= 10) {
                $oldest = $activeBookmarks->first();
                if ($oldest) {
                    $oldest->update(['archived' => true]);
                    $archivedOldest = true;
                }
            }

            $bookmark = BookmarkedIdea::create([
                'user_id' => $user->id,
                'suggestion_name' => $suggestion['name'],
                'suggestion_goal' => $suggestion['goal'],
                'suggestion_technologies' => $suggestion['technologies'],
                'archived' => false,
            ]);

            return [
                'bookmark' => $bookmark,
                'archived_oldest' => $archivedOldest,
            ];
        });
    }

    /** Sanitize user interests input before sending to the AI. */
    public function sanitizeInput(string $input): string
    {
        $sanitized = strip_tags($input);
        $sanitized = preg_replace('/[<>{}\\[\\]]/u', '', $sanitized);
        $sanitized = mb_substr($sanitized, 0, 500);
        $sanitized = preg_replace('/\s+/', ' ', trim($sanitized));

        return $sanitized;
    }

    /** Parse and validate a raw AI JSON response (exposed for unit tests). */
    public function parseResponseForTest(string $response): array
    {
        return $this->parseAndValidateResponse($response);
    }

    /** Ensure sanitized interests still meet the minimum length requirement. */
    private function assertMinimumInterestsLength(string $interests): void
    {
        if (mb_strlen($interests) < 10) {
            throw ValidationException::withMessages([
                'interests' => ['Please provide more details about your interests (at least 10 characters).'],
            ]);
        }
    }

    /** Normalize and deduplicate project names to exclude from regeneration. */
    private function normalizeExcludeNames(array $excludeNames): array
    {
        $normalized = [];

        foreach ($excludeNames as $name) {
            $trimmed = trim((string) $name);
            if ($trimmed !== '') {
                $normalized[] = $trimmed;
            }
        }

        return array_values(array_unique($normalized));
    }

    /** Call Gemini API with retry on transient failures only. */
    private function callGeminiWithRetry(string $interests, array $excludeNames): string
    {
        $prompt = $this->buildPrompt($interests, $excludeNames);

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
                        'maxOutputTokens' => 2048,
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
            Log::warning('Gemini API client error', [
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
            Log::warning('Gemini API connection failed: ' . $e->getMessage());
            throw new Exception('AI service temporarily unavailable. Please try again later.');
        }
    }

    /** Build the JSON-only prompt for Gemini from config template. */
    private function buildPrompt(string $interests, array $excludeNames): string
    {
        $isArabic = $this->inputIsArabic($interests);
        $excludeSection = '';

        if ($excludeNames !== []) {
            $list = implode(', ', $excludeNames);
            $excludeSection = $isArabic
                ? "لا تعِد استخدام أو تُقارِب أسماء المشاريع التالية: {$list}."
                : "Do NOT reuse or closely resemble these project names: {$list}.";
        }

        $languageInstruction = $isArabic
            ? 'LANGUAGE: The student wrote in Arabic. Write every "name" and "goal" field in Modern Standard Arabic. Keep technology names in standard English (e.g., React, Laravel, MySQL, Python).'
            : 'LANGUAGE: Write every "name" and "goal" field in English.';

        $template = (string) config('ai.ideation_prompt', '');

        return str_replace(
            ['{interests}', '{exclude_section}', '{language_instruction}'],
            [$interests, $excludeSection, $languageInstruction],
            $template,
        );
    }

    /** Detect whether the student interests are primarily Arabic. */
    private function inputIsArabic(string $input): bool
    {
        return (bool) preg_match('/[\x{0600}-\x{06FF}\x{0750}-\x{077F}\x{08A0}-\x{08FF}]/u', $input);
    }

    /** Parse and validate the AI JSON response schema. */
    private function parseAndValidateResponse(string $response): array
    {
        $cleaned = preg_replace('/```json\s*|\s*```/', '', $response);
        $cleaned = trim($cleaned);

        $data = json_decode($cleaned, true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new Exception('Unable to process AI response. Please try again.');
        }

        $validator = Validator::make($data, [
            'suggestions' => 'required|array|size:3',
            'suggestions.*.name' => 'required|string|max:100',
            'suggestions.*.goal' => 'required|string|max:500',
            'suggestions.*.technologies' => 'required|array|min:1|max:10',
            'suggestions.*.technologies.*' => 'required|string|max:50',
        ]);

        if ($validator->fails()) {
            throw new Exception('Unable to process AI response. Please try again.');
        }

        return array_map(static function (array $suggestion) {
            return [
                'name' => $suggestion['name'],
                'goal' => $suggestion['goal'],
                'technologies' => array_values($suggestion['technologies']),
            ];
        }, $data['suggestions']);
    }

    /** Log an ideation request with hashed interests for analytics. */
    private function logRequest(User $user, string $interests, string $status, ?string $error, float $startTime): void
    {
        $responseTimeMs = (int) ((microtime(true) - $startTime) * 1000);

        IdeationRequest::create([
            'user_id' => $user->id,
            'interests_hash' => hash('sha256', $interests),
            'status' => $status,
            'error_message' => $error ? mb_substr($error, 0, 255) : null,
            'response_time_ms' => $responseTimeMs,
            'created_at' => now(),
        ]);
    }
}

<?php

namespace App\Http\Controllers\Projects;


use App\Http\Controllers\Controller;
use App\Models\BookmarkedIdea;
use App\Services\Projects\AIIdeationService;
use App\Traits\ApiResponseTrait;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class AIIdeationController extends Controller
{
    use ApiResponseTrait;

    /** Initialize AI ideation service. */
    public function __construct(
        protected AIIdeationService $aiService,
    ) {}

    /** Generate AI project suggestions from student interests. */
    public function suggest(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'interests' => 'required|string|min:10|max:500',
            'exclude_names' => 'sometimes|array|max:30',
            'exclude_names.*' => 'string|max:100',
        ], [
            'interests.required' => 'Please describe your technical interests.',
            'interests.min' => 'Please provide more details about your interests (at least 10 characters).',
            'interests.max' => 'Interest description is too long (maximum 500 characters).',
        ]);

        try {
            $suggestions = $this->aiService->generateSuggestions(
                $request->user(),
                $validated['interests'],
                $validated['exclude_names'] ?? [],
            );

            return $this->successResponse([
                'suggestions' => $suggestions,
                'generated_at' => now()->toIso8601String(),
            ], 'Project suggestions generated successfully');
        } catch (ValidationException $e) {
            return $this->errorResponse(
                collect($e->errors())->flatten()->first() ?? 'Validation failed.',
                422,
                $e->errors(),
            );
        } catch (Exception $e) {
            $statusCode = str_contains($e->getMessage(), 'temporarily unavailable') ? 503 : 500;

            return $this->errorResponse($e->getMessage(), $statusCode);
        }
    }

    /** Save an AI suggestion as a student bookmark. */
    public function storeBookmark(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'goal' => 'required|string|max:500',
            'technologies' => 'required|array|min:1|max:10',
            'technologies.*' => 'required|string|max:50',
        ]);

        $result = $this->aiService->bookmark($request->user(), $validated);

        $message = $result['archived_oldest']
            ? 'Idea bookmarked successfully. Your oldest bookmark was archived to make room.'
            : 'Idea bookmarked successfully';

        return $this->successResponse($result['bookmark'], $message, 201);
    }

    /** List bookmarks for the authenticated student. */
    public function listBookmarks(Request $request): JsonResponse
    {
        $user = $request->user();
        $includeArchived = $request->boolean('include_archived', false);

        $query = $user->bookmarkedIdeas()->orderBy('created_at', 'desc');

        if (!$includeArchived) {
            $query->active();
        }

        $bookmarks = $query->get();

        $countsByArchived = $user->bookmarkedIdeas()
            ->selectRaw('archived, COUNT(*) as total')
            ->groupBy('archived')
            ->pluck('total', 'archived');

        return $this->successResponse([
            'bookmarks' => $bookmarks,
            'active_count' => (int) ($countsByArchived[0] ?? 0),
            'archived_count' => (int) ($countsByArchived[1] ?? 0),
            'limit' => 10,
        ], 'Bookmarks retrieved successfully');
    }

    public function deleteBookmark(Request $request, int $id): JsonResponse
    {
        $bookmark = BookmarkedIdea::where('id', $id)
            ->where('user_id', $request->user()->id)
            ->first();

        if (!$bookmark) {
            return $this->errorResponse('Bookmark not found', 404);
        }

        $bookmark->delete();

        return $this->successResponse(null, 'Bookmark deleted successfully');
    }
}

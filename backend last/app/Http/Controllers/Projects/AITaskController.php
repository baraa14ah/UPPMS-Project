<?php

namespace App\Http\Controllers\Projects;


use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Services\Projects\AITaskService;
use App\Support\ProjectAccess;
use App\Traits\ApiResponseTrait;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class AITaskController extends Controller
{
    use ApiResponseTrait;

    public function __construct(
        protected AITaskService $taskService,
    ) {}

    /** Generate AI tasks for a project. */
    public function generate(Request $request, int $project): JsonResponse
    {
        $user = $request->user();

        $projectModel = Project::find($project);

        if (!$projectModel) {
            return $this->errorResponse('Project not found', 404);
        }

        if (!ProjectAccess::canAccess($user, $projectModel)) {
            return $this->errorResponse('You do not have access to this project', 403);
        }

        $regenerate = $request->boolean('regenerate', false);

        try {
            $result = $this->taskService->generateTasks($user, $projectModel, $regenerate);

            $tasks = $result['tasks'];
            $replacedCount = $result['replaced_count'];

            $totalHours = array_sum(array_map(
                fn ($task) => (int) $task->estimated_hours,
                $tasks,
            ));

            $message = $replacedCount > 0
                ? "Tasks regenerated successfully. {$replacedCount} previous AI-generated tasks were replaced."
                : 'Tasks generated successfully';

            return $this->successResponse([
                'tasks' => $tasks,
                'total_estimated_hours' => $totalHours,
                'generated_at' => now()->toIso8601String(),
                'replaced_count' => $replacedCount,
            ], $message, 201);
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
}

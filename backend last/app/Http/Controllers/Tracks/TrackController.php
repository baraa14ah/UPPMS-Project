<?php

namespace App\Http\Controllers\Tracks;


use App\Http\Controllers\Controller;
use App\Models\DefenseSession;
use App\Models\Project;
use App\Models\Track;
use App\Models\TrackStage;
use App\Models\User;
use App\Services\Tracks\TrackService;
use App\Support\TrackStageHierarchy;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class TrackController extends Controller
{
    public function __construct(
        protected TrackService $service,
    ) {
    }

    public function index(Request $request)
    {
        $user = $request->user();
        $isActive = $request->has('is_active') ? filter_var($request->query('is_active'), FILTER_VALIDATE_BOOLEAN) : null;
        $search = $request->query('search');
        $perPage = min(50, max(1, (int) $request->query('per_page', 15)));

        $paginator = $this->service->getTracksForUniversity(
            (int) $user->university_id,
            $isActive,
            $search,
            $perPage,
        );

        $tracks = collect($paginator->items())->map(fn (Track $track) => $this->formatTrackSummary($track));

        return response()->json([
            'message' => 'Tracks retrieved successfully',
            'data' => [
                'data' => $tracks,
                'current_page' => $paginator->currentPage(),
                'total' => $paginator->total(),
                'per_page' => $paginator->perPage(),
                'last_page' => $paginator->lastPage(),
            ],
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'stages' => 'required|array|min:1',
            'stages.*.name' => 'required_with:stages.*.steps|string|max:255',
            'stages.*.description' => 'nullable|string|max:1000',
            'stages.*.academic_stage_id' => 'required_without:stages.*.steps|nullable|exists:academic_stages_config,id',
            'stages.*.is_decisive' => 'sometimes|boolean',
            'stages.*.stage_kind' => 'sometimes|in:phase,step',
            'stages.*.steps' => 'sometimes|array|min:1',
            'stages.*.steps.*.description' => 'nullable|string|max:1000',
            'stages.*.steps.*.academic_stage_id' => 'required|exists:academic_stages_config,id',
            'stages.*.steps.*.is_decisive' => 'sometimes|boolean',
        ]);

        try {
            $track = $this->service->createTrack($validated, (int) $request->user()->university_id);
        } catch (ValidationException $e) {
            return $this->validationResponse($e);
        }

        return response()->json([
            'message' => 'Track created successfully',
            'data' => $this->formatTrackDetail($track),
        ], 201);
    }

    public function show(Track $track)
    {
        $track->load(['stages.academicStage']);
        $track->loadCount('students');

        $stages = $track->stages->map(function (TrackStage $stage) {
            $studentsCount = $stage->progress()->where('status', 'in_progress')->count();

            return [
                'id' => $stage->id,
                'sequence_order' => $stage->sequence_order,
                'name' => $stage->name,
                'description' => $stage->description,
                'academic_stage' => $stage->academicStage ? [
                    'id' => $stage->academicStage->id,
                    'name' => $stage->academicStage->name,
                    'duration_minutes' => $stage->academicStage->duration_minutes ?? null,
                ] : null,
                'is_decisive' => (bool) $stage->is_decisive,
                'students_count' => $studentsCount,
            ];
        });

        return response()->json([
            'message' => 'Track retrieved successfully',
            'data' => array_merge($this->formatTrackDetail($track), [
                'stages' => $stages,
                'students_count' => $track->students_count,
            ]),
        ]);
    }

    public function update(Request $request, Track $track)
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string|max:1000',
            'is_active' => 'sometimes|boolean',
        ]);

        try {
            $track = $this->service->updateTrack($track, $validated);
        } catch (ValidationException $e) {
            return $this->validationResponse($e);
        }

        return response()->json([
            'message' => 'Track updated successfully',
            'data' => $this->formatTrackDetail($track),
        ]);
    }

    public function destroy(Track $track)
    {
        $this->service->deleteTrack($track);

        return response()->json([
            'message' => 'Track deleted successfully',
            'action' => 'deleted',
        ]);
    }

    public function addStage(Request $request, Track $track)
    {
        $validated = $request->validate([
            'description' => 'nullable|string|max:1000',
            'academic_stage_id' => 'required|exists:academic_stages_config,id',
            'position' => 'nullable|integer|min:1',
            'is_decisive' => 'sometimes|boolean',
            'parent_id' => 'nullable|exists:track_stages,id',
        ]);

        try {
            $stage = $this->service->addStage($track, $validated);
        } catch (ValidationException $e) {
            return $this->validationResponse($e);
        }

        return response()->json([
            'message' => 'Stage added successfully',
            'data' => $stage,
        ], 201);
    }

    public function reorderStages(Request $request, Track $track)
    {
        $validated = $request->validate([
            'stage_ids' => 'required|array|min:1',
            'stage_ids.*' => 'integer|exists:track_stages,id',
        ]);

        try {
            $stages = $this->service->reorderStages($track, $validated['stage_ids']);
        } catch (ValidationException $e) {
            return $this->validationResponse($e);
        }

        return response()->json([
            'message' => 'Stages reordered successfully',
            'data' => [
                'stages' => $stages->map(fn (TrackStage $s) => [
                    'id' => $s->id,
                    'sequence_order' => $s->sequence_order,
                    'name' => $s->name,
                ]),
            ],
        ]);
    }

    public function addPhase(Request $request, Track $track)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'position' => 'nullable|integer|min:1',
        ]);

        try {
            $phase = $this->service->addPhase($track, $validated);
        } catch (ValidationException $e) {
            return $this->validationResponse($e);
        }

        return response()->json([
            'message' => 'Academic phase added successfully',
            'data' => $phase,
        ], 201);
    }

    public function reorderPhases(Request $request, Track $track)
    {
        $validated = $request->validate([
            'phase_ids' => 'required|array|min:1',
            'phase_ids.*' => 'integer|exists:track_stages,id',
        ]);

        try {
            $phases = $this->service->reorderPhases($track, $validated['phase_ids']);
        } catch (ValidationException $e) {
            return $this->validationResponse($e);
        }

        return response()->json([
            'message' => 'Academic phases reordered successfully',
            'data' => [
                'phases' => $phases->map(fn (TrackStage $p) => [
                    'id' => $p->id,
                    'sequence_order' => $p->sequence_order,
                    'name' => $p->name,
                ]),
            ],
        ]);
    }

    public function reorderPhaseSteps(Request $request, Track $track, TrackStage $phase)
    {
        if ((int) $phase->track_id !== (int) $track->id) {
            abort(404);
        }

        $validated = $request->validate([
            'step_ids' => 'required|array|min:1',
            'step_ids.*' => 'integer|exists:track_stages,id',
        ]);

        try {
            $steps = $this->service->reorderPhaseSteps($track, $phase, $validated['step_ids']);
        } catch (ValidationException $e) {
            return $this->validationResponse($e);
        }

        return response()->json([
            'message' => 'Phase steps reordered successfully',
            'data' => [
                'steps' => $steps->map(fn (TrackStage $s) => [
                    'id' => $s->id,
                    'sequence_order' => $s->sequence_order,
                    'name' => $s->name,
                ]),
            ],
        ]);
    }

    public function updateStage(Request $request, Track $track, TrackStage $stage)
    {
        if ((int) $stage->track_id !== (int) $track->id) {
            abort(404);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string|max:1000',
            'academic_stage_id' => 'sometimes|exists:academic_stages_config,id',
            'is_decisive' => 'sometimes|boolean',
        ]);

        try {
            $stage = $this->service->updateStage($stage, $validated);
        } catch (ValidationException $e) {
            return $this->validationResponse($e);
        }

        return response()->json([
            'message' => 'Stage updated successfully',
            'data' => $stage,
        ]);
    }

    public function deleteStage(Track $track, TrackStage $stage)
    {
        if ((int) $stage->track_id !== (int) $track->id) {
            abort(404);
        }

        try {
            $this->service->deleteStage($stage);
        } catch (ValidationException $e) {
            $errors = $e->errors();
            if (isset($errors['stage'])) {
                return response()->json([
                    'message' => $errors['stage'][0],
                    'errors' => ['stage' => $errors['stage'][0]],
                ], 422);
            }

            $count = $errors['students_count'][0] ?? '0';
            preg_match('/(\d+)/', (string) $count, $matches);

            return response()->json([
                'message' => 'Cannot delete step with student progress',
                'errors' => [
                    'students_count' => (int) ($matches[1] ?? 0),
                    'suggestion' => 'Students have already started this step',
                ],
            ], 409);
        }

        return response()->json([
            'message' => 'Stage deleted successfully',
        ]);
    }

    public function assignStudents(Request $request, Track $track)
    {
        $validated = $request->validate([
            'student_ids' => 'required|array|min:1',
            'student_ids.*' => 'integer|exists:users,id',
            'confirm_reassign' => 'boolean',
        ]);

        try {
            $result = $this->service->assignStudentsToTrack(
                $track,
                $validated['student_ids'],
                (bool) ($validated['confirm_reassign'] ?? false),
            );
        } catch (ValidationException $e) {
            $errors = $e->errors();
            if (isset($errors['requires_confirmation'])) {
                return response()->json([
                    'message' => 'Some students have existing progress',
                    'errors' => [
                        'requires_confirmation' => true,
                        'affected_students' => $errors['affected_students'] ?? [],
                    ],
                ], 409);
            }

            return $this->validationResponse($e);
        }

        return response()->json([
            'message' => 'Students assigned successfully',
            'data' => $result,
        ]);
    }

    public function availableStages(Request $request)
    {
        $stages = $this->service->getAvailableStagesForStudent($request->user());

        return response()->json([
            'message' => 'Available stages retrieved successfully',
            'data' => $stages,
        ]);
    }

    /** Flattened academic steps for placing a newly created project. */
    public function stagesForProject(Request $request)
    {
        $stages = $this->service->getStagesForProjectCreate((int) $request->user()->university_id);

        return response()->json([
            'message' => 'Project stages retrieved successfully',
            'data' => $stages,
        ]);
    }

    public function myProgress(Request $request)
    {
        $progress = $this->service->getStudentProgress($request->user());

        return response()->json([
            'message' => 'Progress retrieved successfully',
            'data' => $progress,
        ]);
    }

    public function studentProgress(Request $request, User $student)
    {
        $viewer = $request->user()->loadMissing('role');

        if ((int) $student->university_id !== (int) $viewer->university_id) {
            abort(404);
        }

        $role = strtolower($viewer->role?->name ?? '');

        if ($role === 'supervisor') {
            $isSupervisor = Project::query()
                ->where('supervisor_id', $viewer->id)
                ->where(function ($q) use ($student) {
                    $q->where('user_id', $student->id)
                        ->orWhereHas('members', fn ($m) => $m->where('student_id', $student->id));
                })
                ->exists();

            if (!$isSupervisor && !$viewer->isAdmin()) {
                abort(403, 'This action is unauthorized.');
            }
        }

        $progress = $this->service->getStudentProgress($student);

        return response()->json([
            'message' => 'Progress retrieved successfully',
            'data' => $progress,
        ]);
    }

    public function overridePrerequisite(Request $request, User $student)
    {
        if ((int) $student->university_id !== (int) $request->user()->university_id) {
            abort(404);
        }

        $validated = $request->validate([
            'track_stage_id' => 'required|integer|exists:track_stages,id',
            'reason' => 'required|string|min:10|max:1000',
        ]);

        try {
            $progress = $this->service->overridePrerequisite(
                $student,
                (int) $validated['track_stage_id'],
                $validated['reason'],
                $request->user(),
            );
        } catch (ValidationException $e) {
            return $this->validationResponse($e);
        }

        return response()->json([
            'message' => 'Prerequisite override applied successfully',
            'data' => $progress,
        ]);
    }

    public function recordResult(Request $request, DefenseSession $defenseSession)
    {
        $validated = $request->validate([
            'result' => 'required|in:passed,failed,incomplete',
            'reason' => 'nullable|string|max:1000',
        ]);

        try {
            $result = $this->service->recordDefenseResult(
                $defenseSession,
                $request->user(),
                $validated['result'],
                $validated['reason'] ?? null,
            );
        } catch (ValidationException $e) {
            $errors = $e->errors();
            if (isset($errors['authorization'])) {
                return response()->json([
                    'message' => $errors['authorization'][0] ?? 'Forbidden',
                    'errors' => $errors,
                ], 403);
            }
            if (isset($errors['result']) && str_contains($errors['result'][0] ?? '', '48 hours')) {
                return response()->json([
                    'message' => 'Only administrators can modify results after 48 hours',
                    'errors' => $errors,
                ], 403);
            }

            return $this->validationResponse($e);
        }

        return response()->json([
            'message' => 'Defense result recorded successfully',
            'data' => [
                'defense_session_id' => $defenseSession->id,
                'student_id' => $result['student_id'],
                'student_name' => $result['student_name'],
                'stage_id' => $result['stage_id'],
                'stage_name' => $result['stage_name'],
                'stage_is_decisive' => $result['stage_is_decisive'],
                'result' => $result['result'],
                'recorded_at' => $result['recorded_at'],
                'next_stage' => $result['next_stage'],
                'track_completed' => $result['track_completed'] ?? false,
                'graduated' => $result['graduated'] ?? false,
                'project_status' => $result['project_status'] ?? null,
            ],
        ]);
    }

    public function completeStage(Request $request, DefenseSession $defenseSession)
    {
        $validated = $request->validate([
            'reason' => 'nullable|string|max:1000',
        ]);

        try {
            $result = $this->service->completeNonDecisiveStage(
                $defenseSession,
                $request->user(),
                $validated['reason'] ?? null,
            );
        } catch (ValidationException $e) {
            $errors = $e->errors();
            if (isset($errors['authorization'])) {
                return response()->json([
                    'message' => $errors['authorization'][0] ?? 'Forbidden',
                    'errors' => $errors,
                ], 403);
            }
            if (isset($errors['result']) && str_contains($errors['result'][0] ?? '', '48 hours')) {
                return response()->json([
                    'message' => 'Only administrators can modify results after 48 hours',
                    'errors' => $errors,
                ], 403);
            }

            return $this->validationResponse($e);
        }

        return response()->json([
            'message' => 'Academic stage completed successfully',
            'data' => [
                'defense_session_id' => $defenseSession->id,
                'student_id' => $result['student_id'],
                'student_name' => $result['student_name'],
                'stage_id' => $result['stage_id'],
                'stage_name' => $result['stage_name'],
                'stage_is_decisive' => $result['stage_is_decisive'],
                'result' => $result['result'],
                'recorded_at' => $result['recorded_at'],
                'next_stage' => $result['next_stage'],
                'track_completed' => $result['track_completed'] ?? false,
                'graduated' => $result['graduated'] ?? false,
                'project_status' => $result['project_status'] ?? null,
            ],
        ]);
    }

    protected function formatTrackSummary(Track $track): array
    {
        return [
            'id' => $track->id,
            'name' => $track->name,
            'description' => $track->description,
            'is_active' => $track->is_active,
            'stages_count' => $track->stages_count ?? $track->stages()->count(),
            'students_count' => $track->students_count ?? $track->students()->count(),
            'created_at' => $track->created_at?->toIso8601String(),
        ];
    }

    protected function formatTrackDetail(Track $track): array
    {
        $track->loadMissing(['stages.academicStage', 'stages.parent']);
        $track->load(['stages' => fn ($query) => $query->withCount([
            'progress',
            'progress as students_in_progress_count' => fn ($q) => $q->where('status', 'in_progress'),
        ])]);

        $phases = collect(TrackStageHierarchy::groupedPhases($track))->map(function (array $group) {
            $phase = $group['phase'];
            $studentsInProgress = (int) $group['steps']->sum(
                fn (TrackStage $s) => (int) ($s->students_in_progress_count ?? 0),
            );

            return [
                'id' => $phase?->id,
                'name' => $phase?->name,
                'description' => $phase?->description,
                'stage_kind' => $phase?->stage_kind ?? TrackStageHierarchy::KIND_STEP,
                'sequence_order' => $phase?->sequence_order,
                'students_count' => $studentsInProgress,
                'progress_count' => (int) $group['steps']->sum(
                    fn (TrackStage $s) => (int) ($s->progress_count ?? 0),
                ),
                'steps' => $group['steps']->map(fn (TrackStage $s) => [
                    'id' => $s->id,
                    'parent_id' => $s->parent_id,
                    'stage_kind' => $s->stage_kind,
                    'sequence_order' => $s->sequence_order,
                    'name' => $s->academicStage?->name ?? $s->name,
                    'description' => $s->description,
                    'academic_stage_id' => $s->academic_stage_id,
                    'academic_stage' => $s->academicStage ? [
                        'id' => $s->academicStage->id,
                        'name' => $s->academicStage->name,
                    ] : null,
                    'is_decisive' => (bool) $s->is_decisive,
                    'students_count' => (int) ($s->students_in_progress_count ?? 0),
                    'progress_count' => (int) ($s->progress_count ?? 0),
                ])->values()->all(),
            ];
        })->values()->all();

        $flatStages = collect($phases)->flatMap(fn ($p) => $p['steps'])->values()->all();

        return [
            'id' => $track->id,
            'university_id' => $track->university_id,
            'name' => $track->name,
            'description' => $track->description,
            'is_active' => $track->is_active,
            'phases' => $phases,
            'stages' => $flatStages,
            'created_at' => $track->created_at?->toIso8601String(),
            'updated_at' => $track->updated_at?->toIso8601String(),
        ];
    }

    protected function validationResponse(ValidationException $e)
    {
        return response()->json([
            'message' => 'Validation failed',
            'errors' => $e->errors(),
        ], 422);
    }
}

<?php

namespace App\Services;

use App\Models\AcademicStageConfig;
use App\Models\DefenseSession;
use App\Models\Project;
use App\Models\ProjectProposal;
use App\Models\StudentProgress;
use App\Models\StudentProgressHistory;
use App\Models\Track;
use App\Models\TrackStage;
use App\Models\User;
use App\Support\TrackStageHierarchy;
use Carbon\Carbon;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class TrackService
{
    public function __construct(
        protected NotificationService $notifications,
    ) {
    }

    public function getTracksForUniversity(
        int $universityId,
        ?bool $isActive = null,
        ?string $search = null,
        int $perPage = 15,
    ): LengthAwarePaginator {
        $query = Track::query()
            ->where('university_id', $universityId)
            ->withCount(['stages', 'students']);

        if ($isActive !== null) {
            $query->where('is_active', $isActive);
        }

        if ($search !== null && trim($search) !== '') {
            $query->where('name', 'like', '%' . trim($search) . '%');
        }

        return $query->orderBy('name')->paginate($perPage);
    }

    public function createTrack(array $data, int $universityId): Track
    {
        $this->assertUniqueTrackName($universityId, $data['name']);

        return DB::transaction(function () use ($data, $universityId) {
            $track = Track::create([
                'university_id' => $universityId,
                'name' => $data['name'],
                'description' => $data['description'] ?? null,
                'is_active' => true,
            ]);

            $phaseOrder = 0;

            foreach ($data['stages'] as $stageData) {
                $hasSteps = !empty($stageData['steps']) && is_array($stageData['steps']);
                $kind = $stageData['stage_kind'] ?? ($hasSteps ? TrackStageHierarchy::KIND_PHASE : TrackStageHierarchy::KIND_STEP);

                if ($kind === TrackStageHierarchy::KIND_PHASE || $hasSteps) {
                    $phaseOrder++;
                    $phase = TrackStage::create([
                        'track_id' => $track->id,
                        'parent_id' => null,
                        'stage_kind' => TrackStageHierarchy::KIND_PHASE,
                        'academic_stage_id' => null,
                        'sequence_order' => $phaseOrder,
                        'name' => $stageData['name'],
                        'description' => $stageData['description'] ?? null,
                        'is_decisive' => false,
                    ]);

                    foreach ($stageData['steps'] ?? [] as $stepIndex => $stepData) {
                        $this->createStepStage($track, $phase, $stepIndex + 1, $stepData, $universityId);
                    }

                    continue;
                }

                $phaseOrder++;
                $this->createStepStage($track, null, $phaseOrder, $stageData, $universityId);
            }

            return $track->load(['stages.academicStage', 'stages.parent']);
        });
    }

    private function createStepStage(
        Track $track,
        ?TrackStage $parentPhase,
        int $orderAmongSiblings,
        array $stepData,
        int $universityId,
    ): TrackStage {
        $attrs = $this->resolveStepAttributes(
            $stepData,
            $universityId,
            $track,
            null,
            $parentPhase?->id,
        );

        return TrackStage::create([
            'track_id' => $track->id,
            'parent_id' => $parentPhase?->id,
            'stage_kind' => TrackStageHierarchy::KIND_STEP,
            'academic_stage_id' => $attrs['academic_stage_id'],
            'sequence_order' => $orderAmongSiblings,
            'name' => $attrs['name'],
            'description' => $stepData['description'] ?? null,
            'is_decisive' => $attrs['is_decisive'],
        ]);
    }

    /**
     * Steps are scheduling defense types — name is always taken from AcademicStageConfig.
     *
     * @return array{academic_stage_id: int, name: string, is_decisive: bool}
     */
    private function resolveStepAttributes(
        array $stepData,
        int $universityId,
        ?Track $track = null,
        ?int $exceptStageId = null,
        ?int $parentPhaseId = null,
    ): array {
        $academicStageId = $stepData['academic_stage_id'] ?? null;
        if (!$academicStageId) {
            throw ValidationException::withMessages([
                'academic_stage_id' => ['Each step must reference a defense type from Scheduling.'],
            ]);
        }

        $this->assertAcademicStageInUniversity((int) $academicStageId, $universityId);

        $config = AcademicStageConfig::query()->find((int) $academicStageId);
        if (!$config) {
            throw ValidationException::withMessages([
                'academic_stage_id' => ['The selected defense type does not exist.'],
            ]);
        }

        if ($track) {
            $phaseId = $parentPhaseId ?? $stepData['parent_id'] ?? null;
            $this->assertDefenseTypeNotUsedInPhase(
                $track,
                (int) $academicStageId,
                $phaseId !== null ? (int) $phaseId : null,
                $exceptStageId,
            );
        }

        return [
            'academic_stage_id' => (int) $academicStageId,
            'name' => $config->name,
            'is_decisive' => $config->isFinalDefense()
                ? true
                : (array_key_exists('is_decisive', $stepData)
                    ? (bool) $stepData['is_decisive']
                    : false),
        ];
    }

    /**
     * Same defense type may appear in different phases (e.g. seminar in semester + applications).
     * Uniqueness is per phase only.
     */
    private function assertDefenseTypeNotUsedInPhase(
        Track $track,
        int $academicStageId,
        ?int $parentPhaseId,
        ?int $exceptStageId = null,
    ): void {
        $query = TrackStage::query()
            ->where('track_id', $track->id)
            ->where('stage_kind', TrackStageHierarchy::KIND_STEP)
            ->where('academic_stage_id', $academicStageId);

        if ($parentPhaseId === null) {
            $query->whereNull('parent_id');
        } else {
            $query->where('parent_id', $parentPhaseId);
        }

        if ($exceptStageId) {
            $query->where('id', '!=', $exceptStageId);
        }

        if ($query->exists()) {
            throw ValidationException::withMessages([
                'academic_stage_id' => ['This defense type is already used in this academic phase.'],
            ]);
        }
    }

    public function updateTrack(Track $track, array $data): Track
    {
        if (isset($data['name']) && $data['name'] !== $track->name) {
            $this->assertUniqueTrackName((int) $track->university_id, $data['name'], $track->id);
        }

        $track->update([
            'name' => $data['name'] ?? $track->name,
            'description' => array_key_exists('description', $data) ? $data['description'] : $track->description,
            'is_active' => array_key_exists('is_active', $data) ? (bool) $data['is_active'] : $track->is_active,
        ]);

        return $track->fresh(['stages.academicStage']);
    }

    /** Permanently deletes a track and cleans student assignment links. */
    public function deleteTrack(Track $track): string
    {
        DB::transaction(function () use ($track) {
            // Unlink students before cascade so accounts remain usable.
            User::query()
                ->where('track_id', $track->id)
                ->update(['track_id' => null]);

            // Self-FK on track_stages.parent_id: delete steps, then phases, then track.
            TrackStage::query()
                ->where('track_id', $track->id)
                ->whereNotNull('parent_id')
                ->delete();

            TrackStage::query()
                ->where('track_id', $track->id)
                ->whereNull('parent_id')
                ->delete();

            $track->delete();
        });

        return 'deleted';
    }

    public function addStage(Track $track, array $data): TrackStage
    {
        $parentId = isset($data['parent_id']) ? (int) $data['parent_id'] : null;

        if ($parentId !== null) {
            $parent = TrackStage::query()
                ->where('track_id', $track->id)
                ->whereKey($parentId)
                ->first();

            if (!$parent || !$parent->isPhase()) {
                throw ValidationException::withMessages([
                    'parent_id' => ['The selected academic phase is invalid for this track.'],
                ]);
            }
        }

        $siblingsQuery = TrackStage::query()
            ->where('track_id', $track->id)
            ->when(
                $parentId,
                fn ($query) => $query->where('parent_id', $parentId),
                fn ($query) => $query->whereNull('parent_id'),
            );

        $position = isset($data['position'])
            ? max(1, (int) $data['position'])
            : $siblingsQuery->count() + 1;

        return DB::transaction(function () use ($track, $data, $position, $parentId, $siblingsQuery) {
            $attrs = $this->resolveStepAttributes(
                $data,
                (int) $track->university_id,
                $track,
                null,
                $parentId,
            );

            $siblingsQuery
                ->where('sequence_order', '>=', $position)
                ->orderBy('sequence_order')
                ->get()
                ->each(function (TrackStage $stage) {
                    $stage->update(['sequence_order' => $stage->sequence_order + 1]);
                });

            return TrackStage::create([
                'track_id' => $track->id,
                'parent_id' => $parentId,
                'stage_kind' => TrackStageHierarchy::KIND_STEP,
                'academic_stage_id' => $attrs['academic_stage_id'],
                'sequence_order' => $position,
                'name' => $attrs['name'],
                'description' => $data['description'] ?? null,
                'is_decisive' => $attrs['is_decisive'],
            ]);
        });
    }

    public function updateStage(TrackStage $stage, array $data): TrackStage
    {
        $stage->loadMissing('track');

        if ($stage->stage_kind === TrackStageHierarchy::KIND_PHASE) {
            $stage->update([
                'name' => $data['name'] ?? $stage->name,
                'description' => array_key_exists('description', $data) ? $data['description'] : $stage->description,
            ]);

            return $stage->fresh();
        }

        $attrs = $this->resolveStepAttributes(
            array_merge(
                ['academic_stage_id' => $stage->academic_stage_id, 'is_decisive' => $stage->is_decisive],
                $data,
            ),
            (int) $stage->track->university_id,
            $stage->track,
            $stage->id,
            $stage->parent_id,
        );

        $stage->update([
            'name' => $attrs['name'],
            'description' => array_key_exists('description', $data) ? $data['description'] : $stage->description,
            'academic_stage_id' => $attrs['academic_stage_id'],
            'is_decisive' => $attrs['is_decisive'],
        ]);

        return $stage->fresh('academicStage');
    }

    public function reorderStages(Track $track, array $stageIds): Collection
    {
        $stages = $track->stages()->get()->keyBy('id');
        $trackStageIds = $stages->keys()->all();

        if (count($stageIds) !== count($trackStageIds) || array_diff($stageIds, $trackStageIds)) {
            throw ValidationException::withMessages([
                'stage_ids' => ['All stage IDs must belong to this track.'],
            ]);
        }

        return DB::transaction(function () use ($stageIds, $stages) {
            foreach ($stageIds as $index => $stageId) {
                $stages[$stageId]->update(['sequence_order' => $index + 1]);
            }

            return TrackStage::query()
                ->whereIn('id', $stageIds)
                ->orderBy('sequence_order')
                ->get();
        });
    }

    /** Reorder steps within one academic phase (sibling scope only). */
    public function reorderPhaseSteps(Track $track, TrackStage $phase, array $stepIds): Collection
    {
        if ((int) $phase->track_id !== (int) $track->id || !$phase->isPhase()) {
            throw ValidationException::withMessages([
                'phase' => ['Invalid academic phase for this track.'],
            ]);
        }

        $childIds = $phase->children()->pluck('id')->all();

        if (count($stepIds) !== count($childIds) || array_diff($stepIds, $childIds)) {
            throw ValidationException::withMessages([
                'step_ids' => ['All step IDs must belong to this academic phase.'],
            ]);
        }

        return DB::transaction(function () use ($stepIds) {
            foreach ($stepIds as $index => $stepId) {
                TrackStage::query()->whereKey($stepId)->update(['sequence_order' => $index + 1]);
            }

            return TrackStage::query()
                ->whereIn('id', $stepIds)
                ->orderBy('sequence_order')
                ->get();
        });
    }

    public function addPhase(Track $track, array $data): TrackStage
    {
        $siblingsQuery = TrackStage::query()
            ->where('track_id', $track->id)
            ->whereNull('parent_id')
            ->where('stage_kind', TrackStageHierarchy::KIND_PHASE);

        $position = isset($data['position'])
            ? max(1, (int) $data['position'])
            : $siblingsQuery->count() + 1;

        return DB::transaction(function () use ($track, $data, $position, $siblingsQuery) {
            $siblingsQuery
                ->where('sequence_order', '>=', $position)
                ->orderBy('sequence_order')
                ->get()
                ->each(function (TrackStage $stage) {
                    $stage->update(['sequence_order' => $stage->sequence_order + 1]);
                });

            return TrackStage::create([
                'track_id' => $track->id,
                'parent_id' => null,
                'stage_kind' => TrackStageHierarchy::KIND_PHASE,
                'academic_stage_id' => null,
                'sequence_order' => $position,
                'name' => $data['name'],
                'description' => $data['description'] ?? null,
                'is_decisive' => false,
            ]);
        });
    }

    /** Reorder root academic phases only. */
    public function reorderPhases(Track $track, array $phaseIds): Collection
    {
        $phases = TrackStage::query()
            ->where('track_id', $track->id)
            ->whereNull('parent_id')
            ->where('stage_kind', TrackStageHierarchy::KIND_PHASE)
            ->get()
            ->keyBy('id');

        $existingIds = $phases->keys()->all();

        if (count($phaseIds) !== count($existingIds) || array_diff($phaseIds, $existingIds)) {
            throw ValidationException::withMessages([
                'phase_ids' => ['All phase IDs must belong to this track.'],
            ]);
        }

        return DB::transaction(function () use ($phaseIds) {
            foreach ($phaseIds as $index => $phaseId) {
                TrackStage::query()->whereKey($phaseId)->update(['sequence_order' => $index + 1]);
            }

            return TrackStage::query()
                ->whereIn('id', $phaseIds)
                ->orderBy('sequence_order')
                ->get();
        });
    }

    public function deleteStage(TrackStage $stage): bool
    {
        if ($stage->isPhase()) {
            return $this->deletePhase($stage);
        }

        $progressCount = StudentProgress::query()
            ->where('track_stage_id', $stage->id)
            ->count();

        if ($progressCount > 0) {
            throw ValidationException::withMessages([
                'students_count' => ["Cannot delete step with {$progressCount} student progress record(s)."],
            ]);
        }

        return DB::transaction(function () use ($stage) {
            $this->deleteStageAndReorderSiblings($stage);

            return true;
        });
    }

    protected function deletePhase(TrackStage $phase): bool
    {
        $childIds = TrackStage::query()
            ->where('parent_id', $phase->id)
            ->pluck('id');

        $progressCount = StudentProgress::query()
            ->whereIn('track_stage_id', $childIds)
            ->count();

        if ($progressCount > 0) {
            throw ValidationException::withMessages([
                'students_count' => ["Cannot delete phase with {$progressCount} student progress record(s)."],
            ]);
        }

        return DB::transaction(function () use ($phase, $childIds) {
            if ($childIds->isNotEmpty()) {
                TrackStage::query()->whereIn('id', $childIds)->delete();
            }

            $this->deleteStageAndReorderSiblings($phase);

            return true;
        });
    }

    protected function deleteStageAndReorderSiblings(TrackStage $stage): void
    {
        $trackId = $stage->track_id;
        $parentId = $stage->parent_id;
        $deletedOrder = $stage->sequence_order;
        $stage->delete();

        $siblings = TrackStage::query()
            ->where('track_id', $trackId)
            ->where('sequence_order', '>', $deletedOrder)
            ->when(
                $parentId,
                fn ($query) => $query->where('parent_id', $parentId),
                fn ($query) => $query->whereNull('parent_id'),
            )
            ->orderBy('sequence_order')
            ->get();

        foreach ($siblings as $remaining) {
            $remaining->update(['sequence_order' => $remaining->sequence_order - 1]);
        }
    }

    public function assertPrerequisitesMet(User $student, int $trackStageId): void
    {
        $stage = $this->resolveAccessibleStage($student, $trackStageId, requireTrackMatch: true);

        if ($stage->isPhase()) {
            throw ValidationException::withMessages([
                'track_stage_id' => ['Select a specific step inside the phase, not the phase container.'],
            ]);
        }

        $previous = TrackStageHierarchy::previousActionableStep($stage);
        if (!$previous) {
            $this->reactivateFailedStageIfNeeded($student, $stage);

            return;
        }

        $previousProgress = StudentProgress::query()
            ->where('student_id', $student->id)
            ->where('track_id', $stage->track_id)
            ->where('track_stage_id', $previous->id)
            ->first();

        if ($previousProgress?->status === 'passed') {
            $this->reactivateFailedStageIfNeeded($student, $stage);

            return;
        }

        $message = in_array($previousProgress?->status, ['failed', 'incomplete'], true)
            ? "You must pass {$previous->name} before submitting for {$stage->name}."
            : "You must complete {$previous->name} before submitting for {$stage->name}.";

        throw ValidationException::withMessages([
            'track_stage_id' => [$message],
        ]);
    }

    public function autoAssignTrack(User $student, int $trackStageId): void
    {
        $stage = $this->resolveAccessibleStage($student, $trackStageId, requireTrackMatch: false);

        if ($student->track_id) {
            if ((int) $student->track_id !== (int) $stage->track_id) {
                throw ValidationException::withMessages([
                    'track_stage_id' => ['This stage belongs to a different track than your assignment.'],
                ]);
            }

            $this->ensureStageProgressForProposal($student, $stage);

            return;
        }

        DB::transaction(function () use ($student, $stage) {
            $student->update(['track_id' => $stage->track_id]);
            $this->ensureStageProgressForProposal($student, $stage);
        });
    }

    /**
     * Undo premature track locks from withdrawn/pending-only proposals.
     * Track assignment + in_progress progress belong after approval (project exists)
     * or after real stage results (passed/failed/incomplete).
     */
    public function releaseTrackAssignmentIfProposalWithdrawn(User $student, ?int $trackStageId = null): void
    {
        $hasActiveProject = Project::query()
            ->where('user_id', $student->id)
            ->whereNotIn('status', ['completed', 'cancelled', 'closed'])
            ->exists();

        $trackId = $student->track_id;

        $hasMeaningfulProgress = $trackId
            ? StudentProgress::query()
                ->where('student_id', $student->id)
                ->where('track_id', $trackId)
                ->whereIn('status', ['passed', 'failed', 'incomplete'])
                ->exists()
            : false;

        // Keep assignment only when the student truly started the academic path.
        if ($hasActiveProject || $hasMeaningfulProgress) {
            if ($trackStageId) {
                $stillReferencedByProject = Project::query()
                    ->where('user_id', $student->id)
                    ->whereHas('proposal', fn ($q) => $q->where('track_stage_id', $trackStageId))
                    ->whereNotIn('status', ['completed', 'cancelled', 'closed'])
                    ->exists();

                if (!$stillReferencedByProject) {
                    $this->deleteInProgressProgressForStage($student, $trackStageId);
                }
            }

            return;
        }

        if (!$trackId) {
            // Still drop orphan in_progress rows if any.
            if ($trackStageId) {
                $this->deleteInProgressProgressForStage($student, $trackStageId);
            }

            return;
        }

        StudentProgress::query()
            ->where('student_id', $student->id)
            ->where('track_id', $trackId)
            ->get()
            ->each(fn (StudentProgress $row) => $this->deleteProgressWithHistory($row));

        $student->update(['track_id' => null]);
    }

    private function deleteInProgressProgressForStage(User $student, int $trackStageId): void
    {
        StudentProgress::query()
            ->where('student_id', $student->id)
            ->where('track_stage_id', $trackStageId)
            ->where('status', 'in_progress')
            ->get()
            ->each(fn (StudentProgress $row) => $this->deleteProgressWithHistory($row));
    }

    private function deleteProgressWithHistory(StudentProgress $progress): void
    {
        StudentProgressHistory::query()
            ->where('student_progress_id', $progress->id)
            ->delete();

        $progress->delete();
    }

    public function resolveProjectTrackStageId(Project $project): ?int
    {
        $project->loadMissing('proposal:id,track_stage_id');

        $stageId = $project->proposal?->track_stage_id;

        return $stageId ? (int) $stageId : null;
    }

    public function describeTrackStage(?TrackStage $stage): ?array
    {
        if (!$stage) {
            return null;
        }

        $stage->loadMissing(['parent', 'academicStage']);
        $stepName = $stage->academicStage?->name ?? $stage->name;
        $phaseName = $stage->parent?->name;

        return [
            'id' => $stage->id,
            'step_name' => $stepName,
            'phase_id' => $stage->parent_id,
            'phase_name' => $phaseName,
            'display_label' => $phaseName ? "{$phaseName} · {$stepName}" : $stepName,
        ];
    }

    public function describeProjectTrackStage(Project $project): ?array
    {
        $project->loadMissing([
            'proposal.trackStage.parent:id,name',
            'proposal.trackStage.academicStage:id,name',
            'activeDefenseSession:id,project_id,status',
            'user:id,track_id',
        ]);

        $stage = $project->proposal?->trackStage;
        if (!$stage) {
            return null;
        }

        $stage->loadMissing(['parent', 'academicStage', 'track:id,name']);
        $phaseName = $stage->parent?->name;

        if (!$phaseName) {
            return null;
        }

        $stepName = $stage->academicStage?->name ?? $stage->name;
        $trackName = $stage->track?->name;

        return [
            'id' => $stage->id,
            'track_stage_id' => $stage->id,
            'track_id' => $stage->track_id,
            'track_name' => $trackName,
            'step_name' => $stepName,
            'phase_id' => $stage->parent_id,
            'phase_name' => $phaseName,
            'display_label' => $phaseName,
            'scheduled' => (bool) $project->activeDefenseSession,
            'phase_progress' => $this->buildPhaseProgressForProject($project, $stage),
        ];
    }

    /**
     * Compact progress for the project's current academic phase only.
     * Steps are keyed by track_stage_id so same-named steps in other phases stay independent.
     *
     * @return array{phase_id:int,phase_name:string,steps:array<int,array>}
     */
    public function buildPhaseProgressForProject(Project $project, ?TrackStage $projectStep = null): ?array
    {
        $projectStep ??= $project->proposal?->trackStage;
        if (!$projectStep?->parent_id) {
            return null;
        }

        $projectStep->loadMissing(['parent', 'academicStage']);

        $siblingSteps = TrackStage::query()
            ->where('parent_id', $projectStep->parent_id)
            ->where('stage_kind', TrackStageHierarchy::KIND_STEP)
            ->with('academicStage:id,name')
            ->orderBy('sequence_order')
            ->get();

        if ($siblingSteps->isEmpty()) {
            return null;
        }

        $studentId = (int) ($project->user_id ?? 0);
        $progressByStage = collect();
        if ($studentId > 0) {
            $progressByStage = StudentProgress::query()
                ->where('student_id', $studentId)
                ->whereIn('track_stage_id', $siblingSteps->pluck('id'))
                ->get()
                ->keyBy('track_stage_id');
        }

        $steps = [];
        $foundCurrent = false;
        foreach ($siblingSteps as $index => $sibling) {
            $record = $progressByStage->get($sibling->id);
            if ($record) {
                $status = $record->status;
            } elseif ((int) $sibling->id === (int) $projectStep->id) {
                $status = 'in_progress';
            } elseif (!$foundCurrent && $index === 0) {
                $status = 'available';
            } else {
                $prev = $siblingSteps[$index - 1] ?? null;
                $prevPassed = $prev && $progressByStage->get($prev->id)?->status === 'passed';
                $status = $prevPassed ? 'available' : 'locked';
            }

            if (in_array($status, ['in_progress', 'available'], true)
                || (int) $sibling->id === (int) $projectStep->id) {
                $foundCurrent = true;
            }

            $steps[] = [
                'stage_id' => $sibling->id,
                'stage_name' => $sibling->academicStage?->name ?? $sibling->name,
                'academic_stage_id' => $sibling->academic_stage_id,
                'sequence_order' => $sibling->sequence_order,
                'status' => $status,
                'is_project_step' => (int) $sibling->id === (int) $projectStep->id,
                'completed_at' => $record?->completed_at?->toIso8601String(),
            ];
        }

        return [
            'phase_id' => (int) $projectStep->parent_id,
            'phase_name' => $projectStep->parent?->name,
            'steps' => $steps,
        ];
    }

    public function assertStudentCanJoinProjectStage(User $student, int $trackStageId): void
    {
        if ($student->isGraduated()) {
            throw ValidationException::withMessages([
                'student' => ['Graduated students cannot join new projects.'],
            ]);
        }

        $this->resolveAccessibleStage($student, $trackStageId, requireTrackMatch: true);
        $this->assertPrerequisitesMet($student, $trackStageId);
        $this->assertStudentOnCurrentSubTrack($student, $trackStageId);
    }

    public function canStudentJoinProjectStage(User $student, int $trackStageId): bool
    {
        try {
            $this->assertStudentCanJoinProjectStage($student, $trackStageId);

            return true;
        } catch (ValidationException) {
            return false;
        }
    }

    /**
     * On project leave: if the current sub-track (phase) is incomplete, wipe its progress
     * so the student must redo it. If the phase is fully passed, keep progress for the next phase.
     *
     * @return array{phase_reset:bool,phase_completed:bool,phase_id:?int,phase_name:?string}
     */
    public function handleProgressOnProjectLeave(User $student, ?int $trackStageId): array
    {
        $empty = [
            'phase_reset' => false,
            'phase_completed' => false,
            'phase_id' => null,
            'phase_name' => null,
        ];

        if (!$trackStageId || $student->isGraduated()) {
            return $empty;
        }

        $stage = TrackStage::query()->with('parent:id,name')->find($trackStageId);
        if (!$stage || $stage->stage_kind === TrackStageHierarchy::KIND_PHASE) {
            return $empty;
        }

        $phaseId = $stage->parent_id ? (int) $stage->parent_id : null;
        $phaseName = $stage->parent?->name;

        $siblingSteps = $phaseId
            ? TrackStage::query()
                ->where('parent_id', $phaseId)
                ->where('stage_kind', TrackStageHierarchy::KIND_STEP)
                ->orderBy('sequence_order')
                ->get()
            : collect([$stage]);

        if ($siblingSteps->isEmpty()) {
            return $empty;
        }

        $siblingIds = $siblingSteps->pluck('id')->map(fn ($id) => (int) $id)->all();
        $progressRows = StudentProgress::query()
            ->where('student_id', $student->id)
            ->whereIn('track_stage_id', $siblingIds)
            ->get()
            ->keyBy(fn (StudentProgress $row) => (int) $row->track_stage_id);

        $phaseCompleted = $siblingSteps->every(
            fn (TrackStage $step) => ($progressRows->get((int) $step->id)?->status === 'passed'),
        );

        if ($phaseCompleted) {
            return [
                'phase_reset' => false,
                'phase_completed' => true,
                'phase_id' => $phaseId,
                'phase_name' => $phaseName,
            ];
        }

        StudentProgress::query()
            ->where('student_id', $student->id)
            ->whereIn('track_stage_id', $siblingIds)
            ->delete();

        return [
            'phase_reset' => true,
            'phase_completed' => false,
            'phase_id' => $phaseId,
            'phase_name' => $phaseName,
        ];
    }

    /** Blocks submitting a proposal for a step that is already passed or not the student's current step. */
    public function assertStageIsCurrentForStudent(User $student, int $trackStageId): void
    {
        $stage = $this->resolveAccessibleStage($student, $trackStageId, requireTrackMatch: true);

        if ($stage->isPhase()) {
            throw ValidationException::withMessages([
                'track_stage_id' => ['Select a specific step inside the phase, not the phase container.'],
            ]);
        }

        $existing = StudentProgress::query()
            ->where('student_id', $student->id)
            ->where('track_stage_id', $stage->id)
            ->first();

        if ($existing?->status === 'passed') {
            throw ValidationException::withMessages([
                'track_stage_id' => ["You already completed {$stage->name}. Choose the next sub-track step."],
            ]);
        }

        $expected = $this->resolveExpectedCurrentStep($student, (int) $stage->track_id);
        if ($expected && (int) $expected->id !== (int) $stage->id) {
            throw ValidationException::withMessages([
                'track_stage_id' => [
                    "Your current academic step is {$expected->name}. New projects must use that sub-track step.",
                ],
            ]);
        }
    }

    /** Invitation join: project step must belong to the student's current incomplete sub-track. */
    public function assertStudentOnCurrentSubTrack(User $student, int $trackStageId): void
    {
        $stage = $this->resolveAccessibleStage($student, $trackStageId, requireTrackMatch: true);

        if ($stage->isPhase()) {
            throw ValidationException::withMessages([
                'track_stage_id' => ['Select a specific step inside the phase, not the phase container.'],
            ]);
        }

        $expected = $this->resolveExpectedCurrentStep($student, (int) $stage->track_id);
        if (!$expected) {
            return;
        }

        $expected->loadMissing('parent:id,name');

        $expectedPhaseId = $expected->parent_id ? (int) $expected->parent_id : null;
        $projectPhaseId = $stage->parent_id ? (int) $stage->parent_id : null;

        if ($expectedPhaseId !== $projectPhaseId) {
            $phaseLabel = $expected->parent?->name ?? $expected->name;
            throw ValidationException::withMessages([
                'track_stage_id' => [
                    "This project belongs to a different sub-track. Your current sub-track is {$phaseLabel}.",
                ],
            ]);
        }
    }

    /** Earliest incomplete actionable step on the student's track (null if track finished). */
    public function resolveExpectedCurrentStep(User $student, ?int $trackId = null): ?TrackStage
    {
        $trackId = $trackId ?? $student->track_id;
        if (!$trackId) {
            return null;
        }

        $track = Track::query()->with('stages')->find($trackId);
        if (!$track) {
            return null;
        }

        $steps = TrackStageHierarchy::flattenedActionableSteps($track);
        if ($steps->isEmpty()) {
            return null;
        }

        $progressByStage = StudentProgress::query()
            ->where('student_id', $student->id)
            ->where('track_id', $track->id)
            ->get()
            ->keyBy(fn (StudentProgress $row) => (int) $row->track_stage_id);

        foreach ($steps as $step) {
            $status = $progressByStage->get((int) $step->id)?->status;
            if ($status !== 'passed') {
                return $step;
            }
        }

        return null;
    }

    public function syncStudentProgressOnProjectJoin(User $student, int $trackStageId): void
    {
        $this->autoAssignTrack($student, $trackStageId);
    }

    public function assignStudentsToTrack(Track $track, array $studentIds, bool $confirmReassign = false): array
    {
        $students = $this->resolveStudents($studentIds, (int) $track->university_id);
        $affected = [];

        foreach ($students as $student) {
            if ($student->track_id && (int) $student->track_id !== (int) $track->id) {
                $hasProgress = $student->studentProgress()->exists();
                if ($hasProgress) {
                    $currentTrack = Track::find($student->track_id);
                    $currentProgress = $student->getCurrentProgress();
                    $affected[] = [
                        'id' => $student->id,
                        'name' => $student->name,
                        'current_track' => $currentTrack?->name,
                        'current_stage' => $currentProgress?->trackStage?->name,
                    ];
                }
            }
        }

        if ($affected !== [] && !$confirmReassign) {
            throw new \Illuminate\Http\Exceptions\HttpResponseException(
                response()->json([
                    'message' => 'Some students have existing progress',
                    'errors' => [
                        'requires_confirmation' => true,
                        'affected_students' => $affected,
                    ],
                ], 409)
            );
        }

        $firstStage = $track->stages()->orderBy('sequence_order')->first();
        if (!$firstStage) {
            throw ValidationException::withMessages([
                'track' => ['Track must have at least one stage before assigning students.'],
            ]);
        }

        return DB::transaction(function () use ($students, $track, $firstStage) {
            $assigned = [];

            foreach ($students as $student) {
                if ((int) $student->track_id !== (int) $track->id) {
                    $student->update(['track_id' => $track->id]);

                    StudentProgress::firstOrCreate(
                        [
                            'student_id' => $student->id,
                            'track_id' => $track->id,
                            'track_stage_id' => $firstStage->id,
                        ],
                        ['status' => 'in_progress'],
                    );
                }

                $assigned[] = [
                    'id' => $student->id,
                    'name' => $student->name,
                    'status' => 'assigned',
                ];
            }

            return [
                'assigned_count' => count($assigned),
                'students' => $assigned,
            ];
        });
    }

    public function getStudentProgress(User $student): array
    {
        if (!$student->track_id) {
            return [
                'track' => null,
                'current_stage' => null,
                'status' => 'not_started',
                'timeline' => [],
                'history' => [],
            ];
        }

        $track = Track::with(['stages.academicStage', 'stages.parent'])->find($student->track_id);
        if (!$track) {
            return [
                'track' => null,
                'current_stage' => null,
                'status' => 'not_started',
                'timeline' => [],
                'history' => [],
            ];
        }

        $progressRecords = StudentProgress::query()
            ->where('student_id', $student->id)
            ->where('track_id', $track->id)
            ->with(['trackStage'])
            ->withCount('history')
            ->get()
            ->keyBy('track_stage_id');

        $timeline = [];
        $phases = [];
        $currentStage = null;
        $flatSteps = TrackStageHierarchy::flattenedActionableSteps($track);

        foreach (TrackStageHierarchy::groupedPhases($track) as $group) {
            $phase = $group['phase'];
            $stepEntries = [];

            foreach ($group['steps'] as $stage) {
                $entry = $this->buildTimelineEntry($stage, $student, $track, $progressRecords, $flatSteps);
                $timeline[] = $entry;
                $stepEntries[] = $entry;

                if ($entry['status'] === 'in_progress') {
                    $currentStage = $stage;
                }
            }

            $phaseStatus = $this->derivePhaseStatus($stepEntries);

            $phases[] = [
                'phase_id' => $phase?->id,
                'phase_name' => $phase?->name,
                'phase_order' => $phase?->sequence_order,
                'status' => $phaseStatus,
                'steps' => $stepEntries,
            ];
        }

        if (!$currentStage) {
            $available = collect($timeline)->firstWhere('status', 'available');
            if ($available) {
                $currentStage = $track->stages->firstWhere('id', $available['stage_id']);
            } else {
                $inProgress = collect($timeline)->firstWhere('status', 'in_progress');
                if ($inProgress) {
                    $currentStage = $track->stages->firstWhere('id', $inProgress['stage_id']);
                }
            }
        }

        $overallStatus = collect($timeline)->contains('status', 'in_progress')
            ? 'in_progress'
            : (collect($timeline)->contains(fn ($t) => in_array($t['status'], ['passed', 'failed', 'available'], true))
                ? 'in_progress'
                : 'not_started');

        $history = StudentProgressHistory::query()
            ->whereHas('progress', fn ($q) => $q->where('student_id', $student->id))
            ->with(['recorder:id,name', 'progress.trackStage:id,name'])
            ->orderByDesc('recorded_at')
            ->get()
            ->map(fn (StudentProgressHistory $h) => [
                'stage_id' => $h->progress?->track_stage_id,
                'stage_name' => $h->progress?->trackStage?->name,
                'attempt_number' => $h->attempt_number,
                'status' => $h->status,
                'recorded_at' => $h->recorded_at?->toIso8601String(),
                'recorded_by' => $h->recorder?->name,
                'modification_reason' => $h->modification_reason,
            ])
            ->values()
            ->all();

        return [
            'track' => [
                'id' => $track->id,
                'name' => $track->name,
                'description' => $track->description,
            ],
            'current_stage' => $currentStage ? [
                'id' => $currentStage->id,
                'name' => $currentStage->name,
                'sequence_order' => $currentStage->sequence_order,
            ] : null,
            'status' => $overallStatus,
            'timeline' => $timeline,
            'phases' => $phases,
            'history' => $history,
        ];
    }

    private function buildTimelineEntry(
        TrackStage $stage,
        User $student,
        Track $track,
        Collection $progressRecords,
        Collection $flatSteps,
    ): array {
        $record = $progressRecords->get($stage->id);
        $previous = TrackStageHierarchy::previousActionableStep($stage);
        $previousPassed = !$previous
            || ($progressRecords->get($previous->id)?->status === 'passed');

        $isFirst = $flatSteps->first()?->id === $stage->id;

        if ($record) {
            $status = $record->status;
        } elseif ($isFirst) {
            $status = 'available';
        } elseif ($previousPassed) {
            $status = 'available';
        } else {
            $status = 'locked';
        }

        $entry = [
            'stage_id' => $stage->id,
            'stage_name' => $stage->academicStage?->name ?? $stage->name,
            'parent_id' => $stage->parent_id,
            'parent_name' => $stage->parent?->name,
            'academic_stage_id' => $stage->academic_stage_id,
            'academic_stage_name' => $stage->academicStage?->name,
            'sequence_order' => $stage->sequence_order,
            'is_decisive' => (bool) $stage->is_decisive,
            'status' => $status,
            'completed_at' => $record?->completed_at?->toIso8601String(),
            'attempts' => $record ? (int) $record->history_count : 0,
        ];

        if ($status === 'locked' && $previous) {
            $entry['prerequisite'] = $previous->name;
        }

        return $entry;
    }

    /** @param array<int, array<string, mixed>> $stepEntries */
    private function derivePhaseStatus(array $stepEntries): string
    {
        if ($stepEntries === []) {
            return 'locked';
        }

        $statuses = collect($stepEntries)->pluck('status');

        if ($statuses->contains('in_progress')) {
            return 'in_progress';
        }

        if ($statuses->every(fn ($s) => $s === 'passed')) {
            return 'passed';
        }

        if ($statuses->contains(fn ($s) => in_array($s, ['available', 'failed', 'incomplete'], true))) {
            return 'in_progress';
        }

        return 'locked';
    }

    /**
     * @param array<int, array{stage_id: int, status: string}> $stepEntries
     */
    private function derivePhaseStatusForUnassignedTrack(array $stepEntries, ?int $flatFirstId): string
    {
        if ($stepEntries === []) {
            return 'locked';
        }

        $containsFirst = collect($stepEntries)->contains(
            fn (array $entry) => $entry['stage_id'] === $flatFirstId && $entry['status'] === 'available',
        );

        if ($containsFirst) {
            return 'in_progress';
        }

        return 'locked';
    }

    public function getAvailableStagesForStudent(User $student): array
    {
        // Heal students stuck with track_id after withdrawing all proposals.
        $this->releaseTrackAssignmentIfProposalWithdrawn($student->fresh());
        $student->refresh();

        $query = Track::query()
            ->where('university_id', $student->university_id)
            ->where('is_active', true)
            ->with(['stages.academicStage'])
            ->orderBy('name');

        if ($student->track_id) {
            $query->where('id', $student->track_id);
        }

        $tracks = $query->get();
        $progressData = $this->getStudentProgress($student);

        return $tracks->map(function (Track $track) use ($progressData, $student) {
            $timelineByStage = collect($progressData['timeline'] ?? [])->keyBy('stage_id');
            $flatFirstId = TrackStageHierarchy::flattenedActionableSteps($track)->first()?->id;
            $sameTrack = (int) ($student->track_id ?? 0) === (int) $track->id;

            $phases = collect(TrackStageHierarchy::groupedPhases($track))->map(function (array $group) use ($timelineByStage, $student, $flatFirstId, $sameTrack) {
                $phase = $group['phase'];
                $stepEntries = [];

                foreach ($group['steps'] as $stage) {
                    $timelineItem = $timelineByStage->get($stage->id);
                    $status = $timelineItem['status'] ?? ($stage->id === $flatFirstId ? 'available' : 'locked');

                    if (!$student->track_id && $stage->id === $flatFirstId) {
                        $status = 'available';
                    }

                    $stepEntries[] = [
                        'stage_id' => $stage->id,
                        'status' => $status,
                    ];
                }

                $phaseStatus = $sameTrack
                    ? $this->derivePhaseStatus(
                        collect($stepEntries)->map(fn (array $entry) => ['status' => $entry['status']])->all(),
                    )
                    : $this->derivePhaseStatusForUnassignedTrack($stepEntries, $flatFirstId);

                $currentStep = collect($stepEntries)->first(
                    fn (array $entry) => in_array($entry['status'], ['available', 'failed'], true),
                );
                $currentStepId = $currentStep['stage_id'] ?? null;
                $unlocked = $currentStepId !== null;

                return [
                    'id' => $phase?->id,
                    'name' => $phase?->name ?? $group['steps']->first()?->academicStage?->name ?? $group['steps']->first()?->name,
                    'sequence_order' => $phase?->sequence_order ?? $group['steps']->first()?->sequence_order,
                    'status' => $phaseStatus,
                    'unlocked' => $unlocked,
                    'current_step_id' => $currentStepId,
                    'step_ids' => collect($stepEntries)->pluck('stage_id')->values()->all(),
                ];
            })->values()->all();

            return [
                'id' => $track->id,
                'name' => $track->name,
                'phases' => $phases,
            ];
        })->values()->all();
    }

    public function canUserRecordDefenseResult(DefenseSession $session, User $user): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        $session->loadMissing(['committee.members', 'committeeAssignments']);

        if ($session->committee_id && $session->committee) {
            return $session->committee->members()
                ->where('users.id', $user->id)
                ->wherePivot('role', 'chair')
                ->exists();
        }

        return $session->committeeAssignments()
            ->where('user_id', $user->id)
            ->exists();
    }

    public function recordDefenseResult(
        DefenseSession $session,
        User $recorder,
        string $result,
        ?string $reason = null,
    ): array {
        if (!in_array($result, ['passed', 'failed', 'incomplete'], true)) {
            throw ValidationException::withMessages([
                'result' => ['Result must be passed, failed, or incomplete.'],
            ]);
        }

        [$session, $project, $student, $trackStage] = $this->resolveDefenseRecordingContext($session, $recorder);

        if (!$trackStage->is_decisive) {
            throw ValidationException::withMessages([
                'track_stage' => ['This is a non-decisive stage. Use complete-stage instead.'],
            ]);
        }

        return $this->applyDefenseProgress($session, $recorder, $project, $student, $trackStage, $result, $reason);
    }

    public function completeNonDecisiveStage(
        DefenseSession $session,
        User $recorder,
        ?string $reason = null,
    ): array {
        [$session, $project, $student, $trackStage] = $this->resolveDefenseRecordingContext($session, $recorder);

        if ($trackStage->is_decisive) {
            throw ValidationException::withMessages([
                'track_stage' => ['This is a decisive stage. Record pass, fail, or incomplete instead.'],
            ]);
        }

        return $this->applyDefenseProgress($session, $recorder, $project, $student, $trackStage, 'passed', $reason);
    }

    /** Auto-completes non-decisive stages once the scheduled defense window has ended. */
    public function autoCompleteExpiredNonDecisiveSessionIfNeeded(DefenseSession $session): bool
    {
        if ($session->status !== 'scheduled' || !$this->isDefenseSessionExpired($session)) {
            return false;
        }

        $session->loadMissing(['project.user', 'approvedSchedule', 'trackStage']);

        $trackStage = $this->resolveTrackStageForDefense($session, $session->project?->user);
        if (!$trackStage || $trackStage->is_decisive) {
            return false;
        }

        $student = $session->project?->user;
        if (!$student) {
            return false;
        }

        $alreadyRecorded = StudentProgress::query()
            ->where('student_id', $student->id)
            ->where('track_stage_id', $trackStage->id)
            ->whereIn('status', ['passed', 'failed', 'incomplete'])
            ->whereNotNull('defense_result_recorded_at')
            ->exists();

        if ($alreadyRecorded) {
            return false;
        }

        $recorder = User::find($session->approvedSchedule?->approved_by);
        if (!$recorder) {
            return false;
        }

        $this->applyDefenseProgress(
            $session,
            $recorder,
            $session->project,
            $student,
            $trackStage,
            'passed',
            'Auto-completed after scheduled end time.',
        );

        return true;
    }

    /** Processes all expired non-decisive defense sessions. */
    public function autoCompleteExpiredNonDecisiveSessions(): int
    {
        $sessions = DefenseSession::query()
            ->where('status', 'scheduled')
            ->whereNotNull('scheduled_date')
            ->whereNotNull('scheduled_end_time')
            ->whereHas('trackStage', fn ($query) => $query->where('is_decisive', false))
            ->with(['project.user', 'approvedSchedule', 'trackStage'])
            ->get();

        $completed = 0;

        foreach ($sessions as $session) {
            if ($this->autoCompleteExpiredNonDecisiveSessionIfNeeded($session)) {
                $completed++;
            }
        }

        return $completed;
    }

    private function isDefenseSessionExpired(DefenseSession $session): bool
    {
        if (!$session->scheduled_date || !$session->scheduled_end_time) {
            return false;
        }

        $endAt = Carbon::parse(
            $session->scheduled_date->format('Y-m-d') . ' ' . substr((string) $session->scheduled_end_time, 0, 8)
        );

        return $endAt->isPast();
    }

    /** Returns defense session context including stage decisiveness and any recorded result. */
    public function getDefenseSessionContext(Project $project, DefenseSession $session): ?array
    {
        $project->loadMissing(['user', 'proposal']);
        $session->loadMissing('approvedSchedule');

        $student = $project->user;
        if (!$student) {
            return null;
        }

        $trackStage = $this->resolveTrackStageForDefense($session, $student);
        if (!$trackStage) {
            return null;
        }

        $base = [
            'stage_id' => $trackStage->id,
            'stage_name' => $trackStage->name,
            'stage_is_decisive' => (bool) $trackStage->is_decisive,
            'result' => null,
        ];

        $progress = StudentProgress::query()
            ->where('student_id', $student->id)
            ->where('track_stage_id', $trackStage->id)
            ->whereIn('status', ['passed', 'failed', 'incomplete'])
            ->whereNotNull('defense_result_recorded_at')
            ->with('recordedBy:id,name')
            ->first();

        if (!$progress) {
            return $base;
        }

        $nextStage = $progress->status === 'passed' ? TrackStageHierarchy::nextActionableStep($trackStage) : null;

        return array_merge($base, [
            'result' => $progress->status,
            'recorded_at' => $progress->defense_result_recorded_at?->toIso8601String(),
            'recorded_by' => $progress->recordedBy?->name,
            'next_stage' => $nextStage ? [
                'id' => $nextStage->id,
                'name' => $nextStage->name,
                'unlocked' => true,
            ] : null,
        ]);
    }

    /** @deprecated Use getDefenseSessionContext() */
    public function getRecordedDefenseResult(Project $project, DefenseSession $session): ?array
    {
        $context = $this->getDefenseSessionContext($project, $session);

        return $context && $context['result'] ? $context : null;
    }

    /**
     * @return array{0: DefenseSession, 1: Project, 2: User, 3: TrackStage}
     */
    private function resolveDefenseRecordingContext(DefenseSession $session, User $recorder): array
    {
        if (!$this->canUserRecordDefenseResult($session, $recorder)) {
            throw ValidationException::withMessages([
                'authorization' => ['You are not authorized to record results for this defense session.'],
            ]);
        }

        $session->load(['project.proposal.trackStage', 'approvedSchedule']);

        $project = $session->project;
        if (!$project) {
            throw ValidationException::withMessages([
                'defense_session' => ['Defense session has no associated project.'],
            ]);
        }

        if ((int) $project->university_id !== (int) $recorder->university_id) {
            throw ValidationException::withMessages([
                'authorization' => ['You are not authorized to record results for this defense session.'],
            ]);
        }

        $student = User::find($project->user_id);
        if (!$student) {
            throw ValidationException::withMessages([
                'student' => ['Project owner not found.'],
            ]);
        }

        $trackStage = $this->resolveTrackStageForDefense($session, $student);
        if (!$trackStage) {
            throw ValidationException::withMessages([
                'track_stage' => ['Could not determine academic track stage for this defense.'],
            ]);
        }

        return [$session, $project, $student, $trackStage];
    }

    private function applyDefenseProgress(
        DefenseSession $session,
        User $recorder,
        Project $project,
        User $student,
        TrackStage $trackStage,
        string $result,
        ?string $reason = null,
    ): array {
        if (!$student->track_id) {
            $student->update(['track_id' => $trackStage->track_id]);
        }

        $progress = StudentProgress::query()->firstOrCreate(
            [
                'student_id' => $student->id,
                'track_id' => $trackStage->track_id,
                'track_stage_id' => $trackStage->id,
            ],
            ['status' => 'in_progress'],
        );

        $isLateModification = $progress->status !== 'in_progress'
            && $progress->defense_result_recorded_at
            && $progress->defense_result_recorded_at->diffInHours(now()) >= 48;

        if (!$progress->isModificationAllowed($recorder)) {
            throw ValidationException::withMessages([
                'result' => ['Only administrators can modify results after 48 hours.'],
            ]);
        }

        if ($isLateModification && !$recorder->isAdmin()) {
            throw ValidationException::withMessages([
                'result' => ['Only administrators can modify results after 48 hours.'],
            ]);
        }

        if ($isLateModification && (!$reason || trim($reason) === '')) {
            throw ValidationException::withMessages([
                'reason' => ['Reason is required when modifying results after 48 hours.'],
            ]);
        }

        $lateModification = $isLateModification;

        return DB::transaction(function () use ($progress, $recorder, $result, $reason, $trackStage, $student, $lateModification, $session, $project) {
            $trackStage->loadMissing('parent:id,name');

            $progress->update([
                'status' => $result,
                'defense_result_recorded_by' => $recorder->id,
                'defense_result_recorded_at' => now(),
                'modification_reason' => $lateModification ? $reason : $progress->modification_reason,
                'completed_at' => $result === 'passed' ? now() : null,
            ]);

            $this->logProgressHistory($progress->fresh(), $recorder, $result, $reason);

            $nextStage = $result === 'passed' ? TrackStageHierarchy::nextActionableStep($trackStage) : null;
            $trackCompleted = $result === 'passed' && !$nextStage;
            $graduated = false;
            $phaseCompleted = false;

            if ($nextStage && $result === 'passed') {
                StudentProgress::firstOrCreate(
                    [
                        'student_id' => $student->id,
                        'track_id' => $trackStage->track_id,
                        'track_stage_id' => $nextStage->id,
                    ],
                    ['status' => 'in_progress'],
                );

                $crossesPhase =
                    (int) ($trackStage->parent_id ?? 0) !== (int) ($nextStage->parent_id ?? 0);

                $project->loadMissing('proposal');

                if ($crossesPhase) {
                    // Sub-track finished: close this project. Next phase needs a new proposal/project.
                    $phaseCompleted = true;
                    if ($project->status !== 'completed') {
                        $project->update(['status' => 'completed']);
                    }
                } elseif ($project->proposal) {
                    // Same sub-track: keep advancing this project to the next step.
                    $project->proposal->update(['track_stage_id' => $nextStage->id]);
                }
            }

            if ($trackCompleted) {
                if ($project->status !== 'completed') {
                    $project->update(['status' => 'completed']);
                }

                if ($student->status !== 'graduated') {
                    $student->update(['status' => 'graduated']);
                    $graduated = true;
                } else {
                    $graduated = true;
                }
            }

            if ($session->status === 'scheduled') {
                $session->update(['status' => 'completed']);
            }

            $notificationKey = $trackCompleted
                ? 'track_completed'
                : ($phaseCompleted
                    ? 'phase_completed'
                    : ($trackStage->is_decisive ? 'defense_result_recorded' : 'defense_stage_completed'));

            $notificationBody = match (true) {
                $trackCompleted => sprintf(
                    'Congratulations! You completed %s and finished your academic track. You are now a graduate.',
                    $trackStage->name,
                ),
                $phaseCompleted && $nextStage => sprintf(
                    'You completed this sub-track (%s). Submit a new project proposal for %s.',
                    $trackStage->parent?->name ?? $trackStage->name,
                    $nextStage->name,
                ),
                $result === 'passed' && $nextStage => sprintf(
                    'You passed %s. Your project has moved to %s.',
                    $trackStage->name,
                    $nextStage->name,
                ),
                default => sprintf(
                    $trackStage->is_decisive
                        ? 'Your defense for %s has been recorded as %s'
                        : 'Your academic stage %s has been marked complete',
                    $trackStage->name,
                    $result
                ),
            };

            $this->notifications->notifyUser(
                $student,
                $notificationKey,
                $trackCompleted
                    ? 'Congratulations — Graduate'
                    : ($phaseCompleted
                        ? 'Sub-track completed'
                        : ($trackStage->is_decisive ? 'Defense Result Recorded' : 'Academic Stage Completed')),
                $notificationBody,
                [
                    'track_stage_id' => $trackStage->id,
                    'result' => $result,
                    'track_completed' => $trackCompleted,
                    'phase_completed' => $phaseCompleted,
                    'graduated' => $graduated,
                    'next_stage_id' => $nextStage?->id,
                ]
            );

            return [
                'progress' => $progress->fresh(['trackStage', 'recordedBy:id,name']),
                'student_id' => $student->id,
                'student_name' => $student->name,
                'stage_id' => $trackStage->id,
                'stage_name' => $trackStage->name,
                'stage_is_decisive' => (bool) $trackStage->is_decisive,
                'result' => $result,
                'recorded_at' => $progress->defense_result_recorded_at?->toIso8601String(),
                'next_stage' => $nextStage ? [
                    'id' => $nextStage->id,
                    'name' => $nextStage->name,
                    'unlocked' => $result === 'passed',
                ] : null,
                'track_completed' => $trackCompleted,
                'phase_completed' => $phaseCompleted,
                'graduated' => $graduated,
                'project_status' => $project->fresh()?->status,
            ];
        });
    }

    /** Projects eligible for scheduling at a given academic defense stage. */
    public function getProjectsEligibleForAcademicStage(int $universityId, AcademicStageConfig $stage): Collection
    {
        $baseQuery = Project::query()
            ->where('university_id', $universityId)
            ->whereNotNull('supervisor_id')
            ->whereDoesntHave('defenseSessions', function ($q) use ($stage) {
                $q->where('status', 'scheduled')
                    ->whereHas('approvedSchedule', function ($schedule) use ($stage) {
                        $schedule->withoutGlobalScopes()
                            ->where('academic_stage_id', $stage->id)
                            ->where('status', 'active');
                    });
            });

        $hasActiveTracks = Track::query()
            ->where('university_id', $universityId)
            ->where('is_active', true)
            ->exists();

        if (!$hasActiveTracks) {
            return $baseQuery->get();
        }

        $linkedTrackStageIds = TrackStage::query()
            ->where('academic_stage_id', $stage->id)
            ->whereHas('track', fn ($q) => $q
                ->where('university_id', $universityId)
                ->where('is_active', true))
            ->pluck('id');

        if ($linkedTrackStageIds->isEmpty()) {
            return collect();
        }

        return $baseQuery
            ->whereHas('proposal', function ($q) use ($linkedTrackStageIds) {
                $q->whereIn('track_stage_id', $linkedTrackStageIds);
            })
            ->whereExists(function ($sub) use ($linkedTrackStageIds) {
                $sub->selectRaw('1')
                    ->from('student_progress as sp')
                    ->join('project_proposals as pp', 'pp.track_stage_id', '=', 'sp.track_stage_id')
                    ->whereColumn('sp.student_id', 'projects.user_id')
                    ->whereColumn('pp.id', 'projects.proposal_id')
                    ->where('sp.status', 'in_progress')
                    ->whereIn('sp.track_stage_id', $linkedTrackStageIds);
            })
            ->get();
    }

    /** Returns scheduling eligibility summary for admin readiness checks. */
    public function getSchedulingEligibilitySummary(int $universityId, ?AcademicStageConfig $stage): array
    {
        $totalSupervised = Project::query()
            ->where('university_id', $universityId)
            ->whereNotNull('supervisor_id')
            ->count();

        if (!$stage) {
            return [
                'eligible_projects_count' => $totalSupervised,
                'total_supervised_projects' => $totalSupervised,
                'excluded_projects_count' => 0,
                'linked_track_stages_count' => 0,
                'tracks_enabled' => false,
            ];
        }

        $linkedTrackStagesCount = TrackStage::query()
            ->where('academic_stage_id', $stage->id)
            ->whereHas('track', fn ($q) => $q
                ->where('university_id', $universityId)
                ->where('is_active', true))
            ->count();

        $tracksEnabled = Track::query()
            ->where('university_id', $universityId)
            ->where('is_active', true)
            ->exists();

        $eligible = $this->getProjectsEligibleForAcademicStage($universityId, $stage);

        return [
            'eligible_projects_count' => $eligible->count(),
            'total_supervised_projects' => $totalSupervised,
            'excluded_projects_count' => max(0, $totalSupervised - $eligible->count()),
            'linked_track_stages_count' => $linkedTrackStagesCount,
            'tracks_enabled' => $tracksEnabled,
        ];
    }

    public function overridePrerequisite(User $student, int $trackStageId, string $reason, User $admin): StudentProgress
    {
        if (!$admin->isAdmin()) {
            throw ValidationException::withMessages([
                'authorization' => ['Only administrators can override prerequisites.'],
            ]);
        }

        $stage = TrackStage::with('track')->findOrFail($trackStageId);

        if ((int) $student->university_id !== (int) $stage->track->university_id) {
            throw ValidationException::withMessages([
                'student' => ['Student does not belong to this university.'],
            ]);
        }

        return DB::transaction(function () use ($student, $stage, $reason, $admin) {
            $student->update(['track_id' => $stage->track_id]);

            $progress = StudentProgress::updateOrCreate(
                [
                    'student_id' => $student->id,
                    'track_id' => $stage->track_id,
                    'track_stage_id' => $stage->id,
                ],
                ['status' => 'in_progress'],
            );

            $this->logProgressHistory($progress, $admin, 'in_progress', $reason);

            $this->notifications->notifyUser(
                $student,
                'prerequisite_override',
                'Prerequisite Override',
                sprintf('An administrator unlocked %s for you: %s', $stage->name, $reason),
                ['track_stage_id' => $stage->id],
            );

            return $progress->fresh(['trackStage']);
        });
    }

    private function resolveTrackStageForDefense(DefenseSession $session, User $student): ?TrackStage
    {
        if ($session->track_stage_id) {
            return TrackStage::find($session->track_stage_id);
        }

        if ($session->project?->proposal?->track_stage_id) {
            return TrackStage::find($session->project->proposal->track_stage_id);
        }

        $academicStageId = $session->approvedSchedule?->academic_stage_id;
        if (!$academicStageId) {
            return null;
        }

        $trackId = $student->track_id;
        if (!$trackId) {
            return TrackStage::query()
                ->where('academic_stage_id', $academicStageId)
                ->whereHas('track', fn ($q) => $q->where('university_id', $student->university_id)->where('is_active', true))
                ->orderBy('sequence_order')
                ->first();
        }

        return TrackStage::query()
            ->where('track_id', $trackId)
            ->where('academic_stage_id', $academicStageId)
            ->first();
    }

    private function logProgressHistory(
        StudentProgress $progress,
        User $recorder,
        string $status,
        ?string $reason = null,
    ): void {
        $maxAttempt = (int) StudentProgressHistory::query()
            ->where('student_progress_id', $progress->id)
            ->max('attempt_number');

        StudentProgressHistory::create([
            'student_progress_id' => $progress->id,
            'attempt_number' => $maxAttempt + 1,
            'status' => $status,
            'recorded_by' => $recorder->id,
            'recorded_at' => now(),
            'modification_reason' => $reason,
        ]);
    }

    private function assertUniqueTrackName(int $universityId, string $name, ?int $excludeId = null): void
    {
        $query = Track::query()
            ->where('university_id', $universityId)
            ->where('name', $name);

        if ($excludeId) {
            $query->where('id', '!=', $excludeId);
        }

        if ($query->exists()) {
            throw ValidationException::withMessages([
                'name' => ['A track with this name already exists.'],
            ]);
        }
    }

    /** @return Collection<int, User> */
    private function resolveStudents(array $studentIds, int $universityId): Collection
    {
        $students = User::query()
            ->whereIn('id', $studentIds)
            ->where('university_id', $universityId)
            ->whereHas('role', fn ($q) => $q->where('name', 'student'))
            ->get();

        if ($students->count() !== count(array_unique($studentIds))) {
            throw ValidationException::withMessages([
                'student_ids' => ['All students must be active students in your university.'],
            ]);
        }

        return $students;
    }

    private function resolveAccessibleStage(
        User $student,
        int $trackStageId,
        bool $requireTrackMatch,
    ): TrackStage {
        $stage = TrackStage::with('track')->findOrFail($trackStageId);

        if ((int) $stage->track->university_id !== (int) $student->university_id) {
            throw ValidationException::withMessages([
                'track_stage_id' => ['Invalid academic stage for your university.'],
            ]);
        }

        if ($requireTrackMatch && $student->track_id && (int) $student->track_id !== (int) $stage->track_id) {
            throw ValidationException::withMessages([
                'track_stage_id' => ['This stage belongs to a different track than your assignment.'],
            ]);
        }

        return $stage;
    }

    private function ensureStageProgressForProposal(User $student, TrackStage $stage): StudentProgress
    {
        $progress = StudentProgress::query()->firstOrCreate(
            [
                'student_id' => $student->id,
                'track_id' => $stage->track_id,
                'track_stage_id' => $stage->id,
            ],
            ['status' => 'in_progress'],
        );

        if ($progress->wasRecentlyCreated) {
            $this->logProgressHistory($progress, $student, 'in_progress');
        } elseif ($progress->status === 'failed') {
            $progress->update(['status' => 'in_progress']);
            $this->logProgressHistory($progress->fresh(), $student, 'in_progress', 'Retry after failed attempt');
        }

        return $progress;
    }

    private function reactivateFailedStageIfNeeded(User $student, TrackStage $stage): void
    {
        $progress = StudentProgress::query()
            ->where('student_id', $student->id)
            ->where('track_id', $stage->track_id)
            ->where('track_stage_id', $stage->id)
            ->first();

        if (in_array($progress?->status, ['failed', 'incomplete'], true)) {
            $progress->update(['status' => 'in_progress']);
            $this->logProgressHistory($progress->fresh(), $student, 'in_progress', 'Retry after failed attempt');
        }
    }

    private function assertAcademicStageInUniversity(?int $academicStageId, int $universityId): void
    {
        if (!$academicStageId) {
            return;
        }

        $exists = AcademicStageConfig::query()
            ->where('id', $academicStageId)
            ->where('university_id', $universityId)
            ->exists();

        if (!$exists) {
            throw ValidationException::withMessages([
                'academic_stage_id' => ['The selected scheduling stage is not valid for this university.'],
            ]);
        }
    }
}

<?php

namespace App\Support;

use App\Models\Track;
use App\Models\TrackStage;
use Illuminate\Support\Collection;

/** Orders track phases and nested steps for prerequisites and progress display. */
final class TrackStageHierarchy
{
    public const KIND_PHASE = 'phase';

    public const KIND_STEP = 'step';

    /**
     * Depth-first list of stages students actually progress through (steps only).
     *
     * @return Collection<int, TrackStage>
     */
    public static function flattenedActionableSteps(Track $track): Collection
    {
        $track->loadMissing(['stages.academicStage']);

        $roots = $track->stages
            ->whereNull('parent_id')
            ->sortBy('sequence_order')
            ->values();

        $flat = collect();

        foreach ($roots as $root) {
            if ($root->stage_kind === self::KIND_PHASE) {
                $children = $track->stages
                    ->where('parent_id', $root->id)
                    ->sortBy('sequence_order')
                    ->values();

                foreach ($children as $child) {
                    $flat->push($child);
                }
            } elseif ($root->stage_kind === self::KIND_STEP) {
                $flat->push($root);
            }
        }

        return $flat;
    }

    public static function previousActionableStep(TrackStage $stage): ?TrackStage
    {
        $stage->loadMissing('track.stages');
        $flat = self::flattenedActionableSteps($stage->track);
        $index = $flat->search(fn (TrackStage $s) => $s->id === $stage->id);

        if ($index === false || $index === 0) {
            return null;
        }

        return $flat->get($index - 1);
    }

    public static function nextActionableStep(TrackStage $stage): ?TrackStage
    {
        $stage->loadMissing('track.stages');
        $flat = self::flattenedActionableSteps($stage->track);
        $index = $flat->search(fn (TrackStage $s) => $s->id === $stage->id);

        if ($index === false) {
            return null;
        }

        return $flat->get($index + 1);
    }

    public static function isActionable(TrackStage $stage): bool
    {
        return $stage->stage_kind === self::KIND_STEP && $stage->parent_id !== null
            || ($stage->stage_kind === self::KIND_STEP && $stage->parent_id === null);
    }

    public static function assertActionable(TrackStage $stage): void
    {
        if ($stage->stage_kind === self::KIND_PHASE) {
            throw new \InvalidArgumentException('Proposals and defense results apply to steps, not phase containers.');
        }
    }

    /**
     * @return array<int, array{phase: TrackStage, steps: Collection<int, TrackStage>}>
     */
    public static function groupedPhases(Track $track): array
    {
        $track->loadMissing(['stages.academicStage']);

        $roots = $track->stages
            ->whereNull('parent_id')
            ->sortBy('sequence_order')
            ->values();

        $groups = [];

        foreach ($roots as $root) {
            if ($root->stage_kind === self::KIND_PHASE) {
                $groups[] = [
                    'phase' => $root,
                    'steps' => $track->stages
                        ->where('parent_id', $root->id)
                        ->sortBy('sequence_order')
                        ->values(),
                ];
            } elseif ($root->stage_kind === self::KIND_STEP) {
                $groups[] = [
                    'phase' => null,
                    'steps' => collect([$root]),
                ];
            }
        }

        return $groups;
    }

    /** True when this step is the last step of the last phase in its track. */
    public static function isLastStepOfLastPhase(TrackStage $step): bool
    {
        if ($step->stage_kind !== self::KIND_STEP || !$step->parent_id) {
            return false;
        }

        $step->loadMissing('track.stages');
        $track = $step->track;
        if (!$track) {
            return false;
        }

        $phases = $track->stages
            ->whereNull('parent_id')
            ->where('stage_kind', self::KIND_PHASE)
            ->sortBy('sequence_order')
            ->values();

        $lastPhase = $phases->last();
        if (!$lastPhase || (int) $lastPhase->id !== (int) $step->parent_id) {
            return false;
        }

        $siblings = $track->stages
            ->where('parent_id', $lastPhase->id)
            ->where('stage_kind', self::KIND_STEP)
            ->sortBy('sequence_order')
            ->values();

        $lastStep = $siblings->last();

        return $lastStep && (int) $lastStep->id === (int) $step->id;
    }

    /**
     * Premium rooms apply for a session whose track step is the last step of the last phase.
     * Catalog types (including final defense) may be shared across earlier phases.
     */
    public static function academicStageUsesPremiumRooms(int $universityId, int $academicStageId): bool
    {
        return self::academicStageHasTerminalPlacement($universityId, $academicStageId)
            && !self::academicStageHasNonTerminalPlacement($universityId, $academicStageId);
    }

    /** True when this academic stage appears as last step of last phase on any active track. */
    public static function academicStageHasTerminalPlacement(int $universityId, int $academicStageId): bool
    {
        $steps = self::linkedActionableSteps($universityId, $academicStageId);

        return $steps->contains(fn (TrackStage $step) => self::isLastStepOfLastPhase($step));
    }

    /** True when this academic stage appears outside last-step-of-last-phase. */
    public static function academicStageHasNonTerminalPlacement(int $universityId, int $academicStageId): bool
    {
        $steps = self::linkedActionableSteps($universityId, $academicStageId);

        return $steps->contains(fn (TrackStage $step) => !self::isLastStepOfLastPhase($step));
    }

    /** Whether any active-track step links this academic stage in the university. */
    public static function academicStageHasTrackLinks(int $universityId, int $academicStageId): bool
    {
        return self::linkedActionableSteps($universityId, $academicStageId)->isNotEmpty();
    }

    /**
     * @return Collection<int, TrackStage>
     */
    private static function linkedActionableSteps(int $universityId, int $academicStageId): Collection
    {
        return TrackStage::query()
            ->where('academic_stage_id', $academicStageId)
            ->where('stage_kind', self::KIND_STEP)
            ->whereHas('track', function ($q) use ($universityId) {
                $q->where('university_id', $universityId)->where('is_active', true);
            })
            ->with(['track.stages'])
            ->get();
    }
}

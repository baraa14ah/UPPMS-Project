<?php

namespace App\Services;

use App\Exceptions\InsufficientFacultyException;
use App\Exceptions\InvalidStageException;
use App\Exceptions\SchedulingInProgressException;
use App\Models\AcademicStageConfig;
use App\Models\AvailableRoom;
use App\Models\Committee;
use App\Models\Project;
use App\Models\User;
use App\Scheduling\AlgorithmConfig;
use App\Scheduling\EvolutionaryOperators;
use App\Scheduling\FitnessCalculator;
use App\Scheduling\PopulationManager;
use App\Scheduling\ResultMetadata;
use App\Scheduling\ScheduleCandidate;
use App\Scheduling\SchedulingContext;
use App\Scheduling\SchedulingResult;
use App\Support\TrackStageHierarchy;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class GeneticSchedulerService
{
    private FitnessCalculator $fitnessCalculator;
    private PopulationManager $populationManager;
    private EvolutionaryOperators $operators;

    public function __construct(
        FitnessCalculator $fitnessCalculator,
        PopulationManager $populationManager,
        EvolutionaryOperators $operators,
        protected TrackService $trackService,
    ) {
        $this->fitnessCalculator = $fitnessCalculator;
        $this->populationManager = $populationManager;
        $this->operators = $operators;
    }

    /** Generate optimized committee schedules. */
    public function generate(
        int $universityId,
        int $stageId,
        ?AlgorithmConfig $config = null
    ): SchedulingResult {
        $config = $config ?? new AlgorithmConfig();
        $lockKey = $this->getLockKey($universityId, $stageId);

        if (!Cache::add($lockKey, true, 60)) {
            throw new SchedulingInProgressException($universityId, $stageId);
        }

        try {
            $startTime = microtime(true);

            $context = $this->buildContext($universityId, $stageId, $config);

            if ($context->getProjectCount() === 0) {
                return SchedulingResult::empty($context->getFacultyCount());
            }

            if ($context->getFacultyCount() === 0 && !$config->useCommittees) {
                throw new InsufficientFacultyException(0, 0);
            }

            if ($config->useCommittees && !$context->usesPredefinedCommittees()) {
                throw new \InvalidArgumentException(
                    'No active committees with at least 2 members are available for scheduling.'
                );
            }

            $population = $this->populationManager->initialize($context, $config->populationSize);
            $population = array_map(
                fn ($chromosome) => $this->operators->repair($chromosome, $context),
                $population
            );

            $this->evaluatePopulation($population, $context);

            $generationsCompleted = 0;
            $totalEvaluations = $config->populationSize;
            $timedOut = false;

            for ($gen = 0; $gen < $config->maxGenerations; $gen++) {
                $elapsed = microtime(true) - $startTime;
                if ($elapsed > $config->maxTimeSeconds) {
                    $timedOut = true;
                    break;
                }

                $offspringCount = $config->populationSize - $config->getEliteCount();
                $offspring = $this->operators->generateOffspring(
                    $population,
                    $context,
                    $offspringCount,
                    $config->tournamentSize,
                    $config->mutationRate
                );

                $this->evaluatePopulation($offspring, $context);
                $totalEvaluations += count($offspring);

                $population = $this->populationManager->replaceWorst(
                    $population,
                    $offspring,
                    $config->getEliteCount()
                );

                $generationsCompleted++;
            }

            $topChromosomes = $this->populationManager->selectDistinctTop($population, 3);

            $candidates = [];
            $rank = 1;
            foreach ($topChromosomes as $chromosome) {
                $workload = $this->populationManager->calculateFacultyWorkload($chromosome, $context);
                $candidates[] = new ScheduleCandidate($rank++, $chromosome, $workload, $context);
            }

            $executionTimeMs = (int) ((microtime(true) - $startTime) * 1000);

            $metadata = new ResultMetadata(
                executionTimeMs: $executionTimeMs,
                generationsCompleted: $generationsCompleted,
                totalEvaluations: $totalEvaluations,
                timedOut: $timedOut,
                projectCount: $context->getProjectCount(),
                facultyCount: $context->getFacultyCount(),
                dynamicReductionApplied: $context->needsDynamicReduction()
            );

            $warnings = [];
            if ($timedOut) {
                $warnings[] = 'timed_out';
            }
            if ($config->useCommittees) {
                $warnings[] = 'committee_mode';
            }
            if ($context->needsDynamicReduction()) {
                $warnings[] = 'dynamic_reduction';
            }
            if ($context->getRoomCount() === 0) {
                $warnings[] = 'no_rooms';
            }
            if (empty($context->getAvailableTimeSlots())) {
                $warnings[] = 'no_slots';
            }
            if (!$this->hasDistinctCandidates($topChromosomes)) {
                $warnings[] = 'not_distinct';
            }
            if (!$this->hasValidCandidate($topChromosomes)) {
                $warnings[] = 'no_valid';
            }

            Log::info('Scheduling completed', [
                'university_id' => $universityId,
                'stage_id' => $stageId,
                'execution_time_ms' => $executionTimeMs,
                'generations' => $generationsCompleted,
                'timed_out' => $timedOut,
            ]);

            return new SchedulingResult(
                success: true,
                candidates: $candidates,
                metadata: $metadata,
                warnings: $warnings
            );
        } finally {
            Cache::forget($lockKey);
        }
    }

    /** Check if scheduling is currently running for a university+stage. */
    public function isRunning(int $universityId, int $stageId): bool
    {
        return Cache::has($this->getLockKey($universityId, $stageId));
    }

    /** Get the cache lock key. */
    private function getLockKey(int $universityId, int $stageId): string
    {
        return "scheduling:{$universityId}:{$stageId}";
    }

    /** Build the scheduling context from database. */
    private function buildContext(int $universityId, int $stageId, AlgorithmConfig $config): SchedulingContext
    {
        $stage = AcademicStageConfig::where('university_id', $universityId)
            ->where('id', $stageId)
            ->first();

        if (!$stage) {
            throw new InvalidStageException($stageId, $universityId);
        }

        $projects = $this->trackService->getProjectsEligibleForAcademicStage($universityId, $stage)
            ->load(['supervisor', 'proposal.trackStage.track.stages']);

        $committeeMemberIds = null;
        if ($config->useCommittees) {
            $committees = Committee::query()
                ->where('university_id', $universityId)
                ->where('is_active', true)
                ->with('members:id,name,email')
                ->get()
                ->filter(fn (Committee $committee) => $committee->members->count() >= 2)
                ->values();

            $committeeMemberIds = $committees
                ->flatMap(fn (Committee $committee) => $committee->members->pluck('id'))
                ->unique()
                ->values();
        }

        $facultyQuery = User::query()
            ->whereHas('role', fn ($q) => $q->whereIn('name', ['supervisor', 'admin']));

        if ($committeeMemberIds !== null) {
            $facultyQuery->whereIn('id', $committeeMemberIds);
        } else {
            $facultyQuery->where('university_id', $universityId);
        }

        if ($config->useCommittees && $committeeMemberIds !== null && $committeeMemberIds->isNotEmpty()) {
            $facultyWithAvailability = $facultyQuery->get();
            $dayWindows = $stage->buildDayWindowsFromHours();
            $facultyAvailability = [];
            foreach ($facultyWithAvailability as $faculty) {
                $facultyAvailability[$faculty->id] = $dayWindows;
            }
            $facultyWithAvailability = $facultyWithAvailability->values();
        } elseif ($stage->usesMandatoryAvailability()) {
            $facultyWithAvailability = $facultyQuery->get();
            $mandatoryWindows = $stage->getMandatorySlotsList();
            $facultyAvailability = [];
            foreach ($facultyWithAvailability as $faculty) {
                $facultyAvailability[$faculty->id] = $mandatoryWindows;
            }
            $facultyWithAvailability = $facultyWithAvailability->filter(
                fn ($f) => !empty($facultyAvailability[$f->id])
            )->values();
        } else {
            $facultyWithAvailability = $facultyQuery
                ->whereHas('availabilities', fn ($q) => $q->where('academic_stage_id', $stageId))
                ->with(['availabilities' => fn ($q) => $q->where('academic_stage_id', $stageId)])
                ->get();

            $allowedDays = $stage->getAllowedDefenseDaysList();
            $dayStart = $stage->getDayStartTimeValue();
            $dayEnd = $stage->getDayEndTimeValue();
            $facultyAvailability = [];
            foreach ($facultyWithAvailability as $faculty) {
                $facultyAvailability[$faculty->id] = $faculty->availabilities
                    ->filter(fn ($a) => in_array($a->day_of_week, $allowedDays, true))
                    ->map(function ($a) use ($dayStart, $dayEnd) {
                        $start = max((string) $a->start_time, $dayStart);
                        $end = min((string) $a->end_time, $dayEnd);
                        if ($start >= $end) {
                            return null;
                        }

                        return [
                            'day_of_week' => $a->day_of_week,
                            'start_time' => $start,
                            'end_time' => $end,
                        ];
                    })
                    ->filter()
                    ->values()
                    ->toArray();
            }

            $facultyWithAvailability = $facultyWithAvailability->filter(
                fn ($f) => !empty($facultyAvailability[$f->id])
            )->values();
        }

        $allRooms = AvailableRoom::where('university_id', $universityId)
            ->orderBy('name')
            ->get();

        // Shared defense types may appear on every sub-track; premium rooms are
        // selected per project when its track step is last-of-last-phase.
        $standardRooms = $allRooms->where('is_premium', false)->values();
        $premiumRooms = $allRooms->where('is_premium', true)->values();

        $hasTerminal = TrackStageHierarchy::academicStageHasTerminalPlacement($universityId, $stageId);
        $hasNonTerminal = TrackStageHierarchy::academicStageHasNonTerminalPlacement($universityId, $stageId);
        $legacyFinalOnly = $stage->isFinalDefense()
            && !TrackStageHierarchy::academicStageHasTrackLinks($universityId, $stageId);

        if ($legacyFinalOnly || ($hasTerminal && !$hasNonTerminal)) {
            $rooms = $premiumRooms->isNotEmpty() ? $premiumRooms : $allRooms;
        } elseif ($hasNonTerminal && !$hasTerminal) {
            $rooms = $standardRooms->isNotEmpty() ? $standardRooms : $allRooms;
        } else {
            // Mixed placements (or unknown): keep both pools; context picks per project.
            $rooms = $allRooms;
        }

        $context = new SchedulingContext(
            $universityId,
            $stageId,
            $stage,
            $projects,
            $facultyWithAvailability,
            $rooms,
            $facultyAvailability,
            $config
        );
        $context->standardRooms = $standardRooms;
        $context->premiumRooms = $premiumRooms;

        if ($config->useCommittees) {
            $context->predefinedCommittees = isset($committees)
                ? $committees
                : Committee::query()
                    ->where('university_id', $universityId)
                    ->where('is_active', true)
                    ->with('members:id,name,email')
                    ->get()
                    ->filter(fn (Committee $committee) => $committee->members->count() >= 2)
                    ->values();
        }

        return $context;
    }

    /** Evaluate fitness for all chromosomes in a population. */
    private function evaluatePopulation(array $population, SchedulingContext $context): void
    {
        foreach ($population as $chromosome) {
            $breakdown = $this->fitnessCalculator->evaluate($chromosome, $context);
            $chromosome->setFitness($breakdown);
        }
    }

    /** @param Chromosome[] $chromosomes */
    private function hasValidCandidate(array $chromosomes): bool
    {
        foreach ($chromosomes as $chromosome) {
            if ($chromosome->isValid) {
                return true;
            }
        }

        return false;
    }

    /** @param Chromosome[] $chromosomes */
    private function hasDistinctCandidates(array $chromosomes): bool
    {
        if (count($chromosomes) < 2) {
            return true;
        }

        $signatures = [];
        foreach ($chromosomes as $chromosome) {
            $parts = [];
            foreach ($chromosome->genes as $gene) {
                $memberIds = $gene->getCommitteeMemberIds();
                sort($memberIds);
                $slotKey = $gene->timeSlot?->getConflictKey() ?? 'unscheduled';
                $parts[] = $gene->projectId . ':' . implode(',', $memberIds) . '@' . $slotKey;
            }
            sort($parts);
            $signatures[] = implode('|', $parts);
        }

        return count(array_unique($signatures)) === count($signatures);
    }
}

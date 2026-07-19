<?php

namespace App\Scheduling;

class ScheduleCandidate
{
    public int $rank;
    public float $fitness;
    public FitnessBreakdown $fitnessBreakdown;
    public array $assignments;
    public array $facultyWorkload;

    public function __construct(
        int $rank,
        Chromosome $chromosome,
        array $facultyWorkload = [],
        ?SchedulingContext $context = null
    ) {
        $this->rank = $rank;
        $this->fitness = $chromosome->fitness;
        $this->fitnessBreakdown = $chromosome->fitnessBreakdown ?? new FitnessBreakdown();
        $roomNames = $context?->getRoomNamesMap() ?? [];
        $this->assignments = array_map(
            fn ($gene) => $gene->toArray($roomNames),
            $chromosome->genes
        );
        $this->facultyWorkload = $facultyWorkload;
    }

    /** Convert to array for JSON serialization. */
    public function toArray(): array
    {
        return [
            'rank' => $this->rank,
            'fitness' => round($this->fitness, 2),
            'fitnessBreakdown' => $this->fitnessBreakdown->toArray(),
            'assignments' => $this->assignments,
            'facultyWorkload' => $this->facultyWorkload,
        ];
    }
}

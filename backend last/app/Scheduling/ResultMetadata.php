<?php

namespace App\Scheduling;

class ResultMetadata
{
    public int $executionTimeMs;
    public int $generationsCompleted;
    public int $totalEvaluations;
    public bool $timedOut;
    public int $projectCount;
    public int $facultyCount;
    public bool $dynamicReductionApplied;

    public function __construct(
        int $executionTimeMs = 0,
        int $generationsCompleted = 0,
        int $totalEvaluations = 0,
        bool $timedOut = false,
        int $projectCount = 0,
        int $facultyCount = 0,
        bool $dynamicReductionApplied = false
    ) {
        $this->executionTimeMs = $executionTimeMs;
        $this->generationsCompleted = $generationsCompleted;
        $this->totalEvaluations = $totalEvaluations;
        $this->timedOut = $timedOut;
        $this->projectCount = $projectCount;
        $this->facultyCount = $facultyCount;
        $this->dynamicReductionApplied = $dynamicReductionApplied;
    }

    /** Convert to array for JSON serialization. */
    public function toArray(): array
    {
        return [
            'executionTimeMs' => $this->executionTimeMs,
            'generationsCompleted' => $this->generationsCompleted,
            'totalEvaluations' => $this->totalEvaluations,
            'timedOut' => $this->timedOut,
            'projectCount' => $this->projectCount,
            'facultyCount' => $this->facultyCount,
            'dynamicReductionApplied' => $this->dynamicReductionApplied,
        ];
    }
}

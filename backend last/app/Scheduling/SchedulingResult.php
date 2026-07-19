<?php

namespace App\Scheduling;

class SchedulingResult
{
    public bool $success;
    public array $candidates;
    public ResultMetadata $metadata;
    public array $warnings;

    public function __construct(
        bool $success,
        array $candidates,
        ResultMetadata $metadata,
        array $warnings = []
    ) {
        $this->success = $success;
        $this->candidates = $candidates;
        $this->metadata = $metadata;
        $this->warnings = $warnings;
    }

    /** Create an empty successful result (no projects to schedule). */
    public static function empty(int $facultyCount): self
    {
        return new self(
            success: true,
            candidates: [],
            metadata: new ResultMetadata(
                executionTimeMs: 0,
                projectCount: 0,
                facultyCount: $facultyCount
            ),
            warnings: ['No projects to schedule']
        );
    }

    /** Add a warning message. */
    public function addWarning(string $warning): void
    {
        $this->warnings[] = $warning;
    }

    /** Convert to array for JSON serialization. */
    public function toArray(): array
    {
        return [
            'success' => $this->success,
            'candidates' => array_map(fn($c) => $c->toArray(), $this->candidates),
            'metadata' => $this->metadata->toArray(),
            'warnings' => $this->warnings,
        ];
    }
}

<?php

namespace App\Scheduling;

class Violation
{
    public const TYPE_SUPERVISOR_ON_COMMITTEE = 'supervisor_on_committee';
    public const TYPE_NO_AVAILABILITY = 'no_availability';
    public const TYPE_FACULTY_DOUBLE_BOOKING = 'faculty_double_booking';
    public const TYPE_ROOM_DOUBLE_BOOKING = 'room_double_booking';
    public const TYPE_INSUFFICIENT_REST = 'insufficient_rest';
    public const TYPE_UNDERSIZED_COMMITTEE = 'undersized_committee';

    public const SEVERITY_HARD = 'hard';
    public const SEVERITY_SOFT = 'soft';

    public string $type;
    public int $projectId;
    public string $details;
    public string $severity;

    public function __construct(string $type, int $projectId, string $details, string $severity)
    {
        $this->type = $type;
        $this->projectId = $projectId;
        $this->details = $details;
        $this->severity = $severity;
    }

    /** Create a hard violation (causes fitness = 0). */
    public static function hard(string $type, int $projectId, string $details): self
    {
        return new self($type, $projectId, $details, self::SEVERITY_HARD);
    }

    /** Create a soft violation (reduces fitness score). */
    public static function soft(string $type, int $projectId, string $details): self
    {
        return new self($type, $projectId, $details, self::SEVERITY_SOFT);
    }

    /** Check if this is a hard constraint violation. */
    public function isHard(): bool
    {
        return $this->severity === self::SEVERITY_HARD;
    }

    /** Convert to array for JSON serialization. */
    public function toArray(): array
    {
        return [
            'type' => $this->type,
            'projectId' => $this->projectId,
            'details' => $this->details,
            'severity' => $this->severity,
        ];
    }
}

<?php

namespace App\Scheduling;

class TimeSlot
{
    public int $dayOfWeek;
    public string $startTime;
    public string $endTime;

    private const DAY_NAMES = [
        0 => 'Sunday',
        1 => 'Monday',
        2 => 'Tuesday',
        3 => 'Wednesday',
        4 => 'Thursday',
        5 => 'Friday',
        6 => 'Saturday',
    ];

    public function __construct(int $dayOfWeek, string $startTime, string $endTime)
    {
        $this->dayOfWeek = $dayOfWeek;
        $this->startTime = $startTime;
        $this->endTime = $endTime;
    }

    /** Create from start time and duration in minutes. */
    public static function fromDuration(int $dayOfWeek, string $startTime, int $durationMinutes): self
    {
        $start = strtotime($startTime);
        $end = $start + ($durationMinutes * 60);
        $endTime = date('H:i:s', $end);

        return new self($dayOfWeek, $startTime, $endTime);
    }

    /** Get human-readable day name. */
    public function getDayName(): string
    {
        return self::DAY_NAMES[$this->dayOfWeek] ?? 'Unknown';
    }

    /** Get formatted time range string. */
    public function getTimeRange(): string
    {
        $start = substr($this->startTime, 0, 5);
        $end = substr($this->endTime, 0, 5);

        return "{$start} - {$end}";
    }

    /** Clone for crossover/mutation without shared references. */
    public function clone(): self
    {
        return new self($this->dayOfWeek, $this->startTime, $this->endTime);
    }

    /** Unique key for conflict detection (day + time range). */
    public function getConflictKey(): string
    {
        return "{$this->dayOfWeek}_{$this->startTime}_{$this->endTime}";
    }

    /** Convert to array for JSON serialization. */
    public function toArray(): array
    {
        return [
            'dayOfWeek' => $this->dayOfWeek,
            'dayName' => $this->getDayName(),
            'startTime' => $this->startTime,
            'endTime' => $this->endTime,
            'timeRange' => $this->getTimeRange(),
        ];
    }
}

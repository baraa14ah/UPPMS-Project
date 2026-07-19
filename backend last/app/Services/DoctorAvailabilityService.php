<?php

namespace App\Services;

use App\Models\DoctorAvailability;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class DoctorAvailabilityService
{
    /** Create or merge a weekly availability window for a supervisor (per academic stage). */
    public function createSlot(
        User $user,
        int $dayOfWeek,
        string $startTime,
        string $endTime,
        int $academicStageId
    ): DoctorAvailability {
        return DB::transaction(function () use ($user, $dayOfWeek, $startTime, $endTime, $academicStageId) {
            [$start, $end] = $this->parseWindow($startTime, $endTime);

            return $this->persistMergedSlot($user, $dayOfWeek, $start, $end, $academicStageId);
        });
    }

    /** Update a slot and merge with any overlapping windows on the same day and stage. */
    public function updateSlot(DoctorAvailability $availability, array $attributes): DoctorAvailability
    {
        return DB::transaction(function () use ($availability, $attributes) {
            $availability->loadMissing('user');
            $user = $availability->user;

            $dayOfWeek = (int) ($attributes['day_of_week'] ?? $availability->day_of_week);
            $start = $this->normalizeTime(
                $attributes['start_time'] ?? $availability->start_time
            );
            $end = $this->normalizeTime(
                $attributes['end_time'] ?? $availability->end_time
            );
            $stageId = (int) ($attributes['academic_stage_id'] ?? $availability->academic_stage_id);

            $this->assertEndAfterStart($start, $end);

            $availability->delete();

            return $this->persistMergedSlot($user, $dayOfWeek, $start, $end, $stageId);
        });
    }

    private function persistMergedSlot(
        User $user,
        int $dayOfWeek,
        string $start,
        string $end,
        int $academicStageId
    ): DoctorAvailability {
        $overlapping = $this->findOverlapping($user, $dayOfWeek, $start, $end, $academicStageId);

        $mergedStart = $start;
        $mergedEnd = $end;

        foreach ($overlapping as $slot) {
            $mergedStart = min($mergedStart, $this->normalizeTime($slot->start_time));
            $mergedEnd = max($mergedEnd, $this->normalizeTime($slot->end_time));
            $slot->delete();
        }

        return DoctorAvailability::create([
            'user_id' => $user->id,
            'university_id' => $user->university_id,
            'academic_stage_id' => $academicStageId,
            'day_of_week' => $dayOfWeek,
            'start_time' => $mergedStart,
            'end_time' => $mergedEnd,
        ]);
    }

    private function findOverlapping(
        User $user,
        int $dayOfWeek,
        string $start,
        string $end,
        int $academicStageId
    ) {
        return DoctorAvailability::withoutGlobalScopes()
            ->where('user_id', $user->id)
            ->where('university_id', $user->university_id)
            ->where('academic_stage_id', $academicStageId)
            ->where('day_of_week', $dayOfWeek)
            ->where(function ($query) use ($start, $end) {
                $query->where(function ($q) use ($start) {
                    $q->where('start_time', '<=', $start)
                        ->where('end_time', '>', $start);
                })->orWhere(function ($q) use ($end) {
                    $q->where('start_time', '<', $end)
                        ->where('end_time', '>=', $end);
                })->orWhere(function ($q) use ($start, $end) {
                    $q->where('start_time', '>=', $start)
                        ->where('end_time', '<=', $end);
                });
            })
            ->lockForUpdate()
            ->get();
    }

    /** @return array{0: string, 1: string} */
    private function parseWindow(string $startTime, string $endTime): array
    {
        $start = $this->normalizeTime($startTime);
        $end = $this->normalizeTime($endTime);
        $this->assertEndAfterStart($start, $end);

        return [$start, $end];
    }

    private function normalizeTime(string $time): string
    {
        return Carbon::parse($time)->format('H:i:s');
    }

    private function assertEndAfterStart(string $start, string $end): void
    {
        if ($start >= $end) {
            throw new InvalidArgumentException('The end time must be after start time.');
        }
    }
}

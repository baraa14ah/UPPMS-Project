<?php

namespace App\Support;

use Carbon\Carbon;

class SchedulingDateHelper
{
    private const DAY_NAMES = [
        0 => 'Sunday',
        1 => 'Monday',
        2 => 'Tuesday',
        3 => 'Wednesday',
        4 => 'Thursday',
        5 => 'Friday',
        6 => 'Saturday',
    ];

    private const DAY_NAMES_AR = [
        0 => 'الأحد',
        1 => 'الاثنين',
        2 => 'الثلاثاء',
        3 => 'الأربعاء',
        4 => 'الخميس',
        5 => 'الجمعة',
        6 => 'السبت',
    ];

    public static function dayNameToNumber(string $dayName): int
    {
        $days = array_flip(self::DAY_NAMES);

        return $days[$dayName] ?? 0;
    }

    /** @deprecated Use dateForDayInRange for defense periods with start/end. */
    public static function dateForDay(string|\Carbon\Carbon $periodStart, int $dayOfWeek): string
    {
        return Carbon::parse($periodStart)
            ->startOfWeek(Carbon::SUNDAY)
            ->addDays($dayOfWeek)
            ->toDateString();
    }

    /** First calendar date within [start, end] matching day-of-week (0=Sunday). */
    public static function dateForDayInRange(
        string|\Carbon\Carbon $periodStart,
        string|\Carbon\Carbon $periodEnd,
        int $dayOfWeek
    ): ?string {
        $current = Carbon::parse($periodStart)->startOfDay();
        $end = Carbon::parse($periodEnd)->startOfDay();

        while ($current->lte($end)) {
            if ((int) $current->dayOfWeek === $dayOfWeek) {
                return $current->toDateString();
            }
            $current->addDay();
        }

        return null;
    }

    public static function hasAllowedDayInRange(
        string|\Carbon\Carbon $periodStart,
        string|\Carbon\Carbon $periodEnd,
        array $allowedDays
    ): bool {
        $current = Carbon::parse($periodStart)->startOfDay();
        $end = Carbon::parse($periodEnd)->startOfDay();

        while ($current->lte($end)) {
            if (in_array((int) $current->dayOfWeek, $allowedDays, true)) {
                return true;
            }
            $current->addDay();
        }

        return false;
    }

    /**
     * Unique weekdays (0=Sun … 6=Sat) that occur in [start, end], calendar order.
     *
     * @return list<int>
     */
    public static function daysOfWeekInRange(
        string|\Carbon\Carbon $periodStart,
        string|\Carbon\Carbon $periodEnd
    ): array {
        $current = Carbon::parse($periodStart)->startOfDay();
        $end = Carbon::parse($periodEnd)->startOfDay();
        $days = [];

        while ($current->lte($end)) {
            $dow = (int) $current->dayOfWeek;
            if (!in_array($dow, $days, true)) {
                $days[] = $dow;
            }
            $current->addDay();
        }

        return $days;
    }

    public static function formatDateArabic(?string $date): ?string
    {
        if (!$date) {
            return null;
        }

        return Carbon::parse($date)->locale('ar')->translatedFormat('l j F Y');
    }

    public static function dayNameAr(int $dayOfWeek): string
    {
        return self::DAY_NAMES_AR[$dayOfWeek] ?? self::DAY_NAMES[$dayOfWeek] ?? '—';
    }

    /** University working week: Saturday through Tuesday (0=Sunday … 6=Saturday). */
    public static function defaultWorkingDays(): array
    {
        return [6, 0, 1, 2];
    }

    public static function isWorkingDay(int $dayOfWeek): bool
    {
        return in_array($dayOfWeek, self::defaultWorkingDays(), true);
    }
}

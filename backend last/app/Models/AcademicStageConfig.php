<?php

namespace App\Models;

use App\Models\Concerns\BelongsToUniversity;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AcademicStageConfig extends Model
{
    use HasFactory, BelongsToUniversity;

    public const STAGE_KEY_FINAL_DEFENSE = 'final_defense';

    public const STAGE_KEY_SEMINAR_1 = 'seminar_1';

    public const STAGE_KEY_SEMINAR_2 = 'seminar_2';

    public const STAGE_KEY_TECHNICAL_COMMITTEE = 'technical_committee';

    public const STAGE_KEY_SEMESTER_DEFENSE = 'semester_defense';

    public const STAGE_KEY_APPLICATIONS_DEFENSE = 'applications_defense';

    public const STAGE_KEY_GRADUATION_1 = 'graduation_1';

    public const STAGE_KEY_GRADUATION_2 = 'graduation_2';

    public const PRESET_SEMESTER_PROJECT = 'semester_project';

    public const PRESET_APPLICATIONS = 'applications';

    public const PRESET_GRADUATION_PROJECT = 'graduation_project';

    /** @var array<string, list<string>> */
    public const STAGE_KEY_PRESET_MAP = [
        self::STAGE_KEY_SEMINAR_1 => [self::PRESET_SEMESTER_PROJECT, self::PRESET_APPLICATIONS],
        self::STAGE_KEY_SEMINAR_2 => [self::PRESET_SEMESTER_PROJECT, self::PRESET_APPLICATIONS],
        self::STAGE_KEY_TECHNICAL_COMMITTEE => [self::PRESET_SEMESTER_PROJECT],
        self::STAGE_KEY_SEMESTER_DEFENSE => [self::PRESET_SEMESTER_PROJECT],
        self::STAGE_KEY_APPLICATIONS_DEFENSE => [self::PRESET_APPLICATIONS],
        self::STAGE_KEY_GRADUATION_1 => [self::PRESET_GRADUATION_PROJECT],
        self::STAGE_KEY_GRADUATION_2 => [self::PRESET_GRADUATION_PROJECT],
        self::STAGE_KEY_FINAL_DEFENSE => [self::PRESET_GRADUATION_PROJECT],
    ];

    public const AVAILABILITY_FLEXIBLE = 'flexible';

    public const AVAILABILITY_MANDATORY = 'mandatory';

    protected $table = 'academic_stages_config';

    protected $fillable = [
        'university_id',
        'stage_key',
        'applicable_presets',
        'name',
        'duration_minutes',
        'default_committee_size',
        'display_order',
        'defense_period_start',
        'defense_period_end',
        'allowed_defense_days',
        'day_start_time',
        'day_end_time',
        'availability_mode',
        'mandatory_slots',
        'is_system_stage',
        'availability_open',
        'availability_opened_at',
    ];

    protected $casts = [
        'duration_minutes' => 'integer',
        'default_committee_size' => 'integer',
        'display_order' => 'integer',
        'defense_period_start' => 'date',
        'defense_period_end' => 'date',
        'allowed_defense_days' => 'array',
        'applicable_presets' => 'array',
        'mandatory_slots' => 'array',
        'is_system_stage' => 'boolean',
        'availability_open' => 'boolean',
        'availability_opened_at' => 'datetime',
    ];

    public static function defaultDayStartTime(): string
    {
        return '08:00:00';
    }

    public static function defaultDayEndTime(): string
    {
        return '15:00:00';
    }

    /** Daily operating window for defenses (HH:MM:SS). */
    public function getDayStartTimeValue(): string
    {
        return $this->normalizeTimeValue(
            $this->day_start_time ? (string) $this->day_start_time : self::defaultDayStartTime()
        );
    }

    public function getDayEndTimeValue(): string
    {
        return $this->normalizeTimeValue(
            $this->day_end_time ? (string) $this->day_end_time : self::defaultDayEndTime()
        );
    }

    /** Suggested default when admin does not pick days explicitly. */
    public static function defaultAllowedDefenseDays(): array
    {
        return [6, 0, 1, 2];
    }

    /** Default mandatory windows for final defense (admin can edit per university). */
    public static function defaultMandatorySlots(): array
    {
        return [
            [
                'day_of_week' => 6,
                'start_time' => '09:00:00',
                'end_time' => '17:00:00',
            ],
        ];
    }

    public function isFinalDefense(): bool
    {
        return $this->stage_key === self::STAGE_KEY_FINAL_DEFENSE;
    }

    public function appliesToPreset(string $presetKey): bool
    {
        $presets = $this->applicable_presets;
        if (is_array($presets) && $presets !== []) {
            return in_array($presetKey, $presets, true);
        }

        if ($this->stage_key && isset(self::STAGE_KEY_PRESET_MAP[$this->stage_key])) {
            return in_array($presetKey, self::STAGE_KEY_PRESET_MAP[$this->stage_key], true);
        }

        return in_array($presetKey, self::inferApplicablePresets($this), true);
    }

    /** @return list<string> */
    public static function inferApplicablePresets(self $stage): array
    {
        if ($stage->stage_key && isset(self::STAGE_KEY_PRESET_MAP[$stage->stage_key])) {
            return self::STAGE_KEY_PRESET_MAP[$stage->stage_key];
        }

        $name = mb_strtolower((string) $stage->name);

        if (str_contains($name, 'تطبيق') || str_contains($name, 'application')) {
            return [self::PRESET_APPLICATIONS];
        }

        if (
            $stage->isFinalDefense()
            || str_contains($name, 'تخرج')
            || str_contains($name, 'graduation')
            || (str_contains($name, 'نهائي') && !str_contains($name, 'فصلي'))
        ) {
            return [self::PRESET_GRADUATION_PROJECT];
        }

        if (
            str_contains($name, 'فصلي')
            || str_contains($name, 'لجنة')
            || str_contains($name, 'سيمنار')
            || str_contains($name, 'seminar')
            || str_contains($name, 'technical')
        ) {
            return [self::PRESET_SEMESTER_PROJECT];
        }

        return [];
    }

    public function isSystemStage(): bool
    {
        return (bool) $this->is_system_stage;
    }

    public function usesMandatoryAvailability(): bool
    {
        return $this->availability_mode === self::AVAILABILITY_MANDATORY;
    }

    public function usesFlexibleAvailability(): bool
    {
        return !$this->usesMandatoryAvailability();
    }

    public function getAllowedDefenseDaysList(): array
    {
        $days = $this->allowed_defense_days;

        return !empty($days) ? $days : self::defaultAllowedDefenseDays();
    }

    /** @return array<int, array{day_of_week: int, start_time: string, end_time: string}> */
    public function getMandatorySlotsList(): array
    {
        $slots = $this->mandatory_slots;

        if (is_array($slots) && $slots !== []) {
            return array_values(array_map(function (array $slot) {
                return [
                    'day_of_week' => (int) $slot['day_of_week'],
                    'start_time' => $this->normalizeTimeValue($slot['start_time'] ?? '09:00:00'),
                    'end_time' => $this->normalizeTimeValue($slot['end_time'] ?? '17:00:00'),
                ];
            }, $slots));
        }

        return $this->buildDayWindowsFromHours();
    }

    /**
     * Operating windows for each allowed defense day using day_start/end times.
     *
     * @return array<int, array{day_of_week: int, start_time: string, end_time: string}>
     */
    public function buildDayWindowsFromHours(): array
    {
        $start = $this->getDayStartTimeValue();
        $end = $this->getDayEndTimeValue();

        return array_map(
            fn (int $day) => [
                'day_of_week' => $day,
                'start_time' => $start,
                'end_time' => $end,
            ],
            $this->getAllowedDefenseDaysList()
        );
    }

    public function hasMandatorySlotsConfigured(): bool
    {
        return $this->usesMandatoryAvailability() && $this->getMandatorySlotsList() !== [];
    }

    private function normalizeTimeValue(string $time): string
    {
        if (strlen($time) === 5) {
            return $time . ':00';
        }

        return $time;
    }
}

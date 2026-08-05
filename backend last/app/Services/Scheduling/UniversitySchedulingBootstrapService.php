<?php

namespace App\Services\Scheduling;

use App\Models\AcademicStageConfig;
use App\Models\University;

class UniversitySchedulingBootstrapService
{
    public const FINAL_DEFENSE_NAME = 'المناقشة النهائية';

    public function bootstrapUniversity(University $university): AcademicStageConfig
    {
        return $this->ensureFinalDefenseStage($university);
    }

    public function ensureFinalDefenseStage(University $university): AcademicStageConfig
    {
        $existing = AcademicStageConfig::where('university_id', $university->id)
            ->where('stage_key', AcademicStageConfig::STAGE_KEY_FINAL_DEFENSE)
            ->first();

        if ($existing) {
            return $existing;
        }

        $byName = AcademicStageConfig::where('university_id', $university->id)
            ->where('name', self::FINAL_DEFENSE_NAME)
            ->first();

        if ($byName) {
            $byName->update([
                'stage_key' => AcademicStageConfig::STAGE_KEY_FINAL_DEFENSE,
                'is_system_stage' => true,
                'availability_mode' => AcademicStageConfig::AVAILABILITY_MANDATORY,
                'mandatory_slots' => $byName->mandatory_slots ?? AcademicStageConfig::defaultMandatorySlots(),
            ]);

            return $byName->fresh();
        }

        return AcademicStageConfig::create([
            'university_id' => $university->id,
            'stage_key' => AcademicStageConfig::STAGE_KEY_FINAL_DEFENSE,
            'name' => self::FINAL_DEFENSE_NAME,
            'duration_minutes' => 90,
            'default_committee_size' => 4,
            'display_order' => 999,
            'availability_mode' => AcademicStageConfig::AVAILABILITY_MANDATORY,
            'is_system_stage' => true,
            'allowed_defense_days' => AcademicStageConfig::defaultAllowedDefenseDays(),
            'mandatory_slots' => AcademicStageConfig::defaultMandatorySlots(),
            'availability_open' => false,
        ]);
    }

    /** Apply one defense week to every defense type (shared calendar). */
    public function syncSharedDefenseCalendar(
        University $university,
        string $periodStart,
        string $periodEnd,
        ?array $allowedDays = null,
    ): int {
        $days = $allowedDays ?? AcademicStageConfig::defaultAllowedDefenseDays();

        return AcademicStageConfig::where('university_id', $university->id)
            ->update([
                'defense_period_start' => $periodStart,
                'defense_period_end' => $periodEnd,
                'allowed_defense_days' => $days,
            ]);
    }
}

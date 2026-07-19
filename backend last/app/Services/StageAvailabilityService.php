<?php

namespace App\Services;

use App\Models\AcademicStageConfig;
use App\Models\User;
use App\Support\SchedulingDateHelper;
use App\Support\SchedulingUniversityScope;

class StageAvailabilityService
{
    public function __construct(
        protected NotificationService $notifications
    ) {}

    public function openCollection(AcademicStageConfig $stage, User $admin): AcademicStageConfig
    {
        if ($stage->usesMandatoryAvailability()) {
            throw new \InvalidArgumentException(
                'مرحلة المناقشة النهائية تستخدم مواعيد إلزامية يحددها مدير الجامعة — لا حاجة لتسجيل المشرفين.'
            );
        }

        if (!$stage->defense_period_start || !$stage->defense_period_end) {
            throw new \InvalidArgumentException('يجب تحديد فترة المناقشة قبل فتح تسجيل المواعيد.');
        }

        $days = $stage->getAllowedDefenseDaysList();
        if (empty($days)) {
            throw new \InvalidArgumentException('يجب تحديد أيام المناقشة قبل فتح التسجيل.');
        }

        if (!SchedulingDateHelper::hasAllowedDayInRange(
            $stage->defense_period_start->format('Y-m-d'),
            $stage->defense_period_end->format('Y-m-d'),
            $days
        )) {
            throw new \InvalidArgumentException('فترة التواريخ لا تتطابق مع أيام المناقشة المحددة.');
        }

        SchedulingUniversityScope::apply(AcademicStageConfig::query())
            ->where('id', '!=', $stage->id)
            ->where('availability_open', true)
            ->update(['availability_open' => false]);

        $stage->update([
            'availability_open' => true,
            'availability_opened_at' => now(),
        ]);

        $this->notifySupervisors($stage, $admin);

        return $stage->fresh();
    }

    public function closeCollection(AcademicStageConfig $stage): void
    {
        $stage->update(['availability_open' => false]);
    }

    /** @return array{stage: AcademicStageConfig|null, supervisors_total: int, supervisors_submitted: int, supervisors_pending: int} */
    public function submissionStats(AcademicStageConfig $stage): array
    {
        $supervisorQuery = User::where('university_id', $stage->university_id)
            ->whereHas('role', fn ($q) => $q->where('name', 'supervisor'));

        $total = (clone $supervisorQuery)->count();

        $submitted = (clone $supervisorQuery)
            ->whereHas('availabilities', fn ($q) => $q->where('academic_stage_id', $stage->id))
            ->count();

        return [
            'stage' => $stage,
            'supervisors_total' => $total,
            'supervisors_submitted' => $submitted,
            'supervisors_pending' => max(0, $total - $submitted),
        ];
    }

    public function findOpenStageForUniversity(int $universityId): ?AcademicStageConfig
    {
        return SchedulingUniversityScope::apply(AcademicStageConfig::query())
            ->where('availability_open', true)
            ->where('availability_mode', AcademicStageConfig::AVAILABILITY_FLEXIBLE)
            ->orderByDesc('availability_opened_at')
            ->first();
    }

    public function assertDayAllowedForStage(AcademicStageConfig $stage, int $dayOfWeek): void
    {
        if (!in_array($dayOfWeek, $stage->getAllowedDefenseDaysList(), true)) {
            throw new \InvalidArgumentException('اليوم المختار ليس ضمن أيام المناقشة المحددة من مدير الجامعة.');
        }
    }

    protected function notifySupervisors(AcademicStageConfig $stage, User $admin): void
    {
        $daysAr = array_map(
            fn ($d) => SchedulingDateHelper::dayNameAr($d),
            $stage->getAllowedDefenseDaysList()
        );

        $period = $stage->defense_period_start->format('Y-m-d') . ' → ' . $stage->defense_period_end->format('Y-m-d');
        $daysText = implode('، ', $daysAr);

        $supervisors = User::where('university_id', $stage->university_id)
            ->whereHas('role', fn ($q) => $q->where('name', 'supervisor'))
            ->get();

        foreach ($supervisors as $supervisor) {
            $this->notifications->notifyUser(
                $supervisor,
                'availability_collection_open',
                'سجّل مواعيد فراغك للمناقشات',
                "فُتح تسجيل المواعيد لمرحلة «{$stage->name}» ({$period}). الأيام: {$daysText}. لن تُعتبر متاحاً إلا للأوقات التي تسجّلها في ملفك الشخصي.",
                [
                    'url' => '/dashboard/profile',
                    'academic_stage_id' => $stage->id,
                ]
            );
        }
    }
}

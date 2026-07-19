<?php

namespace App\Http\Controllers;

use App\Models\AcademicStageConfig;
use App\Services\StageAvailabilityService;
use App\Services\UniversitySchedulingBootstrapService;
use App\Support\SchedulingDateHelper;
use App\Support\SchedulingUniversityScope;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

class AcademicStageController extends Controller
{
    public function __construct(
        protected StageAvailabilityService $stageAvailabilityService,
        protected UniversitySchedulingBootstrapService $bootstrapService,
    ) {}

    public function index()
    {
        $stages = SchedulingUniversityScope::apply(AcademicStageConfig::query())
            ->orderBy('display_order')
            ->get();

        return response()->json([
            'message' => 'Academic stages retrieved successfully',
            'data' => $stages,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $this->validateStagePayload($request);

        $user = Auth::user();

        $existingStage = SchedulingUniversityScope::apply(AcademicStageConfig::query())
            ->where('name', $validated['name'])
            ->first();
        if ($existingStage) {
            return response()->json([
                'message' => 'A stage with this name already exists',
                'errors' => ['name' => ['The name has already been taken.']],
            ], 422);
        }

        $stage = AcademicStageConfig::create([
            'university_id' => $user->university_id,
            'name' => $validated['name'],
            'stage_key' => $validated['stage_key'] ?? null,
            'applicable_presets' => $validated['applicable_presets'] ?? null,
            'duration_minutes' => $validated['duration_minutes'],
            'default_committee_size' => $validated['default_committee_size'],
            'display_order' => $validated['display_order'] ?? 0,
            'defense_period_start' => $validated['defense_period_start'] ?? null,
            'defense_period_end' => $validated['defense_period_end'] ?? null,
            'allowed_defense_days' => $validated['allowed_defense_days']
                ?? AcademicStageConfig::defaultAllowedDefenseDays(),
            'day_start_time' => $validated['day_start_time']
                ?? AcademicStageConfig::defaultDayStartTime(),
            'day_end_time' => $validated['day_end_time']
                ?? AcademicStageConfig::defaultDayEndTime(),
            'mandatory_slots' => $validated['mandatory_slots'] ?? null,
            'availability_mode' => AcademicStageConfig::AVAILABILITY_FLEXIBLE,
        ]);

        return response()->json([
            'message' => 'Academic stage created successfully',
            'data' => $stage,
        ], 201);
    }

    public function show(int $id)
    {
        $stage = SchedulingUniversityScope::apply(AcademicStageConfig::query())
            ->where('id', $id)
            ->firstOrFail();

        return response()->json([
            'message' => 'Academic stage retrieved successfully',
            'data' => $stage,
        ]);
    }

    public function update(Request $request, int $id)
    {
        $stage = SchedulingUniversityScope::apply(AcademicStageConfig::query())
            ->where('id', $id)
            ->firstOrFail();

        $validated = $this->validateStagePayload($request, true);

        if ($stage->isSystemStage()) {
            unset($validated['name'], $validated['stage_key'], $validated['availability_mode'], $validated['is_system_stage']);
        }

        if (isset($validated['name']) && $validated['name'] !== $stage->name) {
            $existing = SchedulingUniversityScope::apply(AcademicStageConfig::query())
                ->where('name', $validated['name'])
                ->where('id', '!=', $id)
                ->first();
            if ($existing) {
                return response()->json([
                    'message' => 'A stage with this name already exists',
                    'errors' => ['name' => ['The name has already been taken.']],
                ], 422);
            }
        }

        $stage->update($validated);

        return response()->json([
            'message' => 'Academic stage updated successfully',
            'data' => $stage->fresh(),
        ]);
    }

    public function destroy(int $id)
    {
        $stage = SchedulingUniversityScope::apply(AcademicStageConfig::query())
            ->where('id', $id)
            ->firstOrFail();

        if ($stage->isSystemStage()) {
            return response()->json([
                'message' => 'لا يمكن حذف مرحلة النظام الأساسية (المناقشة النهائية).',
            ], 422);
        }

        $stage->delete();

        return response()->json([
            'message' => 'Academic stage deleted successfully',
        ]);
    }

    /** Open supervisor availability collection for a stage (after period + days are set). */
    public function openAvailability(int $id)
    {
        $stage = SchedulingUniversityScope::apply(AcademicStageConfig::query())
            ->where('id', $id)
            ->firstOrFail();

        try {
            $stage = $this->stageAvailabilityService->openCollection($stage, Auth::user());
            $stats = $this->stageAvailabilityService->submissionStats($stage);

            return response()->json([
                'message' => 'تم فتح تسجيل مواعيد المشرفين',
                'data' => $stage,
                'supervisors_total' => $stats['supervisors_total'],
                'supervisors_submitted' => $stats['supervisors_submitted'],
            ]);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    /** Apply the same defense week to every defense type (shared calendar for all project paths). */
    public function syncDefenseCalendar(Request $request)
    {
        $validated = $request->validate([
            'defense_period_start' => 'required|date',
            'defense_period_end' => 'required|date|after_or_equal:defense_period_start',
            'allowed_defense_days' => 'nullable|array|min:1',
            'allowed_defense_days.*' => 'integer|between:0,6',
        ]);

        $days = $validated['allowed_defense_days'] ?? AcademicStageConfig::defaultAllowedDefenseDays();

        if (!SchedulingDateHelper::hasAllowedDayInRange(
            $validated['defense_period_start'],
            $validated['defense_period_end'],
            $days,
        )) {
            throw ValidationException::withMessages([
                'allowed_defense_days' => ['يجب أن يتضمن نطاق التواريخ يوماً واحداً على الأقل من الأيام المحددة.'],
            ]);
        }

        $user = Auth::user();
        $updated = $this->bootstrapService->syncSharedDefenseCalendar(
            $user->university,
            $validated['defense_period_start'],
            $validated['defense_period_end'],
            array_values(array_unique($days)),
        );

        $stages = SchedulingUniversityScope::apply(AcademicStageConfig::query())
            ->orderBy('display_order')
            ->get();

        return response()->json([
            'message' => 'تم تطبيق أسبوع المناقشات على كل أنواع المناقشات',
            'updated_count' => $updated,
            'data' => $stages,
        ]);
    }

    private function validateStagePayload(Request $request, bool $partial = false): array
    {
        $today = now()->toDateString();
        $rules = [
            'name' => ($partial ? 'sometimes|' : '') . 'required|string|max:255',
            'stage_key' => 'nullable|string|max:64',
            'applicable_presets' => 'nullable|array|min:1',
            'applicable_presets.*' => 'in:semester_project,applications,graduation_project',
            'duration_minutes' => ($partial ? 'sometimes|' : '') . 'required|integer|min:15|max:240',
            'default_committee_size' => ($partial ? 'sometimes|' : '') . 'required|integer|min:2|max:10',
            'display_order' => 'sometimes|integer|min:0',
            'defense_period_start' => "nullable|date|after_or_equal:{$today}",
            'defense_period_end' => 'nullable|date|after_or_equal:defense_period_start',
            'allowed_defense_days' => 'nullable|array|min:1',
            'allowed_defense_days.*' => 'integer|between:0,6',
            'day_start_time' => ['nullable', 'regex:/^\d{2}:\d{2}(:\d{2})?$/'],
            'day_end_time' => ['nullable', 'regex:/^\d{2}:\d{2}(:\d{2})?$/'],
            'mandatory_slots' => 'nullable|array',
            'mandatory_slots.*.day_of_week' => 'required_with:mandatory_slots|integer|between:0,6',
            'mandatory_slots.*.start_time' => ['required_with:mandatory_slots', 'regex:/^\d{2}:\d{2}(:\d{2})?$/'],
            'mandatory_slots.*.end_time' => ['required_with:mandatory_slots', 'regex:/^\d{2}:\d{2}(:\d{2})?$/'],
        ];

        $validated = $request->validate($rules, [
            'defense_period_start.after_or_equal' => 'تاريخ بداية الفترة لا يمكن أن يكون قبل اليوم.',
            'defense_period_end.after_or_equal' => 'تاريخ نهاية الفترة يجب أن يكون في يوم البداية أو بعده.',
            'day_end_time' => 'وقت نهاية اليوم غير صالح.',
            'day_start_time' => 'وقت بداية اليوم غير صالح.',
        ]);

        $start = $this->nullIfBlank($validated['defense_period_start'] ?? null);
        $end = $this->nullIfBlank($validated['defense_period_end'] ?? null);
        $validated['defense_period_start'] = $start;
        $validated['defense_period_end'] = $end;

        if (($start && !$end) || (!$start && $end)) {
            throw ValidationException::withMessages([
                'defense_period_end' => ['يجب تحديد تاريخ بداية ونهاية فترة المناقشات معاً.'],
            ]);
        }

        // Derive weekdays from the calendar range so 13–14 Jul → Mon + Tue automatically.
        if ($start && $end) {
            $derivedDays = SchedulingDateHelper::daysOfWeekInRange($start, $end);
            if ($derivedDays === []) {
                throw ValidationException::withMessages([
                    'defense_period_end' => ['نطاق التواريخ غير صالح.'],
                ]);
            }
            $validated['allowed_defense_days'] = $derivedDays;
        }

        $days = $validated['allowed_defense_days'] ?? AcademicStageConfig::defaultAllowedDefenseDays();

        $normalizeClock = static function (?string $value, string $fallback): string {
            if ($value === null || $value === '') {
                return $fallback;
            }
            $value = substr($value, 0, 5);
            return strlen($value) === 5 ? $value . ':00' : $fallback;
        };

        if (array_key_exists('day_start_time', $validated) || array_key_exists('day_end_time', $validated)) {
            $dayStart = $normalizeClock(
                $validated['day_start_time'] ?? null,
                AcademicStageConfig::defaultDayStartTime()
            );
            $dayEnd = $normalizeClock(
                $validated['day_end_time'] ?? null,
                AcademicStageConfig::defaultDayEndTime()
            );

            if (substr($dayStart, 0, 5) >= substr($dayEnd, 0, 5)) {
                throw ValidationException::withMessages([
                    'day_end_time' => ['وقت نهاية اليوم يجب أن يكون بعد وقت البداية (مثال: 08:00 → 15:00).'],
                ]);
            }

            $validated['day_start_time'] = $dayStart;
            $validated['day_end_time'] = $dayEnd;
        }

        if (isset($validated['allowed_defense_days'])) {
            $validated['allowed_defense_days'] = array_values(array_unique($validated['allowed_defense_days']));
        }

        // Keep mandatory slots aligned with derived days + daily hours when provided.
        if ($start && $end) {
            $dayStart = isset($validated['day_start_time'])
                ? substr((string) $validated['day_start_time'], 0, 5)
                : null;
            $dayEnd = isset($validated['day_end_time'])
                ? substr((string) $validated['day_end_time'], 0, 5)
                : null;

            if ($dayStart && $dayEnd) {
                $validated['mandatory_slots'] = array_map(
                    fn (int $day) => [
                        'day_of_week' => $day,
                        'start_time' => $dayStart,
                        'end_time' => $dayEnd,
                    ],
                    $validated['allowed_defense_days']
                );
            } elseif (isset($validated['mandatory_slots'])) {
                $validated['mandatory_slots'] = $this->normalizeMandatorySlots(
                    $validated['mandatory_slots'],
                    $days
                );
            } else {
                unset($validated['mandatory_slots']);
            }
        } elseif (isset($validated['mandatory_slots'])) {
            $validated['mandatory_slots'] = $this->normalizeMandatorySlots(
                $validated['mandatory_slots'],
                $days
            );
        }

        return $validated;
    }

    private function nullIfBlank(mixed $value): mixed
    {
        if ($value === null) {
            return null;
        }
        if (is_string($value) && trim($value) === '') {
            return null;
        }

        return $value;
    }

    /** @param array<int, array<string, mixed>> $slots */
    private function normalizeMandatorySlots(array $slots, array $allowedDays): array
    {
        $normalized = [];

        foreach ($slots as $slot) {
            $day = (int) $slot['day_of_week'];
            if (!in_array($day, $allowedDays, true)) {
                throw ValidationException::withMessages([
                    'mandatory_slots' => ['يجب أن تكون المواعيد الإلزامية ضمن أيام المناقشة المحددة.'],
                ]);
            }

            $start = $slot['start_time'];
            $end = $slot['end_time'];
            if ($start >= $end) {
                throw ValidationException::withMessages([
                    'mandatory_slots' => ['وقت نهاية الموعد الإلزامي يجب أن يكون بعد وقت البداية.'],
                ]);
            }

            $normalized[] = [
                'day_of_week' => $day,
                'start_time' => strlen($start) >= 5 ? substr($start, 0, 5) . ':00' : $start,
                'end_time' => strlen($end) >= 5 ? substr($end, 0, 5) . ':00' : $end,
            ];
        }

        return $normalized;
    }
}

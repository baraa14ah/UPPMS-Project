<?php

namespace App\Http\Controllers;

use App\Models\DoctorAvailability;
use App\Services\DoctorAvailabilityService;
use App\Services\StageAvailabilityService;
use App\Support\SchedulingDateHelper;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class DoctorAvailabilityController extends Controller
{
    public function __construct(
        private readonly DoctorAvailabilityService $availabilityService,
        private readonly StageAvailabilityService $stageAvailabilityService
    ) {}

    /** Context for supervisors: open availability collection window (if any). */
    public function availabilityContext()
    {
        $user = Auth::user();
        $stage = $this->stageAvailabilityService->findOpenStageForUniversity($user->university_id);

        if (!$stage) {
            return response()->json([
                'is_open' => false,
                'message' => 'لم يفتح مدير الجامعة تسجيل المواعيد بعد.',
            ]);
        }

        $mySlots = DoctorAvailability::where('user_id', $user->id)
            ->where('academic_stage_id', $stage->id)
            ->orderBy('day_of_week')
            ->orderBy('start_time')
            ->get();

        return response()->json([
            'is_open' => true,
            'stage' => [
                'id' => $stage->id,
                'name' => $stage->name,
                'defense_period_start' => $stage->defense_period_start?->format('Y-m-d'),
                'defense_period_end' => $stage->defense_period_end?->format('Y-m-d'),
                'allowed_defense_days' => $stage->getAllowedDefenseDaysList(),
                'allowed_defense_days_labels' => array_map(
                    fn ($d) => SchedulingDateHelper::dayNameAr($d),
                    $stage->getAllowedDefenseDaysList()
                ),
            ],
            'my_slots' => $mySlots,
            'has_submitted' => $mySlots->isNotEmpty(),
        ]);
    }

    public function index(Request $request)
    {
        $user = Auth::user();
        $query = DoctorAvailability::where('user_id', $user->id)
            ->where('university_id', $user->university_id);

        if ($request->filled('academic_stage_id')) {
            $query->where('academic_stage_id', (int) $request->input('academic_stage_id'));
        } else {
            $openStage = $this->stageAvailabilityService->findOpenStageForUniversity($user->university_id);
            if ($openStage) {
                $query->where('academic_stage_id', $openStage->id);
            }
        }

        $availabilities = $query->orderBy('day_of_week')->orderBy('start_time')->get();

        return response()->json([
            'message' => 'Availabilities retrieved successfully',
            'data' => $availabilities,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'day_of_week' => 'required|integer|min:0|max:6',
            'start_time' => 'required|date_format:H:i',
            'end_time' => 'required|date_format:H:i|after:start_time',
        ]);

        $user = Auth::user();
        $stage = $this->stageAvailabilityService->findOpenStageForUniversity($user->university_id);

        if (!$stage) {
            return response()->json([
                'message' => 'تسجيل المواعيد مغلق حالياً. انتظر حتى يفتح مدير الجامعة التسجيل للمرحلة.',
            ], 422);
        }

        try {
            $this->stageAvailabilityService->assertDayAllowedForStage(
                $stage,
                (int) $validated['day_of_week']
            );
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'message' => 'The given data was invalid.',
                'errors' => ['day_of_week' => [$e->getMessage()]],
            ], 422);
        }

        try {
            $availability = $this->availabilityService->createSlot(
                $user,
                (int) $validated['day_of_week'],
                $validated['start_time'],
                $validated['end_time'],
                $stage->id
            );
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'message' => 'The given data was invalid.',
                'errors' => ['end_time' => [$e->getMessage()]],
            ], 422);
        }

        return response()->json([
            'message' => 'Availability created successfully',
            'data' => $availability,
        ], 201);
    }

    public function show($id)
    {
        $user = Auth::user();
        $availability = DoctorAvailability::where('user_id', $user->id)
            ->where('university_id', $user->university_id)
            ->where('id', $id)
            ->firstOrFail();

        return response()->json([
            'message' => 'Availability retrieved successfully',
            'data' => $availability,
        ]);
    }

    public function update(Request $request, $id)
    {
        $user = Auth::user();
        $availability = DoctorAvailability::where('user_id', $user->id)
            ->where('university_id', $user->university_id)
            ->where('id', $id)
            ->firstOrFail();

        $validated = $request->validate([
            'day_of_week' => 'sometimes|integer|min:0|max:6',
            'start_time' => 'sometimes|date_format:H:i',
            'end_time' => 'sometimes|date_format:H:i',
        ]);

        $stage = $this->stageAvailabilityService->findOpenStageForUniversity($user->university_id);
        if (!$stage || $availability->academic_stage_id !== $stage->id) {
            return response()->json([
                'message' => 'لا يمكن تعديل المواعيد إلا أثناء فترة التسجيل المفتوحة للمرحلة الحالية.',
            ], 422);
        }

        if (isset($validated['day_of_week'])) {
            try {
                $this->stageAvailabilityService->assertDayAllowedForStage(
                    $stage,
                    (int) $validated['day_of_week']
                );
            } catch (\InvalidArgumentException $e) {
                return response()->json([
                    'message' => 'The given data was invalid.',
                    'errors' => ['day_of_week' => [$e->getMessage()]],
                ], 422);
            }
        }

        if (isset($validated['start_time']) || isset($validated['end_time'])) {
            $startTime = $validated['start_time'] ?? $availability->start_time;
            $endTime = $validated['end_time'] ?? $availability->end_time;

            if ($startTime >= $endTime) {
                return response()->json([
                    'message' => 'The given data was invalid.',
                    'errors' => ['end_time' => ['The end time must be after start time.']],
                ], 422);
            }
        }

        try {
            $validated['academic_stage_id'] = $stage->id;
            $updated = $this->availabilityService->updateSlot($availability, $validated);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'message' => 'The given data was invalid.',
                'errors' => ['end_time' => [$e->getMessage()]],
            ], 422);
        }

        return response()->json([
            'message' => 'Availability updated successfully',
            'data' => $updated,
        ]);
    }

    public function destroy($id)
    {
        $user = Auth::user();
        $availability = DoctorAvailability::where('user_id', $user->id)
            ->where('university_id', $user->university_id)
            ->where('id', $id)
            ->firstOrFail();

        $stage = $this->stageAvailabilityService->findOpenStageForUniversity($user->university_id);
        if (!$stage || $availability->academic_stage_id !== $stage->id) {
            return response()->json([
                'message' => 'لا يمكن حذف المواعيد إلا أثناء فترة التسجيل المفتوحة.',
            ], 422);
        }

        $availability->delete();

        return response()->json([
            'message' => 'Availability deleted successfully',
        ]);
    }
}

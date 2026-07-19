<?php

namespace App\Http\Controllers;

use App\Exceptions\InsufficientFacultyException;
use App\Exceptions\InvalidStageException;
use App\Exceptions\SchedulingInProgressException;
use App\Models\AcademicStageConfig;
use App\Models\ApprovedSchedule;
use App\Models\Committee;
use App\Models\DefenseSession;
use App\Models\Project;
use App\Models\User;
use App\Scheduling\AlgorithmConfig;
use App\Services\CommitteeService;
use App\Services\GeneticSchedulerService;
use App\Services\ScheduleApprovalService;
use App\Services\StageAvailabilityService;
use App\Services\TrackService;
use App\Support\SchedulingDateHelper;
use App\Support\SchedulingUniversityScope;
use App\Support\TrackStageHierarchy;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ScheduleController extends Controller
{
    public function __construct(
        protected GeneticSchedulerService $scheduler,
        protected ScheduleApprovalService $approvalService,
        protected StageAvailabilityService $stageAvailabilityService,
        protected TrackService $trackService,
        protected CommitteeService $committeeService,
    ) {}

    /** POST /api/schedules/generate */
    public function generate(Request $request): JsonResponse
    {
        $request->validate([
            'academic_stage_id' => 'required|integer|exists:academic_stages_config,id',
            'use_committees' => 'nullable|boolean',
            'config.population_size' => 'nullable|integer|min:10|max:500',
            'config.max_generations' => 'nullable|integer|min:5|max:200',
            'config.mutation_rate' => 'nullable|numeric|min:0.01|max:0.5',
        ]);

        $user = $request->user();
        $stageId = (int) $request->input('academic_stage_id');
        $useCommittees = $request->boolean('use_committees');

        $stage = SchedulingUniversityScope::apply(AcademicStageConfig::query())
            ->where('id', $stageId)
            ->first();

        if (!$stage) {
            return response()->json(['message' => 'Invalid academic stage'], 400);
        }

        if ($periodError = $this->stagePeriodError($stage)) {
            return $periodError;
        }

        if ($useCommittees) {
            if ($this->committeeService->getActiveCommittees($user->university_id)->isEmpty()) {
                return response()->json([
                    'message' => 'لا توجد لجان نشطة بأعضاء كافيين للجدولة.',
                ], 422);
            }
        } elseif ($stage->usesMandatoryAvailability()) {
            if (!$stage->hasMandatorySlotsConfigured()) {
                return response()->json([
                    'message' => 'يجب تحديد المواعيد الإلزامية للمشرفين في إعدادات المناقشة النهائية.',
                ], 422);
            }
        } elseif ($this->countFacultyWithStageAvailability($user->university_id, $stageId) === 0) {
            return response()->json([
                'message' => 'لم يسجّل أي مشرف أوقات فراغه لهذه المرحلة. افتح تسجيل المواعيد وانتظر المشرفين أولاً.',
            ], 422);
        }

        try {
            $config = new AlgorithmConfig(
                populationSize: (int) $request->input('config.population_size', 100),
                maxGenerations: (int) $request->input('config.max_generations', 50),
                mutationRate: (float) $request->input('config.mutation_rate', 0.10),
                useCommittees: (bool) $request->input('use_committees', false),
            );

            if ($config->useCommittees) {
                $activeCommitteeCount = Committee::query()
                    ->where('university_id', $user->university_id)
                    ->where('is_active', true)
                    ->has('members', '>=', 2)
                    ->count();

                if ($activeCommitteeCount === 0) {
                    return response()->json([
                        'message' => 'No active committees with at least 2 members are available for scheduling.',
                    ], 422);
                }
            }

            $result = $this->scheduler->generate($user->university_id, $stageId, $config);

            if ($result->metadata->projectCount === 0) {
                return response()->json(['message' => 'No projects available for scheduling'], 422);
            }

            if ($config->useCommittees && empty($result->candidates)) {
                return response()->json([
                    'message' => 'تعذّر إنشاء جدول باللجان. تأكد أن المشرفين ليسوا أعضاء في لجان مشاريعهم وأن هناك قاعات كافية.',
                ], 422);
            }

            $payload = $result->toArray();
            $payload = $this->enrichCandidatesWithDates($payload, $stage);
            $payload['stage'] = [
                'id' => $stage->id,
                'name' => $stage->name,
                'defense_period_start' => $stage->defense_period_start?->format('Y-m-d'),
                'defense_period_end' => $stage->defense_period_end?->format('Y-m-d'),
                'allowed_defense_days' => $stage->getAllowedDefenseDaysList(),
            ];

            return response()->json($payload);
        } catch (SchedulingInProgressException $e) {
            return response()->json(['message' => 'Scheduling already in progress for this stage'], 409);
        } catch (InsufficientFacultyException $e) {
            return response()->json(['message' => 'No faculty with recorded availability'], 422);
        } catch (InvalidStageException $e) {
            return response()->json(['message' => 'Invalid academic stage'], 400);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Schedule generation failed',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /** GET /api/schedules/status/{stageId} */
    public function status(Request $request, int $stageId): JsonResponse
    {
        $user = $request->user();

        $isRunning = $this->scheduler->isRunning($user->university_id, $stageId);

        $activeSchedule = ApprovedSchedule::withoutGlobalScopes()
            ->where('university_id', $user->university_id)
            ->where('academic_stage_id', $stageId)
            ->where('status', 'active')
            ->first();

        return response()->json([
            'is_running' => $isRunning,
            'stage_id' => $stageId,
            'has_active_schedule' => $activeSchedule !== null,
            'active_schedule_id' => $activeSchedule?->id,
        ]);
    }

    /** POST /api/schedules/approve */
    public function approve(Request $request): JsonResponse
    {
        $request->validate([
            'academic_stage_id' => 'required|integer|exists:academic_stages_config,id',
            'rank' => 'required|integer|in:1,2,3',
            'candidates' => 'required|array|min:1',
        ]);

        $user = $request->user();
        $rank = (int) $request->input('rank');
        $candidates = $request->input('candidates');

        $candidate = collect($candidates)->firstWhere('rank', $rank);

        if (!$candidate) {
            return response()->json(['message' => 'Invalid candidate rank'], 400);
        }

        $stage = SchedulingUniversityScope::apply(AcademicStageConfig::query())
            ->where('id', $request->input('academic_stage_id'))
            ->first();

        if ($periodError = $this->stagePeriodError($stage)) {
            return $periodError;
        }

        try {
            $result = $this->approvalService->approve(
                $user->university_id,
                (int) $request->input('academic_stage_id'),
                $user->id,
                $candidate
            );

            $this->stageAvailabilityService->closeCollection($stage);

            $schedule = $result['approved_schedule'];

            return response()->json([
                'message' => 'Schedule approved successfully',
                'approved_schedule' => [
                    'id' => $schedule->id,
                    'academic_stage_id' => $schedule->academic_stage_id,
                    'approved_by' => $schedule->approved_by,
                    'approved_at' => $schedule->approved_at,
                    'status' => $schedule->status,
                    'metadata' => $schedule->metadata,
                ],
                'defense_sessions_created' => $result['defense_sessions_created'],
                'committee_assignments_created' => $result['committee_assignments_created'],
                'notifications_sent' => $result['notifications_sent'],
            ], 201);
        } catch (\Exception $e) {
            $status = str_contains($e->getMessage(), 'already exists') ? 409 : 500;

            return response()->json(['message' => $e->getMessage()], $status);
        }
    }

    /** POST /api/schedules/{id}/void */
    public function void(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        $schedule = ApprovedSchedule::withoutGlobalScopes()
            ->where('id', $id)
            ->where('university_id', $user->university_id)
            ->first();

        if (!$schedule) {
            return response()->json(['message' => 'Schedule not found'], 404);
        }

        try {
            $result = $this->approvalService->void($id, $user->id);

            return response()->json([
                'message' => 'Schedule voided successfully',
                'schedule_id' => $result['schedule_id'],
                'defense_sessions_cancelled' => $result['defense_sessions_cancelled'],
            ]);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 409);
        }
    }

    /** GET /api/schedules/history */
    public function history(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = ApprovedSchedule::withoutGlobalScopes()
            ->where('university_id', $user->university_id)
            ->with(['academicStage', 'approvedByUser'])
            ->withCount('defenseSessions')
            ->orderByDesc('approved_at');

        if ($request->filled('stage_id')) {
            $query->where('academic_stage_id', $request->input('stage_id'));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        $perPage = (int) $request->input('per_page', 15);
        $schedules = $query->paginate($perPage);

        return response()->json([
            'data' => $schedules->map(fn ($s) => [
                'id' => $s->id,
                'academic_stage' => [
                    'id' => $s->academicStage->id,
                    'name' => $s->academicStage->name,
                ],
                'approved_by' => [
                    'id' => $s->approvedByUser->id,
                    'name' => $s->approvedByUser->name,
                ],
                'approved_at' => $s->approved_at,
                'status' => $s->status,
                'metadata' => $s->metadata,
                'defense_sessions_count' => $s->defense_sessions_count,
            ]),
            'meta' => [
                'current_page' => $schedules->currentPage(),
                'last_page' => $schedules->lastPage(),
                'per_page' => $schedules->perPage(),
                'total' => $schedules->total(),
            ],
        ]);
    }

    /** GET /api/schedules/my-sessions */
    public function mySessions(Request $request): JsonResponse
    {
        $user = $request->user();
        $user->loadMissing('role');
        $isAdmin = $user->role?->name === 'admin';

        $query = DefenseSession::query()
            ->with(['project.supervisor', 'committee.members:id,name,email', 'committeeMembers', 'room', 'approvedSchedule.academicStage'])
            ->whereHas('approvedSchedule', function ($q) use ($user) {
                $q->withoutGlobalScopes()
                    ->where('university_id', $user->university_id)
                    ->where('status', 'active');
            });

        if (!$isAdmin) {
            $userId = $user->id;
            $query->where(function ($q) use ($userId) {
                $q->forUser($userId)
                    ->orWhereHas('committee.members', fn ($members) => $members->where('users.id', $userId));
            });
        }

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        } elseif ($request->boolean('upcoming_only', true)) {
            $query->where('status', 'scheduled');
        }

        $sessions = $query->orderBy('scheduled_date')
            ->orderBy('scheduled_day_of_week')
            ->orderBy('scheduled_start_time')
            ->get()
            ->load(['project.user', 'project.proposal']);

        return response()->json([
            'view_mode' => $isAdmin ? 'university_admin' : 'committee_member',
            'sessions' => $sessions->map(fn ($s) => $this->formatSession($s, $user, $isAdmin)),
            'total_count' => $sessions->count(),
        ]);
    }

    /** GET /api/schedules/readiness — prerequisites summary for admin dashboard */
    public function readiness(Request $request): JsonResponse
    {
        $user = $request->user();
        $universityId = $user->university_id;
        $stageId = $request->filled('stage_id') ? (int) $request->input('stage_id') : null;
        $useCommittees = $request->boolean('use_committees');

        $stagesCount = SchedulingUniversityScope::apply(AcademicStageConfig::query())->count();

        $stage = $stageId
            ? SchedulingUniversityScope::apply(AcademicStageConfig::query())->where('id', $stageId)->first()
            : null;

        $eligibility = $this->trackService->getSchedulingEligibilitySummary($universityId, $stage);

        $projectsCount = $stage
            ? $eligibility['eligible_projects_count']
            : Project::withoutGlobalScopes()
                ->where('university_id', $universityId)
                ->whereNotNull('supervisor_id')
                ->count();

        $facultyCount = $stage
            ? ($useCommittees
                ? $this->countCommitteeFacultyForStage($stage, $universityId)
                : $this->countEligibleFacultyForStage($stage, $universityId))
            : User::where('university_id', $universityId)
                ->whereHas('availabilities')
                ->whereHas('role', fn ($q) => $q->whereIn('name', ['supervisor', 'admin']))
                ->count();

        $activeCommitteesCount = $this->committeeService->getActiveCommittees($universityId)->count();
        $committeesWithCommonAvailabilityCount = $stage
            ? $this->committeeService->countCommitteesWithCommonAvailability($universityId, $stage->id)
            : 0;
        $committeeMembersWithAvailabilityCount = $stage
            ? $this->committeeService->countCommitteeMembersWithStageAvailability($universityId, $stage->id)
            : 0;

        $roomsQuery = SchedulingUniversityScope::apply(\App\Models\AvailableRoom::query());
        $roomsCount = $roomsQuery->count();
        $premiumRoomsCount = (clone $roomsQuery)->where('is_premium', true)->count();

        $activeSchedulesCount = ApprovedSchedule::withoutGlobalScopes()
            ->where('university_id', $universityId)
            ->where('status', 'active')
            ->count();

        $stagePayload = null;
        $supervisorsTotal = null;
        $supervisorsSubmitted = null;
        $supervisorsPending = null;

        if ($stage) {
            if ($stage->usesFlexibleAvailability()) {
                $stats = $this->stageAvailabilityService->submissionStats($stage);
                $supervisorsTotal = $stats['supervisors_total'];
                $supervisorsSubmitted = $stats['supervisors_submitted'];
                $supervisorsPending = $stats['supervisors_pending'];
            }

            $stagePayload = [
                'id' => $stage->id,
                'name' => $stage->name,
                'stage_key' => $stage->stage_key,
                'is_system_stage' => $stage->is_system_stage,
                'availability_mode' => $stage->availability_mode,
                'mandatory_slots' => $stage->getMandatorySlotsList(),
                'availability_open' => $stage->availability_open,
                'availability_opened_at' => $stage->availability_opened_at,
                'defense_period_start' => $stage->defense_period_start?->format('Y-m-d'),
                'defense_period_end' => $stage->defense_period_end?->format('Y-m-d'),
                'allowed_defense_days' => $stage->getAllowedDefenseDaysList(),
            ];
        }

        $stageForRooms = $stage;

        $effectiveRoomsCount = $roomsCount;
        $usePremiumOnly = $stageForRooms
            ? TrackStageHierarchy::academicStageUsesPremiumRooms($universityId, (int) $stageForRooms->id)
            : false;
        $hasTerminal = $stageForRooms
            ? TrackStageHierarchy::academicStageHasTerminalPlacement($universityId, (int) $stageForRooms->id)
            : false;
        $hasNonTerminal = $stageForRooms
            ? TrackStageHierarchy::academicStageHasNonTerminalPlacement($universityId, (int) $stageForRooms->id)
            : false;

        if (
            !$usePremiumOnly
            && !$hasTerminal
            && !$hasNonTerminal
            && $stageForRooms?->isFinalDefense()
            && !TrackStageHierarchy::academicStageHasTrackLinks($universityId, (int) $stageForRooms->id)
        ) {
            $usePremiumOnly = true;
        }

        $standardCount = SchedulingUniversityScope::apply(\App\Models\AvailableRoom::query())
            ->where('is_premium', false)
            ->count();

        if ($usePremiumOnly && $premiumRoomsCount > 0) {
            $effectiveRoomsCount = $premiumRoomsCount;
        } elseif ($hasNonTerminal && $hasTerminal) {
            // Shared type across phases: need standard rooms; premium optional for terminal.
            $effectiveRoomsCount = $standardCount > 0 ? $standardCount : $roomsCount;
        } elseif ($hasTerminal && $premiumRoomsCount > 0) {
            $effectiveRoomsCount = $premiumRoomsCount;
        } elseif ($stageForRooms && $standardCount > 0) {
            $effectiveRoomsCount = $standardCount;
        }

        $readyToGenerate = $stagesCount > 0
            && $projectsCount > 0
            && $facultyCount > 0
            && $effectiveRoomsCount > 0;

        if ($stageId && $stagePayload) {
            $readyToGenerate = $readyToGenerate
                && $stagePayload['defense_period_start']
                && $stagePayload['defense_period_end'];

            if ($useCommittees) {
                $readyToGenerate = $readyToGenerate && $activeCommitteesCount > 0;
            } else {
                $readyToGenerate = $readyToGenerate && $facultyCount > 0;

                if ($stagePayload['availability_mode'] === AcademicStageConfig::AVAILABILITY_MANDATORY) {
                    $readyToGenerate = $readyToGenerate && count($stagePayload['mandatory_slots']) > 0;
                }
            }
        }

        return response()->json([
            'stages_count' => $stagesCount,
            'projects_with_supervisor_count' => $projectsCount,
            'faculty_with_availability_count' => $facultyCount,
            'rooms_count' => $roomsCount,
            'premium_rooms_count' => $premiumRoomsCount,
            'effective_rooms_count' => $effectiveRoomsCount,
            'active_schedules_count' => $activeSchedulesCount,
            'stage' => $stagePayload,
            'supervisors_total' => $supervisorsTotal,
            'supervisors_submitted' => $supervisorsSubmitted,
            'supervisors_pending' => $supervisorsPending,
            'ready_to_generate' => $readyToGenerate,
            'active_committees_count' => $activeCommitteesCount,
            'committees_with_common_availability_count' => $committeesWithCommonAvailabilityCount,
            'committee_members_with_availability_count' => $committeeMembersWithAvailabilityCount,
            'eligible_projects_count' => $eligibility['eligible_projects_count'],
            'total_supervised_projects' => $eligibility['total_supervised_projects'],
            'excluded_projects_count' => $eligibility['excluded_projects_count'],
            'linked_track_stages_count' => $eligibility['linked_track_stages_count'],
            'tracks_enabled' => $eligibility['tracks_enabled'],
        ]);
    }

    protected function countFacultyWithStageAvailability(int $universityId, int $stageId): int
    {
        return User::where('university_id', $universityId)
            ->whereHas('role', fn ($q) => $q->whereIn('name', ['supervisor', 'admin']))
            ->whereHas('availabilities', fn ($q) => $q->where('academic_stage_id', $stageId))
            ->count();
    }

    protected function countEligibleFacultyForStage(AcademicStageConfig $stage, int $universityId): int
    {
        if ($stage->usesMandatoryAvailability()) {
            if (!$stage->hasMandatorySlotsConfigured()) {
                return 0;
            }

            return User::where('university_id', $universityId)
                ->whereHas('role', fn ($q) => $q->whereIn('name', ['supervisor', 'admin']))
                ->count();
        }

        return $this->countFacultyWithStageAvailability($universityId, $stage->id);
    }

    protected function countCommitteeFacultyForStage(AcademicStageConfig $stage, int $universityId): int
    {
        return $this->committeeService->getActiveCommittees($universityId)
            ->flatMap(fn ($committee) => $committee->members->pluck('id'))
            ->unique()
            ->count();
    }

    protected function stagePeriodError(?AcademicStageConfig $stage): ?JsonResponse
    {
        if (!$stage) {
            return response()->json(['message' => 'Invalid academic stage'], 400);
        }

        if (!$stage->defense_period_start || !$stage->defense_period_end) {
            return response()->json([
                'message' => 'يجب تحديد تاريخ بداية ونهاية أسبوع المناقشات في المرحلة الأكاديمية.',
            ], 422);
        }

        $allowedDays = $stage->getAllowedDefenseDaysList();
        if (empty($allowedDays)) {
            return response()->json([
                'message' => 'يجب تحديد أيام المناقشة المسموحة في المرحلة الأكاديمية.',
            ], 422);
        }

        if (!SchedulingDateHelper::hasAllowedDayInRange(
            $stage->defense_period_start->format('Y-m-d'),
            $stage->defense_period_end->format('Y-m-d'),
            $allowedDays
        )) {
            return response()->json([
                'message' => 'نطاق التواريخ لا يتضمن أي يوم من أيام المناقشة المحددة.',
            ], 422);
        }

        return null;
    }

    protected function enrichCandidatesWithDates(array $payload, AcademicStageConfig $stage): array
    {
        if (!$stage->defense_period_start || !$stage->defense_period_end || empty($payload['candidates'])) {
            return $payload;
        }

        $periodStart = $stage->defense_period_start->format('Y-m-d');
        $periodEnd = $stage->defense_period_end->format('Y-m-d');

        $projectIds = collect($payload['candidates'])
            ->flatMap(fn ($c) => collect($c['assignments'] ?? [])->pluck('projectId'))
            ->filter()
            ->unique()
            ->values();

        $phaseByProject = Project::query()
            ->whereIn('id', $projectIds)
            ->with(['proposal.trackStage.parent:id,name'])
            ->get()
            ->mapWithKeys(function (Project $project) {
                return [
                    $project->id => $project->proposal?->trackStage?->parent?->name,
                ];
            });

        foreach ($payload['candidates'] as &$candidate) {
            foreach ($candidate['assignments'] as &$assignment) {
                $dayOfWeek = SchedulingDateHelper::dayNameToNumber($assignment['scheduledDay']);
                $assignment['scheduledDate'] = SchedulingDateHelper::dateForDayInRange(
                    $periodStart,
                    $periodEnd,
                    $dayOfWeek
                );
                $assignment['formattedDate'] = SchedulingDateHelper::formatDateArabic(
                    $assignment['scheduledDate']
                );
                $assignment['phaseName'] = $phaseByProject[$assignment['projectId']] ?? null;
            }
            unset($assignment);

            usort($candidate['assignments'], function (array $a, array $b) {
                $dateCmp = strcmp((string) ($a['scheduledDate'] ?? ''), (string) ($b['scheduledDate'] ?? ''));
                if ($dateCmp !== 0) {
                    return $dateCmp;
                }

                return strcmp((string) ($a['scheduledTime'] ?? ''), (string) ($b['scheduledTime'] ?? ''));
            });
        }
        unset($candidate);

        return $payload;
    }

    protected function formatSession(DefenseSession $s, User $user, bool $isAdmin): array
    {
        $committeeMembers = $s->display_committee
            ? collect($s->display_committee['members'] ?? [])
            : $s->committeeMembers->map(fn ($m) => [
                'id' => $m->id,
                'name' => $m->name,
                'role' => 'member',
            ]);

        $onCommittee = $committeeMembers->contains('id', $user->id);
        $isChair = $committeeMembers->contains(
            fn ($member) => ($member['id'] ?? null) === $user->id && ($member['role'] ?? '') === 'chair',
        );

        $defenseResult = $s->project
            ? $this->trackService->getDefenseSessionContext($s->project, $s)
            : null;

        return [
            'id' => $s->id,
            'project' => [
                'id' => $s->project->id,
                'title' => $s->project->title,
                'supervisor' => $s->project->supervisor ? [
                    'id' => $s->project->supervisor->id,
                    'name' => $s->project->supervisor->name,
                ] : null,
            ],
            'academic_stage' => $s->approvedSchedule?->academicStage ? [
                'id' => $s->approvedSchedule->academicStage->id,
                'name' => $s->approvedSchedule->academicStage->name,
            ] : null,
            'scheduled_date' => $s->scheduled_date?->format('Y-m-d'),
            'formatted_date' => $s->formatted_date,
            'scheduled_day' => $s->day_name,
            'scheduled_day_of_week' => $s->scheduled_day_of_week,
            'scheduled_time' => $s->time_range,
            'room' => $s->room ? [
                'id' => $s->room->id,
                'name' => $s->room->name,
            ] : null,
            'status' => $s->status,
            'committee' => $s->display_committee,
            'committee_members' => $committeeMembers->values(),
            'my_role' => $isAdmin
                ? ($isChair ? 'chair' : ($onCommittee ? 'committee_member' : 'admin_view'))
                : ($isChair ? 'chair' : 'committee_member'),
            'can_record_result' => $this->trackService->canUserRecordDefenseResult($s, $user),
            'defense_result' => $defenseResult,
        ];
    }
}

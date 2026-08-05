<?php

namespace App\Services\Scheduling;


use App\Services\Notifications\NotificationService;
use App\Models\Committee;
use App\Models\AcademicStageConfig;
use App\Models\ApprovedSchedule;
use App\Models\CommitteeAssignment;
use App\Models\DefenseSession;
use App\Models\Project;
use App\Models\User;
use App\Support\SchedulingDateHelper;
use Illuminate\Support\Facades\DB;

class ScheduleApprovalService
{
    public function __construct(
        protected NotificationService $notifications
    ) {}

    public function approve(
        int $universityId,
        int $stageId,
        int $adminId,
        array $candidate
    ): array {
        $stage = AcademicStageConfig::withoutGlobalScopes()
            ->where('university_id', $universityId)
            ->where('id', $stageId)
            ->firstOrFail();

        if (!$stage->defense_period_start || !$stage->defense_period_end) {
            throw new \Exception('يجب تحديد تاريخ بداية ونهاية أسبوع المناقشات في المرحلة الأكاديمية قبل الاعتماد.');
        }

        if (empty($stage->getAllowedDefenseDaysList())) {
            throw new \Exception('يجب تحديد أيام المناقشة المسموحة في المرحلة الأكاديمية.');
        }

        $existing = ApprovedSchedule::withoutGlobalScopes()
            ->where('university_id', $universityId)
            ->where('academic_stage_id', $stageId)
            ->where('status', 'active')
            ->exists();

        if ($existing) {
            throw new \Exception('An active schedule already exists for this stage. Void it first.');
        }

        $periodStart = $stage->defense_period_start->format('Y-m-d');
        $periodEnd = $stage->defense_period_end->format('Y-m-d');

        $result = DB::transaction(function () use ($universityId, $stageId, $adminId, $candidate, $periodStart, $periodEnd) {
            $schedule = ApprovedSchedule::create([
                'university_id' => $universityId,
                'academic_stage_id' => $stageId,
                'approved_by' => $adminId,
                'approved_at' => now(),
                'status' => 'active',
                'metadata' => [
                    'fitness' => $candidate['fitness'],
                    'warnings' => $candidate['fitnessBreakdown']['recommendations'] ?? [],
                    'projectCount' => count($candidate['assignments'] ?? []),
                ],
            ]);

            $sessionsCreated = 0;
            $assignmentsCreated = 0;

            foreach ($candidate['assignments'] as $assignment) {
                $dayOfWeek = SchedulingDateHelper::dayNameToNumber($assignment['scheduledDay']);
                $scheduledDate = $assignment['scheduledDate']
                    ?? SchedulingDateHelper::dateForDayInRange($periodStart, $periodEnd, $dayOfWeek);

                if (!$scheduledDate) {
                    throw new \Exception("لا يوجد تاريخ مطابق ليوم {$assignment['scheduledDay']} ضمن فترة المناقشة.");
                }

                $project = Project::with('proposal:id,track_stage_id')->find($assignment['projectId']);
                $trackStageId = $project?->track_stage_id ?: $project?->proposal?->track_stage_id;
                $committeeId = $this->resolveCommitteeId($assignment, $universityId);

                $session = DefenseSession::create([
                    'approved_schedule_id' => $schedule->id,
                    'project_id' => $assignment['projectId'],
                    'track_stage_id' => $trackStageId,
                    'committee_id' => $committeeId,
                    'scheduled_day_of_week' => $dayOfWeek,
                    'scheduled_date' => $scheduledDate,
                    'scheduled_start_time' => $this->parseStartTime($assignment['scheduledTime']),
                    'scheduled_end_time' => $this->parseEndTime($assignment['scheduledTime']),
                    'room_id' => $assignment['roomId'] ?? null,
                    'status' => 'scheduled',
                ]);
                $sessionsCreated++;

                foreach ($assignment['committeeMembers'] as $member) {
                    CommitteeAssignment::create([
                        'defense_session_id' => $session->id,
                        'user_id' => $member['userId'],
                    ]);
                    $assignmentsCreated++;
                }
            }

            return [
                'schedule' => $schedule,
                'sessionsCreated' => $sessionsCreated,
                'assignmentsCreated' => $assignmentsCreated,
            ];
        });

        $notificationsSent = $this->sendNotifications($result['schedule']);

        return [
            'approved_schedule' => $result['schedule'],
            'defense_sessions_created' => $result['sessionsCreated'],
            'committee_assignments_created' => $result['assignmentsCreated'],
            'notifications_sent' => $notificationsSent,
        ];
    }

    public function void(int $scheduleId, int $adminId): array
    {
        $schedule = ApprovedSchedule::withoutGlobalScopes()->findOrFail($scheduleId);

        if ($schedule->status === 'voided') {
            throw new \Exception('Schedule is already voided');
        }

        $sessionsCount = $schedule->defenseSessions()->count();
        $schedule->void($adminId);

        return [
            'schedule_id' => $scheduleId,
            'defense_sessions_cancelled' => $sessionsCount,
        ];
    }

    protected function sendNotifications(ApprovedSchedule $schedule): int
    {
        $count = 0;

        $sessions = $schedule->defenseSessions()
            ->with(['project.supervisor', 'committeeAssignments.user', 'committeeMembers', 'project.members'])
            ->get();

        foreach ($sessions as $session) {
            $when = $this->formatSessionWhen($session);

            foreach ($session->committeeAssignments as $assignment) {
                $this->notifications->notifyUser(
                    $assignment->user,
                    'committee_assignment',
                    'تعيينك في لجنة مناقشة',
                    "تم تعيينك في لجنة مناقشة مشروع «{$session->project->title}» {$when}",
                    [
                        'url' => '/dashboard/my-schedule',
                        'defense_session_id' => $session->id,
                        'project_id' => $session->project_id,
                        'day' => $session->day_name,
                        'scheduled_date' => $session->scheduled_date?->format('Y-m-d'),
                        'time_range' => $session->time_range,
                    ]
                );
                $assignment->markNotified();
                $count++;
            }

            if ($session->project->supervisor) {
                $committeeNames = $session->committeeMembers->pluck('name')->toArray();
                $this->notifications->notifyUser(
                    $session->project->supervisor,
                    'defense_scheduled',
                    'موعد مناقشة مشروعك',
                    "تم جدولة مناقشة مشروع «{$session->project->title}» {$when}",
                    [
                        'url' => "/dashboard/projects/{$session->project_id}",
                        'defense_session_id' => $session->id,
                        'project_id' => $session->project_id,
                        'committee_members' => $committeeNames,
                    ]
                );
                $count++;
            }

            $count += $this->notifyProjectStudents($session, $when);
        }

        return $count;
    }

    protected function notifyProjectStudents(DefenseSession $session, string $when): int
    {
        $count = 0;
        $committeeNames = $session->committeeMembers->pluck('name')->toArray();

        $studentIds = $session->project->members()
            ->wherePivot('status', 'accepted')
            ->pluck('users.id');

        if ($session->project->user_id) {
            $studentIds = $studentIds->push($session->project->user_id)->unique();
        }

        $students = User::whereIn('id', $studentIds)->get();

        foreach ($students as $student) {
            $this->notifications->notifyUser(
                $student,
                'defense_scheduled',
                'موعد مناقشة مشروعك',
                "تم جدولة مناقشة مشروعك {$when}",
                [
                    'url' => "/dashboard/projects/{$session->project_id}",
                    'defense_session_id' => $session->id,
                    'project_id' => $session->project_id,
                    'committee_members' => $committeeNames,
                ]
            );
            $count++;
        }

        return $count;
    }

    protected function formatSessionWhen(DefenseSession $session): string
    {
        if ($session->formatted_date) {
            return "يوم {$session->formatted_date} الساعة {$session->time_range}";
        }

        return "يوم {$session->day_name} {$session->time_range}";
    }

    protected function parseStartTime(string $timeRange): string
    {
        $parts = explode(' - ', $timeRange);

        return strlen($parts[0]) === 5 ? $parts[0] . ':00' : $parts[0];
    }

    protected function parseEndTime(string $timeRange): string
    {
        $parts = explode(' - ', $timeRange);
        $end = $parts[1] ?? $parts[0];

        return strlen($end) === 5 ? $end . ':00' : $end;
    }

    protected function resolveCommitteeId(array $assignment, int $universityId): ?int
    {
        if (!empty($assignment['committeeId'])) {
            return (int) $assignment['committeeId'];
        }

        $memberIds = collect($assignment['committeeMembers'] ?? [])
            ->pluck('userId')
            ->filter()
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->sort()
            ->values();

        if ($memberIds->isEmpty()) {
            return null;
        }

        $committees = Committee::withoutGlobalScopes()
            ->where('university_id', $universityId)
            ->where('is_active', true)
            ->with('members:id')
            ->get();

        foreach ($committees as $committee) {
            $committeeMemberIds = $committee->members
                ->pluck('id')
                ->map(fn ($id) => (int) $id)
                ->sort()
                ->values();

            if ($committeeMemberIds->all() === $memberIds->all()) {
                return $committee->id;
            }
        }

        return null;
    }
}

<?php

namespace Database\Seeders;

use App\Models\AcademicStageConfig;
use App\Models\ApprovedSchedule;
use App\Models\AvailableRoom;
use App\Models\Committee;
use App\Models\DefenseSession;
use App\Models\Project;
use App\Models\StudentProgress;
use App\Models\Track;
use App\Models\TrackStage;
use App\Models\University;
use App\Models\User;
use App\Services\UniversitySchedulingBootstrapService;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

/**
 * Rich defense-result demo: team projects (3–4 students each), 2 committees, 6 past sessions.
 *
 * Usage:
 *   php artisan db:seed --class=SchedulingDemoSeeder
 *   php artisan db:seed --class=DefenseResultDemoSeeder
 *
 * All accounts: password
 */
class DefenseResultDemoSeeder extends Seeder
{
    private const UNIVERSITY_SLUG = 'spu';

    /** @var array<int, array{title: string, owner: int, members: int[], supervisor: int, committee: int, slot: int}> */
    private const TEAM_PROJECTS = [
        [
            'title' => 'فريق ألفا — نظام إدارة مكتبة ذكي',
            'owner' => 1,
            'members' => [2, 3],
            'supervisor' => 1,
            'committee' => 0,
            'slot' => 0,
        ],
        [
            'title' => 'فريق بيتا — تطبيق حجز القاعات',
            'owner' => 4,
            'members' => [5, 6, 7],
            'supervisor' => 2,
            'committee' => 0,
            'slot' => 1,
        ],
        [
            'title' => 'فريق جاما — منصة تعليم إلكتروني',
            'owner' => 8,
            'members' => [9, 10],
            'supervisor' => 3,
            'committee' => 0,
            'slot' => 2,
        ],
        [
            'title' => 'فريق دلتا — تحليل بيانات الطلاب',
            'owner' => 11,
            'members' => [12, 13, 14],
            'supervisor' => 4,
            'committee' => 1,
            'slot' => 0,
        ],
        [
            'title' => 'فريق إبسيلون — نظام تتبع مشاريع التخرج',
            'owner' => 15,
            'members' => [16, 17],
            'supervisor' => 5,
            'committee' => 1,
            'slot' => 1,
        ],
        [
            'title' => 'فريق زيتا — بوابة خدمات جامعية',
            'owner' => 18,
            'members' => [19, 20, 21],
            'supervisor' => 6,
            'committee' => 1,
            'slot' => 2,
        ],
    ];

    public function run(): void
    {
        $university = University::where('slug', self::UNIVERSITY_SLUG)->first();

        if (!$university) {
            $this->command?->warn('University not found — running SchedulingDemoSeeder first…');
            $this->call(SchedulingDemoSeeder::class);
            $university = University::where('slug', self::UNIVERSITY_SLUG)->firstOrFail();
        }

        $admin = User::where('email', 'spu-demo-admin@syrian-private.local')->first();
        if (!$admin) {
            $this->call(SchedulingDemoSeeder::class);
            $admin = User::where('email', 'spu-demo-admin@syrian-private.local')->firstOrFail();
        }

        $students = User::query()
            ->where('university_id', $university->id)
            ->whereHas('role', fn ($q) => $q->where('name', 'student'))
            ->orderBy('id')
            ->get()
            ->values();

        $supervisors = User::query()
            ->where('university_id', $university->id)
            ->whereHas('role', fn ($q) => $q->where('name', 'supervisor'))
            ->orderBy('id')
            ->get()
            ->values();

        if ($students->count() < 21 || $supervisors->count() < 7) {
            $this->call(SchedulingDemoSeeder::class);
            $students = User::query()
                ->where('university_id', $university->id)
                ->whereHas('role', fn ($q) => $q->where('name', 'student'))
                ->orderBy('id')
                ->get()
                ->values();
            $supervisors = User::query()
                ->where('university_id', $university->id)
                ->whereHas('role', fn ($q) => $q->where('name', 'supervisor'))
                ->orderBy('id')
                ->get()
                ->values();
        }

        $studentByNum = fn (int $num) => $students[$num - 1] ?? null;
        $supervisorByNum = fn (int $num) => $supervisors[$num - 1] ?? $supervisors[0];

        $seminar = $this->resolveSeminarStage($university);
        $finalStage = AcademicStageConfig::withoutGlobalScopes()
            ->where('university_id', $university->id)
            ->where('stage_key', AcademicStageConfig::STAGE_KEY_FINAL_DEFENSE)
            ->first()
            ?? app(UniversitySchedulingBootstrapService::class)->ensureFinalDefenseStage($university);

        $yesterday = Carbon::yesterday();
        $seminar->update([
            'defense_period_start' => $yesterday->copy()->subDays(3)->toDateString(),
            'defense_period_end' => $yesterday->copy()->addDay()->toDateString(),
            'allowed_defense_days' => [0, 1, 2, 3, 4, 5, 6],
            'availability_open' => true,
        ]);

        $track = Track::updateOrCreate(
            ['university_id' => $university->id, 'name' => 'مسار تجربة النتائج'],
            [
                'description' => 'مسار تجريبي — فرق من 3–4 طلاب لكل مشروع',
                'is_active' => true,
            ]
        );

        $seminarTrackStage = TrackStage::updateOrCreate(
            ['track_id' => $track->id, 'sequence_order' => 1],
            [
                'name' => 'السيمنار الأول',
                'description' => 'مرحلة السيمنار — جاهزة لتسجيل النتيجة',
                'academic_stage_id' => $seminar->id,
            ]
        );

        TrackStage::updateOrCreate(
            ['track_id' => $track->id, 'sequence_order' => 2],
            [
                'name' => 'المناقشة النهائية',
                'description' => 'المرحلة التالية بعد النجاح في السيمنار',
                'academic_stage_id' => $finalStage->id,
            ]
        );

        $rooms = AvailableRoom::withoutGlobalScopes()
            ->where('university_id', $university->id)
            ->orderBy('id')
            ->limit(3)
            ->get();

        if ($rooms->isEmpty()) {
            $rooms = collect([
                AvailableRoom::create([
                    'university_id' => $university->id,
                    'name' => 'قاعة تجربة A101',
                    'building' => 'مبنى الهندسة',
                    'is_premium' => false,
                ]),
            ]);
        }

        $committees = $this->seedCommittees($university, $supervisors);

        ApprovedSchedule::withoutGlobalScopes()
            ->where('university_id', $university->id)
            ->where('academic_stage_id', $seminar->id)
            ->where('status', 'active')
            ->update(['status' => 'voided', 'voided_at' => now(), 'voided_by' => $admin->id]);

        $schedule = ApprovedSchedule::create([
            'university_id' => $university->id,
            'academic_stage_id' => $seminar->id,
            'approved_by' => $admin->id,
            'approved_at' => $yesterday->copy()->subDay(),
            'status' => 'active',
            'metadata' => ['source' => 'DefenseResultDemoSeeder', 'teams' => count(self::TEAM_PROJECTS)],
        ]);

        $times = [
            ['start' => '08:30:00', 'end' => '09:30:00'],
            ['start' => '10:00:00', 'end' => '11:00:00'],
            ['start' => '11:30:00', 'end' => '12:30:00'],
            ['start' => '13:30:00', 'end' => '14:30:00'],
            ['start' => '15:00:00', 'end' => '16:00:00'],
            ['start' => '16:30:00', 'end' => '17:30:00'],
        ];

        $demoProjects = [];

        foreach (self::TEAM_PROJECTS as $team) {
            $owner = $studentByNum($team['owner']);
            if (!$owner) {
                continue;
            }

            $supervisor = $supervisorByNum($team['supervisor']);
            $committee = $committees[$team['committee']] ?? $committees[0];
            $slot = $times[$team['slot']] ?? $times[0];
            $room = $rooms[$team['slot'] % $rooms->count()];

            $allStudentIds = array_unique(array_merge([$owner->id], array_filter(array_map(
                fn (int $n) => $studentByNum($n)?->id,
                $team['members'],
            ))));

            foreach ($allStudentIds as $studentId) {
                $student = User::find($studentId);
                if (!$student) {
                    continue;
                }
                $student->update(['track_id' => $track->id]);
                StudentProgress::updateOrCreate(
                    [
                        'student_id' => $student->id,
                        'track_id' => $track->id,
                        'track_stage_id' => $seminarTrackStage->id,
                    ],
                    ['status' => 'in_progress']
                );
            }

            $project = Project::withoutGlobalScopes()->updateOrCreate(
                ['university_id' => $university->id, 'title' => $team['title']],
                [
                    'description' => 'مشروع جماعي تجريبي — ' . count($allStudentIds) . ' طلاب في الفريق',
                    'user_id' => $owner->id,
                    'supervisor_id' => $supervisor->id,
                    'status' => 'in_progress',
                ]
            );

            $memberPivot = [];
            foreach ($team['members'] as $memberNum) {
                $member = $studentByNum($memberNum);
                if ($member && $member->id !== $owner->id) {
                    $memberPivot[$member->id] = ['status' => 'accepted'];
                }
            }
            $project->members()->sync($memberPivot);

            DefenseSession::query()
                ->where('project_id', $project->id)
                ->where('status', 'scheduled')
                ->update(['status' => 'cancelled']);

            DefenseSession::create([
                'approved_schedule_id' => $schedule->id,
                'project_id' => $project->id,
                'committee_id' => $committee->id,
                'scheduled_day_of_week' => (int) $yesterday->dayOfWeek,
                'scheduled_date' => $yesterday->toDateString(),
                'scheduled_start_time' => $slot['start'],
                'scheduled_end_time' => $slot['end'],
                'room_id' => $room->id,
                'status' => 'scheduled',
            ]);

            $demoProjects[] = [
                'project' => $project->fresh(['user', 'members', 'supervisor']),
                'committee' => $committee,
                'team_size' => count($allStudentIds),
                'slot' => $slot,
            ];
        }

        $this->printSummary($admin, $committees, $seminar, $yesterday, $demoProjects, $students->count());
    }

    private function resolveSeminarStage(University $university): AcademicStageConfig
    {
        $seminar = AcademicStageConfig::withoutGlobalScopes()
            ->where('university_id', $university->id)
            ->where('name', 'السيمنار الأول')
            ->first();

        if ($seminar) {
            return $seminar;
        }

        app(UniversitySchedulingBootstrapService::class)->ensureFinalDefenseStage($university);

        return AcademicStageConfig::withoutGlobalScopes()->create([
            'university_id' => $university->id,
            'name' => 'السيمنار الأول',
            'duration_minutes' => 60,
            'default_committee_size' => 3,
            'display_order' => 1,
            'availability_mode' => AcademicStageConfig::AVAILABILITY_FLEXIBLE,
            'availability_open' => true,
        ]);
    }

    /** @return Committee[] */
    private function seedCommittees(University $university, $supervisors): array
    {
        $defs = [
            [
                'name' => 'لجنة السيمنار — الصباح',
                'chair' => 2,
                'members' => [3, 4],
            ],
            [
                'name' => 'لجنة السيمنار — بعد الظهر',
                'chair' => 5,
                'members' => [6, 7],
            ],
        ];

        $committees = [];
        foreach ($defs as $def) {
            $chair = $supervisors[$def['chair'] - 1] ?? $supervisors[0];
            $memberA = $supervisors[$def['members'][0] - 1] ?? $supervisors[0];
            $memberB = $supervisors[$def['members'][1] - 1] ?? $supervisors[1] ?? $supervisors[0];

            $committee = Committee::updateOrCreate(
                ['university_id' => $university->id, 'name' => $def['name']],
                [
                    'description' => 'لجنة تجريبية لتسجيل نتائج المناقشة',
                    'is_active' => true,
                    'version' => 1,
                ]
            );

            $committee->members()->sync([
                $chair->id => ['role' => 'chair'],
                $memberA->id => ['role' => 'member'],
                $memberB->id => ['role' => 'member'],
            ]);

            $committees[] = $committee->fresh('members');
        }

        return $committees;
    }

    private function printSummary(
        User $admin,
        array $committees,
        AcademicStageConfig $seminar,
        Carbon $defenseDate,
        array $demoProjects,
        int $totalStudents,
    ): void {
        $totalTeamStudents = collect($demoProjects)->sum('team_size');

        $this->command?->newLine();
        $this->command?->info('═══════════════════════════════════════════════════════');
        $this->command?->info('  تجربة تسجيل النتيجة — فرق متعددة الطلاب');
        $this->command?->info('═══════════════════════════════════════════════════════');
        $this->command?->newLine();
        $this->command?->line('كل الحسابات: password');
        $this->command?->line("الطلاب في القاعدة: {$totalStudents} | المشاركون في التجربة: {$totalTeamStudents}");
        $this->command?->newLine();

        $this->command?->info('① مدير الجامعة:');
        $this->command?->line("   {$admin->email}");
        $this->command?->newLine();

        $this->command?->info('② رؤساء اللجان (يسجّلون النتيجة):');
        foreach ($committees as $committee) {
            $chair = $committee->members->first(fn ($m) => $m->pivot->role === 'chair');
            if ($chair) {
                $this->command?->line("   {$committee->name}");
                $this->command?->line("     → {$chair->email} ({$chair->name})");
            }
        }
        $this->command?->newLine();

        $this->command?->info("③ مرحلة المناقشة: {$seminar->name} — تاريخ: {$defenseDate->format('Y-m-d')}");
        $this->command?->newLine();

        $this->command?->info('④ المشاريع الجماعية (' . count($demoProjects) . ' فرق):');
        foreach ($demoProjects as $row) {
            /** @var Project $project */
            $project = $row['project'];
            $owner = $project->user?->name ?? '—';
            $memberNames = $project->members->pluck('name')->join('، ') ?: '—';
            $this->command?->line("   • #{$project->id} — {$project->title}");
            $this->command?->line("     الفريق ({$row['team_size']}): مالك: {$owner} | أعضاء: {$memberNames}");
            $this->command?->line("     المشرف: {$project->supervisor?->name} | اللجنة: {$row['committee']->name}");
            $this->command?->line("     الوقت: {$row['slot']['start']}–{$row['slot']['end']} | /dashboard/projects/{$project->id}");
        }

        $this->command?->newLine();
        $this->command?->info('⑤ حسابات طلاب للتجربة (عينة):');
        foreach ([1, 2, 4, 8, 11, 15, 18] as $n) {
            $num = str_pad((string) $n, 2, '0', STR_PAD_LEFT);
            $this->command?->line("   spu-demo-student-{$num}@syrian-private.local");
        }
        $this->command?->newLine();
        $this->command?->info('ملاحظة: النتيجة تُسجَّل لمالك المشروع (قائد الفريق) ويُحدَّث مساره في «تقدمي».');
        $this->command?->newLine();
    }
}

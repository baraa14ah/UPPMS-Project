<?php

namespace Database\Seeders;

use App\Models\AcademicStageConfig;
use App\Models\ApprovedSchedule;
use App\Models\AvailableRoom;
use App\Models\Committee;
use App\Models\CommitteeAssignment;
use App\Models\DefenseSession;
use App\Models\Project;
use App\Models\ProjectProposal;
use App\Models\Role;
use App\Models\StudentProgress;
use App\Models\Track;
use App\Models\TrackStage;
use App\Models\University;
use App\Models\User;
use App\Services\Scheduling\UniversitySchedulingBootstrapService;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Full academic-track workflow demo: track steps, proposals, projects, defense sessions.
 *
 * Usage:
 *   php artisan db:seed --class=TrackWorkflowDemoSeeder
 *
 * All accounts use password: password
 */
class TrackWorkflowDemoSeeder extends Seeder
{
    private const UNIVERSITY_SLUG = 'spu';

    private const PASSWORD = 'password';

    public function run(): void
    {
        $university = $this->ensureUniversity();
        $roles = $this->ensureRoles();

        $admin = $this->seedUser(
            'track-admin@syrian-private.local',
            'مدير تجربة المسار',
            $roles['admin'],
            $university->id,
        );

        $chairMorning = $this->seedUser(
            'track-chair-am@syrian-private.local',
            'د. سامر العلي (رئيس لجنة صباحية)',
            $roles['supervisor'],
            $university->id,
        );

        $chairAfternoon = $this->seedUser(
            'track-chair-pm@syrian-private.local',
            'د. لينا الخوري (رئيسة لجنة مسائية)',
            $roles['supervisor'],
            $university->id,
        );

        $supervisor = $this->seedUser(
            'track-supervisor@syrian-private.local',
            'د. أحمد الحلبي (مشرف)',
            $roles['supervisor'],
            $university->id,
        );

        $students = $this->seedStudents($university->id, $roles['student']);

        $schedulingStages = $this->ensureSchedulingStages($university);
        $seminarScheduling = $schedulingStages['seminar'];

        $track = $this->ensureGraduationTrack($university, $schedulingStages);
        $trackStages = $track->stages()->orderBy('sequence_order')->get();
        $seminarStage = $trackStages->where('stage_kind', 'step')->where('name', 'السيمنار الأول')->first()
            ?? $trackStages->firstWhere('stage_kind', 'step');
        $gp1Stage = $trackStages->where('name', 'مشروع التخرج 1')->first();

        $room = $this->ensureRoom($university->id);

        $committeeMorning = $this->ensureCommittee(
            $university->id,
            'لجنة السيمنار — صباح',
            $chairMorning,
            [$supervisor, $chairAfternoon],
        );

        $committeeAfternoon = $this->ensureCommittee(
            $university->id,
            'لجنة السيمنار — مساء',
            $chairAfternoon,
            [$supervisor, $chairMorning],
        );

        $defenseDate = now()->subDay()->startOfDay();
        if ($defenseDate->dayOfWeek === Carbon::FRIDAY) {
            $defenseDate = $defenseDate->subDay();
        }
        if ($defenseDate->dayOfWeek === Carbon::SATURDAY) {
            $defenseDate = $defenseDate->subDays(2);
        }

        $schedule = ApprovedSchedule::updateOrCreate(
            [
                'university_id' => $university->id,
                'academic_stage_id' => $seminarScheduling->id,
                'status' => 'active',
            ],
            [
                'approved_by' => $admin->id,
                'approved_at' => now()->subDays(3),
                'metadata' => ['source' => 'TrackWorkflowDemoSeeder'],
            ],
        );

        $teams = [
            [
                'owner' => $students[0],
                'members' => [$students[1], $students[2]],
                'title' => 'نظام إدارة مكتبة ذكي — فريق السيمنار أ',
                'committee' => $committeeMorning,
                'chair' => $chairMorning,
                'time' => ['09:00:00', '10:00:00'],
            ],
            [
                'owner' => $students[3],
                'members' => [$students[4]],
                'title' => 'تطبيق حجز القاعات — فريق السيمنار ب',
                'committee' => $committeeAfternoon,
                'chair' => $chairAfternoon,
                'time' => ['14:00:00', '15:00:00'],
            ],
        ];

        $projectIds = [];

        foreach ($teams as $index => $team) {
            $owner = $team['owner'];
            $owner->update(['track_id' => $track->id]);

            StudentProgress::updateOrCreate(
                [
                    'student_id' => $owner->id,
                    'track_id' => $track->id,
                    'track_stage_id' => $seminarStage->id,
                ],
                ['status' => 'in_progress'],
            );

            $proposal = ProjectProposal::updateOrCreate(
                [
                    'student_id' => $owner->id,
                    'title' => $team['title'],
                ],
                [
                    'university_id' => $university->id,
                    'requested_supervisor_id' => $supervisor->id,
                    'description' => 'مقترح تجريبي لمرحلة السيمنار في مسار التخرج.',
                    'status' => 'approved',
                    'track_stage_id' => $seminarStage->id,
                ],
            );

            $project = Project::updateOrCreate(
                ['proposal_id' => $proposal->id],
                [
                    'title' => $team['title'],
                    'description' => 'مشروع تجريبي — جاهز لتسجيل نتيجة السيمنار.',
                    'user_id' => $owner->id,
                    'supervisor_id' => $supervisor->id,
                    'university_id' => $university->id,
                    'status' => 'in_progress',
                ],
            );

            $projectIds[] = $project->id;

            foreach ($team['members'] as $member) {
                $member->update(['track_id' => $track->id]);
                DB::table('project_members')->updateOrInsert(
                    [
                        'project_id' => $project->id,
                        'student_id' => $member->id,
                    ],
                    [
                        'status' => 'accepted',
                        'created_at' => now(),
                        'updated_at' => now(),
                    ],
                );
            }

            $session = DefenseSession::updateOrCreate(
                [
                    'approved_schedule_id' => $schedule->id,
                    'project_id' => $project->id,
                ],
                [
                    'track_stage_id' => $seminarStage->id,
                    'committee_id' => $team['committee']->id,
                    'scheduled_day_of_week' => $defenseDate->dayOfWeek,
                    'scheduled_date' => $defenseDate->toDateString(),
                    'scheduled_start_time' => $team['time'][0],
                    'scheduled_end_time' => $team['time'][1],
                    'room_id' => $room->id,
                    'status' => 'scheduled',
                ],
            );

            foreach ($team['committee']->members as $member) {
                CommitteeAssignment::updateOrCreate(
                    [
                        'defense_session_id' => $session->id,
                        'user_id' => $member->id,
                    ],
                    ['notified_at' => now()],
                );
            }
        }

        // Student who already passed seminar — on GP1, can submit new proposal after previous project completes
        $advanced = $students[5];
        $advanced->update(['track_id' => $track->id]);

        StudentProgress::updateOrCreate(
            [
                'student_id' => $advanced->id,
                'track_id' => $track->id,
                'track_stage_id' => $seminarStage->id,
            ],
            [
                'status' => 'passed',
                'completed_at' => now()->subWeek(),
                'defense_result_recorded_at' => now()->subWeek(),
                'defense_result_recorded_by' => $chairMorning->id,
            ],
        );

        StudentProgress::updateOrCreate(
            [
                'student_id' => $advanced->id,
                'track_id' => $track->id,
                'track_stage_id' => $gp1Stage->id,
            ],
            ['status' => 'in_progress'],
        );

        $gp1Proposal = ProjectProposal::updateOrCreate(
            [
                'student_id' => $advanced->id,
                'title' => 'منصة تعليم إلكتروني — مشروع تخرج 1',
            ],
            [
                'university_id' => $university->id,
                'requested_supervisor_id' => $supervisor->id,
                'description' => 'الطالب تجاوز السيمنار ويعمل على مشروع التخرج الأول.',
                'status' => 'approved',
                'track_stage_id' => $gp1Stage->id,
            ],
        );

        Project::updateOrCreate(
            ['proposal_id' => $gp1Proposal->id],
            [
                'title' => 'منصة تعليم إلكتروني — مشروع تخرج 1',
                'description' => 'مشروع نشط في المرحلة الثانية من المسار.',
                'user_id' => $advanced->id,
                'supervisor_id' => $supervisor->id,
                'university_id' => $university->id,
                'status' => 'in_progress',
            ],
        );

        $this->printSummary($teams, $projectIds, $defenseDate, $track);
    }

    private function ensureUniversity(): University
    {
        $university = University::query()
            ->where('slug', self::UNIVERSITY_SLUG)
            ->orWhere('name', 'syrian private uni')
            ->first();

        if (!$university) {
            $university = University::create([
                'name' => 'syrian private uni',
                'slug' => self::UNIVERSITY_SLUG,
            ]);
        }

        app(UniversitySchedulingBootstrapService::class)->ensureFinalDefenseStage($university);

        return $university;
    }

    /** @return array{admin:int,student:int,supervisor:int} */
    private function ensureRoles(): array
    {
        return [
            'admin' => Role::firstOrCreate(['name' => 'admin'])->id,
            'student' => Role::firstOrCreate(['name' => 'student'])->id,
            'supervisor' => Role::firstOrCreate(['name' => 'supervisor'])->id,
        ];
    }

    private function seedUser(string $email, string $name, int $roleId, int $universityId): User
    {
        return User::updateOrCreate(
            ['email' => $email],
            [
                'name' => $name,
                'password' => self::PASSWORD,
                'role_id' => $roleId,
                'university_id' => $universityId,
                'status' => 'active',
            ],
        );
    }

    /** @return User[] */
    private function seedStudents(int $universityId, int $roleId): array
    {
        $defs = [
            ['track-student-01@syrian-private.local', 'أحمد الطالب — مالك مشروع أ'],
            ['track-student-02@syrian-private.local', 'سارة الطالبة — عضو فريق أ'],
            ['track-student-03@syrian-private.local', 'محمد الطالب — عضو فريق أ'],
            ['track-student-04@syrian-private.local', 'ليلى الطالبة — مالكة مشروع ب'],
            ['track-student-05@syrian-private.local', 'علي الطالب — عضو فريق ب'],
            ['track-student-06@syrian-private.local', 'نور الطالبة — تجاوزت السيمنار'],
        ];

        $students = [];
        foreach ($defs as $index => [$email, $name]) {
            $num = str_pad((string) ($index + 1), 2, '0', STR_PAD_LEFT);
            $students[] = User::updateOrCreate(
                ['email' => $email],
                [
                    'name' => $name,
                    'password' => self::PASSWORD,
                    'role_id' => $roleId,
                    'university_id' => $universityId,
                    'student_number' => "TRK-2026-{$num}",
                    'status' => 'active',
                ],
            );
        }

        return $students;
    }

    /** @return array<string, AcademicStageConfig> */
    private function ensureSchedulingStages(University $university): array
    {
        $weekStart = now()->startOfWeek(Carbon::SATURDAY)->subWeek();
        $weekEnd = $weekStart->copy()->addDays(3);
        $workingDays = [6, 0, 1, 2];

        $seminar = AcademicStageConfig::updateOrCreate(
            ['university_id' => $university->id, 'name' => 'السيمنار الأول'],
            [
                'duration_minutes' => 60,
                'default_committee_size' => 3,
                'display_order' => 1,
                'defense_period_start' => $weekStart->toDateString(),
                'defense_period_end' => $weekEnd->toDateString(),
                'allowed_defense_days' => $workingDays,
                'availability_mode' => AcademicStageConfig::AVAILABILITY_FLEXIBLE,
                'availability_open' => true,
                'availability_opened_at' => now(),
            ],
        );

        $final = app(UniversitySchedulingBootstrapService::class)->ensureFinalDefenseStage($university);

        return [
            'seminar' => $seminar,
            'final' => $final->fresh(),
        ];
    }

    private function ensureGraduationTrack(University $university, array $schedulingStages): Track
    {
        $track = Track::updateOrCreate(
            ['university_id' => $university->id, 'name' => 'مسار التخرج العام'],
            [
                'description' => 'مسار تجريبي للسيدر فقط',
                'is_active' => true,
            ],
        );

        TrackStage::where('track_id', $track->id)->delete();

        $phase = TrackStage::create([
            'track_id' => $track->id,
            'parent_id' => null,
            'stage_kind' => 'phase',
            'sequence_order' => 1,
            'name' => 'مشروع فصلي',
            'is_decisive' => false,
        ]);

        TrackStage::create([
            'track_id' => $track->id,
            'parent_id' => $phase->id,
            'stage_kind' => 'step',
            'sequence_order' => 1,
            'name' => $schedulingStages['seminar']->name,
            'academic_stage_id' => $schedulingStages['seminar']->id,
            'is_decisive' => false,
        ]);

        return $track->fresh(['stages']);
    }

    private function ensureRoom(int $universityId): AvailableRoom
    {
        return AvailableRoom::updateOrCreate(
            ['university_id' => $universityId, 'name' => 'قاعة تجربة المسار A101'],
            ['building' => 'مبنى الهندسة', 'is_premium' => false],
        );
    }

    /** @param User[] $extraMembers */
    private function ensureCommittee(int $universityId, string $name, User $chair, array $extraMembers): Committee
    {
        $committee = Committee::updateOrCreate(
            ['university_id' => $universityId, 'name' => $name],
            ['description' => 'لجنة تجريبية لتسجيل نتائج السيمنار', 'is_active' => true],
        );

        $committee->members()->sync([]);
        $committee->members()->attach($chair->id, ['role' => 'chair']);

        foreach ($extraMembers as $member) {
            $committee->members()->attach($member->id, ['role' => 'member']);
        }

        return $committee->fresh('members');
    }

  private function printSummary(array $teams, array $projectIds, Carbon $defenseDate, Track $track): void
    {
        $this->command?->newLine();
        $this->command?->info('═══════════════════════════════════════════════════════');
        $this->command?->info('  تجربة مسار التخرج — حسابات الدخول (كلمة المرور: password)');
        $this->command?->info('═══════════════════════════════════════════════════════');
        $this->command?->newLine();

        $rows = [
            ['مدير الجامعة', 'track-admin@syrian-private.local', 'تسجيل النتيجة + إدارة المسار والجدولة'],
            ['رئيس لجنة صباحية', 'track-chair-am@syrian-private.local', 'تسجيل نتيجة فريق السيمنار أ'],
            ['رئيسة لجنة مسائية', 'track-chair-pm@syrian-private.local', 'تسجيل نتيجة فريق السيمنار ب'],
            ['مشرف', 'track-supervisor@syrian-private.local', 'مشرف المشاريع التجريبية'],
            ['طالب 1 (مالك فريق أ)', 'track-student-01@syrian-private.local', 'مشروع #'.($projectIds[0] ?? '?').' — سيمنار منتهٍ'],
            ['طالب 4 (مالكة فريق ب)', 'track-student-04@syrian-private.local', 'مشروع #'.($projectIds[1] ?? '?').' — سيمنار منتهٍ'],
            ['طالب 6 (تجاوز السيمنار)', 'track-student-06@syrian-private.local', 'على مشروع التخرج 1'],
        ];

        foreach ($rows as [$role, $email, $note]) {
            $this->command?->line(sprintf('  %-22s  %-40s  %s', $role, $email, $note));
        }

        $this->command?->newLine();
        $this->command?->info("مسار: {$track->name} (id: {$track->id})");
        $this->command?->info("تاريخ المناقشات التجريبية: {$defenseDate->toDateString()} (أمس)");
        $this->command?->newLine();
        $this->command?->info('خطوات التجربة:');
        $this->command?->line('  1. سجّل دخول track-chair-am@ أو track-chair-pm@');
        $this->command?->line('  2. اذهب إلى جدولي أو افتح المشروع من القائمة');
        $this->command?->line('  3. في تبويب «المناقشة» سجّل النتيجة (السيمنار غير مصيري → إكمال المرحلة)');
        $this->command?->line('  4. سجّل دخول track-student-06@ وقدّم مقترحاً جديداً بعد إكمال مشروع زميله');
        $this->command?->newLine();
    }
}

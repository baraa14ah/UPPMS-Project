<?php

namespace Database\Seeders;

use App\Models\AcademicStageConfig;
use App\Models\AvailableRoom;
use App\Models\Committee;
use App\Models\DoctorAvailability;
use App\Models\Project;
use App\Models\ProjectProposal;
use App\Models\Role;
use App\Models\StudentProgress;
use App\Models\Track;
use App\Models\TrackStage;
use App\Models\University;
use App\Models\User;
use App\Services\UniversitySchedulingBootstrapService;
use App\Support\TrackStageHierarchy;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

/**
 * Dense “live campus” demo for Syrian Private University (slug: spu).
 *
 * Usage:
 *   php artisan db:seed --class=SpuCampusDemoSeeder
 *
 * All accounts use password: password
 *
 * Idempotent for SPU only — does not touch other universities.
 */
class SpuCampusDemoSeeder extends Seeder
{
    private const UNIVERSITY_SLUG = 'spu';

    private const PASSWORD = 'password';

    private const TRACK_NAME = 'مسار هندسة الحاسوب 2026';

    private const STUDENT_COUNT = 28;

    private const SUPERVISOR_COUNT = 10;

    private const SUPERVISOR_NAMES = [
        'د. أحمد الحلبي',
        'د. سامر العلي',
        'د. لينا الخوري',
        'د. محمد الشامي',
        'د. هدى ناصر',
        'د. كريم سعد',
        'د. رامي جابر',
        'د. ياسمين حمدان',
        'د. باسل عوض',
        'د. مريم قاسم',
    ];

    private const STUDENT_NAMES = [
        'أحمد محمود', 'سارة الخطيب', 'محمد العلي', 'ليلى حسن', 'علي ناصر',
        'نور الدين', 'خالد يوسف', 'رنا فؤاد', 'يوسف كمال', 'هبة سليم',
        'طارق جابر', 'دانا منصور', 'باسل عبيد', 'مريم قاسم', 'عمر رشيد',
        'سلمى حمدان', 'زياد فاضل', 'فرح إبراهيم', 'كريم سعد', 'ندى عون',
        'حسن المصري', 'ياسمين درويش', 'رامي عبدو', 'لينا شاهين', 'سامي قسيس',
        'هدى مراد', 'وليد خوري', 'نورهان زين',
    ];

    private const PROJECT_TOPICS = [
        'نظام إدارة مكتبة ذكي',
        'تطبيق موبايل لحجز القاعات',
        'منصة تعليم إلكتروني تفاعلية',
        'تحليل بيانات الطلاب بالذكاء الاصطناعي',
        'نظام تتبع مشاريع التخرج',
        'بوابة خدمات جامعية موحدة',
        'تطبيق مراقبة الحضور بالـ QR',
        'منصة مقترحات المشاريع',
        'نظام جدولة الامتحانات الذكي',
        'تطبيق إرشاد أكاديمي',
        'نظام إدارة لجان المناقشة',
        'منصة تقييم الأداء الأكاديمي',
        'تطبيق تعاون فرق المشاريع',
        'نظام أرشفة الوثائق الجامعية',
    ];

    /** Phase names in sequence. */
    private const PHASES = [
        'تطبيقات',
        'مشروع فصلي',
        'تخرج 1',
        'تخرج 2',
    ];

    /** Step display names (index into shared AcademicStageConfig list). */
    private const STEP_NAMES = [
        'سيمنار 1',
        'سيمنار 2',
        'لجنة فنية',
        'مناقشة نهائية',
    ];

    public function run(): void
    {
        $university = $this->ensureUniversity();
        $roles = $this->ensureRoles();

        $admin = $this->seedAdmin($university->id, $roles['admin']);
        $supervisors = $this->seedSupervisors($university->id, $roles['supervisor']);
        $students = $this->seedStudents($university->id, $roles['student']);

        $defenseTypes = $this->ensureDefenseTypes($university);
        $track = $this->ensureComputerEngineeringTrack($university, $defenseTypes);
        $steps = $this->flattenedSteps($track);

        foreach ($students as $student) {
            $student->update(['track_id' => $track->id]);
        }

        $this->seedStudentProgress($students, $track, $steps, $supervisors[0]);
        $committees = $this->seedCommittees($university->id, $supervisors, $defenseTypes);
        $rooms = $this->seedRooms($university->id);
        $projects = $this->seedProjectsAndProposals($university, $students, $supervisors, $steps);
        $this->seedDoctorAvailabilities($university->id, $supervisors, $defenseTypes);

        $this->printSummary(
            $university,
            $admin,
            $supervisors,
            $students,
            $track,
            $steps,
            $committees,
            $rooms,
            $projects,
            $defenseTypes,
        );
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
            $this->command?->info('Created university: syrian private uni (spu)');
        }

        app(UniversitySchedulingBootstrapService::class)->ensureFinalDefenseStage($university);

        return $university;
    }

    /** @return array{admin: int, student: int, supervisor: int} */
    private function ensureRoles(): array
    {
        return [
            'admin' => Role::firstOrCreate(['name' => 'admin'])->id,
            'student' => Role::firstOrCreate(['name' => 'student'])->id,
            'supervisor' => Role::firstOrCreate(['name' => 'supervisor'])->id,
        ];
    }

    private function seedAdmin(int $universityId, int $roleId): User
    {
        return User::updateOrCreate(
            ['email' => 'spu-campus-admin@syrian-private.local'],
            [
                'name' => 'مدير حرم الجامعة الخاصة السورية',
                'password' => self::PASSWORD,
                'role_id' => $roleId,
                'university_id' => $universityId,
                'status' => 'active',
            ],
        );
    }

    /** @return User[] */
    private function seedSupervisors(int $universityId, int $roleId): array
    {
        $supervisors = [];

        for ($i = 1; $i <= self::SUPERVISOR_COUNT; $i++) {
            $num = str_pad((string) $i, 2, '0', STR_PAD_LEFT);
            $supervisor = User::updateOrCreate(
                ['email' => "spu-campus-supervisor-{$num}@syrian-private.local"],
                [
                    'name' => self::SUPERVISOR_NAMES[$i - 1] ?? "د. مشرف الحرم {$num}",
                    'password' => self::PASSWORD,
                    'role_id' => $roleId,
                    'university_id' => $universityId,
                    'status' => 'active',
                ],
            );

            // Required so students can pick this supervisor and proposals stay visible.
            $supervisor->loadMissing('role');
            $supervisor->syncSupervisorUniversities([$universityId], 'active');
            $supervisor->supervisorUniversities()->updateExistingPivot($universityId, [
                'accepting_supervision' => true,
            ]);

            $supervisors[] = $supervisor;
        }

        return $supervisors;
    }

    /** @return User[] */
    private function seedStudents(int $universityId, int $roleId): array
    {
        $students = [];

        for ($i = 1; $i <= self::STUDENT_COUNT; $i++) {
            $num = str_pad((string) $i, 2, '0', STR_PAD_LEFT);
            $students[] = User::updateOrCreate(
                ['email' => "spu-campus-student-{$num}@syrian-private.local"],
                [
                    'name' => self::STUDENT_NAMES[$i - 1] ?? "طالب الحرم {$num}",
                    'password' => self::PASSWORD,
                    'role_id' => $roleId,
                    'university_id' => $universityId,
                    'student_number' => "SPU-2026-{$num}",
                    'status' => 'active',
                ],
            );
        }

        return $students;
    }

    /**
     * Shared defense types reused by every phase step.
     *
     * @return array{seminar_1: AcademicStageConfig, seminar_2: AcademicStageConfig, technical: AcademicStageConfig, final: AcademicStageConfig}
     */
    private function ensureDefenseTypes(University $university): array
    {
        $weekStart = now()->startOfWeek(Carbon::SATURDAY)->addWeek();
        $weekEnd = $weekStart->copy()->addDays(3);
        $workingDays = AcademicStageConfig::defaultAllowedDefenseDays();

        $seminar1 = AcademicStageConfig::updateOrCreate(
            [
                'university_id' => $university->id,
                'stage_key' => AcademicStageConfig::STAGE_KEY_SEMINAR_1,
            ],
            [
                'name' => 'سيمنار 1',
                'duration_minutes' => 45,
                'default_committee_size' => 3,
                'display_order' => 1,
                'defense_period_start' => $weekStart->toDateString(),
                'defense_period_end' => $weekEnd->toDateString(),
                'allowed_defense_days' => $workingDays,
                'day_start_time' => '08:00:00',
                'day_end_time' => '15:00:00',
                'availability_mode' => AcademicStageConfig::AVAILABILITY_FLEXIBLE,
                'availability_open' => true,
                'availability_opened_at' => now(),
                'is_system_stage' => false,
                'applicable_presets' => AcademicStageConfig::STAGE_KEY_PRESET_MAP[AcademicStageConfig::STAGE_KEY_SEMINAR_1],
            ],
        );

        $seminar2 = AcademicStageConfig::updateOrCreate(
            [
                'university_id' => $university->id,
                'stage_key' => AcademicStageConfig::STAGE_KEY_SEMINAR_2,
            ],
            [
                'name' => 'سيمنار 2',
                'duration_minutes' => 45,
                'default_committee_size' => 3,
                'display_order' => 2,
                'defense_period_start' => $weekStart->copy()->addWeeks(1)->toDateString(),
                'defense_period_end' => $weekStart->copy()->addWeeks(1)->addDays(3)->toDateString(),
                'allowed_defense_days' => $workingDays,
                'day_start_time' => '08:00:00',
                'day_end_time' => '15:00:00',
                'availability_mode' => AcademicStageConfig::AVAILABILITY_FLEXIBLE,
                'availability_open' => true,
                'availability_opened_at' => now(),
                'is_system_stage' => false,
                'applicable_presets' => AcademicStageConfig::STAGE_KEY_PRESET_MAP[AcademicStageConfig::STAGE_KEY_SEMINAR_2],
            ],
        );

        $technical = AcademicStageConfig::updateOrCreate(
            [
                'university_id' => $university->id,
                'stage_key' => AcademicStageConfig::STAGE_KEY_TECHNICAL_COMMITTEE,
            ],
            [
                'name' => 'لجنة فنية',
                'duration_minutes' => 60,
                'default_committee_size' => 3,
                'display_order' => 3,
                'defense_period_start' => $weekStart->copy()->addWeeks(2)->toDateString(),
                'defense_period_end' => $weekStart->copy()->addWeeks(2)->addDays(3)->toDateString(),
                'allowed_defense_days' => $workingDays,
                'day_start_time' => '08:00:00',
                'day_end_time' => '15:00:00',
                'availability_mode' => AcademicStageConfig::AVAILABILITY_FLEXIBLE,
                'availability_open' => true,
                'availability_opened_at' => now(),
                'is_system_stage' => false,
                'applicable_presets' => AcademicStageConfig::STAGE_KEY_PRESET_MAP[AcademicStageConfig::STAGE_KEY_TECHNICAL_COMMITTEE],
            ],
        );

        $final = app(UniversitySchedulingBootstrapService::class)->ensureFinalDefenseStage($university);
        $finalStart = $weekStart->copy()->addWeeks(3);
        $final->update([
            'name' => UniversitySchedulingBootstrapService::FINAL_DEFENSE_NAME,
            'duration_minutes' => 90,
            'default_committee_size' => 4,
            'display_order' => 4,
            'defense_period_start' => $finalStart->toDateString(),
            'defense_period_end' => $finalStart->copy()->addDays(3)->toDateString(),
            'allowed_defense_days' => $workingDays,
            'day_start_time' => '09:00:00',
            'day_end_time' => '17:00:00',
            'availability_mode' => AcademicStageConfig::AVAILABILITY_MANDATORY,
            'mandatory_slots' => [
                ['day_of_week' => 6, 'start_time' => '09:00:00', 'end_time' => '17:00:00'],
                ['day_of_week' => 0, 'start_time' => '09:00:00', 'end_time' => '17:00:00'],
                ['day_of_week' => 1, 'start_time' => '09:00:00', 'end_time' => '17:00:00'],
                ['day_of_week' => 2, 'start_time' => '09:00:00', 'end_time' => '17:00:00'],
            ],
            'availability_open' => false,
            'applicable_presets' => AcademicStageConfig::STAGE_KEY_PRESET_MAP[AcademicStageConfig::STAGE_KEY_FINAL_DEFENSE],
        ]);

        return [
            'seminar_1' => $seminar1->fresh(),
            'seminar_2' => $seminar2->fresh(),
            'technical' => $technical->fresh(),
            'final' => $final->fresh(),
        ];
    }

    /**
     * @param array{seminar_1: AcademicStageConfig, seminar_2: AcademicStageConfig, technical: AcademicStageConfig, final: AcademicStageConfig} $defenseTypes
     */
    private function ensureComputerEngineeringTrack(University $university, array $defenseTypes): Track
    {
        $track = Track::updateOrCreate(
            [
                'university_id' => $university->id,
                'name' => self::TRACK_NAME,
            ],
            [
                'description' => 'مسار تجريبي كثيف لحرم الجامعة الخاصة السورية — هندسة الحاسوب 2026',
                'is_active' => true,
            ],
        );

        // Clear progress first, then children, then phases (self-FK safe).
        StudentProgress::where('track_id', $track->id)->delete();
        TrackStage::where('track_id', $track->id)->whereNotNull('parent_id')->delete();
        TrackStage::where('track_id', $track->id)->whereNull('parent_id')->delete();

        $stageConfigs = [
            $defenseTypes['seminar_1'],
            $defenseTypes['seminar_2'],
            $defenseTypes['technical'],
            $defenseTypes['final'],
        ];

        foreach (self::PHASES as $phaseIndex => $phaseName) {
            $phase = TrackStage::create([
                'track_id' => $track->id,
                'parent_id' => null,
                'stage_kind' => TrackStageHierarchy::KIND_PHASE,
                'sequence_order' => $phaseIndex + 1,
                'name' => $phaseName,
                'description' => "مرحلة {$phaseName}",
                'is_decisive' => false,
                'academic_stage_id' => null,
            ]);

            foreach (self::STEP_NAMES as $stepIndex => $stepName) {
                $config = $stageConfigs[$stepIndex];
                $isFinalStep = $stepIndex === count(self::STEP_NAMES) - 1;

                TrackStage::create([
                    'track_id' => $track->id,
                    'parent_id' => $phase->id,
                    'stage_kind' => TrackStageHierarchy::KIND_STEP,
                    'sequence_order' => $stepIndex + 1,
                    'name' => $stepName,
                    'description' => "{$phaseName} — {$stepName}",
                    'academic_stage_id' => $config->id,
                    'is_decisive' => $isFinalStep,
                ]);
            }
        }

        return $track->fresh(['stages']);
    }

    /**
     * @return TrackStage[]
     */
    private function flattenedSteps(Track $track): array
    {
        return TrackStageHierarchy::flattenedActionableSteps($track)->values()->all();
    }

    /**
     * All students currently at the last sub-track's final defense step
     * (تخرج 2 · مناقشة نهائية) so projects share one phase for scheduling demos.
     *
     * @param User[] $students
     * @param TrackStage[] $steps  flat list of actionable steps
     */
    private function seedStudentProgress(array $students, Track $track, array $steps, User $recorder): void
    {
        $totalSteps = count($steps);
        if ($totalSteps === 0) {
            return;
        }

        $current = $totalSteps - 1; // last step of last phase = مناقشة نهائية

        foreach ($students as $student) {
            for ($s = 0; $s < $current; $s++) {
                StudentProgress::updateOrCreate(
                    [
                        'student_id' => $student->id,
                        'track_id' => $track->id,
                        'track_stage_id' => $steps[$s]->id,
                    ],
                    [
                        'status' => 'passed',
                        'completed_at' => now()->subWeeks($totalSteps - $s),
                        'defense_result_recorded_at' => now()->subWeeks($totalSteps - $s),
                        'defense_result_recorded_by' => $recorder->id,
                    ],
                );
            }

            StudentProgress::updateOrCreate(
                [
                    'student_id' => $student->id,
                    'track_id' => $track->id,
                    'track_stage_id' => $steps[$current]->id,
                ],
                [
                    'status' => 'in_progress',
                    'completed_at' => null,
                    'defense_result_recorded_at' => null,
                    'defense_result_recorded_by' => null,
                ],
            );

            // Drop stale progress rows if this seeder previously used other steps.
            StudentProgress::query()
                ->where('student_id', $student->id)
                ->where('track_id', $track->id)
                ->whereNotIn('track_stage_id', collect($steps)->take($current + 1)->pluck('id'))
                ->delete();
        }
    }

    /**
     * @param User[] $supervisors
     * @param array{seminar_1: AcademicStageConfig, seminar_2: AcademicStageConfig, technical: AcademicStageConfig, final: AcademicStageConfig} $defenseTypes
     * @return Committee[]
     */
    private function seedCommittees(int $universityId, array $supervisors, array $defenseTypes): array
    {
        $defs = [
            [
                'name' => 'لجنة سيمنار 1 — حرم SPU',
                'description' => 'لجنة مخصصة لمناقشة سيمنار 1',
                'chair' => 0,
                'members' => [1, 2],
                'stage' => 'seminar_1',
            ],
            [
                'name' => 'لجنة سيمنار 2 — حرم SPU',
                'description' => 'لجنة مخصصة لمناقشة سيمنار 2',
                'chair' => 3,
                'members' => [4, 5],
                'stage' => 'seminar_2',
            ],
            [
                'name' => 'لجنة فنية — حرم SPU',
                'description' => 'لجنة مخصصة للمراجعة الفنية',
                'chair' => 6,
                'members' => [7, 0],
                'stage' => 'technical',
            ],
            [
                'name' => 'لجنة المناقشة النهائية — حرم SPU',
                'description' => 'لجنة مخصصة للمناقشة النهائية (قاعات مميزة)',
                'chair' => 8,
                'members' => [9, 1],
                'stage' => 'final',
            ],
        ];

        $committees = [];

        foreach ($defs as $def) {
            $committee = Committee::updateOrCreate(
                [
                    'university_id' => $universityId,
                    'name' => $def['name'],
                ],
                [
                    'description' => $def['description'].' — '.$defenseTypes[$def['stage']]->name,
                    'is_active' => true,
                ],
            );

            $committee->members()->sync([]);
            $chair = $supervisors[$def['chair']];
            $committee->members()->attach($chair->id, ['role' => 'chair']);

            foreach ($def['members'] as $memberIndex) {
                $committee->members()->attach($supervisors[$memberIndex]->id, ['role' => 'member']);
            }

            $committees[] = $committee->fresh('members');
        }

        return $committees;
    }

    /** @return AvailableRoom[] */
    private function seedRooms(int $universityId): array
    {
        $definitions = [
            ['name' => 'قاعة الحرم A101', 'building' => 'مبنى الهندسة', 'is_premium' => false],
            ['name' => 'قاعة الحرم A102', 'building' => 'مبنى الهندسة', 'is_premium' => false],
            ['name' => 'قاعة الحرم B201', 'building' => 'مبنى الحاسوب', 'is_premium' => false],
            ['name' => 'قاعة الحرم B202', 'building' => 'مبنى الحاسوب', 'is_premium' => false],
            ['name' => 'قاعة الحرم C301', 'building' => 'مبنى الإدارة', 'is_premium' => false],
            ['name' => 'قاعة المؤتمرات — الحرم', 'building' => 'المركز الرئيسي', 'is_premium' => true],
            ['name' => 'قاعة الندوات الكبرى — الحرم', 'building' => 'المركز الرئيسي', 'is_premium' => true],
        ];

        $rooms = [];
        foreach ($definitions as $def) {
            $rooms[] = AvailableRoom::updateOrCreate(
                [
                    'university_id' => $universityId,
                    'name' => $def['name'],
                ],
                [
                    'building' => $def['building'],
                    'is_premium' => $def['is_premium'],
                ],
            );
        }

        return $rooms;
    }

    /**
     * Projects + approved proposals — all on last sub-track final-defense step.
     *
     * @param User[] $students
     * @param User[] $supervisors
     * @param TrackStage[] $steps
     * @return Project[]
     */
    private function seedProjectsAndProposals(
        University $university,
        array $students,
        array $supervisors,
        array $steps,
    ): array {
        $finalStepId = $steps !== [] ? $steps[array_key_last($steps)]->id : null;
        $projects = [];

        foreach ($students as $offset => $student) {
            $supervisor = $supervisors[$offset % count($supervisors)];
            $topic = self::PROJECT_TOPICS[$offset % count(self::PROJECT_TOPICS)];
            $title = "{$topic} — {$student->student_number}";

            $proposal = ProjectProposal::updateOrCreate(
                [
                    'student_id' => $student->id,
                    'title' => $title,
                ],
                [
                    'university_id' => $university->id,
                    'requested_supervisor_id' => $supervisor->id,
                    'description' => "مقترح معتمد لمشروع تجريبي في مسار هندسة الحاسوب — {$topic}.",
                    'status' => 'approved',
                    'track_stage_id' => $finalStepId,
                ],
            );

            $projects[] = Project::updateOrCreate(
                ['proposal_id' => $proposal->id],
                [
                    'title' => $title,
                    'description' => "مشروع نشط تحت إشراف {$supervisor->name}.",
                    'user_id' => $student->id,
                    'supervisor_id' => $supervisor->id,
                    'university_id' => $university->id,
                    'status' => 'in_progress',
                ],
            );
        }

        return $projects;
    }

    /**
     * Flexible availabilities on open stages so schedule generate readiness can pass.
     *
     * @param User[] $supervisors
     * @param array{seminar_1: AcademicStageConfig, seminar_2: AcademicStageConfig, technical: AcademicStageConfig, final: AcademicStageConfig} $defenseTypes
     */
    private function seedDoctorAvailabilities(int $universityId, array $supervisors, array $defenseTypes): void
    {
        $openStages = [
            $defenseTypes['seminar_1'],
            $defenseTypes['seminar_2'],
            $defenseTypes['technical'],
        ];

        $campusSupervisorIds = collect($supervisors)->pluck('id')->all();

        DoctorAvailability::query()
            ->where('university_id', $universityId)
            ->whereIn('user_id', $campusSupervisorIds)
            ->whereIn('academic_stage_id', collect($openStages)->pluck('id')->all())
            ->delete();

        $patterns = [
            ['days' => [6, 0], 'start' => '08:00:00', 'end' => '12:00:00'],
            ['days' => [0, 1], 'start' => '09:00:00', 'end' => '13:00:00'],
            ['days' => [1, 2], 'start' => '10:00:00', 'end' => '14:00:00'],
            ['days' => [6, 1], 'start' => '08:30:00', 'end' => '12:30:00'],
            ['days' => [6, 0, 1, 2], 'start' => '09:00:00', 'end' => '15:00:00'],
            ['days' => [6, 0, 1, 2], 'start' => '08:00:00', 'end' => '14:00:00'],
            ['days' => [0, 2], 'start' => '11:00:00', 'end' => '16:00:00'],
            ['days' => [6, 2], 'start' => '09:30:00', 'end' => '15:30:00'],
            ['days' => [6, 0, 1], 'start' => '08:00:00', 'end' => '13:00:00'],
            ['days' => [0, 1, 2], 'start' => '10:00:00', 'end' => '15:00:00'],
        ];

        foreach ($openStages as $stage) {
            $allowed = $stage->getAllowedDefenseDaysList();

            foreach ($supervisors as $index => $supervisor) {
                $pattern = $patterns[$index % count($patterns)];
                $days = array_values(array_intersect($pattern['days'], $allowed));
                if ($days === []) {
                    $days = $allowed;
                }

                foreach ($days as $day) {
                    DoctorAvailability::create([
                        'user_id' => $supervisor->id,
                        'university_id' => $universityId,
                        'academic_stage_id' => $stage->id,
                        'day_of_week' => $day,
                        'start_time' => $pattern['start'],
                        'end_time' => $pattern['end'],
                    ]);
                }
            }
        }
    }

    /**
     * @param User[] $supervisors
     * @param User[] $students
     * @param TrackStage[] $steps
     * @param Committee[] $committees
     * @param AvailableRoom[] $rooms
     * @param Project[] $projects
     * @param array<string, AcademicStageConfig> $defenseTypes
     */
    private function printSummary(
        University $university,
        User $admin,
        array $supervisors,
        array $students,
        Track $track,
        array $steps,
        array $committees,
        array $rooms,
        array $projects,
        array $defenseTypes,
    ): void {
        $premiumRooms = collect($rooms)->where('is_premium', true)->count();
        $passed = StudentProgress::where('track_id', $track->id)->where('status', 'passed')->count();
        $inProgress = StudentProgress::where('track_id', $track->id)->where('status', 'in_progress')->count();

        $this->command?->newLine();
        $this->command?->info('══════════════════════════════════════════════════════════════════');
        $this->command?->info('  SPU Campus Demo — حرم الجامعة الخاصة السورية');
        $this->command?->info('  كلمة المرور لجميع الحسابات: password');
        $this->command?->info('══════════════════════════════════════════════════════════════════');
        $this->command?->newLine();
        $this->command?->info("University: {$university->name} (slug: {$university->slug}, id: {$university->id})");
        $this->command?->info("Track:      {$track->name} (id: {$track->id}) — 4 phases × 4 steps = ".count($steps).' actionable');
        $this->command?->info('Defense:    '.implode(' | ', array_map(fn ($s) => $s->name, $defenseTypes)));
        $this->command?->info('Users:      1 admin, '.count($supervisors).' supervisors, '.count($students).' students');
        $this->command?->info('Progress:   '.$passed.' passed, '.$inProgress.' in_progress');
        $this->command?->info('Committees: '.count($committees).' active');
        $this->command?->info('Rooms:      '.count($rooms).' ('.$premiumRooms.' premium)');
        $this->command?->info('Projects:   '.count($projects).' with approved proposals');
        $this->command?->newLine();

        $this->command?->info('─── Logins ───────────────────────────────────────────────────────');
        $this->command?->line(sprintf('  %-14s  %s', 'Admin', $admin->email));
        $this->command?->newLine();
        $this->command?->line('  Supervisors:');
        foreach ($supervisors as $i => $s) {
            $num = str_pad((string) ($i + 1), 2, '0', STR_PAD_LEFT);
            $this->command?->line(sprintf('    %s  %-48s  %s', $num, $s->email, $s->name));
        }
        $this->command?->newLine();
        $this->command?->line('  Students (SPU-2026-01 … SPU-2026-'.str_pad((string) self::STUDENT_COUNT, 2, '0', STR_PAD_LEFT).'):');
        $this->command?->line('    spu-campus-student-01@syrian-private.local … spu-campus-student-'
            .str_pad((string) self::STUDENT_COUNT, 2, '0', STR_PAD_LEFT).'@syrian-private.local');
        $this->command?->newLine();
        $this->command?->info('─── Progress snapshot (sample) ──────────────────────────────────');
        foreach ([0, 7, 12, 18, 23, 26] as $idx) {
            if (!isset($students[$idx])) {
                continue;
            }
            $st = $students[$idx];
            $prog = StudentProgress::where('student_id', $st->id)
                ->where('status', 'in_progress')
                ->with('trackStage')
                ->first();
            $stepLabel = $prog?->trackStage
                ? $prog->trackStage->name.' (stage #'.$prog->track_stage_id.')'
                : '—';
            $this->command?->line(sprintf(
                '  %-12s  %-44s  → %s',
                $st->student_number,
                $st->email,
                $stepLabel,
            ));
        }
        $this->command?->newLine();
        $this->command?->info('Run: php artisan db:seed --class=SpuCampusDemoSeeder');
        $this->command?->newLine();
    }
}

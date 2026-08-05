<?php

namespace Database\Seeders;

use App\Models\AcademicStageConfig;
use App\Models\AvailableRoom;
use App\Models\DoctorAvailability;
use App\Models\Project;
use App\Models\Role;
use App\Models\University;
use App\Models\User;
use App\Services\Scheduling\UniversitySchedulingBootstrapService;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

/**
 * Seeds a rich scheduling demo for syrian private uni (slug: spu).
 *
 * Usage:
 *   php artisan db:seed --class=SchedulingDemoSeeder
 *
 * All demo accounts use password: password
 */
class SchedulingDemoSeeder extends Seeder
{
    private const UNIVERSITY_SLUG = 'spu';

    private const STUDENT_COUNT = 25;

    private const SUPERVISOR_COUNT = 18;

    private const PROJECT_COUNT = 22;

    private const ROOM_COUNT = 8;

    private const STUDENT_FIRST_NAMES = [
        'أحمد', 'محمد', 'علي', 'حسن', 'يوسف', 'عمر', 'خالد', 'سامي', 'رامي', 'كريم',
        'ليلى', 'سارة', 'نور', 'مريم', 'هبة', 'رنا', 'دانا', 'لينا', 'ياسمين', 'سلمى',
        'طارق', 'باسل', 'زياد', 'ندى', 'فرح',
    ];

    private const SUPERVISOR_NAMES = [
        'د. أحمد الحلبي', 'د. سامر العلي', 'د. لينا الخوري', 'د. محمد الشامي',
        'د. هدى ناصر', 'د. كريم سعد', 'د. رامي جابر', 'د. نور الدين',
        'د. ياسمين حمدان', 'د. باسل عوض', 'د. مريم قاسم', 'د. طارق يوسف',
        'د. سارة منصور', 'د. زياد فاضل', 'د. هبة العبد', 'د. عمر رشيد',
        'د. دانا كمال', 'د. فرح إبراهيم',
    ];

    private const PROJECT_TOPICS = [
        'نظام إدارة مكتبة ذكي',
        'تطبيق موبايل لحجز القاعات',
        'منصة تعليم إلكتروني تفاعلية',
        'تحليل بيانات الطلاب بالذكاء الاصطناعي',
        'نظام تتبع مشاريع التخرج',
        'بوابة خدمات جامعية موحدة',
        'تطبيق مراقبة الحضور بالـ QR',
        'منصة مقترحات المشاريع للطلاب',
        'نظام جدولة الامتحانات',
        'تطبيق إرشاد أكاديمي للطلاب',
        'نظام إدارة لجان المناقشة',
        'منصة تقييم الأداء الأكاديمي',
        'تطبيق تعاون فرق المشاريع',
        'نظام أرشفة الوثائق الجامعية',
        'بوابة تواصل المشرفين والطلاب',
        'تطبيق إشعارات الجدول الدراسي',
        'نظام إدارة المختبرات',
        'منصة تسجيل المشاريع',
        'تطبيق متابعة تقدم المشروع',
        'نظام دعم القرارات الأكاديمية',
        'منصة مشاركة الموارد التعليمية',
        'تطبيق جدولة المناقشات',
    ];

    public function run(): void
    {
        $university = University::where('slug', self::UNIVERSITY_SLUG)
            ->orWhere('name', 'syrian private uni')
            ->first();

        if (!$university) {
            $university = University::create([
                'name' => 'syrian private uni',
                'slug' => self::UNIVERSITY_SLUG,
            ]);
            app(UniversitySchedulingBootstrapService::class)->ensureFinalDefenseStage($university);
            $this->command?->info('Created university: syrian private uni');
        }

        $studentRole = Role::firstOrCreate(['name' => 'student']);
        $supervisorRole = Role::firstOrCreate(['name' => 'supervisor']);
        $adminRole = Role::firstOrCreate(['name' => 'admin']);

        $admin = $this->seedAdmin($university->id, $adminRole->id);
        $students = $this->seedStudents($university->id, $studentRole->id);
        $supervisors = $this->seedSupervisors($university->id, $supervisorRole->id);
        $stages = $this->seedAcademicStages($university);
        $seminar = collect($stages)->first(
            fn (AcademicStageConfig $s) => $s->stage_key !== AcademicStageConfig::STAGE_KEY_FINAL_DEFENSE
        );
        if ($seminar) {
            $this->seedAvailabilities($university->id, $supervisors, $seminar);
        }
        $projects = $this->seedProjects($university->id, $students, $supervisors);
        $rooms = $this->seedRooms($university->id);

        $this->printSummary($university, $admin, $students, $supervisors, $projects, $rooms, $stages);
    }

    private function seedAdmin(int $universityId, int $roleId): User
    {
        return User::firstOrCreate(
            ['email' => 'spu-demo-admin@syrian-private.local'],
            [
                'name' => 'مدير جامعة تجريبي',
                'password' => 'password',
                'role_id' => $roleId,
                'university_id' => $universityId,
                'status' => 'active',
            ]
        );
    }

    /** @return User[] */
    private function seedStudents(int $universityId, int $roleId): array
    {
        $students = [];

        for ($i = 1; $i <= self::STUDENT_COUNT; $i++) {
            $num = str_pad((string) $i, 2, '0', STR_PAD_LEFT);
            $firstName = self::STUDENT_FIRST_NAMES[$i - 1] ?? "طالب {$num}";
            $students[] = User::updateOrCreate(
                ['email' => "spu-demo-student-{$num}@syrian-private.local"],
                [
                    'name' => "{$firstName} الطالب {$num}",
                    'password' => 'password',
                    'role_id' => $roleId,
                    'university_id' => $universityId,
                    'student_number' => "SPU-2026-S{$num}",
                    'status' => 'active',
                ]
            );
        }

        return $students;
    }

    /** @return User[] */
    private function seedSupervisors(int $universityId, int $roleId): array
    {
        $supervisors = [];

        for ($i = 1; $i <= self::SUPERVISOR_COUNT; $i++) {
            $num = str_pad((string) $i, 2, '0', STR_PAD_LEFT);
            $name = self::SUPERVISOR_NAMES[$i - 1] ?? "د. مشرف تجريبي {$num}";
            $supervisors[] = User::updateOrCreate(
                ['email' => "spu-demo-supervisor-{$num}@syrian-private.local"],
                [
                    'name' => $name,
                    'password' => 'password',
                    'role_id' => $roleId,
                    'university_id' => $universityId,
                    'status' => 'active',
                ]
            );
        }

        return $supervisors;
    }

    /**
     * Supervisor slots scoped to the seminar stage — only on admin-chosen defense days.
     * First 12 supervisors submit; 13–18 remain without slots (pending demo).
     */
    private function seedAvailabilities(int $universityId, array $supervisors, AcademicStageConfig $stage): void
    {
        $allowed = $stage->getAllowedDefenseDaysList();

        // day_of_week: 6=سبت, 0=أحد, 1=اثنين, 2=ثلاثاء — must stay inside $allowed
        $patterns = [
            ['days' => [6], 'start' => '08:00:00', 'end' => '12:00:00'],
            ['days' => [0], 'start' => '09:00:00', 'end' => '13:00:00'],
            ['days' => [1], 'start' => '10:00:00', 'end' => '14:00:00'],
            ['days' => [2], 'start' => '08:30:00', 'end' => '12:30:00'],
            ['days' => [6, 0], 'start' => '09:00:00', 'end' => '15:00:00'],
            ['days' => [1, 2], 'start' => '11:00:00', 'end' => '16:00:00'],
            ['days' => [6, 1], 'start' => '08:00:00', 'end' => '12:00:00'],
            ['days' => [0, 2], 'start' => '13:00:00', 'end' => '17:00:00'],
            ['days' => [6, 0, 1, 2], 'start' => '09:00:00', 'end' => '15:00:00'],
            ['days' => [6, 0, 1, 2], 'start' => '08:00:00', 'end' => '14:00:00'],
            ['days' => [6, 0, 1, 2], 'start' => '10:00:00', 'end' => '16:00:00'],
            ['days' => [6, 0, 1, 2], 'start' => '09:30:00', 'end' => '15:30:00'],
        ];

        DoctorAvailability::where('university_id', $universityId)->delete();

        foreach ($supervisors as $index => $supervisor) {
            if ($index >= 12) {
                continue;
            }

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

    /**
     * @param User[] $students
     * @param User[] $supervisors
     * @return Project[]
     */
    private function seedProjects(int $universityId, array $students, array $supervisors): array
    {
        $projects = [];
        $supervisorCount = count($supervisors);

        for ($i = 0; $i < self::PROJECT_COUNT; $i++) {
            $student = $students[$i];
            $supervisor = $supervisors[$i % $supervisorCount];
            $topic = self::PROJECT_TOPICS[$i] ?? 'مشروع تخرج تجريبي ' . ($i + 1);

            $projects[] = Project::updateOrCreate(
                [
                    'title' => $topic,
                    'university_id' => $universityId,
                ],
                [
                    'description' => "مشروع تخرج تجريبي لاختبار الجدولة الذكية — {$topic}.",
                    'user_id' => $student->id,
                    'supervisor_id' => $supervisor->id,
                    'status' => 'active',
                ]
            );
        }

        return $projects;
    }

    /** @return AvailableRoom[] */
    private function seedRooms(int $universityId): array
    {
        $definitions = [
            ['name' => 'قاعة A101', 'building' => 'مبنى الهندسة', 'is_premium' => false],
            ['name' => 'قاعة A102', 'building' => 'مبنى الهندسة', 'is_premium' => false],
            ['name' => 'قاعة B201', 'building' => 'مبنى الإدارة', 'is_premium' => false],
            ['name' => 'قاعة B202', 'building' => 'مبنى الإدارة', 'is_premium' => false],
            ['name' => 'قاعة C301', 'building' => 'مبنى الحاسوب', 'is_premium' => false],
            ['name' => 'قاعة C302', 'building' => 'مبنى الحاسوب', 'is_premium' => false],
            ['name' => 'قاعة المؤتمرات', 'building' => 'المركز الرئيسي', 'is_premium' => true],
            ['name' => 'قاعة الندوات', 'building' => 'المركز الرئيسي', 'is_premium' => true],
        ];

        $rooms = [];
        foreach (array_slice($definitions, 0, self::ROOM_COUNT) as $def) {
            $rooms[] = AvailableRoom::updateOrCreate(
                [
                    'university_id' => $universityId,
                    'name' => $def['name'],
                ],
                [
                    'building' => $def['building'],
                    'is_premium' => $def['is_premium'],
                ]
            );
        }

        return $rooms;
    }

    /** @return AcademicStageConfig[] */
    private function seedAcademicStages(University $university): array
    {
        $bootstrap = app(UniversitySchedulingBootstrapService::class);
        $weekStart = now()->startOfWeek(Carbon::SATURDAY)->addWeek();
        $weekEnd = $weekStart->copy()->addDays(3);
        $workingDays = [6, 0, 1, 2];

        $seminar = AcademicStageConfig::updateOrCreate(
            [
                'university_id' => $university->id,
                'name' => 'السيمنار الأول',
            ],
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
            ]
        );

        $final = $bootstrap->ensureFinalDefenseStage($university);
        $finalStart = $weekStart->copy()->addWeeks(2);
        $final->update([
            'defense_period_start' => $finalStart->toDateString(),
            'defense_period_end' => $finalStart->copy()->addDays(3)->toDateString(),
            'allowed_defense_days' => $workingDays,
            'mandatory_slots' => [
                ['day_of_week' => 6, 'start_time' => '09:00:00', 'end_time' => '17:00:00'],
                ['day_of_week' => 0, 'start_time' => '09:00:00', 'end_time' => '17:00:00'],
            ],
            'availability_open' => false,
        ]);

        return [$seminar, $final->fresh()];
    }

    private function printSummary(
        University $university,
        User $admin,
        array $students,
        array $supervisors,
        array $projects,
        array $rooms,
        array $stages
    ): void {
        $this->command?->info("University: {$university->name} (id: {$university->id})");
        $this->command?->info('Students:    ' . count($students));
        $this->command?->info('Supervisors: ' . count($supervisors));
        $this->command?->info('Projects:    ' . count($projects));
        $this->command?->info('Rooms:       ' . count($rooms));
        $this->command?->info('Stages:      ' . implode(', ', array_map(fn ($s) => $s->name, $stages)));
        $this->command?->newLine();
        $this->command?->info('═══ Demo logins (password: password) ═══');
        $this->command?->line("  Admin:       {$admin->email}");
        $this->command?->line('  Students:    spu-demo-student-01@syrian-private.local … ' . str_pad((string) self::STUDENT_COUNT, 2, '0', STR_PAD_LEFT));
        $this->command?->line('  Supervisors: spu-demo-supervisor-01@syrian-private.local … ' . str_pad((string) self::SUPERVISOR_COUNT, 2, '0', STR_PAD_LEFT));
        $this->command?->newLine();
        $this->command?->info('Suggested flow:');
        $this->command?->line('  1. Admin: set stage period + days → «فتح تسجيل المواعيد»');
        $this->command?->line('  2. Supervisors: Profile → register free time (demo: 12/18 submitted)');
        $this->command?->line('  3. Admin: final defense → set mandatory slots + premium rooms → generate');
        $this->command?->line('  4. Supervisors/students: My Schedule');
    }
}

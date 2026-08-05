<?php

/**
 * Rich scheduling demo data — ready to run the GA engine (individual + committee modes).
 *
 * Usage (from backend last/):
 *   php scripts/seed-scheduling-rich-demo.php
 *
 * Creates / refreshes:
 *   - SPU university base users (via SchedulingDemoSeeder if missing)
 *   - 4 active committees (3 members each)
 *   - 18 eligible seminar projects on an active track
 *   - 6 standard rooms + stage period/days
 *   - Broad supervisor availability for individual mode
 *   - Clears any active schedule for the seminar stage
 */

use App\Models\AcademicStageConfig;
use App\Models\ApprovedSchedule;
use App\Models\AvailableRoom;
use App\Models\Committee;
use App\Models\DefenseSession;
use App\Models\DoctorAvailability;
use App\Models\Project;
use App\Models\ProjectProposal;
use App\Models\StudentProgress;
use App\Models\Track;
use App\Models\TrackStage;
use App\Models\University;
use App\Models\User;
use App\Services\Tracks\TrackService;
use App\Support\TrackStageHierarchy;
use Carbon\Carbon;
use Database\Seeders\SchedulingDemoSeeder;
use Illuminate\Contracts\Console\Kernel;

require __DIR__ . '/../vendor/autoload.php';
$app = require __DIR__ . '/../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

function writeln(string $msg = ''): void
{
    echo $msg . PHP_EOL;
}

writeln('════════════════════════════════════════════════════════');
writeln('  تجهيز بيانات تجريبية غنية للجدولة الذكية');
writeln('════════════════════════════════════════════════════════');
writeln();

$university = University::where('slug', 'spu')
    ->orWhere('name', 'syrian private uni')
    ->first();

if (!$university) {
    writeln('→ تشغيل SchedulingDemoSeeder (أساس الجامعة والمستخدمين)...');
    (new SchedulingDemoSeeder())->run();
    $university = University::where('slug', 'spu')->first();
}

if (!$university) {
    writeln('ERROR: لم تُنشأ الجامعة التجريبية.');
    exit(1);
}

$admin = User::where('email', 'spu-demo-admin@syrian-private.local')->first();
if (!$admin) {
    writeln('→ إعادة تشغيل SchedulingDemoSeeder لإكمال الحسابات...');
    (new SchedulingDemoSeeder())->run();
    $admin = User::where('email', 'spu-demo-admin@syrian-private.local')->first();
}

$supervisors = User::query()
    ->where('university_id', $university->id)
    ->whereHas('role', fn ($q) => $q->where('name', 'supervisor'))
    ->orderBy('id')
    ->get()
    ->values();

$students = User::query()
    ->where('university_id', $university->id)
    ->whereHas('role', fn ($q) => $q->where('name', 'student'))
    ->orderBy('id')
    ->get()
    ->values();

if ($supervisors->count() < 18 || $students->count() < 18) {
    writeln('ERROR: تحتاج 18 مشرفاً و18 طالباً على الأقل. شغّل:');
    writeln('  php artisan db:seed --class=SchedulingDemoSeeder');
    exit(1);
}

// ── Stage ────────────────────────────────────────────────────────────
$weekStart = now()->startOfWeek(Carbon::SATURDAY)->addWeek();
$weekEnd = $weekStart->copy()->addDays(3);
$allowedDays = [6, 0, 1, 2]; // Sat–Tue

$seminar = AcademicStageConfig::updateOrCreate(
    [
        'university_id' => $university->id,
        'name' => 'السيمنار الأول',
    ],
    [
        'duration_minutes' => 45,
        'default_committee_size' => 3,
        'display_order' => 1,
        'defense_period_start' => $weekStart->toDateString(),
        'defense_period_end' => $weekEnd->toDateString(),
        'allowed_defense_days' => $allowedDays,
        'day_start_time' => '08:00:00',
        'day_end_time' => '15:00:00',
        'availability_mode' => AcademicStageConfig::AVAILABILITY_FLEXIBLE,
        'availability_open' => true,
        'availability_opened_at' => now(),
    ]
);

writeln("✓ المرحلة: {$seminar->name} ({$weekStart->toDateString()} → {$weekEnd->toDateString()})");

// ── Clear blocking schedules ─────────────────────────────────────────
ApprovedSchedule::withoutGlobalScopes()
    ->where('university_id', $university->id)
    ->where('academic_stage_id', $seminar->id)
    ->where('status', 'active')
    ->update([
        'status' => 'voided',
        'voided_at' => now(),
        'voided_by' => $admin?->id,
    ]);

DefenseSession::query()
    ->where('status', 'scheduled')
    ->whereHas('approvedSchedule', fn ($q) => $q
        ->withoutGlobalScopes()
        ->where('university_id', $university->id)
        ->where('academic_stage_id', $seminar->id))
    ->update(['status' => 'cancelled']);

writeln('✓ أُلغي أي جدول نشط سابق لهذه المرحلة');

// ── Rooms ────────────────────────────────────────────────────────────
$roomDefs = [
    ['name' => 'قاعة A101', 'building' => 'مبنى الهندسة', 'is_premium' => false],
    ['name' => 'قاعة A102', 'building' => 'مبنى الهندسة', 'is_premium' => false],
    ['name' => 'قاعة B201', 'building' => 'مبنى الإدارة', 'is_premium' => false],
    ['name' => 'قاعة B202', 'building' => 'مبنى الإدارة', 'is_premium' => false],
    ['name' => 'قاعة C301', 'building' => 'مبنى الحاسوب', 'is_premium' => false],
    ['name' => 'قاعة C302', 'building' => 'مبنى الحاسوب', 'is_premium' => false],
    ['name' => 'قاعة المؤتمرات', 'building' => 'المركز الرئيسي', 'is_premium' => true],
    ['name' => 'قاعة الندوات', 'building' => 'المركز الرئيسي', 'is_premium' => true],
];

foreach ($roomDefs as $def) {
    AvailableRoom::updateOrCreate(
        ['university_id' => $university->id, 'name' => $def['name']],
        ['building' => $def['building'], 'is_premium' => $def['is_premium']],
    );
}

$standardRooms = AvailableRoom::where('university_id', $university->id)
    ->where('is_premium', false)
    ->count();
writeln("✓ القاعات: {$standardRooms} عادية (+ قاعتان مميزتان)");

// ── Committees (supervisors 10–18 = indices 9–17) ─────────────────────
// Keep project supervisors = first 9 so committee conflict checks stay clean.
$committeeMemberPool = $supervisors->slice(9, 9)->values(); // 9 people → 3 committees × 3

$committeeDefs = [
    [
        'name' => 'لجنة ألفا',
        'description' => 'لجنة تجريبية — هندسة برمجيات',
        'members' => $committeeMemberPool->slice(0, 3)->values(),
    ],
    [
        'name' => 'لجنة بيتا',
        'description' => 'لجنة تجريبية — نظم معلومات',
        'members' => $committeeMemberPool->slice(3, 3)->values(),
    ],
    [
        'name' => 'لجنة غاما',
        'description' => 'لجنة تجريبية — ذكاء اصطناعي',
        'members' => $committeeMemberPool->slice(6, 3)->values(),
    ],
    [
        'name' => 'لجنة دلتا',
        'description' => 'لجنة احتياطية — تطبيقات موبايل',
        // reuse some from pool with a mix: chair from pool[0], members from other slots
        'members' => collect([
            $committeeMemberPool[0],
            $committeeMemberPool[3],
            $committeeMemberPool[6],
        ]),
    ],
];

// Deactivate stray committees with same names then upsert ours
foreach ($committeeDefs as $def) {
    $committee = Committee::updateOrCreate(
        [
            'university_id' => $university->id,
            'name' => $def['name'],
        ],
        [
            'description' => $def['description'],
            'is_active' => true,
            'version' => 1,
        ]
    );

    $sync = [];
    foreach ($def['members']->values() as $i => $member) {
        $sync[$member->id] = ['role' => $i === 0 ? 'chair' : 'member'];
    }
    $committee->members()->sync($sync);

    $names = $def['members']->pluck('name')->implode(' · ');
    writeln("✓ {$def['name']}: {$names}");
}

// ── Track + seminar step ─────────────────────────────────────────────
$track = Track::updateOrCreate(
    ['university_id' => $university->id, 'name' => 'مسار تجربة الجدولة الغنية'],
    [
        'description' => 'مسار تجريبي لاختبار محرك الجدولة v2 (تهيئة ذكية + إصلاح)',
        'is_active' => true,
    ],
);

Track::where('university_id', $university->id)
    ->where('id', '!=', $track->id)
    ->update(['is_active' => false]);

$phase = TrackStage::updateOrCreate(
    [
        'track_id' => $track->id,
        'stage_kind' => TrackStageHierarchy::KIND_PHASE,
        'sequence_order' => 1,
    ],
    ['name' => 'مرحلة السيمنار', 'description' => null, 'is_decisive' => false],
);

$seminarStep = TrackStage::updateOrCreate(
    [
        'track_id' => $track->id,
        'parent_id' => $phase->id,
        'sequence_order' => 1,
    ],
    [
        'stage_kind' => TrackStageHierarchy::KIND_STEP,
        'name' => 'السيمنار الأول',
        'academic_stage_id' => $seminar->id,
        'is_decisive' => false,
    ],
);

writeln("✓ المسار: {$track->name}");

// ── Projects (18) — supervised by first 9 supervisors only ───────────
$projectSupervisors = $supervisors->take(9)->values();

$topics = [
    'نظام حجز المختبرات الذكي',
    'منصة متابعة التخرج للطلاب',
    'تطبيق إدارة المهام الجماعية',
    'بوابة مقترحات المشاريع',
    'نظام تقييم الأقران',
    'منصة أرشفة التقارير',
    'تطبيق جدولة الاجتماعات',
    'نظام إشعارات الجامعة',
    'منصة تعلم تفاعلي',
    'تطبيق مراقبة التقدم الأكاديمي',
    'نظام إدارة المخزون الطلابي',
    'بوابة خدمات التخرج',
    'تطبيق دعم القرار للمشرفين',
    'منصة مشاركة الموارد',
    'نظام تتبع الحضور الرقمي',
    'مساعد ذكي لمراجعات الكود',
    'لوحة تحليلات مشاريع التخرج',
    'نظام مطابقة لجان المناقشة',
];

// Soft-delete / deactivate old conflicting demo projects for these students at this stage path
$created = 0;
foreach ($topics as $index => $title) {
    $student = $students[$index];
    $supervisor = $projectSupervisors[$index % $projectSupervisors->count()];

    $proposal = ProjectProposal::updateOrCreate(
        [
            'university_id' => $university->id,
            'student_id' => $student->id,
            'title' => $title,
        ],
        [
            'description' => "مقترح تجريبي غني — {$title}",
            'requested_supervisor_id' => $supervisor->id,
            'status' => 'approved',
            'track_stage_id' => $seminarStep->id,
            'resubmission_count' => 0,
        ],
    );

    Project::withoutGlobalScopes()->updateOrCreate(
        [
            'university_id' => $university->id,
            'user_id' => $student->id,
            'title' => $title,
        ],
        [
            'description' => "مشروع جاهز للجدولة — {$title}",
            'supervisor_id' => $supervisor->id,
            'proposal_id' => $proposal->id,
            'status' => 'active',
        ],
    );

    $student->update(['track_id' => $track->id]);

    StudentProgress::updateOrCreate(
        [
            'student_id' => $student->id,
            'track_id' => $track->id,
            'track_stage_id' => $seminarStep->id,
        ],
        ['status' => 'in_progress'],
    );

    $created++;
}

writeln("✓ المشاريع المؤهلة المُحدَّثة: {$created}");

// ── Availability (individual mode) — broad coverage for all supervisors ─
DoctorAvailability::where('university_id', $university->id)
    ->where('academic_stage_id', $seminar->id)
    ->delete();

$patterns = [
    ['days' => [6, 0, 1, 2], 'start' => '08:00:00', 'end' => '16:00:00'],
    ['days' => [6, 0, 1, 2], 'start' => '09:00:00', 'end' => '17:00:00'],
    ['days' => [6, 0, 1], 'start' => '08:30:00', 'end' => '15:30:00'],
    ['days' => [0, 1, 2], 'start' => '09:00:00', 'end' => '16:00:00'],
    ['days' => [6, 1, 2], 'start' => '08:00:00', 'end' => '14:00:00'],
    ['days' => [6, 0, 2], 'start' => '10:00:00', 'end' => '17:00:00'],
];

$availabilityRows = 0;
foreach ($supervisors as $index => $supervisor) {
    $pattern = $patterns[$index % count($patterns)];
    foreach ($pattern['days'] as $day) {
        DoctorAvailability::create([
            'user_id' => $supervisor->id,
            'university_id' => $university->id,
            'academic_stage_id' => $seminar->id,
            'day_of_week' => $day,
            'start_time' => $pattern['start'],
            'end_time' => $pattern['end'],
        ]);
        $availabilityRows++;
    }
}

writeln("✓ مواعيد المشرفين: {$availabilityRows} نافذة ({$supervisors->count()} مشرفاً)");

// ── Sanity checks ────────────────────────────────────────────────────
$eligible = app(TrackService::class)->getProjectsEligibleForAcademicStage($university->id, $seminar);
$activeCommittees = Committee::where('university_id', $university->id)
    ->where('is_active', true)
    ->withCount('members')
    ->get()
    ->filter(fn (Committee $c) => $c->members_count >= 2);

$facultyWithAvail = DoctorAvailability::where('university_id', $university->id)
    ->where('academic_stage_id', $seminar->id)
    ->distinct('user_id')
    ->count('user_id');

writeln();
writeln('────────────────────────────────────────────────────────');
writeln('  النتيجة');
writeln('────────────────────────────────────────────────────────');
writeln("الجامعة:              {$university->name}");
writeln("المشاريع المؤهلة:     {$eligible->count()}");
writeln("اللجان النشطة (≥2):   {$activeCommittees->count()}");
writeln("مشرفون بمواعيد:       {$facultyWithAvail}");
writeln("القاعات العادية:      {$standardRooms}");
writeln('كلمة المرور:          password');
writeln();
writeln('حساب المدير:');
writeln('  ' . ($admin->email ?? 'spu-demo-admin@syrian-private.local'));
writeln();
writeln('خطوات التجربة:');
writeln('  1. سجّل دخول كمدير');
writeln('  2. جدولة المناقشات → السيمنار الأول');
writeln('  3. اختر وضع الأفراد أو وضع اللجان');
writeln('  4. تشغيل الخوارزمية → راجع الجداول والمخالفات');
writeln();

if ($eligible->count() < 10) {
    writeln('⚠️  تحذير: عدد المشاريع المؤهلة قليل — راجع ربط المسار.');
    exit(1);
}

if ($activeCommittees->count() < 3) {
    writeln('⚠️  تحذير: عدد اللجان النشطة أقل من 3.');
    exit(1);
}

writeln('✓ البيانات جاهزة للتجربة.');

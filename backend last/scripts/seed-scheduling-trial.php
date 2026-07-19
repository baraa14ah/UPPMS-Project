<?php

/**
 * Prepare demo data for scheduling algorithm trial (committee + individual modes).
 *
 * Usage: php scripts/seed-scheduling-trial.php
 */

use App\Models\AcademicStageConfig;
use App\Models\ApprovedSchedule;
use App\Models\Committee;
use App\Models\DefenseSession;
use App\Models\Project;
use App\Models\ProjectProposal;
use App\Models\Role;
use App\Models\StudentProgress;
use App\Models\Track;
use App\Models\TrackStage;
use App\Models\University;
use App\Models\User;
use App\Services\TrackService;
use App\Support\TrackStageHierarchy;
use Carbon\Carbon;
use Illuminate\Contracts\Console\Kernel;

require __DIR__ . '/../vendor/autoload.php';
$app = require __DIR__ . '/../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

$university = University::where('slug', 'spu')->first();
if (!$university) {
    echo "Run SchedulingDemoSeeder first.\n";
    exit(1);
}

$admin = User::where('email', 'spu-demo-admin@syrian-private.local')->first();
$seminar = AcademicStageConfig::where('university_id', $university->id)
    ->where('name', 'السيمنار الأول')
    ->first();

if (!$seminar) {
    echo "Seminar stage not found.\n";
    exit(1);
}

$weekStart = now()->startOfWeek(Carbon::SATURDAY)->addWeek();
$seminar->update([
    'defense_period_start' => $weekStart->toDateString(),
    'defense_period_end' => $weekStart->copy()->addDays(3)->toDateString(),
    'allowed_defense_days' => [6, 0, 1, 2],
    'availability_mode' => AcademicStageConfig::AVAILABILITY_FLEXIBLE,
    'availability_open' => true,
    'availability_opened_at' => now(),
]);

// Clear blocking active schedule / sessions for this stage
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

$track = Track::updateOrCreate(
    ['university_id' => $university->id, 'name' => 'مسار التخرج للجدولة'],
    ['description' => 'مسار تجريبي لاختبار الخوارزمية', 'is_active' => true],
);

Track::where('university_id', $university->id)
    ->where('id', '!=', $track->id)
    ->update(['is_active' => false]);

$phase = TrackStage::updateOrCreate(
    ['track_id' => $track->id, 'stage_kind' => TrackStageHierarchy::KIND_PHASE, 'sequence_order' => 1],
    ['name' => 'مرحلة السيمنار', 'description' => null, 'is_decisive' => false],
);

$seminarStep = TrackStage::updateOrCreate(
    ['track_id' => $track->id, 'parent_id' => $phase->id, 'sequence_order' => 1],
    [
        'stage_kind' => TrackStageHierarchy::KIND_STEP,
        'name' => 'السيمنار الأول',
        'academic_stage_id' => $seminar->id,
        'is_decisive' => false,
    ],
);

$students = User::query()
    ->where('university_id', $university->id)
    ->whereHas('role', fn ($q) => $q->where('name', 'student'))
    ->orderBy('id')
    ->get();

$supervisors = User::query()
    ->where('university_id', $university->id)
    ->whereHas('role', fn ($q) => $q->where('name', 'supervisor'))
    ->orderBy('id')
    ->get();

// Committee members are supervisors #2-7 — use #1 and #8-18 as project supervisors
$committeeMemberIds = Committee::query()
    ->where('university_id', $university->id)
    ->where('is_active', true)
    ->with('members:id')
    ->get()
    ->flatMap(fn (Committee $c) => $c->members->pluck('id'))
    ->unique()
    ->all();

$availableSupervisors = $supervisors->filter(
    fn (User $s) => !in_array($s->id, $committeeMemberIds, true),
)->values();

if ($availableSupervisors->count() < 8) {
    echo "Not enough supervisors outside committees.\n";
    exit(1);
}

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
];

$created = 0;
foreach (array_slice($topics, 0, min(15, $students->count())) as $index => $title) {
    $student = $students[$index];
    $supervisor = $availableSupervisors[$index % $availableSupervisors->count()];

    $proposal = ProjectProposal::updateOrCreate(
        [
            'university_id' => $university->id,
            'student_id' => $student->id,
            'title' => $title,
        ],
        [
            'description' => "مقترح تجريبي للجدولة — {$title}",
            'requested_supervisor_id' => $supervisor->id,
            'status' => 'approved',
            'track_stage_id' => $seminarStep->id,
            'resubmission_count' => 0,
        ],
    );

    $project = Project::withoutGlobalScopes()->updateOrCreate(
        [
            'university_id' => $university->id,
            'user_id' => $student->id,
            'title' => $title,
        ],
        [
            'description' => "مشروع تجريبي جاهز للجدولة — {$title}",
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

$eligible = app(TrackService::class)->getProjectsEligibleForAcademicStage($university->id, $seminar);
$committeeCount = Committee::where('university_id', $university->id)->where('is_active', true)->count();

echo "══════════════════════════════════════════\n";
echo "  بيانات تجربة الجدولة جاهزة\n";
echo "══════════════════════════════════════════\n";
echo "الجامعة: {$university->name}\n";
echo "المشاريع المؤهلة للسيمنار: {$eligible->count()}\n";
echo "اللجان النشطة: {$committeeCount}\n";
echo "كلمة المرور: password\n\n";
echo "مدير: spu-demo-admin@syrian-private.local\n";
echo "طلاب: spu-demo-student-01@syrian-private.local … 15\n";
echo "مشرفون (خارج اللجان): spu-demo-supervisor-01, 08–18\n\n";
echo "الخطوات:\n";
echo "  1. سجّل دخول كمدير\n";
echo "  2. جدولة المناقشات → السيمنار الأول → تشغيل الخوارزمية\n";
echo "  3. جرّب وضع اللجان أو الأفراد\n";

<?php

use App\Models\AcademicStageConfig;
use App\Models\Committee;
use App\Models\Project;
use App\Models\University;
use App\Services\TrackService;
use Illuminate\Contracts\Console\Kernel;

require __DIR__ . '/../vendor/autoload.php';
$app = require __DIR__ . '/../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

$university = University::where('slug', 'spu')->first();
if (!$university) {
    echo "Demo university (spu) not found.\n";
    exit(1);
}

$seminar = AcademicStageConfig::where('university_id', $university->id)
    ->where('name', 'السيمنار الأول')
    ->first();

$trackService = app(TrackService::class);
$eligible = $seminar
    ? $trackService->getProjectsEligibleForAcademicStage($university->id, $seminar)
    : collect();

echo "University: {$university->name} (id {$university->id})\n";
echo "Projects total: " . Project::where('university_id', $university->id)->whereNotNull('supervisor_id')->count() . "\n";
echo "Eligible for السيمنار الأول: {$eligible->count()}\n";
echo "Active committees: " . Committee::where('university_id', $university->id)->where('is_active', true)->count() . "\n";
echo "\nSample projects:\n";
foreach ($eligible->take(8) as $p) {
    echo "  #{$p->id} {$p->title} — supervisor: " . ($p->supervisor?->name ?? '?') . "\n";
}

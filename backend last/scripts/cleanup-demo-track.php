<?php

use App\Models\AcademicStageConfig;
use App\Models\StudentProgress;
use App\Models\Track;
use App\Models\TrackStage;
use Illuminate\Contracts\Console\Kernel;

require __DIR__ . '/../vendor/autoload.php';
$app = require __DIR__ . '/../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

$tracks = Track::withoutGlobalScopes()->where('name', 'مسار التخرج العام')->get();
foreach ($tracks as $track) {
    StudentProgress::where('track_id', $track->id)->delete();
    TrackStage::where('track_id', $track->id)->delete();
    $track->delete();
    echo "Deleted track id {$track->id}\n";
}

$deleted = AcademicStageConfig::withoutGlobalScopes()
    ->whereNotNull('stage_key')
    ->where('stage_key', '!=', 'final_defense')
    ->delete();

echo "Deleted bootstrap catalog stages: {$deleted}\n";

<?php

use App\Models\Committee;
use App\Models\Project;
use App\Models\Track;
use App\Models\University;
use App\Models\User;
use Illuminate\Contracts\Console\Kernel;

require __DIR__ . '/../vendor/autoload.php';
$app = require __DIR__ . '/../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

$count = University::count();
echo "Universities total: {$count}\n";

if ($count === 0) {
    echo "No universities found.\n";
    exit(0);
}

foreach (University::select('id', 'name', 'slug')->get() as $u) {
    echo "University {$u->id}: {$u->name} ({$u->slug})\n";
    $uid = $u->id;
    echo "  students: " . User::where('university_id', $uid)->whereHas('role', fn ($q) => $q->where('name', 'student'))->count() . "\n";
    echo "  supervisors: " . User::where('university_id', $uid)->whereHas('role', fn ($q) => $q->where('name', 'supervisor'))->count() . "\n";
    echo "  projects: " . Project::where('university_id', $uid)->count() . "\n";
    echo "  committees: " . Committee::where('university_id', $uid)->where('is_active', true)->count() . "\n";
    echo "  tracks: " . Track::where('university_id', $uid)->where('is_active', true)->count() . "\n";
}

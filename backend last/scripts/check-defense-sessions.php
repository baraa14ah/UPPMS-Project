<?php

require __DIR__ . '/../vendor/autoload.php';

$app = require __DIR__ . '/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$sessions = App\Models\DefenseSession::query()
    ->where('status', 'scheduled')
    ->with(['room:id,name', 'committee:id,name', 'committeeMembers:id,name'])
    ->latest()
    ->take(10)
    ->get();

foreach ($sessions as $session) {
    echo sprintf(
        "Session %d: committee_id=%s room_id=%s members=%d room=%s\n",
        $session->id,
        $session->committee_id ?? 'null',
        $session->room_id ?? 'null',
        $session->committeeMembers->count(),
        $session->room?->name ?? 'null',
    );
}

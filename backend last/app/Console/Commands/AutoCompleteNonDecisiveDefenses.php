<?php

namespace App\Console\Commands;

use App\Services\TrackService;
use Illuminate\Console\Command;

class AutoCompleteNonDecisiveDefenses extends Command
{
    protected $signature = 'defenses:auto-complete-non-decisive';

    protected $description = 'Auto-complete non-decisive defense sessions after their scheduled end time';

    public function handle(TrackService $trackService): int
    {
        $completed = $trackService->autoCompleteExpiredNonDecisiveSessions();

        $this->info("Auto-completed {$completed} non-decisive defense session(s).");

        return self::SUCCESS;
    }
}

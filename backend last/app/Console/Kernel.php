<?php

namespace App\Console;

use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Console\Kernel as ConsoleKernel;

class Kernel extends ConsoleKernel
{
    /** Define the application's scheduled command tasks. */
    protected function schedule(Schedule $schedule): void
    {
        $schedule->call(function () {
            if (class_exists(\App\Models\IdeationRequest::class)) {
                \App\Models\IdeationRequest::where('created_at', '<', now()->subDays(90))->delete();
            }

            \App\Models\TaskGenerationLog::where('created_at', '<', now()->subDays(90))->delete();
        })->daily()->description('Purge old AI request logs');

        $schedule->command('xml:archive-old-records')->monthly()->description('Archive expired XML authorized records');

        $schedule->command('defenses:auto-complete-non-decisive')
            ->everyFiveMinutes()
            ->description('Auto-complete non-decisive defenses after scheduled end time');
    }

    /** Register console commands and route closures. */
    protected function commands(): void
    {
        $this->load(__DIR__.'/Commands');

        require base_path('routes/console.php');
    }
}

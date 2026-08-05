<?php

namespace App\Providers;

use App\Scheduling\EvolutionaryOperators;
use App\Scheduling\FitnessCalculator;
use App\Scheduling\PopulationManager;
use App\Services\Scheduling\GeneticSchedulerService;
use App\Services\Notifications\NotificationService;
use App\Services\Scheduling\ScheduleApprovalService;
use App\Services\Committees\CommitteeService;
use App\Services\Tracks\TrackService;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(FitnessCalculator::class, function () {
            return new FitnessCalculator();
        });

        $this->app->singleton(PopulationManager::class, function () {
            return new PopulationManager();
        });

        $this->app->singleton(EvolutionaryOperators::class, function () {
            return new EvolutionaryOperators();
        });

        $this->app->singleton(GeneticSchedulerService::class, function ($app) {
            return new GeneticSchedulerService(
                $app->make(FitnessCalculator::class),
                $app->make(PopulationManager::class),
                $app->make(EvolutionaryOperators::class),
                $app->make(TrackService::class),
            );
        });

        $this->app->singleton(ScheduleApprovalService::class, function ($app) {
            return new ScheduleApprovalService(
                $app->make(NotificationService::class)
            );
        });

        $this->app->singleton(CommitteeService::class, function ($app) {
            return new CommitteeService(
                $app->make(NotificationService::class)
            );
        });

        $this->app->singleton(TrackService::class, function ($app) {
            return new TrackService(
                $app->make(NotificationService::class)
            );
        });
    }

    /** Bootstrap application services after registration. */
    public function boot(): void
    {
    }
}

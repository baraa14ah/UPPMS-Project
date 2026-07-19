<?php

namespace Tests\Unit;

use App\Models\AcademicStageConfig;
use App\Models\AvailableRoom;
use App\Models\User;
use App\Scheduling\AlgorithmConfig;
use App\Scheduling\Chromosome;
use App\Scheduling\EvolutionaryOperators;
use App\Scheduling\FitnessCalculator;
use App\Scheduling\Gene;
use App\Scheduling\PopulationManager;
use App\Scheduling\SchedulingContext;
use App\Scheduling\TimeSlot;
use Tests\TestCase;

class SmartInitAndRepairTest extends TestCase
{
    /** @test */
    public function initialize_returns_requested_population_size(): void
    {
        $context = $this->createContextWithTwoProjects();
        $manager = new PopulationManager();

        $population = $manager->initialize($context, 20);

        $this->assertCount(20, $population);
        $this->assertContainsOnlyInstancesOf(Chromosome::class, $population);
    }

    /** @test */
    public function greedy_chromosome_avoids_room_double_booking_when_possible(): void
    {
        $context = $this->createContextWithTwoProjects();
        $manager = new PopulationManager();

        $chromosome = $manager->createGreedyChromosome($context);
        $calculator = new FitnessCalculator();
        $breakdown = $calculator->evaluate($chromosome, $context);

        $roomViolations = array_filter(
            $breakdown->violations,
            fn ($v) => $v->type === 'room_double_booking'
        );

        $this->assertEmpty($roomViolations);
    }

    /** @test */
    public function repair_resolves_room_double_booking(): void
    {
        $context = $this->createContextWithTwoProjects();
        $slot = new TimeSlot(0, '09:00:00', '10:00:00');

        $chromosome = new Chromosome([
            new Gene(1, 'Project A', 10, 'Sup A', [
                ['userId' => 6, 'name' => 'Dr A', 'email' => 'a@t.com'],
                ['userId' => 7, 'name' => 'Dr B', 'email' => 'b@t.com'],
            ], $slot, 1),
            new Gene(2, 'Project B', 11, 'Sup B', [
                ['userId' => 8, 'name' => 'Dr C', 'email' => 'c@t.com'],
                ['userId' => 9, 'name' => 'Dr D', 'email' => 'd@t.com'],
            ], $slot->clone(), 1),
        ], 0);

        $operators = new EvolutionaryOperators();
        $repaired = $operators->repair($chromosome, $context);

        $roomIdsAtSlot = [];
        foreach ($repaired->genes as $gene) {
            if ($gene->timeSlot?->getConflictKey() === $slot->getConflictKey()) {
                $roomIdsAtSlot[] = $gene->roomId;
            }
        }

        $this->assertCount(2, array_unique($roomIdsAtSlot));
    }

    /** @test */
    public function repair_resolves_faculty_double_booking(): void
    {
        $context = $this->createContextWithTwoProjects();
        $slot = new TimeSlot(0, '09:00:00', '10:00:00');

        $chromosome = new Chromosome([
            new Gene(1, 'Project A', 10, 'Sup A', [
                ['userId' => 6, 'name' => 'Dr Shared', 'email' => 's@t.com'],
                ['userId' => 7, 'name' => 'Dr B', 'email' => 'b@t.com'],
            ], $slot, 1),
            new Gene(2, 'Project B', 11, 'Sup B', [
                ['userId' => 6, 'name' => 'Dr Shared', 'email' => 's@t.com'],
                ['userId' => 8, 'name' => 'Dr C', 'email' => 'c@t.com'],
            ], $slot->clone(), 2),
        ], 0);

        $operators = new EvolutionaryOperators();
        $repaired = $operators->repair($chromosome, $context);

        $calculator = new FitnessCalculator();
        $breakdown = $calculator->evaluate($repaired, $context);

        $facultyViolations = array_filter(
            $breakdown->violations,
            fn ($v) => $v->type === 'faculty_double_booking'
        );

        $this->assertEmpty($facultyViolations);
    }

    private function createContextWithTwoProjects(): SchedulingContext
    {
        $stage = new AcademicStageConfig();
        $stage->id = 1;
        $stage->university_id = 1;
        $stage->name = 'Seminar';
        $stage->duration_minutes = 60;
        $stage->default_committee_size = 2;
        $stage->allowed_defense_days = [0, 1];

        $projects = collect([
            (object) [
                'id' => 1,
                'title' => 'Project A',
                'supervisor_id' => 10,
                'supervisor' => (object) ['name' => 'Sup A'],
            ],
            (object) [
                'id' => 2,
                'title' => 'Project B',
                'supervisor_id' => 11,
                'supervisor' => (object) ['name' => 'Sup B'],
            ],
        ]);

        $facultyModels = collect([
            tap(new User(), function ($u) {
                $u->id = 6;
                $u->name = 'Dr A';
                $u->email = 'a@t.com';
            }),
            tap(new User(), function ($u) {
                $u->id = 7;
                $u->name = 'Dr B';
                $u->email = 'b@t.com';
            }),
            tap(new User(), function ($u) {
                $u->id = 8;
                $u->name = 'Dr C';
                $u->email = 'c@t.com';
            }),
            tap(new User(), function ($u) {
                $u->id = 9;
                $u->name = 'Dr D';
                $u->email = 'd@t.com';
            }),
        ]);

        $rooms = collect([
            tap(new AvailableRoom(), function ($r) {
                $r->id = 1;
                $r->name = 'Room 1';
            }),
            tap(new AvailableRoom(), function ($r) {
                $r->id = 2;
                $r->name = 'Room 2';
            }),
            tap(new AvailableRoom(), function ($r) {
                $r->id = 3;
                $r->name = 'Room 3';
            }),
        ]);

        $availability = [];
        foreach ([6, 7, 8, 9] as $id) {
            $availability[$id] = [
                ['day_of_week' => 0, 'start_time' => '08:00:00', 'end_time' => '17:00:00'],
                ['day_of_week' => 1, 'start_time' => '08:00:00', 'end_time' => '17:00:00'],
            ];
        }

        return new SchedulingContext(
            universityId: 1,
            stageId: 1,
            stage: $stage,
            projects: $projects,
            eligibleFaculty: $facultyModels,
            rooms: $rooms,
            facultyAvailability: $availability,
            config: new AlgorithmConfig()
        );
    }
}

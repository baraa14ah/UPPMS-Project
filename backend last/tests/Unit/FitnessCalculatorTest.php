<?php

namespace Tests\Unit;

use App\Models\AcademicStageConfig;
use App\Scheduling\AlgorithmConfig;
use App\Scheduling\Chromosome;
use App\Scheduling\FitnessCalculator;
use App\Scheduling\Gene;
use App\Scheduling\SchedulingContext;
use App\Scheduling\TimeSlot;
use Tests\TestCase;

class FitnessCalculatorTest extends TestCase
{

    private FitnessCalculator $calculator;

    protected function setUp(): void
    {
        parent::setUp();
        $this->calculator = new FitnessCalculator();
    }

    /** @test */
    public function supervisor_on_own_committee_applies_hard_penalty(): void
    {
        $context = $this->createMockContext();

        $gene = new Gene(
            projectId: 1,
            projectTitle: 'Test Project',
            supervisorId: 5,
            supervisorName: 'Dr. Supervisor',
            committeeMembers: [
                ['userId' => 5, 'name' => 'Dr. Supervisor', 'email' => 'sup@test.com'],
                ['userId' => 6, 'name' => 'Dr. Other', 'email' => 'other@test.com'],
            ],
            timeSlot: new TimeSlot(0, '09:00:00', '10:00:00')
        );

        $chromosome = new Chromosome([$gene], 0);

        $breakdown = $this->calculator->evaluate($chromosome, $context);

        $this->assertFalse($breakdown->hardConstraintsPassed);
        $this->assertGreaterThan(0, $breakdown->hardViolationCount);
        $this->assertNotEmpty($breakdown->violations);
        $this->assertEquals('supervisor_on_committee', $breakdown->violations[0]->type);
    }

    /** @test */
    public function fewer_hard_violations_rank_higher_than_more_violations(): void
    {
        $context = $this->createMockContext();
        $sharedSlot = new TimeSlot(0, '09:00:00', '10:00:00');

        $oneViolation = new Chromosome([
            new Gene(
                projectId: 1,
                projectTitle: 'Project A',
                supervisorId: 5,
                supervisorName: 'Dr. Supervisor A',
                committeeMembers: [
                    ['userId' => 5, 'name' => 'Dr. Supervisor', 'email' => 'sup@test.com'],
                    ['userId' => 6, 'name' => 'Dr. A', 'email' => 'a@test.com'],
                ],
                timeSlot: $sharedSlot
            ),
        ], 0);

        $twoViolations = new Chromosome([
            new Gene(
                projectId: 1,
                projectTitle: 'Project A',
                supervisorId: 5,
                supervisorName: 'Dr. Supervisor A',
                committeeMembers: [
                    ['userId' => 5, 'name' => 'Dr. Supervisor', 'email' => 'sup@test.com'],
                    ['userId' => 6, 'name' => 'Dr. A', 'email' => 'a@test.com'],
                ],
                timeSlot: $sharedSlot
            ),
            new Gene(
                projectId: 2,
                projectTitle: 'Project B',
                supervisorId: 9,
                supervisorName: 'Dr. Supervisor B',
                committeeMembers: [
                    ['userId' => 5, 'name' => 'Dr. Supervisor', 'email' => 'sup@test.com'],
                    ['userId' => 7, 'name' => 'Dr. B', 'email' => 'b@test.com'],
                ],
                timeSlot: $sharedSlot->clone()
            ),
        ], 0);

        $oneBreakdown = $this->calculator->evaluate($oneViolation, $context);
        $twoBreakdown = $this->calculator->evaluate($twoViolations, $context);

        $oneViolation->setFitness($oneBreakdown);
        $twoViolations->setFitness($twoBreakdown);

        $this->assertLessThan($twoBreakdown->hardViolationCount, $oneBreakdown->hardViolationCount);
        $this->assertLessThan(0, Chromosome::compare($oneViolation, $twoViolations));
    }

    /** @test */
    public function valid_schedule_returns_positive_fitness(): void
    {
        $context = $this->createMockContext();

        $gene = new Gene(
            projectId: 1,
            projectTitle: 'Test Project',
            supervisorId: 5,
            supervisorName: 'Dr. Supervisor',
            committeeMembers: [
                ['userId' => 6, 'name' => 'Dr. A', 'email' => 'a@test.com'],
                ['userId' => 7, 'name' => 'Dr. B', 'email' => 'b@test.com'],
                ['userId' => 8, 'name' => 'Dr. C', 'email' => 'c@test.com'],
            ],
            timeSlot: new TimeSlot(0, '09:00:00', '10:00:00')
        );

        $chromosome = new Chromosome([$gene], 0);

        $breakdown = $this->calculator->evaluate($chromosome, $context);

        $this->assertTrue($breakdown->hardConstraintsPassed);
        $this->assertGreaterThan(0, $breakdown->totalScore);
    }

    /** @test */
    public function faculty_double_booking_returns_zero_fitness(): void
    {
        $context = $this->createMockContext();

        $sharedSlot = new TimeSlot(0, '09:00:00', '10:00:00');

        $genes = [
            new Gene(
                projectId: 1,
                projectTitle: 'Project A',
                supervisorId: 5,
                supervisorName: 'Dr. Supervisor A',
                committeeMembers: [
                    ['userId' => 6, 'name' => 'Dr. A', 'email' => 'a@test.com'],
                    ['userId' => 7, 'name' => 'Dr. B', 'email' => 'b@test.com'],
                ],
                timeSlot: $sharedSlot
            ),
            new Gene(
                projectId: 2,
                projectTitle: 'Project B',
                supervisorId: 9,
                supervisorName: 'Dr. Supervisor B',
                committeeMembers: [
                    ['userId' => 6, 'name' => 'Dr. A', 'email' => 'a@test.com'],
                    ['userId' => 8, 'name' => 'Dr. C', 'email' => 'c@test.com'],
                ],
                timeSlot: $sharedSlot->clone()
            ),
        ];

        $chromosome = new Chromosome($genes, 0);

        $breakdown = $this->calculator->evaluate($chromosome, $context);

        $this->assertFalse($breakdown->hardConstraintsPassed);
        $this->assertEquals(0, $breakdown->totalScore);
        $this->assertEquals('faculty_double_booking', $breakdown->violations[0]->type);
    }

    /** Create a mock scheduling context for testing. */
    private function createMockContext(): SchedulingContext
    {
        $stage = new AcademicStageConfig();
        $stage->id = 1;
        $stage->university_id = 1;
        $stage->name = 'Test Stage';
        $stage->duration_minutes = 60;
        $stage->default_committee_size = 3;

        $facultyAvailability = [
            6 => [['day_of_week' => 0, 'start_time' => '08:00:00', 'end_time' => '17:00:00']],
            7 => [['day_of_week' => 0, 'start_time' => '08:00:00', 'end_time' => '17:00:00']],
            8 => [['day_of_week' => 0, 'start_time' => '08:00:00', 'end_time' => '17:00:00']],
        ];

        return new SchedulingContext(
            universityId: 1,
            stageId: 1,
            stage: $stage,
            projects: collect([]),
            eligibleFaculty: collect([]),
            rooms: collect([]),
            facultyAvailability: $facultyAvailability,
            config: new AlgorithmConfig()
        );
    }
}

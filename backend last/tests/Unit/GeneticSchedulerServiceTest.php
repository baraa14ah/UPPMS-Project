<?php

namespace Tests\Unit;

use App\Exceptions\SchedulingInProgressException;
use App\Models\AcademicStageConfig;
use App\Models\DoctorAvailability;
use App\Models\Project;
use App\Models\Role;
use App\Models\University;
use App\Models\User;
use App\Scheduling\AlgorithmConfig;
use App\Services\GeneticSchedulerService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class GeneticSchedulerServiceTest extends TestCase
{
    use RefreshDatabase;

    private GeneticSchedulerService $scheduler;

    private int $universityId;

    private int $stageId;

    protected function setUp(): void
    {
        parent::setUp();
        $this->scheduler = app(GeneticSchedulerService::class);
    }

    /** @test */
    public function generate_returns_three_candidates(): void
    {
        $this->seedTestData();

        $result = $this->scheduler->generate(
            universityId: $this->universityId,
            stageId: $this->stageId,
            config: new AlgorithmConfig(
                populationSize: 20,
                maxGenerations: 5
            )
        );

        $this->assertTrue($result->success);
        $this->assertCount(3, $result->candidates);
        $this->assertEquals(1, $result->candidates[0]->rank);
        $this->assertEquals(2, $result->candidates[1]->rank);
        $this->assertEquals(3, $result->candidates[2]->rank);
    }

    /** @test */
    public function candidates_are_ranked_by_fitness(): void
    {
        $this->seedTestData();

        $result = $this->scheduler->generate(
            universityId: $this->universityId,
            stageId: $this->stageId,
            config: new AlgorithmConfig(
                populationSize: 20,
                maxGenerations: 5
            )
        );

        $this->assertGreaterThanOrEqual(
            $result->candidates[1]->fitness,
            $result->candidates[0]->fitness
        );
        $this->assertGreaterThanOrEqual(
            $result->candidates[2]->fitness,
            $result->candidates[1]->fitness
        );
    }

    /** @test */
    public function concurrent_run_throws_exception(): void
    {
        $this->seedTestData();

        Cache::put("scheduling:{$this->universityId}:{$this->stageId}", true, 60);

        $this->expectException(SchedulingInProgressException::class);

        $this->scheduler->generate(
            universityId: $this->universityId,
            stageId: $this->stageId
        );
    }

    /** @test */
    public function is_running_returns_true_when_locked(): void
    {
        $this->seedTestData();

        Cache::put("scheduling:{$this->universityId}:{$this->stageId}", true, 60);

        $this->assertTrue($this->scheduler->isRunning($this->universityId, $this->stageId));
    }

    /** @test */
    public function is_running_returns_false_when_not_locked(): void
    {
        $this->seedTestData();

        Cache::forget("scheduling:{$this->universityId}:{$this->stageId}");

        $this->assertFalse($this->scheduler->isRunning($this->universityId, $this->stageId));
    }

    /** @test */
    public function no_supervisor_on_own_committee_in_results(): void
    {
        $this->seedTestData();

        $result = $this->scheduler->generate(
            universityId: $this->universityId,
            stageId: $this->stageId,
            config: new AlgorithmConfig(
                populationSize: 20,
                maxGenerations: 10
            )
        );

        foreach ($result->candidates as $candidate) {
            foreach ($candidate->assignments as $assignment) {
                $memberIds = array_column($assignment['committeeMembers'], 'userId');
                $this->assertNotContains(
                    $assignment['supervisorId'],
                    $memberIds,
                    'Supervisor should not be on their own committee'
                );
            }
        }
    }

    /** Seed test data for scheduling. */
    private function seedTestData(): void
    {
        $university = University::create([
            'name' => 'Test University',
            'slug' => 'test-university-genetic',
            'is_active' => true,
        ]);

        $this->universityId = $university->id;

        $supervisorRole = Role::firstOrCreate(['name' => 'supervisor']);

        $stage = AcademicStageConfig::create([
            'university_id' => $university->id,
            'name' => 'First Seminar',
            'duration_minutes' => 60,
            'default_committee_size' => 3,
            'display_order' => 1,
        ]);

        $this->stageId = $stage->id;

        $faculty = [];
        for ($i = 1; $i <= 10; $i++) {
            $user = User::create([
                'name' => "Dr. Faculty {$i}",
                'email' => "faculty{$i}@test.edu",
                'password' => bcrypt('password'),
                'role_id' => $supervisorRole->id,
                'university_id' => $university->id,
                'status' => 'active',
            ]);
            $faculty[] = $user;

            for ($day = 0; $day <= 4; $day++) {
                DoctorAvailability::create([
                    'user_id' => $user->id,
                    'university_id' => $university->id,
                    'day_of_week' => $day,
                    'start_time' => '09:00:00',
                    'end_time' => '15:00:00',
                ]);
            }
        }

        for ($i = 1; $i <= 5; $i++) {
            Project::create([
                'title' => "Test Project {$i}",
                'description' => 'Test description',
                'university_id' => $university->id,
                'supervisor_id' => $faculty[$i - 1]->id,
                'user_id' => $faculty[0]->id,
                'status' => 'active',
            ]);
        }
    }
}

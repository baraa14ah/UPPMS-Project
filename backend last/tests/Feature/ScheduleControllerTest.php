<?php

namespace Tests\Feature;

use App\Models\AcademicStageConfig;
use App\Models\Role;
use App\Models\University;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ScheduleControllerTest extends TestCase
{
    use DatabaseTransactions;

    private User $admin;
    private int $stageId;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedTestData();
    }

    /** @test */
    public function admin_can_check_schedule_status(): void
    {
        $response = $this->actingAs($this->admin)
            ->getJson("/api/schedules/status/{$this->stageId}");

        $response->assertOk()
            ->assertJsonStructure([
                'is_running',
                'stage_id',
                'has_active_schedule',
            ]);
    }

    /** @test */
    public function non_admin_cannot_access_scheduling(): void
    {
        $studentRole = Role::firstOrCreate(['name' => 'student']);
        $student = User::create([
            'name' => 'Student',
            'email' => 'student-sched-' . uniqid() . '@test.edu',
            'password' => bcrypt('password'),
            'role_id' => $studentRole->id,
            'university_id' => $this->admin->university_id,
            'status' => 'active',
        ]);

        Sanctum::actingAs($student);

        $this->postJson('/api/schedules/generate', [
            'academic_stage_id' => $this->stageId,
        ])->assertForbidden();
    }

    /** @test */
    public function supervisor_can_access_my_sessions(): void
    {
        $supervisorRole = Role::firstOrCreate(['name' => 'supervisor']);
        $supervisor = User::create([
            'name' => 'Supervisor',
            'email' => 'supervisor-sched-' . uniqid() . '@test.edu',
            'password' => bcrypt('password'),
            'role_id' => $supervisorRole->id,
            'university_id' => $this->admin->university_id,
            'status' => 'active',
        ]);

        Sanctum::actingAs($supervisor);

        $this->getJson('/api/schedules/my-sessions')
            ->assertOk()
            ->assertJsonStructure(['sessions', 'total_count']);
    }

    private function seedTestData(): void
    {
        $university = University::firstOrCreate(
            ['slug' => 'test-uni-ctrl'],
            ['name' => 'Test Uni Ctrl', 'is_active' => true]
        );

        $adminRole = Role::firstOrCreate(['name' => 'admin']);

        $this->admin = User::create([
            'name' => 'Admin',
            'email' => 'admin-ctrl-' . uniqid() . '@test.edu',
            'password' => bcrypt('password'),
            'role_id' => $adminRole->id,
            'university_id' => $university->id,
            'status' => 'active',
        ]);

        $stage = AcademicStageConfig::withoutGlobalScopes()->create([
            'university_id' => $university->id,
            'name' => 'First Seminar',
            'duration_minutes' => 60,
            'default_committee_size' => 3,
            'display_order' => 1,
        ]);
        $this->stageId = $stage->id;

        Sanctum::actingAs($this->admin);
    }
}

<?php

namespace Tests\Feature;

use App\Models\AcademicStageConfig;
use App\Models\ApprovedSchedule;
use App\Models\Committee;
use App\Models\DefenseSession;
use App\Models\DoctorAvailability;
use App\Models\Project;
use App\Models\Role;
use App\Models\University;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CommitteeControllerTest extends TestCase
{
    use DatabaseTransactions;

    private User $admin;
    private User $supervisorA;
    private User $supervisorB;
    private User $supervisorC;
    private User $student;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedUsers();
        Sanctum::actingAs($this->admin);
    }

    /** @test */
    public function admin_can_create_committee_with_valid_data(): void
    {
        $response = $this->postJson('/api/committees', [
            'name' => 'Committee Alpha ' . uniqid(),
            'description' => 'Test committee',
            'members' => [
                ['user_id' => $this->supervisorA->id, 'role' => 'chair'],
                ['user_id' => $this->supervisorB->id, 'role' => 'member'],
            ],
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.member_count', 2);
    }

    /** @test */
    public function committee_requires_minimum_two_members(): void
    {
        $this->postJson('/api/committees', [
            'name' => 'Too Small ' . uniqid(),
            'members' => [
                ['user_id' => $this->supervisorA->id, 'role' => 'chair'],
            ],
        ])->assertStatus(422);
    }

    /** @test */
    public function committee_requires_maximum_five_members(): void
    {
        $supervisors = $this->createSupervisors(6);

        $this->postJson('/api/committees', [
            'name' => 'Too Large ' . uniqid(),
            'members' => collect($supervisors)->map(fn ($user, $index) => [
                'user_id' => $user->id,
                'role' => $index === 0 ? 'chair' : 'member',
            ])->all(),
        ])->assertStatus(422);
    }

    /** @test */
    public function duplicate_committee_name_is_rejected(): void
    {
        $name = 'Unique Committee ' . uniqid();

        $this->postJson('/api/committees', [
            'name' => $name,
            'members' => [
                ['user_id' => $this->supervisorA->id, 'role' => 'chair'],
                ['user_id' => $this->supervisorB->id, 'role' => 'member'],
            ],
        ])->assertCreated();

        $this->postJson('/api/committees', [
            'name' => $name,
            'members' => [
                ['user_id' => $this->supervisorA->id, 'role' => 'chair'],
                ['user_id' => $this->supervisorC->id, 'role' => 'member'],
            ],
        ])->assertStatus(422);
    }

    /** @test */
    public function supervisor_cannot_join_two_active_committees(): void
    {
        $this->createCommittee([
            ['user_id' => $this->supervisorA->id, 'role' => 'chair'],
            ['user_id' => $this->supervisorB->id, 'role' => 'member'],
        ]);

        $this->postJson('/api/committees', [
            'name' => 'Second Committee ' . uniqid(),
            'members' => [
                ['user_id' => $this->supervisorA->id, 'role' => 'chair'],
                ['user_id' => $this->supervisorC->id, 'role' => 'member'],
            ],
        ])->assertStatus(422);
    }

    /** @test */
    public function deactivated_committee_member_can_join_another_active_committee(): void
    {
        $inactive = $this->createCommittee([
            ['user_id' => $this->supervisorA->id, 'role' => 'chair'],
            ['user_id' => $this->supervisorB->id, 'role' => 'member'],
        ]);
        $inactive->update(['is_active' => false]);

        $this->postJson('/api/committees', [
            'name' => 'Replacement Committee ' . uniqid(),
            'members' => [
                ['user_id' => $this->supervisorA->id, 'role' => 'chair'],
                ['user_id' => $this->supervisorC->id, 'role' => 'member'],
            ],
        ])->assertCreated();
    }

    /** @test */
    public function non_admin_cannot_access_committee_endpoints(): void
    {
        Sanctum::actingAs($this->student);

        $this->getJson('/api/committees')->assertForbidden();
        $this->postJson('/api/committees', [
            'name' => 'Blocked',
            'members' => [
                ['user_id' => $this->supervisorA->id, 'role' => 'member'],
                ['user_id' => $this->supervisorB->id, 'role' => 'member'],
            ],
        ])->assertForbidden();
    }

    /** @test */
    public function conflict_of_interest_blocks_assignment(): void
    {
        $committee = $this->createCommittee([
            ['user_id' => $this->supervisorA->id, 'role' => 'chair'],
            ['user_id' => $this->supervisorB->id, 'role' => 'member'],
        ]);

        $project = Project::create([
            'title' => 'Conflict Project',
            'description' => 'Test',
            'university_id' => $this->admin->university_id,
            'supervisor_id' => $this->supervisorA->id,
            'status' => 'active',
            'user_id' => $this->student->id,
        ]);

        $defense = $this->createDefenseSession($project);

        $this->postJson("/api/defense-sessions/{$defense->id}/assign-committee", [
            'committee_id' => $committee->id,
        ])->assertStatus(422);
    }

    /** @test */
    public function optimistic_locking_returns_conflict_on_version_mismatch(): void
    {
        $committee = $this->createCommittee([
            ['user_id' => $this->supervisorA->id, 'role' => 'chair'],
            ['user_id' => $this->supervisorB->id, 'role' => 'member'],
        ]);

        $this->putJson("/api/committees/{$committee->id}", [
            'name' => 'Updated Name',
            'version' => 99,
        ])->assertStatus(409);
    }

    /** @test */
    public function deactivation_is_prevented_with_upcoming_defenses(): void
    {
        $committee = $this->createCommittee([
            ['user_id' => $this->supervisorB->id, 'role' => 'chair'],
            ['user_id' => $this->supervisorC->id, 'role' => 'member'],
        ]);

        $project = Project::create([
            'title' => 'Defense Project',
            'description' => 'Test',
            'university_id' => $this->admin->university_id,
            'supervisor_id' => $this->supervisorB->id,
            'status' => 'active',
            'user_id' => $this->student->id,
        ]);

        $defense = $this->createDefenseSession($project);
        $defense->update(['committee_id' => $committee->id]);

        $this->postJson("/api/committees/{$committee->id}/deactivate")
            ->assertStatus(422);
    }

    /** @test */
    public function inactive_committee_cannot_be_assigned(): void
    {
        $committee = $this->createCommittee([
            ['user_id' => $this->supervisorB->id, 'role' => 'chair'],
            ['user_id' => $this->supervisorC->id, 'role' => 'member'],
        ]);
        $committee->update(['is_active' => false]);

        $project = Project::create([
            'title' => 'Inactive Committee Project',
            'description' => 'Test',
            'university_id' => $this->admin->university_id,
            'supervisor_id' => $this->supervisorB->id,
            'status' => 'active',
            'user_id' => $this->student->id,
        ]);

        $defense = $this->createDefenseSession($project);

        $this->postJson("/api/defense-sessions/{$defense->id}/assign-committee", [
            'committee_id' => $committee->id,
        ])->assertStatus(422);
    }

    /** @test */
    public function admin_can_assign_committee_to_defense(): void
    {
        $committee = $this->createCommittee([
            ['user_id' => $this->supervisorB->id, 'role' => 'chair'],
            ['user_id' => $this->supervisorC->id, 'role' => 'member'],
        ]);

        $project = Project::create([
            'title' => 'Assignable Project',
            'description' => 'Test',
            'university_id' => $this->admin->university_id,
            'supervisor_id' => $this->supervisorA->id,
            'status' => 'active',
            'user_id' => $this->student->id,
        ]);

        $defense = $this->createDefenseSession($project);

        $this->postJson("/api/defense-sessions/{$defense->id}/assign-committee", [
            'committee_id' => $committee->id,
        ])
            ->assertOk()
            ->assertJsonPath('data.committee.name', $committee->name);

        $defense->refresh();
        $this->assertSame($committee->id, $defense->committee_id);
        $this->assertCount(2, $defense->committeeAssignments);
    }

    /** @test */
    public function member_mutations_increment_committee_version(): void
    {
        $committee = $this->createCommittee([
            ['user_id' => $this->supervisorA->id, 'role' => 'chair'],
            ['user_id' => $this->supervisorB->id, 'role' => 'member'],
        ]);

        $version = (int) $committee->version;

        $this->postJson("/api/committees/{$committee->id}/members", [
            'user_id' => $this->supervisorC->id,
            'role' => 'member',
            'confirm_affects_defenses' => true,
        ])->assertCreated();

        $committee->refresh();
        $this->assertSame($version + 1, $committee->version);
        $this->assertSame(3, $committee->members()->count());

        $this->deleteJson("/api/committees/{$committee->id}/members/{$this->supervisorC->id}", [
            'confirm_affects_defenses' => true,
        ])->assertOk();

        $committee->refresh();
        $this->assertSame($version + 2, $committee->version);
    }

    /** @test */
    public function availability_can_be_filtered_by_academic_stage(): void
    {
        $committee = $this->createCommittee([
            ['user_id' => $this->supervisorA->id, 'role' => 'chair'],
            ['user_id' => $this->supervisorB->id, 'role' => 'member'],
        ]);

        $stageA = $this->createStage();
        $stageB = $this->createStage();

        foreach ([$this->supervisorA, $this->supervisorB] as $supervisor) {
            DoctorAvailability::create([
                'user_id' => $supervisor->id,
                'university_id' => $this->admin->university_id,
                'academic_stage_id' => $stageA->id,
                'day_of_week' => 2,
                'start_time' => '10:00:00',
                'end_time' => '12:00:00',
            ]);
        }

        DoctorAvailability::create([
            'user_id' => $this->supervisorA->id,
            'university_id' => $this->admin->university_id,
            'academic_stage_id' => $stageB->id,
            'day_of_week' => 4,
            'start_time' => '14:00:00',
            'end_time' => '16:00:00',
        ]);

        $response = $this->getJson("/api/committees/{$committee->id}/availability?academic_stage_id={$stageA->id}");

        $response->assertOk()
            ->assertJsonPath('data.academic_stage_id', $stageA->id)
            ->assertJsonCount(1, 'data.common_availability');
    }

    /** @test */
    public function assign_rejects_committee_from_another_university(): void
    {
        $otherUniversity = University::create([
            'name' => 'Other Uni ' . uniqid(),
            'slug' => 'other-uni-' . uniqid(),
            'is_active' => true,
        ]);

        $foreignCommittee = Committee::withoutGlobalScopes()->create([
            'university_id' => $otherUniversity->id,
            'name' => 'Foreign Committee',
            'is_active' => true,
            'version' => 1,
        ]);
        $foreignCommittee->members()->attach($this->supervisorA->id, ['role' => 'chair']);
        $foreignCommittee->members()->attach($this->supervisorB->id, ['role' => 'member']);

        $project = Project::create([
            'title' => 'Foreign Assign Project',
            'description' => 'Test',
            'university_id' => $this->admin->university_id,
            'supervisor_id' => $this->supervisorA->id,
            'status' => 'active',
            'user_id' => $this->student->id,
        ]);

        $defense = $this->createDefenseSession($project);

        $this->postJson("/api/defense-sessions/{$defense->id}/assign-committee", [
            'committee_id' => $foreignCommittee->id,
        ])->assertNotFound();
    }

    private function seedUsers(): void
    {
        $university = University::firstOrCreate(
            ['slug' => 'test-uni-committee'],
            ['name' => 'Test Uni Committee', 'is_active' => true]
        );

        $adminRole = Role::firstOrCreate(['name' => 'admin']);
        $supervisorRole = Role::firstOrCreate(['name' => 'supervisor']);
        $studentRole = Role::firstOrCreate(['name' => 'student']);

        $this->admin = User::create([
            'name' => 'Committee Admin',
            'email' => 'admin-committee-' . uniqid() . '@test.edu',
            'password' => bcrypt('password'),
            'role_id' => $adminRole->id,
            'university_id' => $university->id,
            'status' => 'active',
        ]);

        $this->supervisorA = $this->makeSupervisor($supervisorRole, $university, 'Supervisor A');
        $this->supervisorB = $this->makeSupervisor($supervisorRole, $university, 'Supervisor B');
        $this->supervisorC = $this->makeSupervisor($supervisorRole, $university, 'Supervisor C');

        $this->student = User::create([
            'name' => 'Student',
            'email' => 'student-committee-' . uniqid() . '@test.edu',
            'password' => bcrypt('password'),
            'role_id' => $studentRole->id,
            'university_id' => $university->id,
            'status' => 'active',
        ]);
    }

    private function makeSupervisor(Role $role, University $university, string $name): User
    {
        return User::create([
            'name' => $name,
            'email' => strtolower(str_replace(' ', '-', $name)) . '-' . uniqid() . '@test.edu',
            'password' => bcrypt('password'),
            'role_id' => $role->id,
            'university_id' => $university->id,
            'status' => 'active',
        ]);
    }

    /** @return array<int, User> */
    private function createSupervisors(int $count): array
    {
        $role = Role::firstOrCreate(['name' => 'supervisor']);
        $university = University::find($this->admin->university_id);
        $users = [$this->supervisorA, $this->supervisorB, $this->supervisorC];

        while (count($users) < $count) {
            $users[] = $this->makeSupervisor($role, $university, 'Extra Supervisor ' . count($users));
        }

        return array_slice($users, 0, $count);
    }

    private function createCommittee(array $members): Committee
    {
        $response = $this->postJson('/api/committees', [
            'name' => 'Committee ' . uniqid(),
            'members' => $members,
        ]);

        $response->assertCreated();

        return Committee::query()->findOrFail($response->json('data.id'));
    }

    private function createDefenseSession(Project $project): DefenseSession
    {
        $schedule = ApprovedSchedule::withoutGlobalScopes()->create([
            'university_id' => $this->admin->university_id,
            'academic_stage_id' => $this->createStage()->id,
            'approved_by' => $this->admin->id,
            'approved_at' => now(),
            'status' => 'active',
            'metadata' => ['fitness' => 100],
        ]);

        return DefenseSession::create([
            'approved_schedule_id' => $schedule->id,
            'project_id' => $project->id,
            'scheduled_day_of_week' => 1,
            'scheduled_date' => now()->addDays(3)->toDateString(),
            'scheduled_start_time' => '10:00:00',
            'scheduled_end_time' => '11:00:00',
            'status' => 'scheduled',
        ]);
    }

    private function createStage(): AcademicStageConfig
    {
        return AcademicStageConfig::withoutGlobalScopes()->create([
            'university_id' => $this->admin->university_id,
            'name' => 'Stage ' . uniqid(),
            'duration_minutes' => 60,
            'default_committee_size' => 3,
            'display_order' => 1,
        ]);
    }
}

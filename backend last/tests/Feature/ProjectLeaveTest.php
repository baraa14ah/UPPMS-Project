<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\ProjectActivity;
use App\Models\ProjectProposal;
use App\Models\Role;
use App\Models\University;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ProjectLeaveTest extends TestCase
{
    use DatabaseTransactions;

    private University $university;
    private User $owner;
    private User $member;
    private User $admin;
    private Project $project;

    protected function setUp(): void
    {
        parent::setUp();

        $this->university = University::firstOrCreate(
            ['slug' => 'leave-project-uni'],
            ['name' => 'Leave Project Uni', 'is_active' => true],
        );

        $studentRole = Role::firstOrCreate(['name' => 'student']);
        $adminRole = Role::firstOrCreate(['name' => 'admin']);

        $this->owner = User::create([
            'name' => 'Owner Student',
            'email' => 'owner-leave-' . uniqid() . '@test.edu',
            'password' => bcrypt('password'),
            'role_id' => $studentRole->id,
            'university_id' => $this->university->id,
            'status' => 'active',
        ]);

        $this->member = User::create([
            'name' => 'Member Student',
            'email' => 'member-leave-' . uniqid() . '@test.edu',
            'password' => bcrypt('password'),
            'role_id' => $studentRole->id,
            'university_id' => $this->university->id,
            'status' => 'active',
        ]);

        $this->admin = User::create([
            'name' => 'Admin',
            'email' => 'admin-leave-' . uniqid() . '@test.edu',
            'password' => bcrypt('password'),
            'role_id' => $adminRole->id,
            'university_id' => $this->university->id,
            'status' => 'active',
        ]);

        $this->project = Project::create([
            'title' => 'Leave Test Project',
            'description' => 'Test',
            'university_id' => $this->university->id,
            'user_id' => $this->owner->id,
            'status' => 'in_progress',
        ]);

        DB::table('project_members')->insert([
            'project_id' => $this->project->id,
            'student_id' => $this->member->id,
            'status' => 'accepted',
            'created_at' => now()->subDay(),
            'updated_at' => now()->subDay(),
        ]);
    }

    /** @test */
    public function student_owner_cannot_delete_project(): void
    {
        Sanctum::actingAs($this->owner);

        $this->deleteJson("/api/project/delete/{$this->project->id}")
            ->assertForbidden();
    }

    /** @test */
    public function member_can_leave_project_and_activity_is_logged(): void
    {
        Sanctum::actingAs($this->member);

        $this->postJson("/api/project/{$this->project->id}/leave")
            ->assertOk();

        $this->assertDatabaseMissing('project_members', [
            'project_id' => $this->project->id,
            'student_id' => $this->member->id,
        ]);

        $this->assertDatabaseHas('project_activities', [
            'project_id' => $this->project->id,
            'user_id' => $this->member->id,
            'action_key' => 'memberLeft',
        ]);
    }

    /** @test */
    public function owner_leave_transfers_ownership_to_oldest_member(): void
    {
        Sanctum::actingAs($this->owner);

        $this->postJson("/api/project/{$this->project->id}/leave")
            ->assertOk()
            ->assertJsonPath('data.new_owner.id', $this->member->id);

        $this->project->refresh();
        $this->assertEquals($this->member->id, $this->project->user_id);

        $this->assertDatabaseHas('project_activities', [
            'project_id' => $this->project->id,
            'user_id' => $this->owner->id,
            'action_key' => 'ownerLeftTransferred',
        ]);
    }

    /** @test */
    public function owner_leave_without_members_deletes_project(): void
    {
        DB::table('project_members')->where('project_id', $this->project->id)->delete();

        Sanctum::actingAs($this->owner);

        $this->postJson("/api/project/{$this->project->id}/leave")
            ->assertOk()
            ->assertJsonPath('data.project_deleted', true);

        $this->assertDatabaseMissing('projects', ['id' => $this->project->id]);
    }

    /** @test */
    public function admin_can_delete_project(): void
    {
        Sanctum::actingAs($this->admin);

        $this->deleteJson("/api/project/delete/{$this->project->id}")
            ->assertOk();

        $this->assertDatabaseMissing('projects', ['id' => $this->project->id]);
    }
}

<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\ProjectProposal;
use App\Models\Role;
use App\Models\University;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ProjectProposalControllerTest extends TestCase
{
    use DatabaseTransactions;

    private University $university;
    private University $otherUniversity;
    private User $student;
    private User $supervisor;
    private User $otherSupervisor;
    private User $admin;
    private User $otherStudent;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedActors();
    }

    /** @test */
    public function student_can_submit_a_proposal(): void
    {
        Sanctum::actingAs($this->student);

        $response = $this->postJson('/api/proposals', $this->proposalPayload());

        $response->assertCreated()
            ->assertJsonPath('data.status', 'pending');

        $this->assertDatabaseHas('project_proposals', [
            'student_id' => $this->student->id,
            'requested_supervisor_id' => $this->supervisor->id,
            'status' => 'pending',
        ]);
    }

    /** @test */
    public function student_can_submit_up_to_three_pending_proposals(): void
    {
        Sanctum::actingAs($this->student);

        $this->postJson('/api/proposals', array_merge($this->proposalPayload(), [
            'title' => 'Proposal One',
        ]))->assertCreated();

        $this->postJson('/api/proposals', array_merge($this->proposalPayload(), [
            'title' => 'Proposal Two',
        ]))->assertCreated();

        $this->postJson('/api/proposals', array_merge($this->proposalPayload(), [
            'title' => 'Proposal Three',
        ]))->assertCreated();

        $this->postJson('/api/proposals', array_merge($this->proposalPayload(), [
            'title' => 'Proposal Four',
        ]))
            ->assertStatus(409)
            ->assertJsonPath('errors.proposal.0', 'max_proposals_reached');

        $this->assertSame(
            3,
            \App\Models\ProjectProposal::withoutGlobalScopes()
                ->where('student_id', $this->student->id)
                ->where('status', 'pending')
                ->count()
        );
    }

    /** @test */
    public function student_can_submit_new_proposal_while_having_rejected_record(): void
    {
        $this->createProposal(['status' => 'rejected']);
        Sanctum::actingAs($this->student);

        $this->postJson('/api/proposals', $this->proposalPayload())
            ->assertCreated();
    }

    /** @test */
    public function student_cannot_submit_when_active_project_exists(): void
    {
        Project::withoutGlobalScopes()->create([
            'title' => 'Existing',
            'description' => 'Active project',
            'user_id' => $this->student->id,
            'university_id' => $this->university->id,
            'status' => 'pending',
        ]);

        Sanctum::actingAs($this->student);

        $this->postJson('/api/proposals', $this->proposalPayload())
            ->assertStatus(409)
            ->assertJsonPath('errors.project.0', 'existing_active_project');
    }

    /** @test */
    public function supervisor_can_approve_and_create_project(): void
    {
        $proposal = $this->createProposal(['status' => 'pending']);
        Sanctum::actingAs($this->supervisor);

        $response = $this->postJson("/api/proposals/{$proposal->id}/approve");

        $response->assertOk()
            ->assertJsonPath('data.project.proposal_id', $proposal->id);

        $proposal->refresh();
        $this->assertSame('approved', $proposal->status);

        $this->assertDatabaseHas('projects', [
            'proposal_id' => $proposal->id,
            'user_id' => $this->student->id,
            'supervisor_id' => $this->supervisor->id,
            'status' => 'pending',
        ]);
    }

    /** @test */
    public function multi_university_supervisor_sees_proposal_and_project_for_membership_university(): void
    {
        // Supervisor primary university differs from the student's university,
        // but has an active membership at the student's university.
        $this->supervisor->forceFill(['university_id' => $this->otherUniversity->id])->save();
        DB::table('supervisor_universities')->updateOrInsert(
            [
                'user_id' => $this->supervisor->id,
                'university_id' => $this->university->id,
            ],
            [
                'status' => 'active',
                'accepting_supervision' => true,
            ]
        );

        $proposal = $this->createProposal([
            'status' => 'pending',
            'university_id' => $this->university->id,
        ]);

        Sanctum::actingAs($this->supervisor);

        $this->getJson('/api/proposals?status=pending')
            ->assertOk()
            ->assertJsonFragment(['id' => $proposal->id]);

        $this->postJson("/api/proposals/{$proposal->id}/approve")
            ->assertOk()
            ->assertJsonPath('data.project.proposal_id', $proposal->id);

        $this->getJson('/api/projects')
            ->assertOk()
            ->assertJsonFragment(['proposal_id' => $proposal->id]);

        Sanctum::actingAs($this->student);
        $this->getJson('/api/projects')
            ->assertOk()
            ->assertJsonFragment(['proposal_id' => $proposal->id]);
    }

    /** @test */
    public function supervisor_can_reject_with_feedback(): void
    {
        $proposal = $this->createProposal(['status' => 'pending']);
        Sanctum::actingAs($this->supervisor);

        $this->postJson("/api/proposals/{$proposal->id}/reject", [
            'feedback' => 'Please narrow the scope.',
        ])->assertOk();

        $proposal->refresh();
        $this->assertSame('rejected', $proposal->status);
        $this->assertSame('Please narrow the scope.', $proposal->supervisor_feedback);
    }

    /** @test */
    public function student_can_resubmit_rejected_proposal(): void
    {
        $proposal = $this->createProposal([
            'status' => 'rejected',
            'supervisor_feedback' => 'Revise',
            'resubmission_count' => 0,
        ]);

        Sanctum::actingAs($this->student);

        $this->putJson("/api/proposals/{$proposal->id}", [
            'title' => 'Revised title',
            'description' => 'Revised description',
            'requested_supervisor_id' => $this->supervisor->id,
        ])->assertOk();

        $proposal->refresh();
        $this->assertSame('pending', $proposal->status);
        $this->assertSame(1, $proposal->resubmission_count);
        $this->assertNull($proposal->supervisor_feedback);
    }

    /** @test */
    public function student_cannot_resubmit_after_three_attempts_with_same_supervisor(): void
    {
        $proposal = $this->createProposal([
            'status' => 'rejected',
            'resubmission_count' => 3,
        ]);

        Sanctum::actingAs($this->student);

        $this->putJson("/api/proposals/{$proposal->id}", [
            'title' => 'One more try',
            'description' => 'Should fail',
            'requested_supervisor_id' => $this->supervisor->id,
        ])
            ->assertStatus(409)
            ->assertJsonPath('errors.resubmission.0', 'max_resubmissions_reached');
    }

    /** @test */
    public function student_cannot_view_other_students_proposal(): void
    {
        $proposal = $this->createProposal(['status' => 'pending']);
        Sanctum::actingAs($this->otherStudent);

        $this->getJson("/api/proposals/{$proposal->id}")
            ->assertForbidden();
    }

    /** @test */
    public function admin_can_reassign_pending_proposal(): void
    {
        $proposal = $this->createProposal(['status' => 'pending']);
        Sanctum::actingAs($this->admin);

        $this->postJson("/api/proposals/{$proposal->id}/reassign", [
            'new_supervisor_id' => $this->otherSupervisor->id,
        ])->assertOk();

        $proposal->refresh();
        $this->assertSame($this->otherSupervisor->id, $proposal->requested_supervisor_id);
    }

    /** @test */
    public function available_supervisors_excludes_non_accepting_supervisors(): void
    {
        $blocked = User::create([
            'name' => 'Blocked Supervisor',
            'email' => 'blocked-sup-' . uniqid() . '@test.edu',
            'password' => bcrypt('password'),
            'role_id' => Role::firstOrCreate(['name' => 'supervisor'])->id,
            'university_id' => $this->university->id,
            'status' => 'active',
        ]);

        $this->attachSupervisorToUniversity($blocked, false);

        Sanctum::actingAs($this->student);

        $ids = collect($this->getJson('/api/supervisors/available')->json('data'))
            ->pluck('id')
            ->all();

        $this->assertContains($this->supervisor->id, $ids);
        $this->assertNotContains($blocked->id, $ids);
    }

    /** @test */
    public function available_supervisors_includes_home_university_supervisor_without_pivot(): void
    {
        $direct = User::create([
            'name' => 'Direct Supervisor',
            'email' => 'direct-sup-' . uniqid() . '@test.edu',
            'password' => bcrypt('password'),
            'role_id' => Role::firstOrCreate(['name' => 'supervisor'])->id,
            'university_id' => $this->university->id,
            'status' => 'active',
        ]);

        Sanctum::actingAs($this->student);

        $ids = collect($this->getJson('/api/supervisors/available')->json('data'))
            ->pluck('id')
            ->all();

        $this->assertContains($direct->id, $ids);
    }

    /** @test */
    public function student_cannot_submit_more_than_three_active_proposals(): void
    {
        $this->createProposal(['status' => 'rejected', 'title' => 'Idea 1']);
        $this->createProposal(['status' => 'rejected', 'title' => 'Idea 2']);
        $this->createProposal(['status' => 'rejected', 'title' => 'Idea 3']);

        Sanctum::actingAs($this->student);

        $this->postJson('/api/proposals', $this->proposalPayload())
            ->assertStatus(409)
            ->assertJsonPath('errors.proposal.0', 'max_proposals_reached');
    }

    /** @test */
    public function approving_one_proposal_deletes_other_student_proposals(): void
    {
        $approved = $this->createProposal(['status' => 'pending', 'title' => 'Chosen idea']);
        $other = $this->createProposal(['status' => 'rejected', 'title' => 'Other idea']);

        Sanctum::actingAs($this->supervisor);

        $this->postJson("/api/proposals/{$approved->id}/approve")->assertOk();

        $this->assertDatabaseHas('project_proposals', ['id' => $approved->id, 'status' => 'approved']);
        $this->assertDatabaseMissing('project_proposals', ['id' => $other->id]);
    }

    /** @test */
    public function student_can_delete_pending_proposal(): void
    {
        $proposal = $this->createProposal(['status' => 'pending']);
        Sanctum::actingAs($this->student);

        $this->deleteJson("/api/proposals/{$proposal->id}")
            ->assertOk();

        $this->assertDatabaseMissing('project_proposals', ['id' => $proposal->id]);
    }

    /** @test */
    public function submitting_proposal_does_not_lock_student_on_track_until_approve(): void
    {
        $track = \App\Models\Track::withoutGlobalScopes()->create([
            'university_id' => $this->university->id,
            'name' => 'Graduation Track ' . uniqid(),
            'is_active' => true,
        ]);
        $phase = \App\Models\TrackStage::create([
            'track_id' => $track->id,
            'name' => 'Phase 1',
            'sequence_order' => 1,
            'stage_kind' => 'phase',
            'parent_id' => null,
        ]);
        $step = \App\Models\TrackStage::create([
            'track_id' => $track->id,
            'name' => 'Step 1',
            'sequence_order' => 1,
            'stage_kind' => 'step',
            'parent_id' => $phase->id,
        ]);

        Sanctum::actingAs($this->student);
        $this->postJson('/api/proposals', array_merge($this->proposalPayload(), [
            'track_stage_id' => $step->id,
        ]))->assertCreated();

        $this->student->refresh();
        $this->assertNull($this->student->track_id);
        $this->assertDatabaseMissing('student_progress', [
            'student_id' => $this->student->id,
            'track_stage_id' => $step->id,
        ]);

        // Second pending proposal still allowed without track lock.
        $this->postJson('/api/proposals', array_merge($this->proposalPayload(), [
            'title' => 'Second idea',
            'track_stage_id' => $step->id,
        ]))->assertCreated();

        Sanctum::actingAs($this->supervisor);
        $proposalId = \App\Models\ProjectProposal::withoutGlobalScopes()
            ->where('student_id', $this->student->id)
            ->where('title', 'Second idea')
            ->value('id');

        $this->postJson("/api/proposals/{$proposalId}/approve")->assertOk();

        $this->student->refresh();
        $this->assertSame((int) $track->id, (int) $this->student->track_id);
        $this->assertDatabaseHas('student_progress', [
            'student_id' => $this->student->id,
            'track_stage_id' => $step->id,
            'status' => 'in_progress',
        ]);
    }

    /** @test */
    public function deleting_proposal_releases_track_so_student_can_submit_again(): void
    {
        $track = \App\Models\Track::withoutGlobalScopes()->create([
            'university_id' => $this->university->id,
            'name' => 'Heal Track ' . uniqid(),
            'is_active' => true,
        ]);
        $phase = \App\Models\TrackStage::create([
            'track_id' => $track->id,
            'name' => 'Phase 1',
            'sequence_order' => 1,
            'stage_kind' => 'phase',
            'parent_id' => null,
        ]);
        $step = \App\Models\TrackStage::create([
            'track_id' => $track->id,
            'name' => 'Step 1',
            'sequence_order' => 1,
            'stage_kind' => 'step',
            'parent_id' => $phase->id,
        ]);

        // Simulate old bug: student locked on track after submitting a proposal.
        $this->student->forceFill(['track_id' => $track->id])->save();
        \App\Models\StudentProgress::withoutGlobalScopes()->create([
            'student_id' => $this->student->id,
            'track_id' => $track->id,
            'track_stage_id' => $step->id,
            'status' => 'in_progress',
        ]);
        $proposal = $this->createProposal([
            'status' => 'pending',
            'track_stage_id' => $step->id,
        ]);

        Sanctum::actingAs($this->student);
        $this->deleteJson("/api/proposals/{$proposal->id}")->assertOk();

        $this->student->refresh();
        $this->assertNull($this->student->track_id);
        $this->assertDatabaseMissing('student_progress', [
            'student_id' => $this->student->id,
            'track_stage_id' => $step->id,
        ]);

        $this->postJson('/api/proposals', array_merge($this->proposalPayload(), [
            'title' => 'Fresh proposal after delete',
            'track_stage_id' => $step->id,
        ]))->assertCreated();
    }

    /** @test */
    public function student_can_have_multiple_pending_proposals_in_database(): void
    {
        $this->createProposal(['status' => 'pending', 'title' => 'First']);

        ProjectProposal::withoutGlobalScopes()->create([
            'university_id' => $this->university->id,
            'student_id' => $this->student->id,
            'requested_supervisor_id' => $this->supervisor->id,
            'title' => 'Second pending',
            'description' => 'Allowed after dropping one-pending trigger',
            'status' => 'pending',
            'resubmission_count' => 0,
        ]);

        $this->assertSame(
            2,
            ProjectProposal::withoutGlobalScopes()
                ->where('student_id', $this->student->id)
                ->where('status', 'pending')
                ->count()
        );
    }

    private function seedActors(): void
    {
        $this->university = University::firstOrCreate(
            ['slug' => 'test-uni-proposals'],
            ['name' => 'Test Uni Proposals', 'is_active' => true]
        );

        $this->otherUniversity = University::firstOrCreate(
            ['slug' => 'other-uni-proposals'],
            ['name' => 'Other Uni Proposals', 'is_active' => true]
        );

        $studentRole = Role::firstOrCreate(['name' => 'student']);
        $supervisorRole = Role::firstOrCreate(['name' => 'supervisor']);
        $adminRole = Role::firstOrCreate(['name' => 'admin']);

        $this->student = User::create([
            'name' => 'Student',
            'email' => 'student-prop-' . uniqid() . '@test.edu',
            'password' => bcrypt('password'),
            'role_id' => $studentRole->id,
            'university_id' => $this->university->id,
            'status' => 'active',
        ]);

        $this->otherStudent = User::create([
            'name' => 'Other Student',
            'email' => 'other-student-prop-' . uniqid() . '@test.edu',
            'password' => bcrypt('password'),
            'role_id' => $studentRole->id,
            'university_id' => $this->university->id,
            'status' => 'active',
        ]);

        $this->supervisor = User::create([
            'name' => 'Supervisor',
            'email' => 'supervisor-prop-' . uniqid() . '@test.edu',
            'password' => bcrypt('password'),
            'role_id' => $supervisorRole->id,
            'university_id' => $this->university->id,
            'status' => 'active',
        ]);

        $this->otherSupervisor = User::create([
            'name' => 'Other Supervisor',
            'email' => 'other-supervisor-prop-' . uniqid() . '@test.edu',
            'password' => bcrypt('password'),
            'role_id' => $supervisorRole->id,
            'university_id' => $this->university->id,
            'status' => 'active',
        ]);

        $this->admin = User::create([
            'name' => 'Admin',
            'email' => 'admin-prop-' . uniqid() . '@test.edu',
            'password' => bcrypt('password'),
            'role_id' => $adminRole->id,
            'university_id' => $this->university->id,
            'status' => 'active',
        ]);

        $this->attachSupervisorToUniversity($this->supervisor, true);
        $this->attachSupervisorToUniversity($this->otherSupervisor, true);
    }

    private function attachSupervisorToUniversity(User $supervisor, bool $accepting): void
    {
        DB::table('supervisor_universities')->updateOrInsert(
            [
                'user_id' => $supervisor->id,
                'university_id' => $this->university->id,
            ],
            [
                'status' => 'active',
                'accepting_supervision' => $accepting,
            ]
        );
    }

    private function proposalPayload(): array
    {
        return [
            'title' => 'Smart Library System',
            'description' => 'A graduation project proposal.',
            'requested_supervisor_id' => $this->supervisor->id,
        ];
    }

    private function createProposal(array $overrides = []): ProjectProposal
    {
        return ProjectProposal::withoutGlobalScopes()->create(array_merge([
            'university_id' => $this->university->id,
            'student_id' => $this->student->id,
            'requested_supervisor_id' => $this->supervisor->id,
            'title' => 'Proposal',
            'description' => 'Description',
            'status' => 'pending',
            'resubmission_count' => 0,
        ], $overrides));
    }
}

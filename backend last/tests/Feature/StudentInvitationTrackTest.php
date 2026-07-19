<?php

namespace Tests\Feature;

use App\Models\AcademicStageConfig;
use App\Models\Project;
use App\Models\ProjectProposal;
use App\Models\Role;
use App\Models\StudentInvitation;
use App\Models\StudentProgress;
use App\Models\Track;
use App\Models\TrackStage;
use App\Models\University;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class StudentInvitationTrackTest extends TestCase
{
    use DatabaseTransactions;

    private University $university;
    private User $owner;
    private User $invitee;
    private User $supervisor;
    private Track $track;
    private TrackStage $stage1;
    private TrackStage $stage2;
    private Project $project;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedScenario();
    }

    /** @test */
    public function student_can_accept_invite_when_eligible_and_progress_syncs(): void
    {
        Sanctum::actingAs($this->invitee);

        $invite = StudentInvitation::create([
            'project_id' => $this->project->id,
            'student_id' => $this->invitee->id,
            'sent_by_id' => $this->owner->id,
            'status' => 'pending',
        ]);

        $this->postJson("/api/student/invitations/{$invite->id}/accept")
            ->assertOk();

        $this->invitee->refresh();
        $this->assertEquals($this->track->id, $this->invitee->track_id);

        $this->assertDatabaseHas('student_progress', [
            'student_id' => $this->invitee->id,
            'track_id' => $this->track->id,
            'track_stage_id' => $this->stage1->id,
            'status' => 'in_progress',
        ]);
    }

    /** @test */
    public function student_cannot_accept_invite_to_advanced_stage(): void
    {
        $advancedProject = $this->createProjectAtStage($this->stage2);

        $invite = StudentInvitation::create([
            'project_id' => $advancedProject->id,
            'student_id' => $this->invitee->id,
            'sent_by_id' => $this->owner->id,
            'status' => 'pending',
        ]);

        Sanctum::actingAs($this->invitee);

        $this->postJson("/api/student/invitations/{$invite->id}/accept")
            ->assertStatus(422);
    }

    /** @test */
    public function invite_is_rejected_when_student_cannot_reach_project_stage(): void
    {
        Sanctum::actingAs($this->owner);

        $advancedProject = $this->createProjectAtStage($this->stage2);

        $this->postJson("/api/project/{$advancedProject->id}/invite-student", [
            'student_id' => $this->invitee->id,
        ])->assertStatus(422);
    }

    /** @test */
    public function available_students_list_excludes_ineligible_track_students(): void
    {
        Sanctum::actingAs($this->owner);

        $advancedProject = $this->createProjectAtStage($this->stage2);

        $response = $this->getJson("/api/project/{$advancedProject->id}/students");
        $response->assertOk();

        $ids = collect($response->json('students'))->pluck('id')->all();
        $this->assertNotContains($this->invitee->id, $ids);
    }

    private function seedScenario(): void
    {
        $this->university = University::firstOrCreate(
            ['slug' => 'invite-track-uni'],
            ['name' => 'Invite Track Uni', 'is_active' => true],
        );

        $studentRole = Role::firstOrCreate(['name' => 'student']);
        $supervisorRole = Role::firstOrCreate(['name' => 'supervisor']);

        $this->owner = User::create([
            'name' => 'Project Owner',
            'email' => 'owner-invite-' . uniqid() . '@test.edu',
            'password' => bcrypt('password'),
            'role_id' => $studentRole->id,
            'university_id' => $this->university->id,
            'status' => 'active',
        ]);

        $this->invitee = User::create([
            'name' => 'Invitee Student',
            'email' => 'invitee-' . uniqid() . '@test.edu',
            'password' => bcrypt('password'),
            'role_id' => $studentRole->id,
            'university_id' => $this->university->id,
            'status' => 'active',
        ]);

        $this->supervisor = User::create([
            'name' => 'Supervisor',
            'email' => 'supervisor-invite-' . uniqid() . '@test.edu',
            'password' => bcrypt('password'),
            'role_id' => $supervisorRole->id,
            'university_id' => $this->university->id,
            'status' => 'active',
        ]);

        DB::table('supervisor_universities')->updateOrInsert(
            [
                'user_id' => $this->supervisor->id,
                'university_id' => $this->university->id,
            ],
            [
                'status' => 'active',
                'accepting_supervision' => true,
            ],
        );

        $stageConfig1 = $this->createAcademicStage('Seminar 1');
        $stageConfig2 = $this->createAcademicStage('Seminar 2');

        $this->track = Track::withoutGlobalScopes()->create([
            'university_id' => $this->university->id,
            'name' => 'Invite Track ' . uniqid(),
            'is_active' => true,
        ]);

        $this->stage1 = TrackStage::create([
            'track_id' => $this->track->id,
            'stage_kind' => 'step',
            'academic_stage_id' => $stageConfig1->id,
            'sequence_order' => 1,
            'name' => $stageConfig1->name,
            'is_decisive' => true,
        ]);

        $this->stage2 = TrackStage::create([
            'track_id' => $this->track->id,
            'stage_kind' => 'step',
            'academic_stage_id' => $stageConfig2->id,
            'sequence_order' => 2,
            'name' => $stageConfig2->name,
            'is_decisive' => true,
        ]);

        $this->owner->update(['track_id' => $this->track->id]);
        StudentProgress::create([
            'student_id' => $this->owner->id,
            'track_id' => $this->track->id,
            'track_stage_id' => $this->stage1->id,
            'status' => 'in_progress',
        ]);

        $this->project = $this->createProjectAtStage($this->stage1);
    }

    private function createProjectAtStage(TrackStage $stage): Project
    {
        $proposal = ProjectProposal::create([
            'university_id' => $this->university->id,
            'student_id' => $this->owner->id,
            'requested_supervisor_id' => $this->supervisor->id,
            'title' => 'Proposal ' . uniqid(),
            'description' => 'Test proposal',
            'status' => 'approved',
            'track_stage_id' => $stage->id,
        ]);

        return Project::create([
            'title' => 'Project ' . uniqid(),
            'description' => 'Test project',
            'university_id' => $this->university->id,
            'user_id' => $this->owner->id,
            'supervisor_id' => $this->supervisor->id,
            'proposal_id' => $proposal->id,
            'status' => 'in_progress',
        ]);
    }

    private function createAcademicStage(string $name): AcademicStageConfig
    {
        return AcademicStageConfig::withoutGlobalScopes()->create([
            'university_id' => $this->university->id,
            'name' => $name . ' ' . uniqid(),
            'duration_minutes' => 60,
            'default_committee_size' => 3,
            'display_order' => 1,
        ]);
    }
}

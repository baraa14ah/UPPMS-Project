<?php

namespace Tests\Feature;

use App\Models\AcademicStageConfig;
use App\Models\ApprovedSchedule;
use App\Models\DefenseSession;
use App\Models\Project;
use App\Models\Role;
use App\Models\Track;
use App\Models\TrackStage;
use App\Models\University;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TrackControllerTest extends TestCase
{
    use DatabaseTransactions;

    private User $admin;
    private User $student;
    private User $otherAdmin;
    private University $university;
    private University $otherUniversity;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedUsers();
        Sanctum::actingAs($this->admin);
    }

    /** @test */
    public function admin_can_create_track_with_stages(): void
    {
        $stage1 = $this->createAcademicStage();
        $stage2 = $this->createAcademicStage();

        $response = $this->postJson('/api/tracks', [
            'name' => 'CS Track ' . uniqid(),
            'description' => 'Test track',
            'stages' => [
                ['academic_stage_id' => $stage1->id],
                ['academic_stage_id' => $stage2->id],
            ],
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.stages.0.sequence_order', 1)
            ->assertJsonPath('data.stages.1.sequence_order', 2)
            ->assertJsonPath('data.stages.0.name', $stage1->name);
    }

    /** @test */
    public function duplicate_track_name_is_rejected(): void
    {
        $name = 'Unique Track ' . uniqid();
        $stage = $this->createAcademicStage();

        $this->postJson('/api/tracks', [
            'name' => $name,
            'stages' => [['academic_stage_id' => $stage->id]],
        ])->assertCreated();

        $this->postJson('/api/tracks', [
            'name' => $name,
            'stages' => [['academic_stage_id' => $stage->id]],
        ])->assertStatus(422);
    }

    /** @test */
    public function admin_can_reorder_stages(): void
    {
        $track = $this->createTrack();
        $stages = $track->stages()->orderBy('sequence_order')->get();

        $this->putJson("/api/tracks/{$track->id}/stages/reorder", [
            'stage_ids' => [$stages[1]->id, $stages[0]->id],
        ])->assertOk()
            ->assertJsonPath('data.stages.0.id', $stages[1]->id);
    }

    /** @test */
    public function student_cannot_access_admin_track_endpoints(): void
    {
        Sanctum::actingAs($this->student);

        $this->getJson('/api/tracks')->assertForbidden();
    }

    /** @test */
    public function prerequisite_blocks_second_stage_proposal_without_passing_first(): void
    {
        $track = $this->createTrack();
        $stages = $track->stages()->orderBy('sequence_order')->get();

        Sanctum::actingAs($this->student);

        $this->postJson('/api/proposals', [
            'title' => 'Stage 2 Proposal',
            'description' => 'Should fail',
            'requested_supervisor_id' => $this->admin->id,
            'track_stage_id' => $stages[1]->id,
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['track_stage_id']);
    }

    /** @test */
    public function first_stage_proposal_auto_assigns_track(): void
    {
        $track = $this->createTrack();
        $firstStage = $track->stages()->orderBy('sequence_order')->first();

        $supervisor = $this->createSupervisor();

        Sanctum::actingAs($this->student);

        $this->postJson('/api/proposals', [
            'title' => 'Stage 1 Proposal ' . uniqid(),
            'description' => 'First stage proposal',
            'requested_supervisor_id' => $supervisor->id,
            'track_stage_id' => $firstStage->id,
        ])->assertCreated();

        $this->student->refresh();
        $this->assertEquals($track->id, $this->student->track_id);
    }

    /** @test */
    public function admin_can_record_defense_result(): void
    {
        $track = $this->createTrack();
        $stage = $track->stages()->orderBy('sequence_order')->first();
        $academicStage = $this->createAcademicStage();
        $stage->update(['academic_stage_id' => $academicStage->id, 'is_decisive' => true]);

        $this->student->update(['track_id' => $track->id]);

        $supervisor = $this->createSupervisor();
        $project = Project::create([
            'title' => 'Defense Project',
            'description' => 'Test',
            'university_id' => $this->university->id,
            'supervisor_id' => $supervisor->id,
            'user_id' => $this->student->id,
            'status' => 'active',
        ]);

        $schedule = ApprovedSchedule::withoutGlobalScopes()->create([
            'university_id' => $this->university->id,
            'academic_stage_id' => $academicStage->id,
            'approved_by' => $this->admin->id,
            'approved_at' => now(),
            'status' => 'active',
            'metadata' => [],
        ]);

        $defense = DefenseSession::create([
            'approved_schedule_id' => $schedule->id,
            'project_id' => $project->id,
            'scheduled_day_of_week' => 1,
            'scheduled_date' => now()->addDay()->toDateString(),
            'scheduled_start_time' => '10:00:00',
            'scheduled_end_time' => '11:00:00',
            'status' => 'scheduled',
        ]);

        $this->postJson("/api/defense-sessions/{$defense->id}/record-result", [
            'result' => 'passed',
        ])->assertOk()
            ->assertJsonPath('data.result', 'passed');
    }

    /** @test */
    public function cross_track_proposal_is_rejected_when_student_already_assigned(): void
    {
        $trackA = $this->createTrack();
        $bStage1 = $this->createAcademicStage();
        $bStage2 = $this->createAcademicStage();
        $trackB = $this->postJson('/api/tracks', [
            'name' => 'Track B ' . uniqid(),
            'stages' => [
                ['academic_stage_id' => $bStage1->id],
                ['academic_stage_id' => $bStage2->id],
            ],
        ])->assertCreated()->json('data');

        $trackBModel = Track::findOrFail($trackB['id']);
        $trackBStage1 = $trackBModel->stages()->orderBy('sequence_order')->first();

        $this->student->update(['track_id' => $trackA->id]);
        $supervisor = $this->createSupervisor();

        Sanctum::actingAs($this->student);

        $this->postJson('/api/proposals', [
            'title' => 'Wrong track proposal',
            'description' => 'Should fail',
            'requested_supervisor_id' => $supervisor->id,
            'track_stage_id' => $trackBStage1->id,
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['track_stage_id']);
    }

    /** @test */
    public function reassignment_preserves_previous_track_progress(): void
    {
        $trackA = $this->createTrack();
        $preserveStage = $this->createAcademicStage();
        $trackB = $this->postJson('/api/tracks', [
            'name' => 'Track Preserve ' . uniqid(),
            'stages' => [['academic_stage_id' => $preserveStage->id]],
        ])->assertCreated()->json('data');

        $firstStageA = $trackA->stages()->orderBy('sequence_order')->first();
        $this->student->update(['track_id' => $trackA->id]);
        \App\Models\StudentProgress::create([
            'student_id' => $this->student->id,
            'track_id' => $trackA->id,
            'track_stage_id' => $firstStageA->id,
            'status' => 'passed',
            'completed_at' => now(),
        ]);

        $this->postJson('/api/tracks/' . $trackB['id'] . '/students', [
            'student_ids' => [$this->student->id],
            'confirm_reassign' => true,
        ])->assertOk();

        $this->assertDatabaseHas('student_progress', [
            'student_id' => $this->student->id,
            'track_id' => $trackA->id,
            'status' => 'passed',
        ]);
        $this->assertDatabaseHas('student_progress', [
            'student_id' => $this->student->id,
            'track_id' => $trackB['id'],
            'status' => 'in_progress',
        ]);
    }

    /** @test */
    public function non_chair_supervisor_cannot_record_defense_result(): void
    {
        $track = $this->createTrack();
        $stage = $track->stages()->orderBy('sequence_order')->first();
        $academicStage = $this->createAcademicStage();
        $stage->update(['academic_stage_id' => $academicStage->id, 'is_decisive' => true]);

        $chair = $this->createSupervisor();
        $member = $this->createSupervisor();

        $committee = \App\Models\Committee::create([
            'university_id' => $this->university->id,
            'name' => 'Defense Committee ' . uniqid(),
            'is_active' => true,
            'version' => 1,
        ]);
        $committee->members()->attach($chair->id, ['role' => 'chair']);
        $committee->members()->attach($member->id, ['role' => 'member']);

        $project = Project::create([
            'title' => 'Auth Defense Project',
            'description' => 'Test',
            'university_id' => $this->university->id,
            'supervisor_id' => $chair->id,
            'user_id' => $this->student->id,
            'status' => 'active',
        ]);

        $schedule = ApprovedSchedule::withoutGlobalScopes()->create([
            'university_id' => $this->university->id,
            'academic_stage_id' => $academicStage->id,
            'approved_by' => $this->admin->id,
            'approved_at' => now(),
            'status' => 'active',
            'metadata' => [],
        ]);

        $defense = DefenseSession::create([
            'approved_schedule_id' => $schedule->id,
            'project_id' => $project->id,
            'committee_id' => $committee->id,
            'scheduled_day_of_week' => 1,
            'scheduled_date' => now()->addDay()->toDateString(),
            'scheduled_start_time' => '10:00:00',
            'scheduled_end_time' => '11:00:00',
            'status' => 'scheduled',
        ]);

        Sanctum::actingAs($member);

        $this->postJson("/api/defense-sessions/{$defense->id}/record-result", [
            'result' => 'passed',
        ])->assertForbidden();
    }

    /** @test */
    public function same_defense_type_allowed_in_different_phases(): void
    {
        $seminar = $this->createAcademicStage();
        $semesterDefense = $this->createAcademicStage();
        $appsDefense = $this->createAcademicStage();

        $this->postJson('/api/tracks', [
            'name' => 'Shared Type Track ' . uniqid(),
            'stages' => [
                [
                    'name' => 'Semester',
                    'steps' => [
                        ['academic_stage_id' => $seminar->id],
                        ['academic_stage_id' => $semesterDefense->id],
                    ],
                ],
                [
                    'name' => 'Applications',
                    'steps' => [
                        ['academic_stage_id' => $seminar->id],
                        ['academic_stage_id' => $appsDefense->id],
                    ],
                ],
            ],
        ])->assertCreated();

        $this->assertEquals(2, TrackStage::where('academic_stage_id', $seminar->id)->count());
    }

    /** @test */
    public function tracks_from_other_universities_are_not_visible(): void
    {
        Track::withoutGlobalScopes()->create([
            'university_id' => $this->otherUniversity->id,
            'name' => 'Foreign Track',
            'is_active' => true,
        ]);

        $this->getJson('/api/tracks')
            ->assertOk()
            ->assertJsonMissing(['name' => 'Foreign Track']);
    }

    /** @test */
    public function admin_can_delete_track_without_students(): void
    {
        $track = $this->createTrack();

        $this->deleteJson("/api/tracks/{$track->id}")
            ->assertOk()
            ->assertJsonPath('action', 'deleted');

        $this->assertDatabaseMissing('tracks', ['id' => $track->id]);
        $this->assertDatabaseMissing('track_stages', ['track_id' => $track->id]);
    }

    /** @test */
    public function admin_deactivates_track_with_students_instead_of_deleting(): void
    {
        $track = $this->createTrack();
        $this->student->update(['track_id' => $track->id]);

        $this->deleteJson("/api/tracks/{$track->id}")
            ->assertOk()
            ->assertJsonPath('action', 'deactivated');

        $this->assertDatabaseHas('tracks', [
            'id' => $track->id,
            'is_active' => false,
        ]);
        $this->assertDatabaseHas('users', [
            'id' => $this->student->id,
            'track_id' => $track->id,
        ]);
    }

    /** @test */
    public function admin_can_delete_step_without_student_progress(): void
    {
        $track = $this->createTrack();
        $stage = $track->stages()->orderBy('sequence_order')->first();

        $this->deleteJson("/api/tracks/{$track->id}/stages/{$stage->id}")
            ->assertOk()
            ->assertJsonPath('message', 'Stage deleted successfully');

        $this->assertDatabaseMissing('track_stages', ['id' => $stage->id]);
    }

    /** @test */
    public function admin_cannot_delete_step_with_student_progress(): void
    {
        $track = $this->createTrack();
        $stage = $track->stages()->orderBy('sequence_order')->first();
        $this->student->update(['track_id' => $track->id]);

        \App\Models\StudentProgress::create([
            'student_id' => $this->student->id,
            'track_id' => $track->id,
            'track_stage_id' => $stage->id,
            'status' => 'passed',
            'completed_at' => now(),
        ]);

        $this->deleteJson("/api/tracks/{$track->id}/stages/{$stage->id}")
            ->assertStatus(409);
    }

    /** @test */
    public function admin_can_add_step_to_existing_phase_with_parent_id(): void
    {
        $track = $this->createPhasedTrack();
        $lastPhase = $track->stages()
            ->where('stage_kind', 'phase')
            ->orderByDesc('sequence_order')
            ->first();
        $newStage = $this->createAcademicStage();
        $rootStepCountBefore = $track->stages()
            ->whereNull('parent_id')
            ->where('stage_kind', 'step')
            ->count();

        $response = $this->postJson("/api/tracks/{$track->id}/stages", [
            'academic_stage_id' => $newStage->id,
            'parent_id' => $lastPhase->id,
            'position' => $lastPhase->children()->count() + 1,
            'is_decisive' => false,
        ]);

        $response->assertCreated();
        $stepId = $response->json('data.id');

        $this->assertDatabaseHas('track_stages', [
            'id' => $stepId,
            'parent_id' => $lastPhase->id,
            'track_id' => $track->id,
            'stage_kind' => 'step',
        ]);

        $this->assertSame(
            $rootStepCountBefore,
            $track->fresh()->stages()
                ->whereNull('parent_id')
                ->where('stage_kind', 'step')
                ->count(),
        );
    }

    /** @test */
    public function admin_can_delete_phase_without_student_progress(): void
    {
        $track = $this->createPhasedTrack();
        $phase = $track->stages()->where('stage_kind', 'phase')->orderBy('sequence_order')->first();
        $childCount = $track->stages()->where('parent_id', $phase->id)->count();

        $this->assertGreaterThan(0, $childCount);

        $this->deleteJson("/api/tracks/{$track->id}/stages/{$phase->id}")
            ->assertOk();

        $this->assertDatabaseMissing('track_stages', ['id' => $phase->id]);
        $this->assertDatabaseMissing('track_stages', ['parent_id' => $phase->id]);
    }

    /** @test */
    public function admin_cannot_delete_phase_with_student_progress_on_steps(): void
    {
        $track = $this->createPhasedTrack();
        $phase = $track->stages()->where('stage_kind', 'phase')->orderBy('sequence_order')->first();
        $step = $track->stages()->where('parent_id', $phase->id)->first();
        $this->student->update(['track_id' => $track->id]);

        \App\Models\StudentProgress::create([
            'student_id' => $this->student->id,
            'track_id' => $track->id,
            'track_stage_id' => $step->id,
            'status' => 'in_progress',
        ]);

        $this->deleteJson("/api/tracks/{$track->id}/stages/{$phase->id}")
            ->assertStatus(409);
    }

    private function seedUsers(): void
    {
        $this->university = University::firstOrCreate(
            ['slug' => 'test-uni-tracks'],
            ['name' => 'Test Uni Tracks', 'is_active' => true]
        );

        $this->otherUniversity = University::firstOrCreate(
            ['slug' => 'other-uni-tracks'],
            ['name' => 'Other Uni Tracks', 'is_active' => true]
        );

        $adminRole = Role::firstOrCreate(['name' => 'admin']);
        $studentRole = Role::firstOrCreate(['name' => 'student']);

        $this->admin = User::create([
            'name' => 'Track Admin',
            'email' => 'admin-tracks-' . uniqid() . '@test.edu',
            'password' => bcrypt('password'),
            'role_id' => $adminRole->id,
            'university_id' => $this->university->id,
            'status' => 'active',
        ]);

        $this->otherAdmin = User::create([
            'name' => 'Other Admin',
            'email' => 'other-admin-tracks-' . uniqid() . '@test.edu',
            'password' => bcrypt('password'),
            'role_id' => $adminRole->id,
            'university_id' => $this->otherUniversity->id,
            'status' => 'active',
        ]);

        $this->student = User::create([
            'name' => 'Track Student',
            'email' => 'student-tracks-' . uniqid() . '@test.edu',
            'password' => bcrypt('password'),
            'role_id' => $studentRole->id,
            'university_id' => $this->university->id,
            'status' => 'active',
        ]);
    }

    private function createTrack(): Track
    {
        $stage1 = $this->createAcademicStage();
        $stage2 = $this->createAcademicStage();

        $response = $this->postJson('/api/tracks', [
            'name' => 'Track ' . uniqid(),
            'stages' => [
                ['academic_stage_id' => $stage1->id],
                ['academic_stage_id' => $stage2->id],
            ],
        ]);

        $response->assertCreated();

        return Track::query()->findOrFail($response->json('data.id'));
    }

    private function createPhasedTrack(): Track
    {
        $stage1 = $this->createAcademicStage();
        $stage2 = $this->createAcademicStage();

        $response = $this->postJson('/api/tracks', [
            'name' => 'Phased Track ' . uniqid(),
            'stages' => [
                [
                    'name' => 'Phase A',
                    'stage_kind' => 'phase',
                    'steps' => [
                        ['academic_stage_id' => $stage1->id],
                    ],
                ],
                [
                    'name' => 'Phase B',
                    'stage_kind' => 'phase',
                    'steps' => [
                        ['academic_stage_id' => $stage2->id],
                    ],
                ],
            ],
        ]);

        $response->assertCreated();

        return Track::query()->findOrFail($response->json('data.id'));
    }

    private function createAcademicStage(): AcademicStageConfig
    {
        return AcademicStageConfig::withoutGlobalScopes()->create([
            'university_id' => $this->university->id,
            'name' => 'Academic Stage ' . uniqid(),
            'duration_minutes' => 60,
            'default_committee_size' => 3,
            'display_order' => 1,
        ]);
    }

    private function createSupervisor(): User
    {
        $role = Role::firstOrCreate(['name' => 'supervisor']);

        $supervisor = User::create([
            'name' => 'Supervisor ' . uniqid(),
            'email' => 'supervisor-tracks-' . uniqid() . '@test.edu',
            'password' => bcrypt('password'),
            'role_id' => $role->id,
            'university_id' => $this->university->id,
            'status' => 'active',
        ]);

        DB::table('supervisor_universities')->updateOrInsert(
            [
                'user_id' => $supervisor->id,
                'university_id' => $this->university->id,
            ],
            [
                'status' => 'active',
                'accepting_supervision' => true,
            ]
        );

        return $supervisor;
    }
}

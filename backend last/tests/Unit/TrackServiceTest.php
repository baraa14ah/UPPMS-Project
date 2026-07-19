<?php

namespace Tests\Unit;

use App\Models\Role;
use App\Models\StudentProgress;
use App\Models\Track;
use App\Models\TrackStage;
use App\Models\University;
use App\Models\User;
use App\Services\NotificationService;
use App\Services\TrackService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Validation\ValidationException;
use Mockery;
use Tests\TestCase;

class TrackServiceTest extends TestCase
{
    use DatabaseTransactions;

    private TrackService $service;
    private User $student;
    private Track $track;

    protected function setUp(): void
    {
        parent::setUp();

        $notifications = Mockery::mock(NotificationService::class);
        $notifications->shouldReceive('notifyUser')->andReturnNull();
        $this->service = new TrackService($notifications);

        $university = University::firstOrCreate(
            ['slug' => 'test-uni-track-service'],
            ['name' => 'Track Service Uni', 'is_active' => true]
        );

        $studentRole = Role::firstOrCreate(['name' => 'student']);

        $this->student = User::create([
            'name' => 'Service Student',
            'email' => 'svc-student-' . uniqid() . '@test.edu',
            'password' => bcrypt('password'),
            'role_id' => $studentRole->id,
            'university_id' => $university->id,
            'status' => 'active',
        ]);

        $this->track = Track::withoutGlobalScopes()->create([
            'university_id' => $university->id,
            'name' => 'Service Track ' . uniqid(),
            'is_active' => true,
        ]);

        TrackStage::create([
            'track_id' => $this->track->id,
            'sequence_order' => 1,
            'name' => 'Stage 1',
        ]);
        TrackStage::create([
            'track_id' => $this->track->id,
            'sequence_order' => 2,
            'name' => 'Stage 2',
        ]);
    }

    /** @test */
    public function prerequisite_allows_first_stage_without_prior_progress(): void
    {
        $first = $this->track->stages()->orderBy('sequence_order')->first();

        $this->service->assertPrerequisitesMet($this->student, $first->id);

        $this->assertTrue(true);
    }

    /** @test */
    public function prerequisite_blocks_second_stage_when_first_not_passed(): void
    {
        $second = TrackStage::query()
            ->where('track_id', $this->track->id)
            ->orderByDesc('sequence_order')
            ->firstOrFail();

        $this->expectException(ValidationException::class);
        $this->service->assertPrerequisitesMet($this->student, $second->id);
    }

    /** @test */
    public function auto_assign_sets_track_on_first_proposal(): void
    {
        $first = $this->track->stages()->orderBy('sequence_order')->first();

        $this->service->autoAssignTrack($this->student, $first->id);

        $this->student->refresh();
        $this->assertEquals($this->track->id, $this->student->track_id);
        $this->assertDatabaseHas('student_progress', [
            'student_id' => $this->student->id,
            'track_stage_id' => $first->id,
            'status' => 'in_progress',
        ]);
    }

    /** @test */
    public function modification_allowed_within_48_hours_for_non_admin(): void
    {
        $stage = $this->track->stages()->orderBy('sequence_order')->first();
        $progress = StudentProgress::create([
            'student_id' => $this->student->id,
            'track_id' => $this->track->id,
            'track_stage_id' => $stage->id,
            'status' => 'passed',
            'defense_result_recorded_at' => now()->subHours(10),
        ]);

        $this->assertTrue($progress->isModificationAllowed($this->student));
    }

    /** @test */
    public function cross_track_stage_is_rejected_when_student_has_track(): void
    {
        $otherTrack = Track::withoutGlobalScopes()->create([
            'university_id' => $this->student->university_id,
            'name' => 'Other Track ' . uniqid(),
            'is_active' => true,
        ]);
        $otherStage = TrackStage::create([
            'track_id' => $otherTrack->id,
            'sequence_order' => 1,
            'name' => 'Other Stage',
        ]);

        $this->track->stages()->orderBy('sequence_order')->first();
        $this->student->update(['track_id' => $this->track->id]);

        $this->expectException(ValidationException::class);
        $this->service->assertPrerequisitesMet($this->student, $otherStage->id);
    }

    /** @test */
    public function foreign_university_stage_is_rejected(): void
    {
        $foreignUniversity = University::create([
            'name' => 'Foreign Uni',
            'slug' => 'foreign-uni-' . uniqid(),
            'is_active' => true,
        ]);
        $foreignTrack = Track::withoutGlobalScopes()->create([
            'university_id' => $foreignUniversity->id,
            'name' => 'Foreign Track',
            'is_active' => true,
        ]);
        $foreignStage = TrackStage::create([
            'track_id' => $foreignTrack->id,
            'sequence_order' => 1,
            'name' => 'Foreign Stage',
        ]);

        $this->expectException(ValidationException::class);
        $this->service->assertPrerequisitesMet($this->student, $foreignStage->id);
    }

    /** @test */
    public function progress_history_is_logged_on_auto_assign(): void
    {
        $first = $this->track->stages()->orderBy('sequence_order')->first();
        $this->service->autoAssignTrack($this->student, $first->id);

        $this->assertDatabaseHas('student_progress_history', [
            'attempt_number' => 1,
            'status' => 'in_progress',
        ]);
    }
}

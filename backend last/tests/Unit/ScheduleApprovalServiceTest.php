<?php

namespace Tests\Unit;

use App\Models\AcademicStageConfig;
use App\Models\ApprovedSchedule;
use App\Models\Project;
use App\Models\Role;
use App\Models\University;
use App\Models\User;
use App\Services\Notifications\NotificationService;
use App\Services\Scheduling\ScheduleApprovalService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Mockery;
use Tests\TestCase;

class ScheduleApprovalServiceTest extends TestCase
{
    use DatabaseTransactions;

    private ScheduleApprovalService $service;
    private int $universityId;
    private int $stageId;
    private int $adminId;
    private int $facultyId;

    protected function setUp(): void
    {
        parent::setUp();

        $mockNotifications = Mockery::mock(NotificationService::class);
        $mockNotifications->shouldReceive('notifyUser')->andReturnNull();

        $this->service = new ScheduleApprovalService($mockNotifications);

        $this->seedTestData();
    }

    /** @test */
    public function approve_creates_schedule_and_sessions(): void
    {
        $candidate = $this->createMockCandidate();

        $result = $this->service->approve(
            $this->universityId,
            $this->stageId,
            $this->adminId,
            $candidate
        );

        $this->assertNotNull($result['approved_schedule']);
        $this->assertEquals('active', $result['approved_schedule']->status);
        $this->assertGreaterThan(0, $result['defense_sessions_created']);
    }

    /** @test */
    public function approve_throws_if_active_schedule_exists(): void
    {
        ApprovedSchedule::withoutGlobalScopes()->create([
            'university_id' => $this->universityId,
            'academic_stage_id' => $this->stageId,
            'approved_by' => $this->adminId,
            'approved_at' => now(),
            'status' => 'active',
        ]);

        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('active schedule already exists');

        $this->service->approve(
            $this->universityId,
            $this->stageId,
            $this->adminId,
            $this->createMockCandidate()
        );
    }

    /** @test */
    public function void_marks_schedule_and_sessions_cancelled(): void
    {
        $schedule = ApprovedSchedule::withoutGlobalScopes()->create([
            'university_id' => $this->universityId,
            'academic_stage_id' => $this->stageId,
            'approved_by' => $this->adminId,
            'approved_at' => now(),
            'status' => 'active',
        ]);

        $result = $this->service->void($schedule->id, $this->adminId);

        $this->assertEquals($schedule->id, $result['schedule_id']);

        $schedule->refresh();
        $this->assertEquals('voided', $schedule->status);
    }

    private function seedTestData(): void
    {
        $university = University::firstOrCreate(
            ['slug' => 'test-uni-approval'],
            ['name' => 'Test University Approval', 'is_active' => true]
        );
        $this->universityId = $university->id;

        $adminRole = Role::firstOrCreate(['name' => 'admin']);
        $supervisorRole = Role::firstOrCreate(['name' => 'supervisor']);

        $admin = User::create([
            'name' => 'Admin User',
            'email' => 'admin-approval-' . uniqid() . '@test.edu',
            'password' => bcrypt('password'),
            'role_id' => $adminRole->id,
            'university_id' => $university->id,
            'status' => 'active',
        ]);
        $this->adminId = $admin->id;

        $stage = AcademicStageConfig::withoutGlobalScopes()->create([
            'university_id' => $university->id,
            'name' => 'Test Stage',
            'duration_minutes' => 60,
            'default_committee_size' => 3,
            'display_order' => 1,
        ]);
        $this->stageId = $stage->id;

        $supervisor = User::create([
            'name' => 'Supervisor',
            'email' => 'sup-approval-' . uniqid() . '@test.edu',
            'password' => bcrypt('password'),
            'role_id' => $supervisorRole->id,
            'university_id' => $university->id,
            'status' => 'active',
        ]);

        $faculty = User::create([
            'name' => 'Faculty Member',
            'email' => 'faculty-approval-' . uniqid() . '@test.edu',
            'password' => bcrypt('password'),
            'role_id' => $supervisorRole->id,
            'university_id' => $university->id,
            'status' => 'active',
        ]);

        Project::withoutGlobalScopes()->create([
            'title' => 'Test Project',
            'description' => 'Test',
            'university_id' => $university->id,
            'supervisor_id' => $supervisor->id,
            'user_id' => $admin->id,
            'status' => 'active',
        ]);

        $this->facultyId = $faculty->id;
    }

    private function createMockCandidate(): array
    {
        $project = Project::withoutGlobalScopes()
            ->where('university_id', $this->universityId)
            ->first();

        return [
            'rank' => 1,
            'fitness' => 850.0,
            'fitnessBreakdown' => [
                'recommendations' => [],
            ],
            'assignments' => [
                [
                    'projectId' => $project->id,
                    'projectTitle' => $project->title,
                    'supervisorId' => $project->supervisor_id,
                    'supervisorName' => 'Supervisor',
                    'committeeMembers' => [
                        [
                            'userId' => $this->facultyId,
                            'name' => 'Faculty Member',
                            'email' => 'faculty@test.edu',
                        ],
                    ],
                    'scheduledDay' => 'Monday',
                    'scheduledTime' => '09:00 - 10:00',
                    'roomId' => null,
                    'roomName' => null,
                ],
            ],
        ];
    }
}

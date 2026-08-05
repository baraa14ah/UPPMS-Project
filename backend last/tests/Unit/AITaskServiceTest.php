<?php

namespace Tests\Unit;

use App\Models\Project;
use App\Models\Role;
use App\Models\Task;
use App\Models\University;
use App\Models\User;
use App\Services\Projects\AITaskService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class AITaskServiceTest extends TestCase
{
    use DatabaseTransactions;

    private AITaskService $service;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'services.gemini.api_key' => 'test-key',
            'services.gemini.endpoint' => 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
            'services.gemini.timeout' => 10,
            'services.gemini.retry_attempts' => 1,
        ]);

        $this->service = app(AITaskService::class);
    }

    /** @test */
    public function generate_tasks_requires_minimum_description_length(): void
    {
        $user = $this->makeStudent();
        $project = $this->makeProject($user, 'Short');

        $this->expectException(ValidationException::class);

        $this->service->generateTasks($user, $project);
    }

    /** @test */
    public function validation_failures_are_logged(): void
    {
        if (!Schema::hasTable('task_generation_logs')) {
            $this->markTestSkipped('task_generation_logs table not available.');
        }

        $user = $this->makeStudent();
        $project = $this->makeProject($user, 'Short');

        try {
            $this->service->generateTasks($user, $project);
        } catch (ValidationException) {
            // expected
        }

        $this->assertDatabaseHas('task_generation_logs', [
            'user_id' => $user->id,
            'project_id' => $project->id,
            'status' => 'error',
        ]);
    }

    /** @test */
    public function generate_tasks_returns_ten_tasks_on_success(): void
    {
        if (!Schema::hasTable('task_generation_logs')) {
            $this->markTestSkipped('task_generation_logs table not available.');
        }

        $user = $this->makeStudent();
        $project = $this->makeProject($user, 'A detailed project description that is long enough to pass validation.');

        Http::fake([
            'generativelanguage.googleapis.com/*' => Http::response([
                'candidates' => [
                    [
                        'content' => [
                            'parts' => [
                                [
                                    'text' => json_encode([
                                        'tasks' => $this->sampleAiTasks(),
                                    ]),
                                ],
                            ],
                        ],
                    ],
                ],
            ], 200),
        ]);

        $result = $this->service->generateTasks($user, $project);

        $this->assertCount(10, $result['tasks']);
        $this->assertEquals(0, $result['replaced_count']);
    }

    /** @test */
    public function duplicate_generate_without_regenerate_is_rejected(): void
    {
        if (!Schema::hasTable('task_generation_logs')) {
            $this->markTestSkipped('task_generation_logs table not available.');
        }

        $user = $this->makeStudent();
        $project = $this->makeProject($user, 'A detailed project description that is long enough.');

        Task::create([
            'project_id' => $project->id,
            'university_id' => $project->university_id,
            'title' => 'Existing AI Task',
            'description' => 'Existing description',
            'ai_generated' => true,
            'status' => 'pending',
        ]);

        $this->expectException(ValidationException::class);

        $this->service->generateTasks($user, $project);
    }

    /** @test */
    public function regenerate_deletes_existing_ai_tasks(): void
    {
        if (!Schema::hasTable('task_generation_logs')) {
            $this->markTestSkipped('task_generation_logs table not available.');
        }

        $user = $this->makeStudent();
        $project = $this->makeProject($user, 'A detailed project description that is long enough.');

        Task::create([
            'project_id' => $project->id,
            'university_id' => $project->university_id,
            'title' => 'Old AI Task',
            'description' => 'Old description',
            'ai_generated' => true,
            'status' => 'pending',
        ]);

        Task::create([
            'project_id' => $project->id,
            'university_id' => $project->university_id,
            'title' => 'Manual Task',
            'description' => 'Manual description',
            'ai_generated' => false,
            'status' => 'pending',
        ]);

        Http::fake([
            'generativelanguage.googleapis.com/*' => Http::response([
                'candidates' => [
                    [
                        'content' => [
                            'parts' => [
                                [
                                    'text' => json_encode([
                                        'tasks' => $this->sampleAiTasks('New Task', 'New desc'),
                                    ]),
                                ],
                            ],
                        ],
                    ],
                ],
            ], 200),
        ]);

        $result = $this->service->generateTasks($user, $project, regenerate: true);

        $this->assertEquals(1, $result['replaced_count']);
        $this->assertCount(10, $result['tasks']);
        $this->assertEquals(1, $project->tasks()->where('ai_generated', false)->count());
    }

    /** @test */
    public function regenerate_is_rejected_when_ai_task_status_changed(): void
    {
        $user = $this->makeStudent();
        $project = $this->makeProject($user, 'A detailed project description that is long enough.');

        Task::create([
            'project_id' => $project->id,
            'university_id' => $project->university_id,
            'title' => 'Started AI Task',
            'description' => 'Started description',
            'ai_generated' => true,
            'status' => 'in_progress',
        ]);

        $this->expectException(ValidationException::class);

        $this->service->generateTasks($user, $project, regenerate: true);
    }

    /** @return array<int, array<string, mixed>> */
    private function sampleAiTasks(string $titlePrefix = 'Task', string $descPrefix = 'Description'): array
    {
        $tasks = [];
        for ($i = 1; $i <= 10; $i++) {
            $tasks[] = [
                'title' => "{$titlePrefix} {$i}",
                'description' => "{$descPrefix} {$i}",
                'estimated_hours' => 4,
            ];
        }

        return $tasks;
    }

    private function makeStudent(): User
    {
        $role = Role::firstOrCreate(['name' => 'student']);
        $university = University::firstOrCreate(
            ['slug' => 'test-uni'],
            ['name' => 'Test University'],
        );

        return User::create([
            'name' => 'Test Student',
            'email' => 'student-' . uniqid() . '@test.local',
            'password' => bcrypt('password'),
            'role_id' => $role->id,
            'university_id' => $university->id,
            'status' => 'active',
        ]);
    }

    private function makeProject(User $user, string $description): Project
    {
        return Project::create([
            'title' => 'Test Project',
            'description' => $description,
            'user_id' => $user->id,
            'university_id' => $user->university_id,
            'status' => 'active',
        ]);
    }
}

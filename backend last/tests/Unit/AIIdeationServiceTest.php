<?php

namespace Tests\Unit;

use App\Models\BookmarkedIdea;
use App\Models\Role;
use App\Models\University;
use App\Models\User;
use App\Services\Projects\AIIdeationService;
use Exception;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class AIIdeationServiceTest extends TestCase
{
    use DatabaseTransactions;

    private AIIdeationService $service;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'services.gemini.api_key' => 'test-key',
            'services.gemini.endpoint' => 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
            'services.gemini.timeout' => 10,
            'services.gemini.retry_attempts' => 1,
        ]);

        $this->service = new AIIdeationService();
    }

    /** @test */
    public function sanitize_input_strips_tags_and_enforces_max_length(): void
    {
        $input = '<script>alert(1)</script>' . str_repeat('a', 600);
        $sanitized = $this->service->sanitizeInput($input);

        $this->assertStringNotContainsString('<', $sanitized);
        $this->assertLessThanOrEqual(500, mb_strlen($sanitized));
    }

    /** @test */
    public function generate_suggestions_rejects_input_that_becomes_too_short_after_sanitization(): void
    {
        $user = $this->makeStudent();

        $this->expectException(ValidationException::class);

        $this->service->generateSuggestions($user, '<<<<<<<<<<');
    }

    /** @test */
    public function parse_response_requires_exactly_three_suggestions(): void
    {
        $this->expectException(Exception::class);

        $this->service->parseResponseForTest(json_encode([
            'suggestions' => [
                ['name' => 'Only One', 'goal' => 'Goal text here.', 'technologies' => ['React']],
            ],
        ]));
    }

    /** @test */
    public function parse_response_strips_extra_fields_from_suggestions(): void
    {
        $parsed = $this->service->parseResponseForTest(json_encode([
            'suggestions' => [
                ['name' => 'A', 'goal' => 'Goal A text.', 'technologies' => ['React'], 'injected' => 'bad'],
                ['name' => 'B', 'goal' => 'Goal B text.', 'technologies' => ['Laravel']],
                ['name' => 'C', 'goal' => 'Goal C text.', 'technologies' => ['MySQL']],
            ],
        ]));

        $this->assertCount(3, $parsed);
        $this->assertSame(['name', 'goal', 'technologies'], array_keys($parsed[0]));
        $this->assertArrayNotHasKey('injected', $parsed[0]);
    }

    /** @test */
    public function generate_suggestions_uses_arabic_language_instruction_for_arabic_input(): void
    {
        if (!Schema::hasTable('ideation_requests')) {
            $this->markTestSkipped('ideation_requests table is not available in the test database.');
        }

        $user = $this->makeStudent();

        Http::fake([
            'generativelanguage.googleapis.com/*' => Http::response([
                'candidates' => [
                    [
                        'content' => [
                            'parts' => [
                                [
                                    'text' => json_encode([
                                        'suggestions' => [
                                            ['name' => 'أ', 'goal' => 'هدف المشروع الأول.', 'technologies' => ['React']],
                                            ['name' => 'ب', 'goal' => 'هدف المشروع الثاني.', 'technologies' => ['Laravel']],
                                            ['name' => 'ج', 'goal' => 'هدف المشروع الثالث.', 'technologies' => ['MySQL']],
                                        ],
                                    ], JSON_UNESCAPED_UNICODE),
                                ],
                            ],
                        ],
                    ],
                ],
            ], 200),
        ]);

        $this->service->generateSuggestions($user, 'تطوير الويب، الذكاء الاصطناعي، تطبيقات الجوال');

        Http::assertSent(function ($request) {
            $prompt = $request->data()['contents'][0]['parts'][0]['text'] ?? '';

            return str_contains($prompt, 'Modern Standard Arabic')
                && str_contains($prompt, 'Write every "name" and "goal" field in Modern Standard Arabic');
        });
    }

    /** @test */
    public function generate_suggestions_calls_gemini_with_header_auth_and_json_mode(): void
    {
        if (!Schema::hasTable('ideation_requests')) {
            $this->markTestSkipped('ideation_requests table is not available in the test database.');
        }

        $user = $this->makeStudent();

        Http::fake([
            'generativelanguage.googleapis.com/*' => Http::response([
                'candidates' => [
                    [
                        'content' => [
                            'parts' => [
                                [
                                    'text' => json_encode([
                                        'suggestions' => [
                                            ['name' => 'A', 'goal' => 'Goal A text.', 'technologies' => ['React']],
                                            ['name' => 'B', 'goal' => 'Goal B text.', 'technologies' => ['Laravel']],
                                            ['name' => 'C', 'goal' => 'Goal C text.', 'technologies' => ['MySQL']],
                                        ],
                                    ]),
                                ],
                            ],
                        ],
                    ],
                ],
            ], 200),
        ]);

        $suggestions = $this->service->generateSuggestions(
            $user,
            'web development, machine learning',
            ['Old Project'],
        );

        $this->assertCount(3, $suggestions);

        Http::assertSent(function ($request) {
            $body = $request->data();
            $hasJsonMode = ($body['generationConfig']['responseMimeType'] ?? '') === 'application/json';
            $hasHeaderKey = $request->hasHeader('x-goog-api-key', 'test-key');
            $urlHasNoKey = !str_contains($request->url(), 'key=');

            return $hasJsonMode && $hasHeaderKey && $urlHasNoKey;
        });
    }

    /** @test */
    public function bookmark_auto_archives_oldest_when_limit_reached(): void
    {
        if (!Schema::hasTable('bookmarked_ideas')) {
            $this->markTestSkipped('bookmarked_ideas table is not available in the test database.');
        }

        $user = $this->makeStudent();

        for ($i = 1; $i <= 10; $i++) {
            BookmarkedIdea::create([
                'user_id' => $user->id,
                'suggestion_name' => "Project {$i}",
                'suggestion_goal' => "Goal {$i}",
                'suggestion_technologies' => ['React'],
                'archived' => false,
            ]);
        }

        $result = $this->service->bookmark($user, [
            'name' => 'Project 11',
            'goal' => 'New goal',
            'technologies' => ['Vue'],
        ]);

        $this->assertTrue($result['archived_oldest']);
        $this->assertSame(10, $user->bookmarkedIdeas()->active()->count());
        $this->assertTrue(
            (bool) $user->bookmarkedIdeas()->where('suggestion_name', 'Project 1')->value('archived'),
        );
        $this->assertFalse(
            (bool) $user->bookmarkedIdeas()->where('suggestion_name', 'Project 11')->value('archived'),
        );
    }

    /** Create a student user for service tests. */
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
}

<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\University;
use App\Models\User;
use App\Models\XmlAuthorizedUser;
use App\Models\XmlImportLog;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\UploadedFile;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class XmlImportControllerTest extends TestCase
{
    use DatabaseTransactions;

    private User $admin;
    private University $university;
    private University $otherUniversity;

    protected function setUp(): void
    {
        parent::setUp();

        $this->university = University::firstOrCreate(
            ['slug' => 'xml-import-uni-a'],
            ['name' => 'XML Import Uni A', 'is_active' => true],
        );
        $this->otherUniversity = University::firstOrCreate(
            ['slug' => 'xml-import-uni-b'],
            ['name' => 'XML Import Uni B', 'is_active' => true],
        );

        $adminRole = Role::firstOrCreate(['name' => 'admin']);
        $this->admin = User::create([
            'name' => 'XML Import Admin',
            'email' => 'xml-import-admin-' . uniqid() . '@test.edu',
            'password' => bcrypt('password'),
            'role_id' => $adminRole->id,
            'university_id' => $this->university->id,
            'status' => 'active',
        ]);
    }

  /** @test */
    public function admin_can_upload_valid_xml(): void
    {
        Sanctum::actingAs($this->admin);

        $xml = <<<'XML'
<?xml version="1.0" encoding="UTF-8"?>
<authorized_users>
  <student university_number="20241001" email="newstudent@test.edu" full_name="New Student" />
</authorized_users>
XML;

        $response = $this->post('/api/admin/xml-import', [
            'xml_file' => UploadedFile::fake()->createWithContent('users.xml', $xml),
        ], ['Accept' => 'application/json']);

        $response->assertCreated()
            ->assertJsonPath('data.success_count', 1);

        $this->assertDatabaseHas('xml_authorized_users', [
            'university_id' => $this->university->id,
            'email' => 'newstudent@test.edu',
            'university_number' => '20241001',
        ]);
    }

  /** @test */
    public function upload_with_invalid_xml_returns_400(): void
    {
        Sanctum::actingAs($this->admin);

        $response = $this->post('/api/admin/xml-import', [
            'xml_file' => UploadedFile::fake()->createWithContent('bad.xml', '<broken'),
        ], ['Accept' => 'application/json']);

        $response->assertStatus(400);
    }

  /** @test */
    public function non_admin_cannot_upload_xml(): void
    {
        $studentRole = Role::firstOrCreate(['name' => 'student']);
        $student = User::create([
            'name' => 'Student',
            'email' => 'xml-student-' . uniqid() . '@test.edu',
            'password' => bcrypt('password'),
            'role_id' => $studentRole->id,
            'university_id' => $this->university->id,
            'status' => 'active',
        ]);

        Sanctum::actingAs($student);

        $xml = '<?xml version="1.0"?><authorized_users></authorized_users>';
        $this->post('/api/admin/xml-import', [
            'xml_file' => UploadedFile::fake()->createWithContent('users.xml', $xml),
        ], ['Accept' => 'application/json'])->assertForbidden();
    }

  /** @test */
    public function history_endpoint_returns_paginated_results(): void
    {
        Sanctum::actingAs($this->admin);

        XmlImportLog::create([
            'university_id' => $this->university->id,
            'admin_user_id' => $this->admin->id,
            'filename' => 'history.xml',
            'file_size' => 50,
            'status' => 'completed',
        ]);

        $response = $this->getJson('/api/admin/xml-import/history');

        $response->assertOk()
            ->assertJsonStructure([
                'data' => [
                    'imports',
                    'pagination' => ['current_page', 'total_pages', 'total_items', 'per_page'],
                ],
            ]);
    }

  /** @test */
    public function statistics_endpoint_returns_counts(): void
    {
        Sanctum::actingAs($this->admin);

        $log = XmlImportLog::create([
            'university_id' => $this->university->id,
            'admin_user_id' => $this->admin->id,
            'filename' => 'stats.xml',
            'file_size' => 50,
            'status' => 'completed',
        ]);

        XmlAuthorizedUser::withoutGlobalScopes()->create([
            'university_id' => $this->university->id,
            'university_number' => '20249999',
            'email' => 'stats-student@test.edu',
            'full_name' => 'Stats Student',
            'user_type' => 'student',
            'import_log_id' => $log->id,
            'imported_at' => now(),
        ]);

        $response = $this->getJson('/api/admin/xml-import/statistics');

        $response->assertOk()
            ->assertJsonPath('data.students.total', 1)
            ->assertJsonPath('data.total_authorized', 1);
    }

  /** @test */
    public function admin_cannot_see_other_university_import_details(): void
    {
        $otherAdminRole = Role::firstOrCreate(['name' => 'admin']);
        $otherAdmin = User::create([
            'name' => 'Other Admin',
            'email' => 'other-xml-admin-' . uniqid() . '@test.edu',
            'password' => bcrypt('password'),
            'role_id' => $otherAdminRole->id,
            'university_id' => $this->otherUniversity->id,
            'status' => 'active',
        ]);

        $foreignLog = XmlImportLog::create([
            'university_id' => $this->otherUniversity->id,
            'admin_user_id' => $otherAdmin->id,
            'filename' => 'foreign.xml',
            'file_size' => 50,
            'status' => 'completed',
        ]);

        Sanctum::actingAs($this->admin);

        $this->getJson("/api/admin/xml-import/{$foreignLog->id}")
            ->assertNotFound();
    }

  /** @test */
    public function admin_can_preview_xml_comparison(): void
    {
        Sanctum::actingAs($this->admin);

        $seedXml = <<<'XML'
<?xml version="1.0" encoding="UTF-8"?>
<authorized_users>
  <student university_number="20241001" email="keep@test.edu" full_name="Keep Student" />
</authorized_users>
XML;
        $this->post('/api/admin/xml-import', [
            'xml_file' => UploadedFile::fake()->createWithContent('seed.xml', $seedXml),
        ], ['Accept' => 'application/json'])->assertCreated();

        $previewXml = <<<'XML'
<?xml version="1.0" encoding="UTF-8"?>
<authorized_users>
  <student university_number="20241001" email="keep@test.edu" full_name="Keep Student" />
  <student university_number="20241002" email="fresh@test.edu" full_name="Fresh Student" />
</authorized_users>
XML;

        $this->post('/api/admin/xml-import/preview', [
            'xml_file' => UploadedFile::fake()->createWithContent('preview.xml', $previewXml),
        ], ['Accept' => 'application/json'])
            ->assertOk()
            ->assertJsonPath('data.comparison.summary.new', 1)
            ->assertJsonPath('data.comparison.summary.unchanged', 1)
            ->assertJsonPath('data.comparison.summary.removed', 0);
    }
}

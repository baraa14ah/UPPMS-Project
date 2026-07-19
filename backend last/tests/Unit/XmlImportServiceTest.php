<?php

namespace Tests\Unit;

use App\Models\Role;
use App\Models\University;
use App\Models\User;
use App\Models\XmlAuthorizedUser;
use App\Models\XmlImportLog;
use App\Services\XmlImportService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

class XmlImportServiceTest extends TestCase
{
    use DatabaseTransactions;

    private XmlImportService $service;
    private University $university;
    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->service = app(XmlImportService::class);
        $this->university = University::firstOrCreate(
            ['slug' => 'xml-test-uni'],
            ['name' => 'XML Test University', 'is_active' => true],
        );
        $adminRole = Role::firstOrCreate(['name' => 'admin']);
        $this->admin = User::create([
            'name' => 'XML Admin',
            'email' => 'xml-admin-' . uniqid() . '@test.edu',
            'password' => bcrypt('password'),
            'role_id' => $adminRole->id,
            'university_id' => $this->university->id,
            'status' => 'active',
        ]);
    }

  /** @test */
    public function parse_xml_file_with_valid_xml(): void
    {
        $xml = <<<'XML'
<?xml version="1.0" encoding="UTF-8"?>
<authorized_users>
  <student university_number="2024001" email="student@test.edu" full_name="Student One" />
  <supervisor email="prof@test.edu" full_name="Professor One" />
</authorized_users>
XML;

        $file = UploadedFile::fake()->createWithContent('users.xml', $xml);
        $parsed = $this->service->parseXmlFile($file);

        $this->assertCount(1, $parsed['students']);
        $this->assertCount(1, $parsed['supervisors']);
        $this->assertSame('2024001', $parsed['students'][0]['university_number']);
        $this->assertSame('prof@test.edu', $parsed['supervisors'][0]['email']);
    }

  /** @test */
    public function parse_xml_file_with_invalid_xml_throws(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $file = UploadedFile::fake()->createWithContent('bad.xml', '<not-xml');
        $this->service->parseXmlFile($file);
    }

  /** @test */
    public function parse_xml_file_with_malformed_root_throws(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $xml = '<?xml version="1.0"?><users></users>';
        $file = UploadedFile::fake()->createWithContent('bad.xml', $xml);
        $this->service->parseXmlFile($file);
    }

  /** @test */
    public function validate_credentials_with_matching_student(): void
    {
        $this->seedAuthorizedStudent('2024001', 'student@test.edu');

        $result = $this->service->resolveRegistrationCredentials(
            'student@test.edu',
            '2024001',
            'student',
            $this->university->id,
        );

        $this->assertNull($result['error']);
        $this->assertNotNull($result['record']);
    }

  /** @test */
    public function validate_credentials_with_matching_supervisor(): void
    {
        $this->seedAuthorizedSupervisor('prof@test.edu');

        $result = $this->service->resolveRegistrationCredentials(
            'prof@test.edu',
            null,
            'supervisor',
            $this->university->id,
        );

        $this->assertNull($result['error']);
        $this->assertNotNull($result['record']);
    }

  /** @test */
    public function validate_credentials_with_non_matching_credentials(): void
    {
        $this->seedAuthorizedStudent('2024001', 'student@test.edu');

        $result = $this->service->resolveRegistrationCredentials(
            'wrong@test.edu',
            '2024001',
            'student',
            $this->university->id,
        );

        $this->assertSame(XmlImportService::CREDENTIALS_MISMATCH, $result['error']);
    }

  /** @test */
    public function validate_credentials_with_already_used_record(): void
    {
        $record = $this->seedAuthorizedStudent('2024001', 'student@test.edu');
        $record->update(['is_used' => true, 'used_at' => now()]);

        $result = $this->service->resolveRegistrationCredentials(
            'student@test.edu',
            '2024001',
            'student',
            $this->university->id,
        );

        $this->assertSame(XmlImportService::CREDENTIALS_ALREADY_USED, $result['error']);
    }

  /** @test */
    public function compare_with_existing_detects_new_unchanged_updated_and_removed(): void
    {
        $this->seedAuthorizedStudent('2024001', 'old@test.edu');
        $this->seedAuthorizedSupervisor('prof@test.edu');

        XmlAuthorizedUser::withoutGlobalScopes()
            ->where('university_id', $this->university->id)
            ->where('email', 'prof@test.edu')
            ->update(['full_name' => 'Old Professor Name']);

        $comparison = $this->service->compareWithExisting([
            'students' => [
                [
                    'row' => 1,
                    'university_number' => '2024001',
                    'email' => 'old@test.edu',
                    'full_name' => 'Test Student',
                ],
                [
                    'row' => 2,
                    'university_number' => '2024999',
                    'email' => 'new@test.edu',
                    'full_name' => 'Brand New',
                ],
            ],
            'supervisors' => [
                [
                    'row' => 3,
                    'email' => 'prof@test.edu',
                    'full_name' => 'Updated Professor',
                ],
            ],
        ], $this->university->id);

        $this->assertSame(1, $comparison['summary']['new']);
        $this->assertSame(1, $comparison['summary']['unchanged']);
        $this->assertSame(1, $comparison['summary']['updated']);
        $this->assertSame(0, $comparison['summary']['removed']);
        $this->assertSame('new@test.edu', $comparison['new'][0]['email']);
        $this->assertSame('Old Professor Name', $comparison['updated'][0]['previous_full_name']);
    }

    private function seedAuthorizedStudent(string $number, string $email): XmlAuthorizedUser
    {
        $log = XmlImportLog::create([
            'university_id' => $this->university->id,
            'admin_user_id' => $this->admin->id,
            'filename' => 'seed.xml',
            'file_size' => 100,
            'status' => 'completed',
        ]);

        return XmlAuthorizedUser::withoutGlobalScopes()->create([
            'university_id' => $this->university->id,
            'university_number' => $number,
            'email' => $email,
            'full_name' => 'Test Student',
            'user_type' => 'student',
            'import_log_id' => $log->id,
            'imported_at' => now(),
        ]);
    }

    private function seedAuthorizedSupervisor(string $email): XmlAuthorizedUser
    {
        $log = XmlImportLog::create([
            'university_id' => $this->university->id,
            'admin_user_id' => $this->admin->id,
            'filename' => 'seed.xml',
            'file_size' => 100,
            'status' => 'completed',
        ]);

        return XmlAuthorizedUser::withoutGlobalScopes()->create([
            'university_id' => $this->university->id,
            'email' => $email,
            'full_name' => 'Test Supervisor',
            'user_type' => 'supervisor',
            'import_log_id' => $log->id,
            'imported_at' => now(),
        ]);
    }
}

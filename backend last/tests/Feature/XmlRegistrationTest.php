<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\University;
use App\Models\User;
use App\Models\XmlAuthorizedUser;
use App\Models\XmlImportLog;
use App\Services\XmlImportService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class XmlRegistrationTest extends TestCase
{
    use DatabaseTransactions;

    private University $university;
    private University $noXmlUniversity;

    protected function setUp(): void
    {
        parent::setUp();

        $this->university = University::firstOrCreate(
            ['slug' => 'xml-reg-uni'],
            ['name' => 'XML Registration Uni', 'is_active' => true],
        );
        $this->noXmlUniversity = University::firstOrCreate(
            ['slug' => 'no-xml-uni'],
            ['name' => 'No XML Uni', 'is_active' => true],
        );
    }

  /** @test */
    public function student_registration_with_matching_credentials_is_active(): void
    {
        $this->seedStudentRecord('20241111', 'match-student@test.edu');

        $response = $this->postJson('/api/register', [
            'name' => 'Matched Student',
            'email' => 'match-student@test.edu',
            'password' => 'secret12',
            'role' => 'student',
            'university_id' => $this->university->id,
            'student_number' => '20241111',
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('users', [
            'email' => 'match-student@test.edu',
            'status' => 'active',
            'student_number' => '20241111',
        ]);
        $this->assertDatabaseHas('xml_authorized_users', [
            'email' => 'match-student@test.edu',
            'is_used' => true,
        ]);
    }

  /** @test */
    public function student_registration_with_non_matching_credentials_fails(): void
    {
        $this->seedStudentRecord('20241111', 'match-student@test.edu');

        $response = $this->postJson('/api/register', [
            'name' => 'Wrong Student',
            'email' => 'wrong-student@test.edu',
            'password' => 'secret12',
            'role' => 'student',
            'university_id' => $this->university->id,
            'student_number' => '20241111',
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('errors.credentials.0', XmlImportService::CREDENTIALS_MISMATCH);
    }

  /** @test */
    public function student_registration_with_already_used_credentials_fails(): void
    {
        $record = $this->seedStudentRecord('20241112', 'used-student@test.edu');
        $record->update(['is_used' => true, 'used_at' => now()]);

        $response = $this->postJson('/api/register', [
            'name' => 'Used Student',
            'email' => 'used-student@test.edu',
            'password' => 'secret12',
            'role' => 'student',
            'university_id' => $this->university->id,
            'student_number' => '20241112',
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('errors.credentials.0', XmlImportService::CREDENTIALS_ALREADY_USED);
    }

  /** @test */
    public function supervisor_registration_with_matching_email_is_active(): void
    {
        $this->seedSupervisorRecord('super-match@test.edu');

        $response = $this->postJson('/api/register', [
            'name' => 'Matched Supervisor',
            'email' => 'super-match@test.edu',
            'password' => 'secret12',
            'role' => 'supervisor',
            'university_id' => $this->university->id,
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('users', [
            'email' => 'super-match@test.edu',
            'status' => 'active',
        ]);
    }

  /** @test */
    public function supervisor_registration_with_non_matching_email_fails(): void
    {
        $this->seedSupervisorRecord('super-match@test.edu');

        $response = $this->postJson('/api/register', [
            'name' => 'Wrong Supervisor',
            'email' => 'super-wrong@test.edu',
            'password' => 'secret12',
            'role' => 'supervisor',
            'university_id' => $this->university->id,
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('errors.credentials.0', XmlImportService::CREDENTIALS_MISMATCH);
    }

  /** @test */
    public function supervisor_registration_validates_each_university_with_xml(): void
    {
        $uniB = University::firstOrCreate(
            ['slug' => 'xml-reg-uni-b'],
            ['name' => 'XML Registration Uni B', 'is_active' => true],
        );

        $this->seedSupervisorRecord('multi-super@test.edu', $this->university->id);
        $this->seedStudentRecordAtUniversity('20249999', 'placeholder@test.edu', $uniB->id);

        $response = $this->postJson('/api/register', [
            'name' => 'Multi Supervisor',
            'email' => 'multi-super@test.edu',
            'password' => 'secret12',
            'role' => 'supervisor',
            'university_ids' => [$this->university->id, $uniB->id],
            'university_id' => $this->university->id,
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('errors.credentials.0', XmlImportService::CREDENTIALS_MISMATCH);
    }

  /** @test */
    public function supervisor_registration_with_mixed_xml_universities_activates_valid_memberships(): void
    {
        $uniNoXml = University::firstOrCreate(
            ['slug' => 'no-xml-uni-mixed'],
            ['name' => 'No XML Mixed Uni', 'is_active' => true],
        );

        $this->seedSupervisorRecord('mixed-super@test.edu', $this->university->id);

        $response = $this->postJson('/api/register', [
            'name' => 'Mixed Supervisor',
            'email' => 'mixed-super@test.edu',
            'password' => 'secret12',
            'role' => 'supervisor',
            'university_ids' => [$this->university->id, $uniNoXml->id],
            'university_id' => $this->university->id,
        ]);

        $response->assertCreated();

        $userId = $response->json('user.id');
        $this->assertDatabaseHas('supervisor_universities', [
            'user_id' => $userId,
            'university_id' => $this->university->id,
            'status' => 'active',
        ]);
        $this->assertDatabaseHas('supervisor_universities', [
            'user_id' => $userId,
            'university_id' => $uniNoXml->id,
            'status' => 'pending',
        ]);
    }

  /** @test */
    public function registration_falls_back_to_pending_without_xml_records(): void
    {
        $email = 'pending-student-' . uniqid() . '@test.edu';
        $response = $this->postJson('/api/register', [
            'name' => 'Pending Student',
            'email' => $email,
            'password' => 'secret12',
            'role' => 'student',
            'university_id' => $this->noXmlUniversity->id,
            'student_number' => 'NOXML' . uniqid(),
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('users', [
            'email' => $email,
            'status' => 'pending',
        ]);
    }

    private function seedStudentRecord(string $number, string $email): XmlAuthorizedUser
    {
        return $this->seedStudentRecordAtUniversity($number, $email, $this->university->id);
    }

    private function seedStudentRecordAtUniversity(string $number, string $email, int $universityId): XmlAuthorizedUser
    {
        $adminRole = Role::firstOrCreate(['name' => 'admin']);
        $admin = User::create([
            'name' => 'Seed Admin',
            'email' => 'seed-admin-' . uniqid() . '@test.edu',
            'password' => bcrypt('password'),
            'role_id' => $adminRole->id,
            'university_id' => $universityId,
            'status' => 'active',
        ]);

        $log = XmlImportLog::create([
            'university_id' => $universityId,
            'admin_user_id' => $admin->id,
            'filename' => 'seed.xml',
            'file_size' => 50,
            'status' => 'completed',
        ]);

        return XmlAuthorizedUser::withoutGlobalScopes()->create([
            'university_id' => $universityId,
            'university_number' => $number,
            'email' => $email,
            'full_name' => 'Seed Student',
            'user_type' => 'student',
            'import_log_id' => $log->id,
            'imported_at' => now(),
        ]);
    }

    private function seedSupervisorRecord(string $email, ?int $universityId = null): XmlAuthorizedUser
    {
        $universityId = $universityId ?? $this->university->id;
        $adminRole = Role::firstOrCreate(['name' => 'admin']);
        $admin = User::create([
            'name' => 'Seed Admin',
            'email' => 'seed-admin-super-' . uniqid() . '@test.edu',
            'password' => bcrypt('password'),
            'role_id' => $adminRole->id,
            'university_id' => $this->university->id,
            'status' => 'active',
        ]);

        $log = XmlImportLog::create([
            'university_id' => $universityId,
            'admin_user_id' => $admin->id,
            'filename' => 'seed.xml',
            'file_size' => 50,
            'status' => 'completed',
        ]);

        return XmlAuthorizedUser::withoutGlobalScopes()->create([
            'university_id' => $universityId,
            'email' => $email,
            'full_name' => 'Seed Supervisor',
            'user_type' => 'supervisor',
            'import_log_id' => $log->id,
            'imported_at' => now(),
        ]);
    }
}

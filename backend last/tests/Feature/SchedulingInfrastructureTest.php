<?php

namespace Tests\Feature;

use App\Models\AvailableRoom;
use App\Models\DoctorAvailability;
use App\Models\Role;
use App\Models\University;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SchedulingInfrastructureTest extends TestCase
{
    use DatabaseTransactions;

    private University $universityA;

    private University $universityB;

    protected function setUp(): void
    {
        parent::setUp();

        $this->universityA = University::firstOrCreate(
            ['slug' => 'sched-feature-a'],
            ['name' => 'Scheduling Feature University A'],
        );

        $this->universityB = University::firstOrCreate(
            ['slug' => 'sched-feature-b'],
            ['name' => 'Scheduling Feature University B'],
        );
    }

    /** @test */
    public function admin_can_create_and_list_academic_stages_for_own_university(): void
    {
        $admin = $this->makeUser('admin', $this->universityA);
        Sanctum::actingAs($admin);

        $create = $this->postJson('/api/academic-stages', [
            'name' => 'السيمنار الأول',
            'duration_minutes' => 60,
            'default_committee_size' => 3,
        ]);

        $create->assertStatus(201)
            ->assertJsonPath('data.name', 'السيمنار الأول');

        $list = $this->getJson('/api/academic-stages');
        $list->assertStatus(200)
            ->assertJsonCount(1, 'data');
    }

    /** @test */
    public function admin_cannot_view_room_from_another_university(): void
    {
        $adminA = $this->makeUser('admin', $this->universityA);
        $adminB = $this->makeUser('admin', $this->universityB);

        $roomB = AvailableRoom::create([
            'university_id' => $this->universityB->id,
            'name' => 'قاعة B',
        ]);

        Sanctum::actingAs($adminA);

        $this->getJson("/api/available-rooms/{$roomB->id}")
            ->assertStatus(404);
    }

    /** @test */
    public function supervisor_availability_posts_merge_into_single_slot(): void
    {
        $supervisor = $this->makeUser('supervisor', $this->universityA);
        Sanctum::actingAs($supervisor);

        $this->postJson('/api/doctor-availabilities', [
            'day_of_week' => 0,
            'start_time' => '09:00',
            'end_time' => '12:00',
        ])->assertStatus(201);

        $merged = $this->postJson('/api/doctor-availabilities', [
            'day_of_week' => 0,
            'start_time' => '10:00',
            'end_time' => '14:00',
        ]);

        $merged->assertStatus(201)
            ->assertJsonPath('data.start_time', '09:00:00')
            ->assertJsonPath('data.end_time', '14:00:00');

        $this->assertEquals(1, DoctorAvailability::withoutGlobalScopes()
            ->where('user_id', $supervisor->id)
            ->count());
    }

    /** @test */
    public function supervisor_cannot_view_another_supervisors_availability(): void
    {
        $supervisorA = $this->makeUser('supervisor', $this->universityA);
        $supervisorB = $this->makeUser('supervisor', $this->universityA);

        $slot = DoctorAvailability::create([
            'user_id' => $supervisorB->id,
            'university_id' => $this->universityA->id,
            'day_of_week' => 2,
            'start_time' => '09:00:00',
            'end_time' => '11:00:00',
        ]);

        Sanctum::actingAs($supervisorA);

        $this->getJson("/api/doctor-availabilities/{$slot->id}")
            ->assertStatus(404);
    }

    /** @test */
    public function super_admin_listing_rooms_only_returns_own_university(): void
    {
        $superAdminRole = Role::firstOrCreate(['name' => 'super_admin']);
        $superAdmin = User::create([
            'name' => 'Super Admin Scheduling',
            'email' => 'superadmin-sched-' . uniqid() . '@test.local',
            'password' => bcrypt('password'),
            'role_id' => $superAdminRole->id,
            'university_id' => $this->universityA->id,
            'status' => 'active',
        ]);

        AvailableRoom::create([
            'university_id' => $this->universityA->id,
            'name' => 'Room A',
        ]);

        AvailableRoom::create([
            'university_id' => $this->universityB->id,
            'name' => 'Room B',
        ]);

        Sanctum::actingAs($superAdmin);

        $response = $this->getJson('/api/available-rooms');
        $response->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'Room A');
    }

    private function makeUser(string $roleName, University $university): User
    {
        $role = Role::firstOrCreate(['name' => $roleName]);

        return User::create([
            'name' => ucfirst($roleName) . ' User',
            'email' => $roleName . '-' . uniqid() . '@test.local',
            'password' => bcrypt('password'),
            'role_id' => $role->id,
            'university_id' => $university->id,
            'status' => 'active',
        ]);
    }
}

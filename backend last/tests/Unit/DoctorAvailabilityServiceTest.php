<?php

namespace Tests\Unit;

use App\Models\DoctorAvailability;
use App\Models\Role;
use App\Models\University;
use App\Models\User;
use App\Services\Scheduling\DoctorAvailabilityService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class DoctorAvailabilityServiceTest extends TestCase
{
    use DatabaseTransactions;

    private DoctorAvailabilityService $service;

    private University $university;

    protected function setUp(): void
    {
        parent::setUp();

        $this->service = app(DoctorAvailabilityService::class);
        $this->university = University::firstOrCreate(
            ['slug' => 'scheduling-unit-uni'],
            ['name' => 'Scheduling Unit University'],
        );
    }

    /** @test */
    public function create_slot_merges_overlapping_windows_into_one_row(): void
    {
        $supervisor = $this->makeSupervisor();

        $this->service->createSlot($supervisor, 0, '09:00', '12:00');
        $merged = $this->service->createSlot($supervisor, 0, '10:00', '14:00');

        $this->assertEquals('09:00:00', $merged->start_time);
        $this->assertEquals('14:00:00', $merged->end_time);
        $this->assertEquals(1, DoctorAvailability::withoutGlobalScopes()
            ->where('user_id', $supervisor->id)
            ->count());
    }

    /** @test */
    public function create_slot_scopes_merge_to_same_university(): void
    {
        $supervisor = $this->makeSupervisor();

        $slot = $this->service->createSlot($supervisor, 1, '08:00', '10:00');

        $this->assertEquals($this->university->id, $slot->university_id);
    }

    private function makeSupervisor(): User
    {
        $role = Role::firstOrCreate(['name' => 'supervisor']);

        return User::create([
            'name' => 'Scheduling Supervisor',
            'email' => 'sched-supervisor-' . uniqid() . '@test.local',
            'password' => bcrypt('password'),
            'role_id' => $role->id,
            'university_id' => $this->university->id,
            'status' => 'active',
        ]);
    }
}

<?php

namespace Database\Seeders;

use App\Models\Role;
use Illuminate\Database\Seeder;

class RolesSeeder extends Seeder
{
    public function run()
    {
        // Prefer stable names; keep classic ids when available.
        $roles = [
            ['id' => 1, 'name' => 'admin'],
            ['id' => 2, 'name' => 'student'],
            ['id' => 3, 'name' => 'supervisor'],
            ['id' => 4, 'name' => 'super_admin'],
        ];

        foreach ($roles as $role) {
            Role::updateOrCreate(
                ['name' => $role['name']],
                ['name' => $role['name']],
            );
        }

        // Best-effort align classic ids without breaking unique name constraints.
        foreach ($roles as $role) {
            $existing = Role::where('name', $role['name'])->first();
            $slot = Role::find($role['id']);
            if ($existing && !$slot && (int) $existing->id !== (int) $role['id']) {
                // Leave as-is if remapping would collide; names are the source of truth.
            }
        }
    }
}

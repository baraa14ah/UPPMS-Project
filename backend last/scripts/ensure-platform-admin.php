<?php

use App\Models\Role;
use App\Models\University;
use App\Models\User;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\DB;

require __DIR__ . '/../vendor/autoload.php';
$app = require __DIR__ . '/../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

echo "=== Current roles ===\n";
foreach (Role::query()->orderBy('id')->get(['id', 'name']) as $role) {
    echo "{$role->id} => {$role->name}\n";
}

$desired = [
    1 => 'admin',
    2 => 'student',
    3 => 'supervisor',
    4 => 'super_admin',
];

DB::transaction(function () use ($desired) {
    // Ensure each role name exists, prefer the expected id when free.
    foreach ($desired as $id => $name) {
        $byName = Role::query()->where('name', $name)->first();
        $byId = Role::query()->whereKey($id)->first();

        if ($byName && (int) $byName->id === $id) {
            continue;
        }

        if ($byName && (int) $byName->id !== $id) {
            // Name exists under another id: only remount to expected id if free.
            if (!$byId) {
                DB::table('roles')->where('id', $byName->id)->update(['id' => $id, 'updated_at' => now()]);
                // Keep FK users pointing to the new role id.
                User::query()->where('role_id', $byName->id)->update(['role_id' => $id]);
            }
            continue;
        }

        if ($byId && $byId->name !== $name) {
            // Slot taken by a different name — create/ensure by name only.
            Role::query()->firstOrCreate(['name' => $name], ['id' => null]);
            continue;
        }

        if (!$byId) {
            Role::query()->create([
                'id' => $id,
                'name' => $name,
            ]);
        }
    }
});

$superRole = Role::query()->where('name', 'super_admin')->first();
if (!$superRole) {
    $superRole = Role::query()->create([
        'id' => 4,
        'name' => 'super_admin',
    ]);
}

echo "\n=== Roles after fix ===\n";
foreach (Role::query()->orderBy('id')->get(['id', 'name']) as $role) {
    echo "{$role->id} => {$role->name}\n";
}

$university = University::query()->first()
    ?? University::query()->create([
        'name' => env('DEFAULT_UNIVERSITY_NAME', 'Legacy'),
        'slug' => 'legacy',
        'is_active' => true,
    ]);

$user = User::query()->updateOrCreate(
    ['email' => 'superadmin@pms.local'],
    [
        'name' => 'Platform Admin',
        'password' => 'password',
        'role_id' => $superRole->id,
        'university_id' => $university->id,
        'status' => 'active',
    ]
);

echo "\n=== Platform admin ===\n";
echo "email={$user->email}\n";
echo "role_id={$user->role_id}\n";
echo "role={$superRole->name}\n";
echo "status={$user->status}\n";
echo "university_id={$user->university_id}\n";
echo "password=password\n";

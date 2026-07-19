<?php

/**
 * Wipe all students and supervisors (and related academic data),
 * clear XML authorize lists, so you can re-test XML import.
 *
 * Usage (from backend last/):
 *   php scripts/wipe-students-supervisors.php
 *   php scripts/wipe-students-supervisors.php --university=1
 */

use App\Models\Project;
use App\Models\ProjectProposal;
use App\Models\Role;
use App\Models\User;
use App\Models\XmlAuthorizedUser;
use App\Models\XmlImportLog;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

require __DIR__ . '/../vendor/autoload.php';
$app = require __DIR__ . '/../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

$universityFilter = null;
foreach ($argv as $arg) {
    if (str_starts_with($arg, '--university=')) {
        $universityFilter = (int) substr($arg, strlen('--university='));
    }
}

$roleIds = Role::query()
    ->whereIn('name', ['student', 'supervisor'])
    ->pluck('id');

if ($roleIds->isEmpty()) {
    echo "No student/supervisor roles found.\n";
    exit(1);
}

$userQuery = User::withoutGlobalScopes()
    ->whereIn('role_id', $roleIds);

if ($universityFilter) {
    $userQuery->where('university_id', $universityFilter);
}

$userIds = $userQuery->pluck('id');

echo "Found {$userIds->count()} student/supervisor users"
    . ($universityFilter ? " (university {$universityFilter})" : ' (all universities)')
    . ".\n";

DB::transaction(function () use ($userIds, $universityFilter) {
    if ($userIds->isNotEmpty()) {
        $projectIds = Project::withoutGlobalScopes()
            ->where(function ($q) use ($userIds) {
                $q->whereIn('user_id', $userIds)->orWhereIn('supervisor_id', $userIds);
            })
            ->when($universityFilter, fn ($q) => $q->where('university_id', $universityFilter))
            ->pluck('id');

        echo "Related projects: {$projectIds->count()}\n";

        $deleteIfExists = function (string $table, callable $builder) {
            if (!Schema::hasTable($table)) {
                return 0;
            }

            return $builder(DB::table($table));
        };

        if ($projectIds->isNotEmpty()) {
            $deleteIfExists('project_versions', fn ($q) => $q->whereIn('project_id', $projectIds)->delete());
            $deleteIfExists('comments', fn ($q) => $q->whereIn('project_id', $projectIds)->delete());
            $deleteIfExists('ratings', fn ($q) => $q->whereIn('project_id', $projectIds)->delete());
            $deleteIfExists('project_activities', fn ($q) => $q->whereIn('project_id', $projectIds)->delete());
            $deleteIfExists('tasks', fn ($q) => $q->whereIn('project_id', $projectIds)->delete());
            $deleteIfExists('project_members', fn ($q) => $q->whereIn('project_id', $projectIds)->delete());
            $deleteIfExists('student_invitations', fn ($q) => $q->whereIn('project_id', $projectIds)->delete());
            $deleteIfExists('supervisor_invitations', fn ($q) => $q->whereIn('project_id', $projectIds)->delete());
            $deleteIfExists('defense_sessions', fn ($q) => $q->whereIn('project_id', $projectIds)->delete());
            $deleteIfExists('git_commits', fn ($q) => $q->whereIn('project_id', $projectIds)->delete());
        }

        $deleteIfExists('project_versions', fn ($q) => $q->whereIn('user_id', $userIds)->delete());
        $deleteIfExists('comments', fn ($q) => $q->whereIn('user_id', $userIds)->delete());
        $deleteIfExists('ratings', fn ($q) => $q->whereIn('user_id', $userIds)->delete());
        $deleteIfExists('project_activities', fn ($q) => $q->whereIn('user_id', $userIds)->delete());

        if (Schema::hasTable('tasks') && Schema::hasColumn('tasks', 'assigned_to')) {
            DB::table('tasks')->whereIn('assigned_to', $userIds)->update(['assigned_to' => null]);
        }

        $deleteIfExists('project_members', fn ($q) => $q->whereIn('student_id', $userIds)->delete());
        $deleteIfExists('student_invitations', function ($q) use ($userIds) {
            return $q->where(function ($inner) use ($userIds) {
                $inner->whereIn('student_id', $userIds)->orWhereIn('sent_by_id', $userIds);
            })->delete();
        });
        $deleteIfExists('supervisor_invitations', function ($q) use ($userIds) {
            return $q->where(function ($inner) use ($userIds) {
                $inner->whereIn('supervisor_id', $userIds)->orWhereIn('student_id', $userIds);
            })->delete();
        });
        $deleteIfExists('project_user', fn ($q) => $q->whereIn('user_id', $userIds)->delete());

        if (Schema::hasTable('project_proposals')) {
            $proposalIds = ProjectProposal::withoutGlobalScopes()
                ->where(function ($q) use ($userIds) {
                    $q->whereIn('student_id', $userIds)
                        ->orWhereIn('requested_supervisor_id', $userIds);
                })
                ->pluck('id');

            if ($proposalIds->isNotEmpty()) {
                Project::withoutGlobalScopes()
                    ->whereIn('proposal_id', $proposalIds)
                    ->update(['proposal_id' => null]);
                ProjectProposal::withoutGlobalScopes()
                    ->whereIn('id', $proposalIds)
                    ->delete();
            }
        }

        if (Schema::hasTable('student_progress')) {
            $progressIds = DB::table('student_progress')->whereIn('student_id', $userIds)->pluck('id');
            if (Schema::hasTable('student_progress_history') && $progressIds->isNotEmpty()) {
                DB::table('student_progress_history')->whereIn('student_progress_id', $progressIds)->delete();
                DB::table('student_progress_history')->whereIn('recorded_by', $userIds)->delete();
            }
            DB::table('student_progress')->whereIn('student_id', $userIds)->delete();
        }

        $deleteIfExists('committee_members', fn ($q) => $q->whereIn('user_id', $userIds)->delete());
        $deleteIfExists('committee_assignments', fn ($q) => $q->whereIn('user_id', $userIds)->delete());
        $deleteIfExists('doctor_availabilities', fn ($q) => $q->whereIn('user_id', $userIds)->delete());
        $deleteIfExists('supervisor_universities', fn ($q) => $q->whereIn('user_id', $userIds)->delete());
        $deleteIfExists('bookmarked_ideas', fn ($q) => $q->whereIn('user_id', $userIds)->delete());
        $deleteIfExists('ideation_requests', fn ($q) => $q->whereIn('user_id', $userIds)->delete());
        $deleteIfExists('task_generation_logs', fn ($q) => $q->whereIn('user_id', $userIds)->delete());
        $deleteIfExists('user_profiles', fn ($q) => $q->whereIn('user_id', $userIds)->delete());
        $deleteIfExists('password_reset_requests', fn ($q) => $q->whereIn('user_id', $userIds)->delete());

        Project::withoutGlobalScopes()->whereIn('supervisor_id', $userIds)->update(['supervisor_id' => null]);
        Project::withoutGlobalScopes()->whereIn('user_id', $userIds)->delete();

        DB::table('personal_access_tokens')
            ->where('tokenable_type', User::class)
            ->whereIn('tokenable_id', $userIds)
            ->delete();

        DB::table('notifications')
            ->where('notifiable_type', User::class)
            ->whereIn('notifiable_id', $userIds)
            ->delete();

        XmlAuthorizedUser::withoutGlobalScopes()
            ->whereIn('registered_user_id', $userIds)
            ->update([
                'registered_user_id' => null,
                'is_used' => false,
                'used_at' => null,
            ]);

        $deletedUsers = User::withoutGlobalScopes()->whereIn('id', $userIds)->delete();
        echo "Deleted users: {$deletedUsers}\n";
    }

    $xmlQuery = XmlAuthorizedUser::withoutGlobalScopes();
    $logQuery = XmlImportLog::withoutGlobalScopes();
    if ($universityFilter) {
        $xmlQuery->where('university_id', $universityFilter);
        $logQuery->where('university_id', $universityFilter);
    }

    $xmlDeleted = $xmlQuery->delete();
    $logsDeleted = $logQuery->delete();

    echo "Cleared XML authorized users: {$xmlDeleted}\n";
    echo "Cleared XML import logs: {$logsDeleted}\n";
});

echo "Done. Admins were kept. You can now upload the sample XML.\n";

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('track_stages', function (Blueprint $table) {
            $table->boolean('is_decisive')->default(true)->after('description');
        });

        $driver = Schema::getConnection()->getDriverName();

        if ($driver === 'mysql') {
            DB::statement(
                "ALTER TABLE student_progress MODIFY status ENUM('in_progress', 'passed', 'failed', 'incomplete') NOT NULL DEFAULT 'in_progress'"
            );
            DB::statement(
                "ALTER TABLE student_progress_history MODIFY status ENUM('in_progress', 'passed', 'failed', 'incomplete') NOT NULL"
            );
        }
    }

    public function down(): void
    {
        Schema::table('track_stages', function (Blueprint $table) {
            $table->dropColumn('is_decisive');
        });

        $driver = Schema::getConnection()->getDriverName();

        if ($driver === 'mysql') {
            DB::statement(
                "ALTER TABLE student_progress MODIFY status ENUM('in_progress', 'passed', 'failed') NOT NULL DEFAULT 'in_progress'"
            );
            DB::statement(
                "ALTER TABLE student_progress_history MODIFY status ENUM('in_progress', 'passed', 'failed') NOT NULL"
            );
        }
    }
};

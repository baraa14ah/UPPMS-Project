<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('academic_stages_config', function (Blueprint $table) {
            if (!Schema::hasColumn('academic_stages_config', 'day_start_time')) {
                $table->time('day_start_time')->nullable()->after('allowed_defense_days');
            }
            if (!Schema::hasColumn('academic_stages_config', 'day_end_time')) {
                $table->time('day_end_time')->nullable()->after('day_start_time');
            }
        });
    }

    public function down(): void
    {
        Schema::table('academic_stages_config', function (Blueprint $table) {
            $table->dropColumn(['day_start_time', 'day_end_time']);
        });
    }
};

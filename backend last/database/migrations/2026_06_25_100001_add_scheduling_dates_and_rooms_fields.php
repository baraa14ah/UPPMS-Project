<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('academic_stages_config', function (Blueprint $table) {
            $table->date('defense_period_start')->nullable()->after('display_order');
        });

        Schema::table('defense_sessions', function (Blueprint $table) {
            $table->date('scheduled_date')->nullable()->after('scheduled_day_of_week');
        });
    }

    public function down(): void
    {
        Schema::table('academic_stages_config', function (Blueprint $table) {
            $table->dropColumn('defense_period_start');
        });

        Schema::table('defense_sessions', function (Blueprint $table) {
            $table->dropColumn('scheduled_date');
        });
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('academic_stages_config', function (Blueprint $table) {
            $table->date('defense_period_end')->nullable()->after('defense_period_start');
            $table->json('allowed_defense_days')->nullable()->after('defense_period_end');
        });

        Schema::table('available_rooms', function (Blueprint $table) {
            $table->dropIndex(['university_id', 'is_available']);
            $table->dropColumn(['capacity', 'is_available']);
        });
    }

    public function down(): void
    {
        Schema::table('academic_stages_config', function (Blueprint $table) {
            $table->dropColumn(['defense_period_end', 'allowed_defense_days']);
        });

        Schema::table('available_rooms', function (Blueprint $table) {
            $table->unsignedInteger('capacity')->nullable()->after('name');
            $table->boolean('is_available')->default(true)->after('building');
            $table->index(['university_id', 'is_available']);
        });
    }
};

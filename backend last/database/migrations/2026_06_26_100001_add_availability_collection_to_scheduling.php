<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('academic_stages_config', function (Blueprint $table) {
            $table->boolean('availability_open')->default(false)->after('allowed_defense_days');
            $table->timestamp('availability_opened_at')->nullable()->after('availability_open');
        });

        Schema::table('doctor_availabilities', function (Blueprint $table) {
            $table->foreignId('academic_stage_id')
                ->nullable()
                ->after('university_id')
                ->constrained('academic_stages_config')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('doctor_availabilities', function (Blueprint $table) {
            $table->dropConstrainedForeignId('academic_stage_id');
        });

        Schema::table('academic_stages_config', function (Blueprint $table) {
            $table->dropColumn(['availability_open', 'availability_opened_at']);
        });
    }
};

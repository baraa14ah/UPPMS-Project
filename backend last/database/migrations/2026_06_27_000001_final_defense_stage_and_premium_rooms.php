<?php

use App\Models\AcademicStageConfig;
use App\Models\University;
use App\Services\Scheduling\UniversitySchedulingBootstrapService;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('academic_stages_config', function (Blueprint $table) {
            $table->string('stage_key', 64)->nullable()->after('name');
            $table->string('availability_mode', 32)->default('flexible')->after('allowed_defense_days');
            $table->json('mandatory_slots')->nullable()->after('availability_mode');
            $table->boolean('is_system_stage')->default(false)->after('mandatory_slots');

            $table->unique(['university_id', 'stage_key']);
        });

        Schema::table('available_rooms', function (Blueprint $table) {
            $table->boolean('is_premium')->default(false)->after('building');
        });

        $bootstrap = app(UniversitySchedulingBootstrapService::class);

        University::query()->each(function (University $university) use ($bootstrap) {
            $bootstrap->ensureFinalDefenseStage($university);
        });

        AcademicStageConfig::query()
            ->whereNull('stage_key')
            ->where('name', 'المناقشة النهائية')
            ->update([
                'stage_key' => AcademicStageConfig::STAGE_KEY_FINAL_DEFENSE,
                'is_system_stage' => true,
                'availability_mode' => 'mandatory',
            ]);
    }

    public function down(): void
    {
        Schema::table('available_rooms', function (Blueprint $table) {
            $table->dropColumn('is_premium');
        });

        Schema::table('academic_stages_config', function (Blueprint $table) {
            $table->dropUnique(['university_id', 'stage_key']);
            $table->dropColumn(['stage_key', 'availability_mode', 'mandatory_slots', 'is_system_stage']);
        });
    }
};

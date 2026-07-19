<?php

use App\Models\AcademicStageConfig;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('academic_stages_config', function (Blueprint $table) {
            $table->json('applicable_presets')->nullable()->after('stage_key');
        });

        AcademicStageConfig::withoutGlobalScopes()
            ->orderBy('id')
            ->each(function (AcademicStageConfig $stage) {
                $presets = AcademicStageConfig::inferApplicablePresets($stage);
                if ($presets !== []) {
                    $stage->update(['applicable_presets' => $presets]);
                }
            });
    }

    public function down(): void
    {
        Schema::table('academic_stages_config', function (Blueprint $table) {
            $table->dropColumn('applicable_presets');
        });
    }
};

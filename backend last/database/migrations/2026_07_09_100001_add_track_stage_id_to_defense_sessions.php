<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('defense_sessions', function (Blueprint $table) {
            $table->foreignId('track_stage_id')
                ->nullable()
                ->after('project_id')
                ->constrained('track_stages')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('defense_sessions', function (Blueprint $table) {
            $table->dropConstrainedForeignId('track_stage_id');
        });
    }
};

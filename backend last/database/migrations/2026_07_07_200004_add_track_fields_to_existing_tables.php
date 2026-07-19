<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('track_id')->nullable()->after('university_id')->constrained('tracks')->nullOnDelete();
        });

        Schema::table('project_proposals', function (Blueprint $table) {
            $table->foreignId('track_stage_id')->nullable()->after('status')->constrained('track_stages')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('project_proposals', function (Blueprint $table) {
            $table->dropConstrainedForeignId('track_stage_id');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('track_id');
        });
    }
};

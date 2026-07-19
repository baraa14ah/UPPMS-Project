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
            $table->foreignId('parent_id')
                ->nullable()
                ->after('track_id')
                ->constrained('track_stages')
                ->nullOnDelete();

            $table->string('stage_kind', 16)->default('step')->after('parent_id');
        });

        // Existing rows are standalone actionable steps.
        DB::table('track_stages')->whereNull('stage_kind')->update(['stage_kind' => 'step']);
    }

    public function down(): void
    {
        Schema::table('track_stages', function (Blueprint $table) {
            $table->dropConstrainedForeignId('parent_id');
            $table->dropColumn('stage_kind');
        });
    }
};

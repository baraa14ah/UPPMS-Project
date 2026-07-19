<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('defense_sessions', function (Blueprint $table) {
            $table->foreignId('committee_id')
                ->nullable()
                ->after('room_id')
                ->constrained('committees')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('defense_sessions', function (Blueprint $table) {
            $table->dropConstrainedForeignId('committee_id');
        });
    }
};

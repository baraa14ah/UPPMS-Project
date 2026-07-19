<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('defense_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('approved_schedule_id')->constrained('approved_schedules')->onDelete('cascade');
            $table->foreignId('project_id')->constrained('projects')->onDelete('cascade');
            $table->unsignedTinyInteger('scheduled_day_of_week');
            $table->time('scheduled_start_time');
            $table->time('scheduled_end_time');
            $table->foreignId('room_id')->nullable()->constrained('available_rooms')->onDelete('set null');
            $table->enum('status', ['scheduled', 'completed', 'cancelled'])->default('scheduled');
            $table->timestamps();

            $table->index('approved_schedule_id');
            $table->index('project_id');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('defense_sessions');
    }
};

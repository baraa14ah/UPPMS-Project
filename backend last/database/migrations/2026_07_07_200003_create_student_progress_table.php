<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('student_progress', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('track_id')->constrained('tracks')->cascadeOnDelete();
            $table->foreignId('track_stage_id')->constrained('track_stages')->cascadeOnDelete();
            $table->enum('status', ['in_progress', 'passed', 'failed'])->default('in_progress');
            $table->foreignId('defense_result_recorded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('defense_result_recorded_at')->nullable();
            $table->text('modification_reason')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->unique(['student_id', 'track_id', 'track_stage_id']);
            $table->index(['student_id', 'track_id']);
            $table->index(['track_id', 'status']);
        });

        Schema::create('student_progress_history', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_progress_id')->constrained('student_progress')->cascadeOnDelete();
            $table->unsignedInteger('attempt_number');
            $table->enum('status', ['in_progress', 'passed', 'failed']);
            $table->foreignId('recorded_by')->constrained('users')->cascadeOnDelete();
            $table->timestamp('recorded_at');
            $table->text('modification_reason')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['student_progress_id', 'attempt_number'], 'sph_progress_attempt_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('student_progress_history');
        Schema::dropIfExists('student_progress');
    }
};

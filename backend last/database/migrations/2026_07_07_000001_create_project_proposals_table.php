<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('project_proposals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('university_id')->constrained()->cascadeOnDelete();
            $table->foreignId('student_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('requested_supervisor_id')->constrained('users')->cascadeOnDelete();
            $table->string('title', 200);
            $table->text('description');
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->text('supervisor_feedback')->nullable();
            $table->unsignedTinyInteger('resubmission_count')->default(0);
            $table->timestamps();

            $table->index(
                ['university_id', 'student_id', 'status'],
                'idx_proposal_university_student_status'
            );
            $table->index(
                ['requested_supervisor_id', 'status'],
                'idx_proposal_supervisor_status'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('project_proposals');
    }
};

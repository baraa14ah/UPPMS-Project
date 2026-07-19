<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('approved_schedules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('university_id')->constrained('universities')->onDelete('cascade');
            $table->foreignId('academic_stage_id')->constrained('academic_stages_config')->onDelete('cascade');
            $table->foreignId('approved_by')->constrained('users')->onDelete('cascade');
            $table->timestamp('approved_at');
            $table->enum('status', ['active', 'voided'])->default('active');
            $table->json('metadata')->nullable();
            $table->timestamp('voided_at')->nullable();
            $table->foreignId('voided_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();

            $table->index(['university_id', 'academic_stage_id']);
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('approved_schedules');
    }
};

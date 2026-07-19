<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('track_stages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('track_id')->constrained('tracks')->cascadeOnDelete();
            $table->foreignId('academic_stage_id')->nullable()->constrained('academic_stages_config')->nullOnDelete();
            $table->unsignedInteger('sequence_order');
            $table->string('name', 255);
            $table->text('description')->nullable();
            $table->timestamps();

            $table->index(['track_id', 'sequence_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('track_stages');
    }
};

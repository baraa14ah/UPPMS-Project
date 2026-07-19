<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** Create academic_stages_config table for seminar/defense stage definitions. */
    public function up(): void
    {
        Schema::create('academic_stages_config', function (Blueprint $table) {
            $table->id();
            $table->foreignId('university_id')->constrained('universities')->onDelete('cascade');
            $table->string('name');
            $table->unsignedInteger('duration_minutes');
            $table->unsignedTinyInteger('default_committee_size')->default(3);
            $table->unsignedInteger('display_order')->default(0);
            $table->timestamps();

            $table->unique(['university_id', 'name']);
            $table->index(['university_id', 'display_order']);
        });
    }

    /** Drop academic_stages_config table. */
    public function down(): void
    {
        Schema::dropIfExists('academic_stages_config');
    }
};

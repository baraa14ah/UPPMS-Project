<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** Create doctor_availabilities table for weekly supervisor time windows. */
    public function up(): void
    {
        Schema::create('doctor_availabilities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('university_id')->constrained('universities')->onDelete('cascade');
            $table->unsignedTinyInteger('day_of_week');
            $table->time('start_time');
            $table->time('end_time');
            $table->timestamps();

            $table->index(['user_id', 'day_of_week']);
            $table->index('university_id');
        });
    }

    /** Drop doctor_availabilities table. */
    public function down(): void
    {
        Schema::dropIfExists('doctor_availabilities');
    }
};

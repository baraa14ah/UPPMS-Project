<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** Create available_rooms table for defense session venues. */
    public function up(): void
    {
        Schema::create('available_rooms', function (Blueprint $table) {
            $table->id();
            $table->foreignId('university_id')->constrained('universities')->onDelete('cascade');
            $table->string('name');
            $table->unsignedInteger('capacity')->nullable();
            $table->string('building')->nullable();
            $table->boolean('is_available')->default(true);
            $table->timestamps();

            $table->unique(['university_id', 'name']);
            $table->index(['university_id', 'is_available']);
        });
    }

    /** Drop available_rooms table. */
    public function down(): void
    {
        Schema::dropIfExists('available_rooms');
    }
};

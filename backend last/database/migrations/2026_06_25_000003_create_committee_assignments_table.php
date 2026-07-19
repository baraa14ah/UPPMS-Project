<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('committee_assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('defense_session_id')->constrained('defense_sessions')->onDelete('cascade');
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->timestamp('notified_at')->nullable();
            $table->timestamps();

            $table->unique(['defense_session_id', 'user_id'], 'uniq_session_user');
            $table->index('defense_session_id');
            $table->index('user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('committee_assignments');
    }
};

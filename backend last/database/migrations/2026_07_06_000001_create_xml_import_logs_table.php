<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
  public function up(): void
  {
    Schema::create('xml_import_logs', function (Blueprint $table) {
      $table->id();
      $table->foreignId('university_id')->constrained('universities')->cascadeOnDelete();
      $table->foreignId('admin_user_id')->constrained('users')->cascadeOnDelete();
      $table->string('filename');
      $table->unsignedInteger('file_size');
      $table->unsignedInteger('total_records')->default(0);
      $table->unsignedInteger('students_count')->default(0);
      $table->unsignedInteger('supervisors_count')->default(0);
      $table->unsignedInteger('success_count')->default(0);
      $table->unsignedInteger('error_count')->default(0);
      $table->json('errors_json')->nullable();
      $table->enum('status', ['processing', 'completed', 'failed'])->default('processing');
      $table->timestamps();

      $table->index(['university_id', 'created_at'], 'idx_import_university');
    });
  }

  public function down(): void
  {
    Schema::dropIfExists('xml_import_logs');
  }
};

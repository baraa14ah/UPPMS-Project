<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
  public function up(): void
  {
    Schema::create('xml_authorized_users', function (Blueprint $table) {
      $table->id();
      $table->foreignId('university_id')->constrained('universities')->cascadeOnDelete();
      $table->string('university_number', 50)->nullable();
      $table->string('email');
      $table->string('full_name');
      $table->enum('user_type', ['student', 'supervisor']);
      $table->boolean('is_used')->default(false);
      $table->foreignId('registered_user_id')->nullable()->constrained('users')->nullOnDelete();
      $table->foreignId('import_log_id')->constrained('xml_import_logs')->cascadeOnDelete();
      $table->timestamp('imported_at');
      $table->timestamp('used_at')->nullable();
      $table->timestamps();

      $table->index(
        ['university_id', 'university_number', 'email', 'is_used'],
        'idx_xml_auth_lookup'
      );
      $table->index(['university_id', 'email', 'user_type'], 'idx_xml_auth_email');
      $table->index('import_log_id', 'idx_xml_auth_import');
      $table->unique(
        ['university_id', 'university_number', 'email', 'user_type'],
        'uniq_xml_student_record'
      );
    });
  }

  public function down(): void
  {
    Schema::dropIfExists('xml_authorized_users');
  }
};

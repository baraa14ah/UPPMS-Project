<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
  public function up(): void
  {
    Schema::create('archived_xml_authorized_users', function (Blueprint $table) {
      $table->id();
      $table->foreignId('university_id')->constrained('universities')->cascadeOnDelete();
      $table->string('university_number', 50)->nullable();
      $table->string('email');
      $table->string('full_name');
      $table->enum('user_type', ['student', 'supervisor']);
      $table->boolean('is_used')->default(false);
      $table->unsignedBigInteger('registered_user_id')->nullable();
      $table->unsignedBigInteger('import_log_id')->nullable();
      $table->timestamp('imported_at')->nullable();
      $table->timestamp('used_at')->nullable();
      $table->timestamp('archived_at')->nullable();
      $table->string('archive_reason', 50);
      $table->timestamps();

      $table->index(['university_id', 'email'], 'idx_archived_xml_email');
    });
  }

  public function down(): void
  {
    Schema::dropIfExists('archived_xml_authorized_users');
  }
};

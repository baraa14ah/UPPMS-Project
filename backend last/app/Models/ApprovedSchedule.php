<?php

namespace App\Models;

use App\Models\Concerns\BelongsToUniversity;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ApprovedSchedule extends Model
{
    use HasFactory, BelongsToUniversity;

    protected $fillable = [
        'university_id',
        'academic_stage_id',
        'approved_by',
        'approved_at',
        'status',
        'metadata',
        'voided_at',
        'voided_by',
    ];

    protected $casts = [
        'approved_at' => 'datetime',
        'voided_at' => 'datetime',
        'metadata' => 'array',
    ];

    public function academicStage(): BelongsTo
    {
        return $this->belongsTo(AcademicStageConfig::class, 'academic_stage_id');
    }

    public function approvedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function voidedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'voided_by');
    }

    public function defenseSessions(): HasMany
    {
        return $this->hasMany(DefenseSession::class);
    }

    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    public function scopeForStage($query, int $stageId)
    {
        return $query->where('academic_stage_id', $stageId);
    }

    public function void(int $userId): void
    {
        $this->update([
            'status' => 'voided',
            'voided_at' => now(),
            'voided_by' => $userId,
        ]);

        $this->defenseSessions()->update(['status' => 'cancelled']);
    }
}

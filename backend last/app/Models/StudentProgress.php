<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class StudentProgress extends Model
{
    use HasFactory;

    protected $table = 'student_progress';

    protected $fillable = [
        'student_id',
        'track_id',
        'track_stage_id',
        'status',
        'defense_result_recorded_by',
        'defense_result_recorded_at',
        'modification_reason',
        'completed_at',
    ];

    protected $casts = [
        'defense_result_recorded_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    public function student(): BelongsTo
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    public function track(): BelongsTo
    {
        return $this->belongsTo(Track::class);
    }

    public function trackStage(): BelongsTo
    {
        return $this->belongsTo(TrackStage::class);
    }

    public function recordedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'defense_result_recorded_by');
    }

    public function history(): HasMany
    {
        return $this->hasMany(StudentProgressHistory::class)->orderBy('attempt_number');
    }

    public function isModificationAllowed(User $user): bool
    {
        if ($this->status === 'in_progress') {
            return true;
        }

        if ($user->isAdmin()) {
            return true;
        }

        if (!$this->defense_result_recorded_at) {
            return true;
        }

        return $this->defense_result_recorded_at->diffInHours(now()) < 48;
    }
}

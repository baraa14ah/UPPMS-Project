<?php

namespace App\Models;

use App\Models\Concerns\BelongsToUniversity;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DoctorAvailability extends Model
{
    use HasFactory, BelongsToUniversity;

    protected $fillable = [
        'user_id',
        'university_id',
        'academic_stage_id',
        'day_of_week',
        'start_time',
        'end_time',
    ];

    protected $casts = [
        'day_of_week' => 'integer',
    ];

    protected $appends = ['day_name'];

    /** Returns the supervisor who owns this availability window. */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function academicStage(): BelongsTo
    {
        return $this->belongsTo(AcademicStageConfig::class, 'academic_stage_id');
    }

    /** Human-readable day name for API responses. */
    public function getDayNameAttribute(): string
    {
        $days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

        return $days[$this->day_of_week] ?? 'Unknown';
    }
}

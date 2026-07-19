<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StudentProgressHistory extends Model
{
    use HasFactory;

    protected $table = 'student_progress_history';

    public $timestamps = false;

    protected $fillable = [
        'student_progress_id',
        'attempt_number',
        'status',
        'recorded_by',
        'recorded_at',
        'modification_reason',
    ];

    protected $casts = [
        'recorded_at' => 'datetime',
    ];

    public function progress(): BelongsTo
    {
        return $this->belongsTo(StudentProgress::class, 'student_progress_id');
    }

    public function recorder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }
}

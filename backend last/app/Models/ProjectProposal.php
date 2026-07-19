<?php

namespace App\Models;

use App\Models\Concerns\BelongsToUniversity;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class ProjectProposal extends Model
{
    use BelongsToUniversity;

    protected $fillable = [
        'university_id',
        'student_id',
        'requested_supervisor_id',
        'title',
        'description',
        'status',
        'track_stage_id',
        'supervisor_feedback',
        'resubmission_count',
    ];

    protected $casts = [
        'resubmission_count' => 'integer',
    ];

    public function student(): BelongsTo
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    public function requestedSupervisor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_supervisor_id');
    }

    public function university(): BelongsTo
    {
        return $this->belongsTo(University::class);
    }

    public function project(): HasOne
    {
        return $this->hasOne(Project::class, 'proposal_id');
    }

    public function trackStage(): BelongsTo
    {
        return $this->belongsTo(TrackStage::class);
    }
}

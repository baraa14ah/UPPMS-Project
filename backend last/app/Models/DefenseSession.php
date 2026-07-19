<?php

namespace App\Models;

use App\Support\SchedulingDateHelper;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DefenseSession extends Model
{
    use HasFactory;

    /** Columns required when eager-loading defense sessions for API responses. */
    public const DETAIL_COLUMNS = [
        'id',
        'project_id',
        'track_stage_id',
        'approved_schedule_id',
        'status',
        'committee_id',
        'room_id',
        'scheduled_day_of_week',
        'scheduled_date',
        'scheduled_start_time',
        'scheduled_end_time',
    ];

    protected $fillable = [
        'approved_schedule_id',
        'project_id',
        'track_stage_id',
        'scheduled_day_of_week',
        'scheduled_date',
        'scheduled_start_time',
        'scheduled_end_time',
        'room_id',
        'committee_id',
        'status',
    ];

    protected $casts = [
        'scheduled_day_of_week' => 'integer',
        'scheduled_date' => 'date',
    ];

    protected $appends = ['day_name', 'time_range', 'formatted_date', 'display_committee'];

    private const DAY_NAMES = [
        0 => 'Sunday',
        1 => 'Monday',
        2 => 'Tuesday',
        3 => 'Wednesday',
        4 => 'Thursday',
        5 => 'Friday',
        6 => 'Saturday',
    ];

    public function approvedSchedule(): BelongsTo
    {
        return $this->belongsTo(ApprovedSchedule::class);
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function trackStage(): BelongsTo
    {
        return $this->belongsTo(TrackStage::class);
    }

    public function room(): BelongsTo
    {
        return $this->belongsTo(AvailableRoom::class, 'room_id');
    }

    public function committee(): BelongsTo
    {
        return $this->belongsTo(Committee::class);
    }

    public function committeeAssignments(): HasMany
    {
        return $this->hasMany(CommitteeAssignment::class);
    }

    public function committeeMembers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'committee_assignments')
            ->withPivot('notified_at')
            ->withTimestamps();
    }

    public function getEvaluatorsAttribute()
    {
        if ($this->committee_id && $this->relationLoaded('committee') && $this->committee) {
            return $this->committee->members;
        }

        if ($this->committee_id) {
            return $this->committee?->members ?? collect();
        }

        return $this->committeeMembers;
    }

    public function getDisplayCommitteeAttribute(): ?array
    {
        if ($this->committee_id) {
            $committee = ($this->relationLoaded('committee') && $this->committee)
                ? $this->committee
                : $this->committee()->with('members:id,name,email')->first();

            if (!$committee) {
                return null;
            }

            if (!$committee->relationLoaded('members')) {
                $committee->load('members:id,name,email');
            }

            return [
                'id' => $committee->id,
                'name' => $committee->name,
                'members' => $committee->members->map(fn (User $member) => [
                    'id' => $member->id,
                    'name' => $member->name,
                    'role' => $member->pivot->role ?? 'member',
                ])->values()->all(),
            ];
        }

        if ($this->relationLoaded('committeeMembers') && $this->committeeMembers->isNotEmpty()) {
            return [
                'id' => null,
                'name' => null,
                'members' => $this->committeeMembers->map(fn (User $member) => [
                    'id' => $member->id,
                    'name' => $member->name,
                    'role' => 'member',
                ])->values()->all(),
            ];
        }

        return null;
    }

    public function getDayNameAttribute(): string
    {
        return self::DAY_NAMES[$this->scheduled_day_of_week] ?? 'Unknown';
    }

    public function getTimeRangeAttribute(): string
    {
        $start = substr((string) $this->scheduled_start_time, 0, 5);
        $end = substr((string) $this->scheduled_end_time, 0, 5);

        return "{$start} - {$end}";
    }

    public function getFormattedDateAttribute(): ?string
    {
        if (!$this->scheduled_date) {
            return null;
        }

        return SchedulingDateHelper::formatDateArabic($this->scheduled_date->format('Y-m-d'));
    }

    public function scopeScheduled($query)
    {
        return $query->where('status', 'scheduled');
    }

    public function scopeForUser($query, int $userId)
    {
        return $query->whereHas('committeeAssignments', function ($q) use ($userId) {
            $q->where('user_id', $userId);
        });
    }
}

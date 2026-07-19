<?php

namespace App\Models;

use App\Models\Concerns\BelongsToUniversity;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Committee extends Model
{
    use HasFactory, BelongsToUniversity;

    protected $fillable = [
        'university_id',
        'name',
        'description',
        'is_active',
        'version',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'version' => 'integer',
    ];

    public function members(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'committee_members')
            ->withPivot('role')
            ->withTimestamps();
    }

    public function defenseSessions(): HasMany
    {
        return $this->hasMany(DefenseSession::class);
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function getChairAttribute(): ?User
    {
        return $this->members->first(fn ($member) => $member->pivot->role === 'chair')
            ?? $this->members()->wherePivot('role', 'chair')->first();
    }

    public function getMemberCountAttribute(): int
    {
        if ($this->relationLoaded('members')) {
            return $this->members->count();
        }

        return $this->members()->count();
    }

    public function hasConflictWith(Project $project): bool
    {
        if (!$project->supervisor_id) {
            return false;
        }

        return $this->members()->where('users.id', $project->supervisor_id)->exists();
    }

    public function canBeAssigned(): bool
    {
        return $this->is_active && $this->members()->count() >= 2;
    }
}

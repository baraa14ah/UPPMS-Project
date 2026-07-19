<?php

namespace App\Models;

use App\Models\Concerns\BelongsToUniversity;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Track extends Model
{
    use HasFactory, BelongsToUniversity;

    protected $fillable = [
        'university_id',
        'name',
        'description',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function stages(): HasMany
    {
        return $this->hasMany(TrackStage::class)->orderBy('sequence_order');
    }

    public function students(): HasMany
    {
        return $this->hasMany(User::class, 'track_id');
    }

    public function progress(): HasMany
    {
        return $this->hasMany(StudentProgress::class);
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}

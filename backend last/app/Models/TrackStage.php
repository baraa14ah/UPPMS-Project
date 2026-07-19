<?php

namespace App\Models;

use App\Support\TrackStageHierarchy;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TrackStage extends Model
{
    use HasFactory;

    protected $fillable = [
        'track_id',
        'parent_id',
        'stage_kind',
        'academic_stage_id',
        'sequence_order',
        'name',
        'description',
        'is_decisive',
    ];

    protected $casts = [
        'sequence_order' => 'integer',
        'is_decisive' => 'boolean',
    ];

    public function track(): BelongsTo
    {
        return $this->belongsTo(Track::class);
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(self::class, 'parent_id')->orderBy('sequence_order');
    }

    public function academicStage(): BelongsTo
    {
        return $this->belongsTo(AcademicStageConfig::class, 'academic_stage_id');
    }

    public function progress(): HasMany
    {
        return $this->hasMany(StudentProgress::class);
    }

    public function isPhase(): bool
    {
        return $this->stage_kind === TrackStageHierarchy::KIND_PHASE;
    }

    public function isStep(): bool
    {
        return $this->stage_kind === TrackStageHierarchy::KIND_STEP;
    }

    public function isActionable(): bool
    {
        return TrackStageHierarchy::isActionable($this);
    }

    /** @deprecated Use TrackStageHierarchy::previousActionableStep() */
    public function previousStage(): ?self
    {
        return TrackStageHierarchy::previousActionableStep($this);
    }

    /** @deprecated Use TrackStageHierarchy::nextActionableStep() */
    public function nextStage(): ?self
    {
        return TrackStageHierarchy::nextActionableStep($this);
    }
}

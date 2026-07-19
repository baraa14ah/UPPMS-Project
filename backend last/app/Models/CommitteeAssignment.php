<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CommitteeAssignment extends Model
{
    use HasFactory;

    protected $fillable = [
        'defense_session_id',
        'user_id',
        'notified_at',
    ];

    protected $casts = [
        'notified_at' => 'datetime',
    ];

    public function defenseSession(): BelongsTo
    {
        return $this->belongsTo(DefenseSession::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function markNotified(): void
    {
        $this->update(['notified_at' => now()]);
    }
}

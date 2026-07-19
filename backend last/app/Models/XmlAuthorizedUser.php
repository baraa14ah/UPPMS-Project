<?php

namespace App\Models;

use App\Models\Concerns\BelongsToUniversity;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class XmlAuthorizedUser extends Model
{
    use BelongsToUniversity;

    protected $fillable = [
        'university_id',
        'university_number',
        'email',
        'full_name',
        'user_type',
        'is_used',
        'registered_user_id',
        'import_log_id',
        'imported_at',
        'used_at',
    ];

    protected $casts = [
        'is_used' => 'boolean',
        'imported_at' => 'datetime',
        'used_at' => 'datetime',
    ];

    public function university(): BelongsTo
    {
        return $this->belongsTo(University::class);
    }

    public function registeredUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'registered_user_id');
    }

    public function importLog(): BelongsTo
    {
        return $this->belongsTo(XmlImportLog::class, 'import_log_id');
    }

    public function markAsUsed(int $userId): void
    {
        if ($this->is_used) {
            throw new \RuntimeException('XML authorized record is already used.');
        }

        $this->update([
            'is_used' => true,
            'registered_user_id' => $userId,
            'used_at' => now(),
        ]);
    }

    /**
     * Locks an available record for registration (call inside a DB transaction).
     */
    public static function lockAvailableForRegistration(
        int $universityId,
        string $email,
        ?string $universityNumber,
        string $userType
    ): ?self {
        $query = static::withoutGlobalScopes()
            ->where('university_id', $universityId)
            ->where('email', strtolower(trim($email)))
            ->where('user_type', $userType)
            ->where('is_used', false);

        if ($userType === 'student') {
            $query->where('university_number', trim((string) $universityNumber));
        }

        return $query->lockForUpdate()->first();
    }

    public function claimForUser(int $userId): void
    {
        $this->markAsUsed($userId);
    }

    public function scopeAvailable(Builder $query): Builder
    {
        return $query->where('is_used', false);
    }
}

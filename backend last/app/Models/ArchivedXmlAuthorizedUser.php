<?php

namespace App\Models;

use App\Models\Concerns\BelongsToUniversity;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ArchivedXmlAuthorizedUser extends Model
{
    use BelongsToUniversity;

    protected $table = 'archived_xml_authorized_users';

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
        'archived_at',
        'archive_reason',
    ];

    protected $casts = [
        'is_used' => 'boolean',
        'imported_at' => 'datetime',
        'used_at' => 'datetime',
        'archived_at' => 'datetime',
    ];

    public function university(): BelongsTo
    {
        return $this->belongsTo(University::class);
    }
}

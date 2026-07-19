<?php

namespace App\Models;

use App\Models\Concerns\BelongsToUniversity;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class XmlImportLog extends Model
{
    use BelongsToUniversity;

    protected $fillable = [
        'university_id',
        'admin_user_id',
        'filename',
        'file_size',
        'total_records',
        'students_count',
        'supervisors_count',
        'success_count',
        'error_count',
        'errors_json',
        'status',
    ];

    protected $casts = [
        'errors_json' => 'array',
    ];

    public function university(): BelongsTo
    {
        return $this->belongsTo(University::class);
    }

    public function admin(): BelongsTo
    {
        return $this->belongsTo(User::class, 'admin_user_id');
    }

    public function authorizedUsers(): HasMany
    {
        return $this->hasMany(XmlAuthorizedUser::class, 'import_log_id');
    }
}

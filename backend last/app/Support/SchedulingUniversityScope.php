<?php

namespace App\Support;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

/**
 * Scheduling resources are always scoped to the authenticated user's university,
 * even for super_admin (TenantScope otherwise bypasses tenant filtering).
 */
class SchedulingUniversityScope
{
    /** @param Builder<Model> $query */
    public static function apply(Builder $query): Builder
    {
        $user = auth()->user();

        if (!$user || !$user->university_id) {
            return $query->whereRaw('1 = 0');
        }

        $table = $query->getModel()->getTable();

        return $query->withoutGlobalScopes()
            ->where("{$table}.university_id", $user->university_id);
    }
}

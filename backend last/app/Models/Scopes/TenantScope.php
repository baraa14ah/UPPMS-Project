<?php

namespace App\Models\Scopes;

use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;

/**
 * Restricts tenant models to universities visible to the authenticated user.
 *
 * - super_admin: no restriction
 * - supervisor: all active supervisor_universities (+ primary university_id)
 * - others: primary university_id only
 */
class TenantScope implements Scope
{
    /** Restricts queries to the authenticated user's visible universities. */
    public function apply(Builder $builder, Model $model): void
    {
        if (!auth()->check()) {
            return;
        }

        $user = auth()->user();
        if (!$user instanceof User) {
            return;
        }

        $user->loadMissing('role');

        if ($user->isSuperAdmin()) {
            return;
        }

        $universityIds = $user->tenantUniversityIds();
        $column = $model->getTable() . '.university_id';

        if (count($universityIds) === 1) {
            $builder->where($column, $universityIds[0]);
        } elseif (count($universityIds) > 1) {
            $builder->whereIn($column, $universityIds);
        } else {
            $builder->whereRaw('1 = 0');
        }
    }
}

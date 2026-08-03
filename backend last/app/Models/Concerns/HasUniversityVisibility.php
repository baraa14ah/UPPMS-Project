<?php

namespace App\Models\Concerns;

use App\Models\Role;
use App\Models\University;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * User visibility helpers for multi-university supervisor membership.
 *
 * @mixin Model
 * @property-read Role|null $role
 * @property-read \Illuminate\Database\Eloquent\Collection<int, University> $supervisorUniversities
 * @property int|null $university_id
 * @property int $id
 * @property string|null $status
 * @method static Builder query()
 */
trait HasUniversityVisibility
{
    /** Returns universities linked to this supervisor via pivot. */
    public function supervisorUniversities()
    {
        return $this->belongsToMany(
            University::class,
            'supervisor_universities',
            'user_id',
            'university_id',
        )->withPivot(['status', 'approved_at', 'approved_by', 'accepting_supervision']);
    }

    /** Returns whether the user has the supervisor role. */
    public function isSupervisorRole(): bool
    {
        return $this->role?->name === 'supervisor';
    }

    /**
     * University IDs this user may see under TenantScope.
     * Supervisors: all active memberships (+ primary university_id).
     * Others: primary university_id only.
     *
     * @return array<int>
     */
    public function tenantUniversityIds(): array
    {
        if ($this->isSuperAdmin()) {
            return [];
        }

        if ($this->isSupervisorRole()) {
            $this->loadMissing('supervisorUniversities');

            $ids = $this->supervisorUniversities
                ->filter(fn ($uni) => ($uni->pivot->status ?? null) === 'active')
                ->pluck('id')
                ->map(fn ($id) => (int) $id)
                ->all();

            if ($this->university_id) {
                $ids[] = (int) $this->university_id;
            }

            return array_values(array_unique(array_filter($ids)));
        }

        return $this->university_id ? [(int) $this->university_id] : [];
    }

    /** Syncs supervisor-university memberships with status and approval metadata. */
    public function syncSupervisorUniversities(array $universityIds, string $status = 'active', ?int $approvedBy = null): void
    {
        if (!$this->isSupervisorRole()) {
            return;
        }

        $ids = array_values(array_unique(array_filter(array_map('intval', $universityIds))));
        if (empty($ids) && $this->university_id) {
            $ids = [(int) $this->university_id];
        }

        if (empty($ids)) {
            return;
        }

        $existing = $this->supervisorUniversities()
            ->whereIn('universities.id', $ids)
            ->get()
            ->keyBy('id');

        $sync = [];
        foreach ($ids as $id) {
            $sync[$id] = [
                'status'                 => $status,
                'approved_at'            => $status === 'active' ? now() : null,
                'approved_by'            => $status === 'active' ? $approvedBy : null,
                'accepting_supervision'  => (bool) ($existing->get($id)?->pivot->accepting_supervision ?? true),
            ];
        }

        $this->supervisorUniversities()->sync($sync);

        if (!$this->university_id) {
            $this->forceFill(['university_id' => $ids[0]])->save();
        }
    }

    /** Attaches supervisor universities with pending status. */
    public function attachSupervisorUniversitiesPending(array $universityIds): void
    {
        $this->syncSupervisorUniversities($universityIds, 'pending');
    }

    /** Attaches supervisor universities with active status (XML-validated registration). */
    public function attachSupervisorUniversitiesActive(array $universityIds): void
    {
        $this->syncSupervisorUniversities($universityIds, 'active');
    }

    /** Applies mixed active/pending supervisor memberships after XML-aware registration. */
    public function syncSupervisorUniversitiesMixed(array $activeUniversityIds, array $pendingUniversityIds): void
    {
        if (!$this->isSupervisorRole()) {
            return;
        }

        $activeIds = array_values(array_unique(array_filter(array_map('intval', $activeUniversityIds))));
        $pendingIds = array_values(array_unique(array_filter(array_map('intval', $pendingUniversityIds))));

        $existing = $this->supervisorUniversities()
            ->whereIn('universities.id', array_merge($activeIds, $pendingIds))
            ->get()
            ->keyBy('id');

        $sync = [];
        foreach ($activeIds as $id) {
            $sync[$id] = [
                'status'                => 'active',
                'approved_at'           => now(),
                'approved_by'           => null,
                'accepting_supervision' => (bool) ($existing->get($id)?->pivot->accepting_supervision ?? true),
            ];
        }
        foreach ($pendingIds as $id) {
            $sync[$id] = [
                'status'                => 'pending',
                'approved_at'           => null,
                'approved_by'           => null,
                'accepting_supervision' => (bool) ($existing->get($id)?->pivot->accepting_supervision ?? true),
            ];
        }

        if (empty($sync)) {
            return;
        }

        $this->supervisorUniversities()->sync($sync);

        if (!$this->university_id) {
            $this->forceFill(['university_id' => $activeIds[0] ?? $pendingIds[0]])->save();
        }
    }

    /** Returns membership status for the given university. */
    public function membershipStatusForUniversity(?int $universityId): string
    {
        if (!$this->isSupervisorRole()) {
            return (string) ($this->status ?? 'pending');
        }

        if (!$universityId) {
            return (string) ($this->status ?? 'pending');
        }

        $pivot = $this->supervisorUniversities()
            ->where('universities.id', $universityId)
            ->first();

        return $pivot?->pivot?->status ?? 'pending';
    }

    /** Updates account status based on supervisor membership statuses. */
    public function refreshAccountStatusFromMemberships(): void
    {
        if (!$this->isSupervisorRole()) {
            return;
        }

        $statuses = DB::table('supervisor_universities')
            ->where('user_id', $this->id)
            ->pluck('status');

        if ($statuses->contains('active')) {
            $this->status = 'active';
        } elseif ($statuses->isNotEmpty() && $statuses->every(fn ($s) => $s === 'rejected')) {
            $this->status = 'rejected';
        } else {
            $this->status = 'pending';
        }

        $this->save();
    }

    /** Repairs mismatched supervisor primary university and pivot links. */
    public function repairSupervisorUniversityLinks(): static
    {
        if (!$this->isSupervisorRole()) {
            return $this;
        }

        $this->loadMissing('supervisorUniversities', 'university');

        if ($this->supervisorUniversities->isEmpty() && $this->university_id) {
            $status = ($this->status ?? 'pending') === 'active' ? 'active' : 'pending';
            $this->syncSupervisorUniversities([(int) $this->university_id], $status);
            $this->load('supervisorUniversities');
        }

        if (!$this->university_id && $this->supervisorUniversities->isNotEmpty()) {
            $active = $this->supervisorUniversities->first(
                fn ($uni) => ($uni->pivot->status ?? 'pending') === 'active',
            );
            $primary = $active ?? $this->supervisorUniversities->first();
            if ($primary) {
                $this->forceFill(['university_id' => $primary->id])->save();
            }
        }

        return $this;
    }

    /** Adds supervisor membership and active university names to the model. */
    public function enrichSupervisorMembershipPayload(): static
    {
        if (!$this->isSupervisorRole()) {
            $this->setAttribute('supervisor_memberships', []);
            $this->setAttribute('active_supervisor_university_names', []);
            return $this;
        }

        $this->repairSupervisorUniversityLinks();
        $this->loadMissing('supervisorUniversities', 'university');

        $memberships = $this->supervisorUniversities
            ->map(fn ($uni) => [
                'id'                     => $uni->id,
                'name'                   => $uni->name,
                'status'                 => $uni->pivot->status ?? 'pending',
                'approved_at'            => $uni->pivot->approved_at,
                'accepting_supervision'  => (bool) ($uni->pivot->accepting_supervision ?? true),
            ])
            ->values()
            ->all();

        if (empty($memberships) && $this->university_id && $this->university) {
            $memberships = [[
                'id'                    => $this->university_id,
                'name'                  => $this->university->name,
                'status'                => ($this->status ?? 'pending') === 'active' ? 'active' : ($this->status ?? 'pending'),
                'approved_at'           => null,
                'accepting_supervision' => true,
            ]];
        }

        $this->setAttribute('supervisor_memberships', $memberships);
        $this->setAttribute(
            'active_supervisor_university_names',
            collect($memberships)->where('status', 'active')->pluck('name')->values()->all(),
        );

        return $this;
    }

    /** Scopes users to a university via direct or supervisor membership. */
    public function scopeInUniversity(Builder $query, ?int $universityId = null): Builder
    {
        $universityId = $universityId ?? auth()->user()?->university_id;

        if (!$universityId) {
            return $query->whereRaw('1 = 0');
        }

        return $query->where(function (Builder $q) use ($universityId) {
            $q->where('users.university_id', $universityId)
                ->orWhereHas('supervisorUniversities', function (Builder $sq) use ($universityId) {
                    $sq->where('universities.id', $universityId);
                });
        });
    }

    /** Excludes platform-level super_admin and admin accounts. */
    public function scopeExcludePlatformAccounts(Builder $query): Builder
    {
        return $query->whereHas('role', function (Builder $q) {
            $q->whereNotIn('name', ['super_admin', 'admin']);
        });
    }

    /** Scopes tenant admin user listings to the current university. */
    public function scopeForTenantAdminListing(Builder $query, ?int $universityId = null): Builder
    {
        return $query
            ->inUniversity($universityId)
            ->excludePlatformAccounts()
            ->when(auth()->check(), fn (Builder $q) => $q->where('users.id', '!=', auth()->id()));
    }

    /** Scopes users pending approval for the given university. */
    public function scopePendingApprovalForUniversity(Builder $query, int $universityId): Builder
    {
        return $query->where(function (Builder $q) use ($universityId) {
            $q->where(function (Builder $sq) {
                $sq->whereHas('role', fn (Builder $r) => $r->where('name', '!=', 'supervisor'))
                    ->where('users.status', 'pending');
            })->orWhere(function (Builder $sq) use ($universityId) {
                $sq->whereHas('role', fn (Builder $r) => $r->where('name', 'supervisor'))
                    ->whereHas('supervisorUniversities', function (Builder $uq) use ($universityId) {
                        $uq->where('universities.id', $universityId)
                            ->where('supervisor_universities.status', 'pending');
                    });
            });
        });
    }

    /** Returns the count of users pending approval for a university. */
    public static function pendingApprovalCountForUniversity(int $universityId): int
    {
        return static::query()
            ->inUniversity($universityId)
            ->excludePlatformAccounts()
            ->pendingApprovalForUniversity($universityId)
            ->count();
    }

    /** Applies search, role, and status filters from a request. */
    public function scopeApplyUserListFilters(Builder $query, Request $request): Builder
    {
        if ($request->filled('search')) {
            $term = '%' . trim($request->search) . '%';
            $query->where(function (Builder $q) use ($term) {
                $q->where('users.name', 'like', $term)
                    ->orWhere('users.email', 'like', $term)
                    ->orWhere('users.student_number', 'like', $term);
            });
        }

        if ($request->filled('role')) {
            $query->whereHas('role', fn (Builder $q) => $q->where('name', $request->role));
        }

        if ($request->filled('status')) {
            $status = $request->status;
            $adminUni = auth()->user()?->university_id;

            $query->where(function (Builder $q) use ($status, $adminUni) {
                $q->where(function (Builder $sq) use ($status) {
                    $sq->whereHas('role', fn (Builder $r) => $r->where('name', '!=', 'supervisor'))
                        ->where('users.status', $status);
                })->orWhere(function (Builder $sq) use ($status, $adminUni) {
                    $sq->whereHas('role', fn (Builder $r) => $r->where('name', 'supervisor'))
                        ->whereHas('supervisorUniversities', function (Builder $uq) use ($status, $adminUni) {
                            $uq->where('universities.id', $adminUni)
                                ->where('supervisor_universities.status', $status);
                        });
                });
            });
        }

        return $query;
    }
}

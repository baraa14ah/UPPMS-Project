<?php

namespace App\Http\Controllers\Committees;


use App\Http\Controllers\Controller;
use App\Models\Committee;
use App\Models\DefenseSession;
use App\Models\User;
use App\Services\Committees\CommitteeService;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class CommitteeController extends Controller
{
    public function __construct(
        protected CommitteeService $service,
    ) {
    }

    public function index(Request $request)
    {
        $status = $request->query('status', 'active');
        $search = trim((string) $request->query('search', ''));
        $perPage = min(50, max(1, (int) $request->query('per_page', 15)));

        $query = Committee::query()->with(['members:id,name,email']);

        if ($status === 'active') {
            $query->where('is_active', true);
        } elseif ($status === 'inactive') {
            $query->where('is_active', false);
        }

        if ($search !== '') {
            $query->where('name', 'like', '%' . $search . '%');
        }

        $paginator = $query->orderBy('name')->paginate($perPage);

        $committees = collect($paginator->items())->map(function (Committee $committee) {
            return $this->formatCommitteeSummary($committee);
        });

        return response()->json([
            'message' => 'Committees retrieved successfully',
            'data' => [
                'committees' => $committees,
                'pagination' => [
                    'current_page' => $paginator->currentPage(),
                    'per_page' => $paginator->perPage(),
                    'total' => $paginator->total(),
                    'last_page' => $paginator->lastPage(),
                ],
            ],
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'members' => 'required|array|min:2|max:5',
            'members.*.user_id' => 'required|integer|exists:users,id',
            'members.*.role' => 'required|in:chair,member',
        ]);

        try {
            $committee = $this->service->create($request->user(), $validated);
        } catch (ValidationException $e) {
            return $this->validationResponse($e);
        }

        return response()->json([
            'message' => 'Committee created successfully',
            'data' => $this->formatCommitteeDetail($committee),
        ], 201);
    }

    public function show(int $id)
    {
        $committee = Committee::query()
            ->with(['members:id,name,email'])
            ->findOrFail($id);

        $upcomingDefenses = $committee->defenseSessions()
            ->where('status', 'scheduled')
            ->with('project:id,title')
            ->where(function ($query) {
                $query->whereDate('scheduled_date', '>=', now()->toDateString())
                    ->orWhereNull('scheduled_date');
            })
            ->get()
            ->map(fn (DefenseSession $session) => [
                'id' => $session->id,
                'project_title' => $session->project?->title,
                'scheduled_at' => $session->scheduled_date?->toIso8601String(),
            ]);

        return response()->json([
            'message' => 'Committee retrieved successfully',
            'data' => array_merge(
                $this->formatCommitteeDetail($committee),
                ['upcoming_defenses' => $upcomingDefenses]
            ),
        ]);
    }

    public function update(Request $request, int $id)
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string|max:1000',
            'version' => 'required|integer|min:1',
        ]);

        $committee = Committee::query()->findOrFail($id);

        try {
            $committee = $this->service->update(
                $committee,
                $validated,
                (int) $validated['version']
            );
        } catch (ValidationException $e) {
            return $this->validationResponse($e, versionConflict: true);
        }

        return response()->json([
            'message' => 'Committee updated successfully',
            'data' => $this->formatCommitteeDetail($committee),
        ]);
    }

    public function deactivate(int $id)
    {
        $committee = Committee::query()->findOrFail($id);

        try {
            $committee = $this->service->deactivate($committee);
        } catch (ValidationException $e) {
            return $this->validationResponse($e);
        }

        return response()->json([
            'message' => 'Committee deactivated successfully',
            'data' => [
                'id' => $committee->id,
                'is_active' => $committee->is_active,
                'updated_at' => $committee->updated_at,
            ],
        ]);
    }

    public function reactivate(int $id)
    {
        $committee = Committee::query()->findOrFail($id);

        try {
            $committee = $this->service->reactivate($committee);
        } catch (ValidationException $e) {
            return $this->validationResponse($e);
        }

        return response()->json([
            'message' => 'Committee reactivated successfully',
            'data' => [
                'id' => $committee->id,
                'is_active' => $committee->is_active,
                'updated_at' => $committee->updated_at,
            ],
        ]);
    }

    public function addMember(Request $request, int $id)
    {
        $validated = $request->validate([
            'user_id' => 'required|integer|exists:users,id',
            'role' => 'required|in:chair,member',
        ]);

        $committee = Committee::query()->with('members')->findOrFail($id);

        if ($this->service->hasUpcomingDefenses($committee) && !$request->boolean('confirm_affects_defenses')) {
            return response()->json([
                'message' => 'This committee is assigned to upcoming defenses. Confirm to continue.',
                'errors' => [
                    'committee' => ['Changes may affect scheduled defenses.'],
                ],
                'requires_confirmation' => true,
            ], 409);
        }

        $user = User::query()->findOrFail($validated['user_id']);

        try {
            $committee = $this->service->addMember($committee, $user, $validated['role']);
        } catch (ValidationException $e) {
            return $this->validationResponse($e);
        }

        $member = $committee->members->firstWhere('id', $user->id);

        return response()->json([
            'message' => 'Member added successfully',
            'data' => [
                'committee_id' => $committee->id,
                'member' => $this->formatMember($member),
                'member_count' => $committee->members->count(),
            ],
        ], 201);
    }

    public function removeMember(Request $request, int $committeeId, int $userId)
    {
        $committee = Committee::query()->with('members')->findOrFail($committeeId);

        if ($this->service->hasUpcomingDefenses($committee) && !$request->boolean('confirm_affects_defenses')) {
            return response()->json([
                'message' => 'This committee is assigned to upcoming defenses. Confirm to continue.',
                'errors' => [
                    'committee' => ['Changes may affect scheduled defenses.'],
                ],
                'requires_confirmation' => true,
            ], 409);
        }

        $user = User::query()->findOrFail($userId);

        try {
            $committee = $this->service->removeMember($committee, $user);
        } catch (ValidationException $e) {
            return $this->validationResponse($e);
        }

        return response()->json([
            'message' => 'Member removed successfully',
            'data' => [
                'committee_id' => $committee->id,
                'removed_user_id' => $userId,
                'member_count' => $committee->members->count(),
            ],
        ]);
    }

    public function updateMemberRole(Request $request, int $committeeId, int $userId)
    {
        $validated = $request->validate([
            'role' => 'required|in:chair,member',
        ]);

        $committee = Committee::query()->with('members')->findOrFail($committeeId);

        if ($this->service->hasUpcomingDefenses($committee) && !$request->boolean('confirm_affects_defenses')) {
            return response()->json([
                'message' => 'This committee is assigned to upcoming defenses. Confirm to continue.',
                'errors' => [
                    'committee' => ['Changes may affect scheduled defenses.'],
                ],
                'requires_confirmation' => true,
            ], 409);
        }

        $user = User::query()->findOrFail($userId);

        try {
            $result = $this->service->updateMemberRole($committee, $user, $validated['role']);
        } catch (ValidationException $e) {
            return $this->validationResponse($e);
        }

        $updatedMember = $result['committee']->members->firstWhere('id', $userId);

        return response()->json([
            'message' => 'Member role updated successfully',
            'data' => [
                'committee_id' => $committee->id,
                'member' => $this->formatMember($updatedMember),
                'demoted_member' => $result['demoted_member']
                    ? $this->formatMember($result['demoted_member'])
                    : null,
            ],
        ]);
    }

    public function availability(Request $request, int $id)
    {
        $validated = $request->validate([
            'academic_stage_id' => 'nullable|integer|exists:academic_stages_config,id',
        ]);

        $committee = Committee::query()->findOrFail($id);
        $data = $this->service->getCommitteeAvailability(
            $committee,
            isset($validated['academic_stage_id']) ? (int) $validated['academic_stage_id'] : null
        );

        return response()->json([
            'message' => 'Availability retrieved successfully',
            'data' => $data,
        ]);
    }

    public function availableSupervisors(Request $request)
    {
        $excludeCommitteeId = $request->query('exclude_committee_id');
        $supervisors = $this->service->getAvailableSupervisors(
            (int) $request->user()->university_id,
            $excludeCommitteeId ? (int) $excludeCommitteeId : null,
        );

        return response()->json([
            'message' => 'Supervisors retrieved successfully',
            'data' => $supervisors,
        ]);
    }

    public function assignCommittee(Request $request, int $defenseSessionId)
    {
        $validated = $request->validate([
            'committee_id' => 'required|integer|exists:committees,id',
        ]);

        $defense = DefenseSession::query()
            ->with(['project', 'room'])
            ->whereHas('project', fn ($q) => $q->where('university_id', $request->user()->university_id))
            ->findOrFail($defenseSessionId);

        $committee = Committee::query()
            ->with('members')
            ->findOrFail($validated['committee_id']);

        if ((int) $committee->university_id !== (int) $defense->project->university_id) {
            return response()->json(['message' => 'Committee not found'], 404);
        }

        try {
            $defense = $this->service->assignCommitteeToDefense($defense, $committee);
        } catch (ValidationException $e) {
            return $this->validationResponse($e);
        }

        return response()->json([
            'message' => 'Committee assigned to defense successfully',
            'data' => [
                'defense_session_id' => $defense->id,
                'committee' => [
                    'id' => $committee->id,
                    'name' => $committee->name,
                    'members' => $committee->members->map(fn ($member) => $this->formatMember($member))->values(),
                ],
                'project_title' => $defense->project?->title,
                'scheduled_at' => $defense->scheduled_date?->toIso8601String(),
            ],
        ]);
    }

    private function formatCommitteeSummary(Committee $committee): array
    {
        $chair = $committee->members->first(fn ($member) => $member->pivot->role === 'chair');

        return [
            'id' => $committee->id,
            'name' => $committee->name,
            'description' => $committee->description,
            'is_active' => $committee->is_active,
            'member_count' => $committee->members->count(),
            'chair' => $chair ? ['id' => $chair->id, 'name' => $chair->name] : null,
            'members' => $committee->members->map(fn ($member) => $this->formatMember($member))->values(),
            'created_at' => $committee->created_at,
            'updated_at' => $committee->updated_at,
        ];
    }

    private function formatCommitteeDetail(Committee $committee): array
    {
        return [
            'id' => $committee->id,
            'name' => $committee->name,
            'description' => $committee->description,
            'is_active' => $committee->is_active,
            'version' => $committee->version,
            'member_count' => $committee->members->count(),
            'members' => $committee->members->map(fn ($member) => $this->formatMember($member))->values(),
            'created_at' => $committee->created_at,
            'updated_at' => $committee->updated_at,
        ];
    }

    private function formatMember(?User $member): ?array
    {
        if (!$member) {
            return null;
        }

        return [
            'id' => $member->id,
            'name' => $member->name,
            'email' => $member->email,
            'role' => $member->pivot->role ?? 'member',
            'added_at' => $member->pivot->created_at ?? null,
        ];
    }

    private function validationResponse(ValidationException $e, bool $versionConflict = false)
    {
        $status = 422;

        if ($versionConflict || isset($e->errors()['version'])) {
            $status = 409;
        }

        return response()->json([
            'message' => collect($e->errors())->flatten()->first() ?? 'Validation failed',
            'errors' => $e->errors(),
        ], $status);
    }
}

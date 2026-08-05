<?php

namespace App\Http\Controllers\Proposals;


use App\Http\Controllers\Controller;
use App\Models\ProjectProposal;
use App\Services\Proposals\ProjectProposalService;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class ProjectProposalController extends Controller
{
    public function __construct(
        protected ProjectProposalService $service,
    ) {
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:200',
            'description' => 'required|string|max:5000',
            'requested_supervisor_id' => 'required|exists:users,id',
            'track_stage_id' => 'nullable|exists:track_stages,id',
        ]);

        try {
            $proposal = $this->service->submit($request->user(), $validated);
        } catch (ValidationException $e) {
            $message = $this->validationMessage($e);
            $status = in_array('existing_pending_proposal', $e->errors()['proposal'] ?? [], true)
                || in_array('existing_active_project', $e->errors()['project'] ?? [], true)
                || in_array('max_proposals_reached', $e->errors()['proposal'] ?? [], true)
                ? 409
                : 422;

            return response()->json([
                'message' => $message,
                'errors' => $e->errors(),
            ], $status);
        }

        return response()->json([
            'message' => 'Proposal submitted successfully',
            'data' => $proposal,
        ], 201);
    }

    public function index(Request $request)
    {
        $user = $request->user()->loadMissing('role');
        $role = strtolower($user->role?->name ?? '');
        $status = $request->query('status');
        $perPage = min(50, max(1, (int) $request->query('per_page', 15)));

        if ($role === 'student') {
            $paginator = $this->service->getProposalsForStudent($user, $status, $perPage);
        } elseif ($role === 'supervisor') {
            $paginator = $this->service->getProposalsForSupervisor($user, $status, $perPage);
        } elseif (in_array($role, ['admin', 'super_admin'], true)) {
            $paginator = $this->service->getAllProposals($user, $status, $perPage);
        } else {
            abort(403, 'This action is unauthorized.');
        }

        return response()->json([
            'message' => 'Proposals retrieved successfully',
            'data' => $paginator->items(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ]);
    }

    public function show(Request $request, int $id)
    {
        $proposal = ProjectProposal::query()
            ->with(['student:id,name,email', 'requestedSupervisor:id,name,email', 'project'])
            ->findOrFail($id);

        if (!$this->service->userCanView($proposal, $request->user())) {
            return response()->json([
                'message' => 'You do not have permission to view this proposal.',
            ], 403);
        }

        return response()->json([
            'message' => 'Proposal retrieved successfully',
            'data' => $proposal,
        ]);
    }

    public function update(Request $request, int $id)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:200',
            'description' => 'required|string|max:5000',
            'requested_supervisor_id' => 'sometimes|exists:users,id',
            'track_stage_id' => 'nullable|exists:track_stages,id',
        ]);

        $proposal = ProjectProposal::query()->findOrFail($id);

        try {
            $updated = $this->service->resubmit($proposal, $request->user(), $validated);
        } catch (ValidationException $e) {
            $message = $this->validationMessage($e);
            $status = in_array('max_resubmissions_reached', $e->errors()['resubmission'] ?? [], true)
                ? 409
                : 422;

            return response()->json([
                'message' => $message,
                'errors' => $e->errors(),
            ], $status);
        }

        return response()->json([
            'message' => 'Proposal resubmitted successfully',
            'data' => $updated,
        ]);
    }

    public function destroy(Request $request, int $id)
    {
        $proposal = ProjectProposal::query()->findOrFail($id);

        try {
            $this->service->delete($proposal, $request->user());
        } catch (ValidationException $e) {
            return response()->json([
                'message' => $this->validationMessage($e),
                'errors' => $e->errors(),
            ], 422);
        }

        return response()->json([
            'message' => 'Proposal deleted successfully',
        ]);
    }

    public function approve(Request $request, int $id)
    {
        $proposal = ProjectProposal::query()->findOrFail($id);

        try {
            $result = $this->service->approve($proposal, $request->user());
        } catch (ValidationException $e) {
            return response()->json([
                'message' => $this->validationMessage($e),
                'errors' => $e->errors(),
            ], 422);
        }

        return response()->json([
            'message' => 'Proposal approved successfully',
            'data' => $result,
        ]);
    }

    public function reject(Request $request, int $id)
    {
        $validated = $request->validate([
            'feedback' => 'nullable|string|max:2000',
        ]);

        $proposal = ProjectProposal::query()->findOrFail($id);

        try {
            $updated = $this->service->reject(
                $proposal,
                $request->user(),
                $validated['feedback'] ?? null
            );
        } catch (ValidationException $e) {
            return response()->json([
                'message' => $this->validationMessage($e),
                'errors' => $e->errors(),
            ], 422);
        }

        return response()->json([
            'message' => 'Proposal rejected',
            'data' => $updated,
        ]);
    }

    public function reassign(Request $request, int $id)
    {
        $validated = $request->validate([
            'new_supervisor_id' => 'required|exists:users,id',
        ]);

        $proposal = ProjectProposal::query()->findOrFail($id);

        try {
            $updated = $this->service->reassign($proposal, (int) $validated['new_supervisor_id']);
        } catch (ValidationException $e) {
            return response()->json([
                'message' => $this->validationMessage($e),
                'errors' => $e->errors(),
            ], 422);
        }

        return response()->json([
            'message' => 'Proposal reassigned successfully',
            'data' => $updated,
        ]);
    }

    public function availableSupervisors(Request $request)
    {
        $supervisors = $this->service->getAvailableSupervisors((int) $request->user()->university_id);

        return response()->json([
            'message' => 'Supervisors retrieved successfully',
            'data' => $supervisors,
        ]);
    }

    private function validationMessage(ValidationException $exception): string
    {
        $errors = $exception->errors();

        if (in_array('existing_pending_proposal', $errors['proposal'] ?? [], true)) {
            return 'You already have a pending proposal. Please wait for supervisor review.';
        }

        if (in_array('max_proposals_reached', $errors['proposal'] ?? [], true)) {
            return 'You can submit at most 3 project ideas. Delete an existing proposal to add a new one.';
        }

        if (in_array('proposal_cannot_delete_approved', $errors['status'] ?? [], true)) {
            return 'Approved proposals cannot be deleted.';
        }

        if (in_array('existing_active_project', $errors['project'] ?? [], true)) {
            return 'You already have an active project.';
        }

        if (in_array('graduated_cannot_submit', $errors['student'] ?? [], true)) {
            return 'You have graduated and cannot create new project proposals.';
        }

        if (in_array('max_resubmissions_reached', $errors['resubmission'] ?? [], true)) {
            return 'Maximum resubmissions reached for this supervisor. Please select a different supervisor.';
        }

        if (in_array('proposal_not_rejected', $errors['status'] ?? [], true)) {
            return 'Only rejected proposals can be resubmitted.';
        }

        if (in_array('proposal_not_pending', $errors['status'] ?? [], true)) {
            return 'Only pending proposals can be approved or rejected.';
        }

        if (in_array('track_stage_required', $errors['track_stage_id'] ?? [], true)) {
            return 'Academic stage selection is required.';
        }

        return collect($errors)->flatten()->first() ?: 'The given data was invalid.';
    }
}

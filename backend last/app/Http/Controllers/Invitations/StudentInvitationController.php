<?php

namespace App\Http\Controllers\Invitations;


use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Services\Invitations\InvitationService;
use App\Models\StudentInvitation;
use App\Models\User;

class StudentInvitationController extends Controller
{
    protected InvitationService $invitationService;

    public function __construct(InvitationService $invitationService)
    {
        $this->invitationService = $invitationService;
    }

    /** Invite a student to join a project. */
    public function invite(Request $request, $projectId)
    {
        $request->validate(['student_id' => 'required|integer|exists:users,id']);
        $result = $this->invitationService->inviteStudent($projectId, $request->student_id, $request->user()->id);
        return response()->json($result, $result['status']);
    }

    /** List invitations for the authenticated student. */
    public function myInvitations(Request $request)
    {
        $invitations = $this->invitationService->getStudentInvitations($request->user()->id);
        return response()->json(['invitations' => $invitations]);
    }

    /** Accept a student project invitation. */
    public function accept(Request $request, $inviteId)
    {
        $result = $this->invitationService->acceptStudentInvitation($inviteId, $request->user());
        return response()->json($result, $result['status']);
    }

    /** Reject a student project invitation. */
    public function reject(Request $request, $inviteId)
    {
        $inv = StudentInvitation::query()->forCurrentUniversity()
            ->where('id', $inviteId)->where('student_id', $request->user()->id)->first();
        if (!$inv) return response()->json(['message' => 'Resource not found.'], 404);
        $inv->update(['status' => 'rejected']);
        return response()->json(['message' => 'Rejected']);
    }

    /** List students in the current university. */
    public function studentsList(Request $request)
    {
        $students = \App\Models\User::query()
            ->with('role')
            ->inUniversity($request->user()->university_id)
            ->get()
            ->filter(function ($user) {
                $roleName = is_string($user->role) ? strtolower($user->role) : strtolower($user->role?->name ?? '');
                return $roleName === 'student';
            })
            ->map(function ($user) {
                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'student_number' => $user->student_number,
                    'university_id' => $user->university_id,
                ];
            })
            ->values();

        return response()->json(['students' => $students]);
    }
}

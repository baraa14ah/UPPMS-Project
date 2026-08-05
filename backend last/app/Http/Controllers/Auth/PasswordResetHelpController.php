<?php

namespace App\Http\Controllers\Auth;


use App\Http\Controllers\Controller;
use App\Models\PasswordResetRequest;
use App\Services\Auth\PasswordResetHelpService;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class PasswordResetHelpController extends Controller
{
    public function __construct(
        protected PasswordResetHelpService $helpService,
    ) {}

    /** Submit a password reset help request. */
    public function requestHelp(Request $request)
    {
        $request->validate([
            'email'          => 'required|email',
            'student_number' => 'nullable|string|max:50',
            'message'        => 'nullable|string|max:500',
        ]);

        $this->helpService->submitRequest(
            $request->email,
            $request->student_number,
            $request->message,
        );

        return response()->json([
            'message' => PasswordResetHelpService::PUBLIC_MESSAGE,
        ]);
    }

    /** List pending password reset requests for the admin's university. */
    public function index(Request $request)
    {
        $admin = $request->user();
        $items = $this->helpService->listPendingForUniversity((int) $admin->university_id);

        return response()->json([
            'requests' => $items,
            'count'    => count($items),
        ]);
    }

    /** Issue a temporary password for a reset request. */
    public function temporaryPassword(Request $request, int $id)
    {
        $admin = $request->user();
        $resetRequest = $this->findPendingForAdmin($id, $admin->university_id);

        try {
            $result = $this->helpService->issueTemporaryPassword($resetRequest, $admin);
        } catch (\InvalidArgumentException $e) {
            throw ValidationException::withMessages(['request' => $e->getMessage()]);
        }

        return response()->json([
            'message'            => 'تم تعيين كلمة مرور مؤقتة. انسخها وأبلغ المستخدم مرة واحدة فقط.',
            'temporary_password' => $result['temporary_password'],
            'request'            => $result['request'],
            'user'               => $result['request']->user,
        ]);
    }

    /** Dismiss a pending password reset request. */
    public function dismiss(Request $request, int $id)
    {
        $admin = $request->user();
        $resetRequest = $this->findPendingForAdmin($id, $admin->university_id);

        try {
            $updated = $this->helpService->dismiss($resetRequest, $admin);
        } catch (\InvalidArgumentException $e) {
            throw ValidationException::withMessages(['request' => $e->getMessage()]);
        }

        return response()->json([
            'message' => 'تم إغلاق الطلب.',
            'request' => $updated,
        ]);
    }

    /** Find a pending reset request scoped to the admin's university. */
    private function findPendingForAdmin(int $id, int $universityId): PasswordResetRequest
    {
        $resetRequest = PasswordResetRequest::query()
            ->forAdminUniversity($universityId)
            ->whereKey($id)
            ->where('status', PasswordResetRequest::STATUS_PENDING)
            ->with('user.role')
            ->first();

        if (!$resetRequest) {
            abort(404, 'الطلب غير موجود أو تمت معالجته مسبقاً.');
        }

        return $resetRequest;
    }
}

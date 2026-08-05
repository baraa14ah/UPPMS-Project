<?php

namespace App\Services\Auth;


use App\Services\Notifications\NotificationService;
use App\Models\PasswordResetRequest;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class PasswordResetHelpService
{
    public const PUBLIC_MESSAGE =
        'إذا كان الحساب مسجّلاً ومفعّلاً في جامعتك، تم إرسال طلبك لمسؤول الجامعة. تواصل معه لمتابعة إعادة التعيين.';

    public function __construct(
        protected NotificationService $notifications,
    ) {}

    /** Submits or updates a password reset help request for the user. */
    public function submitRequest(string $email, ?string $studentNumber = null, ?string $message = null): void
    {
        $user = User::query()
            ->with('role')
            ->whereRaw('LOWER(email) = ?', [strtolower(trim($email))])
            ->first();

        if (!$user || !$user->university_id) {
            return;
        }

        $roleName = strtolower($user->role?->name ?? '');
        if (in_array($roleName, ['admin', 'super_admin'], true)) {
            return;
        }

        if ($studentNumber && $user->student_number) {
            if (trim($studentNumber) !== trim((string) $user->student_number)) {
                return;
            }
        }

        $request = PasswordResetRequest::query()
            ->where('user_id', $user->id)
            ->where('status', PasswordResetRequest::STATUS_PENDING)
            ->first();

        if ($request) {
            $request->update([
                'email'          => $user->email,
                'student_number' => $studentNumber ?: $request->student_number,
                'message'        => $message,
            ]);
        } else {
            $request = PasswordResetRequest::create([
                'user_id'        => $user->id,
                'university_id'  => $user->university_id,
                'email'          => $user->email,
                'student_number' => $studentNumber,
                'message'        => $message,
                'status'         => PasswordResetRequest::STATUS_PENDING,
            ]);
        }

        $this->notifyUniversityAdmins($request->fresh(['user.role']));
    }

    public function listPendingForUniversity(int $universityId): array
    {
        return PasswordResetRequest::query()
            ->forAdminUniversity($universityId)
            ->where('status', PasswordResetRequest::STATUS_PENDING)
            ->with(['user.role'])
            ->orderByDesc('created_at')
            ->get()
            ->all();
    }

    /** Returns the count of pending password reset requests for a university. */
    public function pendingCountForUniversity(int $universityId): int
    {
        return PasswordResetRequest::query()
            ->forAdminUniversity($universityId)
            ->where('status', PasswordResetRequest::STATUS_PENDING)
            ->count();
    }

    /** Issues a temporary password and resolves the reset request. */
    public function issueTemporaryPassword(PasswordResetRequest $request, User $admin): array
    {
        if ($request->status !== PasswordResetRequest::STATUS_PENDING) {
            throw new \InvalidArgumentException('هذا الطلب لم يعد قيد الانتظار.');
        }

        $request->loadMissing('user.role');
        $user = $request->user;
        if (!$user) {
            throw new \InvalidArgumentException('المستخدم غير موجود.');
        }

        if ($user->status !== 'active') {
            throw new \InvalidArgumentException(
                'الحساب غير مفعّل. يجب قبول المستخدم أولاً من تبويب «قيد الانتظار» قبل إعادة تعيين كلمة المرور.',
            );
        }

        $plain = Str::password(12, letters: true, numbers: true, symbols: false);

        DB::transaction(function () use ($user, $request, $admin, $plain) {
            $user->password = $plain;
            $user->save();

            DB::table('personal_access_tokens')
                ->where('tokenable_type', User::class)
                ->where('tokenable_id', $user->id)
                ->delete();

            $request->update([
                'status'      => PasswordResetRequest::STATUS_RESOLVED,
                'handled_by'  => $admin->id,
                'handled_at'  => now(),
            ]);
        });

        $this->notifications->notifyUser(
            $user,
            'password.reset_by_admin',
            'تم تعيين كلمة مرور مؤقتة',
            'تواصل مع مسؤول جامعتك للحصول على كلمة المرور الجديدة، ثم غيّرها من الملف الشخصي.',
            [
                'request_id' => $request->id,
                'user_name' => $user->name,
                'email' => $user->email,
            ],
        );

        return [
            'request'             => $request->fresh(['user.role', 'handler']),
            'temporary_password'  => $plain,
        ];
    }

    /** Dismisses a pending password reset request. */
    public function dismiss(PasswordResetRequest $request, User $admin): PasswordResetRequest
    {
        if ($request->status !== PasswordResetRequest::STATUS_PENDING) {
            throw new \InvalidArgumentException('هذا الطلب لم يعد قيد الانتظار.');
        }

        $request->update([
            'status'     => PasswordResetRequest::STATUS_DISMISSED,
            'handled_by' => $admin->id,
            'handled_at' => now(),
        ]);

        return $request->fresh(['user.role', 'handler']);
    }

    /** Notifies university admins of a new password reset request. */
    protected function notifyUniversityAdmins(PasswordResetRequest $request): void
    {
        $userName = $request->user?->name ?? $request->email;
        $title = 'طلب استعادة كلمة مرور';
        $body = "طلب المستخدم «{$userName}» ({$request->email}) مساعدة لإعادة تعيين كلمة المرور.";

        $this->notifications->notifyUniversityAdmins(
            (int) $request->university_id,
            'password.reset_request',
            $title,
            $body,
            [
                'request_id' => $request->id,
                'user_id'    => $request->user_id,
                'url'        => '/dashboard/users?tab=password_requests',
                'user_name'  => $userName,
                'email'      => $request->email,
            ],
        );
    }
}

<?php

namespace App\Services;

use App\Models\Role;
use App\Models\University;
use App\Models\User;
use App\Models\XmlAuthorizedUser;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AuthService
{
    /** Injects the notification service dependency. */
    public function __construct(
        protected NotificationService $notifications,
        protected XmlImportService $xmlImportService,
    ) {}

    /** Registers a new student or supervisor account and returns auth credentials. */
    public function register(Request $request): array
    {
        $existingUser = User::where('email', $request->email)->first();

        if ($existingUser) {
            if ($existingUser->status === 'rejected') {
                $resolved = $this->resolveRegistrationUniversities($request);
                if (isset($resolved['error'])) {
                    return ['error' => $resolved['error']];
                }

                $universityId = $resolved['university_id'];
                $universityIds = $resolved['university_ids'];

                $request->validate($this->registrationRules($request, $universityId, $existingUser->id));

                return $this->finalizeRegistration($request, $universityId, $universityIds, $existingUser);
            }

            if ($existingUser->status === 'pending') {
                return ['error' => ['message' => 'Account already awaiting approval.', 'status' => 422]];
            }
        }

        $resolved = $this->resolveRegistrationUniversities($request);
        if (isset($resolved['error'])) {
            return ['error' => $resolved['error']];
        }

        $universityId = $resolved['university_id'];
        $universityIds = $resolved['university_ids'];

        $request->validate($this->registrationRules($request, $universityId));

        $role = Role::where('name', $request->role)->first();

        if (!$role) {
            return ['error' => ['message' => 'Role not found', 'status' => 422]];
        }

        if ($role->name === 'admin') {
            return ['error' => ['message' => 'Unauthorized role', 'status' => 403]];
        }

        return $this->finalizeRegistration($request, $universityId, $universityIds);
    }

    /** Authenticates a user and returns an access token. */
    public function login($request)
    {
        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Incorrect email or password.'],
            ]);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return [
            'message' => 'Login successful',
            'token'   => $token,
            'user'    => $user,
        ];
    }

    /** Revokes the current access token for the authenticated user. */
    public function logout($request)
    {
        $request->user()->currentAccessToken()->delete();

        return ['message' => 'Logged out successfully'];
    }

    /** Resolves university IDs from registration request data. */
    private function resolveRegistrationUniversities(Request $request): array
    {
        if ($request->role === 'supervisor' && $request->filled('university_ids')) {
            $ids = array_values(array_unique(array_filter(array_map('intval', (array) $request->university_ids))));
            if (empty($ids)) {
                return ['error' => ['message' => 'At least one university is required.', 'status' => 422]];
            }

            $activeCount = University::whereIn('id', $ids)->where('is_active', true)->count();
            if ($activeCount !== count($ids)) {
                return ['error' => ['message' => 'One or more selected universities are not active.', 'status' => 422]];
            }

            return [
                'university_id'   => $ids[0],
                'university_ids'  => $ids,
            ];
        }

        $universityId = $this->resolveUniversityId($request);
        if ($universityId === false) {
            return ['error' => ['message' => 'Selected university is not active.', 'status' => 422]];
        }

        return [
            'university_id'  => $universityId,
            'university_ids' => [$universityId],
        ];
    }

    /** Returns the active university ID from the request, or the default. */
    private function resolveUniversityId(Request $request): int|false
    {
        if ($request->filled('university_id')) {
            $uni = University::where('id', $request->university_id)->where('is_active', true)->first();
            if (!$uni) {
                return false;
            }
            return (int) $uni->id;
        }

        return University::defaultId();
    }

    /** Builds validation rules for user registration. */
    private function registrationRules(Request $request, int $universityId, ?int $userId = null): array
    {
        $rules = [
            'name'          => 'required|string|max:255',
            'email'         => $userId ? 'required|email' : 'required|email|unique:users,email',
            'password'      => 'required|min:6',
            'role'          => 'required|in:student,supervisor',
            'university_id' => 'nullable|integer|exists:universities,id',
        ];

        if ($request->role === 'supervisor') {
            if ($request->filled('university_ids')) {
                $rules['university_ids']   = 'required|array|min:1';
                $rules['university_ids.*'] = 'integer|exists:universities,id';
            } else {
                $rules['university_id'] = 'required|integer|exists:universities,id';
            }
        }

        if ($request->role === 'student') {
            $rules['student_number'] = [
                'required',
                'string',
                'max:50',
                Rule::unique('users', 'student_number')
                    ->where(fn ($q) => $q->where('university_id', $universityId))
                    ->ignore($userId),
            ];
        }

        return $rules;
    }

    /** Creates or updates a user account with XML locking inside a transaction. */
    private function finalizeRegistration(
        Request $request,
        int $universityId,
        array $universityIds,
        ?User $existingUser = null,
    ): array {
        return DB::transaction(function () use ($request, $universityId, $universityIds, $existingUser) {
            $xmlResult = $this->resolveAndLockXmlRegistration($request, $universityIds);
            if (isset($xmlResult['error'])) {
                return $xmlResult;
            }

            $role = Role::where('name', $request->role)->first();
            if (!$role) {
                return ['error' => ['message' => 'Role not found', 'status' => 422]];
            }

            if ($existingUser) {
                $existingUser->update([
                    'name'           => $request->name,
                    'password'       => $request->password,
                    'role_id'        => $role->id,
                    'status'         => $xmlResult['status'],
                    'university_id'  => $universityId ?? $existingUser->university_id,
                    'student_number' => $request->role === 'student' ? $request->student_number : null,
                ]);
                $user = $existingUser;
            } else {
                $user = User::create([
                    'name'           => $request->name,
                    'email'          => $request->email,
                    'password'       => $request->password,
                    'role_id'        => $role->id,
                    'university_id'  => $universityId,
                    'student_number' => $request->role === 'student' ? $request->student_number : null,
                    'status'         => $xmlResult['status'],
                ]);
            }

            foreach ($xmlResult['locked_records'] as $record) {
                $record->claimForUser($user->id);
            }

            $this->syncStudentProfile($user);

            if ($request->role === 'supervisor') {
                $user->syncSupervisorUniversitiesMixed(
                    $xmlResult['active_university_ids'],
                    $xmlResult['pending_university_ids'],
                );
                $user->refreshAccountStatusFromMemberships();
            }

            $user->load('role');

            if ($xmlResult['status'] === 'pending') {
                $this->notifyAdminsOfRegistration($user, $universityIds);
            }

            $token = $user->createToken('auth_token')->plainTextToken;

            return [
                'message' => $existingUser
                    ? 'Registered successfully (re-registration)'
                    : 'Registered successfully',
                'token'   => $token,
                'user'    => $user,
                'role'    => $user->role?->name,
                'status'  => 201,
            ];
        });
    }

    /**
     * Validates and row-locks XML records for each selected university that requires XML.
     *
     * @return array<string, mixed>
     */
    private function resolveAndLockXmlRegistration(Request $request, array $universityIds): array
    {
        if (!in_array($request->role, ['student', 'supervisor'], true)) {
            return [
                'status' => 'pending',
                'locked_records' => [],
                'active_university_ids' => [],
                'pending_university_ids' => $universityIds,
            ];
        }

        $hasXmlUniversity = false;
        $lockedRecords = [];
        $activeUniversityIds = [];
        $pendingUniversityIds = [];
        $universityNumber = $request->role === 'student'
            ? (string) $request->student_number
            : null;

        foreach ($universityIds as $uid) {
            $uid = (int) $uid;
            if (!$this->xmlImportService->universityHasXmlRecords($uid)) {
                $pendingUniversityIds[] = $uid;
                continue;
            }

            $hasXmlUniversity = true;
            $record = XmlAuthorizedUser::lockAvailableForRegistration(
                $uid,
                (string) $request->email,
                $universityNumber,
                (string) $request->role,
            );

            if (!$record) {
                $result = $this->xmlImportService->resolveRegistrationCredentials(
                    (string) $request->email,
                    $universityNumber,
                    (string) $request->role,
                    $uid,
                );

                return [
                    'error' => [
                        'message' => $result['error'] ?? XmlImportService::CREDENTIALS_MISMATCH,
                        'errors' => ['credentials' => [$result['error'] ?? XmlImportService::CREDENTIALS_MISMATCH]],
                        'status' => 422,
                    ],
                ];
            }

            $lockedRecords[] = $record;
            $activeUniversityIds[] = $uid;
        }

        if (!$hasXmlUniversity) {
            return [
                'status' => 'pending',
                'locked_records' => [],
                'active_university_ids' => [],
                'pending_university_ids' => $universityIds,
            ];
        }

        return [
            'status' => 'active',
            'locked_records' => $lockedRecords,
            'active_university_ids' => $activeUniversityIds,
            'pending_university_ids' => $pendingUniversityIds,
        ];
    }

    /** Notifies university admins of a pending registration request. */
    private function notifyAdminsOfRegistration(User $user, array $universityIds): void
    {
        $roleName = $user->role?->name ?? 'user';
        if (!in_array($roleName, ['student', 'supervisor'], true)) {
            return;
        }

        $roleLabel = $roleName === 'supervisor' ? 'مشرف' : 'طالب';
        $title = 'طلب تسجيل جديد';
        $body = "طلب «{$user->name}» ({$user->email}) التسجيل كـ{$roleLabel} — بانتظار موافقتك.";

        $this->notifications->notifyUniversityAdmins(
            $universityIds,
            'user.registration_pending',
            $title,
            $body,
            [
                'user_id'   => $user->id,
                'user_name' => $user->name,
                'email'     => $user->email,
                'role'      => $roleName,
                'url'       => '/dashboard/users?tab=pending',
            ],
        );
    }

    /** Syncs the student profile record with the user's student number. */
    private function syncStudentProfile(User $user): void
    {
        $user->loadMissing('role');
        if ($user->role?->name !== 'student' || !$user->student_number) {
            return;
        }

        $user->profile()->updateOrCreate(
            ['user_id' => $user->id],
            ['student_number' => $user->student_number],
        );
    }
}

<?php

namespace App\Http\Controllers\Users;


use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\University;
use App\Models\User;
use App\Services\Notifications\NotificationService;
use App\Services\Users\UserDeletionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class UserController extends Controller
{
    public function __construct(private NotificationService $notificationService)
    {
    }

    /** List all users for the tenant admin. */
    public function index(Request $request)
    {
        $adminUni = auth()->user()->university_id;

        $users = User::query()
            ->with(['role', 'university:id,name', 'supervisorUniversities:id,name'])
            ->forTenantAdminListing()
            ->applyUserListFilters($request)
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn (User $user) => $this->enrichUserForAdmin($user, $adminUni));

        return response()->json([
            'users' => $users,
        ], 200);
    }

    /** List users pending approval for the tenant admin. */
    public function pending(Request $request)
    {
        $adminUni = auth()->user()->university_id;

        $users = User::query()
            ->with(['role', 'university:id,name', 'supervisorUniversities:id,name'])
            ->forTenantAdminListing()
            ->applyUserListFilters($request->merge(['status' => 'pending']))
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn (User $user) => $this->enrichUserForAdmin($user, $adminUni));

        return response()->json([
            'users' => $users,
        ], 200);
    }

    /** Approve a pending user account. */
    public function approve($id)
    {
        $admin = auth()->user();
        $adminUni = (int) $admin->university_id;

        $user = User::query()
            ->with('role')
            ->forTenantAdminListing()
            ->whereKey($id)
            ->first();

        if (!$user) {
            return response()->json(['message' => 'User not found in your university.'], 404);
        }

        if ($user->isSupervisorRole()) {
            $updated = DB::table('supervisor_universities')
                ->where('user_id', $user->id)
                ->where('university_id', $adminUni)
                ->where('status', 'pending')
                ->update([
                    'status'      => 'active',
                    'approved_at' => now(),
                    'approved_by' => $admin->id,
                ]);

            if (!$updated) {
                return response()->json(['message' => 'User is not pending approval for your university.'], 422);
            }

            $user->refreshAccountStatusFromMemberships();
            $this->notifySupervisorMembershipDecision($user, $adminUni, 'approved');
        } else {
            if ($user->status !== 'pending') {
                return response()->json(['message' => 'User is not pending approval.'], 422);
            }

            $user->status = 'active';
            $user->save();
            $this->notificationService->notifyUser(
                $user,
                'account.approved',
                'تم قبول انضمامك',
                'تم اعتماد حسابك — يمكنك الآن استخدام المنصة.',
                ['url' => '/dashboard'],
            );
        }

        return response()->json([
            'message' => 'User approved successfully.',
            'user'    => $this->enrichUserForAdmin($user->fresh()->load('role'), $adminUni),
        ], 200);
    }

    /** Reject a pending user account. */
    public function reject($id)
    {
        $admin = auth()->user();
        $adminUni = (int) $admin->university_id;

        $user = User::query()
            ->with('role')
            ->forTenantAdminListing()
            ->whereKey($id)
            ->first();

        if (!$user) {
            return response()->json(['message' => 'User not found in your university.'], 404);
        }

        if ($user->isSupervisorRole()) {
            $updated = DB::table('supervisor_universities')
                ->where('user_id', $user->id)
                ->where('university_id', $adminUni)
                ->where('status', 'pending')
                ->update([
                    'status'      => 'rejected',
                    'approved_at' => null,
                    'approved_by' => $admin->id,
                ]);

            if (!$updated) {
                return response()->json(['message' => 'User is not pending approval for your university.'], 422);
            }

            $user->refreshAccountStatusFromMemberships();
            $this->notifySupervisorMembershipDecision($user, $adminUni, 'rejected');
        } else {
            if ($user->status !== 'pending') {
                return response()->json(['message' => 'User is not pending approval.'], 422);
            }

            $user->status = 'rejected';
            $user->save();
        }

        return response()->json([
            'message' => 'User rejected successfully.',
            'user'    => $this->enrichUserForAdmin($user->fresh()->load('role'), $adminUni),
        ], 200);
    }

    /** Create a new supervisor or student user. */
    public function store(Request $request)
    {
        $rules = [
            'name'  => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'role'  => 'required|string|in:supervisor,student',
        ];

        if ($request->role === 'student') {
            $rules['student_number'] = [
                'required',
                'string',
                'max:50',
                \Illuminate\Validation\Rule::unique('users', 'student_number')
                    ->where(fn ($q) => $q->where('university_id', auth()->user()->university_id)),
            ];
        }

        $request->validate($rules);

        $role = \App\Models\Role::where('name', $request->role)->first();

        if (!$role) {
            return response()->json(['message' => 'حدث خطأ: الصلاحية المحددة غير موجودة في النظام'], 400);
        }

        $user = User::create([
            'name'           => $request->name,
            'email'          => $request->email,
            'password'       => 'bytehub',
            'role_id'        => $role->id,
            'university_id'  => auth()->user()->university_id,
            'student_number' => $request->role === 'student' ? $request->student_number : null,
            'status'         => 'active',
        ]);

        if ($request->role === 'student' && $request->student_number) {
            $user->profile()->updateOrCreate(
                ['user_id' => $user->id],
                ['student_number' => $request->student_number],
            );
        }

        if ($user->isSupervisorRole()) {
            $user->syncSupervisorUniversities([auth()->user()->university_id], 'active', auth()->id());
        }

        $adminUni = auth()->user()->university_id;

        return response()->json([
            'message' => 'تم إضافة المستخدم بنجاح',
            'user'    => $this->enrichUserForAdmin(
                $user->load(['role', 'university:id,name', 'supervisorUniversities:id,name']),
                $adminUni,
            ),
        ], 201);
    }

    /** Update a user's name and email. */
    public function update(Request $request, $id)
    {
        $user = User::query()->forTenantAdminListing()->whereKey($id)->first();
        if (!$user) {
            return response()->json(['message' => 'المستخدم غير موجود'], 404);
        }

        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email,' . $id,
        ]);

        $user->name = $request->name;
        $user->email = $request->email;
        $user->save();

        return response()->json(['message' => 'تم تحديث البيانات بنجاح']);
    }

    public function destroy($id, UserDeletionService $deletionService)
    {
        $user = User::query()
            ->with('role')
            ->forTenantAdminListing()
            ->whereKey($id)
            ->first();

        if (!$user) {
            return response()->json(['message' => 'المستخدم غير موجود في جامعتك.'], 404);
        }

        $roleName = strtolower($user->role->name ?? '');
        if (in_array($roleName, ['admin', 'super_admin'], true)) {
            return response()->json(['message' => 'لا يمكن حذف حساب مدير النظام.'], 403);
        }

        $result = $deletionService->delete($user);

        return response()->json(['message' => $result['message']], $result['status']);
    }

    /** List active supervisors accepting supervision. */
    public function supervisors(Request $request)
    {
        if (!$request->user()) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $adminUni = $request->user()->university_id;

        $supervisors = User::query()
            ->whereHas('role', function ($q) {
                $q->where('name', 'supervisor');
            })
            ->where('status', 'active')
            ->whereHas('supervisorUniversities', function ($q) use ($adminUni) {
                $q->where('universities.id', $adminUni)
                    ->where('supervisor_universities.status', 'active')
                    ->where('supervisor_universities.accepting_supervision', true);
            })
            ->select('id', 'name', 'email')
            ->orderBy('name')
            ->get();

        return response()->json(['supervisors' => $supervisors]);
    }

    /** Enrich user model with admin-specific membership data. */
    private function enrichUserForAdmin(User $user, ?int $adminUni): User
    {
        $user->membership_status = $user->membershipStatusForUniversity($adminUni);
        $user->university_name = $user->university?->name
            ?? ($user->university_id ? University::whereKey($user->university_id)->value('name') : null);

        if ($user->isSupervisorRole()) {
            $user->supervisor_university_names = $user->supervisorUniversities
                ->pluck('name')
                ->values()
                ->all();

            if ($adminUni) {
                $user->supervised_students_count = (int) Project::query()
                    ->where('supervisor_id', $user->id)
                    ->where('university_id', $adminUni)
                    ->distinct('user_id')
                    ->count('user_id');
            }
        }

        return $user;
    }

    /** Notify a supervisor of membership approval or rejection. */
    private function notifySupervisorMembershipDecision(User $user, int $universityId, string $decision): void
    {
        $uniName = University::whereKey($universityId)->value('name') ?? '';

        if ($decision === 'approved') {
            $this->notificationService->notifyUser(
                $user,
                'supervisor.membership_approved',
                'تم قبولك كمشرف',
                "تم اعتماد انضمامك كمشرف في {$uniName}.",
                [
                    'url'             => '/dashboard/profile',
                    'university_id'   => $universityId,
                    'university_name' => $uniName,
                ],
            );
            return;
        }

        $this->notificationService->notifyUser(
            $user,
            'supervisor.membership_rejected',
            'تم رفض طلب الإشراف',
            "لم يتم قبول طلبك كمشرف في {$uniName}.",
            [
                'url'             => '/dashboard/profile',
                'university_id'   => $universityId,
                'university_name' => $uniName,
            ],
        );
    }
}

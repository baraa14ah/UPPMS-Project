<?php

namespace App\Http\Controllers\Auth;


use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\Auth\AuthService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    protected $authService;

    public function __construct(AuthService $authService)
    {
        $this->authService = $authService;
    }

    public function register(Request $request)
    {
        $result = $this->authService->register($request);

        if (isset($result['error'])) {
            $status = $result['error']['status'];
            unset($result['error']['status']);
            return response()->json($result['error'], $status);
        }

        $httpStatus = $result['status'] ?? 201;
        unset($result['status']);

        return response()->json($result, $httpStatus);
    }

    public function login(Request $request)
    {
        $result = $this->authService->login($request);

        $user = $result['user'] ?? null;

        if ($user instanceof User) {
            $user->load('role');
            $result['user'] = $user;
            $result['role'] = $user->role?->name;
        } elseif (is_array($user) && isset($user['id'])) {
            $u = User::with('role')->find($user['id']);
            if ($u) {
                $result['user'] = $u;
                $result['role'] = $u->role?->name;
            }
        }

        return response()->json($result);
    }

    /** Log out the authenticated user. */
    public function logout(Request $request)
    {
        return response()->json($this->authService->logout($request));
    }

    /** Return the authenticated user's profile data. */
    public function profile(Request $request)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $user->load(['role', 'university', 'supervisorUniversities:id,name']);
        $user->enrichSupervisorMembershipPayload();

        $universityName = $user->university?->name;
        if ($user->isSupervisorRole()) {
            $activeNames = $user->active_supervisor_university_names ?? [];
            if (!empty($activeNames)) {
                $universityName = implode('، ', $activeNames);
            }
        }

        return response()->json([
            'user'            => $user,
            'role'            => $user->role?->name,
            'status'          => $user->status,
            'university_id'   => $user->university_id,
            'university_name' => $universityName,
        ]);
    }

    /** Update the authenticated user's name and email. */
    public function updateProfile(Request $request)
    {
        $request->validate([
            'name'  => 'required|string|max:255',
            'email' => 'required|email|unique:users,email,' . $request->user()->id,
        ]);

        $user = $request->user();
        $user->name = $request->name;
        $user->email = $request->email;
        $user->save();

        $user->load('role');

        return response()->json([
            'message' => 'Profile updated successfully',
            'user'    => $user,
            'role'    => $user->role?->name,
        ]);
    }

    /** Change the authenticated user's password. */
    public function changePassword(Request $request)
    {
        $request->validate([
            'current_password' => 'required',
            'new_password'     => 'required|min:6|confirmed',
        ]);

        $user = $request->user();

        if (!Hash::check($request->current_password, $user->password)) {
            return response()->json(['message' => 'Current password is incorrect'], 422);
        }

        $user->password = Hash::make($request->new_password);
        $user->save();

        return response()->json([
            'message' => 'Password updated successfully',
        ]);
    }
}

<?php

namespace App\Http\Controllers\Auth;


use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\AbstractProvider;

class GitHubAuthController extends Controller
{
    /** Redirect the user to GitHub OAuth authorization. */
    public function redirect(Request $request)
    {
        $request->validate([
            'user_id' => 'required|integer',
        ]);

        $user = User::query()->whereKey($request->user_id)->first();

        if (!$user) {
            return redirect($this->frontendRedirect('error', 'user_not_found'));
        }

        if (!$user->isActive()) {
            $reason = $user->isPending() ? 'pending' : 'rejected';
            return redirect($this->frontendRedirect('error', $reason));
        }

        $returnTo = $this->sanitizeReturnTo($request->query('return_to'));

        return $this->githubDriver()
            ->scopes(['repo'])
            ->stateless()
            ->with(['state' => $this->encodeOAuthState($user->id, $returnTo)])
            ->redirect();
    }

    /** Handle the GitHub OAuth callback and store the token. */
    public function callback(Request $request)
    {
        try {
            $githubUser = $this->githubDriver()->stateless()->user();
            [$userId, $returnTo] = $this->decodeOAuthState($request->state);

            $user = User::query()->whereKey($userId)->first();

            if (!$user) {
                return redirect($this->frontendRedirect('error', 'user_not_found'));
            }

            if (!$user->isActive()) {
                $reason = $user->isPending() ? 'pending' : 'rejected';
                return redirect($this->frontendRedirect('error', $reason));
            }

            $user->github_token = $githubUser->token;
            $user->save();

            return redirect($this->frontendRedirect('success', null, $returnTo));
        } catch (\Exception $e) {
            return redirect($this->frontendRedirect('error', null, '/dashboard'));
        }
    }

    /** Remove the linked GitHub token from the user account. */
    public function unlink(Request $request)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'غير مصرح لك بالقيام بهذا الإجراء'], 401);
        }

        if (!$user->isActive()) {
            return response()->json([
                'message' => 'Account is not active.',
                'status' => $user->status,
            ], 403);
        }

        $user->github_token = null;
        $user->save();

        return response()->json(['message' => 'تم إلغاء ربط حساب GitHub بنجاح']);
    }

    /** Resolve the GitHub OAuth driver with OAuth2 helper methods (scopes, stateless, with). */
    private function githubDriver(): AbstractProvider
    {
        $driver = Socialite::driver('github');

        if (!$driver instanceof AbstractProvider) {
            throw new \RuntimeException('GitHub Socialite driver must extend AbstractProvider.');
        }

        return $driver;
    }

    /** Build a frontend redirect URL with OAuth result query params. */
    private function frontendRedirect(string $result, ?string $reason = null, string $returnTo = '/dashboard'): string
    {
        $base = rtrim(env('FRONTEND_URL', 'http://localhost:5173'), '/');
        $path = $this->sanitizeReturnTo($returnTo);
        $query = 'github=' . $result;

        if ($reason !== null) {
            $query .= '&reason=' . $reason;
        }

        return $base . $path . '?' . $query;
    }

    /** Encode user ID and return path into OAuth state. */
    private function encodeOAuthState(int $userId, string $returnTo): string
    {
        return $userId . '::' . base64_encode($returnTo);
    }

    /** Decode OAuth state into user ID and return path. */
    private function decodeOAuthState(?string $state): array
    {
        if (!$state || !str_contains($state, '::')) {
            return [$state, '/dashboard'];
        }

        [$userId, $encoded] = explode('::', $state, 2);

        return [$userId, $this->sanitizeReturnTo(base64_decode($encoded) ?: '/dashboard')];
    }

    /** Sanitize a return path to allowed dashboard routes. */
    private function sanitizeReturnTo(?string $returnTo): string
    {
        $path = is_string($returnTo) ? trim($returnTo) : '/dashboard';

        if ($path === '' || !str_starts_with($path, '/dashboard')) {
            return '/dashboard';
        }

        if (str_contains($path, '://') || str_starts_with($path, '//')) {
            return '/dashboard';
        }

        return $path;
    }
}

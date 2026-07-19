<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserHasUniversity
{
    /** Ensure the authenticated user belongs to a university. */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && method_exists($user, 'isSuperAdmin') && $user->isSuperAdmin()) {
            return $next($request);
        }

        if ($user && is_null($user->university_id)) {
            if (method_exists($user, 'isSupervisorRole') && $user->isSupervisorRole()) {
                $user->repairSupervisorUniversityLinks();
                $user->refresh();
            }

            if (is_null($user->university_id)) {
                return response()->json([
                    'message' => 'Account is not assigned to a university. Contact your administrator.',
                    'code'    => 'no_university',
                ], 403);
            }
        }

        return $next($request);
    }
}

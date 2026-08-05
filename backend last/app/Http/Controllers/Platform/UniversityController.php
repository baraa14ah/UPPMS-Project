<?php

namespace App\Http\Controllers\Platform;


use App\Http\Controllers\Controller;
use App\Models\AcademicStageConfig;
use App\Models\University;
use App\Services\Scheduling\UniversitySchedulingBootstrapService;
use Illuminate\Http\Request;

class UniversityController extends Controller
{
    public function __construct(
        protected UniversitySchedulingBootstrapService $schedulingBootstrap
    ) {}

    /** List active universities for public registration. */
    public function publicList()
    {
        $universities = University::active()
            ->select('id', 'name')
            ->orderBy('name')
            ->get();

        return response()->json(['universities' => $universities]);
    }

    /** List all universities for platform admin with academic usage stats. */
    public function index()
    {
        $byId = collect(app(PlatformAdminController::class)->universitiesOverview())->keyBy('id');

        $universities = University::orderBy('name')->get()->map(function (University $uni) use ($byId) {
            $stats = $byId->get($uni->id, []);

            return array_merge($uni->toArray(), [
                'users_total' => $stats['users_total'] ?? 0,
                'projects' => $stats['projects'] ?? 0,
                'tracks' => $stats['tracks'] ?? 0,
                'active_tracks' => $stats['active_tracks'] ?? 0,
                'active_schedules' => $stats['active_schedules'] ?? 0,
                'committees' => $stats['committees'] ?? 0,
                'pending_proposals' => $stats['pending_proposals'] ?? 0,
                'defense_rooms' => $stats['defense_rooms'] ?? 0,
                'defense_types' => $stats['defense_types'] ?? 0,
            ]);
        });

        return response()->json(['universities' => $universities]);
    }

    /** Create a new university. */
    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'slug' => 'nullable|string|max:255|unique:universities,slug',
        ]);

        $university = University::create([
            'name'      => $request->name,
            'slug'      => $request->slug,
            'is_active' => true,
        ]);

        $this->schedulingBootstrap->ensureFinalDefenseStage($university);

        return response()->json([
            'message'    => 'University created successfully.',
            'university' => $university,
        ], 201);
    }

    /** Update an existing university. */
    public function update(Request $request, $id)
    {
        $university = University::find($id);

        if (!$university) {
            return response()->json(['message' => 'University not found.'], 404);
        }

        $request->validate([
            'name'      => 'sometimes|string|max:255',
            'slug'      => 'sometimes|nullable|string|max:255|unique:universities,slug,' . $id,
            'is_active' => 'sometimes|boolean',
        ]);

        $university->update($request->only(['name', 'slug', 'is_active']));

        return response()->json([
            'message'    => 'University updated successfully.',
            'university' => $university->fresh(),
        ]);
    }
}

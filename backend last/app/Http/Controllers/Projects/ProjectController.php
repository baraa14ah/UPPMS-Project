<?php

namespace App\Http\Controllers\Projects;


use App\Http\Controllers\Controller;
use App\Models\Project;
use Illuminate\Http\Request;
use App\Services\Projects\ProjectService;
use App\Services\Auth\GithubService;
use App\Services\Tracks\TrackService;

class ProjectController extends Controller
{
    protected ProjectService $projectService;
    protected GithubService $githubService;
    protected TrackService $trackService;

    public function __construct(
        ProjectService $projectService,
        GithubService $githubService,
        TrackService $trackService,
    ) {
        $this->projectService = $projectService;
        $this->githubService = $githubService;
        $this->trackService = $trackService;
    }

    /** List projects visible to the authenticated user. */
    public function index(Request $request)
    {
        $user = $request->user();
        $user->loadMissing('role');

        $projects = $this->projectService->listForIndex($user);

        return response()->json(['projects' => $projects]);
    }

    /** Return full details and stats for a project. */
    public function show(Request $request, $id)
    {
        $project = $this->projectService->getProjectFullDetails((int)$id);

        if (!$project) return response()->json(['message' => 'Project not found'], 404);

        $defenseSession = $project->activeDefenseSession;
        if ($defenseSession) {
            $this->trackService->autoCompleteExpiredNonDecisiveSessionIfNeeded($defenseSession);
            $project = $this->projectService->getProjectFullDetails((int)$id);
            $defenseSession = $project->activeDefenseSession;
        }

        if (!$defenseSession) {
            $defenseSession = $this->projectService->getLatestActiveScheduleDefenseSession($project);
        }

        $project = $this->projectService->enrichProjectWithTrackStage($project);

        $stats = $this->projectService->calculateProgress((int)$id);

        $defenseResult = null;
        if ($defenseSession) {
            $defenseResult = $this->trackService->getDefenseSessionContext(
                $project,
                $defenseSession,
            );
        }

        return response()->json([
            'project' => $project,
            'defense_session' => $defenseSession,
            'stats' => $stats,
            'defense_result' => $defenseResult,
        ]);
    }

    /** Create a new project. */
    public function create(Request $request)
    {
        $project = $this->projectService->create($request);

        return response()->json([
            'message' => 'تم إنشاء المشروع بنجاح',
            'project' => $project
        ], 201);
    }

    /** Update an existing project. */
    public function update(Request $request, $id)
    {
        $result = $this->projectService->update($request, (int)$id, $request->user());

        if ($result === 'unauthorized') {
            return response()->json(['message' => 'غير مصرح لك بتعديل هذا المشروع'], 403);
        }

        if (!$result) {
            return response()->json(['message' => 'المشروع غير موجود'], 404);
        }

        return response()->json([
            'message' => 'تم تعديل المشروع بنجاح',
            'project' => $result
        ]);
    }

    public function delete(Request $request, $id)
    {
        $result = $this->projectService->delete((int)$id, $request->user());

        if ($result === 'unauthorized') {
            return response()->json(['message' => 'غير مصرح لك بحذف هذا المشروع'], 403);
        }

        if (!$result) {
            return response()->json(['message' => 'المشروع غير موجود'], 404);
        }

        return response()->json(['message' => 'تم حذف المشروع بنجاح']);
    }

    /** Student leaves a project (members leave, solo owners delete, owners transfer). */
    public function leave(Request $request, $id)
    {
        $result = $this->projectService->leaveProject((int) $id, $request->user());

        if ($result === 'not_found') {
            return response()->json(['message' => 'المشروع غير موجود'], 404);
        }

        if ($result === 'forbidden') {
            return response()->json(['message' => 'غير مصرح لك بمغادرة هذا المشروع'], 403);
        }

        $message = match (true) {
            !empty($result['project_deleted']) && !empty($result['phase_reset']) =>
                'تمت مغادرة المشروع وحذفه، وأُعيد ضبط المسار الفرعي غير المكتمل',
            !empty($result['project_deleted']) =>
                'تمت مغادرة المشروع وحذفه بنجاح',
            !empty($result['ownership_transferred']) && !empty($result['phase_reset']) =>
                'تمت مغادرة المشروع ونقل الملكية، وأُعيد ضبط مسارك الفرعي غير المكتمل',
            !empty($result['ownership_transferred']) =>
                'تمت مغادرة المشروع ونقل الملكية بنجاح',
            !empty($result['phase_reset']) =>
                'تمت مغادرة المشروع وأُعيد ضبط المسار الفرعي غير المكتمل',
            default => 'تمت مغادرة المشروع بنجاح',
        };

        return response()->json([
            'message' => $message,
            'data' => $result,
        ]);
    }

    /** Route alias that delegates to delete. */
    public function destroy(Request $request, $id)
    {
        return $this->delete($request, $id);
    }

    /** Remove the current supervisor from a project. */
    public function leaveSupervision(Request $request, $id)
    {
        $project = \App\Models\Project::query()->whereKey($id)->firstOrFail();

        $user = $request->user();

        if ($project->supervisor_id !== $user->id) {
            return response()->json(['message' => 'غير مصرح لك بإلغاء الإشراف'], 403);
        }

        $project->supervisor_id = null;
        $project->save();

        return response()->json(['message' => 'تم إلغاء الإشراف بنجاح']);
    }

    /** Return task progress stats for a project. */
    public function progress(Request $request, $id)
    {
        $stats = $this->projectService->calculateProgress((int)$id);
        if (!$stats) {
            return response()->json(['message' => 'المشروع غير موجود'], 404);
        }
        return response()->json($stats);
    }

    /** List students available for project invitation. */
    public function students(Request $request, int $id)
    {
        $students = $this->projectService->getAvailableStudentsForInvite(
            $id,
            $request->get('search'),
        );

        return response()->json(['students' => $students]);
    }

    /** Return activity log entries for a project. */
    public function getActivities($id)
    {
        $project = \App\Models\Project::query()->whereKey($id)->first();
        if (!$project) {
            return response()->json(['message' => 'Project not found'], 404);
        }

        $activities = \App\Models\ProjectActivity::query()
            ->forCurrentUniversity()
            ->with('user:id,name')
            ->where('project_id', $id)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'status' => 'success',
            'activities' => $activities,
        ]);
    }
}

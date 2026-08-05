<?php

namespace App\Http\Controllers\Users;


use App\Http\Controllers\Controller;
use App\Models\XmlImportLog;
use App\Services\Users\XmlImportService;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class XmlImportController extends Controller
{
    public function __construct(
        protected XmlImportService $xmlImportService,
    ) {}

    /** Upload and import an authorized-users XML file. */
    public function import(Request $request)
    {
        $request->validate([
            'xml_file' => 'required|file|mimes:xml|max:10240',
        ]);

        $user = $request->user();
        $universityId = (int) $user->university_id;

        if (!$universityId) {
            return response()->json(['message' => 'University context is required for XML import'], 403);
        }

        try {
            $parsed = $this->xmlImportService->parseXmlFile($request->file('xml_file'));
            $importLog = $this->xmlImportService->importRecords(
                $parsed,
                $universityId,
                (int) $user->id,
                $request->file('xml_file')->getClientOriginalName(),
                (int) $request->file('xml_file')->getSize(),
            );
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'message' => 'Invalid XML format',
                'errors' => ['xml_file' => [$e->getMessage()]],
            ], 400);
        } catch (ValidationException $e) {
            throw $e;
        }

        return response()->json([
            'message' => 'XML file imported successfully',
            'data' => [
                'import_id' => $importLog->id,
                'total_records' => $importLog->total_records,
                'students_count' => $importLog->students_count,
                'supervisors_count' => $importLog->supervisors_count,
                'success_count' => $importLog->success_count,
                'updated_count' => (int) ($importLog->updated_count ?? 0),
                'error_count' => $importLog->error_count,
                'skipped_count' => (int) ($importLog->skipped_count ?? 0),
                'errors' => $importLog->errors_json ?? [],
                'comparison' => $importLog->comparison ?? null,
            ],
        ], 201);
    }

    /** Preview an XML file against the current authorized list without importing. */
    public function preview(Request $request)
    {
        $request->validate([
            'xml_file' => 'required|file|mimes:xml|max:10240',
        ]);

        $universityId = (int) $request->user()->university_id;
        if (!$universityId) {
            return response()->json(['message' => 'University context is required for XML import'], 403);
        }

        try {
            $parsed = $this->xmlImportService->parseXmlFile($request->file('xml_file'));
            $comparison = $this->xmlImportService->compareWithExisting($parsed, $universityId);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'message' => 'Invalid XML format',
                'errors' => ['xml_file' => [$e->getMessage()]],
            ], 400);
        }

        return response()->json([
            'message' => 'XML comparison ready',
            'data' => [
                'filename' => $request->file('xml_file')->getClientOriginalName(),
                'total_in_file' => count($parsed['students'] ?? []) + count($parsed['supervisors'] ?? []),
                'students_in_file' => count($parsed['students'] ?? []),
                'supervisors_in_file' => count($parsed['supervisors'] ?? []),
                'comparison' => $comparison,
            ],
        ]);
    }

    /** List past XML imports for the current university. */
    public function history(Request $request)
    {
        $perPage = min(max((int) $request->query('per_page', 15), 1), 100);

        $paginator = XmlImportLog::query()
            ->with('admin:id,name')
            ->orderByDesc('created_at')
            ->paginate($perPage);

        $imports = collect($paginator->items())->map(function (XmlImportLog $log) {
            return [
                'id' => $log->id,
                'filename' => $log->filename,
                'uploaded_by' => $log->admin?->name,
                'uploaded_at' => $log->created_at?->toIso8601String(),
                'total_records' => $log->total_records,
                'students_count' => $log->students_count,
                'supervisors_count' => $log->supervisors_count,
                'success_count' => $log->success_count,
                'error_count' => $log->error_count,
                'status' => $log->status,
            ];
        });

        return response()->json([
            'message' => 'Import history retrieved',
            'data' => [
                'imports' => $imports,
                'pagination' => [
                    'current_page' => $paginator->currentPage(),
                    'total_pages' => $paginator->lastPage(),
                    'total_items' => $paginator->total(),
                    'per_page' => $paginator->perPage(),
                ],
            ],
        ]);
    }

    /** Return registration statistics for authorized XML records. */
    public function statistics(Request $request)
    {
        $universityId = (int) $request->user()->university_id;

        return response()->json([
            'message' => 'Statistics retrieved',
            'data' => $this->xmlImportService->getStatistics($universityId),
        ]);
    }

    /** Return details for a single XML import log. */
    public function show(Request $request, int $id)
    {
        $importLog = XmlImportLog::query()
            ->with('admin:id,name')
            ->find($id);

        if (!$importLog) {
            return response()->json(['message' => 'Import not found'], 404);
        }

        return response()->json([
            'message' => 'Import details retrieved',
            'data' => [
                'id' => $importLog->id,
                'filename' => $importLog->filename,
                'file_size' => $importLog->file_size,
                'uploaded_by' => [
                    'id' => $importLog->admin?->id,
                    'name' => $importLog->admin?->name,
                ],
                'uploaded_at' => $importLog->created_at?->toIso8601String(),
                'total_records' => $importLog->total_records,
                'students_count' => $importLog->students_count,
                'supervisors_count' => $importLog->supervisors_count,
                'success_count' => $importLog->success_count,
                'error_count' => $importLog->error_count,
                'status' => $importLog->status,
                'errors' => $importLog->errors_json ?? [],
            ],
        ]);
    }

    /** Return the standardized XML schema documentation. */
    public function schema()
    {
        return response()->json([
            'message' => 'XML schema documentation',
            'data' => $this->xmlImportService->schemaDocumentation(),
        ]);
    }
}

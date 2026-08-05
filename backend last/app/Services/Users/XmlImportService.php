<?php

namespace App\Services\Users;

use App\Models\XmlAuthorizedUser;
use App\Models\XmlImportLog;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;

class XmlImportService
{
    public const CREDENTIALS_MISMATCH = 'Your data does not match the official university records.';
    public const CREDENTIALS_ALREADY_USED = 'This registration has already been used.';

    /** Parses an uploaded XML file into student and supervisor record arrays. */
    public function parseXmlFile(UploadedFile $file): array
    {
        $content = $file->get();
        if ($content === false || trim($content) === '') {
            throw new \InvalidArgumentException('Invalid XML format');
        }

        libxml_use_internal_errors(true);
        $xml = simplexml_load_string(
            $content,
            'SimpleXMLElement',
            LIBXML_NOCDATA | LIBXML_NOERROR
        );

        if ($xml === false) {
            throw new \InvalidArgumentException('Invalid XML format');
        }

        if ($xml->getName() !== 'authorized_users') {
            throw new \InvalidArgumentException('Invalid XML format: root element must be authorized_users');
        }

        $hasRecognizedElements = false;
        $students = [];
        $supervisors = [];
        $row = 0;

        foreach ($xml->children() as $child) {
            $row++;
            $name = $child->getName();

            if ($name === 'student') {
                $hasRecognizedElements = true;
                $students[] = [
                    'row' => $row,
                    'university_number' => trim((string) ($child['university_number'] ?? '')),
                    'email' => strtolower(trim((string) ($child['email'] ?? ''))),
                    'full_name' => trim((string) ($child['full_name'] ?? '')),
                ];
                continue;
            }

            if ($name === 'supervisor') {
                $hasRecognizedElements = true;
                $supervisors[] = [
                    'row' => $row,
                    'email' => strtolower(trim((string) ($child['email'] ?? ''))),
                    'full_name' => trim((string) ($child['full_name'] ?? '')),
                ];
            }
        }

        if (!$hasRecognizedElements) {
            throw new \InvalidArgumentException('Invalid XML format: no student or supervisor records found');
        }

        return [
            'students' => $students,
            'supervisors' => $supervisors,
        ];
    }

    /**
     * Compares a parsed XML payload with the university's current authorized list.
     *
     * @return array{
     *   summary: array{new:int,unchanged:int,updated:int,removed:int},
     *   new: list<array>,
     *   unchanged: list<array>,
     *   updated: list<array>,
     *   removed: list<array>
     * }
     */
    public function compareWithExisting(array $parsedData, int $universityId): array
    {
        $existing = XmlAuthorizedUser::withoutGlobalScopes()
            ->where('university_id', $universityId)
            ->get();

        $existingByKey = [];
        foreach ($existing as $row) {
            $existingByKey[$this->authorizedRecordKey($row->user_type, $row->email, $row->university_number)] = $row;
        }

        $seenKeys = [];
        $new = [];
        $unchanged = [];
        $updated = [];

        foreach ($parsedData['students'] ?? [] as $student) {
            if ($this->validateStudentFields($student) !== null) {
                continue;
            }
            $key = $this->authorizedRecordKey('student', $student['email'], $student['university_number']);
            $seenKeys[$key] = true;
            $item = [
                'user_type' => 'student',
                'email' => $student['email'],
                'full_name' => $student['full_name'],
                'university_number' => $student['university_number'],
            ];

            if (!isset($existingByKey[$key])) {
                $new[] = $item;
                continue;
            }

            $current = $existingByKey[$key];
            if (trim((string) $current->full_name) === trim((string) $student['full_name'])) {
                $unchanged[] = $item;
            } else {
                $updated[] = array_merge($item, [
                    'previous_full_name' => $current->full_name,
                ]);
            }
        }

        foreach ($parsedData['supervisors'] ?? [] as $supervisor) {
            if ($this->validateSupervisorFields($supervisor) !== null) {
                continue;
            }
            $key = $this->authorizedRecordKey('supervisor', $supervisor['email'], null);
            $seenKeys[$key] = true;
            $item = [
                'user_type' => 'supervisor',
                'email' => $supervisor['email'],
                'full_name' => $supervisor['full_name'],
                'university_number' => null,
            ];

            if (!isset($existingByKey[$key])) {
                $new[] = $item;
                continue;
            }

            $current = $existingByKey[$key];
            if (trim((string) $current->full_name) === trim((string) $supervisor['full_name'])) {
                $unchanged[] = $item;
            } else {
                $updated[] = array_merge($item, [
                    'previous_full_name' => $current->full_name,
                ]);
            }
        }

        $removed = [];
        foreach ($existingByKey as $key => $row) {
            if (isset($seenKeys[$key])) {
                continue;
            }
            $removed[] = [
                'user_type' => $row->user_type,
                'email' => $row->email,
                'full_name' => $row->full_name,
                'university_number' => $row->university_number,
                'is_used' => (bool) $row->is_used,
            ];
        }

        return [
            'summary' => [
                'new' => count($new),
                'unchanged' => count($unchanged),
                'updated' => count($updated),
                'removed' => count($removed),
            ],
            'new' => $new,
            'unchanged' => $unchanged,
            'updated' => $updated,
            'removed' => $removed,
        ];
    }

    /** Imports parsed XML records for a university inside a transaction. */
    public function importRecords(array $parsedData, int $universityId, int $adminUserId, string $filename, int $fileSize): XmlImportLog
    {
        $students = $parsedData['students'] ?? [];
        $supervisors = $parsedData['supervisors'] ?? [];
        $totalRecords = count($students) + count($supervisors);
        $comparison = $this->compareWithExisting($parsedData, $universityId);

        return DB::transaction(function () use (
            $students,
            $supervisors,
            $totalRecords,
            $universityId,
            $adminUserId,
            $filename,
            $fileSize,
            $comparison
        ) {
            $importLog = XmlImportLog::create([
                'university_id' => $universityId,
                'admin_user_id' => $adminUserId,
                'filename' => $filename,
                'file_size' => $fileSize,
                'total_records' => $totalRecords,
                'students_count' => count($students),
                'supervisors_count' => count($supervisors),
                'status' => 'processing',
            ]);

            $errors = [];
            $successCount = 0;
            $skippedCount = 0;
            $updatedCount = 0;
            $now = now();

            foreach ($students as $student) {
                $result = $this->importStudentRecord($student, $universityId, $importLog->id, $now);
                if ($result === true) {
                    $successCount++;
                } elseif ($result === 'updated') {
                    $updatedCount++;
                } elseif ($result === false) {
                    $skippedCount++;
                } else {
                    $errors[] = $result;
                }
            }

            foreach ($supervisors as $supervisor) {
                $result = $this->importSupervisorRecord($supervisor, $universityId, $importLog->id, $now);
                if ($result === true) {
                    $successCount++;
                } elseif ($result === 'updated') {
                    $updatedCount++;
                } elseif ($result === false) {
                    $skippedCount++;
                } else {
                    $errors[] = $result;
                }
            }

            $errorCount = count($errors);
            $status = 'completed';
            if ($successCount === 0 && $updatedCount === 0 && $totalRecords > 0) {
                $status = $errorCount === $totalRecords ? 'failed' : 'completed';
            }

            $importLog->update([
                'success_count' => $successCount,
                'error_count' => $errorCount,
                'errors_json' => $errorCount > 0 ? $errors : null,
                'status' => $status,
            ]);

            $fresh = $importLog->fresh();
            $fresh->setAttribute('skipped_count', $skippedCount);
            $fresh->setAttribute('updated_count', $updatedCount);
            $fresh->setAttribute('comparison', $comparison);

            return $fresh;
        });
    }

    /** Returns whether the university has any imported XML authorization records. */
    public function universityHasXmlRecords(int $universityId): bool
    {
        return XmlAuthorizedUser::withoutGlobalScopes()
            ->where('university_id', $universityId)
            ->exists();
    }

    /**
     * Validates registration credentials against XML records.
     *
     * @return array{record: ?XmlAuthorizedUser, error: ?string}
     */
    public function resolveRegistrationCredentials(
        string $email,
        ?string $universityNumber,
        string $userType,
        int $universityId
    ): array {
        $email = strtolower(trim($email));
        $universityNumber = $universityNumber !== null ? trim($universityNumber) : null;

        $baseQuery = XmlAuthorizedUser::withoutGlobalScopes()
            ->where('university_id', $universityId)
            ->where('email', $email)
            ->where('user_type', $userType);

        if ($userType === 'student') {
            $baseQuery->where('university_number', $universityNumber);
        }

        $available = (clone $baseQuery)->where('is_used', false)->first();
        if ($available) {
            return ['record' => $available, 'error' => null];
        }

        $used = (clone $baseQuery)->where('is_used', true)->exists();
        if ($used) {
            return ['record' => null, 'error' => self::CREDENTIALS_ALREADY_USED];
        }

        return ['record' => null, 'error' => self::CREDENTIALS_MISMATCH];
    }

    /** Returns aggregate registration statistics for a university. */
    public function getStatistics(int $universityId): array
    {
        $base = XmlAuthorizedUser::withoutGlobalScopes()
            ->where('university_id', $universityId);

        $studentsTotal = (clone $base)->where('user_type', 'student')->count();
        $studentsRegistered = (clone $base)->where('user_type', 'student')->where('is_used', true)->count();
        $supervisorsTotal = (clone $base)->where('user_type', 'supervisor')->count();
        $supervisorsRegistered = (clone $base)->where('user_type', 'supervisor')->where('is_used', true)->count();

        $totalAuthorized = $studentsTotal + $supervisorsTotal;
        $totalRegistered = $studentsRegistered + $supervisorsRegistered;

        $lastImport = XmlImportLog::withoutGlobalScopes()
            ->where('university_id', $universityId)
            ->latest('created_at')
            ->value('created_at');

        return [
            'total_authorized' => $totalAuthorized,
            'students' => [
                'total' => $studentsTotal,
                'registered' => $studentsRegistered,
                'available' => max(0, $studentsTotal - $studentsRegistered),
                'registration_rate' => $this->rate($studentsRegistered, $studentsTotal),
            ],
            'supervisors' => [
                'total' => $supervisorsTotal,
                'registered' => $supervisorsRegistered,
                'available' => max(0, $supervisorsTotal - $supervisorsRegistered),
                'registration_rate' => $this->rate($supervisorsRegistered, $supervisorsTotal),
            ],
            'overall_registration_rate' => $this->rate($totalRegistered, $totalAuthorized),
            'last_import_date' => $lastImport?->toIso8601String(),
        ];
    }

    /** Returns the public XML schema documentation payload. */
    public function schemaDocumentation(): array
    {
        return [
            'schema_version' => '1.0',
            'root_element' => 'authorized_users',
            'elements' => [
                'student' => [
                    'attributes' => [
                        'university_number' => ['type' => 'string', 'required' => true, 'max_length' => 50],
                        'email' => ['type' => 'email', 'required' => true, 'max_length' => 255],
                        'full_name' => ['type' => 'string', 'required' => true, 'max_length' => 255],
                    ],
                ],
                'supervisor' => [
                    'attributes' => [
                        'email' => ['type' => 'email', 'required' => true, 'max_length' => 255],
                        'full_name' => ['type' => 'string', 'required' => true, 'max_length' => 255],
                    ],
                ],
            ],
            // Student match = email + university_number; supervisor match = email only.
            'example' => <<<'XML'
<?xml version="1.0" encoding="UTF-8"?>
<authorized_users>
  <student university_number="2026001001" email="student01@spu.edu.sy" full_name="Student Name" />
  <supervisor email="supervisor01@spu.edu.sy" full_name="Professor Name" />
</authorized_users>
XML,
        ];
    }

    private function importStudentRecord(array $student, int $universityId, int $importLogId, $now): bool|string|array
    {
        $row = $student['row'] ?? 0;
        $errors = $this->validateStudentFields($student);
        if ($errors !== null) {
            return [
                'row' => $row,
                'field' => $errors['field'],
                'message' => $errors['message'],
            ];
        }

        $existing = XmlAuthorizedUser::withoutGlobalScopes()
            ->where('university_id', $universityId)
            ->where('user_type', 'student')
            ->where('university_number', $student['university_number'])
            ->where('email', $student['email'])
            ->first();

        if ($existing) {
            if (trim((string) $existing->full_name) === trim((string) $student['full_name'])) {
                return false;
            }

            $existing->update([
                'full_name' => $student['full_name'],
                'import_log_id' => $importLogId,
                'imported_at' => $now,
            ]);

            return 'updated';
        }

        XmlAuthorizedUser::create([
            'university_id' => $universityId,
            'university_number' => $student['university_number'],
            'email' => $student['email'],
            'full_name' => $student['full_name'],
            'user_type' => 'student',
            'import_log_id' => $importLogId,
            'imported_at' => $now,
        ]);

        return true;
    }

    private function importSupervisorRecord(array $supervisor, int $universityId, int $importLogId, $now): bool|string|array
    {
        $row = $supervisor['row'] ?? 0;
        $errors = $this->validateSupervisorFields($supervisor);
        if ($errors !== null) {
            return [
                'row' => $row,
                'field' => $errors['field'],
                'message' => $errors['message'],
            ];
        }

        $existing = XmlAuthorizedUser::withoutGlobalScopes()
            ->where('university_id', $universityId)
            ->where('user_type', 'supervisor')
            ->where('email', $supervisor['email'])
            ->first();

        if ($existing) {
            if (trim((string) $existing->full_name) === trim((string) $supervisor['full_name'])) {
                return false;
            }

            $existing->update([
                'full_name' => $supervisor['full_name'],
                'import_log_id' => $importLogId,
                'imported_at' => $now,
            ]);

            return 'updated';
        }

        XmlAuthorizedUser::create([
            'university_id' => $universityId,
            'email' => $supervisor['email'],
            'full_name' => $supervisor['full_name'],
            'user_type' => 'supervisor',
            'import_log_id' => $importLogId,
            'imported_at' => $now,
        ]);

        return true;
    }

    private function authorizedRecordKey(string $userType, string $email, ?string $universityNumber): string
    {
        $email = strtolower(trim($email));
        if ($userType === 'student') {
            return 'student|' . trim((string) $universityNumber) . '|' . $email;
        }

        return 'supervisor|' . $email;
    }

    private function validateStudentFields(array $student): ?array
    {
        if ($student['university_number'] === '') {
            return ['field' => 'university_number', 'message' => 'University number is required for student records'];
        }
        if (!preg_match('/^[A-Za-z0-9\-]+$/', $student['university_number'])) {
            return ['field' => 'university_number', 'message' => 'Invalid university number format'];
        }
        if ($student['email'] === '' || !filter_var($student['email'], FILTER_VALIDATE_EMAIL)) {
            return ['field' => 'email', 'message' => 'Valid email is required for student records'];
        }
        if ($student['full_name'] === '') {
            return ['field' => 'full_name', 'message' => 'Full name is required for student records'];
        }

        return null;
    }

    private function validateSupervisorFields(array $supervisor): ?array
    {
        if ($supervisor['email'] === '' || !filter_var($supervisor['email'], FILTER_VALIDATE_EMAIL)) {
            return ['field' => 'email', 'message' => 'Valid email is required for supervisor records'];
        }
        if ($supervisor['full_name'] === '') {
            return ['field' => 'full_name', 'message' => 'Full name is required for supervisor records'];
        }

        return null;
    }

    private function rate(int $registered, int $total): float
    {
        if ($total === 0) {
            return 0.0;
        }

        return round(($registered / $total) * 100, 2);
    }
}

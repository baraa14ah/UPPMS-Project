<?php

namespace App\Console\Commands;

use App\Models\ArchivedXmlAuthorizedUser;
use App\Models\XmlAuthorizedUser;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class ArchiveOldXmlRecords extends Command
{
    protected $signature = 'xml:archive-old-records';

    protected $description = 'Archive XML authorized user records older than 12 months';

    public function handle(): int
    {
        $cutoff = now()->subMonths(12);
        $archivedCount = 0;

        XmlAuthorizedUser::withoutGlobalScopes()
            ->where('imported_at', '<', $cutoff)
            ->orderBy('id')
            ->chunkById(200, function ($records) use (&$archivedCount) {
                DB::transaction(function () use ($records, &$archivedCount) {
                    foreach ($records as $record) {
                        ArchivedXmlAuthorizedUser::create([
                            'university_id' => $record->university_id,
                            'university_number' => $record->university_number,
                            'email' => $record->email,
                            'full_name' => $record->full_name,
                            'user_type' => $record->user_type,
                            'is_used' => $record->is_used,
                            'registered_user_id' => $record->registered_user_id,
                            'import_log_id' => $record->import_log_id,
                            'imported_at' => $record->imported_at,
                            'used_at' => $record->used_at,
                            'archived_at' => now(),
                            'archive_reason' => 'expired',
                        ]);

                        $record->delete();
                        $archivedCount++;
                    }
                });
            });

        $this->info("Archived {$archivedCount} XML authorized user record(s).");

        return self::SUCCESS;
    }
}

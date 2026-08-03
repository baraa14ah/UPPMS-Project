<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Allow up to 3 pending proposals per student (enforced in ProjectProposalService).
        DB::unprepared('DROP TRIGGER IF EXISTS trg_project_proposals_one_pending_insert');
        DB::unprepared('DROP TRIGGER IF EXISTS trg_project_proposals_one_pending_update');
    }

    public function down(): void
    {
        DB::unprepared('DROP TRIGGER IF EXISTS trg_project_proposals_one_pending_insert');
        DB::unprepared('DROP TRIGGER IF EXISTS trg_project_proposals_one_pending_update');

        DB::unprepared(<<<'SQL'
CREATE TRIGGER trg_project_proposals_one_pending_insert
BEFORE INSERT ON project_proposals
FOR EACH ROW
BEGIN
    IF NEW.status = 'pending' AND EXISTS (
        SELECT 1 FROM project_proposals
        WHERE student_id = NEW.student_id AND status = 'pending'
    ) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Student already has a pending proposal';
    END IF;
END
SQL);

        DB::unprepared(<<<'SQL'
CREATE TRIGGER trg_project_proposals_one_pending_update
BEFORE UPDATE ON project_proposals
FOR EACH ROW
BEGIN
    IF NEW.status = 'pending' AND NEW.status <> OLD.status AND EXISTS (
        SELECT 1 FROM project_proposals
        WHERE student_id = NEW.student_id AND status = 'pending' AND id <> NEW.id
    ) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Student already has a pending proposal';
    END IF;
END
SQL);
    }
};

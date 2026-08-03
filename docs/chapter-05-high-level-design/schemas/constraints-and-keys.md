# 5-2-3 Constraints and Keys — UPPMS

## Primary Keys (PK)
كل الجداول التشغيلية تستخدم `id` كمفتاح أساسي (`bigint` auto-increment).

## Foreign Keys (FK) — أهم الروابط

| From | Column | To |
|------|--------|-----|
| users | role_id | roles.id |
| users | university_id | universities.id |
| users | track_id | tracks.id |
| projects | university_id | universities.id |
| projects | owner_id | users.id |
| projects | supervisor_id | users.id |
| projects | proposal_id | project_proposals.id |
| project_proposals | student_id / supervisor_id | users.id |
| project_proposals | track_stage_id | track_stages.id |
| tasks | project_id | projects.id |
| track_stages | track_id | tracks.id |
| track_stages | parent_id | track_stages.id |
| track_stages | academic_stage_id | academic_stages_config.id |
| student_progress | student_id / track_id / track_stage_id | users / tracks / track_stages |
| approved_schedules | university_id / academic_stage_id | universities / academic_stages_config |
| defense_sessions | approved_schedule_id / project_id / room_id / committee_id | related tables |
| committee_members | committee_id / user_id | committees / users |
| committee_assignments | defense_session_id / user_id | defense_sessions / users |
| xml_authorized_users | university_id / registered_user_id | universities / users |
| doctor_availabilities | doctor_id / academic_stage_id | users / academic_stages_config |
| notifications | user_id | users.id |

## Unique Constraints

| Table | Unique |
|-------|--------|
| users | email |
| users | (university_id, student_number) |
| projects | proposal_id (when set) |
| tracks | (university_id, name) |
| committees | (university_id, name) |
| student_progress | (student_id, track_id, track_stage_id) |
| xml_authorized_users | (university_id, university_number, email, user_type) |
| roles | name |

## Check / Enum-like Status Values

| Entity | Field | Allowed values |
|--------|-------|----------------|
| users | status | pending, active, rejected, graduated |
| project_proposals | status | pending, approved, rejected |
| tasks | status | pending, in_progress, completed |
| student_progress | status | in_progress, passed, failed, incomplete |
| approved_schedules | status | active, voided |
| defense_sessions | status | scheduled, completed, cancelled |
| xml_import_logs | status | processing, completed, failed |
| xml_authorized_users | user_type | student, supervisor |
| committee_members | role | chair, member |
| track_stages | stage_kind | phase, step |

## Business Rules (DB + Application)

1. **Pending proposal guard:** لا يُسمح بأكثر من مقترح `pending` نشط لنفس الطالب (index/trigger حسب التهجير).
2. **Tenant isolation:** السجلات ذات `university_id` تُفلتر بـ `TenantScope` برمجياً.
3. **XML match on register:** المطابقة تفعّل الحساب وتربط `registered_user_id` وتعلّم `is_used`.
4. **Committee exclusivity:** عضو اللجنة لا يكون في أكثر من لجنة نشطة في نفس الوقت (قاعدة خدمة اللجان).
5. **One active approved schedule per stage:** منع اعتماد جدول جديد لنفس المرحلة إن وُجد جدول `active`.
6. **No SoftDeletes:** الحذف في النظام إما فعلي أو عبر حالات مثل `voided` / `cancelled` / `is_active=false`.

## Indexes (representative)
- Foreign key indexes على أعمدة العلاقات.
- فهارس البحث حسب `university_id` + الحالة.
- فهارس الجدولة على المرحلة والجلسات.
- فهارس XML على رقم الجامعة والبريد ونوع المستخدم.

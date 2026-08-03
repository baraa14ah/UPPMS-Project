# 5-2-2 Relational Schema — UPPMS

الجداول الرئيسية كما هي في Migrations/Models الخاصة بالمشروع.

## Core Tenancy & Users

### universities
| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK | |
| name | string | |
| code | string | university code |
| timestamps | | |

### roles
| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK | |
| name | string | student, supervisor, admin, super_admin |

### users
| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK | |
| name | string | |
| email | string UNIQUE | |
| password | string | hashed |
| role_id | FK → roles | |
| university_id | FK → universities | nullable for super_admin |
| track_id | FK → tracks | nullable |
| student_number | string | university number |
| status | string | pending / active / rejected / graduated |
| github_token | text | nullable |
| timestamps | | |

### user_profiles
| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK | |
| user_id | FK → users | |
| bio / phone / extra profile fields | | as migrated |

### supervisor_universities (pivot)
| Column | Type | Notes |
|--------|------|-------|
| supervisor_id | FK → users | |
| university_id | FK → universities | |

---

## Projects Collaboration

### projects
| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK | |
| university_id | FK | |
| owner_id | FK → users | |
| supervisor_id | FK → users | nullable |
| proposal_id | FK → project_proposals | unique nullable |
| title | string | |
| description | text | |
| status | string | default pending |
| github_repo_url | string | nullable |
| timestamps | | |

### project_members / project_user (pivots)
| Column | Type | Notes |
|--------|------|-------|
| project_id | FK | |
| user_id | FK | |
| role/status fields | | as migrated |

### project_proposals
| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK | |
| university_id | FK | |
| student_id | FK → users | |
| supervisor_id | FK → users | requested supervisor |
| track_stage_id | FK → track_stages | nullable |
| title | string | |
| description | text | |
| status | enum | pending / approved / rejected |
| resubmission_count | int | |
| timestamps | | |

### tasks
| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK | |
| university_id | FK | |
| project_id | FK | |
| title | string | |
| description | text | |
| status | enum | pending / in_progress / completed |
| estimated_hours | decimal | nullable |
| ai_generated | boolean | |
| assignee fields | | as migrated |
| timestamps | | |

### comments
| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK | |
| project_id | FK | |
| user_id | FK | |
| body | text | |
| timestamps | | |

### project_versions / git_commits / project_activities
جداول داعمة للإصدارات ومزامنة GitHub وسجل النشاط.

### supervisor_invitations / student_invitations
دعوات الانضمام للمشروع (مشرف / طالب) مع حالة القبول/الرفض.

---

## Academic Tracks

### tracks
| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK | |
| university_id | FK | |
| name | string | unique per university |
| is_active | boolean | |
| timestamps | | |

### track_stages
| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK | |
| track_id | FK | |
| parent_id | FK self | hierarchy |
| name | string | |
| sequence_order | int | |
| stage_kind | string | phase / step |
| is_decisive | boolean | |
| academic_stage_id | FK → academic_stages_config | nullable |
| timestamps | | |

### student_progress
| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK | |
| student_id | FK → users | |
| track_id | FK | |
| track_stage_id | FK | |
| status | enum | in_progress / passed / failed / incomplete |
| timestamps | | |

### student_progress_history
سجل تاريخي لتغيّر حالة التقدّم.

---

## Scheduling & Defense

### academic_stages_config
| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK | |
| university_id | FK | |
| name / stage identity | | |
| defense_period_start / end | date | |
| allowed_defense_days | json/array | |
| day hours / availability mode | | as migrated |
| timestamps | | |

### available_rooms
| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK | |
| university_id | FK | |
| name / capacity / premium flags | | as migrated |

### doctor_availabilities
| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK | |
| university_id | FK | |
| doctor_id | FK → users | |
| academic_stage_id | FK | |
| day/time windows | | as migrated |

### approved_schedules
| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK | |
| university_id | FK | |
| academic_stage_id | FK | |
| status | enum | active / voided |
| metadata | json | fitness / generation info |
| timestamps | | |

### defense_sessions
| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK | |
| approved_schedule_id | FK | |
| project_id | FK | |
| room_id | FK | |
| committee_id | FK | nullable |
| track_stage_id | FK | nullable |
| scheduled date/time | | |
| status | enum | scheduled / completed / cancelled |
| timestamps | | |

### committees
| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK | |
| university_id | FK | |
| name | string | unique per university |
| is_active | boolean | |
| version | int | concurrency |
| timestamps | | |

### committee_members (pivot)
| Column | Type | Notes |
|--------|------|-------|
| committee_id | FK | |
| user_id | FK | |
| role | enum | chair / member |

### committee_assignments
| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK | |
| defense_session_id | FK | |
| user_id | FK | |
| role/meta | | as migrated |

---

## XML Import & Notifications

### xml_import_logs
| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK | |
| university_id | FK | |
| status | enum | processing / completed / failed |
| summary fields | | counts / messages |

### xml_authorized_users
| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK | |
| university_id | FK | |
| university_number | string | |
| email | string | |
| name | string | |
| user_type | enum | student / supervisor |
| is_used | boolean | claimed on register |
| registered_user_id | FK → users | nullable |

### archived_xml_authorized_users
أرشيف السجلات المزالة من الاستيراد.

### notifications
| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK | |
| user_id | FK | |
| type | string | |
| data / message | | |
| read_at | timestamp | nullable |

### personal_access_tokens
جدول Sanctum للتوكنات.

### AI support tables
`bookmarked_ideas`, `ideation_requests`, `task_generation_logs` — سجلات مساعدة لميزات الذكاء الاصطناعي.

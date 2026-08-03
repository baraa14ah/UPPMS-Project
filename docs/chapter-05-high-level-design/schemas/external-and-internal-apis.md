# 5-3 External & Internal APIs — UPPMS

## A) External APIs consumed by UPPMS

### 1. Google Gemini — generateContent

| Item | Value |
|------|--------|
| Purpose | AI project ideation + AI task breakdown |
| Method | POST |
| Path | `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent` |
| Auth | `x-goog-api-key: GEMINI_API_KEY` |
| Request | JSON prompt + `responseMimeType: application/json` |
| Success | 200 + structured candidates/tasks JSON |
| Errors | 400 invalid request, 401/403 bad key, 429 rate limit, parse failures handled in services |
| UPPMS wrappers | `AIIdeationService`, `AITaskService` |
| UPPMS routes | `POST /api/ai/suggest-projects`, `POST /api/projects/{project}/generate-tasks` |

### 2. GitHub OAuth (Socialite)

| Item | Value |
|------|--------|
| Purpose | Link GitHub account to UPPMS user |
| Method | GET |
| Paths | `/api/auth/github/redirect`, `/api/auth/github/callback` |
| Scopes | `repo` |
| Success | stores `users.github_token` |
| Errors | access_denied, invalid state, missing code |

### 3. GitHub REST API

| Item | Value |
|------|--------|
| Purpose | commit sync / repository operations / version push |
| Base | `https://api.github.com` |
| Auth | server `GITHUB_TOKEN` and/or user `github_token` |
| Service | `GithubService` |
| Errors | 401 unauthorized, 404 repo not found, 403 forbidden |

---

## B) Internal REST API groups (UPPMS → Frontend)

Base URL: `{APP}/api`  
Auth header: `Authorization: Bearer {sanctum_token}`

### Auth & Profile
| Method | Path | Notes |
|--------|------|-------|
| POST | `/register` | public |
| POST | `/login` | returns token |
| POST | `/logout` | auth |
| GET/PUT | `/profile` | auth |
| GET | `/user` | current user |

### Users & XML
| Method | Path | Notes |
|--------|------|-------|
| GET | `/users` | admin |
| POST | `/users/{id}/approve` | admin |
| POST | `/users/{id}/reject` | admin |
| POST | `/admin/xml-import/preview` | compare XML |
| POST | `/admin/xml-import` | confirm import |

### Projects / Tasks / Comments / Versions
| Method | Path | Notes |
|--------|------|-------|
| CRUD | `/projects`, `/project/{id}` | scoped by university |
| POST/PUT/DELETE | `/task/*` | task management |
| POST/GET | `/comment/*` | comments |
| * | project versions routes | GitHub-linked versions |

### Proposals & Tracks
| Method | Path | Notes |
|--------|------|-------|
| GET/POST | `/proposals` | student/supervisor flows |
| CRUD | `/tracks`, stages | admin track builder |
| GET | `/student-progress` | timeline |
| POST | defense result / complete-stage | progress update |

### Scheduling & Committees
| Method | Path | Notes |
|--------|------|-------|
| GET | `/schedules/readiness` | pre-check |
| POST | `/schedules/generate` | GA (`use_committees` flag) |
| POST | `/schedules/approve` | persist sessions |
| POST | `/schedules/{id}/void` | cancel schedule |
| GET | `/schedules/my-sessions` | personal schedule |
| CRUD | `/committees` | committee management |
| POST | `/defense-sessions/{id}/assign-committee` | override committee |

### AI & Platform
| Method | Path | Notes |
|--------|------|-------|
| POST | `/ai/suggest-projects` | throttled |
| POST | `/projects/{project}/generate-tasks` | throttled |
| * | `/admin/universities`, `/admin/users`, `/admin/projects` | super_admin |

### Common response / error codes
| Code | Meaning |
|------|---------|
| 200 / 201 | success |
| 401 | unauthenticated |
| 403 | forbidden / pending / rejected / wrong role |
| 404 | not found / out of tenant scope |
| 422 | validation error |
| 429 | throttle (AI / password help) |

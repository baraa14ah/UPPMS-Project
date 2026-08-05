# Backend domains (Controllers + Services)

Laravel classes are grouped by feature domain. Namespaces match folders (PSR-4).

| Domain | Controllers | Services |
|--------|-------------|----------|
| `Auth` | Auth, PasswordResetHelp, GitHubAuth | Auth, PasswordResetHelp, Github |
| `Profile` | Profile, DoctorAvailability | — |
| `Projects` | Project, Task, Comment, ProjectVersion, AIIdeation, AITask | Project, Task, Comment, ProjectVersion, AIIdeation, AITask, Student |
| `Invitations` | SupervisorInvitation, StudentInvitation | Invitation |
| `Users` | User, XmlImport | UserDeletion, XmlImport |
| `Platform` | PlatformAdmin, University | — |
| `Dashboard` | Dashboard | — |
| `Scheduling` | Schedule, AcademicStage, AvailableRoom | GeneticScheduler, ScheduleApproval, StageAvailability, UniversitySchedulingBootstrap, DoctorAvailability |
| `Proposals` | ProjectProposal | ProjectProposal |
| `Committees` | Committee | Committee |
| `Tracks` | Track | Track |
| `Notifications` | Notification | Notification |

Root leftovers: `Http/Controllers/Controller.php`, `Services/BaseService.php`.
GA engine remains under `app/Scheduling/`.

# Frontend domains (`src/pages` + `src/components`)

Related screens and UI live in matching domain folders.

| Domain | Pages | Components |
|--------|-------|------------|
| `auth` | Landing, Login, Register, ForgotPassword, PendingApproval, AccountBlocked | AuthPageShell, authStyles |
| `dashboard` | Dashboard | — |
| `projects` | Projects, ProjectDetails (+ tabs), ProjectIdeation | CreateProjectDialog, GitHubLinkCard, IdeaSuggestionCard, ProjectPhaseProgress, ProjectSectionShell, ProjectSummaryCards |
| `proposals` | ProposalSubmission, SupervisorProposalReview | ProposalCard, ProposalStatusBadge (+ existing proposal helpers) |
| `invitations` | StudentInvitations, SupervisorInvitations | — |
| `scheduling` | SchedulingDashboard, MySchedule | ScheduleCandidateCard + scheduling panels |
| `committees` | CommitteeManagement | CommitteeCard, CommitteeFormDialog, CommitteeMembersList |
| `tracks` | TrackBuilder, StudentProgressTimeline | ProgressTimelineChart, TrackStageCard + track builders |
| `users` | Users, XmlImportDashboard | XmlImportPanel, XmlUploadDropzone |
| `platform` | PlatformDashboard, PlatformUsers, PlatformProjects, Universities | — |
| `profile` | Profile + availability panels | — |
| `notifications` | Notifications | NotificationBellMenu |
| `shared` | — | BrandLogo, PageHeader, ConfirmDialog, ListToolbar, … |
| `loading` / `defense` | — | Shared skeletons and defense guide |

Routes are wired in `src/App.jsx` using these paths.

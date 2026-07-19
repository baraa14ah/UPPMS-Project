import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import FolderRoundedIcon from "@mui/icons-material/FolderRounded";
import NotificationsRoundedIcon from "@mui/icons-material/NotificationsRounded";
import SupervisorAccountRoundedIcon from "@mui/icons-material/SupervisorAccountRounded";
import PersonAddAltRoundedIcon from "@mui/icons-material/PersonAddAltRounded";
import GroupRoundedIcon from "@mui/icons-material/GroupRounded";
import SchoolRoundedIcon from "@mui/icons-material/SchoolRounded";
import AccountCircleRoundedIcon from "@mui/icons-material/AccountCircleRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import EventNoteRoundedIcon from "@mui/icons-material/EventNoteRounded";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import RateReviewRoundedIcon from "@mui/icons-material/RateReviewRounded";
import TimelineRoundedIcon from "@mui/icons-material/TimelineRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";

/** Sidebar section keys for grouped navigation (admin / supervisor / super_admin). */
export const NAV_SECTION_ORDER = [
  "main",
  "academic",
  "data",
  "people",
  "account",
];

export const NAV_SECTION_LABELS = {
  main: "nav.sectionMain",
  academic: "nav.sectionAcademic",
  data: "nav.sectionData",
  people: "nav.sectionPeople",
  account: "nav.sectionAccount",
};

/** Sidebar items visible per role (student, supervisor, admin, super_admin). */
export const NAV_ITEMS = [
  {
    id: "home",
    labelKey: "nav.home",
    to: "/dashboard",
    icon: HomeRoundedIcon,
    roles: ["student", "supervisor", "admin", "super_admin"],
    section: "main",
    end: true,
  },
  {
    id: "projects",
    labelKey: "nav.projects",
    labelKeySuper: "nav.allProjects",
    to: "/dashboard/projects",
    icon: FolderRoundedIcon,
    roles: ["student", "supervisor", "admin", "super_admin"],
    section: "main",
  },
  {
    id: "notifications",
    labelKey: "nav.notifications",
    to: "/dashboard/notifications",
    icon: NotificationsRoundedIcon,
    roles: ["student", "supervisor", "admin", "super_admin"],
    section: "main",
    badgeKey: "unread",
  },
  {
    id: "supervisor_invitations",
    labelKey: "nav.supervisorInvitations",
    to: "/dashboard/supervisor/invitations",
    icon: SupervisorAccountRoundedIcon,
    roles: ["supervisor"],
    section: "main",
    badgeKey: "supervisorInv",
  },
  {
    id: "student_invitations",
    labelKey: "nav.studentInvitations",
    to: "/dashboard/student/invitations",
    icon: PersonAddAltRoundedIcon,
    roles: ["student"],
    section: "main",
    badgeKey: "studentInv",
  },
  {
    id: "proposals",
    labelKey: "nav.proposals",
    to: "/dashboard/proposals",
    icon: DescriptionRoundedIcon,
    roles: ["student"],
    section: "main",
  },
  {
    id: "proposal_review",
    labelKey: "nav.proposalReview",
    to: "/dashboard/proposal-review",
    icon: RateReviewRoundedIcon,
    roles: ["supervisor", "admin"],
    section: "academic",
  },
  {
    id: "ideation",
    labelKey: "nav.ideation",
    to: "/dashboard/ideation",
    icon: AutoAwesomeRoundedIcon,
    roles: ["student"],
    section: "main",
  },
  {
    id: "committees",
    labelKey: "nav.committees",
    to: "/dashboard/committees",
    icon: GroupsRoundedIcon,
    roles: ["admin"],
    section: "academic",
  },
  {
    id: "scheduling",
    labelKey: "nav.scheduling",
    to: "/dashboard/scheduling",
    icon: CalendarMonthRoundedIcon,
    roles: ["admin"],
    section: "academic",
  },
  {
    id: "tracks",
    labelKey: "nav.tracks",
    to: "/dashboard/tracks",
    icon: TimelineRoundedIcon,
    roles: ["admin"],
    section: "academic",
  },
  {
    id: "my_progress",
    labelKey: "nav.myProgress",
    to: "/dashboard/my-progress",
    icon: TrendingUpRoundedIcon,
    roles: ["student"],
    section: "main",
  },
  {
    id: "my_schedule",
    labelKey: "nav.mySchedule",
    to: "/dashboard/my-schedule",
    icon: EventNoteRoundedIcon,
    roles: ["supervisor", "admin"],
    section: "academic",
  },
  {
    id: "users",
    labelKey: "nav.usersManagement",
    labelKeySuper: "nav.users",
    to: "/dashboard/users",
    icon: GroupRoundedIcon,
    roles: ["admin", "super_admin"],
    section: "people",
    badgeKey: "usersAlerts",
  },
  {
    id: "universities",
    labelKey: "nav.universities",
    to: "/dashboard/universities",
    icon: SchoolRoundedIcon,
    roles: ["super_admin"],
    section: "people",
  },
  {
    id: "profile",
    labelKey: "nav.profile",
    to: "/dashboard/profile",
    icon: AccountCircleRoundedIcon,
    roles: ["student", "supervisor", "admin", "super_admin"],
    section: "account",
    order: 99,
  },
];

const DEFAULT_ORDER = {
  home: 0,
  projects: 1,
  notifications: 2,
  proposals: 10,
  ideation: 11,
  my_progress: 12,
  supervisor_invitations: 20,
  student_invitations: 20,
  proposal_review: 10,
  tracks: 15,
  committees: 24,
  scheduling: 25,
  my_schedule: 32,
  xml_import: 40,
  users: 50,
  universities: 51,
  profile: 99,
};

/** Returns sorted sidebar items allowed for the given role. */
export function getNavForRole(roleName) {
  const role = String(roleName || "").toLowerCase();
  return NAV_ITEMS.filter((item) => item.roles.includes(role)).sort(
    (a, b) =>
      (a.order ?? DEFAULT_ORDER[a.id] ?? 50) -
      (b.order ?? DEFAULT_ORDER[b.id] ?? 50),
  );
}

/** Groups nav items into labeled sections when a role spans multiple categories. */
export function groupNavBySection(items) {
  const groups = {};
  for (const item of items) {
    const section = item.section || "main";
    if (!groups[section]) groups[section] = [];
    groups[section].push(item);
  }
  return NAV_SECTION_ORDER.filter((key) => groups[key]?.length).map((key) => ({
    sectionKey: key,
    labelKey: NAV_SECTION_LABELS[key],
    items: groups[key],
  }));
}

/** True when the role has items in more than one sidebar section. */
export function shouldGroupNavBySection(items) {
  const sections = new Set(items.map((item) => item.section || "main"));
  return sections.size > 1;
}

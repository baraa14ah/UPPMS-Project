import AssignmentRoundedIcon from "@mui/icons-material/AssignmentRounded";
import ChatBubbleOutlineRoundedIcon from "@mui/icons-material/ChatBubbleOutlineRounded";
import FolderRoundedIcon from "@mui/icons-material/FolderRounded";
import GroupRoundedIcon from "@mui/icons-material/GroupRounded";
import LockResetRoundedIcon from "@mui/icons-material/LockResetRounded";
import NotificationsRoundedIcon from "@mui/icons-material/NotificationsRounded";
import PersonAddAltRoundedIcon from "@mui/icons-material/PersonAddAltRounded";
import SystemUpdateAltRoundedIcon from "@mui/icons-material/SystemUpdateAltRounded";

const STATUS_KEYS = {
  pending: "activities.statusPending",
  in_progress: "activities.statusInProgress",
  completed: "activities.statusCompleted",
};

/** Extracts the notification payload object from an API record. */
function getPayload(n) {
  return n?.data && typeof n.data === "object" && !Array.isArray(n.data) ? n.data : {};
}

/** Reads nested `data` fields inside a notification payload. */
function getExtra(payload) {
  return payload?.data && typeof payload.data === "object" ? payload.data : {};
}

const AR_STATUS_TO_CODE = {
  "قيد الانتظار": "pending",
  "قيد التنفيذ": "in_progress",
  مكتملة: "completed",
  مكتمل: "completed",
};

/** Localizes a task status code or legacy Arabic label. */
function statusLabel(status, t) {
  if (!status) return "";
  const raw = String(status).trim();
  const code = STATUS_KEYS[raw.toLowerCase()]
    ? raw.toLowerCase()
    : AR_STATUS_TO_CODE[raw];
  const key = code ? STATUS_KEYS[code] : null;
  return key ? t(key) : raw;
}

/** Parses parameters from older Arabic free-text notification bodies. */
function parseLegacyNotificationParams(body, type) {
  if (!body) return {};
  const text = String(body).trim();
  const normalized = String(type || "").toLowerCase();

  const patterns = [
    {
      types: ["task.created"],
      re: /^(.+?) أضاف مهمة جديدة:\s*(.+)$/,
      map: (m) => ({ actor_name: m[1], task_title: m[2] }),
    },
    {
      types: ["task.status_changed"],
      re: /^(.+?) غيّر حالة المهمة '(.+?)' إلى (.+)$/,
      map: (m) => ({
        actor_name: m[1],
        task_title: m[2],
        new_status: m[3],
      }),
    },
    {
      types: ["comment.project"],
      re: /^(.+?) أضاف تعليقاً على مشروع (.+)$/,
      map: (m) => ({ actor_name: m[1], project_title: m[2] }),
    },
    {
      types: ["comment_added", "comment.task"],
      re: /^(.+?) أضاف تعليقًا على المهمة:\s*(.+)$/,
      map: (m) => ({ actor_name: m[1], task_title: m[2] }),
    },
    {
      types: ["version_uploaded"],
      re: /^قام (.+?) برفع إصدار (.+?) داخل مشروع (.+)$/,
      map: (m) => ({
        actor_name: m[1],
        version_title: m[2],
        project_title: m[3],
      }),
    },
    {
      types: ["password.reset_request"],
      re: /^طلب المستخدم «(.+?)» \((.+?)\) مساعدة/,
      map: (m) => ({ user_name: m[1], email: m[2] }),
    },
    {
      types: ["user.registration_pending"],
      re: /^طلب «(.+?)» \((.+?)\) التسجيل/,
      map: (m) => ({ user_name: m[1], email: m[2] }),
    },
    {
      types: ["proposal_submitted"],
      re: [
        /^New project proposal from (.+?): (.+)$/i,
        /^Proposal resubmitted by (.+?): (.+)$/i,
      ],
      map: (m) => ({ student_name: m[1], title: m[2] }),
    },
    {
      types: ["proposal_approved"],
      re: /^Your proposal '(.+?)' has been approved!?$/i,
      map: (m) => ({ title: m[1] }),
    },
    {
      types: ["proposal_rejected"],
      re: /^Your proposal '(.+?)' requires changes/i,
      map: (m) => ({ title: m[1] }),
    },
    {
      types: ["proposal_reassigned"],
      re: [
        /^Your proposal '(.+?)' has been reassigned to (.+)$/i,
        /^Proposal "(.+?)" has been assigned to you for review$/i,
      ],
      map: (m, idx) =>
        idx === 0
          ? { title: m[1], new_supervisor_name: m[2], for_supervisor: false }
          : { title: m[1], for_supervisor: true },
    },
    {
      types: ["committee_member_added"],
      re: /^You have been added to committee "(.+?)" as (.+)\.?$/i,
      map: (m) => ({ committee_name: m[1], role: m[2] }),
    },
    {
      types: ["committee_member_removed"],
      re: /^You have been removed from committee "(.+?)"\.?$/i,
      map: (m) => ({ committee_name: m[1] }),
    },
    {
      types: ["committee_role_changed"],
      re: /^Your role in committee "(.+?)" has been updated to (.+)\.?$/i,
      map: (m) => ({ committee_name: m[1], role: m[2] }),
    },
    {
      types: ["prerequisite_override"],
      re: /^An administrator unlocked (.+?) for you: (.+)$/i,
      map: (m) => ({ stage_name: m[1], reason: m[2] }),
    },
  ];

  for (const { types, re, map } of patterns) {
    if (!types.includes(normalized)) continue;
    const list = Array.isArray(re) ? re : [re];
    for (let i = 0; i < list.length; i += 1) {
      const match = text.match(list[i]);
      if (match) return map(match, i);
    }
  }
  return {};
}

/** Localizes a defense / progress result code. */
function defenseResultLabel(result, t) {
  const code = String(result || "").toLowerCase();
  if (code === "passed") return t("notificationMessages.track.resultPassed");
  if (code === "failed") return t("notificationMessages.track.resultFailed");
  if (code === "incomplete") return t("notificationMessages.track.resultIncomplete");
  return result || "";
}

/** Localizes a committee role code. */
function committeeRoleLabel(role, t) {
  const code = String(role || "").toLowerCase();
  if (code === "chair") return t("committees.chair");
  if (code === "member") return t("committees.member");
  return role || "";
}

/** Builds localized title/body for a known notification type. */
function translateByType(type, payload, extra, t) {
  const actor = extra.actor_name || payload.actor_name || "";
  const task = extra.task_title || payload.task_title || "";
  const project = extra.project_title || payload.project_title || "";
  const version = extra.version_title || payload.version_title || "";
  const userName = extra.user_name || payload.user_name || actor;
  const email = extra.email || payload.email || "";
  const newStatus = statusLabel(extra.new_status || payload.new_status, t);

  const normalized = String(type || "").toLowerCase();

  if (normalized === "task.created") {
    return {
      title: t("notificationMessages.task.created.title"),
      body: t("notificationMessages.task.created.body", { actor, task }),
    };
  }
  if (normalized === "task.status_changed") {
    return {
      title: t("notificationMessages.task.statusChanged.title"),
      body: t("notificationMessages.task.statusChanged.body", {
        actor,
        task,
        status: newStatus,
      }),
    };
  }
  if (normalized === "comment.project") {
    return {
      title: t("notificationMessages.comment.project.title"),
      body: t("notificationMessages.comment.project.body", { actor, project }),
    };
  }
  if (normalized === "comment_added" || normalized === "comment.task") {
    return {
      title: t("notificationMessages.comment.task.title"),
      body: t("notificationMessages.comment.task.body", { actor, task }),
    };
  }
  if (normalized === "version_uploaded" || normalized.includes("version")) {
    return {
      title: t("notificationMessages.version.uploaded.title"),
      body: t("notificationMessages.version.uploaded.body", {
        actor,
        version,
        project,
      }),
    };
  }
  if (normalized === "password.reset_request") {
    return {
      title: t("notificationMessages.password.resetRequest.title"),
      body: t("notificationMessages.password.resetRequest.body", {
        user: userName,
        email,
      }),
    };
  }
  if (normalized === "user.registration_pending") {
    const role = extra.role || payload.role || "";
    const roleLabel =
      role === "supervisor"
        ? t("users.roleSupervisor")
        : role === "student"
          ? t("users.roleStudent")
          : role;
    return {
      title: t("notificationMessages.user.registrationPending.title"),
      body: t("notificationMessages.user.registrationPending.body", {
        user: userName,
        email,
        role: roleLabel,
      }),
    };
  }
  if (normalized === "password.reset_by_admin") {
    return {
      title: t("notificationMessages.password.resetByAdmin.title"),
      body: t("notificationMessages.password.resetByAdmin.body"),
    };
  }
  if (normalized === "supervisor.membership_approved") {
    const university =
      extra.university_name || payload.university_name || "";
    return {
      title: t("notificationMessages.supervisor.approved.title"),
      body: t("notificationMessages.supervisor.approved.body", { university }),
    };
  }
  if (normalized === "supervisor.membership_rejected") {
    const university =
      extra.university_name || payload.university_name || "";
    return {
      title: t("notificationMessages.supervisor.rejected.title"),
      body: t("notificationMessages.supervisor.rejected.body", { university }),
    };
  }
  if (normalized === "account.approved") {
    return {
      title: t("notificationMessages.account.approved.title"),
      body: t("notificationMessages.account.approved.body"),
    };
  }
  if (normalized === "proposal_submitted") {
    return {
      title: t("notificationMessages.proposal.submitted.title"),
      body: t("notificationMessages.proposal.submitted.body", {
        student: extra.student_name || payload.student_name || "",
        title: extra.title || payload.title || "",
      }),
    };
  }
  if (normalized === "proposal_approved") {
    return {
      title: t("notificationMessages.proposal.approved.title"),
      body: t("notificationMessages.proposal.approved.body", {
        title: extra.title || payload.title || "",
      }),
    };
  }
  if (normalized === "proposal_rejected") {
    return {
      title: t("notificationMessages.proposal.rejected.title"),
      body: t("notificationMessages.proposal.rejected.body", {
        title: extra.title || payload.title || "",
      }),
    };
  }
  if (normalized === "proposal_reassigned") {
    const forSupervisor =
      Boolean(extra.for_supervisor || payload.for_supervisor) ||
      /assigned to you/i.test(String(payload?.title || ""));
    if (forSupervisor) {
      return {
        title: t("notificationMessages.proposal.assignedToYou.title"),
        body: t("notificationMessages.proposal.assignedToYou.body", {
          title: extra.title || payload.title || "",
        }),
      };
    }
    return {
      title: t("notificationMessages.proposal.reassigned.title"),
      body: t("notificationMessages.proposal.reassigned.body", {
        title: extra.title || payload.title || "",
        supervisor:
          extra.new_supervisor_name ||
          payload.new_supervisor_name ||
          extra.supervisor_name ||
          payload.supervisor_name ||
          "",
      }),
    };
  }
  if (normalized === "committee_member_added") {
    return {
      title: t("notificationMessages.committee.memberAdded.title"),
      body: t("notificationMessages.committee.memberAdded.body", {
        committee: extra.committee_name || payload.committee_name || "",
        role: committeeRoleLabel(extra.role || payload.role, t),
      }),
    };
  }
  if (normalized === "committee_member_removed") {
    return {
      title: t("notificationMessages.committee.memberRemoved.title"),
      body: t("notificationMessages.committee.memberRemoved.body", {
        committee: extra.committee_name || payload.committee_name || "",
      }),
    };
  }
  if (normalized === "committee_role_changed") {
    return {
      title: t("notificationMessages.committee.roleChanged.title"),
      body: t("notificationMessages.committee.roleChanged.body", {
        committee: extra.committee_name || payload.committee_name || "",
        role: committeeRoleLabel(extra.role || payload.role, t),
      }),
    };
  }
  if (normalized === "prerequisite_override") {
    return {
      title: t("notificationMessages.track.prerequisiteOverride.title"),
      body: t("notificationMessages.track.prerequisiteOverride.body", {
        stage: extra.stage_name || payload.stage_name || "",
        reason: extra.reason || payload.reason || "",
      }),
    };
  }
  if (normalized === "track_completed") {
    return {
      title: t("notificationMessages.track.completed.title"),
      body: t("notificationMessages.track.completed.body", {
        stage: extra.stage_name || payload.stage_name || "",
      }),
    };
  }
  if (normalized === "phase_completed") {
    return {
      title: t("notificationMessages.track.phaseCompleted.title"),
      body: t("notificationMessages.track.phaseCompleted.body", {
        phase: extra.phase_name || payload.phase_name || "",
        next: extra.next_stage_name || payload.next_stage_name || "",
      }),
    };
  }
  if (normalized === "defense_result_recorded") {
    const nextName = extra.next_stage_name || payload.next_stage_name || "";
    const next = nextName
      ? t("notificationMessages.track.defenseResult.next", { next: nextName })
      : "";
    return {
      title: t("notificationMessages.track.defenseResult.title"),
      body: t("notificationMessages.track.defenseResult.body", {
        stage: extra.stage_name || payload.stage_name || "",
        result: defenseResultLabel(extra.result || payload.result, t),
        next,
      }),
    };
  }
  if (normalized === "defense_stage_completed") {
    return {
      title: t("notificationMessages.track.stageCompleted.title"),
      body: t("notificationMessages.track.stageCompleted.body", {
        stage: extra.stage_name || payload.stage_name || "",
      }),
    };
  }

  return null;
}

const ALWAYS_TRANSLATE_TYPES = new Set([
  "password.reset_request",
  "password.reset_by_admin",
  "user.registration_pending",
  "supervisor.membership_approved",
  "supervisor.membership_rejected",
  "account.approved",
  "proposal_submitted",
  "proposal_approved",
  "proposal_rejected",
  "proposal_reassigned",
  "committee_member_added",
  "committee_member_removed",
  "committee_role_changed",
  "prerequisite_override",
  "track_completed",
  "phase_completed",
  "defense_result_recorded",
  "defense_stage_completed",
]);

/** Normalizes a notification record into `{ type, title, body, payload }`. */
export function parseNotification(n, t) {
  const payload = getPayload(n);
  const extra = getExtra(payload);
  const type = String(
    payload?.type ||
      payload?.notification_type ||
      payload?.event ||
      payload?.event_type ||
      "",
  );

  const legacyBody = payload?.body ?? n?.body ?? payload?.message ?? "";
  const legacyParams = parseLegacyNotificationParams(legacyBody, type);
  const mergedExtra = { ...extra, ...legacyParams };
  const mergedPayload = { ...payload, ...legacyParams };

  const translated = t ? translateByType(type, mergedPayload, mergedExtra, t) : null;
  const normalized = type.toLowerCase();
  const canTranslate =
    translated &&
    (ALWAYS_TRANSLATE_TYPES.has(normalized) ||
      Boolean(
        mergedExtra.actor_name ||
          mergedExtra.task_title ||
          mergedExtra.project_title ||
          mergedExtra.version_title ||
          mergedExtra.user_name ||
          mergedExtra.email,
      ));

  const title = canTranslate
    ? translated.title
    : payload?.title ?? n?.title ?? (t ? t("notifications.fallbackTitle") : "Notification");
  const body = canTranslate ? translated.body : legacyBody;

  return { type, title, body, payload };
}

/** Resolves the dashboard deep-link URL for a notification. */
export function resolveNotificationUrl(n) {
  const { type: rawType, payload } = parseNotification(n);
  const type = String(rawType || "");
  const extra = payload?.data || {};
  let directUrl = extra?.url || payload?.url || null;

  // Legacy track links used a non-existent route.
  if (typeof directUrl === "string" && directUrl === "/dashboard/progress") {
    directUrl = "/dashboard/my-progress";
  }
  if (directUrl) return directUrl;

  const projectId = extra?.project_id ?? payload?.project_id;
  const taskId = extra?.task_id ?? payload?.task_id;
  const commentId = extra?.comment_id ?? payload?.comment_id;

  if (type === "user.registration_pending") {
    return "/dashboard/users?tab=pending";
  }

  if (type === "password.reset_request") {
    return "/dashboard/users?tab=password_requests";
  }

  if (type === "password.reset_by_admin") {
    return "/dashboard/profile";
  }

  if (
    type === "supervisor.membership_approved" ||
    type === "supervisor.membership_rejected" ||
    type === "account.approved"
  ) {
    return type === "account.approved" ? "/dashboard" : "/dashboard/profile";
  }

  if (
    type === "prerequisite_override" ||
    type === "track_completed" ||
    type === "phase_completed" ||
    type === "defense_result_recorded" ||
    type === "defense_stage_completed"
  ) {
    return "/dashboard/my-progress";
  }

  if (type === "committee_assignment") {
    return "/dashboard/my-schedule";
  }

  if (type === "defense_scheduled") {
    return projectId ? `/dashboard/projects/${projectId}` : "/dashboard/my-schedule";
  }

  if (type === "availability_collection_open") {
    return "/dashboard/profile";
  }

  if (type === "comment.project" && projectId) {
    return commentId
      ? `/dashboard/projects/${projectId}?tab=comments&comment_id=${commentId}`
      : `/dashboard/projects/${projectId}?tab=comments`;
  }

  if (type === "comment.task" || type === "comment_added") {
    if (projectId) {
      return `/dashboard/projects/${projectId}?tab=tasks${taskId ? `&task_id=${taskId}` : ""}${commentId ? `&comment_id=${commentId}` : ""}`;
    }
  }

  if ((type.startsWith("task.") || type === "task.ai_generated") && projectId) {
    return `/dashboard/projects/${projectId}?tab=tasks${taskId ? `&task_id=${taskId}` : ""}`;
  }

  if (type.includes("version") && projectId) {
    return `/dashboard/projects/${projectId}?tab=versions`;
  }

  if (type.includes("invit") && type.includes("supervisor")) {
    return "/dashboard/supervisor/invitations";
  }

  if (type.includes("invit") && type.includes("student")) {
    return "/dashboard/student/invitations";
  }

  if (type === "proposal_submitted") {
    return "/dashboard/proposal-review";
  }

  if (type === "proposal_reassigned") {
    const forSupervisor =
      Boolean(extra.for_supervisor || payload.for_supervisor) ||
      /assigned to you/i.test(String(payload?.title || ""));
    return forSupervisor ? "/dashboard/proposal-review" : "/dashboard/proposals";
  }

  if (type === "proposal_approved") {
    return projectId ? `/dashboard/projects/${projectId}` : "/dashboard/proposals";
  }

  if (type === "proposal_rejected") {
    return "/dashboard/proposals";
  }

  if (
    type === "committee_member_added" ||
    type === "committee_member_removed" ||
    type === "committee_role_changed"
  ) {
    return "/dashboard/committees";
  }

  if (projectId) return `/dashboard/projects/${projectId}`;
  return "/dashboard/notifications";
}

/** Returns icon, color, and label metadata for a notification type. */
export function getNotificationMeta(type = "", t) {
  const normalized = String(type).toLowerCase();

  if (normalized.includes("password")) {
    return {
      icon: LockResetRoundedIcon,
      color: "#D97706",
      bg: "rgba(217,119,6,0.12)",
      label: t("notificationLabels.password"),
    };
  }
  if (normalized.includes("comment")) {
    return {
      icon: ChatBubbleOutlineRoundedIcon,
      color: "#2563EB",
      bg: "rgba(37,99,235,0.12)",
      label: t("notificationLabels.comment"),
    };
  }
  if (normalized.startsWith("task.")) {
    return {
      icon: AssignmentRoundedIcon,
      color: "#7C3AED",
      bg: "rgba(124,58,237,0.12)",
      label: t("notificationLabels.task"),
    };
  }
  if (normalized.includes("version")) {
    return {
      icon: SystemUpdateAltRoundedIcon,
      color: "#0891B2",
      bg: "rgba(8,145,178,0.12)",
      label: t("notificationLabels.version"),
    };
  }
  if (normalized.includes("invit")) {
    return {
      icon: PersonAddAltRoundedIcon,
      color: "#059669",
      bg: "rgba(5,150,105,0.12)",
      label: t("notificationLabels.invite"),
    };
  }
  if (normalized.includes("project")) {
    return {
      icon: FolderRoundedIcon,
      color: "#4F46E5",
      bg: "rgba(79,70,229,0.12)",
      label: t("notificationLabels.project"),
    };
  }
  if (normalized.startsWith("proposal_")) {
    return {
      icon: FolderRoundedIcon,
      color: "#4F46E5",
      bg: "rgba(79,70,229,0.12)",
      label: t("notificationLabels.proposal"),
    };
  }
  if (
    normalized === "committee_member_added" ||
    normalized === "committee_member_removed" ||
    normalized === "committee_role_changed"
  ) {
    return {
      icon: GroupRoundedIcon,
      color: "#7C3AED",
      bg: "rgba(124,58,237,0.12)",
      label: t("notificationLabels.committee"),
    };
  }
  if (
    normalized === "prerequisite_override" ||
    normalized === "track_completed" ||
    normalized === "phase_completed" ||
    normalized === "defense_result_recorded" ||
    normalized === "defense_stage_completed"
  ) {
    return {
      icon: AssignmentRoundedIcon,
      color: "#0F766E",
      bg: "rgba(15,118,110,0.12)",
      label: t("notificationLabels.track"),
    };
  }
  if (
    normalized.includes("supervisor.membership") ||
    normalized.includes("account.approved")
  ) {
    return {
      icon: GroupRoundedIcon,
      color: "#059669",
      bg: "rgba(5,150,105,0.12)",
      label: t("notificationLabels.membership"),
    };
  }
  if (normalized.includes("user") || normalized.includes("member")) {
    return {
      icon: GroupRoundedIcon,
      color: "#DC2626",
      bg: "rgba(220,38,38,0.12)",
      label: t("notificationLabels.user"),
    };
  }

  return {
    icon: NotificationsRoundedIcon,
    color: "#111827",
    bg: "rgba(17,24,39,0.08)",
    label: t("notificationLabels.system"),
  };
}

/** Formats a notification timestamp as relative or absolute localized text. */
export function formatNotificationTime(dateStr, t, lang = "ar") {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  const locale = lang === "ar" ? "ar-EG" : "en-US";

  if (diffMin < 1) return t("notificationTime.now");
  if (diffMin < 60) return t("notificationTime.minutesAgo", { count: diffMin });
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return t("notificationTime.hoursAgo", { count: diffH });
  return date.toLocaleString(locale, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

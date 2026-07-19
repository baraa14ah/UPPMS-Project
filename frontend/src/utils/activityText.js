const STATUS_KEYS = {
  pending: "activities.statusPending",
  in_progress: "activities.statusInProgress",
  completed: "activities.statusCompleted",
};

const AR_STATUS_TO_CODE = {
  "قيد الانتظار": "pending",
  "قيد التنفيذ": "in_progress",
  مكتملة: "completed",
  مكتمل: "completed",
};

/** Localizes a task status code or legacy Arabic status label. */
function normalizeStatus(status, t) {
  if (!status) return "";
  const code = STATUS_KEYS[String(status).toLowerCase()]
    ? String(status).toLowerCase()
    : AR_STATUS_TO_CODE[String(status).trim()];
  if (code && STATUS_KEYS[code]) return t(STATUS_KEYS[code]);
  return String(status);
}

/** Resolves a project activity log entry to localized display text. */
export function resolveActivityText(activity, t) {
  const key = activity?.action_key;
  const meta = activity?.meta || {};

  if (key) {
    const status = normalizeStatus(meta.status, t);
    return t(`activities.${key}`, { ...meta, status });
  }

  const raw = String(activity?.action || "");
  if (!raw) return "";

  const patterns = [
    {
      re: /^أضاف مهمة جديدة:\s*(.+)$/,
      key: "taskCreated",
      pick: (m) => ({ title: m[1] }),
    },
    {
      re: /^غيّر حالة المهمة '(.+)' إلى (.+)$/,
      key: "taskStatusChanged",
      pick: (m) => ({
        title: m[1],
        status: normalizeStatus(m[2], t),
      }),
    },
    {
      re: /^حذف المهمة:\s*(.+)$/,
      key: "taskDeleted",
      pick: (m) => ({ title: m[1] }),
    },
    {
      re: /^رفع إصداراً جديداً:\s*(.+)$/,
      key: "versionUploaded",
      pick: (m) => ({ title: m[1] }),
    },
    {
      re: /^حذف الإصدار:\s*(.+)$/,
      key: "versionDeleted",
      pick: (m) => ({ title: m[1] }),
    },
    {
      re: /^انضم إلى المشروع كعضو فريق$/,
      key: "memberJoined",
      pick: () => ({}),
    },
    {
      re: /^غادر المشروع كعضو فريق$/,
      key: "memberLeft",
      pick: () => ({}),
    },
    {
      re: /^غادر المشروع وانتقلت الملكية إلى (.+)$/,
      key: "ownerLeftTransferred",
      pick: (m) => ({ name: m[1] }),
    },
    {
      re: /^انضم إلى المشروع كمشرف$/,
      key: "supervisorJoined",
      pick: () => ({}),
    },
    {
      re: /^قام بمزامنة الكود وجلب (\d+) تحديثات من مستودع GitHub$/,
      key: "githubSynced",
      pick: (m) => ({ count: m[1] }),
    },
    {
      re: /^دفع الإصدار '(.+)' مباشرة إلى مستودع GitHub$/,
      key: "githubPushed",
      pick: (m) => ({ title: m[1] }),
    },
    {
      re: /^قام بتوليد (\d+) مهمة للمشروع بالذكاء الاصطناعي$/,
      key: "tasksAiGenerated",
      pick: (m) => ({ count: m[1] }),
    },
    {
      re: /^قام بإعادة توليد (\d+) مهمة للمشروع بالذكاء الاصطناعي$/,
      key: "tasksAiRegenerated",
      pick: (m) => ({ count: m[1] }),
    },
    {
      re: /^ولّد (\d+) مهام بالذكاء الاصطناعي$/,
      key: "tasksAiGenerated",
      pick: (m) => ({ count: m[1] }),
    },
  ];

  for (const { re, key, pick } of patterns) {
    const match = raw.match(re);
    if (match) {
      return t(`activities.${key}`, pick(match));
    }
  }

  return raw;
}

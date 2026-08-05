import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Typography,
  Paper,
  Avatar,
  Stack,
  CircularProgress,
  Alert,
  Chip,
  alpha,
} from "@mui/material";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import RocketLaunchRoundedIcon from "@mui/icons-material/RocketLaunchRounded";
import PersonAddAltRoundedIcon from "@mui/icons-material/PersonAddAltRounded";
import AddTaskRoundedIcon from "@mui/icons-material/AddTaskRounded";
import PlayCircleRoundedIcon from "@mui/icons-material/PlayCircleRounded";
import TaskAltRoundedIcon from "@mui/icons-material/TaskAltRounded";
import { useAuth } from "../../../context/AuthContext";
import { useLanguage } from "../../../context/LanguageContext";
import { resolveActivityText } from "../../../utils/activityText";
import ProjectSectionShell from "../../../components/projects/ProjectSectionShell";

const TASK_KEYS = new Set([
  "taskCreated",
  "taskStatusChanged",
  "taskDeleted",
  "tasksAiGenerated",
  "tasksAiRegenerated",
]);
const VERSION_KEYS = new Set([
  "versionUploaded",
  "versionDeleted",
  "githubSynced",
  "githubPushed",
]);
const TEAM_KEYS = new Set([
  "memberJoined",
  "memberLeft",
  "ownerLeftTransferred",
  "supervisorJoined",
]);

/** Classifies an activity into tasks, versions, team, or other. */
function getActivityCategory(activity) {
  const key = activity?.action_key;
  if (key && TASK_KEYS.has(key)) return "tasks";
  if (key && VERSION_KEYS.has(key)) return "versions";
  if (key && TEAM_KEYS.has(key)) return "team";
  const raw = String(activity?.action || "");
  if (/مهمة|task/i.test(raw)) return "tasks";
  if (/إصدار|version|github/i.test(raw)) return "versions";
  if (/انضم|join|مشرف|supervisor/i.test(raw)) return "team";
  return "other";
}

/** Returns icon and color config for an activity type. */
const getActivityConfig = (type) => {
  switch (type) {
    case "create":
      return { color: "#2563EB", icon: RocketLaunchRoundedIcon };
    case "complete":
      return { color: "#10B981", icon: TaskAltRoundedIcon };
    case "progress":
      return { color: "#0EA5E9", icon: PlayCircleRoundedIcon };
    case "join":
      return { color: "#8B5CF6", icon: PersonAddAltRoundedIcon };
    case "update":
      return { color: "#F59E0B", icon: AddTaskRoundedIcon };
    default:
      return { color: "#64748B", icon: PlayCircleRoundedIcon };
  }
};

/** Displays a filterable chronological timeline of project activities. */
export default function ProjectTimeline({ projectId, compact = false }) {
  const { authHeaders, apiFetch, API_BASE_URL } = useAuth();
  const { t, dir, lang } = useLanguage();
  const dateLocale = lang === "ar" ? "ar-EG" : "en-US";
  const textAlign = dir === "rtl" ? "right" : "left";

  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  useEffect(() => {
    /** Loads project activities from the API. */
    const fetchActivities = async () => {
      try {
        setLoading(true);
        const { res, data } = await apiFetch(
          `${API_BASE_URL}/project/${projectId}/activities`,
          { headers: authHeaders() },
        );

        if (res.ok && data?.status === "success") {
          setActivities(data.activities || []);
        } else {
          throw new Error(t("projectDetails.activityLoadError"));
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (projectId) fetchActivities();
  }, [projectId, API_BASE_URL, apiFetch, authHeaders, t]);

  const filteredActivities = useMemo(() => {
    if (typeFilter === "all") return activities;
    return activities.filter((a) => getActivityCategory(a) === typeFilter);
  }, [activities, typeFilter]);

  const filterOptions = useMemo(
    () => [
      { key: "all", label: t("projectDetails.timelineFilterAll") },
      {
        key: "tasks",
        label: t("projectDetails.timelineFilterTasks"),
        count: activities.filter((a) => getActivityCategory(a) === "tasks").length,
      },
      {
        key: "versions",
        label: t("projectDetails.timelineFilterVersions"),
        count: activities.filter((a) => getActivityCategory(a) === "versions").length,
      },
      {
        key: "team",
        label: t("projectDetails.timelineFilterTeam"),
        count: activities.filter((a) => getActivityCategory(a) === "team").length,
      },
    ],
    [activities, t],
  );

  const groupedActivities = useMemo(() => {
    const groups = new Map();
    filteredActivities.forEach((activity) => {
      const dayKey = new Date(activity.created_at).toLocaleDateString(dateLocale, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      if (!groups.has(dayKey)) groups.set(dayKey, []);
      groups.get(dayKey).push(activity);
    });
    return Array.from(groups.entries());
  }, [filteredActivities, dateLocale]);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <ProjectSectionShell
      icon={HistoryRoundedIcon}
      title={t("projectDetails.timelineTitle")}
      subtitle={t("projectDetails.timelineSubtitle")}
      accent="#0F766E"
      compact={compact}
      actions={
        <Chip
          label={`${filteredActivities.length} ${t("projectDetails.activityCountLabel")}`}
          size="small"
          sx={{ fontWeight: 800 }}
        />
      }
    >
      {activities.length > 0 && (
        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mb: compact ? 1.5 : 2.5, gap: 0.75 }}>
          {filterOptions.map(({ key, label, count }) => (
            <Chip
              key={key}
              label={count != null ? `${label} (${count})` : label}
              size="small"
              color={typeFilter === key ? "primary" : "default"}
              variant={typeFilter === key ? "filled" : "outlined"}
              onClick={() => setTypeFilter(key)}
              sx={{ fontWeight: 800, cursor: "pointer" }}
            />
          ))}
        </Stack>
      )}

      {activities.length === 0 ? (
        <Box
          sx={{
            py: 6,
            textAlign: "center",
            borderRadius: 2.5,
            border: "1px dashed",
            borderColor: "divider",
          }}
        >
          <HistoryRoundedIcon sx={{ fontSize: 48, color: "text.disabled", mb: 1 }} />
          <Typography color="text.secondary" sx={{ fontWeight: 700 }}>
            {t("projectDetails.noActivities")}
          </Typography>
        </Box>
      ) : filteredActivities.length === 0 ? (
        <Box
          sx={{
            py: 5,
            textAlign: "center",
            borderRadius: 2.5,
            border: "1px dashed",
            borderColor: "divider",
          }}
        >
          <Typography color="text.secondary" sx={{ fontWeight: 700 }}>
            {t("projectDetails.timelineFilterEmpty")}
          </Typography>
        </Box>
      ) : (
        <Stack spacing={3}>
          {groupedActivities.map(([dayLabel, dayActivities]) => (
            <Box key={dayLabel}>
              <Typography
                variant="overline"
                sx={{
                  fontWeight: 900,
                  letterSpacing: 1,
                  color: "text.secondary",
                  display: "block",
                  mb: 1.5,
                }}
              >
                {dayLabel}
              </Typography>
              <Stack spacing={1.25}>
                {dayActivities.map((activity) => {
                  const config = getActivityConfig(activity.type);
                  const Icon = config.icon;
                  const userName =
                    activity.user?.name || t("projectDetails.unknownUser");
                  const timeLabel = new Date(activity.created_at).toLocaleTimeString(
                    dateLocale,
                    { hour: "2-digit", minute: "2-digit", hour12: true },
                  );

                  return (
                    <Paper
                      key={activity.id}
                      elevation={0}
                      sx={{
                        p: 1.75,
                        borderRadius: 2.5,
                        border: "1px solid",
                        borderColor: "divider",
                        borderInlineStart: `4px solid ${config.color}`,
                        transition: "box-shadow 0.2s ease",
                        "&:hover": {
                          boxShadow: (theme) =>
                            theme.palette.mode === "dark"
                              ? "0 6px 20px rgba(0,0,0,0.35)"
                              : "0 8px 24px rgba(15,23,42,0.08)",
                        },
                      }}
                    >
                      <Stack direction="row" spacing={1.5} alignItems="flex-start">
                        <Box
                          sx={{
                            width: 40,
                            height: 40,
                            borderRadius: 2,
                            display: "grid",
                            placeItems: "center",
                            bgcolor: alpha(config.color, 0.12),
                            color: config.color,
                            flexShrink: 0,
                          }}
                        >
                          <Icon fontSize="small" />
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Stack
                            direction={{ xs: "column", sm: "row" }}
                            justifyContent="space-between"
                            alignItems={{ xs: "flex-start", sm: "center" }}
                            spacing={0.5}
                          >
                            <Typography
                              dir={dir}
                              sx={{
                                fontWeight: 800,
                                fontSize: "0.95rem",
                                unicodeBidi: "isolate",
                                textAlign,
                              }}
                            >
                              {resolveActivityText(activity, t)}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ fontWeight: 700, flexShrink: 0 }}
                            >
                              {timeLabel}
                            </Typography>
                          </Stack>
                          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.75 }}>
                            <Avatar
                              sx={{
                                width: 22,
                                height: 22,
                                fontSize: "0.7rem",
                                fontWeight: 800,
                                bgcolor: config.color,
                              }}
                            >
                              {userName.charAt(0)}
                            </Avatar>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                              {t("projectDetails.byUser", { name: userName })}
                            </Typography>
                          </Stack>
                        </Box>
                      </Stack>
                    </Paper>
                  );
                })}
              </Stack>
            </Box>
          ))}
        </Stack>
      )}
    </ProjectSectionShell>
  );
}

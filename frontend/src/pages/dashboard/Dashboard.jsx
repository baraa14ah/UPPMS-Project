import React, { useEffect, useMemo, useState } from "react";
import { Link as RouterLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import PageHeader from "../../components/shared/PageHeader";
import { headerActionBtnSx } from "../../styles/dashboardUi";
import { textEllipsisSx } from "../../styles/textEllipsis";
import { getRoleTheme } from "../../config/roleTheme";
import Swal from "sweetalert2";
import {
  Box,
  Paper,
  Typography,
  Stack,
  Button,
  Chip,
  Divider,
  LinearProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
} from "@mui/material";
import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import FolderOpenRoundedIcon from "@mui/icons-material/FolderOpenRounded";
import NotificationsRoundedIcon from "@mui/icons-material/NotificationsRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import SchoolRoundedIcon from "@mui/icons-material/SchoolRounded";
import ListAltRoundedIcon from "@mui/icons-material/ListAltRounded";
import HourglassBottomRoundedIcon from "@mui/icons-material/HourglassBottomRounded";
import AdminPanelSettingsRoundedIcon from "@mui/icons-material/AdminPanelSettingsRounded";
import AutoGraphRoundedIcon from "@mui/icons-material/AutoGraphRounded";
import PersonAddAltRoundedIcon from "@mui/icons-material/PersonAddAltRounded";
import GitHubLinkCard from "../../components/projects/GitHubLinkCard";
import DashboardSkeleton from "../../components/loading/DashboardSkeleton";
import { isGithubLinked } from "../../utils/githubLink";

/** Shared hover lift effect for dashboard cards. */
const hoverEffect = {
  transition: "transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out",
  "&:hover": {
    transform: "translateY(-4px)",
    boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
  },
};

/** Role-aware dashboard with stats, progress, and recent activity. */
export default function Dashboard() {
  const { t } = useLanguage();
  const {
    user,
    token: ctxToken,
    authHeaders,
    apiFetch,
    API_BASE_URL,
    isGraduated,
  } = useAuth();
  const navigate = useNavigate();

  const token = ctxToken || localStorage.getItem("token");

  const name = user?.user?.name || t("common.user");
  const role = String(
    user?.role?.name ?? user?.role ?? t("common.unknown"),
  ).toLowerCase();

  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("github") === "success") {
      Swal.fire({
        title: t("dashboard.githubSuccess"),
        text: t("dashboard.githubSuccessBody"),
        icon: "success",
        confirmButtonColor: "#24292e",
        confirmButtonText: t("dashboard.great"),
      });
      window.history.replaceState(null, "", window.location.pathname);
    } else if (params.get("github") === "error") {
      Swal.fire({ title: t("dashboard.githubError"), icon: "error" });
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, [location, t]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [stats, setStats] = useState({
    projectsTotal: 0,
    tasksTotal: 0,
    tasksCompleted: 0,
    progress: 0,
    pendingInvites: 0,
    pendingUsers: 0,
  });

  const [recentProjects, setRecentProjects] = useState([]);
  const [recentTasks, setRecentTasks] = useState([]);

  /** Clamps a numeric value to a whole percentage between 0 and 100. */
  const safePercent = (n) => {
    const x = Number(n || 0);
    if (Number.isNaN(x)) return 0;
    return Math.max(0, Math.min(100, Math.round(x)));
  };

  /** Renders the current user's role as a header chip. */
  const roleChip = () => (
    <Chip
      size="small"
      label={t(`roles.${role}`, role)}
      icon={role === "admin" ? <AdminPanelSettingsRoundedIcon /> : undefined}
      sx={{
        fontWeight: 800,
        color: "#FFFFFF",
        bgcolor: "rgba(255,255,255,0.14)",
        border: "1px solid rgba(255,255,255,0.35)",
        "& .MuiChip-icon": { color: "#FFFFFF" },
      }}
    />
  );

  /** Maps a task/project status string to a colored chip. */
  const statusChip = (status) => {
    const s = (status || "pending").toLowerCase();
    if (s === "completed")
      return (
        <Chip size="small" color="success" label={t("dashboard.completed")} />
      );
    if (s === "in_progress")
      return (
        <Chip size="small" color="info" label={t("dashboard.inProgress")} />
      );
    if (s === "pending")
      return (
        <Chip size="small" color="warning" label={t("dashboard.pending")} />
      );
    return <Chip size="small" variant="outlined" label={status || "—"} />;
  };

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    /** Fetches dashboard summary stats and recent lists from the API. */
    const run = async () => {
      try {
        setLoading(true);
        setError("");

        const { res, data } = await apiFetch(
          `${API_BASE_URL}/dashboard/summary`,
          {
            headers: authHeaders(),
          },
        );

        if (!res.ok) {
          throw new Error(data?.message || t("dashboard.loadError"));
        }

        const s = data?.stats || {};
        setStats({
          projectsTotal: s.projects_total ?? 0,
          tasksTotal: s.tasks_total ?? 0,
          tasksCompleted: s.tasks_completed ?? 0,
          progress: s.progress ?? 0,
          pendingInvites: s.pending_invites ?? 0,
          pendingUsers: s.pending_users ?? 0,
        });

        setRecentProjects(data?.recent_projects || []);
        setRecentTasks(data?.recent_tasks || []);
      } catch (e) {
        setError(e?.message || t("dashboard.loadError"));
      } finally {
        setLoading(false);
      }
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const dashboardConfig = useMemo(
    () => ({
      admin: {
        greeting: t("dashboard.adminGreeting"),
        projectsTitle: t("dashboard.adminProjects"),
        tasksTitle: t("dashboard.adminTasks"),
        invitesTitle: t("users.tabPending"),
        action1: {
          label: t("dashboard.adminManageProjects"),
          icon: <FolderOpenRoundedIcon />,
          to: "/dashboard/projects",
        },
        action2: {
          label: t("dashboard.adminManageUsers"),
          icon: <AdminPanelSettingsRoundedIcon />,
          to: "/dashboard/users",
        },
      },
      supervisor: {
        greeting: t("dashboard.supervisorGreeting"),
        projectsTitle: t("dashboard.supervisorProjects"),
        tasksTitle: t("dashboard.supervisorTasks"),
        invitesTitle: t("dashboard.supervisorInvites"),
        action1: {
          label: t("dashboard.supervisorProjectsAction"),
          icon: <FolderOpenRoundedIcon />,
          to: "/dashboard/projects",
        },
        action2: {
          label: t("dashboard.supervisorInvitesAction"),
          icon: <PersonAddAltRoundedIcon />,
          to: "/dashboard/supervisor/invitations",
        },
      },
      student: {
        greeting: t("dashboard.studentGreeting"),
        projectsTitle: t("dashboard.studentProjects"),
        tasksTitle: t("dashboard.studentTasks"),
        invitesTitle: t("dashboard.studentInvites"),
        action1: {
          label: t("dashboard.studentProjectsAction"),
          icon: <FolderOpenRoundedIcon />,
          to: "/dashboard/projects",
        },
        action2: {
          label: t("dashboard.studentInvitesAction"),
          icon: <PersonAddAltRoundedIcon />,
          to: "/dashboard/student/invitations",
        },
      },
    }),
    [t],
  );

  const currentConfig = dashboardConfig[role] || dashboardConfig.student;
  const roleTheme = getRoleTheme(role);
  const currentUserId = user?.user?.id || user?.id;
  const githubLinked = isGithubLinked(user);
  const showGithubSetup =
    (role === "student" || role === "supervisor") && !githubLinked;

  const statCards = useMemo(() => {
    const fourthCard =
      role === "admin"
        ? {
            title: t("users.tabPending"),
            value: stats.pendingUsers,
            icon: <HourglassBottomRoundedIcon fontSize="large" />,
            desc: t("users.pendingAlertTitle"),
            color: roleTheme.accent,
          }
        : {
            title: t("dashboard.invites"),
            value: stats.pendingInvites,
            icon: <HourglassBottomRoundedIcon fontSize="large" />,
            desc: currentConfig.invitesTitle,
            color: "#F59E0B",
          };

    return [
      {
        title: t("dashboard.projects"),
        value: stats.projectsTotal,
        icon: <FolderOpenRoundedIcon fontSize="large" />,
        desc: currentConfig.projectsTitle,
        color: role === "student" ? roleTheme.accent : "#3B82F6",
      },
      {
        title: t("dashboard.tasks"),
        value: stats.tasksTotal,
        icon: <ListAltRoundedIcon fontSize="large" />,
        desc: currentConfig.tasksTitle,
        color: "#8B5CF6",
      },
      {
        title: t("dashboard.completed"),
        value: stats.tasksCompleted,
        icon: <CheckCircleRoundedIcon fontSize="large" />,
        desc: t("dashboard.completed"),
        color: "#10B981",
      },
      fourthCard,
    ];
  }, [role, stats, currentConfig, roleTheme, t]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <Box sx={{ maxWidth: 1400, mx: "auto" }}>
      <PageHeader
        title={t("dashboard.title")}
        subtitle={`${t("dashboard.welcome")} ${name} — ${currentConfig.greeting}`}
        icon={<DashboardRoundedIcon />}
        roleName={role}
        actions={
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
            alignItems={{ xs: "stretch", sm: "center" }}
            sx={{ width: { xs: "100%", sm: "auto" } }}
          >
            {roleChip()}
            <Button
              component={RouterLink}
              to={currentConfig.action1.to}
              variant="outlined"
              startIcon={currentConfig.action1.icon}
              sx={headerActionBtnSx}
            >
              {currentConfig.action1.label}
            </Button>
            <Button
              component={RouterLink}
              to={currentConfig.action2.to}
              variant="outlined"
              startIcon={currentConfig.action2.icon}
              sx={headerActionBtnSx}
            >
              {currentConfig.action2.label}
            </Button>
          </Stack>
        }
      />

      {isGraduated && role === "student" && (
        <Alert
          severity="success"
          icon={<SchoolRoundedIcon />}
          sx={{ mb: 2.5, borderRadius: 3 }}
        >
          <Typography sx={{ fontWeight: 900 }}>
            {t("projectDetails.graduationTitle")}
          </Typography>
          <Typography variant="body2">
            {t("projectDetails.graduationBody")}
          </Typography>
        </Alert>
      )}

      {showGithubSetup && (
        <GitHubLinkCard
          variant="dashboard"
          userId={currentUserId}
          apiBaseUrl={API_BASE_URL}
          linked={githubLinked}
          returnTo="/dashboard"
        />
      )}

      <Paper
        elevation={0}
        sx={{
          p: 3,
          borderRadius: 3,
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        <Divider sx={{ display: "none" }} />

        {error ? (
          <Alert severity="error">{error}</Alert>
        ) : (
          <Box
            sx={{
              p: 2,
              bgcolor: (theme) =>
                theme.palette.mode === "dark"
                  ? "rgba(255,255,255,0.04)"
                  : roleTheme.accentSoft,
              borderRadius: 2,
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <Stack
              direction="row"
              justifyContent="space-between"
              sx={{ mb: 1.5 }}
            >
              <Stack direction="row" spacing={1} alignItems="center">
                <AutoGraphRoundedIcon color="primary" fontSize="small" />
                <Typography variant="body1" sx={{ fontWeight: 800 }}>
                  {t("dashboard.overallProgress")}
                </Typography>
              </Stack>
              <Typography
                variant="h6"
                sx={{ fontWeight: 900, color: "primary.main" }}
              >
                {safePercent(stats.progress)}%
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={safePercent(stats.progress)}
              sx={{ height: 12, borderRadius: 6, bgcolor: "rgba(0,0,0,0.05)" }}
            />
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", mt: 1.5, fontWeight: 600 }}
            >
              {t("dashboard.tasksProgress")} {stats.tasksCompleted}{" "}
              {t("dashboard.tasksProgressOf")} {stats.tasksTotal}{" "}
              {t("dashboard.tasksProgressSuffix")}
            </Typography>
          </Box>
        )}
      </Paper>

      {!error && (
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          sx={{ mt: 3 }}
        >
          {statCards.map((stat, idx) => (
            <Paper
              key={idx}
              elevation={0}
              sx={{
                p: 3,
                flex: 1,
                borderRadius: 3,
                border: "1px solid",
                borderColor: "divider",
                bgcolor: "background.paper",
                position: "relative",
                overflow: "hidden",
                ...hoverEffect,
              }}
            >
              <Box
                sx={{
                  position: "absolute",
                  top: -15,
                  insetInlineStart: -15,
                  width: 60,
                  height: 60,
                  borderRadius: "50%",
                  bgcolor: stat.color,
                  opacity: 0.1,
                }}
              />

              <Stack
                direction="row"
                spacing={1.5}
                alignItems="center"
                sx={{ color: stat.color }}
              >
                {stat.icon}
                <Typography
                  sx={{
                    fontWeight: 900,
                    color: "text.primary",
                    fontSize: "1.1rem",
                  }}
                >
                  {stat.title}
                </Typography>
              </Stack>
              <Typography variant="h3" sx={{ fontWeight: 900, mt: 2, mb: 0.5 }}>
                {stat.value}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ fontWeight: 500 }}
              >
                {stat.desc}
              </Typography>
            </Paper>
          ))}
        </Stack>
      )}

      {!error && (
        <Stack
          direction={{ xs: "column", lg: "row" }}
          spacing={2}
          sx={{ mt: 3 }}
        >
          <Paper
            elevation={0}
            sx={{
              p: 0,
              flex: 1,
              borderRadius: 3,
              border: "1px solid",
              borderColor: "divider",
              overflow: "hidden",
              ...hoverEffect,
            }}
          >
            <Box
              sx={{
                p: 2.5,
                borderBottom: "1px solid",
                borderColor: "divider",
                bgcolor: (theme) =>
                  theme.palette.mode === "dark"
                    ? "rgba(255,255,255,0.03)"
                    : "#FAFAFA",
              }}
            >
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
              >
                <Typography sx={{ fontWeight: 900, fontSize: "1.1rem" }}>
                  {t("dashboard.recentProjectsTitle")}
                </Typography>
                <Button
                  component={RouterLink}
                  to="/dashboard/projects"
                  size="small"
                  sx={{ fontWeight: 800 }}
                >
                  {t("dashboard.viewAll")}
                </Button>
              </Stack>
            </Box>

            <Box sx={{ p: recentProjects.length === 0 ? 3 : 0 }}>
              {recentProjects.length === 0 ? (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  textAlign="center"
                >
                  {t("dashboard.noProjects")}
                </Typography>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: "rgba(0,0,0,0.02)" }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 800, py: 1.5 }}>
                          {t("dashboard.projectName")}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 800, py: 1.5 }}>
                          {t("dashboard.status")}
                        </TableCell>
                        <TableCell
                          sx={{ fontWeight: 800, py: 1.5, textAlign: "left" }}
                        >
                          {t("dashboard.action")}
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {recentProjects.map((p) => (
                        <TableRow
                          key={p.id}
                          hover
                          sx={{ "&:last-child td": { border: 0 } }}
                        >
                          <TableCell sx={{ fontWeight: 700 }}>
                            {p.title || `Project #${p.id}`}
                            <Typography
                              variant="caption"
                              sx={{
                                display: "block",
                                color: "text.secondary",
                                fontWeight: 400,
                                ...textEllipsisSx,
                              }}
                            >
                              {p.description
                                ? p.description.length > 40
                                  ? p.description.substring(0, 40) + "..."
                                  : p.description
                                : "—"}
                            </Typography>
                          </TableCell>
                          <TableCell>{statusChip(p.status)}</TableCell>
                          <TableCell sx={{ textAlign: "left" }}>
                            <Button
                              component={RouterLink}
                              to={`/dashboard/projects/${p.id}`}
                              size="small"
                              variant="contained"
                              sx={{
                                borderRadius: 1.5,
                                fontWeight: 700,
                                boxShadow: "none",
                              }}
                            >
                              {t("dashboard.enter")}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          </Paper>

          <Paper
            elevation={0}
            sx={{
              p: 0,
              flex: 1,
              borderRadius: 3,
              border: "1px solid",
              borderColor: "divider",
              overflow: "hidden",
              ...hoverEffect,
            }}
          >
            <Box
              sx={{
                p: 2.5,
                borderBottom: "1px solid",
                borderColor: "divider",
                bgcolor: (theme) =>
                  theme.palette.mode === "dark"
                    ? "rgba(255,255,255,0.03)"
                    : "#FAFAFA",
              }}
            >
              <Typography sx={{ fontWeight: 900, fontSize: "1.1rem" }}>
                {t("dashboard.recentTasksTitle")}
              </Typography>
            </Box>

            <Box sx={{ p: recentTasks.length === 0 ? 3 : 0 }}>
              {recentTasks.length === 0 ? (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  textAlign="center"
                >
                  {t("dashboard.noTasks")}
                </Typography>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: "rgba(0,0,0,0.02)" }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 800, py: 1.5 }}>
                          {t("dashboard.taskName")}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 800, py: 1.5 }}>
                          {t("dashboard.status")}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 800, py: 1.5 }}>
                          {t("dashboard.link")}
                        </TableCell>
                        <TableCell
                          sx={{ fontWeight: 800, py: 1.5, textAlign: "left" }}
                        >
                          {t("dashboard.action")}
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {recentTasks.map((task) => (
                        <TableRow
                          key={task.id}
                          hover
                          sx={{ "&:last-child td": { border: 0 } }}
                        >
                          <TableCell sx={{ fontWeight: 700 }}>
                            {task.title || `Task #${task.id}`}
                            <Typography
                              variant="caption"
                              sx={{ display: "block", color: "text.secondary" }}
                            >
                              {t("dashboard.dueDate")}:{" "}
                              {task.deadline
                                ? new Date(task.deadline).toLocaleDateString()
                                : "—"}
                            </Typography>
                          </TableCell>
                          <TableCell>{statusChip(task.status)}</TableCell>
                          <TableCell
                            sx={{
                              color: "text.secondary",
                              fontSize: "0.85rem",
                              maxWidth: 120,
                              ...textEllipsisSx,
                            }}
                          >
                            {task.project_title ||
                              (task.project_id
                                ? `${t("dashboard.projectRef")} #${task.project_id}`
                                : "—")}
                          </TableCell>
                          <TableCell sx={{ textAlign: "left" }}>
                            {task.project_id ? (
                              <Button
                                component={RouterLink}
                                to={`/dashboard/projects/${task.project_id}?tab=tasks`}
                                size="small"
                                variant="outlined"
                                sx={{ borderRadius: 1.5, fontWeight: 700 }}
                              >
                                {t("dashboard.preview")}
                              </Button>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          </Paper>
        </Stack>
      )}
    </Box>
  );
}

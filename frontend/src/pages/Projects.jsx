import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Typography,
  Button,
  Stack,
  Chip,
  Alert,
  LinearProgress,
  Paper,
  Avatar,
  alpha,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import ArrowOutwardRoundedIcon from "@mui/icons-material/ArrowOutwardRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import SupervisorAccountRoundedIcon from "@mui/icons-material/SupervisorAccountRounded";
import FolderRoundedIcon from "@mui/icons-material/FolderRounded";
import TaskAltRoundedIcon from "@mui/icons-material/TaskAltRounded";
import HourglassBottomRoundedIcon from "@mui/icons-material/HourglassBottomRounded";
import AutorenewRoundedIcon from "@mui/icons-material/AutorenewRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import CreateNewFolderRoundedIcon from "@mui/icons-material/CreateNewFolderRounded";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import ProjectSummaryCards from "../components/ProjectSummaryCards";
import ListToolbar from "../components/ListToolbar";
import ProjectsGridSkeleton from "../components/loading/ProjectsGridSkeleton";
import PageHeader from "../components/PageHeader";
import DefenseWorkflowGuide from "../components/defense/DefenseWorkflowGuide";
import CreateProjectDialog from "../components/CreateProjectDialog";
import { useLanguage } from "../context/LanguageContext";
import {
  dashboardCardSx,
  sectionPaperSx,
  accentTop,
  btnPrimarySx,
  headerActionBtnSx,
  BLUE,
  NAVY,
} from "../styles/dashboardUi";
import { textEllipsisSx } from "../styles/textEllipsis";

const STATUS_COLORS = {
  completed: "#10B981",
  in_progress: BLUE,
  pending: "#F59E0B",
};

/** Prefetches the project details route chunk on card hover/focus. */
const prefetchProjectDetails = () => {
  void import("./ProjectDetails");
};

/** Derives a normalized status from project progress or task counts. */
function derivedStatusFromProject(p) {
  const percent = p?.progress_percentage;
  if (percent != null) {
    const pr = Number(percent) || 0;
    if (pr >= 100) return "completed";
    if (pr > 0) return "in_progress";
    return "pending";
  }
  const total = Number(p?.total_tasks ?? 0);
  const completed = Number(p?.completed_tasks ?? 0);
  if (total > 0) {
    if (completed >= total) return "completed";
    if (completed > 0) return "in_progress";
    return "pending";
  }
  return String(p?.status || "pending").toLowerCase();
}

/** Returns project completion percentage capped between 0 and 100. */
function progressPercent(p) {
  const pr = p?.progress_percentage;
  if (pr != null) return Math.min(100, Math.max(0, Number(pr) || 0));
  const total = Number(p?.total_tasks ?? 0);
  const done = Number(p?.completed_tasks ?? 0);
  return total ? Math.round((done / total) * 100) : 0;
}

/** Projects list page with search, filters, and create dialog. */
export default function Projects() {
  const { t, lang } = useLanguage();
  const { token, user, authHeaders, apiFetch, API_BASE_URL } = useAuth();
  const dateLocale = lang === "ar" ? "ar-EG" : "en-US";

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [phaseFilter, setPhaseFilter] = useState("");

  const roleName = String(user?.role?.name || user?.role || "").toLowerCase();
  const currentUserId = Number(user?.user?.id || user?.id);
  const canCreateProject = roleName === "admin";
  const isStudent = roleName === "student";
  const canFilterByPhase = roleName === "admin" || roleName === "supervisor";

  const hasActiveProject = useMemo(() => {
    if (!isStudent) return false;
    return projects.some((p) => {
      if (Number(p.user_id) !== currentUserId) return false;
      const status = derivedStatusFromProject(p);
      return !["completed", "cancelled", "closed"].includes(status);
    });
  }, [projects, currentUserId, isStudent]);

  const canSubmitProposal = isStudent && !hasActiveProject;

  /** Loads all projects visible to the current user. */
  const fetchProjects = async () => {
    setLoading(true);
    setError("");
    try {
      const { res, data } = await apiFetch(`${API_BASE_URL}/projects`, {
        headers: authHeaders(),
      });
      if (!res.ok) {
        setError(data?.message || t("projects.loadError"));
        setProjects([]);
        return;
      }
      const baseProjects = data?.projects?.data || data?.projects || [];
      setProjects(Array.isArray(baseProjects) ? baseProjects : []);
    } catch {
      setError(t("projects.loadError"));
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  /** Creates a new project and refreshes the list on success. */
  const handleCreateProject = async ({ title, description }) => {
    try {
      setCreating(true);
      const { res, data } = await apiFetch(`${API_BASE_URL}/project/create`, {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ title, description }),
      });
      if (!res.ok) {
        toast.error(data?.message || t("projects.loadError"));
        return false;
      }
      toast.success(t("projects.created"));
      setCreateOpen(false);
      fetchProjects();
      return true;
    } catch {
      toast.error(t("common.error"));
      return false;
    } finally {
      setCreating(false);
    }
  };

  const visibleProjects = useMemo(() => {
    let filtered = projects;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          (p.title || "").toLowerCase().includes(q) ||
          (p.user?.name || "").toLowerCase().includes(q) ||
          (p.supervisor?.name || "").toLowerCase().includes(q) ||
          (p.track_stage?.phase_name || "").toLowerCase().includes(q) ||
          (p.track_stage?.step_name || "").toLowerCase().includes(q),
      );
    }
    if (statusFilter) {
      filtered = filtered.filter(
        (p) => derivedStatusFromProject(p) === statusFilter,
      );
    }
    if (phaseFilter) {
      filtered = filtered.filter(
        (p) => String(p.track_stage?.phase_id || "") === String(phaseFilter),
      );
    }
    return filtered;
  }, [projects, searchQuery, statusFilter, phaseFilter]);

  const phaseOptions = useMemo(() => {
    const map = new Map();
    projects.forEach((p) => {
      const id = p?.track_stage?.phase_id;
      const name = p?.track_stage?.phase_name;
      if (id && name) map.set(String(id), name);
    });
    return [...map.entries()]
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [projects]);

  const stats = useMemo(() => {
    const counts = {
      total: projects.length,
      pending: 0,
      in_progress: 0,
      completed: 0,
    };
    projects.forEach((p) => {
      const s = derivedStatusFromProject(p);
      if (counts[s] != null) counts[s] += 1;
    });
    return counts;
  }, [projects]);

  const statCards = [
    {
      key: "",
      label: t("projects.statsTotal"),
      value: stats.total,
      icon: FolderRoundedIcon,
      color: "#8B5CF6",
    },
    {
      key: "pending",
      label: t("projects.statsPending"),
      value: stats.pending,
      icon: HourglassBottomRoundedIcon,
      color: STATUS_COLORS.pending,
    },
    {
      key: "in_progress",
      label: t("projects.statsInProgress"),
      value: stats.in_progress,
      icon: AutorenewRoundedIcon,
      color: STATUS_COLORS.in_progress,
    },
    {
      key: "completed",
      label: t("projects.statsCompleted"),
      value: stats.completed,
      icon: CheckCircleRoundedIcon,
      color: STATUS_COLORS.completed,
    },
  ];

  /** Shows the user's relationship to a project (owner, supervisor, member). */
  const relationChip = (p) => {
    if (!currentUserId) return null;
    const isOwner = Number(p.user_id) === currentUserId;
    const isSupervisor =
      Number(p.supervisor_id) === currentUserId ||
      Number(p.supervisor?.id) === currentUserId;
    if (isOwner)
      return (
        <Chip
          size="small"
          color="warning"
          label={t("projects.owner")}
          sx={{ fontWeight: 800 }}
        />
      );
    if (isSupervisor)
      return (
        <Chip
          size="small"
          color="info"
          label={t("projects.supervisor")}
          sx={{ fontWeight: 800 }}
        />
      );
    return (
      <Chip
        size="small"
        color="success"
        label={t("projects.member")}
        sx={{ fontWeight: 800 }}
      />
    );
  };

  /** Renders a localized status chip for a project. */
  const statusChip = (status) => {
    const s = String(status || "pending").toLowerCase();
    if (s === "completed")
      return (
        <Chip
          size="small"
          color="success"
          label={t("dashboard.completed")}
          sx={{ fontWeight: 800 }}
        />
      );
    if (s === "in_progress")
      return (
        <Chip
          size="small"
          color="info"
          label={t("dashboard.inProgress")}
          sx={{ fontWeight: 800 }}
        />
      );
    if (s === "pending")
      return (
        <Chip
          size="small"
          color="warning"
          label={t("dashboard.pending")}
          sx={{ fontWeight: 800 }}
        />
      );
    return <Chip size="small" variant="outlined" label={status || "—"} />;
  };

  return (
    <Box sx={{ width: "100%" }}>
      <PageHeader
        title={t("projects.title")}
        subtitle={t("projects.subtitle")}
        icon={<FolderRoundedIcon />}
        roleName={roleName}
        actions={
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
            sx={{ width: { xs: "100%", sm: "auto" } }}
          >
            {canSubmitProposal && (
              <Button
                component={Link}
                to="/dashboard/proposals"
                variant="outlined"
                startIcon={<DescriptionRoundedIcon />}
                sx={headerActionBtnSx}
              >
                {t("proposals.submitProposal")}
              </Button>
            )}
            {canCreateProject && (
              <Button
                variant="outlined"
                startIcon={<AddRoundedIcon />}
                onClick={() => setCreateOpen(true)}
                sx={headerActionBtnSx}
              >
                {t("projects.createNew")}
              </Button>
            )}
            <Button
              variant="outlined"
              startIcon={<RefreshRoundedIcon />}
              onClick={fetchProjects}
              sx={headerActionBtnSx}
            >
              {t("common.refresh")}
            </Button>
          </Stack>
        }
      />

      {roleName === "admin" && <DefenseWorkflowGuide variant="result" />}

      <ProjectSummaryCards
        items={statCards}
        activeKey={statusFilter}
        onSelect={setStatusFilter}
        loading={loading}
      />

      <ListToolbar
        search={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder={t("projects.searchPlaceholder")}
        filters={
          canFilterByPhase && phaseOptions.length > 0
            ? [
                {
                  key: "phase",
                  label: t("projects.filterByPhase"),
                  value: phaseFilter,
                  onChange: setPhaseFilter,
                  options: phaseOptions,
                },
              ]
            : []
        }
      />

      {loading && <ProjectsGridSkeleton />}

      {!loading && error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      {!loading && !error && visibleProjects.length === 0 && (
        <Paper
          elevation={0}
          sx={{
            ...sectionPaperSx,
            py: 8,
            px: 3,
            textAlign: "center",
            borderStyle: "dashed",
          }}
        >
          <CreateNewFolderRoundedIcon
            sx={{ fontSize: 64, color: "text.disabled", mb: 1.5 }}
          />
          <Typography sx={{ fontWeight: 900, fontSize: "1.15rem", mb: 0.5 }}>
            {t("projects.emptyTitle")}
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ maxWidth: 420, mx: "auto", mb: 2.5 }}
          >
            {canCreateProject
              ? t("projects.emptyHint")
              : t("projects.noProjects")}
          </Typography>
          {canCreateProject && (
            <Button
              variant="contained"
              startIcon={<AddRoundedIcon />}
              onClick={() => setCreateOpen(true)}
              sx={{
                ...btnPrimarySx,
                borderRadius: 2,
                textTransform: "none",
                px: 3,
              }}
            >
              {t("projects.createNew")}
            </Button>
          )}
        </Paper>
      )}

      {!loading && !error && visibleProjects.length > 0 && (
        <Paper elevation={0} sx={{ ...sectionPaperSx, mb: 0 }}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{ mb: 2.5 }}
          >
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Typography
                sx={{
                  fontWeight: 900,
                  fontSize: "1.05rem",
                  color: "text.primary",
                }}
              >
                {t("projects.listTitle")}
              </Typography>
              <Chip
                label={t("projects.countBadge", {
                  count: visibleProjects.length,
                })}
                size="small"
                sx={{
                  fontWeight: 800,
                  bgcolor: alpha(BLUE, 0.12),
                  color: BLUE,
                }}
              />
            </Stack>
          </Stack>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs:
                  isStudent && visibleProjects.length > 1
                    ? "repeat(2, minmax(0, 1fr))"
                    : "1fr",
                sm: "repeat(2, minmax(0, 1fr))",
                md: "repeat(3, minmax(0, 1fr))",
              },
              gap: 2.5,
              alignItems: "stretch",
            }}
          >
            {visibleProjects.map((p) => {
              const status = derivedStatusFromProject(p);
              const pct = progressPercent(p);
              const accent = STATUS_COLORS[status] || NAVY;
              const totalTasks = Number(p.total_tasks ?? 0);
              const completedTasks = Number(p.completed_tasks ?? 0);
              const titleInitial = (p.title || "?").charAt(0).toUpperCase();
              const createdLabel = p.created_at
                ? new Date(p.created_at).toLocaleDateString(dateLocale, {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                : null;
              const compactCard = isStudent && visibleProjects.length > 1;

              return (
                <Card
                  key={p.id}
                  elevation={0}
                  sx={{
                    ...dashboardCardSx,
                    ...accentTop(accent),
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    position: "relative",
                  }}
                >
                  <CardActionArea
                    component={Link}
                    to={`/dashboard/projects/${p.id}`}
                    onMouseEnter={prefetchProjectDetails}
                    onFocus={prefetchProjectDetails}
                    sx={{
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "stretch",
                    }}
                  >
                    <CardContent
                      sx={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        p: compactCard ? { xs: 1.75, sm: 2.5 } : 2.5,
                        "&:last-child": {
                          pb: compactCard ? { xs: 1.75, sm: 2.5 } : 2.5,
                        },
                      }}
                    >
                      <Stack
                        direction="row"
                        spacing={1.25}
                        alignItems="flex-start"
                        sx={{ mb: 1.5 }}
                      >
                        <Avatar
                          sx={{
                            width: 44,
                            height: 44,
                            fontWeight: 900,
                            bgcolor: alpha(accent, 0.15),
                            color: accent,
                            border: "1px solid",
                            borderColor: alpha(accent, 0.3),
                          }}
                        >
                          {titleInitial}
                        </Avatar>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography
                            sx={{
                              fontWeight: 900,
                              fontSize: "1.05rem",
                              lineHeight: 1.35,
                              color: "text.primary",
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                            }}
                          >
                            {p.title || "—"}
                          </Typography>
                          {createdLabel && (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ fontWeight: 600 }}
                            >
                              {createdLabel}
                            </Typography>
                          )}
                        </Box>
                      </Stack>

                      <Stack
                        direction="row"
                        spacing={0.75}
                        flexWrap="wrap"
                        useFlexGap
                        sx={{ mb: 1.25 }}
                      >
                        {p.track_stage?.phase_name && (
                          <Chip
                            size="small"
                            color="secondary"
                            variant="outlined"
                            label={p.track_stage.phase_name}
                            sx={{ fontWeight: 800 }}
                          />
                        )}
                        {(p.user?.status === "graduated" ||
                          (p.status === "completed" && !p.track_stage)) && (
                          <Chip
                            size="small"
                            color="success"
                            label={t("projectDetails.graduateBadge")}
                            sx={{ fontWeight: 800 }}
                          />
                        )}
                        {statusChip(status)}
                        {relationChip(p)}
                        {totalTasks > 0 && (
                          <Chip
                            size="small"
                            icon={
                              <TaskAltRoundedIcon
                                sx={{ fontSize: "14px !important" }}
                              />
                            }
                            label={t("projects.tasksCount", {
                              count: totalTasks,
                              done: completedTasks,
                            })}
                            variant="outlined"
                            sx={{ fontWeight: 700 }}
                          />
                        )}
                      </Stack>

                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          mb: 1.75,
                          flex: 1,
                          display: "-webkit-box",
                          WebkitLineClamp: compactCard ? 2 : 3,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                          lineHeight: 1.65,
                          fontWeight: 500,
                        }}
                      >
                        {p.description || t("projects.noDescription")}
                      </Typography>

                      <Stack spacing={0.85} sx={{ mb: 2 }}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <PersonRoundedIcon
                            sx={{ fontSize: 17, color: "text.secondary" }}
                          />
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={textEllipsisSx}
                          >
                            {t("projects.ownerLabel")}:{" "}
                            <Typography
                              component="span"
                              fontWeight={800}
                              color="text.primary"
                            >
                              {p.user?.name || "—"}
                            </Typography>
                          </Typography>
                        </Stack>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <SupervisorAccountRoundedIcon
                            sx={{ fontSize: 17, color: "text.secondary" }}
                          />
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={textEllipsisSx}
                          >
                            {t("projects.supervisorLabel")}:{" "}
                            <Typography
                              component="span"
                              fontWeight={800}
                              color="text.primary"
                            >
                              {p.supervisor?.name || t("projects.noSupervisor")}
                            </Typography>
                          </Typography>
                        </Stack>
                      </Stack>

                      <Box sx={{ mb: 1.5 }}>
                        <Stack
                          direction="row"
                          justifyContent="space-between"
                          sx={{ mb: 0.5 }}
                        >
                          <Typography
                            variant="caption"
                            fontWeight={800}
                            color="text.secondary"
                          >
                            {t("projects.progress")}
                          </Typography>
                          <Typography
                            variant="caption"
                            fontWeight={900}
                            sx={{ color: accent }}
                          >
                            {pct}%
                          </Typography>
                        </Stack>
                        <LinearProgress
                          variant="determinate"
                          value={pct}
                          sx={{
                            height: 9,
                            borderRadius: 99,
                            bgcolor: alpha(accent, 0.12),
                            "& .MuiLinearProgress-bar": {
                              bgcolor: accent,
                              borderRadius: 99,
                            },
                          }}
                        />
                      </Box>

                      <Button
                        component="span"
                        variant="contained"
                        fullWidth
                        endIcon={<ArrowOutwardRoundedIcon />}
                        sx={{
                          ...btnPrimarySx,
                          mt: "auto",
                          borderRadius: 2,
                          py: 1.1,
                          pointerEvents: "none",
                        }}
                      >
                        {t("projects.open")}
                      </Button>
                    </CardContent>
                  </CardActionArea>
                </Card>
              );
            })}
          </Box>
        </Paper>
      )}

      <CreateProjectDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreateProject}
        submitting={creating}
        t={t}
      />
    </Box>
  );
}

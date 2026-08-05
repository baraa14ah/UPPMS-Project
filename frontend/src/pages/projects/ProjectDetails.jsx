import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  useNavigate,
  useParams,
  Link as RouterLink,
  useLocation,
} from "react-router-dom";
import ConfirmDialog from "../../components/shared/ConfirmDialog";
import CommentsTab from "./ProjectDetails/CommentsTab";
import VersionsTab from "./ProjectDetails/VersionsTab";
import TasksTab from "./ProjectDetails/TasksTab";
import InvitationsSection from "./ProjectDetails/InvitationsSection";
import ProjectInfoCard from "./ProjectDetails/ProjectInfoCard";
import DefenseSessionCard from "./ProjectDetails/DefenseSessionCard";
import DefenseActionBar from "./ProjectDetails/DefenseActionBar";
import ProjectPhaseProgress from "../../components/projects/ProjectPhaseProgress";
import CommitteeAssignDialog from "../../components/scheduling/CommitteeAssignDialog";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { textEllipsisSx } from "../../styles/textEllipsis";
import ProjectTimeline from "./ProjectDetails/ProjectTimeline";

import toast from "react-hot-toast";

import {
  Box,
  Paper,
  Typography,
  Stack,
  Button,
  Chip,
  Skeleton,
  Alert,
  Tabs,
  Tab,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  useMediaQuery,
  useTheme,
} from "@mui/material";

import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import SchoolRoundedIcon from "@mui/icons-material/SchoolRounded";
import ExitToAppRoundedIcon from "@mui/icons-material/ExitToAppRounded";
import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import TaskAltRoundedIcon from "@mui/icons-material/TaskAltRounded";
import FolderZipRoundedIcon from "@mui/icons-material/FolderZipRounded";
import ForumRoundedIcon from "@mui/icons-material/ForumRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import PersonAddAltRoundedIcon from "@mui/icons-material/PersonAddAltRounded";
import GavelRoundedIcon from "@mui/icons-material/GavelRounded";
import MoreVertRoundedIcon from "@mui/icons-material/MoreVertRounded";
import { getRoleTheme } from "../../config/roleTheme";
import { rtlSafeGradientStyle } from "../../utils/rtlSafeGradient";
import {
  countUnreadComments,
  markCommentsSeen,
} from "../../utils/commentSeen";

/** Project detail page with tabbed overview, tasks, comments, versions, and timeline. */
export default function ProjectDetails() {
  const { t } = useLanguage();
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState(0);
  const [actionsMenuAnchor, setActionsMenuAnchor] = useState(null);
  const defaultTabApplied = useRef(false);
  const [commentsSeenTick, setCommentsSeenTick] = useState(0);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const { token, user, authHeaders, apiFetch, API_BASE_URL, refreshProfile } = useAuth();
  const currentUserId = user?.user?.id ?? user?.id;
  const currentRole = String(
    user?.role?.name ?? user?.role ?? "",
  ).toLowerCase();
  const roleTheme = getRoleTheme(currentRole);

  useEffect(() => {
    defaultTabApplied.current = false;
  }, [id]);

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [comments, setComments] = useState([]);
  const [versions, setVersions] = useState([]);
  const [progress, setProgress] = useState({
    total: 0,
    completed: 0,
    percent: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [assignCommitteeOpen, setAssignCommitteeOpen] = useState(false);

  const [dialogConfig, setDialogConfig] = useState({
    isOpen: false,
    title: "",
    content: "",
    confirmText: "",
    confirmColor: "primary",
    onConfirm: null,
  });
  const [dialogLoading, setDialogLoading] = useState(false);

  /** Closes the global confirmation dialog. */
  const closeDialog = () =>
    setDialogConfig((prev) => ({ ...prev, isOpen: false }));

  const headerChipSx = {
    fontWeight: 700,
    bgcolor: "rgba(255,255,255,0.14)",
    color: "#fff",
    border: "1px solid rgba(255,255,255,0.25)",
    "& .MuiChip-icon": { color: "#fff" },
  };

  /** Renders a localized status chip for the project header. */
  const statusChip = (status) => {
    const s = (status || "pending").toLowerCase();
    if (s === "completed")
      return (
        <Chip
          size="small"
          label={t("projectDetails.columnCompleted")}
          sx={headerChipSx}
        />
      );
    if (s === "in_progress")
      return (
        <Chip
          size="small"
          label={t("projectDetails.columnInProgress")}
          sx={headerChipSx}
        />
      );
    if (s === "pending")
      return (
        <Chip
          size="small"
          label={t("projectDetails.columnPending")}
          sx={headerChipSx}
        />
      );
    return <Chip size="small" label={status || "—"} sx={headerChipSx} />;
  };

  /** Ensures version records include a full storage file URL. */
  const normalizeFileUrl = (v) => {
    if (!v) return v;
    if (v.file_url) return v;
    if (v.file_path) {
      const base = API_BASE_URL.replace("/api", "");
      return { ...v, file_url: `${base}/storage/${v.file_path}` };
    }
    return v;
  };

  const derivedProjectStatus = useMemo(() => {
    if (!progress?.total || Number(progress.total) === 0)
      return (project?.status || "pending").toLowerCase();
    if (Number(progress.percent) >= 100) return "completed";
    if (Number(progress.completed) > 0 || Number(progress.percent) > 0)
      return "in_progress";
    return "pending";
  }, [progress, project?.status]);

  const membersCount =
    (Array.isArray(project?.members) ? project.members.length : 0) +
    (project?.user ? 1 : 0);

  const canInviteSupervisor =
    (currentRole === "student" &&
      project &&
      currentUserId === project.user_id) ||
    currentRole === "admin";
  const canManageProject =
    currentRole === "admin" ||
    (project && currentUserId === project.user_id) ||
    (project && currentUserId === project.supervisor_id);
  const canUploadVersion =
    currentRole === "admin" ||
    (project && currentUserId === project.user_id) ||
    (project && currentUserId === project.supervisor_id) ||
    currentRole === "student";
  const canLeaveSupervision =
    (currentRole === "supervisor" &&
      project &&
      currentUserId === project.supervisor_id) ||
    currentRole === "admin";
  const canEditProject =
    currentRole === "admin" ||
    (project && currentUserId === project.user_id) ||
    (project && currentUserId === project.supervisor_id);
  const canDeleteProject = currentRole === "admin";
  const isStudent = currentRole === "student";
  const isProjectOwner =
    project && currentUserId && Number(project.user_id) === currentUserId;
  const isProjectMember = Boolean(
    project?.members?.some(
      (m) =>
        Number(m.id) === currentUserId &&
        String(m.pivot?.status || m.status || "accepted") === "accepted",
    ),
  );
  const canLeaveProject =
    isStudent && project && (isProjectOwner || isProjectMember);
  const isAdmin = currentRole === "admin";
  const [defenseSession, setDefenseSession] = useState(null);
  const [defenseResult, setDefenseResult] = useState(null);
  const [defenseResultDialogOpen, setDefenseResultDialogOpen] = useState(false);
  const [defenseCompleteDialogOpen, setDefenseCompleteDialogOpen] = useState(false);

  const hasScheduledCommittee = useMemo(() => {
    if (!defenseSession) return false;
    if (defenseSession.committee_id) return true;

    const committee =
      defenseSession.display_committee || defenseSession.displayCommittee;
    if (committee?.members?.length) return true;

    const members =
      defenseSession.committee_members || defenseSession.committeeMembers || [];
    return members.length > 0;
  }, [defenseSession]);

  const canRecordDefenseResult = useMemo(() => {
    if (!defenseSession || !currentUserId) return false;
    if (isAdmin) return true;

    const committee =
      defenseSession.display_committee ||
      defenseSession.displayCommittee;
    if (committee?.members?.length) {
      return committee.members.some(
        (member) => member.id === currentUserId && member.role === "chair",
      );
    }

    const legacyMembers =
      defenseSession.committee_members ||
      defenseSession.committeeMembers ||
      [];
    return legacyMembers.some(
      (member) => (member.id ?? member.user_id) === currentUserId,
    );
  }, [defenseSession, currentUserId, isAdmin]);

  const isDefenseChair = useMemo(() => {
    if (!defenseSession || !currentUserId || isAdmin) return false;
    const committee =
      defenseSession.display_committee ||
      defenseSession.displayCommittee;
    return committee?.members?.some(
      (member) => member.id === currentUserId && member.role === "chair",
    );
  }, [defenseSession, currentUserId, isAdmin]);
  const showInvitesTab = canInviteSupervisor || canManageProject;

  const canGenerateAiTasks = useMemo(() => {
    if (currentRole !== "student" || !project || !currentUserId) return false;
    if (currentUserId === project.user_id) return true;
    if (!Array.isArray(project.members)) return false;
    return project.members.some((m) => {
      const memberId = m.id ?? m.student_id;
      const status = m.pivot?.status ?? m.status;
      return memberId === currentUserId && status === "accepted";
    });
  }, [currentRole, project, currentUserId]);

  const unreadCommentsCount = useMemo(
    () => countUnreadComments(comments, currentUserId, id),
    [comments, currentUserId, id, commentsSeenTick],
  );

  const tabDefs = useMemo(() => {
    const defs = [
      {
        id: "overview",
        icon: DashboardRoundedIcon,
        label: t("projectDetails.tabOverview"),
      },
    ];
    if (defenseSession) {
      defs.push({
        id: "defense",
        icon: GavelRoundedIcon,
        label: t("projectDetails.tabDefense"),
        needsAction: canRecordDefenseResult && !defenseResult?.result,
      });
    }
    if (showInvitesTab) {
      defs.push({
        id: "invites",
        icon: PersonAddAltRoundedIcon,
        label: t("projectDetails.tabInvites"),
      });
    }
    defs.push(
      {
        id: "tasks",
        icon: TaskAltRoundedIcon,
        label: t("projectDetails.tabTasks"),
        count: tasks.length,
      },
      {
        id: "comments",
        icon: ForumRoundedIcon,
        label: t("projectDetails.tabComments"),
        count: unreadCommentsCount > 0 ? unreadCommentsCount : undefined,
        unread: unreadCommentsCount,
      },
      {
        id: "versions",
        icon: FolderZipRoundedIcon,
        label: t("projectDetails.tabVersions"),
        count: versions.length,
      },
      {
        id: "timeline",
        icon: HistoryRoundedIcon,
        label: t("projectDetails.tabTimeline"),
      },
    );
    return defs;
  }, [
    showInvitesTab,
    t,
    defenseSession,
    canRecordDefenseResult,
    defenseResult?.result,
    tasks.length,
    versions.length,
    unreadCommentsCount,
  ]);

  const activeTabId = tabDefs[activeTab]?.id ?? "overview";

  useEffect(() => {
    if (activeTabId !== "comments" || !currentUserId || !id) return;
    markCommentsSeen(
      currentUserId,
      id,
      comments.map((c) => c?.id),
    );
    setCommentsSeenTick((v) => v + 1);
  }, [activeTabId, comments, currentUserId, id]);

  useEffect(() => {
    if (activeTab >= tabDefs.length) {
      setActiveTab(0);
    }
  }, [activeTab, tabDefs.length]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabFromUrl = params.get("tab");
    if (tabFromUrl) {
      const idx = tabDefs.findIndex((d) => d.id === tabFromUrl);
      if (idx >= 0) setActiveTab(idx);
      defaultTabApplied.current = true;
      return;
    }

    if (defaultTabApplied.current || loading || !project) return;
    const idx = tabDefs.findIndex((d) => d.id === "overview");
    if (idx >= 0) setActiveTab(idx);
    defaultTabApplied.current = true;
  }, [location.search, tabDefs, loading, project]);

  const openDefenseTab = () => {
    const idx = tabDefs.findIndex((d) => d.id === "defense");
    if (idx >= 0) {
      setActiveTab(idx);
      const params = new URLSearchParams(location.search);
      params.set("tab", "defense");
      navigate(`${location.pathname}?${params.toString()}`, { replace: true });
    }
  };

  const openTasksTab = () => {
    const idx = tabDefs.findIndex((d) => d.id === "tasks");
    if (idx >= 0) {
      setActiveTab(idx);
      const params = new URLSearchParams(location.search);
      params.set("tab", "tasks");
      navigate(`${location.pathname}?${params.toString()}`, { replace: true });
    }
  };

  const handleTabChange = (_e, newValue) => {
    setActiveTab(newValue);
    const tabId = tabDefs[newValue]?.id;
    if (!tabId) return;
    const params = new URLSearchParams(location.search);
    params.set("tab", tabId);
    navigate(`${location.pathname}?${params.toString()}`, { replace: true });
  };

  const handleDefenseResultRecorded = (payload) => {
    setDefenseResult((prev) => ({
      ...(prev || {}),
      result: payload?.result,
      recorded_at: payload?.recorded_at,
      stage_name: payload?.stage_name,
      stage_is_decisive: payload?.stage_is_decisive,
      recorded_by: payload?.recorded_by,
      next_stage: payload?.next_stage,
      track_completed: payload?.track_completed,
      graduated: payload?.graduated,
    }));

    if (payload?.graduated || payload?.track_completed) {
      toast.success(t("projectDetails.graduatedToast"));
      refreshProfile?.();
    } else if (payload?.next_stage?.name) {
      toast.success(
        t("projectDetails.trackMovedToast", {
          name: payload.next_stage.name,
        }),
      );
    }

    reloadProject();
  };

  const reloadProject = async () => {
    const { res, data } = await apiFetch(`${API_BASE_URL}/project/${id}`, {
      headers: authHeaders(),
    });
    if (res.ok) {
      const p = data?.project || data;
      setProject(p);
      setDefenseSession(
        data?.defense_session ||
          p?.active_defense_session ||
          p?.activeDefenseSession ||
          null,
      );
      setDefenseResult(data?.defense_result || null);
    }
  };

  useEffect(() => {
    if (!token) return navigate("/login");

    /** Loads project, tasks, progress, comments, and versions from the API. */
    const fetchAll = async () => {
      try {
        setLoading(true);
        setError("");
        const headers = authHeaders();
        const [projectR, tasksR, progressR, commentsR, versionsR] =
          await Promise.all([
            apiFetch(`${API_BASE_URL}/project/${id}`, { headers }),
            apiFetch(`${API_BASE_URL}/project/${id}/tasks`, { headers }),
            apiFetch(`${API_BASE_URL}/project/${id}/progress`, { headers }),
            apiFetch(`${API_BASE_URL}/project/${id}/comments`, { headers }),
            apiFetch(`${API_BASE_URL}/project/${id}/versions`, { headers }),
          ]);

        if (!projectR.res.ok) {
          throw new Error(
            projectR.data?.message || t("projectDetails.loadError"),
          );
        }

        const p = projectR.data?.project || projectR.data;
        setProject(p);
        setDefenseSession(
          projectR.data?.defense_session ||
            p?.active_defense_session ||
            p?.activeDefenseSession ||
            null,
        );
        setDefenseResult(projectR.data?.defense_result || null);

        if (tasksR.res.ok) {
          setTasks(tasksR.data?.tasks || []);
        }
        if (progressR.res.ok) {
          setProgress({
            total: progressR.data?.total_tasks ?? 0,
            completed: progressR.data?.completed_tasks ?? 0,
            percent: progressR.data?.progress_percentage ?? 0,
          });
        }
        if (commentsR.res.ok) {
          setComments(commentsR.data?.comments || []);
        }
        if (versionsR.res.ok) {
          setVersions((versionsR.data?.versions || []).map(normalizeFileUrl));
        }
      } catch (e) {
        setError(e?.message || t("projectDetails.unexpectedError"));
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, token, navigate, authHeaders, apiFetch, API_BASE_URL, t]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const githubStatus = params.get("github");

    if (githubStatus === "success") {
      toast.success(t("projectDetails.githubLinked"), {
        duration: 5000,
        style: { fontWeight: "bold" },
      });
    } else if (githubStatus === "error") {
      toast.error(t("projectDetails.githubLinkFailed"));
    }

    if (githubStatus) {
      const clean = new URLSearchParams(location.search);
      clean.delete("github");
      clean.delete("reason");
      const qs = clean.toString();
      window.history.replaceState(
        null,
        "",
        qs ? `${location.pathname}?${qs}` : location.pathname,
      );
    }
  }, [location.search, location.pathname, t]);

  /** Opens confirmation to leave supervision of this project. */
  const handleLeaveSupervision = () => {
    if (!project?.id) return;
    setDialogConfig({
      isOpen: true,
      title: t("projectDetails.cancelSupervisionTitle"),
      content: t("projectDetails.cancelSupervisionContent"),
      confirmText: t("projectDetails.cancelSupervisionConfirm"),
      confirmColor: "warning",
      onConfirm: async () => {
        try {
          setDialogLoading(true);
          const { res } = await apiFetch(
            `${API_BASE_URL}/project/${project.id}/leave-supervision`,
            { method: "POST", headers: authHeaders() },
          );
          if (!res.ok) {
            toast.error(t("projectDetails.operationFailed"));
            return;
          }
          toast.success(t("projectDetails.cancelSupervisionSuccess"));
          setProject((prev) =>
            prev ? { ...prev, supervisor_id: null, supervisor: null } : prev,
          );
          closeDialog();
        } catch {
          toast.error(t("common.serverError"));
        } finally {
          setDialogLoading(false);
        }
      },
    });
  };

  /** Opens confirmation to leave this project (students only). */
  const handleLeaveProject = () => {
    if (!project?.id) return;
    const isSoloOwner = isProjectOwner && membersCount <= 1;
    setDialogConfig({
      isOpen: true,
      title: t("projectDetails.leaveProjectTitle"),
      content: isSoloOwner
        ? t("projectDetails.leaveProjectSoloOwnerContent")
        : isProjectOwner
          ? t("projectDetails.leaveProjectOwnerContent")
          : t("projectDetails.leaveProjectMemberContent"),
      confirmText: t("projectDetails.leaveProjectConfirm"),
      confirmColor: "warning",
      onConfirm: async () => {
        try {
          setDialogLoading(true);
          const { res, data } = await apiFetch(
            `${API_BASE_URL}/project/${project.id}/leave`,
            { method: "POST", headers: authHeaders() },
          );
          if (!res.ok) {
            toast.error(data?.message || t("projectDetails.operationFailed"));
            return;
          }
          toast.success(
            data?.message || t("projectDetails.leaveProjectSuccess"),
          );
          closeDialog();
          navigate("/dashboard/projects");
        } catch {
          toast.error(t("common.serverError"));
        } finally {
          setDialogLoading(false);
        }
      },
    });
  };

  /** Opens confirmation to permanently delete this project (admin only). */
  const handleDeleteProject = () => {
    setDialogConfig({
      isOpen: true,
      title: t("projectDetails.deleteProjectTitle"),
      content: t("projectDetails.deleteProjectContent"),
      confirmText: t("projectDetails.deleteProjectConfirm"),
      confirmColor: "error",
      onConfirm: async () => {
        try {
          setDialogLoading(true);
          const { res } = await apiFetch(
            `${API_BASE_URL}/project/delete/${id}`,
            { method: "DELETE", headers: authHeaders() },
          );
          if (!res.ok) {
            toast.error(t("projectDetails.operationFailed"));
            return;
          }
          toast.success(t("projectDetails.deleteProjectSuccess"));
          closeDialog();
          navigate("/dashboard/projects");
        } catch {
          toast.error(t("common.serverError"));
        } finally {
          setDialogLoading(false);
        }
      },
    });
  };

  /** Recalculates local progress stats and syncs with the API. */
  const updateProgressLocally = async (currentTasks) => {
    const total = currentTasks.length;
    const completed = currentTasks.filter(
      (t) => t.status === "completed",
    ).length;
    const percent = total ? Math.round((completed / total) * 100) : 0;
    setProgress({ total, completed, percent });
    if (project?.id) {
      try {
        await apiFetch(`${API_BASE_URL}/project/${project.id}/progress`, {
          headers: authHeaders(),
        });
      } catch {
        /* progress sync is best-effort */
      }
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          p: { xs: 2, md: 3 },
          width: "100%",
        }}
      >
        <Paper
          elevation={0}
          sx={{
            borderRadius: 3,
            border: "1px solid",
            borderColor: "divider",
            mb: 3,
            overflow: "hidden",
          }}
        >
          <Box sx={{ px: 2, py: 1.75, bgcolor: "primary.main" }}>
            <Skeleton
              variant="text"
              width="40%"
              height={32}
              sx={{ bgcolor: "rgba(255,255,255,0.25)" }}
            />
            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
              {[80, 100, 70].map((w) => (
                <Skeleton
                  key={w}
                  variant="rounded"
                  width={w}
                  height={24}
                  sx={{ borderRadius: 4, bgcolor: "rgba(255,255,255,0.2)" }}
                />
              ))}
            </Stack>
          </Box>
          <Box sx={{ px: 2, py: 1.5, bgcolor: "background.paper" }}>
            <Stack direction="row" spacing={2}>
              {[110, 90, 100, 130, 120].map((w) => (
                <Skeleton key={w} variant="text" width={w} height={32} />
              ))}
            </Stack>
          </Box>
        </Paper>

        <Skeleton
          variant="rounded"
          width="100%"
          height={360}
          sx={{ borderRadius: 3 }}
        />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button
          variant="outlined"
          onClick={() => navigate(-1)}
          startIcon={<ArrowBackRoundedIcon />}
        >
          {t("projectDetails.back")}
        </Button>
      </Box>
    );
  }

  if (!project)
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">{t("projectDetails.notFound")}</Alert>
      </Box>
    );

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: "100%",
        display: "flex",
        flexDirection: "column",
        minHeight: { xs: "calc(100vh - 72px)", md: "calc(100vh - 88px)" },
        px: 0,
        pb: 0,
      }}
    >
      {/* Compact header */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: { xs: 0, md: 2.5 },
          border: "1px solid",
          borderColor: "divider",
          mb: 0,
          overflow: "hidden",
          mx: { xs: 0, md: 0.5 },
          mt: { xs: 0, md: 0.5 },
        }}
      >
        <Box
          style={rtlSafeGradientStyle(roleTheme.gradient)}
          sx={{
            px: { xs: 1.25, md: 2 },
            py: { xs: 1, md: 1.15 },
            color: "#fff",
          }}
        >
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            justifyContent="space-between"
          >
            <Stack
              direction="row"
              spacing={0.75}
              alignItems="center"
              sx={{ minWidth: 0, flex: 1 }}
            >
              <IconButton
                component={RouterLink}
                to="/dashboard/projects"
                size="small"
                aria-label={t("projectDetails.back")}
                sx={{
                  color: "#fff",
                  flexShrink: 0,
                  bgcolor: "rgba(255,255,255,0.12)",
                  "&:hover": { bgcolor: "rgba(255,255,255,0.22)" },
                }}
              >
                <ArrowBackRoundedIcon fontSize="small" />
              </IconButton>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography
                  variant="subtitle1"
                  sx={{
                    fontWeight: 900,
                    lineHeight: 1.25,
                    fontSize: { xs: "0.98rem", md: "1.1rem" },
                    ...textEllipsisSx,
                  }}
                >
                  {project.title}
                </Typography>
                <Stack
                  direction="row"
                  spacing={0.5}
                  alignItems="center"
                  sx={{ mt: 0.35, flexWrap: "wrap", gap: 0.4 }}
                >
                  {statusChip(derivedProjectStatus)}
                  {project.track_stage?.phase_name && (
                    <Chip
                      size="small"
                      icon={
                        <SchoolRoundedIcon sx={{ fontSize: "14px !important" }} />
                      }
                      label={
                        project.track_stage.step_name
                          ? `${project.track_stage.phase_name} · ${project.track_stage.step_name}`
                          : project.track_stage.phase_name
                      }
                      sx={{
                        height: 22,
                        fontSize: "0.68rem",
                        fontWeight: 700,
                        bgcolor: "rgba(255,255,255,0.14)",
                        color: "#fff",
                        border: "1px solid rgba(255,255,255,0.25)",
                        "& .MuiChip-icon": { color: "#fff" },
                      }}
                    />
                  )}
                  {defenseSession && (
                    <Chip
                      size="small"
                      icon={
                        <GavelRoundedIcon sx={{ fontSize: "14px !important" }} />
                      }
                      label={t("projectDetails.tabDefense")}
                      onClick={openDefenseTab}
                      sx={{
                        height: 22,
                        fontSize: "0.68rem",
                        fontWeight: 800,
                        cursor: "pointer",
                        bgcolor: "rgba(255,255,255,0.22)",
                        color: "#fff",
                        border: "1px solid rgba(255,255,255,0.4)",
                        "& .MuiChip-icon": { color: "#fff" },
                      }}
                    />
                  )}
                  {(project.user?.status === "graduated" ||
                    defenseResult?.graduated ||
                    defenseResult?.track_completed) && (
                    <Chip
                      size="small"
                      color="success"
                      label={t("projectDetails.graduateBadge")}
                      sx={{ height: 22, fontSize: "0.68rem", fontWeight: 800 }}
                    />
                  )}
                  {!isMobile && project.supervisor?.name && (
                    <Chip
                      size="small"
                      icon={
                        <SchoolRoundedIcon sx={{ fontSize: "14px !important" }} />
                      }
                      label={t("projectDetails.supervisorLabel", {
                        name: project.supervisor.name,
                      })}
                      sx={{
                        height: 22,
                        fontSize: "0.68rem",
                        fontWeight: 700,
                        bgcolor: "rgba(255,255,255,0.14)",
                        color: "#fff",
                        border: "1px solid rgba(255,255,255,0.25)",
                        "& .MuiChip-icon": { color: "#fff" },
                      }}
                    />
                  )}
                </Stack>
              </Box>
            </Stack>

            <Stack direction="row" spacing={0.25} alignItems="center" sx={{ flexShrink: 0 }}>
              {(canLeaveProject || canLeaveSupervision) && (
                <>
                  <IconButton
                    size="small"
                    aria-label={t("projectDetails.moreActions")}
                    onClick={(e) => setActionsMenuAnchor(e.currentTarget)}
                    sx={{
                      color: "#fff",
                      bgcolor: "rgba(255,255,255,0.12)",
                      "&:hover": { bgcolor: "rgba(255,255,255,0.22)" },
                    }}
                  >
                    <MoreVertRoundedIcon fontSize="small" />
                  </IconButton>
                  <Menu
                    anchorEl={actionsMenuAnchor}
                    open={Boolean(actionsMenuAnchor)}
                    onClose={() => setActionsMenuAnchor(null)}
                    anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                    transformOrigin={{ vertical: "top", horizontal: "right" }}
                  >
                    {canLeaveProject && (
                      <MenuItem
                        onClick={() => {
                          setActionsMenuAnchor(null);
                          handleLeaveProject();
                        }}
                      >
                        <ListItemIcon>
                          <ExitToAppRoundedIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>{t("projectDetails.leaveProject")}</ListItemText>
                      </MenuItem>
                    )}
                    {canLeaveSupervision && project.supervisor_id && (
                      <MenuItem
                        onClick={() => {
                          setActionsMenuAnchor(null);
                          handleLeaveSupervision();
                        }}
                      >
                        <ListItemIcon>
                          <ExitToAppRoundedIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>
                          {t("projectDetails.cancelSupervision")}
                        </ListItemText>
                      </MenuItem>
                    )}
                  </Menu>
                </>
              )}
            </Stack>
          </Stack>
        </Box>
      </Paper>

      {/* Primary project tabs — main navigation for the page */}
      <Paper
        elevation={0}
        sx={{
          mx: { xs: 0, md: 0.5 },
          mt: 1,
          mb: 0,
          borderRadius: { xs: 0, md: 2.5 },
          border: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
          position: "sticky",
          top: 0,
          zIndex: 8,
          boxShadow: (theme) =>
            theme.palette.mode === "dark"
              ? "0 8px 20px rgba(0,0,0,0.35)"
              : "0 6px 18px rgba(15,23,42,0.06)",
        }}
      >
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          TabIndicatorProps={{ sx: { display: "none" } }}
          sx={{
            minHeight: 56,
            px: { xs: 0.75, md: 1.25 },
            py: 0.85,
            "& .MuiTabs-flexContainer": {
              gap: 0.75,
              alignItems: "center",
            },
            "& .MuiTab-root": {
              minHeight: 42,
              minWidth: "auto",
              px: { xs: 1.25, md: 1.6 },
              py: 0.85,
              borderRadius: 2,
              textTransform: "none",
              fontWeight: 800,
              fontSize: { xs: "0.82rem", md: "0.9rem" },
              color: "text.secondary",
              gap: 0.75,
              border: "1px solid transparent",
              transition: "background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease",
              "&:hover": {
                bgcolor: (theme) =>
                  theme.palette.mode === "dark"
                    ? "rgba(255,255,255,0.06)"
                    : "rgba(15,23,42,0.04)",
                color: "text.primary",
              },
              "&.Mui-selected": {
                color: "primary.main",
                bgcolor: (theme) =>
                  theme.palette.mode === "dark"
                    ? "rgba(59,130,246,0.18)"
                    : "rgba(37,99,235,0.1)",
                borderColor: (theme) =>
                  theme.palette.mode === "dark"
                    ? "rgba(59,130,246,0.45)"
                    : "rgba(37,99,235,0.28)",
              },
            },
            "& .MuiTab-iconWrapper": {
              marginBottom: "0 !important",
              marginInlineEnd: "6px !important",
            },
            "& .MuiTabs-scrollButtons": {
              "&.Mui-disabled": { opacity: 0.25 },
            },
          }}
        >
          {tabDefs.map((tab) => (
            <Tab
              key={tab.id}
              disableRipple
              icon={React.createElement(tab.icon, { sx: { fontSize: 20 } })}
              iconPosition="start"
              aria-label={tab.label}
              label={
                <Stack direction="row" spacing={0.75} alignItems="center">
                  <Box component="span" sx={{ whiteSpace: "nowrap" }}>
                    {tab.label}
                  </Box>
                  {typeof tab.count === "number" && tab.count > 0 && (
                    <Box
                      component="span"
                      sx={
                        tab.id === "comments" && tab.unread > 0
                          ? {
                              minWidth: 20,
                              height: 20,
                              px: 0.65,
                              borderRadius: 999,
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "0.7rem",
                              fontWeight: 900,
                              lineHeight: 1,
                              color: "#fff",
                              bgcolor: "error.main",
                              boxShadow: "0 0 0 0 rgba(239,68,68,0.55)",
                              animation: "pmsCommentPulse 1.6s ease-out infinite",
                              "@keyframes pmsCommentPulse": {
                                "0%": {
                                  boxShadow: "0 0 0 0 rgba(239,68,68,0.55)",
                                },
                                "70%": {
                                  boxShadow: "0 0 0 8px rgba(239,68,68,0)",
                                },
                                "100%": {
                                  boxShadow: "0 0 0 0 rgba(239,68,68,0)",
                                },
                              },
                            }
                          : {
                              minWidth: 20,
                              height: 20,
                              px: 0.6,
                              borderRadius: 999,
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "0.7rem",
                              fontWeight: 900,
                              lineHeight: 1,
                              bgcolor: (theme) =>
                                theme.palette.mode === "dark"
                                  ? "rgba(255,255,255,0.12)"
                                  : "rgba(15,23,42,0.08)",
                            }
                      }
                    >
                      {tab.count}
                    </Box>
                  )}
                  {tab.needsAction && (
                    <Box
                      component="span"
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        bgcolor: "warning.main",
                        flexShrink: 0,
                      }}
                    />
                  )}
                </Stack>
              }
            />
          ))}
        </Tabs>
      </Paper>

      {/* Tab content */}
      <Box
        sx={{
          flex: 1,
          width: "100%",
          minHeight: 0,
          px: { xs: 1, md: 1.25 },
          pt: 1.5,
          pb: 2,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {activeTabId === "overview" && (
          <Stack spacing={1.75}>
            {(project?.user?.status === "graduated" ||
              defenseResult?.graduated ||
              defenseResult?.track_completed ||
              (project?.status === "completed" &&
                currentRole === "student" &&
                !defenseSession)) && (
              <Alert
                severity="success"
                icon={<SchoolRoundedIcon fontSize="inherit" />}
                sx={{
                  borderRadius: 2.5,
                  border: "1px solid",
                  borderColor: "success.light",
                  py: 0.75,
                  "& .MuiAlert-message": { width: "100%" },
                }}
              >
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={1}
                  alignItems={{ xs: "flex-start", sm: "center" }}
                  justifyContent="space-between"
                >
                  <Box>
                    <Typography sx={{ fontWeight: 900, fontSize: "0.95rem" }}>
                      {t("projectDetails.graduationTitle")}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 0.15 }}>
                      {t("projectDetails.graduationBody")}
                    </Typography>
                  </Box>
                  <Chip
                    color="success"
                    size="small"
                    label={t("projectDetails.graduateBadge")}
                    sx={{ fontWeight: 900 }}
                  />
                </Stack>
              </Alert>
            )}

            {project?.track_stage && (
              <Paper
                elevation={0}
                sx={{
                  p: { xs: 1.5, md: 2 },
                  borderRadius: 2.5,
                  border: "1px solid",
                  borderColor: "divider",
                  bgcolor: "background.paper",
                }}
              >
                <Stack
                  direction="row"
                  spacing={1}
                  flexWrap="wrap"
                  useFlexGap
                  alignItems="center"
                  sx={{
                    mb: project.track_stage.phase_progress?.steps?.length ? 1.25 : 0,
                  }}
                >
                  {project.track_stage.phase_name && (
                    <Chip
                      size="small"
                      color="secondary"
                      variant="outlined"
                      label={project.track_stage.phase_name}
                      sx={{ fontWeight: 800 }}
                    />
                  )}
                  {project.track_stage.step_name && (
                    <Chip
                      size="small"
                      color="primary"
                      variant="outlined"
                      label={project.track_stage.step_name}
                      sx={{ fontWeight: 800 }}
                    />
                  )}
                </Stack>
                {project.track_stage.phase_progress?.steps?.length > 0 && (
                  <ProjectPhaseProgress
                    trackStage={project.track_stage}
                    dense
                    showPhaseTitle={false}
                  />
                )}
              </Paper>
            )}

            <ProjectInfoCard
              project={project}
              setProject={setProject}
              progress={progress}
              canEditProject={canEditProject}
              canDeleteProject={canDeleteProject}
              handleDeleteProject={handleDeleteProject}
              onOpenTasks={openTasksTab}
              compact
            />
          </Stack>
        )}

        {activeTabId === "defense" && defenseSession && (
          <Stack spacing={1.5}>
            <DefenseActionBar
              defenseSession={defenseSession}
              defenseResult={defenseResult}
              canRecordResult={canRecordDefenseResult}
              onRecordClick={() => setDefenseResultDialogOpen(true)}
              onCompleteClick={() => setDefenseCompleteDialogOpen(true)}
            />
            <DefenseSessionCard
              defenseSession={defenseSession}
              canAssignCommittee={
                isAdmin &&
                Boolean(defenseSession) &&
                !hasScheduledCommittee
              }
              onAssignCommittee={() => setAssignCommitteeOpen(true)}
              canRecordResult={canRecordDefenseResult}
              isChair={isDefenseChair}
              defenseResult={defenseResult}
              resultDialogOpen={defenseResultDialogOpen}
              onResultDialogOpenChange={setDefenseResultDialogOpen}
              completeDialogOpen={defenseCompleteDialogOpen}
              onCompleteDialogOpenChange={setDefenseCompleteDialogOpen}
              onResultRecorded={handleDefenseResultRecorded}
              compact
            />
          </Stack>
        )}

        {activeTabId === "invites" && (
          <InvitationsSection
            projectId={id}
            project={project}
            canInviteSupervisor={canInviteSupervisor}
            canManageProject={canManageProject}
            compact
          />
        )}

        {activeTabId === "tasks" && (
          <TasksTab
            projectId={project.id}
            projectDescription={project?.description}
            showAiGenerate={canGenerateAiTasks}
            tasks={tasks}
            setTasks={setTasks}
            updateProgressLocally={updateProgressLocally}
            setDialogConfig={setDialogConfig}
            setDialogLoading={setDialogLoading}
            closeDialog={closeDialog}
            compact
          />
        )}

        {activeTabId === "comments" && (
          <CommentsTab
            projectId={id}
            comments={comments}
            setComments={setComments}
            currentUserId={currentUserId}
            currentRole={currentRole}
            setDialogConfig={setDialogConfig}
            setDialogLoading={setDialogLoading}
            closeDialog={closeDialog}
            compact
          />
        )}

        {activeTabId === "versions" && (
          <VersionsTab
            projectId={id}
            project={project}
            versions={versions}
            setVersions={setVersions}
            currentUserId={currentUserId}
            currentRole={currentRole}
            canUploadVersion={canUploadVersion}
            normalizeFileUrl={normalizeFileUrl}
            setDialogConfig={setDialogConfig}
            setDialogLoading={setDialogLoading}
            closeDialog={closeDialog}
            compact
          />
        )}

        {activeTabId === "timeline" && (
          <ProjectTimeline projectId={id} compact />
        )}
      </Box>

      <ConfirmDialog
        open={dialogConfig.isOpen}
        title={dialogConfig.title}
        content={dialogConfig.content}
        confirmText={dialogConfig.confirmText}
        confirmColor={dialogConfig.confirmColor}
        loading={dialogLoading}
        onClose={closeDialog}
        onConfirm={dialogConfig.onConfirm}
      />

      <CommitteeAssignDialog
        open={assignCommitteeOpen}
        onClose={() => setAssignCommitteeOpen(false)}
        defenseSession={defenseSession}
        onAssigned={async () => {
          toast.success(t("committees.assignSuccess"));
          await reloadProject();
        }}
      />
    </Box>
  );
}

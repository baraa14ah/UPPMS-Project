import React, { useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Stack,
  Button,
  Chip,
  TextField,
  Avatar,
  Grid,
  LinearProgress,
  CircularProgress,
  alpha,
} from "@mui/material";
import toast from "react-hot-toast";
import GitHubIcon from "@mui/icons-material/GitHub";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import TimelineRoundedIcon from "@mui/icons-material/TimelineRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import TaskAltRoundedIcon from "@mui/icons-material/TaskAltRounded";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { textEllipsisSx } from "../../styles/textEllipsis";
import { dashboardCardSx } from "../../styles/dashboardUi";

/** Label-value row for project metadata display. */
function MetaRow({ label, children }) {
  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      spacing={{ xs: 0.5, sm: 2 }}
      sx={{ py: 1.35, borderBottom: "1px solid", borderColor: "divider" }}
    >
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ fontWeight: 800, minWidth: { sm: 150 }, flexShrink: 0 }}
      >
        {label}
      </Typography>
      <Box sx={{ flex: 1, minWidth: 0 }}>{children}</Box>
    </Stack>
  );
}

/** Compact progress ring on the side — click opens tasks tab. */
function CompactProgressAside({ progress, onOpenTasks, t }) {
  const total = Math.max(0, Number(progress?.total) || 0);
  const completed = Math.max(0, Number(progress?.completed) || 0);
  const pending = Math.max(0, total - completed);
  const progressValue = Math.max(0, Math.min(100, Number(progress?.percent) || 0));
  const clickable = Boolean(onOpenTasks);

  return (
    <Paper
      elevation={0}
      sx={{
        ...dashboardCardSx,
        p: { xs: 1.75, md: 2 },
        mb: 0,
      }}
    >
      <Stack
        direction="row"
        spacing={2}
        alignItems="center"
        justifyContent="space-between"
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack
            direction="row"
            spacing={1}
            flexWrap="wrap"
            useFlexGap
            sx={{ mb: 1 }}
          >
            <Chip
              size="small"
              label={`${t("projectDetails.columnCompleted")}: ${completed}`}
              sx={{ fontWeight: 800, bgcolor: alpha("#10B981", 0.12), color: "#059669" }}
            />
            <Chip
              size="small"
              label={`${t("projectDetails.chartTasks")}: ${total}`}
              sx={{ fontWeight: 800, bgcolor: alpha("#8B5CF6", 0.12), color: "#7C3AED" }}
            />
            <Chip
              size="small"
              label={`${t("projectDetails.columnPending")}: ${pending}`}
              sx={{ fontWeight: 800, bgcolor: alpha("#F59E0B", 0.12), color: "#D97706" }}
            />
          </Stack>
          <LinearProgress
            variant="determinate"
            value={progressValue}
            sx={{
              height: 8,
              borderRadius: 99,
              bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
              "& .MuiLinearProgress-bar": { borderRadius: 99 },
            }}
          />
          {clickable && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontWeight: 700, mt: 0.75, display: "block" }}
            >
              {t("projectDetails.progressOpenTasks")}
            </Typography>
          )}
        </Box>

        <Box
          onClick={clickable ? onOpenTasks : undefined}
          onKeyDown={
            clickable
              ? (e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onOpenTasks();
                  }
                }
              : undefined
          }
          role={clickable ? "button" : undefined}
          tabIndex={clickable ? 0 : undefined}
          sx={{
            position: "relative",
            display: "inline-flex",
            flexShrink: 0,
            cursor: clickable ? "pointer" : "default",
          }}
        >
          <CircularProgress
            variant="determinate"
            value={100}
            size={64}
            thickness={4}
            sx={{ color: (theme) => alpha(theme.palette.primary.main, 0.12) }}
          />
          <CircularProgress
            variant="determinate"
            value={progressValue}
            size={64}
            thickness={4}
            sx={{
              position: "absolute",
              left: 0,
              color: "primary.main",
            }}
          />
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              display: "grid",
              placeItems: "center",
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 900, fontSize: "0.8rem" }}>
              {progressValue}%
            </Typography>
          </Box>
        </Box>
      </Stack>
    </Paper>
  );
}

/** Spacious project overview for the details page. */
export default function ProjectInfoCard({
  project,
  setProject,
  progress,
  canEditProject,
  canDeleteProject,
  handleDeleteProject,
  onOpenTasks,
  compact = false,
}) {
  const { authHeaders, apiFetch, API_BASE_URL } = useAuth();
  const { t } = useLanguage();
  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState(project?.title || "");
  const [editDesc, setEditDesc] = useState(project?.description || "");
  const [editGithub, setEditGithub] = useState(project?.github_repo_url || "");
  const [savingProject, setSavingProject] = useState(false);

  const members = Array.isArray(project?.members) ? project.members : [];
  const owner = project?.user
    ? {
        id: project.user.id,
        name: project.user.name,
        email: project.user.email,
        isOwner: true,
      }
    : null;

  const membersWithoutOwner = members.filter((m) => {
    if (!owner) return true;
    const memberId = m.id || m.student_id || m.user_id;
    return memberId !== owner.id;
  });

  const displayMembers = owner
    ? [owner, ...membersWithoutOwner]
    : membersWithoutOwner;
  const membersCount = displayMembers.length;

  const handleUpdateProject = async () => {
    if (!project?.id) return;
    if (!editTitle.trim() || !editDesc.trim())
      return toast.error(t("projectDetails.titleDescRequired"));

    try {
      setSavingProject(true);
      const { res, data } = await apiFetch(
        `${API_BASE_URL}/project/update/${project.id}`,
        {
          method: "PUT",
          headers: authHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({
            title: editTitle,
            description: editDesc,
            github_repo_url: editGithub || null,
          }),
        },
      );
      if (!res.ok) return toast.error(data?.message || t("projectDetails.projectUpdateError"));

      const updated = data?.project || data;
      setProject(updated);
      setEditGithub(updated?.github_repo_url || "");
      setEditOpen(false);
      toast.success(t("projectDetails.projectUpdated"));
    } catch {
      toast.error(t("common.serverError"));
    } finally {
      setSavingProject(false);
    }
  };

  return (
    <Stack spacing={compact ? 1.75 : 3} sx={{ width: "100%" }}>
      <CompactProgressAside progress={progress} onOpenTasks={onOpenTasks} t={t} />

      <Grid container spacing={compact ? 1.75 : 3} alignItems="stretch">
        <Grid size={{ xs: 12, lg: 7 }}>
          <Paper elevation={0} sx={{ ...dashboardCardSx, p: { xs: compact ? 1.75 : 2.5, md: compact ? 2 : 3 }, height: "100%" }}>
            <Typography variant={compact ? "subtitle1" : "h6"} sx={{ fontWeight: 900, mb: compact ? 1.25 : 2 }}>
              {t("projectDetails.projectInfo")}
            </Typography>

            <Box
              sx={{
                p: compact ? 1.5 : 2,
                mb: compact ? 1.5 : 2.5,
                borderRadius: 2.5,
                bgcolor: (theme) =>
                  theme.palette.mode === "dark"
                    ? "rgba(255,255,255,0.03)"
                    : alpha("#2563EB", 0.04),
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              <Typography
                variant="body1"
                sx={{
                  fontWeight: 500,
                  lineHeight: 1.75,
                  fontSize: compact ? "0.9rem" : undefined,
                }}
              >
                {project.description || t("projectDetails.noProjectDescription")}
              </Typography>
            </Box>

            <MetaRow label={t("projectDetails.projectOwner")}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Avatar sx={{ width: 40, height: 40, bgcolor: "primary.main", fontWeight: 900 }}>
                  {project.user?.name?.charAt(0)?.toUpperCase() || "?"}
                </Avatar>
                <Box>
                  <Typography sx={{ fontWeight: 800 }}>{project.user?.name || "—"}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {project.user?.email || "—"}
                  </Typography>
                </Box>
              </Stack>
            </MetaRow>

            <MetaRow label={t("projectDetails.trackStep")}>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                <TimelineRoundedIcon sx={{ fontSize: 18, color: "secondary.main" }} />
                {project.track_stage?.phase_name || project.track_stage?.display_label ? (
                  <Chip
                    size="small"
                    label={
                      project.track_stage.phase_name || project.track_stage.display_label
                    }
                    color="secondary"
                    sx={{ fontWeight: 800 }}
                  />
                ) : (
                  <Typography sx={{ fontWeight: 700, color: "text.secondary" }}>
                    {t("projects.noTrackStep")}
                  </Typography>
                )}
              </Stack>
            </MetaRow>

            <MetaRow label={t("projects.supervisor")}>
              <Stack direction="row" spacing={1} alignItems="center">
                <PersonRoundedIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                <Typography sx={{ fontWeight: 700 }}>
                  {project.supervisor?.name || t("projects.noSupervisor")}
                </Typography>
              </Stack>
            </MetaRow>

            <MetaRow label="GitHub">
              {project.github_repo_url ? (
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Chip
                    component="a"
                    href={project.github_repo_url}
                    target="_blank"
                    rel="noreferrer"
                    clickable
                    icon={<GitHubIcon />}
                    label={t("projectDetails.visitRepo")}
                    sx={{
                      fontWeight: 700,
                      bgcolor: "#24292e",
                      color: "white",
                      "& .MuiChip-icon": { color: "white" },
                    }}
                  />
                  <Chip
                    label={t("projectDetails.linkedToSystem")}
                    size="small"
                    color="success"
                    variant="outlined"
                    sx={{ fontWeight: 800 }}
                  />
                </Stack>
              ) : (
                <Chip
                  label={t("projectDetails.githubNotLinked")}
                  size="small"
                  color="warning"
                  variant="outlined"
                  sx={{ fontWeight: 700 }}
                />
              )}
            </MetaRow>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, lg: 5 }}>
          <Paper elevation={0} sx={{ ...dashboardCardSx, p: { xs: compact ? 1.75 : 2.5, md: compact ? 2 : 3 }, height: "100%" }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: compact ? 1.25 : 2 }}>
              <GroupsRoundedIcon color="primary" />
              <Typography variant={compact ? "subtitle1" : "h6"} sx={{ fontWeight: 900 }}>
                {t("projectDetails.projectMembers")}
              </Typography>
              <Chip size="small" label={membersCount} sx={{ fontWeight: 800 }} />
            </Stack>

            {membersCount === 0 ? (
              <Typography variant="body2" color="text.secondary">
                {t("projectDetails.noMembers")}
              </Typography>
            ) : (
              <Stack spacing={1.25}>
                {displayMembers.map((m) => {
                  const mid = m.id ?? m.user_id;
                  const isOwner = owner && mid === owner.id;
                  return (
                    <Stack
                      key={mid}
                      direction="row"
                      spacing={1.5}
                      alignItems="center"
                      sx={{
                        p: 1.5,
                        borderRadius: 2,
                        border: "1px solid",
                        borderColor: isOwner ? "primary.main" : "divider",
                        bgcolor: isOwner
                          ? (theme) => alpha(theme.palette.primary.main, 0.06)
                          : "transparent",
                      }}
                    >
                      <Avatar
                        sx={{
                          width: 38,
                          height: 38,
                          fontWeight: 800,
                          bgcolor: isOwner ? "primary.main" : "grey.500",
                        }}
                      >
                        {m.name?.charAt(0)?.toUpperCase() || "?"}
                      </Avatar>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography sx={{ fontWeight: 800, ...textEllipsisSx }}>
                          {m.name}
                          {isOwner ? t("projectDetails.ownerBadge") : ""}
                        </Typography>
                        {m.email && (
                          <Typography variant="body2" color="text.secondary" sx={textEllipsisSx}>
                            {m.email}
                          </Typography>
                        )}
                      </Box>
                      {isOwner && (
                        <Chip
                          size="small"
                          label={t("projects.owner")}
                          color="primary"
                          sx={{ fontWeight: 800 }}
                        />
                      )}
                    </Stack>
                  );
                })}
              </Stack>
            )}
          </Paper>
        </Grid>
      </Grid>

      {canEditProject && (
        <Paper elevation={0} sx={{ ...dashboardCardSx, p: { xs: compact ? 1.75 : 2.5, md: compact ? 2 : 3 } }}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", sm: "center" }}
            spacing={1.5}
            sx={{ mb: editOpen ? (compact ? 1.5 : 2.5) : 0 }}
          >
            <Stack direction="row" spacing={1} alignItems="center">
              <SettingsRoundedIcon color="action" />
              <Typography variant={compact ? "subtitle1" : "h6"} sx={{ fontWeight: 900 }}>
                {t("projectDetails.projectSettings")}
              </Typography>
            </Stack>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Button
                variant="outlined"
                onClick={() => {
                  setEditTitle(project?.title || "");
                  setEditDesc(project?.description || "");
                  setEditGithub(project?.github_repo_url || "");
                  setEditOpen((v) => !v);
                }}
                sx={{ borderRadius: 2, fontWeight: 800 }}
              >
                {editOpen ? t("projectDetails.close") : t("common.edit")}
              </Button>
              {canDeleteProject && (
                <Button
                  color="error"
                  variant="contained"
                  onClick={handleDeleteProject}
                  sx={{ borderRadius: 2, fontWeight: 800 }}
                >
                  {t("projectDetails.deleteProject")}
                </Button>
              )}
            </Stack>
          </Stack>

          {editOpen && (
            <Stack spacing={2}>
              <TextField
                label={t("projectDetails.projectName")}
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                fullWidth
              />
              <TextField
                label={t("projectDetails.projectDescription")}
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                multiline
                minRows={4}
                fullWidth
              />
              <TextField
                label={t("projectDetails.githubLink")}
                value={editGithub}
                onChange={(e) => setEditGithub(e.target.value)}
                placeholder="https://github.com/username/repository"
                fullWidth
              />
              <Button
                variant="contained"
                onClick={handleUpdateProject}
                disabled={savingProject}
                startIcon={<TaskAltRoundedIcon />}
                sx={{ borderRadius: 2, fontWeight: 900, alignSelf: "flex-start", px: 3 }}
              >
                {savingProject ? t("projectDetails.saving") : t("projectDetails.saveChanges")}
              </Button>
            </Stack>
          )}
        </Paper>
      )}
    </Stack>
  );
}

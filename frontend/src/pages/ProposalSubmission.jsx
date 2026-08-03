import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormHelperText,
  Grid,
  InputLabel,
  LinearProgress,
  ListSubheader,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
  alpha,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import FolderSpecialRoundedIcon from "@mui/icons-material/FolderSpecialRounded";
import HourglassTopRoundedIcon from "@mui/icons-material/HourglassTopRounded";
import LightbulbRoundedIcon from "@mui/icons-material/LightbulbRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import ReplayRoundedIcon from "@mui/icons-material/ReplayRounded";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import PageHeader from "../components/PageHeader";
import ProposalStatusBadge from "../components/ProposalStatusBadge";
import ProposalPageSkeleton from "../components/loading/ProposalPageSkeleton";
import {
  sectionPaperSx,
  btnPrimarySx,
  headerActionBtnSx,
} from "../styles/dashboardUi";

const pageShellSx = { width: "100%", maxWidth: 1400, mx: "auto" };
const panelSx = { ...sectionPaperSx, mb: 0, p: { xs: 2, md: 2.5 } };

const dialogFieldSx = {
  "& .MuiInputLabel-root": {
    fontWeight: 700,
    bgcolor: "background.paper",
    px: 0.75,
  },
};

function getRequestedSupervisorName(proposal) {
  return (
    proposal?.requested_supervisor?.name ||
    proposal?.requestedSupervisor?.name ||
    ""
  );
}

const MAX_PROPOSALS = 3;

function findPhaseForStepId(tracks, stepId) {
  if (!stepId) return null;
  const numericId = Number(stepId);
  for (const track of tracks) {
    for (const phase of track.phases || []) {
      if (
        phase.current_step_id === numericId ||
        (phase.step_ids || []).includes(numericId)
      ) {
        return { track, phase };
      }
    }
  }
  return null;
}

function listProposalPhases(tracks) {
  return tracks.flatMap((track) =>
    (track.phases || []).map((phase) => ({
      track,
      phase,
      stepId: phase.current_step_id,
    })),
  );
}

function isPhaseLocked(phase) {
  return !phase?.unlocked || !phase?.current_step_id;
}

function ProposalStatusPanel({
  t,
  activeProject,
  pendingProposal,
  rejectedProposal,
  atProposalLimit,
  onResubmit,
  onNewProposal,
}) {
  if (activeProject?.id) {
    return (
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        alignItems={{ xs: "flex-start", sm: "center" }}
        justifyContent="space-between"
      >
        <Stack direction="row" spacing={1.5} alignItems="flex-start">
          <StatusIcon color="#10B981" icon={<FolderSpecialRoundedIcon />} />
          <Box>
            <Typography sx={{ fontWeight: 900 }}>
              {t("proposals.statusActiveProjectTitle")}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {t("proposals.statusActiveProjectBody")}
            </Typography>
            <Typography variant="body2" sx={{ mt: 1, fontWeight: 800 }}>
              {activeProject.title}
            </Typography>
          </Box>
        </Stack>
        <Button
          component={RouterLink}
          to={`/dashboard/projects/${activeProject.id}`}
          variant="contained"
          endIcon={<OpenInNewRoundedIcon />}
          sx={{ ...btnPrimarySx, borderRadius: 2, whiteSpace: "nowrap" }}
        >
          {t("proposals.openProject")}
        </Button>
      </Stack>
    );
  }

  if (pendingProposal) {
    return (
      <Stack spacing={1.5}>
        <Stack direction="row" spacing={1.5} alignItems="flex-start">
          <StatusIcon color="#F59E0B" icon={<HourglassTopRoundedIcon />} />
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontWeight: 900 }}>
              {t("proposals.statusPendingTitle")}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {t("proposals.statusPendingBody")}
            </Typography>
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{ mt: 1.25 }}
              flexWrap="wrap"
              useFlexGap
            >
              <Typography variant="body2" sx={{ fontWeight: 800 }}>
                {pendingProposal.title}
              </Typography>
              <ProposalStatusBadge status="pending" />
            </Stack>
          </Box>
        </Stack>
        {!atProposalLimit && (
          <Button
            size="small"
            variant="outlined"
            onClick={onNewProposal}
            sx={{ fontWeight: 800, borderRadius: 2, alignSelf: "flex-start" }}
          >
            {t("proposals.startNewProposal")}
          </Button>
        )}
      </Stack>
    );
  }

  if (rejectedProposal) {
    return (
      <Stack spacing={1.5}>
        <Stack direction="row" spacing={1.5} alignItems="flex-start">
          <StatusIcon color="#EF4444" icon={<ReplayRoundedIcon />} />
          <Box>
            <Typography sx={{ fontWeight: 900 }}>
              {t("proposals.statusRejectedTitle")}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {rejectedProposal.supervisor_feedback || t("proposals.rejectedHint")}
            </Typography>
          </Box>
        </Stack>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Button
            size="small"
            variant="outlined"
            onClick={onResubmit}
            sx={{ fontWeight: 800, borderRadius: 2 }}
          >
            {t("proposals.modifyResubmit")}
          </Button>
          {!atProposalLimit && (
            <Button
              size="small"
              variant="outlined"
              onClick={onNewProposal}
              sx={{ fontWeight: 800, borderRadius: 2 }}
            >
              {t("proposals.startNewProposal")}
            </Button>
          )}
        </Stack>
      </Stack>
    );
  }

  return (
    <Stack direction="row" spacing={1.5} alignItems="flex-start">
      <StatusIcon
        color={atProposalLimit ? "#F59E0B" : "#3B82F6"}
        icon={<LightbulbRoundedIcon />}
      />
      <Box>
        <Typography sx={{ fontWeight: 900 }}>
          {atProposalLimit
            ? t("proposals.statusLimitTitle")
            : t("proposals.statusReadyTitle")}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {atProposalLimit
            ? t("proposals.deleteToFreeSlot")
            : t("proposals.statusReadyBody")}
        </Typography>
      </Box>
    </Stack>
  );
}

function StatusIcon({ color, icon }) {
  return (
    <Box
      sx={{
        width: 44,
        height: 44,
        borderRadius: 2,
        display: "grid",
        placeItems: "center",
        bgcolor: alpha(color, 0.12),
        color,
        flexShrink: 0,
      }}
    >
      {icon}
    </Box>
  );
}

function ProposalFormDialog({
  open,
  onClose,
  formMode,
  title,
  onTitleChange,
  description,
  onDescriptionChange,
  supervisorId,
  onSupervisorChange,
  selectedStageId,
  onStageChange,
  supervisors,
  availableTracks,
  formatSupervisorLabel,
  resolveSupervisorLabel,
  isSupervisorBlocked,
  editingProposal,
  canSubmit,
  submitting,
  onSubmit,
  t,
}) {
  const requiresStage = availableTracks.length > 0;
  const stageError = requiresStage && !selectedStageId;
  const showTrackHeaders = availableTracks.length > 1;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          border: "1px solid",
          borderColor: "divider",
          overflow: "visible",
        },
      }}
    >
      <Box
        component="form"
        onSubmit={onSubmit}
        sx={{ display: "flex", flexDirection: "column" }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                display: "grid",
                placeItems: "center",
                bgcolor: alpha("#8B5CF6", 0.12),
                color: "#7C3AED",
              }}
            >
              <LightbulbRoundedIcon />
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 900, lineHeight: 1.3 }}>
                {formMode === "resubmit"
                  ? t("proposals.modifyResubmit")
                  : t("proposals.workspaceTitle")}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                {t("proposals.workspaceSubtitle")}
              </Typography>
            </Box>
          </Stack>
        </DialogTitle>

        <DialogContent
          sx={{
            px: 3,
            pt: 3,
            pb: 2,
            overflow: "visible",
          }}
        >
          <Stack spacing={2.5}>
            <TextField
              label={t("proposals.proposalTitle")}
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              inputProps={{ maxLength: 200 }}
              helperText={`${title.length}/200`}
              required
              fullWidth
              autoFocus
              sx={dialogFieldSx}
              InputLabelProps={{ shrink: true }}
            />
            <FormControl fullWidth required sx={dialogFieldSx}>
              <InputLabel shrink>{t("proposals.selectSupervisor")}</InputLabel>
              <Select
                label={t("proposals.selectSupervisor")}
                value={supervisorId}
                onChange={(e) => onSupervisorChange(e.target.value)}
                renderValue={resolveSupervisorLabel}
                displayEmpty
                notched
                MenuProps={{ PaperProps: { sx: { maxHeight: 280 } } }}
              >
                {supervisors.length === 0 ? (
                  <MenuItem disabled value="">
                    {t("proposals.noSupervisorsAvailable")}
                  </MenuItem>
                ) : (
                  supervisors.map((supervisor) => {
                    const blocked = isSupervisorBlocked(supervisor);
                    return (
                      <MenuItem
                        key={supervisor.id}
                        value={String(supervisor.id)}
                        disabled={blocked}
                      >
                        {formatSupervisorLabel(supervisor)}
                        {blocked ? ` — ${t("proposals.supervisorBlocked")}` : ""}
                      </MenuItem>
                    );
                  })
                )}
              </Select>
            </FormControl>
            {requiresStage && (
              <FormControl
                fullWidth
                required
                error={stageError}
                sx={dialogFieldSx}
              >
                <InputLabel shrink>{t("progress.selectStage")}</InputLabel>
                <Select
                  label={t("progress.selectStage")}
                  value={selectedStageId}
                  onChange={(e) => onStageChange(e.target.value)}
                  displayEmpty
                  notched
                  renderValue={(value) => {
                    if (!value) return "";
                    const match = findPhaseForStepId(availableTracks, value);
                    if (!match) return String(value);
                    const { track, phase } = match;
                    return showTrackHeaders
                      ? `${track.name} · ${phase.name}`
                      : phase.name;
                  }}
                >
                  {availableTracks.map((track) => {
                    const phases = track.phases || [];
                    const phaseItems = phases.map((phase) => {
                      const locked = isPhaseLocked(phase);
                      const resubmitStepId =
                        formMode === "resubmit" &&
                        editingProposal?.track_stage_id &&
                        (phase.step_ids || []).includes(
                          Number(editingProposal.track_stage_id),
                        )
                          ? Number(editingProposal.track_stage_id)
                          : null;
                      const selectValue = resubmitStepId || phase.current_step_id;
                      const itemLocked =
                        locked && !resubmitStepId;

                      return (
                        <MenuItem
                          key={`${track.id}-${phase.id || phase.name}`}
                          value={String(selectValue || "")}
                          disabled={itemLocked || !selectValue}
                          sx={{ pl: showTrackHeaders ? 3 : 2 }}
                        >
                          {phase.name}
                          {itemLocked ? ` — ${t("progress.lockedStageSuffix")}` : ""}
                        </MenuItem>
                      );
                    });

                    if (!showTrackHeaders) {
                      return phaseItems;
                    }

                    return [
                      <ListSubheader
                        key={`track-${track.id}`}
                        sx={{ fontWeight: 900, lineHeight: 2.2 }}
                      >
                        {track.name}
                      </ListSubheader>,
                      ...phaseItems,
                    ];
                  })}
                </Select>
                <FormHelperText>
                  {stageError
                    ? t("progress.stageRequired")
                    : t("progress.selectStageHint")}
                </FormHelperText>
              </FormControl>
            )}
            <TextField
              label={t("proposals.proposalDescription")}
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              inputProps={{ maxLength: 5000 }}
              helperText={`${description.length}/5000`}
              required
              fullWidth
              multiline
              minRows={4}
              sx={dialogFieldSx}
              InputLabelProps={{ shrink: true }}
            />
            {formMode === "resubmit" && editingProposal && (
              <Alert severity="info" sx={{ borderRadius: 2, py: 0.5 }}>
                {t("proposals.remainingAttempts", {
                  count: Math.max(0, 3 - (editingProposal.resubmission_count || 0)),
                })}
              </Alert>
            )}
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5, pt: 0 }}>
          <Button onClick={onClose} disabled={submitting} sx={{ fontWeight: 800 }}>
            {t("common.cancel")}
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={!canSubmit || submitting}
            sx={{ ...btnPrimarySx, borderRadius: 2, px: 3 }}
          >
            {submitting
              ? t("common.loading")
              : formMode === "resubmit"
                ? t("proposals.resubmit")
                : t("proposals.submit")}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

/** Student page for submitting and resubmitting project proposals. */
export default function ProposalSubmission() {
  const { apiFetch, authHeaders, API_BASE_URL, refreshProfile } = useAuth();
  const { t, lang } = useLanguage();
  const dateLocale = lang === "ar" ? "ar-EG" : "en-US";
  const location = useLocation();
  const navigate = useNavigate();
  const prefillHandled = useRef(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [supervisorId, setSupervisorId] = useState("");
  const [selectedStageId, setSelectedStageId] = useState("");
  const [availableTracks, setAvailableTracks] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [formMode, setFormMode] = useState(null);
  const [editingProposal, setEditingProposal] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const activeProposalsCount = useMemo(
    () => proposals.filter((p) => p.status !== "approved").length,
    [proposals],
  );
  const atProposalLimit = activeProposalsCount >= MAX_PROPOSALS;
  const pendingProposal = useMemo(
    () => proposals.find((p) => p.status === "pending"),
    [proposals],
  );
  const rejectedProposal = useMemo(
    () => proposals.find((p) => p.status === "rejected"),
    [proposals],
  );
  const approvedProposal = useMemo(
    () => proposals.find((p) => p.status === "approved"),
    [proposals],
  );
  const activeProject = approvedProposal?.project || null;
  const hasActiveProject = Boolean(activeProject?.id);
  const ideasPercent = Math.round((activeProposalsCount / MAX_PROPOSALS) * 100);
  const canShowAddButton =
    !hasActiveProject && !atProposalLimit;
  const formOpen = formMode !== null;

  const loadSupervisors = useCallback(async () => {
    const { res, data } = await apiFetch(
      `${API_BASE_URL}/supervisors/available`,
      { headers: authHeaders() },
    );
    if (!res.ok) throw new Error(data?.message || t("common.serverError"));
    setSupervisors(Array.isArray(data?.data) ? data.data : []);
  }, [apiFetch, authHeaders, API_BASE_URL, t]);

  const loadAvailableStages = useCallback(async () => {
    const { res, data } = await apiFetch(
      `${API_BASE_URL}/tracks/available-stages`,
      { headers: authHeaders() },
    );
    if (res.ok) setAvailableTracks(Array.isArray(data?.data) ? data.data : []);
  }, [apiFetch, authHeaders, API_BASE_URL]);

  const loadProposals = useCallback(async () => {
    const { res, data } = await apiFetch(`${API_BASE_URL}/proposals`, {
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error(data?.message || t("common.serverError"));
    setProposals(Array.isArray(data?.data) ? data.data : []);
  }, [apiFetch, authHeaders, API_BASE_URL, t]);

  const loadPage = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      await Promise.all([
        loadSupervisors(),
        loadProposals(),
        loadAvailableStages(),
      ]);
    } catch (err) {
      setError(err.message || t("common.serverError"));
    } finally {
      setLoading(false);
    }
  }, [loadSupervisors, loadProposals, loadAvailableStages, t]);

  const closeForm = useCallback(() => {
    setFormMode(null);
    setEditingProposal(null);
    setTitle("");
    setDescription("");
    setSupervisorId("");
    setSelectedStageId("");
  }, []);

  useEffect(() => {
    loadPage();
  }, [loadPage]);

  useEffect(() => {
    if (hasActiveProject) {
      closeForm();
    }
  }, [hasActiveProject, closeForm]);

  const formatSupervisorLabel = useCallback(
    (supervisor) => {
      if (!supervisor?.name) return "";
      return `${supervisor.name} (${t("proposals.pendingCount", {
        count: supervisor.pending_proposals_count || 0,
      })})`;
    },
    [t],
  );

  const resolveSupervisorLabel = useCallback(
    (selectedId) => {
      const found = supervisors.find((s) => String(s.id) === String(selectedId));
      if (found) return formatSupervisorLabel(found);
      return (
        getRequestedSupervisorName(editingProposal) || String(selectedId || "")
      );
    },
    [supervisors, formatSupervisorLabel, editingProposal],
  );

  const isSupervisorBlocked = useCallback(
    (supervisor) => {
      if (formMode !== "resubmit" || !editingProposal) return false;
      const sameSupervisor =
        Number(supervisor.id) ===
        Number(editingProposal.requested_supervisor_id);
      return sameSupervisor && (editingProposal.resubmission_count || 0) >= 3;
    },
    [formMode, editingProposal],
  );

  const startResubmit = (proposal = rejectedProposal) => {
    if (!proposal) return;
    setFormMode("resubmit");
    setEditingProposal(proposal);
    setTitle(proposal.title || "");
    setDescription(proposal.description || "");
    setSupervisorId(String(proposal.requested_supervisor_id || ""));
    setSelectedStageId(
      proposal.track_stage_id ? String(proposal.track_stage_id) : "",
    );
  };

  const startNewProposal = (prefill = null) => {
    if (hasActiveProject || atProposalLimit) return;
    setFormMode("new");
    setEditingProposal(null);
    setTitle(String(prefill?.title || "").slice(0, 200));
    setDescription(String(prefill?.description || "").slice(0, 5000));
    setSupervisorId("");
    const unlocked = listProposalPhases(availableTracks).filter(
      ({ phase }) => phase.unlocked && phase.current_step_id,
    );
    setSelectedStageId(
      unlocked.length === 1 ? String(unlocked[0].phase.current_step_id) : "",
    );
  };

  useEffect(() => {
    if (loading || prefillHandled.current) return;
    const prefill = location.state?.prefill;
    if (!prefill?.title) return;

    prefillHandled.current = true;
    navigate(location.pathname, { replace: true, state: {} });

    if (hasActiveProject || atProposalLimit) {
      toast.error(
        hasActiveProject
          ? t("proposals.statusActiveProjectTitle")
          : t("proposals.maxProposalsReached", { max: MAX_PROPOSALS }),
      );
      return;
    }

    startNewProposal(prefill);
    toast.success(t("ideation.adoptPrefillReady"));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open once from ideation navigation
  }, [loading, location.state, hasActiveProject, atProposalLimit]);

  const requiresStage = availableTracks.length > 0;

  const canSubmit = useMemo(() => {
    if (!formOpen || hasActiveProject || !title.trim() || !description.trim() || !supervisorId)
      return false;
    if (requiresStage && !selectedStageId) return false;
    if (title.length > 200 || description.length > 5000) return false;
    if (formMode === "new" && atProposalLimit) return false;
    const selected = supervisors.find((s) => String(s.id) === supervisorId);
    if (selected && isSupervisorBlocked(selected)) return false;
    if (requiresStage && selectedStageId) {
      const match = findPhaseForStepId(availableTracks, selectedStageId);
      if (!match) return false;
      const { phase } = match;
      const stepId = Number(selectedStageId);
      const allowedStep =
        phase.current_step_id === stepId ||
        (formMode === "resubmit" &&
          (phase.step_ids || []).includes(stepId));
      if (!allowedStep || (isPhaseLocked(phase) && formMode !== "resubmit")) {
        return false;
      }
    }
    return true;
  }, [
    formOpen,
    hasActiveProject,
    title,
    description,
    supervisorId,
    selectedStageId,
    requiresStage,
    availableTracks,
    supervisors,
    isSupervisorBlocked,
    formMode,
    atProposalLimit,
  ]);

  const handleDelete = async () => {
    if (!deleteTarget?.id) return;
    setDeleting(true);
    try {
      const { res, data } = await apiFetch(
        `${API_BASE_URL}/proposals/${deleteTarget.id}`,
        { method: "DELETE", headers: authHeaders() },
      );
      if (!res.ok) {
        toast.error(data?.message || t("common.error"));
        return;
      }
      toast.success(t("proposals.deleteSuccess"));
      setDeleteTarget(null);
      if (editingProposal?.id === deleteTarget.id) closeForm();
      await loadPage();
      if (typeof refreshProfile === "function") {
        await refreshProfile();
      }    } catch {
      toast.error(t("common.serverError"));
    } finally {
      setDeleting(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError("");

    const isResubmit = formMode === "resubmit" && Boolean(editingProposal?.id);
    const url = isResubmit
      ? `${API_BASE_URL}/proposals/${editingProposal.id}`
      : `${API_BASE_URL}/proposals`;
    const method = isResubmit ? "PUT" : "POST";

    try {
      const { res, data } = await apiFetch(url, {
        method,
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          requested_supervisor_id: Number(supervisorId),
          ...(requiresStage || selectedStageId
            ? { track_stage_id: Number(selectedStageId) }
            : {}),
        }),
      });

      if (!res.ok) {
        const msg =
          data?.message ||
          Object.values(data?.errors || {})
            .flat()
            .join(" | ") ||
          t("common.error");
        setError(msg);
        toast.error(msg);
        return;
      }

      toast.success(
        isResubmit
          ? t("proposals.resubmitSuccess")
          : t("proposals.submitSuccess"),
      );
      closeForm();
      await loadProposals();
    } catch {
      const msg = t("common.serverError");
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box sx={pageShellSx}>
        <PageHeader
          title={t("proposals.title")}
          subtitle={t("proposals.subtitle")}
          icon={<DescriptionRoundedIcon />}
        />
        <ProposalPageSkeleton />
      </Box>
    );
  }

  return (
    <Box sx={pageShellSx}>
      <PageHeader
        title={t("proposals.title")}
        subtitle={t("proposals.subtitle")}
        icon={<DescriptionRoundedIcon />}
        actions={
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <Chip
              label={t("proposals.proposalLimit", {
                count: activeProposalsCount,
                max: MAX_PROPOSALS,
              })}
              sx={{
                fontWeight: 800,
                color: "#fff",
                bgcolor: "rgba(255,255,255,0.14)",
                border: "1px solid rgba(255,255,255,0.35)",
              }}
            />
            <Button
              variant="outlined"
              startIcon={<RefreshRoundedIcon />}
              onClick={loadPage}
              sx={headerActionBtnSx}
            >
              {t("common.refresh")}
            </Button>
          </Stack>
        }
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      <Stack spacing={2.5}>
        <Paper elevation={0} sx={panelSx}>
          <Grid container spacing={2.5} alignItems="stretch">
            <Grid size={{ xs: 12, md: 4 }}>
              <Box
                sx={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  pr: { md: 1 },
                }}
              >
                <Typography
                  variant="overline"
                  sx={{ fontWeight: 900, letterSpacing: 1, color: "text.secondary" }}
                >
                  {t("proposals.ideasQuota")}
                </Typography>
                <Stack
                  direction="row"
                  alignItems="baseline"
                  spacing={0.5}
                  sx={{ mt: 0.5, mb: 1 }}
                >
                  <Typography variant="h3" sx={{ fontWeight: 900, lineHeight: 1 }}>
                    {activeProposalsCount}
                  </Typography>
                  <Typography
                    variant="h6"
                    color="text.secondary"
                    sx={{ fontWeight: 800 }}
                  >
                    / {MAX_PROPOSALS}
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={ideasPercent}
                  color={atProposalLimit ? "warning" : "primary"}
                  sx={{ height: 8, borderRadius: 99, mb: 1 }}
                />
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontWeight: 700 }}
                >
                  {t("proposals.ideasMeter", {
                    count: activeProposalsCount,
                    max: MAX_PROPOSALS,
                  })}
                </Typography>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, md: 8 }}>
              <Box
                sx={{
                  height: "100%",
                  pl: { md: 2 },
                  borderLeft: { md: "1px solid" },
                  borderColor: { md: "divider" },
                }}
              >
                <ProposalStatusPanel
                  t={t}
                  activeProject={activeProject}
                  pendingProposal={pendingProposal}
                  rejectedProposal={rejectedProposal}
                  atProposalLimit={atProposalLimit}
                  onResubmit={startResubmit}
                  onNewProposal={startNewProposal}
                />
              </Box>
            </Grid>
          </Grid>
        </Paper>

        <Paper elevation={0} sx={panelSx}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", sm: "center" }}
            spacing={1.5}
            sx={{ mb: 2 }}
          >
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 900 }}>
                {t("proposals.myProposals")}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                {t("proposals.listSubtitle")}
              </Typography>
            </Box>
            {canShowAddButton && (
              <Button
                variant="contained"
                startIcon={<AddRoundedIcon />}
                onClick={startNewProposal}
                sx={{ ...btnPrimarySx, borderRadius: 2, whiteSpace: "nowrap" }}
              >
                {t("proposals.startNewProposal")}
              </Button>
            )}
          </Stack>

          {proposals.length === 0 ? (
            <Box
              sx={{
                py: 5,
                textAlign: "center",
                borderRadius: 2.5,
                border: "1px dashed",
                borderColor: "divider",
                bgcolor: "background.default",
              }}
            >
              <LightbulbRoundedIcon
                sx={{ fontSize: 40, color: "text.disabled", mb: 1 }}
              />
              <Typography color="text.secondary" sx={{ fontWeight: 700 }}>
                {t("proposals.noProposals")}
              </Typography>
            </Box>
          ) : (
            <Grid container spacing={2}>
              {proposals.map((proposal) => (
                <Grid key={proposal.id} size={{ xs: 12, md: 6, lg: 4 }}>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2,
                      height: "100%",
                      borderRadius: 2.5,
                      borderColor: "divider",
                      bgcolor: "background.default",
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <Stack spacing={1} sx={{ flex: 1 }}>
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="flex-start"
                        gap={1}
                      >
                        <Typography sx={{ fontWeight: 800, lineHeight: 1.4, flex: 1 }}>
                          {proposal.title}
                        </Typography>
                        <ProposalStatusBadge status={proposal.status} />
                      </Stack>
                      <Stack direction="row" spacing={0.75} alignItems="center">
                        <PersonRoundedIcon
                          sx={{ fontSize: 16, color: "text.secondary" }}
                        />
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ fontWeight: 700 }}
                        >
                          {getRequestedSupervisorName(proposal) || "—"}
                        </Typography>
                      </Stack>
                      {proposal.created_at && (
                        <Typography
                          variant="caption"
                          color="text.disabled"
                          sx={{ fontWeight: 600 }}
                        >
                          {new Date(proposal.created_at).toLocaleDateString(dateLocale)}
                        </Typography>
                      )}
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: "auto", pt: 1 }}>
                        {proposal.project?.id && (
                          <Button
                            component={RouterLink}
                            to={`/dashboard/projects/${proposal.project.id}`}
                            size="small"
                            variant="outlined"
                            sx={{ fontWeight: 800, borderRadius: 2 }}
                          >
                            {t("proposals.openProject")}
                          </Button>
                        )}
                        {proposal.status === "rejected" && (
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => startResubmit(proposal)}
                            sx={{ fontWeight: 800, borderRadius: 2 }}
                          >
                            {t("proposals.modifyResubmit")}
                          </Button>
                        )}
                        {proposal.status !== "approved" && (
                          <Button
                            size="small"
                            color="error"
                            startIcon={<DeleteOutlineRoundedIcon />}
                            onClick={() => setDeleteTarget(proposal)}
                            sx={{ fontWeight: 800, borderRadius: 2 }}
                          >
                            {t("proposals.deleteProposal")}
                          </Button>
                        )}
                      </Stack>
                    </Stack>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          )}
        </Paper>
      </Stack>

      <ProposalFormDialog
        open={formOpen}
        onClose={closeForm}
        formMode={formMode}
        title={title}
        onTitleChange={setTitle}
        description={description}
        onDescriptionChange={setDescription}
        supervisorId={supervisorId}
        onSupervisorChange={setSupervisorId}
        selectedStageId={selectedStageId}
        onStageChange={setSelectedStageId}
        supervisors={supervisors}
        availableTracks={availableTracks}
        formatSupervisorLabel={formatSupervisorLabel}
        resolveSupervisorLabel={resolveSupervisorLabel}
        isSupervisorBlocked={isSupervisorBlocked}
        editingProposal={editingProposal}
        canSubmit={canSubmit}
        submitting={submitting}
        onSubmit={handleSubmit}
        t={t}
      />

      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => !deleting && setDeleteTarget(null)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 900 }}>
          {t("proposals.deleteConfirmTitle")}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {t("proposals.deleteConfirmBody")}
          </Typography>
          {deleteTarget?.title && (
            <Typography sx={{ fontWeight: 800 }}>{deleteTarget.title}</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)} disabled={deleting}>
            {t("common.cancel")}
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? t("common.loading") : t("proposals.deleteProposal")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

import React, { useEffect, useState } from "react";
import {
  Paper,
  Typography,
  Stack,
  Chip,
  Divider,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  RadioGroup,
  FormControlLabel,
  Radio,
  Box,
} from "@mui/material";
import EventRoundedIcon from "@mui/icons-material/EventRounded";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import MeetingRoomRoundedIcon from "@mui/icons-material/MeetingRoomRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import StarIcon from "@mui/icons-material/Star";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import HourglassEmptyRoundedIcon from "@mui/icons-material/HourglassEmptyRounded";
import GavelRoundedIcon from "@mui/icons-material/GavelRounded";
import TaskAltRoundedIcon from "@mui/icons-material/TaskAltRounded";
import toast from "react-hot-toast";
import ProjectSectionShell from "../../../components/projects/ProjectSectionShell";
import ButtonSpinner from "../../../components/shared/ButtonSpinner";
import { dayLabel } from "../../../config/schedulingDays";
import { useLanguage } from "../../../context/LanguageContext";
import { useAuth } from "../../../context/AuthContext";

/** Shows scheduled defense session info and optional result recording. */
export default function DefenseSessionCard({
  defenseSession,
  canAssignCommittee = false,
  onAssignCommittee,
  canRecordResult = false,
  onResultRecorded,
  defenseResult = null,
  isChair = false,
  resultDialogOpen: controlledDialogOpen,
  onResultDialogOpenChange,
  completeDialogOpen: controlledCompleteOpen,
  onCompleteDialogOpenChange,
  compact = false,
}) {
  const { t } = useLanguage();
  const { apiFetch, authHeaders, API_BASE_URL } = useAuth();

  const [internalDialogOpen, setInternalDialogOpen] = useState(false);
  const [internalCompleteOpen, setInternalCompleteOpen] = useState(false);
  const [selectedResult, setSelectedResult] = useState("passed");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const resultDialogOpen = controlledDialogOpen ?? internalDialogOpen;
  const setResultDialogOpen = onResultDialogOpenChange ?? setInternalDialogOpen;
  const completeDialogOpen = controlledCompleteOpen ?? internalCompleteOpen;
  const setCompleteDialogOpen = onCompleteDialogOpenChange ?? setInternalCompleteOpen;

  const stageIsDecisive = defenseResult?.stage_is_decisive !== false;

  useEffect(() => {
    if (defenseResult?.result) {
      setSelectedResult(defenseResult.result);
    }
  }, [defenseResult?.result]);

  if (!defenseSession) return null;

  const dayName =
    dayLabel(defenseSession.scheduled_day_of_week, t) ||
    defenseSession.day_name ||
    "—";

  const timeRange =
    defenseSession.time_range ||
    (defenseSession.scheduled_start_time && defenseSession.scheduled_end_time
      ? `${String(defenseSession.scheduled_start_time).slice(0, 5)} - ${String(defenseSession.scheduled_end_time).slice(0, 5)}`
      : "—");

  const displayCommittee =
    defenseSession.display_committee || defenseSession.displayCommittee || null;

  const committeeMembers = displayCommittee?.members?.length
    ? displayCommittee.members
    : (defenseSession.committee_members || defenseSession.committeeMembers || []).map(
        (member) => ({
          ...member,
          role: member.role || "member",
        }),
      );

  const committeeName = displayCommittee?.name || defenseSession.committee?.name || null;
  const academicStageName =
    defenseSession.approved_schedule?.academic_stage?.name ||
    defenseSession.approvedSchedule?.academicStage?.name ||
    null;

  const hasResult = Boolean(defenseResult?.result);
  const passed = defenseResult?.result === "passed";
  const failed = defenseResult?.result === "failed";
  const incomplete = defenseResult?.result === "incomplete";

  const applyRecordedPayload = (payload) => {
    onResultRecorded?.({
      result: payload?.result,
      recorded_at: payload?.recorded_at,
      stage_name: payload?.stage_name,
      stage_is_decisive: payload?.stage_is_decisive ?? stageIsDecisive,
      recorded_by: payload?.recorded_by,
      next_stage: payload?.next_stage,
      track_completed: payload?.track_completed,
      graduated: payload?.graduated,
      project_status: payload?.project_status,
    });
  };

  const handleRecordResult = async () => {
    setSubmitting(true);
    try {
      const { res, data } = await apiFetch(
        `${API_BASE_URL}/defense-sessions/${defenseSession.id}/record-result`,
        {
          method: "POST",
          headers: authHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({
            result: selectedResult,
            reason: reason.trim() || null,
          }),
        },
      );
      if (!res.ok) {
        throw new Error(
          data?.message ||
            Object.values(data?.errors || {})
              .flat()
              .join(" | ") ||
            t("common.error"),
        );
      }
      toast.success(t("defenseResult.recorded"));
      setResultDialogOpen(false);
      setReason("");
      applyRecordedPayload(data?.data);
    } catch (err) {
      toast.error(err.message || t("common.error"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompleteStage = async () => {
    setSubmitting(true);
    try {
      const { res, data } = await apiFetch(
        `${API_BASE_URL}/defense-sessions/${defenseSession.id}/complete-stage`,
        {
          method: "POST",
          headers: authHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({
            reason: reason.trim() || null,
          }),
        },
      );
      if (!res.ok) {
        throw new Error(
          data?.message ||
            Object.values(data?.errors || {})
              .flat()
              .join(" | ") ||
            t("common.error"),
        );
      }
      toast.success(t("defenseResult.stageCompleted"));
      setCompleteDialogOpen(false);
      setReason("");
      applyRecordedPayload(data?.data);
    } catch (err) {
      toast.error(err.message || t("common.error"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ProjectSectionShell
      title={t("defenseResult.sessionTitle")}
      icon={EventRoundedIcon}
      compact={compact}
      sx={{ mb: compact ? 0 : 3 }}
    >
      <Alert
        severity={
          hasResult ? (passed ? "success" : failed ? "error" : "warning") : "info"
        }
        sx={{ mb: 2 }}
      >
        {hasResult
          ? stageIsDecisive
            ? t("defenseResult.sessionRecordedHint")
            : t("defenseResult.sessionCompletedHint")
          : stageIsDecisive
            ? t("defenseResult.sessionScheduledHint")
            : t("defenseResult.sessionScheduledNonDecisiveHint")}
      </Alert>

      <Stack spacing={1.5}>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {academicStageName && (
            <Chip
              size="small"
              label={`${t("defenseResult.schedulingStage")}: ${academicStageName}`}
              color="primary"
              variant="outlined"
              sx={{ fontWeight: 700 }}
            />
          )}
          <Chip
            size="small"
            label={stageIsDecisive ? t("tracks.decisiveStage") : t("tracks.nonDecisiveStage")}
            color={stageIsDecisive ? "secondary" : "default"}
            variant="outlined"
            sx={{ fontWeight: 700 }}
          />
        </Stack>

        {(defenseSession.formatted_date || defenseSession.scheduled_date) && (
          <Stack direction="row" spacing={1} alignItems="center">
            <EventRoundedIcon fontSize="small" color="primary" />
            <Typography variant="body1" sx={{ fontWeight: 800 }}>
              {defenseSession.formatted_date || defenseSession.scheduled_date}
            </Typography>
          </Stack>
        )}

        <Stack direction="row" spacing={1} alignItems="center">
          <EventRoundedIcon fontSize="small" color="action" />
          <Typography variant="body1" sx={{ fontWeight: 600 }}>
            {dayName}
          </Typography>
        </Stack>

        <Stack direction="row" spacing={1} alignItems="center">
          <AccessTimeRoundedIcon fontSize="small" color="primary" />
          <Typography variant="body1">{timeRange}</Typography>
        </Stack>

        <Stack direction="row" spacing={1} alignItems="center">
          <MeetingRoomRoundedIcon fontSize="small" color="primary" />
          <Typography variant="body1">
            {defenseSession.room?.name || t("defenseResult.roomPending")}
          </Typography>
        </Stack>

        {hasResult && (
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              bgcolor: passed ? "success.50" : failed ? "error.50" : "warning.50",
              borderColor: passed ? "success.light" : failed ? "error.light" : "warning.light",
            }}
          >
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              {passed ? (
                <CheckCircleOutlineIcon color="success" />
              ) : failed ? (
                <CancelOutlinedIcon color="error" />
              ) : (
                <HourglassEmptyRoundedIcon color="warning" />
              )}
              <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>
                {stageIsDecisive ? t("defenseResult.title") : t("defenseResult.stageCompletedTitle")}
              </Typography>
              {stageIsDecisive && (
                <Chip
                  size="small"
                  color={passed ? "success" : failed ? "error" : "warning"}
                  label={
                    passed
                      ? t("progress.completed")
                      : failed
                        ? t("progress.failed")
                        : t("progress.incomplete")
                  }
                  sx={{ fontWeight: 800 }}
                />
              )}
            </Stack>
            {defenseResult.stage_name && (
              <Typography variant="body2" sx={{ mt: 1, fontWeight: 600 }}>
                {defenseResult.stage_name}
              </Typography>
            )}
            <Stack spacing={0.25} sx={{ mt: 1 }}>
              {defenseResult.recorded_at && (
                <Typography variant="caption" color="text.secondary">
                  {t("defenseResult.recordedAt")}:{" "}
                  {new Date(defenseResult.recorded_at).toLocaleString()}
                </Typography>
              )}
              {defenseResult.recorded_by && (
                <Typography variant="caption" color="text.secondary">
                  {t("defenseResult.recordedBy")}: {defenseResult.recorded_by}
                </Typography>
              )}
            </Stack>
            {defenseResult.next_stage?.name && passed && (
              <Alert severity="success" sx={{ mt: 1.5 }}>
                {t("defenseResult.projectMovedWithTrack", {
                  name: defenseResult.next_stage.name,
                })}
              </Alert>
            )}
            {(defenseResult.track_completed || defenseResult.graduated) && passed && (
              <Alert severity="success" sx={{ mt: 1.5 }}>
                {t("defenseResult.trackCompletedTitle")} — {t("defenseResult.graduatedLabel")}
              </Alert>
            )}
          </Paper>
        )}

        {canAssignCommittee && (
          <Button variant="outlined" onClick={onAssignCommittee} sx={{ alignSelf: "flex-start" }}>
            {t("committees.assign")}
          </Button>
        )}

        {canRecordResult && stageIsDecisive && (
          <Paper variant="outlined" sx={{ p: 2, bgcolor: "action.hover" }}>
            <Stack direction="row" spacing={1} alignItems="flex-start">
              <GavelRoundedIcon color="secondary" sx={{ mt: 0.25 }} />
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>
                  {isChair ? t("defenseResult.chairActionTitle") : t("defenseResult.adminActionTitle")}
                </Typography>
                <Button
                  variant="contained"
                  color={hasResult ? "warning" : "secondary"}
                  onClick={() => setResultDialogOpen(true)}
                  sx={{ mt: 1, fontWeight: 800 }}
                >
                  {hasResult ? t("defenseResult.update") : t("defenseResult.record")}
                </Button>
              </Box>
            </Stack>
          </Paper>
        )}

        {canRecordResult && !stageIsDecisive && (
          <Paper variant="outlined" sx={{ p: 2, bgcolor: "action.hover" }}>
            <Stack direction="row" spacing={1} alignItems="flex-start">
              <TaskAltRoundedIcon color="primary" sx={{ mt: 0.25 }} />
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>
                  {t("defenseResult.completeStageTitle")}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, lineHeight: 1.65 }}>
                  {t("defenseResult.completeStageHint")}
                </Typography>
                <Button
                  variant="contained"
                  color={hasResult ? "warning" : "primary"}
                  onClick={() => setCompleteDialogOpen(true)}
                  sx={{ mt: 1, fontWeight: 800 }}
                >
                  {hasResult ? t("defenseResult.update") : t("defenseResult.completeStage")}
                </Button>
              </Box>
            </Stack>
          </Paper>
        )}

        {!canRecordResult && !hasResult && committeeMembers.length > 0 && (
          <Typography variant="body2" color="text.secondary">
            {stageIsDecisive
              ? t("defenseResult.waitingForChair")
              : t("defenseResult.waitingForChairComplete")}
          </Typography>
        )}

        {committeeMembers.length > 0 && (
          <>
            <Divider sx={{ my: 1 }} />
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
              <GroupsRoundedIcon fontSize="small" color="action" />
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                {committeeName
                  ? `${t("committees.members")}: ${committeeName}`
                  : t("committees.members")}
              </Typography>
            </Stack>
            <Stack direction="row" flexWrap="wrap" gap={1}>
              {committeeMembers.map((member) => (
                <Chip
                  key={member.id}
                  icon={member.role === "chair" ? <StarIcon /> : undefined}
                  label={
                    member.role === "chair"
                      ? `${member.name} (${t("committees.chair")})`
                      : member.name
                  }
                  size="small"
                  variant="outlined"
                  color={member.role === "chair" ? "warning" : "default"}
                />
              ))}
            </Stack>
          </>
        )}
      </Stack>

      <Dialog open={resultDialogOpen} onClose={() => setResultDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t("defenseResult.recordDialogTitle")}</DialogTitle>
        <DialogContent>
          <RadioGroup
            value={selectedResult}
            onChange={(e) => setSelectedResult(e.target.value)}
          >
            <FormControlLabel
              value="passed"
              control={<Radio />}
              label={
                <Stack direction="row" spacing={1} alignItems="center">
                  <CheckCircleOutlineIcon color="success" fontSize="small" />
                  <span>{t("defenseResult.passedLabel")}</span>
                </Stack>
              }
            />
            <FormControlLabel
              value="failed"
              control={<Radio />}
              label={
                <Stack direction="row" spacing={1} alignItems="center">
                  <CancelOutlinedIcon color="error" fontSize="small" />
                  <span>{t("defenseResult.failedLabel")}</span>
                </Stack>
              }
            />
            <FormControlLabel
              value="incomplete"
              control={<Radio />}
              label={
                <Stack direction="row" spacing={1} alignItems="center">
                  <HourglassEmptyRoundedIcon color="warning" fontSize="small" />
                  <span>{t("defenseResult.incompleteLabel")}</span>
                </Stack>
              }
            />
          </RadioGroup>
          <TextField
            label={t("defenseResult.reason")}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            fullWidth
            multiline
            minRows={2}
            sx={{ mt: 2 }}
            helperText={t("defenseResult.reasonHint")}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResultDialogOpen(false)}>{t("common.cancel")}</Button>
          <Button variant="contained" onClick={handleRecordResult} disabled={submitting}>
            {submitting ? <ButtonSpinner size={22} /> : t("defenseResult.confirmRecord")}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={completeDialogOpen} onClose={() => setCompleteDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t("defenseResult.completeStageDialogTitle")}</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            {t("defenseResult.completeStageDialogHint")}
          </Alert>
          <TextField
            label={t("defenseResult.reasonOptional")}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            fullWidth
            multiline
            minRows={2}
            helperText={t("defenseResult.completeStageReasonHint")}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCompleteDialogOpen(false)}>{t("common.cancel")}</Button>
          <Button variant="contained" onClick={handleCompleteStage} disabled={submitting}>
            {submitting ? <ButtonSpinner size={22} /> : t("defenseResult.confirmComplete")}
          </Button>
        </DialogActions>
      </Dialog>
    </ProjectSectionShell>
  );
}

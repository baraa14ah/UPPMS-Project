import React, { useMemo } from "react";
import {
  Box,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Typography,
  Chip,
  Paper,
  Stack,
  LinearProgress,
  alpha,
  Button,
  Divider,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import LockIcon from "@mui/icons-material/Lock";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import PlayCircleOutlineIcon from "@mui/icons-material/PlayCircleOutline";
import RouteRoundedIcon from "@mui/icons-material/RouteRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import { useLanguage } from "../../context/LanguageContext";
import { sectionPaperSx } from "../../styles/dashboardUi";

const STATUS_COLORS = {
  passed: "#10B981",
  failed: "#EF4444",
  in_progress: "#3B82F6",
  available: "#0EA5E9",
  locked: "#94A3B8",
};

function StatusStepIcon({ status }) {
  const icons = {
    passed: <CheckCircleIcon sx={{ color: STATUS_COLORS.passed }} />,
    failed: <CancelIcon sx={{ color: STATUS_COLORS.failed }} />,
    in_progress: <PlayCircleOutlineIcon sx={{ color: STATUS_COLORS.in_progress }} />,
    available: <LockOpenIcon sx={{ color: STATUS_COLORS.available }} />,
    locked: <LockIcon sx={{ color: STATUS_COLORS.locked }} />,
  };
  return icons[status] || icons.locked;
}

function StackLabel({ item, statusLabel, nested = false }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
      <Typography sx={{ fontWeight: 700 }}>{item.stage_name}</Typography>
      {!nested && item.parent_name && (
        <Chip
          size="small"
          label={item.parent_name}
          variant="outlined"
          sx={{ fontWeight: 700, height: 22, fontSize: "0.68rem" }}
        />
      )}
      {!nested && item.academic_stage_name && item.academic_stage_name !== item.stage_name && (
        <Chip
          size="small"
          label={item.academic_stage_name}
          color="warning"
          variant="outlined"
          sx={{ fontWeight: 700, height: 22, fontSize: "0.68rem" }}
        />
      )}
      <Chip
        size="small"
        label={statusLabel[item.status] || item.status}
        sx={{
          fontWeight: 800,
          bgcolor: alpha(STATUS_COLORS[item.status] || STATUS_COLORS.locked, 0.12),
          color: STATUS_COLORS[item.status] || STATUS_COLORS.locked,
          border: "none",
        }}
      />
    </Box>
  );
}

/** Locked future phases show only the header; active phases list all steps. */
function getVisiblePhaseSteps(phase) {
  const steps = phase.steps || [];
  if (phase.status === "locked") {
    return [];
  }
  if (phase.status === "passed") {
    return steps.filter((step) => step.status === "passed");
  }

  return steps;
}

function PhaseStepList({ steps, statusLabel, t, dateLocale, nested = true }) {
  if (!steps.length) {
    return null;
  }

  return (
    <Stepper orientation="vertical" nonLinear sx={{ mt: 1.5, pl: { xs: 0.5, sm: 1 } }}>
      {steps.map((item) => (
        <Step
          key={item.stage_id}
          active={item.status === "in_progress" || item.status === "available"}
          completed={item.status === "passed"}
        >
          <StepLabel StepIconComponent={() => <StatusStepIcon status={item.status} />}>
            <StackLabel item={item} statusLabel={statusLabel} nested={nested} />
          </StepLabel>
          <StepContent>
            {item.completed_at && (
              <Typography variant="caption" display="block" color="text.secondary">
                {t("progress.completedOn")}:{" "}
                {new Date(item.completed_at).toLocaleString(dateLocale)}
              </Typography>
            )}
            {item.attempts > 0 && (
              <Typography variant="caption" display="block">
                {t("progress.attempts", { count: item.attempts })}
              </Typography>
            )}
            {item.prerequisite && item.status === "locked" && (
              <Typography variant="caption" color="warning.main" display="block">
                {t("progress.prerequisite")}: {item.prerequisite}
              </Typography>
            )}
            {item.status === "locked" && (
              <Typography variant="caption" color="text.secondary" display="block" sx={{ fontWeight: 600 }}>
                {t("progress.lockedStepAwaitingSchedule")}
              </Typography>
            )}
          </StepContent>
        </Step>
      ))}
    </Stepper>
  );
}

function LockedPhaseRow({ phase, statusLabel, t }) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 1.75,
        borderRadius: 2.5,
        borderStyle: "dashed",
        borderColor: alpha(STATUS_COLORS.locked, 0.45),
        bgcolor: alpha(STATUS_COLORS.locked, 0.05),
      }}
    >
      <Stack direction="row" spacing={1.25} alignItems="center" flexWrap="wrap" useFlexGap>
        <LockIcon sx={{ color: STATUS_COLORS.locked, fontSize: 22 }} />
        <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>
          {phase.phase_name}
        </Typography>
        <Chip
          size="small"
          label={statusLabel.locked}
          sx={{
            fontWeight: 800,
            bgcolor: alpha(STATUS_COLORS.locked, 0.12),
            color: STATUS_COLORS.locked,
          }}
        />
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1, pl: 4.25, fontWeight: 600 }}>
        {t("progress.lockedPhaseHint")}
      </Typography>
    </Paper>
  );
}

function ActivePhaseBlock({ phase, statusLabel, t, dateLocale }) {
  const visibleSteps = getVisiblePhaseSteps(phase);

  return (
    <Box>
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 0.5 }}>
        <Chip
          size="small"
          label={t("progress.subTrackLabel")}
          color="info"
          sx={{ fontWeight: 800 }}
        />
        <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>
          {phase.phase_name}
        </Typography>
        {phase.status && (
          <Chip
            size="small"
            label={statusLabel[phase.status] || phase.status}
            sx={{
              fontWeight: 800,
              bgcolor: alpha(STATUS_COLORS[phase.status] || STATUS_COLORS.in_progress, 0.12),
              color: STATUS_COLORS[phase.status] || STATUS_COLORS.in_progress,
            }}
            variant="outlined"
          />
        )}
      </Stack>
      <PhaseStepList
        steps={visibleSteps}
        statusLabel={statusLabel}
        t={t}
        dateLocale={dateLocale}
      />
    </Box>
  );
}

function ProgressSummaryBand({ track, summary, currentStage, overallStatus, t }) {
  const statusLabel = t(`progress.overallStatus.${overallStatus || "not_started"}`, overallStatus || "not_started");

  return (
    <Paper elevation={0} sx={{ ...sectionPaperSx, mb: 2.5, p: { xs: 2, md: 2.5 } }}>
      <Stack
        direction={{ xs: "column", md: "row" }}
        divider={<Divider flexItem orientation="vertical" sx={{ display: { xs: "none", md: "block" } }} />}
        spacing={{ xs: 2, md: 3 }}
        alignItems={{ xs: "stretch", md: "center" }}
      >
        <Box sx={{ flex: 1.2, minWidth: 0 }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.75 }}>
            <RouteRoundedIcon color="primary" fontSize="small" />
            <Typography variant="overline" sx={{ fontWeight: 900, letterSpacing: 1, color: "text.secondary" }}>
              {t("progress.currentTrack")}
            </Typography>
          </Stack>
          <Typography variant="h6" sx={{ fontWeight: 900, lineHeight: 1.3 }}>
            {track?.name}
          </Typography>
          {track?.description && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75, lineHeight: 1.6 }}>
              {track.description}
            </Typography>
          )}
          <Chip size="small" label={statusLabel} color="primary" variant="outlined" sx={{ mt: 1.25, fontWeight: 800 }} />
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="overline" sx={{ fontWeight: 900, letterSpacing: 1, color: "text.secondary" }}>
            {t("progress.completion")}
          </Typography>
          <Stack direction="row" alignItems="baseline" spacing={1} sx={{ mt: 0.5, mb: 1 }}>
            <Typography variant="h3" sx={{ fontWeight: 900, lineHeight: 1 }}>
              {summary.percent}%
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700 }}>
              {t("progress.stagesCompleted", { passed: summary.passed, total: summary.total })}
            </Typography>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={summary.percent}
            sx={{
              height: 10,
              borderRadius: 99,
              bgcolor: (theme) => alpha(theme.palette.primary.main, 0.12),
              "& .MuiLinearProgress-bar": { borderRadius: 99 },
            }}
          />
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="overline" sx={{ fontWeight: 900, letterSpacing: 1, color: "text.secondary" }}>
            {t("progress.currentStage")}
          </Typography>
          <Typography variant="subtitle1" sx={{ fontWeight: 900, mt: 0.75, mb: 0.5 }}>
            {currentStage?.name || t("progress.noCurrentStage")}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, mb: 1.5 }}>
            {currentStage
              ? t("progress.stageOrder", { order: currentStage.sequence_order })
              : t("progress.unlockNextHint")}
          </Typography>
          <Button
            component={RouterLink}
            to="/dashboard/proposals"
            size="small"
            variant="outlined"
            sx={{ fontWeight: 800, borderRadius: 2 }}
          >
            {t("progress.submitProposalCta")}
          </Button>
        </Box>
      </Stack>
    </Paper>
  );
}

/** Vertical timeline stepper for student academic track progress. */
export default function ProgressTimelineChart({
  track,
  timeline,
  phases = [],
  history = [],
  currentStage,
  overallStatus,
  completionPercent,
}) {
  const { t, lang } = useLanguage();
  const dateLocale = lang === "ar" ? "ar-EG" : "en-US";

  const summary = useMemo(() => {
    const total = timeline?.length || 0;
    const passed = timeline?.filter((item) => item.status === "passed").length || 0;
    const computed = total > 0 ? Math.round((passed / total) * 100) : 0;
    const percent =
      typeof completionPercent === "number" && Number.isFinite(completionPercent)
        ? Math.round(completionPercent)
        : computed;
    return { total, passed, percent };
  }, [timeline, completionPercent]);

  const statusLabel = {
    passed: t("progress.completed"),
    failed: t("progress.failed"),
    in_progress: t("progress.inProgress"),
    available: t("progress.available"),
    locked: t("progress.locked"),
  };

  if (!timeline?.length) {
    return (
      <Paper sx={{ ...sectionPaperSx, p: 4, textAlign: "center" }}>
        <Typography color="text.secondary">{t("progress.noTrack")}</Typography>
        <Button component={RouterLink} to="/dashboard/proposals" variant="contained" sx={{ mt: 2, fontWeight: 800 }}>
          {t("progress.submitProposalCta")}
        </Button>
      </Paper>
    );
  }

  return (
    <Stack spacing={2.5}>
      <ProgressSummaryBand
        track={track}
        summary={summary}
        currentStage={currentStage}
        overallStatus={overallStatus}
        t={t}
      />

      <Paper elevation={0} sx={{ ...sectionPaperSx, p: { xs: 2, md: 3 } }}>
        <Typography variant="h6" sx={{ fontWeight: 900, mb: 2 }}>
          {t("progress.timelineTitle")}
        </Typography>
        {phases.length > 0 ? (
          <Stack spacing={2.5}>
            {phases.map((phase, phaseIndex) => (
              <Box key={phase.phase_id || `phase-${phaseIndex}`}>
                {phase.status === "locked" ? (
                  <LockedPhaseRow phase={phase} statusLabel={statusLabel} t={t} />
                ) : (
                  <ActivePhaseBlock
                    phase={phase}
                    statusLabel={statusLabel}
                    t={t}
                    dateLocale={dateLocale}
                  />
                )}
              </Box>
            ))}
          </Stack>
        ) : (
          <Stepper orientation="vertical" nonLinear>
            {timeline.map((item) => (
              <Step
                key={item.stage_id}
                active={item.status === "in_progress" || item.status === "available"}
                completed={item.status === "passed"}
              >
                <StepLabel StepIconComponent={() => <StatusStepIcon status={item.status} />}>
                  <StackLabel item={item} statusLabel={statusLabel} />
                </StepLabel>
                <StepContent>
                  {item.completed_at && (
                    <Typography variant="caption" display="block" color="text.secondary">
                      {t("progress.completedOn")}: {new Date(item.completed_at).toLocaleString(dateLocale)}
                    </Typography>
                  )}
                  {item.attempts > 0 && (
                    <Typography variant="caption" display="block">
                      {t("progress.attempts", { count: item.attempts })}
                    </Typography>
                  )}
                  {item.prerequisite && item.status === "locked" && (
                    <Typography variant="caption" color="warning.main">
                      {t("progress.prerequisite")}: {item.prerequisite}
                    </Typography>
                  )}
                </StepContent>
              </Step>
            ))}
          </Stepper>
        )}
      </Paper>

      {history.length > 0 && (
        <Paper elevation={0} sx={{ ...sectionPaperSx, p: { xs: 2, md: 3 } }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
            <HistoryRoundedIcon color="action" fontSize="small" />
            <Typography variant="h6" sx={{ fontWeight: 900 }}>
              {t("progress.history")}
            </Typography>
          </Stack>
          <Stack spacing={1.5}>
            {history.map((entry, idx) => (
              <Paper
                key={`${entry.stage_id}-${entry.attempt_number}-${idx}`}
                variant="outlined"
                sx={{
                  p: 1.75,
                  borderRadius: 2.5,
                  borderColor: alpha(STATUS_COLORS[entry.status] || STATUS_COLORS.locked, 0.35),
                  bgcolor: alpha(STATUS_COLORS[entry.status] || STATUS_COLORS.locked, 0.04),
                }}
              >
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                  <Typography variant="body2" sx={{ fontWeight: 800 }}>
                    {entry.stage_name}
                  </Typography>
                  <Chip
                    size="small"
                    label={statusLabel[entry.status] || entry.status}
                    sx={{
                      fontWeight: 800,
                      bgcolor: alpha(STATUS_COLORS[entry.status] || STATUS_COLORS.locked, 0.15),
                      color: STATUS_COLORS[entry.status] || STATUS_COLORS.locked,
                    }}
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    #{entry.attempt_number} · {entry.recorded_by} ·{" "}
                    {entry.recorded_at ? new Date(entry.recorded_at).toLocaleString(dateLocale) : "—"}
                  </Typography>
                </Stack>
                {entry.modification_reason && (
                  <Typography variant="caption" color="warning.main" display="block" sx={{ mt: 0.75, fontWeight: 600 }}>
                    {entry.modification_reason}
                  </Typography>
                )}
              </Paper>
            ))}
          </Stack>
        </Paper>
      )}
    </Stack>
  );
}

import React, { useEffect, useState } from "react";
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Chip,
  FormControlLabel,
  LinearProgress,
  Paper,
  Radio,
  RadioGroup,
  Stack,
  Typography,
} from "@mui/material";
import {
  AutoAwesome,
  Cancel,
  CheckCircle,
  PlayArrow,
  RadioButtonUnchecked,
  Warning,
} from "@mui/icons-material";
import SchedulingSection from "./SchedulingSection";
import ScheduleCandidateCard, {
  ScheduleCandidatePicker,
} from "./ScheduleCandidateCard";
import ButtonSpinner from "../shared/ButtonSpinner";
import { isMandatoryStage } from "../../utils/schedulingFormUtils";
import { useLanguage } from "../../context/LanguageContext";

function ReadinessStrip({
  readiness,
  selectedStage,
  useCommittees = false,
  onOpenAvailability,
  openingAvailabilityStageId,
  t,
}) {
  if (!readiness) {
    return <LinearProgress sx={{ mb: 2 }} />;
  }

  const mandatory = selectedStage && isMandatoryStage(selectedStage);
  const roomsOk = (readiness.effective_rooms_count ?? readiness.rooms_count ?? 0) > 0;
  const projectsOk = readiness.projects_with_supervisor_count > 0;
  const periodOk = Boolean(
    selectedStage?.defense_period_start && selectedStage?.defense_period_end,
  );
  const committeesOk = (readiness.active_committees_count ?? 0) > 0;
  const facultyOk = mandatory || readiness.faculty_with_availability_count > 0;

  const items = [
    { ok: periodOk, label: t("scheduling.generate.readiness.period") },
    { ok: roomsOk, label: t("scheduling.generate.readiness.rooms") },
    { ok: projectsOk, label: t("scheduling.generate.readiness.projects") },
    ...(useCommittees
      ? [{ ok: committeesOk, label: t("scheduling.generate.readiness.committees") }]
      : [
          {
            ok: facultyOk,
            label: mandatory
              ? t("scheduling.generate.readiness.mandatorySlots")
              : t("scheduling.generate.readiness.facultySlots"),
          },
        ]),
  ];

  return (
    <Stack direction="row" flexWrap="wrap" gap={1} useFlexGap sx={{ mb: 2 }} alignItems="center">
      {items.map((item) => (
        <Chip
          key={item.label}
          size="small"
          icon={
            item.ok ? (
              <CheckCircle sx={{ fontSize: "16px !important" }} />
            ) : (
              <RadioButtonUnchecked sx={{ fontSize: "16px !important" }} />
            )
          }
          label={item.label}
          color={item.ok ? "success" : "default"}
          variant={item.ok ? "filled" : "outlined"}
          sx={{ fontWeight: 700 }}
        />
      ))}
      {!mandatory &&
        !useCommittees &&
        selectedStage &&
        !selectedStage.availability_open &&
        periodOk &&
        onOpenAvailability && (
          <Button
            size="small"
            variant="outlined"
            onClick={() => onOpenAvailability(selectedStage.id)}
            disabled={openingAvailabilityStageId === selectedStage.id}
            sx={{ fontWeight: 700 }}
            startIcon={
              openingAvailabilityStageId === selectedStage.id ? (
                <ButtonSpinner size={16} variant="outlined" />
              ) : null
            }
          >
            {t("scheduling.generate.readiness.openSupervisorRegistration")}
          </Button>
        )}
    </Stack>
  );
}

/** Step 3 — readiness check + run GA and approve a candidate schedule. */
export default function SchedulingGeneratePanel({
  selectedStage,
  selectedStageReady,
  readiness,
  stageStatus,
  loading,
  elapsedSeconds,
  error,
  warnings,
  metadata,
  candidates,
  onGenerate,
  onVoid,
  voiding,
  onApprove,
  approving,
  getRankLabel,
  useCommittees,
  onUseCommitteesChange,
  activeCommitteeCount,
  onOpenAvailability,
  openingAvailabilityStageId,
}) {
  const { t } = useLanguage();
  const [selectedRank, setSelectedRank] = useState(null);

  useEffect(() => {
    if (!candidates?.length) {
      setSelectedRank(null);
      return;
    }
    setSelectedRank((prev) => {
      if (prev != null && candidates.some((c) => c.rank === prev)) return prev;
      return candidates[0]?.rank ?? null;
    });
  }, [candidates]);

  const selectedCandidate =
    candidates?.find((c) => c.rank === selectedRank) || candidates?.[0] || null;

  const blocked =
    !selectedStage ||
    !selectedStageReady ||
    stageStatus?.has_active_schedule ||
    !readiness?.ready_to_generate;

  return (
    <Stack spacing={3}>
      <SchedulingSection
        title={t("scheduling.generate.title")}
        icon={<AutoAwesome fontSize="small" />}
        action={
          stageStatus?.has_active_schedule ? (
            <Chip
              icon={<CheckCircle />}
              label={t("scheduling.generate.approvedBadge")}
              color="success"
              sx={{ fontWeight: 800 }}
            />
          ) : readiness?.ready_to_generate ? (
            <Chip label={t("scheduling.generate.readyBadge")} color="primary" sx={{ fontWeight: 800 }} />
          ) : (
            <Chip
              label={t("scheduling.generate.notReadyBadge")}
              color="warning"
              variant="outlined"
              sx={{ fontWeight: 800 }}
            />
          )
        }
      >
        <ReadinessStrip
          readiness={readiness}
          selectedStage={selectedStage}
          useCommittees={useCommittees}
          onOpenAvailability={onOpenAvailability}
          openingAvailabilityStageId={openingAvailabilityStageId}
          t={t}
        />

        <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
            {t("schedulingMode.selectMode")}
          </Typography>
          <RadioGroup
            row
            value={useCommittees ? "committees" : "individual"}
            onChange={(e) => onUseCommitteesChange?.(e.target.value === "committees")}
          >
            <FormControlLabel
              value="individual"
              control={<Radio />}
              label={t("schedulingMode.individualMode")}
            />
            <FormControlLabel
              value="committees"
              control={<Radio />}
              disabled={activeCommitteeCount === 0}
              label={t("schedulingMode.committeeMode")}
            />
          </RadioGroup>
          {useCommittees && activeCommitteeCount > 0 ? (
            <Alert severity="info" sx={{ mt: 1 }}>
              {t("scheduling.generate.committeeAutoAvailable")}
            </Alert>
          ) : null}
          {useCommittees && activeCommitteeCount === 0 ? (
            <Alert severity="warning" sx={{ mt: 1 }}>
              {t("committees.noActiveCommittees")}
            </Alert>
          ) : null}
        </Paper>

        {loading && (
          <Box sx={{ mb: 2 }}>
            <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
              <Typography variant="body2" color="text.secondary">
                {t("scheduling.generate.generating")}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 800 }}>
                {t("scheduling.generate.generatingSeconds", { seconds: elapsedSeconds })}
              </Typography>
            </Stack>
            <LinearProgress />
          </Box>
        )}

        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <Button
            variant="contained"
            size="large"
            startIcon={loading ? <ButtonSpinner size={22} /> : <PlayArrow />}
            onClick={onGenerate}
            disabled={loading || blocked}
            sx={{ fontWeight: 900, px: 4, py: 1.5, flex: 1 }}
          >
            {loading
              ? useCommittees
                ? t("schedulingMode.generatingWithCommittees")
                : t("scheduling.generate.generatingWithElapsed", { seconds: elapsedSeconds })
              : t("scheduling.generate.runAlgorithm")}
          </Button>

          {stageStatus?.has_active_schedule && (
            <Button
              color="warning"
              variant="outlined"
              startIcon={voiding ? <ButtonSpinner size={18} variant="outlined" /> : <Cancel />}
              onClick={onVoid}
              disabled={voiding || loading}
              sx={{ fontWeight: 800 }}
            >
              {t("scheduling.generate.voidCurrentSchedule")}
            </Button>
          )}
        </Stack>

        {blocked && !stageStatus?.has_active_schedule && (
          <Alert severity="info" sx={{ mt: 2 }}>
            {t("scheduling.generate.completeRequirements")}
          </Alert>
        )}
      </SchedulingSection>

      {error && <Alert severity="error">{error}</Alert>}

      {warnings.length > 0 && (
        <Alert severity="warning" icon={<Warning />} sx={{ borderRadius: 2 }}>
          <AlertTitle sx={{ fontWeight: 800 }}>{t("scheduling.generate.warningsTitle")}</AlertTitle>
          {warnings.map((w, i) => {
            const key = typeof w === "string" ? w : w?.code || w?.key;
            const translated = key
              ? t(`scheduling.generate.warningKeys.${key}`, "")
              : "";
            const text =
              translated && translated !== `scheduling.generate.warningKeys.${key}`
                ? translated
                : typeof w === "string"
                  ? w
                  : w?.message || String(w);
            return (
              <Typography key={i} variant="body2">
                • {text}
              </Typography>
            );
          })}
        </Alert>
      )}

      {candidates && candidates.length > 0 && (
        <Stack spacing={2.5}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "stretch", sm: "center" }}
            spacing={1}
          >
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 900 }}>
                {t("scheduling.generate.resultsTitle")}
              </Typography>
            </Box>
            {metadata && (
              <Stack direction="row" flexWrap="wrap" gap={1} useFlexGap>
                <Chip
                  size="small"
                  label={t("scheduling.generate.projectsChip", { count: metadata.projectCount })}
                />
                <Chip
                  size="small"
                  label={t("scheduling.generate.facultyChip", { count: metadata.facultyCount })}
                />
                <Chip
                  size="small"
                  variant="outlined"
                  label={t("scheduling.generate.generationsChip", {
                    count: metadata.generationsCompleted,
                  })}
                />
              </Stack>
            )}
          </Stack>

          <ScheduleCandidatePicker
            candidates={candidates}
            selectedRank={selectedRank}
            onSelect={setSelectedRank}
            getRankLabel={getRankLabel}
          />

          {selectedCandidate && (
            <ScheduleCandidateCard
              key={selectedCandidate.rank}
              candidate={selectedCandidate}
              allCandidates={candidates}
              rankLabel={getRankLabel(selectedCandidate.rank)}
              onApprove={() => onApprove(selectedCandidate.rank)}
              approving={approving}
            />
          )}
        </Stack>
      )}

      {candidates && candidates.length === 0 && (
        <Alert severity="warning">{t("scheduling.generate.noCandidates")}</Alert>
      )}

      {!candidates && !loading && !error && readiness?.ready_to_generate && !stageStatus?.has_active_schedule && (
        <Paper
          variant="outlined"
          sx={{
            p: 4,
            borderRadius: 3,
            textAlign: "center",
            borderStyle: "dashed",
          }}
        >
          <AutoAwesome sx={{ fontSize: 48, color: "text.disabled", mb: 1 }} />
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            {t("scheduling.generate.readyTitle")}
          </Typography>
        </Paper>
      )}
    </Stack>
  );
}

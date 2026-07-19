import React from "react";
import {
  Box,
  Chip,
  IconButton,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
  alpha,
} from "@mui/material";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import { useLanguage } from "../../context/LanguageContext";
import TrackStepEditor from "./TrackStepEditor";
import {
  countPhasesUsingDefenseType,
  isFinalDefenseType,
  schedulingCatalogForPhase,
  stepFromDefenseType,
} from "../../utils/trackStepUtils";

/** Academic phase — pick steps from scheduling catalog. */
export default function SubTrackPanel({
  subTrack,
  subTrackIndex,
  totalSubTracks,
  defenseTypes,
  allPhases = [],
  onSubTrackChange,
  onMoveSubTrack,
  onMoveStep,
  onExcludeStep,
  onDeletePhase,
  canDeletePhase = false,
}) {
  const { t } = useLanguage();
  const catalog = schedulingCatalogForPhase(defenseTypes, subTrack.steps);

  const updateStep = (stepIndex, nextStep) => {
    const steps = [...subTrack.steps];
    steps[stepIndex] = nextStep;
    onSubTrackChange({ ...subTrack, steps });
  };

  const handleAddFromCatalog = (defenseType) => {
    onSubTrackChange({
      ...subTrack,
      steps: [...subTrack.steps, stepFromDefenseType(defenseType)],
    });
  };

  return (
    <Paper
      elevation={0}
      variant="outlined"
      sx={{
        p: 2,
        borderRadius: 2,
        bgcolor: (theme) => alpha(theme.palette.info.main, 0.03),
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Chip
              label={t("tracks.subTrackNumber", { n: subTrackIndex + 1 })}
              size="small"
              color="info"
              sx={{ fontWeight: 800 }}
            />
            <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>
              {t("tracks.academicPhase")}
            </Typography>
            <Chip
              size="small"
              label={t("tracks.stepCount", { count: subTrack.steps.length })}
              variant="outlined"
              sx={{ fontWeight: 700 }}
            />
            <Chip
              size="small"
              color="info"
              variant="outlined"
              label={t("tracks.studentsCount", {
                count: subTrack.students_count ?? subTrack.progress_count ?? 0,
              })}
              sx={{ fontWeight: 800 }}
            />
          </Stack>
        </Box>
        <Tooltip title={t("common.moveUp")}>
          <span>
            <IconButton size="small" onClick={() => onMoveSubTrack(-1)} disabled={subTrackIndex === 0}>
              <ArrowUpwardIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title={t("common.moveDown")}>
          <span>
            <IconButton
              size="small"
              onClick={() => onMoveSubTrack(1)}
              disabled={subTrackIndex >= totalSubTracks - 1}
            >
              <ArrowDownwardIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip
          title={
            canDeletePhase
              ? t("tracks.deletePhase")
              : totalSubTracks <= 1
                ? t("tracks.atLeastOnePhase")
                : t("tracks.phaseDeleteBlocked")
          }
        >
          <span>
            <IconButton
              size="small"
              color="error"
              onClick={onDeletePhase}
              disabled={!canDeletePhase}
            >
              <DeleteOutlineRoundedIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>

      <TextField
        label={t("tracks.subTrackName")}
        value={subTrack.name}
        onChange={(e) => onSubTrackChange({ ...subTrack, name: e.target.value })}
        fullWidth
        size="small"
        placeholder={t("tracks.subTrackNamePlaceholder")}
        sx={{ mb: 1.5 }}
      />

      {defenseTypes.length > 0 ? (
        <Stack direction="row" flexWrap="wrap" gap={0.75} useFlexGap sx={{ mb: subTrack.steps.length ? 1.5 : 0 }}>
          {catalog.all.map((dt) => {
            const isFinal = isFinalDefenseType(dt);
            const isIncluded = subTrack.steps.some(
              (s) => String(s.academic_stage_id) === String(dt.id),
            );
            return (
              <Tooltip
                key={dt.id}
                title={isFinal ? t("tracks.finalDefensePremiumHint") || undefined : undefined}
              >
                <span>
                  <Chip
                    label={dt.name}
                    size="small"
                    color={isIncluded ? "success" : isFinal ? "secondary" : "default"}
                    variant={isIncluded ? "filled" : "outlined"}
                    onClick={!isIncluded ? () => handleAddFromCatalog(dt) : undefined}
                    sx={{
                      fontWeight: 700,
                      cursor: isIncluded ? "default" : "pointer",
                    }}
                  />
                </span>
              </Tooltip>
            );
          })}
        </Stack>
      ) : (
        <Typography variant="body2" color="warning.main" sx={{ mb: 1.5, fontWeight: 600 }}>
          {t("tracks.noDefenseTypes")}
        </Typography>
      )}

      {subTrack.steps.length > 0 && (
        <Stack spacing={1}>
          {subTrack.steps.map((step, stepIndex) => (
            <TrackStepEditor
              key={step.id || `step-${subTrackIndex}-${step.academic_stage_id}-${stepIndex}`}
              step={step}
              stepIndex={stepIndex}
              defenseTypes={defenseTypes}
              isSharedType={countPhasesUsingDefenseType(allPhases, step.academic_stage_id) > 1}
              isFirst={stepIndex === 0}
              isLast={stepIndex === subTrack.steps.length - 1}
              onChange={(next) => updateStep(stepIndex, next)}
              onMoveUp={() => onMoveStep(stepIndex, -1)}
              onMoveDown={() => onMoveStep(stepIndex, 1)}
              onExclude={() => onExcludeStep(stepIndex)}
            />
          ))}
        </Stack>
      )}
    </Paper>
  );
}

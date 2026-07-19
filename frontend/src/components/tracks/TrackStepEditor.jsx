import React from "react";
import {
  Box,
  Chip,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
  alpha,
} from "@mui/material";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import EventAvailableRoundedIcon from "@mui/icons-material/EventAvailableRounded";
import GavelRoundedIcon from "@mui/icons-material/GavelRounded";
import { useLanguage } from "../../context/LanguageContext";
import { isFinalDefenseType } from "../../utils/trackStepUtils";

/** Step row — name from scheduling; exclude to remove from sub-track; decisive toggle except final defense. */
export default function TrackStepEditor({
  step,
  stepIndex,
  defenseTypes = [],
  isSharedType = false,
  isFirst,
  isLast,
  onChange,
  onMoveUp,
  onMoveDown,
  onExclude,
}) {
  const { t } = useLanguage();
  const linkedDefense = defenseTypes.find((d) => String(d.id) === String(step.academic_stage_id));
  const isFinal = isFinalDefenseType(linkedDefense);
  const hasProgress = (step.progress_count || 0) > 0;

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 1.5,
        borderRadius: 2,
        bgcolor: (theme) =>
          isFinal
            ? alpha(theme.palette.error.main, 0.04)
            : alpha(theme.palette.warning.main, 0.04),
        borderColor: (theme) =>
          isFinal
            ? alpha(theme.palette.error.main, 0.35)
            : alpha(theme.palette.warning.main, 0.3),
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center">
        <Box
          sx={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            bgcolor: isFinal ? "error.main" : "warning.main",
            color: "common.white",
            display: "grid",
            placeItems: "center",
            fontWeight: 900,
            fontSize: "0.8rem",
            flexShrink: 0,
          }}
        >
          {stepIndex + 1}
        </Box>

        <EventAvailableRoundedIcon
          sx={{ fontSize: 18, color: isFinal ? "error.dark" : "warning.dark", flexShrink: 0 }}
        />

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
            <Typography variant="subtitle2" sx={{ fontWeight: 900 }} noWrap>
              {linkedDefense?.name || step.name || "—"}
            </Typography>
            {isSharedType && (
              <Chip
                size="small"
                label={t("tracks.sharedDefenseType")}
                color="primary"
                variant="outlined"
                sx={{ height: 20, fontSize: "0.65rem", fontWeight: 700 }}
              />
            )}
          </Stack>
          {isFinal ? (
            <Chip
              size="small"
              icon={<GavelRoundedIcon sx={{ fontSize: "14px !important" }} />}
              label={t("tracks.finalDefenseDecisiveLocked")}
              color="error"
              variant="outlined"
              sx={{ mt: 0.5, height: 22, fontSize: "0.68rem", fontWeight: 700 }}
            />
          ) : (
            <Chip
              size="small"
              label={
                step.is_decisive
                  ? t("tracks.decisiveStage")
                  : t("tracks.nonDecisiveStage")
              }
              color={step.is_decisive ? "secondary" : "default"}
              variant="outlined"
              onClick={() => onChange({ ...step, is_decisive: !step.is_decisive })}
              sx={{ mt: 0.5, height: 22, fontSize: "0.68rem", fontWeight: 700, cursor: "pointer" }}
            />
          )}
        </Box>

        <Tooltip title={t("common.moveUp")}>
          <span>
            <IconButton size="small" onClick={onMoveUp} disabled={isFirst}>
              <ArrowUpwardIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title={t("common.moveDown")}>
          <span>
            <IconButton size="small" onClick={onMoveDown} disabled={isLast}>
              <ArrowDownwardIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title={hasProgress ? t("tracks.stepDeleteBlocked") : t("tracks.deleteStep")}>
          <span>
            <IconButton size="small" color="error" onClick={onExclude} disabled={hasProgress}>
              <RemoveCircleOutlineIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>
    </Paper>
  );
}

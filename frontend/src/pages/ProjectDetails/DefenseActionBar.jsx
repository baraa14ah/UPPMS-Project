import React from "react";
import {
  Paper,
  Stack,
  Typography,
  Chip,
  Button,
  Box,
} from "@mui/material";
import EventRoundedIcon from "@mui/icons-material/EventRounded";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import GavelRoundedIcon from "@mui/icons-material/GavelRounded";
import TaskAltRoundedIcon from "@mui/icons-material/TaskAltRounded";
import { useLanguage } from "../../context/LanguageContext";

const DAY_NAMES_AR = [
  "الأحد",
  "الاثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
  "الجمعة",
  "السبت",
];

/** Compact sticky bar for defense actions — always visible without scrolling. */
export default function DefenseActionBar({
  defenseSession,
  defenseResult,
  canRecordResult = false,
  onRecordClick,
  onCompleteClick,
  onOpenDefenseTab,
}) {
  const { t } = useLanguage();

  if (!defenseSession) return null;

  const stageIsDecisive = defenseResult?.stage_is_decisive !== false;
  const hasResult = Boolean(defenseResult?.result);
  const passed = defenseResult?.result === "passed";
  const failed = defenseResult?.result === "failed";
  const incomplete = defenseResult?.result === "incomplete";

  const dayName =
    DAY_NAMES_AR[defenseSession.scheduled_day_of_week] ||
    defenseSession.day_name ||
    "—";

  const timeRange =
    defenseSession.time_range ||
    (defenseSession.scheduled_start_time && defenseSession.scheduled_end_time
      ? `${String(defenseSession.scheduled_start_time).slice(0, 5)} - ${String(defenseSession.scheduled_end_time).slice(0, 5)}`
      : defenseSession.scheduled_time || "—");

  const needsAction = canRecordResult && !hasResult;
  const showComplete = needsAction && !stageIsDecisive;
  const showRecord = needsAction && stageIsDecisive;

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 2.5,
        border: needsAction ? "2px solid" : "1px solid",
        borderColor: needsAction ? "warning.main" : passed ? "success.light" : "divider",
        mb: 0,
        overflow: "hidden",
        bgcolor: needsAction ? "warning.50" : "background.paper",
      }}
    >
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={1}
        alignItems={{ xs: "stretch", md: "center" }}
        justifyContent="space-between"
        sx={{ px: { xs: 1.5, md: 2 }, py: 1.15 }}
      >
        <Stack direction="row" spacing={1.25} alignItems="center" flexWrap="wrap" useFlexGap>
          <GavelRoundedIcon color={needsAction ? "warning" : "primary"} />
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 900, lineHeight: 1.3 }}>
              {t("defenseResult.actionBarTitle")}
            </Typography>
            <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mt: 0.25 }}>
              {(defenseSession.formatted_date || defenseSession.scheduled_date) && (
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <EventRoundedIcon sx={{ fontSize: 16 }} color="action" />
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {defenseSession.formatted_date || defenseSession.scheduled_date}
                  </Typography>
                </Stack>
              )}
              <Stack direction="row" spacing={0.5} alignItems="center">
                <AccessTimeRoundedIcon sx={{ fontSize: 16 }} color="action" />
                <Typography variant="body2">
                  {dayName} · {timeRange}
                </Typography>
              </Stack>
            </Stack>
          </Box>
          <Chip
            size="small"
            label={stageIsDecisive ? t("tracks.decisiveStage") : t("tracks.nonDecisiveStage")}
            color={stageIsDecisive ? "secondary" : "default"}
            variant="outlined"
            sx={{ fontWeight: 700 }}
          />
          {hasResult && (
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

        <Stack direction="row" spacing={1} flexShrink={0}>
          {showRecord && (
            <Button
              variant="contained"
              color="secondary"
              startIcon={<GavelRoundedIcon />}
              onClick={onRecordClick}
              sx={{ fontWeight: 800, whiteSpace: "nowrap" }}
            >
              {t("defenseResult.record")}
            </Button>
          )}
          {showComplete && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<TaskAltRoundedIcon />}
              onClick={onCompleteClick}
              sx={{ fontWeight: 800, whiteSpace: "nowrap" }}
            >
              {t("defenseResult.completeStage")}
            </Button>
          )}
          {onOpenDefenseTab && (
            <Button
              variant={needsAction ? "outlined" : "text"}
              onClick={onOpenDefenseTab}
              sx={{ fontWeight: 700, whiteSpace: "nowrap" }}
            >
              {t("defenseResult.viewDetails")}
            </Button>
          )}
        </Stack>
      </Stack>
    </Paper>
  );
}

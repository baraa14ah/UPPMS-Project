import React from "react";
import { Box, Chip, Stack, Tooltip, Typography, alpha } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import LockIcon from "@mui/icons-material/Lock";
import PlayCircleOutlineIcon from "@mui/icons-material/PlayCircleOutline";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import { useLanguage } from "../../context/LanguageContext";

const STATUS_COLORS = {
  passed: "#10B981",
  failed: "#EF4444",
  incomplete: "#F59E0B",
  in_progress: "#3B82F6",
  available: "#0EA5E9",
  locked: "#94A3B8",
};

/** Compact phase-only progress strip for a project (keys by track_stage_id). */
export default function ProjectPhaseProgress({
  trackStage,
  dense = false,
  showPhaseTitle = true,
}) {
  const { t } = useLanguage();
  const progress = trackStage?.phase_progress;
  const steps = progress?.steps || [];

  if (!progress || steps.length === 0) {
    return null;
  }

  const statusLabel = {
    passed: t("progress.completed"),
    failed: t("progress.failed"),
    incomplete: t("progress.incomplete"),
    in_progress: t("progress.inProgress"),
    available: t("progress.available"),
    locked: t("progress.locked"),
  };

  const iconFor = (status) => {
    if (status === "passed") return <CheckCircleIcon sx={{ fontSize: 16 }} />;
    if (status === "failed") return <CancelIcon sx={{ fontSize: 16 }} />;
    if (status === "in_progress") return <PlayCircleOutlineIcon sx={{ fontSize: 16 }} />;
    if (status === "available") return <LockOpenIcon sx={{ fontSize: 16 }} />;
    return <LockIcon sx={{ fontSize: 16 }} />;
  };

  return (
    <Box
      sx={{
        width: "100%",
        p: dense ? 1 : 1.5,
        borderRadius: 2,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: (theme) =>
          theme.palette.mode === "dark" ? "background.paper" : alpha("#0B1220", 0.02),
      }}
    >
      {showPhaseTitle && (
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          spacing={1}
          sx={{ mb: dense ? 0.75 : 1.25 }}
        >
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>
            {t("projects.phaseProgressTitle", { phase: progress.phase_name })}
          </Typography>
        </Stack>
      )}

      <Stack
        direction="row"
        alignItems="center"
        spacing={0}
        sx={{ width: "100%", overflowX: "auto", pb: 0.25 }}
      >
        {steps.map((step, index) => {
          const color = STATUS_COLORS[step.status] || STATUS_COLORS.locked;
          const isCurrent = Boolean(step.is_project_step) || step.status === "in_progress";

          return (
            <React.Fragment key={step.stage_id}>
              {index > 0 && (
                <Box
                  sx={{
                    flex: "1 1 12px",
                    minWidth: 8,
                    height: 2,
                    bgcolor: alpha(color, 0.35),
                    mx: 0.25,
                  }}
                />
              )}
              <Tooltip
                title={`${step.stage_name} — ${statusLabel[step.status] || step.status}`}
              >
                <Stack
                  alignItems="center"
                  spacing={0.35}
                  sx={{ flex: "0 0 auto", minWidth: dense ? 56 : 72, maxWidth: 110 }}
                >
                  <Box
                    sx={{
                      width: dense ? 28 : 32,
                      height: dense ? 28 : 32,
                      borderRadius: "50%",
                      display: "grid",
                      placeItems: "center",
                      color,
                      bgcolor: alpha(color, isCurrent ? 0.18 : 0.1),
                      border: "2px solid",
                      borderColor: isCurrent ? color : alpha(color, 0.45),
                      boxShadow: isCurrent ? `0 0 0 3px ${alpha(color, 0.15)}` : "none",
                    }}
                  >
                    {iconFor(step.status)}
                  </Box>
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: isCurrent ? 900 : 700,
                      fontSize: dense ? "0.62rem" : "0.7rem",
                      textAlign: "center",
                      lineHeight: 1.2,
                      color: isCurrent ? "text.primary" : "text.secondary",
                      maxWidth: "100%",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {step.stage_name}
                  </Typography>
                </Stack>
              </Tooltip>
            </React.Fragment>
          );
        })}
      </Stack>
    </Box>
  );
}

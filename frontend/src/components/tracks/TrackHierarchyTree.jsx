import React from "react";
import { Box, Chip, Stack, Typography, alpha } from "@mui/material";
import SubdirectoryArrowRightRoundedIcon from "@mui/icons-material/SubdirectoryArrowRightRounded";
import { useLanguage } from "../../context/LanguageContext";

function StepLeaf({ step, dense }) {
  const label = step.academic_stage_name || step.academic_stage?.name || step.name;

  return (
    <Stack
      direction="row"
      spacing={0.75}
      alignItems="center"
      sx={{
        py: dense ? 0.35 : 0.5,
        pl: 3.5,
        flexWrap: "wrap",
        useFlexGap: true,
      }}
    >
      <SubdirectoryArrowRightRoundedIcon sx={{ fontSize: 16, color: "text.disabled" }} />
      <Typography variant={dense ? "caption" : "body2"} sx={{ fontWeight: 700 }}>
        {label || "—"}
      </Typography>
    </Stack>
  );
}

/** Read-only tree: main track → sub-tracks → steps (scheduling defense types). */
export default function TrackHierarchyTree({ phases = [], flatStages = [], dense = false, maxSubTracks }) {
  const { t } = useLanguage();

  const groups =
    phases?.length > 0
      ? phases
      : flatStages?.length > 0
        ? [{ name: null, steps: flatStages }]
        : [];

  const visibleGroups = maxSubTracks ? groups.slice(0, maxSubTracks) : groups;
  const hiddenCount = groups.length - visibleGroups.length;

  if (!groups.length) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: "italic" }}>
        {t("tracks.noStructureYet")}
      </Typography>
    );
  }

  return (
    <Box>
      {visibleGroups.map((phase, phaseIndex) => (
        <Box
          key={phase.id || phase.phase_id || `phase-${phaseIndex}`}
          sx={{
            mb: phaseIndex < visibleGroups.length - 1 ? (dense ? 1 : 1.5) : 0,
            pl: 1,
            borderLeft: "2px solid",
            borderColor: (theme) => alpha(theme.palette.info.main, 0.35),
          }}
        >
          {phase.name || phase.phase_name ? (
            <Typography
              variant={dense ? "caption" : "subtitle2"}
              sx={{ fontWeight: 900, color: "info.dark", mb: 0.5, display: "block" }}
            >
              {phase.name || phase.phase_name}
            </Typography>
          ) : null}
          {(phase.steps || []).map((step) => (
            <StepLeaf key={step.id || step.stage_id || step.academic_stage_id || step.name} step={step} dense={dense} />
          ))}
        </Box>
      ))}
      {hiddenCount > 0 && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block", pl: 1 }}>
          {t("tracks.moreSubTracks", { count: hiddenCount })}
        </Typography>
      )}
    </Box>
  );
}

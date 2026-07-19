import React, { useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  Divider,
  Stack,
  Typography,
  alpha,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import RouteRoundedIcon from "@mui/icons-material/RouteRounded";
import PeopleOutlineRoundedIcon from "@mui/icons-material/PeopleOutlineRounded";
import { useLanguage } from "../../context/LanguageContext";
import { dashboardCardSx } from "../../styles/dashboardUi";

function stepLabel(step) {
  return step.academic_stage_name || step.academic_stage?.name || step.name || "—";
}

/** Track summary card with expandable phases for long paths. */
export default function TrackListCard({ track, detail, onEdit, onAssign }) {
  const { t } = useLanguage();
  const [expandedPhase, setExpandedPhase] = useState(false);

  const phases = detail?.phases?.length
    ? detail.phases
    : detail?.stages?.length
      ? [{ name: null, steps: detail.stages }]
      : [];

  const totalSteps = phases.reduce((sum, phase) => sum + (phase.steps?.length || 0), 0);

  return (
    <Card
      elevation={0}
      sx={{
        ...dashboardCardSx,
        display: "flex",
        flexDirection: "column",
        border: "1px solid",
        borderColor: "divider",
        "&:hover": { boxShadow: 2 },
      }}
    >
      <CardContent sx={{ flex: 1, pb: 1.5 }}>
        <Stack direction="row" spacing={1.5} alignItems="flex-start">
          <Box
            sx={{
              width: 42,
              height: 42,
              borderRadius: 2,
              bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
              color: "primary.main",
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
            }}
          >
            <RouteRoundedIcon fontSize="small" />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <Typography variant="h6" sx={{ fontWeight: 900, lineHeight: 1.3 }}>
                {track.name}
              </Typography>
              <Chip
                size="small"
                label={track.is_active ? t("tracks.active") : t("tracks.inactive")}
                color={track.is_active ? "success" : "default"}
                sx={{ fontWeight: 800 }}
              />
              {phases.length > 0 ? (
                <Chip
                  size="small"
                  variant="outlined"
                  label={t("tracks.subTracksCount", { count: phases.length })}
                  sx={{ fontWeight: 700 }}
                />
              ) : null}
              {totalSteps > 0 ? (
                <Chip
                  size="small"
                  variant="outlined"
                  label={t("tracks.stepsCount", { count: totalSteps })}
                  sx={{ fontWeight: 700 }}
                />
              ) : null}
            </Stack>
            {track.description ? (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75, lineHeight: 1.5 }}>
                {track.description}
              </Typography>
            ) : null}
          </Box>
        </Stack>

        {phases.length > 0 ? (
          <>
            <Divider sx={{ my: 1.75 }} />
            <Stack spacing={0.75}>
              {phases.map((phase, index) => {
                const phaseKey = phase.id || phase.phase_id || `phase-${index}`;
                const steps = phase.steps || [];

                return (
                  <Accordion
                    key={phaseKey}
                    expanded={expandedPhase === phaseKey}
                    onChange={(_, open) => setExpandedPhase(open ? phaseKey : false)}
                    disableGutters
                    elevation={0}
                    sx={{
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: "8px !important",
                      "&:before": { display: "none" },
                      overflow: "hidden",
                    }}
                  >
                    <AccordionSummary
                      expandIcon={<ExpandMoreIcon />}
                      sx={{ minHeight: 44, "& .MuiAccordionSummary-content": { my: 0.75 } }}
                    >
                      <Stack
                        direction="row"
                        spacing={1}
                        alignItems="center"
                        sx={{ width: "100%", pr: 1 }}
                      >
                        <Typography variant="body2" sx={{ fontWeight: 800, flex: 1 }}>
                          {phase.name || t("tracks.academicPhase")}
                        </Typography>
                        <Chip
                          size="small"
                          color="info"
                          variant="outlined"
                          icon={<PeopleOutlineRoundedIcon />}
                          label={t("tracks.studentsCount", {
                            count: phase.students_count ?? phase.progress_count ?? 0,
                          })}
                          sx={{ fontWeight: 800 }}
                        />
                        <Chip
                          size="small"
                          label={t("tracks.stepCount", { count: steps.length })}
                          variant="outlined"
                          sx={{ fontWeight: 700 }}
                        />
                      </Stack>
                    </AccordionSummary>
                    <AccordionDetails sx={{ pt: 0, pb: 1.5 }}>
                      <Stack spacing={0.5}>
                        {steps.map((step, stepIndex) => (
                          <Typography key={step.id || stepIndex} variant="body2" sx={{ fontWeight: 600 }}>
                            {stepIndex + 1}. {stepLabel(step)}
                          </Typography>
                        ))}
                      </Stack>
                    </AccordionDetails>
                  </Accordion>
                );
              })}
            </Stack>
          </>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2, fontStyle: "italic" }}>
            {t("tracks.noStructureYet")}
          </Typography>
        )}
      </CardContent>

      <Divider />
      <CardActions
        sx={{
          px: 2,
          py: 1.25,
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 1,
        }}
      >
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 0.35 }}
        >
          <PeopleOutlineRoundedIcon sx={{ fontSize: 15 }} />
          {t("tracks.studentsCount", { count: track.students_count || 0 })}
        </Typography>
        <Stack direction="row" spacing={0.5} flexWrap="wrap">
          <Button size="small" onClick={onEdit} sx={{ fontWeight: 700 }}>
            {t("tracks.edit")}
          </Button>
          <Button size="small" onClick={onAssign} sx={{ fontWeight: 700 }}>
            {t("tracks.assignStudents")}
          </Button>
        </Stack>
      </CardActions>
    </Card>
  );
}

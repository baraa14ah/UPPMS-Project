import React from "react";
import { Link as RouterLink } from "react-router-dom";
import { Box, Paper, Typography, alpha } from "@mui/material";
import TimelineIcon from "@mui/icons-material/Timeline";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import GroupsIcon from "@mui/icons-material/Groups";
import EventNoteIcon from "@mui/icons-material/EventNote";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { useLanguage } from "../../context/LanguageContext";
import { sectionPaperSx } from "../../styles/dashboardUi";

const STEP_ICONS = {
  tracks: TimelineIcon,
  scheduling: CalendarMonthIcon,
  committees: GroupsIcon,
  schedule: EventNoteIcon,
  result: CheckCircleIcon,
};

function StepIconBadge({ id, active }) {
  const Icon = STEP_ICONS[id];

  return (
    <Box
      sx={{
        width: 36,
        height: 36,
        borderRadius: "50%",
        display: "grid",
        placeItems: "center",
        bgcolor: (theme) =>
          active
            ? alpha(theme.palette.primary.main, 0.14)
            : alpha(theme.palette.text.secondary, 0.1),
        color: active ? "primary.main" : "text.secondary",
        border: "2px solid",
        borderColor: active ? "primary.main" : "transparent",
        transition: "all 0.2s ease",
      }}
    >
      {Icon ? <Icon sx={{ fontSize: 18 }} /> : null}
    </Box>
  );
}

/** Shared navigable workflow bar: tracks → committees → scheduling → schedule → result. */
export default function DefenseWorkflowGuide({ variant = "tracks" }) {
  const { t } = useLanguage();

  const steps = [
    {
      id: "tracks",
      label: t("defenseWorkflow.stepTracks"),
      caption: t("defenseWorkflow.stepTracksHint"),
      to: "/dashboard/tracks",
    },
    {
      id: "committees",
      label: t("defenseWorkflow.stepCommittees"),
      caption: t("defenseWorkflow.stepCommitteesHint"),
      to: "/dashboard/committees",
    },
    {
      id: "scheduling",
      label: t("defenseWorkflow.stepScheduling"),
      caption: t("defenseWorkflow.stepSchedulingHint"),
      to: "/dashboard/scheduling",
    },
    {
      id: "schedule",
      label: t("defenseWorkflow.stepMySchedule"),
      caption: t("defenseWorkflow.stepMyScheduleHint"),
      to: "/dashboard/my-schedule",
    },
    {
      id: "result",
      label: t("defenseWorkflow.stepResult"),
      caption: t("defenseWorkflow.stepResultHint"),
      to: "/dashboard/projects",
    },
  ];

  return (
    <Paper elevation={0} sx={{ ...sectionPaperSx, p: { xs: 1.5, md: 2 }, mb: 3 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 900, mb: 1.5 }}>
        {t("defenseWorkflow.title")}
      </Typography>

      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          width: "100%",
          overflowX: { xs: "auto", md: "visible" },
          pb: { xs: 0.5, md: 0 },
        }}
      >
        {steps.map((step, index) => {
          const isActive = step.id === variant;

          return (
            <React.Fragment key={step.id}>
              {index > 0 && (
                <Box
                  sx={{
                    flex: 1,
                    minWidth: 12,
                    height: 2,
                    bgcolor: "divider",
                    mt: 2.25,
                    mx: { xs: 0.25, sm: 0.5 },
                    borderRadius: 1,
                  }}
                />
              )}

              <Box
                component={RouterLink}
                to={step.to}
                sx={{
                  flex: "0 0 auto",
                  width: { xs: 72, sm: 110, md: 130 },
                  textDecoration: "none",
                  color: "inherit",
                  textAlign: "center",
                  borderRadius: 2,
                  py: 0.75,
                  px: 0.5,
                  transition: "background-color 0.2s ease",
                  bgcolor: isActive ? (theme) => alpha(theme.palette.primary.main, 0.08) : "transparent",
                  "&:hover": {
                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.06),
                  },
                }}
              >
                <Box sx={{ display: "flex", justifyContent: "center", mb: 0.75 }}>
                  <StepIconBadge id={step.id} active={isActive} />
                </Box>
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: isActive ? 900 : 700,
                    display: "block",
                    lineHeight: 1.3,
                    color: isActive ? "primary.main" : "text.primary",
                  }}
                >
                  {step.label}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    display: { xs: "none", lg: "block" },
                    mt: 0.35,
                    lineHeight: 1.35,
                    fontSize: "0.68rem",
                  }}
                >
                  {step.caption}
                </Typography>
              </Box>
            </React.Fragment>
          );
        })}
      </Box>
    </Paper>
  );
}

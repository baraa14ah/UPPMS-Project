import React from "react";
import { Box, Paper, Typography, alpha } from "@mui/material";
import { WORKFLOW_STEPS } from "../../utils/schedulingFormUtils";
import { sectionPaperSx } from "../../styles/dashboardUi";
import { useLanguage } from "../../context/LanguageContext";

/** Internal scheduling steps — types → rooms → generate. */
export default function SchedulingWorkflowStepper({ activeStep, onStepChange }) {
  const { t } = useLanguage();

  return (
    <Paper elevation={0} sx={{ ...sectionPaperSx, p: { xs: 1.5, md: 2 }, mb: 3 }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          width: "100%",
          overflowX: { xs: "auto", md: "visible" },
        }}
      >
        {WORKFLOW_STEPS.map((step, index) => {
          const isActive = activeStep === index;

          return (
            <React.Fragment key={step.id}>
              {index > 0 && (
                <Box
                  sx={{
                    flex: 1,
                    minWidth: 16,
                    height: 2,
                    bgcolor: "divider",
                    mt: 2.25,
                    mx: { xs: 0.5, sm: 1 },
                    borderRadius: 1,
                  }}
                />
              )}

              <Box
                component="button"
                type="button"
                onClick={() => onStepChange(index)}
                sx={{
                  flex: "0 0 auto",
                  width: { xs: 100, sm: 150, md: 180 },
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
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
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    mx: "auto",
                    mb: 0.75,
                    display: "grid",
                    placeItems: "center",
                    fontWeight: 900,
                    fontSize: "0.9rem",
                    bgcolor: (theme) =>
                      isActive
                        ? alpha(theme.palette.primary.main, 0.14)
                        : alpha(theme.palette.text.secondary, 0.1),
                    color: isActive ? "primary.main" : "text.secondary",
                    border: "2px solid",
                    borderColor: isActive ? "primary.main" : "transparent",
                  }}
                >
                  {index + 1}
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
                  {t(step.labelKey)}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    display: { xs: "none", md: "block" },
                    mt: 0.35,
                    lineHeight: 1.35,
                    fontSize: "0.68rem",
                  }}
                >
                  {t(step.captionKey)}
                </Typography>
              </Box>
            </React.Fragment>
          );
        })}
      </Box>
    </Paper>
  );
}

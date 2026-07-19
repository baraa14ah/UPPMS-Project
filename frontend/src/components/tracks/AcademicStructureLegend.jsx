import React from "react";
import { Box, Paper, Stack, Typography, alpha } from "@mui/material";
import RouteRoundedIcon from "@mui/icons-material/RouteRounded";
import AccountTreeRoundedIcon from "@mui/icons-material/AccountTreeRounded";
import EventAvailableRoundedIcon from "@mui/icons-material/EventAvailableRounded";
import { useLanguage } from "../../context/LanguageContext";
import { sectionPaperSx } from "../../styles/dashboardUi";

import LinkRoundedIcon from "@mui/icons-material/LinkRounded";

const LEVELS = [
  { key: "track", icon: RouteRoundedIcon, color: "#8B5CF6" },
  { key: "subTrack", icon: AccountTreeRoundedIcon, color: "#0EA5E9" },
  { key: "step", icon: EventAvailableRoundedIcon, color: "#F59E0B" },
  { key: "defenseType", icon: LinkRoundedIcon, color: "#10B981" },
];

/** Visual legend: main track → sub-track → step (= defense type from scheduling). */
export default function AcademicStructureLegend({ compact = false }) {
  const { t } = useLanguage();

  if (compact) {
    return (
      <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.7, display: "block" }}>
        {t("tracks.structureLegendCompact")}
      </Typography>
    );
  }

  return (
    <Paper elevation={0} sx={{ ...sectionPaperSx, p: { xs: 2, md: 2.5 }, mb: 3 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 900, mb: 0.5 }}>
        {t("tracks.structureLegendTitle")}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.65 }}>
        {t("tracks.structureLegendIntro")}
      </Typography>

      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={1.5}
        alignItems={{ xs: "stretch", md: "center" }}
        flexWrap="wrap"
        useFlexGap
      >
        {LEVELS.map((level, index) => {
          const Icon = level.icon;
          return (
            <React.Fragment key={level.key}>
              <Box
                sx={{
                  flex: { md: "1 1 0" },
                  minWidth: { xs: "100%", sm: 200 },
                  p: 1.75,
                  borderRadius: 2.5,
                  border: "1px solid",
                  borderColor: alpha(level.color, 0.35),
                  bgcolor: alpha(level.color, 0.06),
                }}
              >
                <Stack direction="row" spacing={1} alignItems="flex-start">
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: 1.5,
                      bgcolor: alpha(level.color, 0.15),
                      color: level.color,
                      display: "grid",
                      placeItems: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon fontSize="small" />
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="caption" sx={{ fontWeight: 900, color: level.color, display: "block" }}>
                      {t(`tracks.structureLevel.${level.key}.label`)}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.35, mt: 0.25 }}>
                      {t(`tracks.structureLevel.${level.key}.example`)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5, lineHeight: 1.5 }}>
                      {t(`tracks.structureLevel.${level.key}.hint`)}
                    </Typography>
                  </Box>
                </Stack>
              </Box>
              {index < LEVELS.length - 1 && (
                <Typography
                  sx={{
                    display: { xs: "none", md: "block" },
                    fontWeight: 900,
                    color: "text.disabled",
                    px: 0.5,
                  }}
                >
                  →
                </Typography>
              )}
            </React.Fragment>
          );
        })}
      </Stack>
    </Paper>
  );
}

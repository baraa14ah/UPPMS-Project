import React from "react";
import { Box, Chip, Paper, Stack, Typography, alpha } from "@mui/material";
import LightbulbRoundedIcon from "@mui/icons-material/LightbulbRounded";
import { useLanguage } from "../../context/LanguageContext";
import { sectionPaperSx } from "../../styles/dashboardUi";

/** Visual quota indicator for student proposal slots. */
export default function ProposalQuotaStrip({
  used = 0,
  max = 3,
  statusLabel,
  statusColor = "default",
}) {
  const { t } = useLanguage();

  return (
    <Paper
      elevation={0}
      sx={{
        ...sectionPaperSx,
        mb: 0,
        p: { xs: 2, md: 2.25 },
      }}
    >
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        alignItems={{ xs: "flex-start", sm: "center" }}
        justifyContent="space-between"
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 2,
              display: "grid",
              placeItems: "center",
              bgcolor: (theme) => alpha(theme.palette.primary.main, 0.12),
              color: "primary.main",
              flexShrink: 0,
            }}
          >
            <LightbulbRoundedIcon />
          </Box>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>
              {t("proposals.ideasQuota")}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
              {t("proposals.ideasMeter", { count: used, max })}
            </Typography>
          </Box>
        </Stack>

        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          {Array.from({ length: max }).map((_, index) => {
            const filled = index < used;
            return (
              <Box
                key={index}
                sx={{
                  width: 56,
                  height: 40,
                  borderRadius: 2,
                  border: "2px solid",
                  borderColor: filled ? "primary.main" : "divider",
                  bgcolor: filled
                    ? (theme) => alpha(theme.palette.primary.main, 0.1)
                    : "background.default",
                  display: "grid",
                  placeItems: "center",
                  fontWeight: 900,
                  fontSize: "0.8rem",
                  color: filled ? "primary.main" : "text.disabled",
                }}
              >
                {filled ? t("proposals.slotUsed") : index + 1}
              </Box>
            );
          })}
          {statusLabel && (
            <Chip
              label={statusLabel}
              color={statusColor}
              sx={{ fontWeight: 800, ml: { sm: 1 } }}
            />
          )}
        </Stack>
      </Stack>
    </Paper>
  );
}

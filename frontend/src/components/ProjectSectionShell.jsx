import React from "react";
import { Box, Paper, Stack, Typography, alpha } from "@mui/material";
import { sectionPaperSx, accentTop } from "../styles/dashboardUi";

/** Paper wrapper with accent bar, header, and optional actions for project sections. */
export default function ProjectSectionShell({
  icon: Icon,
  title,
  subtitle,
  accent = "#3B82F6",
  actions,
  children,
  sx,
  contentSx,
  noPadding,
  compact = false,
}) {
  const iconSize = compact ? 34 : 44;
  const titleVariant = compact ? "subtitle1" : "h6";

  return (
    <Paper
      elevation={0}
      sx={{
        ...sectionPaperSx,
        ...accentTop(accent),
        overflow: "hidden",
        ...(noPadding ? { p: 0 } : {}),
        ...(compact && !noPadding ? { p: { xs: 1.5, md: 2 } } : {}),
        ...sx,
      }}
    >
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        spacing={compact ? 1 : 1.5}
        sx={{
          px: noPadding ? { xs: 1.5, md: 2 } : 0,
          pt: noPadding ? { xs: 1.5, md: 2 } : 0,
          pb: noPadding ? 0 : compact ? 1.25 : 2,
          mb: noPadding ? (compact ? 1.25 : 2) : 0,
        }}
      >
        <Stack direction="row" spacing={compact ? 1 : 1.5} alignItems="center" sx={{ minWidth: 0 }}>
          {Icon && (
            <Box
              sx={{
                width: iconSize,
                height: iconSize,
                borderRadius: compact ? 2 : 2.5,
                display: "grid",
                placeItems: "center",
                flexShrink: 0,
                bgcolor: alpha(accent, 0.12),
                color: accent,
                "& svg": { fontSize: compact ? 20 : 24 },
              }}
            >
              <Icon />
            </Box>
          )}
          <Box sx={{ minWidth: 0 }}>
            <Typography variant={titleVariant} sx={{ fontWeight: 900, lineHeight: 1.25 }}>
              {title}
            </Typography>
            {subtitle && !compact && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.35, fontWeight: 500, maxWidth: 560 }}
              >
                {subtitle}
              </Typography>
            )}
          </Box>
        </Stack>
        {actions}
      </Stack>
      <Box
        sx={{
          ...(noPadding
            ? { px: { xs: 1.5, md: 2 }, pb: { xs: 1.5, md: 2 } }
            : {}),
          ...contentSx,
        }}
      >
        {children}
      </Box>
    </Paper>
  );
}

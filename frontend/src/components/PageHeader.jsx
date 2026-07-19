import React from "react";
import { Box, Paper, Typography, Stack, alpha, useTheme } from "@mui/material";
import { useAuth } from "../context/AuthContext";
import { getRoleTheme } from "../config/roleTheme";
import {
  resolveRoleGradient,
  rtlSafeGradientStyle,
} from "../utils/rtlSafeGradient";

/** Unified dashboard page header with optional role-based gradient. */
export default function PageHeader({
  title,
  subtitle,
  icon,
  actions,
  gradient = true,
  roleName,
  gradientOverride,
}) {
  const theme = useTheme();
  const { user } = useAuth();
  const resolvedRole =
    roleName ??
    String(user?.role?.name ?? user?.role ?? "student").toLowerCase();
  const roleTheme = getRoleTheme(resolvedRole);
  const gradientValue = resolveRoleGradient(
    resolvedRole,
    theme.palette.mode,
    gradientOverride,
  );

  return (
    <Paper
      elevation={0}
      style={gradient ? rtlSafeGradientStyle(gradientValue) : undefined}
      sx={{
        mb: 2.5,
        borderRadius: 3,
        overflow: "hidden",
        border: "1px solid",
        borderColor: "divider",
        ...(!gradient && { bgcolor: "background.paper" }),
        color: gradient ? "#FFFFFF" : "text.primary",
        "& .MuiTypography-root": gradient
          ? { color: "#FFFFFF !important" }
          : undefined,
        "& .MuiChip-root": gradient
          ? {
              color: "#FFFFFF",
              bgcolor: "rgba(255,255,255,0.12)",
              borderColor: "rgba(255,255,255,0.4)",
            }
          : undefined,
        "& .MuiChip-icon": gradient
          ? { color: "#FFFFFF !important" }
          : undefined,
      }}
    >
      <Stack
        direction={{ xs: "column", sm: "row" }}
        alignItems={{ xs: "flex-start", sm: "center" }}
        justifyContent="space-between"
        spacing={2}
        sx={{ p: { xs: 1.75, md: 2.25 } }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          {icon && (
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 2,
                display: "grid",
                placeItems: "center",
                bgcolor: gradient ? alpha("#fff", 0.14) : roleTheme.accentSoft,
                color: gradient ? "white" : roleTheme.accent,
                border: gradient ? `1px solid ${alpha("#fff", 0.25)}` : "none",
              }}
            >
              {icon}
            </Box>
          )}
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 950, lineHeight: 1.2 }}>
              {title}
            </Typography>
            {subtitle && (
              <Typography
                variant="body2"
                sx={{
                  mt: 0.35,
                  opacity: gradient ? 0.92 : 0.75,
                  fontWeight: 500,
                  maxWidth: 560,
                  lineHeight: 1.6,
                }}
              >
                {subtitle}
              </Typography>
            )}
          </Box>
        </Stack>
        {actions && (
          <Box
            sx={{
              width: { xs: "100%", sm: "auto" },
              "& .MuiButton-root": {
                color: "#FFFFFF !important",
                border: "2px solid #FFFFFF !important",
                bgcolor: "rgba(255,255,255,0.1) !important",
                backgroundImage: "none !important",
                boxShadow: "none !important",
                "&:hover": {
                  bgcolor: "rgba(255,255,255,0.2) !important",
                  borderColor: "#FFFFFF !important",
                },
                "& .MuiButton-startIcon, & .MuiButton-endIcon": {
                  color: "#FFFFFF !important",
                },
              },
            }}
          >
            {actions}
          </Box>
        )}
      </Stack>
    </Paper>
  );
}

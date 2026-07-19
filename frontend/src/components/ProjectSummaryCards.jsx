import React from "react";
import { Box, Grid, Paper, Stack, Typography, alpha } from "@mui/material";
import AppSkeleton from "./loading/AppSkeleton";
import { skeletonCardSx } from "../styles/skeletonStyles";

/** Clickable project status summary cards for the projects list page. */
export default function ProjectSummaryCards({
  items = [],
  activeKey = "",
  onSelect,
  loading = false,
}) {
  if (loading) {
    return (
      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Grid size={{ xs: 6, md: 3 }} key={i}>
            <Paper elevation={0} sx={{ ...skeletonCardSx, p: 2 }}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <AppSkeleton variant="rounded" width={44} height={44} />
                <Box sx={{ flex: 1 }}>
                  <AppSkeleton width="45%" height={28} />
                  <AppSkeleton width="75%" height={16} sx={{ mt: 0.75 }} />
                </Box>
              </Stack>
            </Paper>
          </Grid>
        ))}
      </Grid>
    );
  }

  return (
    <Grid container spacing={2} sx={{ mb: 2.5 }}>
      {items.map((item) => {
        const Icon = item.icon;
        const active = activeKey === item.key;

        return (
          <Grid size={{ xs: 6, md: 3 }} key={item.key || "all"}>
            <Paper
              component="button"
              type="button"
              elevation={0}
              onClick={() => onSelect?.(item.key)}
              sx={{
                width: "100%",
                p: 2,
                borderRadius: 2.5,
                border: "2px solid",
                borderColor: active ? item.color : "divider",
                bgcolor: active ? alpha(item.color, 0.09) : "background.paper",
                cursor: "pointer",
                textAlign: "start",
                transition: "border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease",
                boxShadow: active
                  ? `0 8px 24px ${alpha(item.color, 0.15)}`
                  : "0 2px 10px rgba(15,23,42,0.04)",
                "&:hover": {
                  borderColor: item.color,
                  transform: "translateY(-2px)",
                  boxShadow: `0 10px 28px ${alpha(item.color, 0.12)}`,
                },
              }}
            >
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: 2,
                    display: "grid",
                    placeItems: "center",
                    bgcolor: alpha(item.color, 0.14),
                    color: item.color,
                    flexShrink: 0,
                  }}
                >
                  <Icon fontSize="small" />
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="h5" sx={{ fontWeight: 900, lineHeight: 1.1 }}>
                    {item.value}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700 }}>
                    {item.label}
                  </Typography>
                </Box>
              </Stack>
            </Paper>
          </Grid>
        );
      })}
    </Grid>
  );
}

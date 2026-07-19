import React from "react";
import { Box, Grid, Paper, Stack } from "@mui/material";
import PageHeaderSkeleton from "./PageHeaderSkeleton";
import AppSkeleton from "./AppSkeleton";
import ProjectsGridSkeleton from "./ProjectsGridSkeleton";
import { skeletonCardSx } from "../../styles/skeletonStyles";

/** Route-level Suspense fallback that mirrors common dashboard page layouts. */
export default function RouteLoadingFallback() {
  return (
    <Box sx={{ width: "100%" }}>
      <PageHeaderSkeleton />

      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={i}>
            <Paper elevation={0} sx={{ ...skeletonCardSx, p: 2 }}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <AppSkeleton variant="rounded" width={44} height={44} />
                <Box sx={{ flex: 1 }}>
                  <AppSkeleton width="55%" height={26} />
                  <AppSkeleton width="80%" height={16} sx={{ mt: 0.75 }} />
                </Box>
              </Stack>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Paper elevation={0} sx={{ ...skeletonCardSx, p: 2, mb: 2.5 }}>
        <AppSkeleton variant="rounded" height={40} sx={{ maxWidth: 460 }} />
      </Paper>

      <ProjectsGridSkeleton count={6} />
    </Box>
  );
}

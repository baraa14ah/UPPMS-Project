import React from "react";
import { Box, Grid, Paper, Stack } from "@mui/material";
import AppSkeleton from "./AppSkeleton";
import { skeletonCardSx } from "../../styles/skeletonStyles";

/** Skeleton for the profile page layout. */
export default function ProfilePageSkeleton() {
  return (
    <Stack spacing={3}>
      <Paper elevation={0} sx={{ ...skeletonCardSx, p: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <AppSkeleton variant="rounded" width={88} height={88} sx={{ borderRadius: 3 }} />
          <Box sx={{ flex: 1 }}>
            <AppSkeleton width="40%" height={32} sx={{ mb: 1 }} />
            <AppSkeleton width="55%" height={22} />
          </Box>
        </Stack>
      </Paper>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 7 }}>
          <Paper elevation={0} sx={{ ...skeletonCardSx, p: 3 }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <AppSkeleton
                key={i}
                variant="rounded"
                height={56}
                sx={{ mb: i < 4 ? 2 : 0 }}
              />
            ))}
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, lg: 5 }}>
          <Stack spacing={3}>
            <AppSkeleton variant="rounded" height={180} sx={{ borderRadius: 3 }} />
            <AppSkeleton variant="rounded" height={260} sx={{ borderRadius: 3 }} />
          </Stack>
        </Grid>
      </Grid>
    </Stack>
  );
}

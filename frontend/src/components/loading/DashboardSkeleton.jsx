import React from "react";
import { Box, Paper, Stack } from "@mui/material";
import PageHeaderSkeleton from "./PageHeaderSkeleton";
import AppSkeleton from "./AppSkeleton";
import { skeletonCardSx } from "../../styles/skeletonStyles";

/** Skeleton mirroring the main dashboard layout. */
export default function DashboardSkeleton() {
  return (
    <Box sx={{ maxWidth: 1400, mx: "auto", width: "100%" }}>
      <PageHeaderSkeleton />

      <Paper elevation={0} sx={{ ...skeletonCardSx, p: 2.5, mb: 3 }}>
        <Stack direction="row" justifyContent="space-between" sx={{ mb: 1.5 }}>
          <AppSkeleton width={160} height={22} />
          <AppSkeleton width={48} height={28} />
        </Stack>
        <AppSkeleton variant="rounded" width="100%" height={12} sx={{ borderRadius: 99 }} />
        <AppSkeleton width="55%" height={16} sx={{ mt: 1.25 }} />
      </Paper>

      <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ mb: 3 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Paper key={i} elevation={0} sx={{ ...skeletonCardSx, p: 2, flex: 1 }}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <AppSkeleton variant="rounded" width={48} height={48} />
              <Box sx={{ flex: 1 }}>
                <AppSkeleton width="70%" height={28} />
                <AppSkeleton width="90%" height={16} sx={{ mt: 0.75 }} />
              </Box>
            </Stack>
            <AppSkeleton width="35%" height={36} sx={{ mt: 2 }} />
            <AppSkeleton width="80%" height={16} sx={{ mt: 0.75 }} />
          </Paper>
        ))}
      </Stack>

      <Stack direction={{ xs: "column", lg: "row" }} spacing={2}>
        <Paper elevation={0} sx={{ ...skeletonCardSx, p: 2, flex: 1 }}>
          <AppSkeleton width={180} height={24} sx={{ mb: 2 }} />
          {Array.from({ length: 5 }).map((_, i) => (
            <Stack key={i} direction="row" spacing={1.5} sx={{ mb: 1.5 }}>
              <AppSkeleton variant="rounded" width={36} height={36} />
              <Box sx={{ flex: 1 }}>
                <AppSkeleton width="72%" height={18} />
                <AppSkeleton width="40%" height={14} sx={{ mt: 0.5 }} />
              </Box>
              <AppSkeleton variant="rounded" width={72} height={24} />
            </Stack>
          ))}
        </Paper>
        <Paper elevation={0} sx={{ ...skeletonCardSx, p: 2, flex: 1, maxWidth: { lg: 420 } }}>
          <AppSkeleton width={150} height={24} sx={{ mb: 2 }} />
          {Array.from({ length: 5 }).map((_, i) => (
            <Stack key={i} direction="row" spacing={1.25} sx={{ mb: 1.5 }}>
              <AppSkeleton variant="rounded" width={28} height={28} />
              <Box sx={{ flex: 1 }}>
                <AppSkeleton width="80%" height={18} />
                <AppSkeleton width="50%" height={14} sx={{ mt: 0.5 }} />
              </Box>
            </Stack>
          ))}
        </Paper>
      </Stack>
    </Box>
  );
}

import React from "react";
import { Box, Paper, Stack } from "@mui/material";
import AppSkeleton from "./AppSkeleton";
import { skeletonCardSx } from "../../styles/skeletonStyles";

/** Skeleton for scheduling admin workflow (stepper + panel). */
export default function SchedulingPageSkeleton() {
  return (
    <Box>
      <Paper elevation={0} sx={{ ...skeletonCardSx, p: { xs: 1.5, md: 2 }, mb: 3 }}>
        <AppSkeleton width={220} height={20} sx={{ mb: 1.5 }} />
        <Stack
          direction="row"
          spacing={{ xs: 0.5, md: 1 }}
          sx={{ overflowX: "auto", pb: 0.5 }}
        >
          {Array.from({ length: 5 }).map((_, i) => (
            <AppSkeleton
              key={i}
              variant="rounded"
              sx={{ flex: "0 0 auto", width: { xs: 72, sm: 110, md: 130 }, height: 72 }}
            />
          ))}
        </Stack>
      </Paper>

      <Paper elevation={0} sx={{ ...skeletonCardSx, p: 2, mb: 3 }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.5}
          justifyContent="space-between"
        >
          {Array.from({ length: 3 }).map((_, i) => (
            <AppSkeleton
              key={i}
              variant="rounded"
              sx={{ width: { xs: "100%", sm: "32%" }, height: 40 }}
            />
          ))}
        </Stack>
      </Paper>

      <Paper elevation={0} sx={{ ...skeletonCardSx, p: { xs: 2, md: 2.5 } }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "stretch", md: "center" }}
          spacing={2}
          sx={{ mb: 2.5 }}
        >
          <AppSkeleton width="38%" height={26} />
          <AppSkeleton variant="rounded" width={160} height={40} />
        </Stack>

        <Stack spacing={1}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Stack
              key={i}
              direction="row"
              spacing={1.5}
              alignItems="center"
              sx={{
                p: 1.25,
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2,
              }}
            >
              <AppSkeleton variant="rounded" width={36} height={36} />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <AppSkeleton width={`${60 - i * 4}%`} height={18} />
                <AppSkeleton width={`${40 + i * 3}%`} height={14} sx={{ mt: 0.5 }} />
              </Box>
              <AppSkeleton variant="rounded" width={72} height={30} />
            </Stack>
          ))}
        </Stack>
      </Paper>
    </Box>
  );
}

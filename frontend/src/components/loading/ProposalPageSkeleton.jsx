import React from "react";
import { Paper, Stack } from "@mui/material";
import AppSkeleton from "./AppSkeleton";
import { skeletonCardSx } from "../../styles/skeletonStyles";

/** Skeleton matching the original single-column proposals layout. */
export default function ProposalPageSkeleton() {
  return (
    <Stack spacing={2}>
      <AppSkeleton width="30%" height={20} />
      <Paper elevation={0} sx={{ ...skeletonCardSx, p: 3 }}>
        <AppSkeleton variant="rounded" height={56} sx={{ mb: 1.5 }} />
        <AppSkeleton variant="rounded" height={120} sx={{ mb: 1.5 }} />
        <AppSkeleton variant="rounded" height={56} sx={{ mb: 2 }} />
        <AppSkeleton variant="rounded" height={42} width={140} />
      </Paper>
      <AppSkeleton width="25%" height={28} />
      <Paper elevation={0} sx={{ ...skeletonCardSx, p: 2 }}>
        <AppSkeleton variant="rounded" height={80} sx={{ mb: 1.5 }} />
        <AppSkeleton variant="rounded" height={80} />
      </Paper>
    </Stack>
  );
}

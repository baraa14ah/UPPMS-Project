import React from "react";
import { Paper, Stack } from "@mui/material";
import AppSkeleton from "./AppSkeleton";
import { skeletonCardSx } from "../../styles/skeletonStyles";

/** Tabs + search toolbar placeholder for admin list pages. */
export default function AdminToolbarSkeleton({ withSearch = true }) {
  return (
    <Paper elevation={0} sx={{ ...skeletonCardSx, p: { xs: 2, md: 2.5 }, mb: 3 }}>
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={2}
        alignItems={{ xs: "stretch", md: "center" }}
        justifyContent="space-between"
      >
        <Stack direction="row" spacing={1} sx={{ overflowX: "auto", pb: 0.5 }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <AppSkeleton key={i} variant="rounded" width={88} height={36} />
          ))}
        </Stack>
        {withSearch && (
          <Stack direction="row" spacing={1} sx={{ minWidth: { md: 280 } }}>
            <AppSkeleton variant="rounded" sx={{ flex: 1, height: 40 }} />
            <AppSkeleton variant="rounded" width={88} height={40} />
          </Stack>
        )}
      </Stack>
    </Paper>
  );
}

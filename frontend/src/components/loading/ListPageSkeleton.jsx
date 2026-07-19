import React from "react";
import { Box, Paper, Stack } from "@mui/material";
import PageHeaderSkeleton from "./PageHeaderSkeleton";
import AppSkeleton from "./AppSkeleton";
import { skeletonCardSx } from "../../styles/skeletonStyles";

/** Generic list-page skeleton (toolbar + rows). */
export default function ListPageSkeleton({ rows = 6, withToolbar = true }) {
  return (
    <Box sx={{ width: "100%", maxWidth: 1400, mx: "auto" }}>
      <PageHeaderSkeleton />

      {withToolbar && (
        <Paper elevation={0} sx={{ ...skeletonCardSx, p: 2, mb: 2.5 }}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
            <AppSkeleton variant="rounded" height={40} sx={{ flex: 1, maxWidth: 420 }} />
            <AppSkeleton variant="rounded" width={140} height={40} />
          </Stack>
        </Paper>
      )}

      <Paper elevation={0} sx={{ ...skeletonCardSx, p: 2 }}>
        {Array.from({ length: rows }).map((_, i) => (
          <Stack
            key={i}
            direction="row"
            spacing={1.5}
            alignItems="center"
            sx={{
              py: 1.25,
              borderBottom: i < rows - 1 ? "1px solid" : "none",
              borderColor: "divider",
            }}
          >
            <AppSkeleton variant="rounded" width={44} height={44} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <AppSkeleton width={`${68 - i * 4}%`} height={20} />
              <AppSkeleton width={`${42 + i * 3}%`} height={15} sx={{ mt: 0.6 }} />
            </Box>
            <AppSkeleton variant="rounded" width={88} height={30} />
          </Stack>
        ))}
      </Paper>
    </Box>
  );
}

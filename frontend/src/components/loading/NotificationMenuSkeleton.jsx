import React from "react";
import { Box, Stack } from "@mui/material";
import AppSkeleton from "./AppSkeleton";

/** Compact skeleton rows for the header notification dropdown. */
export default function NotificationMenuSkeleton({ count = 3 }) {
  return (
    <Box sx={{ px: 2, py: 1.5 }}>
      <Stack spacing={1.5}>
        {Array.from({ length: count }).map((_, i) => (
          <Stack key={i} direction="row" spacing={1.5} alignItems="flex-start">
            <AppSkeleton variant="rounded" width={44} height={44} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <AppSkeleton width="78%" height={18} />
              <AppSkeleton width="95%" height={14} sx={{ mt: 0.6 }} />
              <AppSkeleton width="40%" height={12} sx={{ mt: 0.6 }} />
            </Box>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}

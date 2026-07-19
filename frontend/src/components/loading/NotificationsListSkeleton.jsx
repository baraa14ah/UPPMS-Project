import React from "react";
import { Stack } from "@mui/material";
import AppSkeleton from "./AppSkeleton";

/** Skeleton rows matching the notifications inbox list. */
export default function NotificationsListSkeleton({ count = 5 }) {
  return (
    <Stack spacing={2}>
      {Array.from({ length: count }).map((_, i) => (
        <Stack
          key={i}
          direction="row"
          spacing={2}
          alignItems="flex-start"
          sx={{
            p: 2.5,
            borderRadius: 3,
            border: "1px solid",
            borderColor: "divider",
            bgcolor: "background.paper",
          }}
        >
          <AppSkeleton variant="rounded" width={52} height={52} sx={{ borderRadius: 2.5 }} />
          <Stack spacing={0.75} sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" justifyContent="space-between" spacing={1}>
              <AppSkeleton width="48%" height={22} />
              <AppSkeleton variant="rounded" width={72} height={24} />
            </Stack>
            <AppSkeleton width="92%" height={16} />
            <AppSkeleton width="70%" height={16} />
            <AppSkeleton width="120px" height={14} sx={{ mt: 0.5 }} />
          </Stack>
        </Stack>
      ))}
    </Stack>
  );
}

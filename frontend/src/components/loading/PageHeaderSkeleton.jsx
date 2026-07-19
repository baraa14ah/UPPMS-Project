import React from "react";
import { Box, Paper, Stack } from "@mui/material";
import AppSkeleton from "./AppSkeleton";

/** Skeleton matching the gradient PageHeader layout. */
export default function PageHeaderSkeleton({ withActions = true }) {
  return (
    <Paper
      elevation={0}
      sx={{
        mb: 2.5,
        borderRadius: 3,
        border: "1px solid",
        borderColor: "divider",
        overflow: "hidden",
      }}
    >
      <Box sx={{ p: { xs: 1.75, md: 2.25 } }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          alignItems={{ xs: "flex-start", sm: "center" }}
          justifyContent="space-between"
        >
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ width: { xs: "100%", sm: "auto" } }}>
            <AppSkeleton variant="rounded" width={44} height={44} sx={{ flexShrink: 0 }} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <AppSkeleton width="38%" height={30} sx={{ maxWidth: 280 }} />
              <AppSkeleton width="62%" height={18} sx={{ mt: 0.75, maxWidth: 420 }} />
            </Box>
          </Stack>
          {withActions && (
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1}
              sx={{ width: { xs: "100%", sm: "auto" } }}
            >
              <AppSkeleton variant="rounded" sx={{ width: { xs: "100%", sm: 132 }, height: 40 }} />
              <AppSkeleton variant="rounded" sx={{ width: { xs: "100%", sm: 132 }, height: 40 }} />
            </Stack>
          )}
        </Stack>
      </Box>
    </Paper>
  );
}

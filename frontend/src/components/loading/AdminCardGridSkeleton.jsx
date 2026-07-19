import React from "react";
import { Box, Card, CardContent, Divider, Stack } from "@mui/material";
import AppSkeleton from "./AppSkeleton";
import { skeletonCardSx } from "../../styles/skeletonStyles";

const staggerKeyframes = {
  "@keyframes pmsSkeletonStagger": {
    from: { opacity: 0, transform: "translateY(6px)" },
    to: { opacity: 1, transform: "translateY(0)" },
  },
};

function staggerSx(index) {
  return {
    ...staggerKeyframes,
    animation: "pmsSkeletonStagger 0.45s ease both",
    animationDelay: `${index * 0.05}s`,
  };
}

function DefaultCardBody() {
  return (
    <CardContent sx={{ p: 2.5 }}>
      <Stack direction="row" spacing={1.25} sx={{ mb: 1.5 }}>
        <AppSkeleton variant="rounded" width={44} height={44} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <AppSkeleton width="75%" height={22} />
          <AppSkeleton width="50%" height={16} sx={{ mt: 0.75 }} />
        </Box>
      </Stack>
      <Stack direction="row" spacing={0.75} sx={{ mb: 1.5 }} flexWrap="wrap" useFlexGap>
        <AppSkeleton variant="rounded" width={72} height={24} />
        <AppSkeleton variant="rounded" width={88} height={24} />
      </Stack>
      <AppSkeleton width="100%" height={14} />
      <AppSkeleton width="88%" height={14} sx={{ mt: 0.5 }} />
      <Divider sx={{ my: 1.75 }} />
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <AppSkeleton width={90} height={16} />
        <Stack direction="row" spacing={0.5}>
          <AppSkeleton variant="rounded" width={56} height={30} />
          <AppSkeleton variant="rounded" width={72} height={30} />
        </Stack>
      </Stack>
    </CardContent>
  );
}

function TrackCardBody() {
  return (
    <CardContent sx={{ p: 2.5 }}>
      <Stack direction="row" spacing={1.5} alignItems="flex-start">
        <AppSkeleton variant="rounded" width={42} height={42} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <AppSkeleton width="42%" height={26} />
            <AppSkeleton variant="rounded" width={64} height={24} />
            <AppSkeleton variant="rounded" width={80} height={24} />
          </Stack>
          <AppSkeleton width="70%" height={16} sx={{ mt: 1 }} />
        </Box>
      </Stack>
      <Divider sx={{ my: 1.75 }} />
      <Stack spacing={0.75}>
        {[1, 2, 3].map((i) => (
          <AppSkeleton key={i} variant="rounded" height={44} />
        ))}
      </Stack>
      <Divider sx={{ my: 1.5 }} />
      <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
        <AppSkeleton width={100} height={16} />
        <Stack direction="row" spacing={0.5}>
          <AppSkeleton variant="rounded" width={52} height={30} />
          <AppSkeleton variant="rounded" width={72} height={30} />
          <AppSkeleton variant="rounded" width={64} height={30} />
        </Stack>
      </Stack>
    </CardContent>
  );
}

/** Responsive admin card-grid skeleton — committees, tracks, etc. */
export default function AdminCardGridSkeleton({
  count = 3,
  layout = "grid",
  columns,
}) {
  const gridColumns =
    columns ??
    (layout === "track"
      ? { xs: "1fr" }
      : {
          xs: "1fr",
          sm: "repeat(2, minmax(0, 1fr))",
          lg: "repeat(3, minmax(0, 1fr))",
        });

  const Body = layout === "track" ? TrackCardBody : DefaultCardBody;

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: gridColumns,
        gap: 2.5,
        width: "100%",
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} elevation={0} sx={{ ...skeletonCardSx, ...staggerSx(i) }}>
          <Body />
        </Card>
      ))}
    </Box>
  );
}

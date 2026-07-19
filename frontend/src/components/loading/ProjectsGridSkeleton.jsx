import React from "react";
import { Box, Card, CardContent, Stack } from "@mui/material";
import AppSkeleton from "./AppSkeleton";
import { skeletonCardSx } from "../../styles/skeletonStyles";

/** Skeleton placeholder matching the projects card grid. */
export default function ProjectsGridSkeleton({ count = 6 }) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: {
          xs: "1fr",
          sm: "repeat(2, minmax(0, 1fr))",
          md: "repeat(3, minmax(0, 1fr))",
        },
        gap: 2.5,
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <Card
          key={i}
          elevation={0}
          sx={{
            ...skeletonCardSx,
            animation: "pmsSkeletonStagger 0.45s ease both",
            animationDelay: `${i * 0.05}s`,
            "@keyframes pmsSkeletonStagger": {
              from: { opacity: 0, transform: "translateY(6px)" },
              to: { opacity: 1, transform: "translateY(0)" },
            },
          }}
        >
          <CardContent sx={{ p: 2.5 }}>
            <Stack direction="row" spacing={1.25} sx={{ mb: 1.5 }}>
              <AppSkeleton variant="rounded" width={44} height={44} />
              <Box sx={{ flex: 1 }}>
                <AppSkeleton width="85%" height={22} />
                <AppSkeleton width="45%" height={16} sx={{ mt: 0.75 }} />
              </Box>
            </Stack>
            <Stack direction="row" spacing={0.75} sx={{ mb: 1.5 }}>
              <AppSkeleton variant="rounded" width={72} height={24} />
              <AppSkeleton variant="rounded" width={56} height={24} />
            </Stack>
            <AppSkeleton width="100%" height={14} />
            <AppSkeleton width="92%" height={14} sx={{ mt: 0.5 }} />
            <AppSkeleton width="70%" height={14} sx={{ mt: 0.5, mb: 1.5 }} />
            <AppSkeleton variant="rounded" width="100%" height={9} sx={{ borderRadius: 99 }} />
            <AppSkeleton variant="rounded" width="100%" height={40} sx={{ mt: 2, borderRadius: 2 }} />
          </CardContent>
        </Card>
      ))}
    </Box>
  );
}

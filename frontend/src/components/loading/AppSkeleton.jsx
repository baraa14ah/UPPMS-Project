import React from "react";
import { Skeleton } from "@mui/material";
import { skeletonSurfaceSx } from "../../styles/skeletonStyles";

/** Wave-animated skeleton used across loading placeholders. */
export default function AppSkeleton({ sx, animation = "wave", ...props }) {
  return (
    <Skeleton
      animation={animation}
      sx={{ ...skeletonSurfaceSx, ...sx }}
      {...props}
    />
  );
}

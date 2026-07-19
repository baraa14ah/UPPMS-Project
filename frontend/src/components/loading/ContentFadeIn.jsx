import React from "react";
import { Box } from "@mui/material";

/** Soft entrance animation when page content mounts after loading. */
export default function ContentFadeIn({ children, routeKey }) {
  return (
    <Box
      key={routeKey}
      sx={{
        "@keyframes pmsContentFadeIn": {
          from: {
            opacity: 0,
            transform: "translateY(8px)",
          },
          to: {
            opacity: 1,
            transform: "translateY(0)",
          },
        },
        animation: "pmsContentFadeIn 0.34s cubic-bezier(0.22, 1, 0.36, 1)",
        willChange: "opacity, transform",
      }}
    >
      {children}
    </Box>
  );
}

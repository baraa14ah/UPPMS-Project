import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Box, LinearProgress, alpha } from "@mui/material";

/** Thin top progress bar shown during route transitions (YouTube / GitHub style). */
export default function NavigationProgress() {
  const location = useLocation();
  const [visible, setVisible] = useState(false);
  const [value, setValue] = useState(0);
  const timers = useRef([]);

  const clearTimers = () => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  };

  useEffect(() => {
    clearTimers();
    setVisible(true);
    setValue(12);

    timers.current.push(window.setTimeout(() => setValue(38), 80));
    timers.current.push(window.setTimeout(() => setValue(62), 220));
    timers.current.push(window.setTimeout(() => setValue(84), 420));
    timers.current.push(
      window.setTimeout(() => {
        setValue(100);
        timers.current.push(
          window.setTimeout(() => {
            setVisible(false);
            setValue(0);
          }, 280),
        );
      }, 620),
    );

    return clearTimers;
  }, [location.pathname, location.search]);

  if (!visible) return null;

  return (
    <Box
      sx={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: (theme) => theme.zIndex.tooltip + 2,
        pointerEvents: "none",
      }}
    >
      <LinearProgress
        variant="determinate"
        value={value}
        sx={{
          height: 3,
          borderRadius: 0,
          bgcolor: "transparent",
          "& .MuiLinearProgress-bar": {
            borderRadius: 0,
            background: (theme) =>
              `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
            boxShadow: (theme) =>
              `0 0 12px ${alpha(theme.palette.secondary.main, 0.45)}`,
            transition: "transform 0.28s ease",
          },
        }}
      />
    </Box>
  );
}

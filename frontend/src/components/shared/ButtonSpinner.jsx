import { CircularProgress } from "@mui/material";

/**
 * Spinner with contrast against button backgrounds.
 * Use variant="contained" on filled/primary buttons, "outlined" on light/outlined buttons.
 */
export default function ButtonSpinner({ size = 22, variant = "contained" }) {
  const onDark = variant === "contained";

  return (
    <CircularProgress
      size={size}
      sx={{ color: onDark ? "common.white" : "primary.main" }}
    />
  );
}

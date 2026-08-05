/** Shared color palette for auth pages (consistent across languages). */
export const AUTH_COLORS = {
  navy: "#0B1220",
  slate: "#1E293B",
  heading: "#1E293B",
  text: "#475569",
  blue: "#3B82F6",
  teal: "#14B8A6",
  muted: "#64748B",
  border: "#E2E8F0",
  bg: "#F7F8FA",
  surface: "#FFFFFF",
  inputBg: "#FFFFFF",
  label: "#475569",
  placeholder: "#94A3B8",
};

/** Forces light-mode styling for auth form fields without changing page direction. */
export const authLightScopeSx = {
  bgcolor: "#FFFFFF",
  "& .MuiOutlinedInput-root": {
    bgcolor: AUTH_COLORS.inputBg,
    color: AUTH_COLORS.heading,
    "& .MuiOutlinedInput-notchedOutline": {
      borderColor: AUTH_COLORS.border,
    },
    "&:hover .MuiOutlinedInput-notchedOutline": {
      borderColor: "#CBD5E1",
    },
    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
      borderColor: AUTH_COLORS.blue,
    },
    "& .MuiOutlinedInput-input": {
      color: AUTH_COLORS.heading,
    },
    "& .MuiInputAdornment-root .MuiSvgIcon-root": {
      color: AUTH_COLORS.muted,
    },
    "&.Mui-focused .MuiInputAdornment-root .MuiSvgIcon-root": {
      color: AUTH_COLORS.blue,
    },
  },
  "& .MuiInputLabel-root": {
    color: AUTH_COLORS.muted,
  },
  "& .MuiDivider-root": {
    borderColor: AUTH_COLORS.border,
  },
  "& > form .MuiPaper-root, & form .MuiPaper-root": {
    bgcolor: AUTH_COLORS.surface,
    backgroundImage: "none",
    borderColor: AUTH_COLORS.border,
    color: AUTH_COLORS.text,
  },
  "& .MuiAlert-root": {
    bgcolor: "#EFF6FF",
    color: AUTH_COLORS.heading,
    "& .MuiAlert-icon": { color: AUTH_COLORS.blue },
  },
  "& .MuiAlert-standardError": {
    bgcolor: "#FEF2F2",
    color: "#991B1B",
    "& .MuiAlert-icon": { color: "#DC2626" },
  },
  "& .MuiAlert-standardSuccess": {
    bgcolor: "#ECFDF5",
    color: "#065F46",
    "& .MuiAlert-icon": { color: AUTH_COLORS.teal },
  },
  "& .MuiAlert-standardWarning": {
    bgcolor: "#FFFBEB",
    color: "#92400E",
    "& .MuiAlert-icon": { color: "#F59E0B" },
  },
  "& .MuiLink-root": {
    color: AUTH_COLORS.blue,
  },
};

/** Shared outlined input styling for auth form fields. */
export const authFieldSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: 2.5,
    bgcolor: AUTH_COLORS.inputBg,
    transition: "box-shadow 0.2s, border-color 0.2s",
    "&.Mui-focused": {
      boxShadow: `0 0 0 3px rgba(59, 130, 246, 0.15)`,
    },
  },
};

/** Primary submit button styling for auth pages. */
export const authPrimaryBtnSx = {
  mt: 3,
  borderRadius: 2.5,
  py: 1.5,
  fontWeight: 800,
  fontSize: 16,
  textTransform: "none",
  boxShadow: "0 8px 24px rgba(15,23,42,0.2)",
  transition: "transform 0.15s, box-shadow 0.2s",
  "&:hover": {
    boxShadow: "0 12px 28px rgba(15,23,42,0.25)",
  },
  "&:active": { transform: "scale(0.98)" },
  "& .MuiButton-startIcon, & .MuiButton-endIcon": {
    color: "#FFFFFF !important",
  },
};

/** Returns sx props for a selectable role card on registration. */
export const roleCardSx = (selected, color) => ({
  p: 2,
  borderRadius: 3,
  cursor: "pointer",
  border: "2px solid",
  borderColor: selected ? color : AUTH_COLORS.border,
  bgcolor: selected ? `${color}12` : AUTH_COLORS.surface,
  color: AUTH_COLORS.heading,
  transition: "all 0.2s ease",
  transform: selected ? "scale(1.02)" : "scale(1)",
  boxShadow: selected ? `0 8px 24px ${color}20` : "none",
  "& .MuiTypography-root": {
    color: "inherit",
  },
  "& .MuiTypography-caption": {
    color: AUTH_COLORS.muted,
  },
  "&:hover": {
    borderColor: color,
    bgcolor: `${color}08`,
  },
});

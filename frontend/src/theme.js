const NAVY = "#0B1220";
const NAVY_LIGHT = "#0F172A";
const SLATE_DARK = "#1E293B";
const SLATE_MID = "#334155";
const BLUE = "#3B82F6";
const TEAL = "#14B8A6";

export const brandColors = {
  navy: NAVY,
  blue: BLUE,
  teal: TEAL,
  bg: "#F7F8FA",
  border: "#E2E8F0",
};

/** Builds the MUI theme palette, typography, and component overrides. */
export const getDesignTokens = (mode, direction = "rtl", lang = "ar") => ({
  direction,
  palette: {
    mode,
    ...(mode === "light"
      ? {
          primary: { main: NAVY, contrastText: "#fff" },
          secondary: { main: BLUE },
          success: { main: TEAL },
          background: { default: "#F7F8FA", paper: "#FFFFFF" },
          text: { primary: "#1E293B", secondary: "#64748B" },
          divider: "#E2E8F0",
        }
      : {
          primary: { main: "#E2E8F0", contrastText: NAVY },
          secondary: { main: "#60A5FA" },
          success: { main: "#2DD4BF" },
          background: { default: NAVY_LIGHT, paper: SLATE_DARK },
          text: { primary: "#F8FAFC", secondary: "#CBD5E1" },
          divider: SLATE_MID,
        }),
  },
  shape: { borderRadius: 12 },
  typography: {
    htmlFontSize: 16,
    fontSize: 14,
    fontFamily:
      lang === "en"
        ? [
            "Inter",
            "system-ui",
            "-apple-system",
            "Segoe UI",
            "Roboto",
            "Cairo",
            "Arial",
            "sans-serif",
          ].join(",")
        : [
            "Cairo",
            "Inter",
            "system-ui",
            "-apple-system",
            "Segoe UI",
            "Roboto",
            "Arial",
            "sans-serif",
          ].join(","),
    h1: { fontWeight: 800, fontSize: "1.75rem", lineHeight: 1.25 },
    h2: { fontWeight: 800, fontSize: "1.5rem", lineHeight: 1.28 },
    h3: {
      fontWeight: 800,
      fontSize: "1.3rem",
      letterSpacing: lang === "ar" ? 0 : -0.25,
      lineHeight: 1.3,
    },
    h4: {
      fontWeight: 800,
      fontSize: "1.15rem",
      letterSpacing: lang === "ar" ? 0 : -0.2,
      lineHeight: 1.32,
    },
    h5: {
      fontWeight: 700,
      fontSize: "1.05rem",
      letterSpacing: lang === "ar" ? 0 : -0.1,
      lineHeight: 1.35,
    },
    h6: { fontWeight: 700, fontSize: "0.95rem", lineHeight: 1.4 },
    subtitle1: { fontSize: "0.95rem", fontWeight: 600 },
    subtitle2: { fontSize: "0.875rem", fontWeight: 600 },
    body1: { fontSize: "0.9375rem", lineHeight: 1.6, fontWeight: 400 },
    body2: { fontSize: "0.875rem", lineHeight: 1.55, fontWeight: 400 },
    caption: { fontSize: "0.8125rem", lineHeight: 1.45 },
    button: {
      fontWeight: 700,
      fontSize: "0.875rem",
      textTransform: "none",
      lineHeight: 1.45,
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        html: { fontSize: 16 },
        body: {
          backgroundColor: mode === "light" ? "#F7F8FA" : NAVY_LIGHT,
          fontSize: "0.9375rem",
          margin: 0,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          border: `1px solid ${mode === "light" ? "#E2E8F0" : SLATE_MID}`,
          ...(mode === "dark" && {
            backgroundColor: SLATE_DARK,
          }),
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 10 },
        containedPrimary: {
          boxShadow:
            mode === "light" ? "0 8px 24px rgba(11,18,32,0.2)" : "none",
        },
        containedSuccess: {
          color: "#FFFFFF !important",
          "&:hover": { color: "#FFFFFF !important" },
        },
        containedSecondary: {
          color: "#FFFFFF !important",
          "&:hover": { color: "#FFFFFF !important" },
        },
      },
    },
    MuiTypography: {
      styleOverrides: {
        root: {
          "&.MuiTypography-root": {},
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        root: {
          flexShrink: 0,
        },
        paper: {
          borderInlineEnd: `1px solid ${mode === "light" ? "#E2E8F0" : SLATE_MID}`,
          ...(mode === "dark" && {
            backgroundColor: SLATE_DARK,
          }),
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          ...(mode === "dark" && {
            color: "#E2E8F0",
            "&:hover": {
              backgroundColor: "rgba(255,255,255,0.08)",
            },
          }),
          "&.Mui-selected": {
            backgroundColor:
              mode === "light"
                ? "rgba(59, 130, 246, 0.12)"
                : "rgba(59, 130, 246, 0.25)",
            "&:hover": {
              backgroundColor:
                mode === "light"
                  ? "rgba(59, 130, 246, 0.16)"
                  : "rgba(59, 130, 246, 0.3)",
            },
          },
        },
      },
    },
    MuiListItemIcon: {
      styleOverrides: {
        root: {
          ...(mode === "dark" && {
            color: "#94A3B8",
          }),
        },
      },
    },
    MuiListItemText: {
      styleOverrides: {
        primary: {
          ...(mode === "dark" && {
            color: "#F1F5F9",
          }),
        },
        secondary: {
          ...(mode === "dark" && {
            color: "#94A3B8",
          }),
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 10,
        },
        standardInfo: {
          ...(mode === "dark" && {
            bgcolor: "#1E3A5F",
            color: "#E2E8F0",
            "& .MuiAlert-icon": { color: "#60A5FA" },
          }),
        },
        standardSuccess: {
          ...(mode === "dark" && {
            bgcolor: "#134E4A",
            color: "#CCFBF1",
          }),
        },
        standardWarning: {
          ...(mode === "dark" && {
            bgcolor: "#422006",
            color: "#FEF3C7",
          }),
        },
        standardError: {
          ...(mode === "dark" && {
            bgcolor: "#450A0A",
            color: "#FECACA",
          }),
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 700,
        },
        filled: {
          ...(mode === "dark" && {
            color: "#F1F5F9",
            "& .MuiChip-icon": { color: "#F1F5F9" },
          }),
        },
        outlined: {
          ...(mode === "dark" && {
            borderColor: SLATE_MID,
            color: "#E2E8F0",
          }),
        },
        colorPrimary: {
          ...(mode === "dark" && {
            backgroundColor: "rgba(59, 130, 246, 0.25)",
            color: "#93C5FD",
          }),
        },
        colorSuccess: {
          ...(mode === "dark" && {
            backgroundColor: "rgba(20, 184, 166, 0.25)",
            color: "#5EEAD4",
          }),
        },
        colorWarning: {
          ...(mode === "dark" && {
            backgroundColor: "rgba(245, 158, 11, 0.25)",
            color: "#FCD34D",
          }),
        },
        colorError: {
          ...(mode === "dark" && {
            backgroundColor: "rgba(239, 68, 68, 0.25)",
            color: "#FCA5A5",
          }),
        },
        colorInfo: {
          ...(mode === "dark" && {
            backgroundColor: "rgba(59, 130, 246, 0.2)",
            color: "#93C5FD",
          }),
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          ...(mode === "dark" && {
            "& .MuiOutlinedInput-notchedOutline": { borderColor: "#475569" },
            "&:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: "#64748B",
            },
          }),
        },
        input: {
          ...(mode === "dark" && { color: "#F1F5F9" }),
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          ...(mode === "dark" && { color: "#94A3B8" }),
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          ...(mode === "dark" && { borderColor: "#334155" }),
        },
        head: {
          ...(mode === "dark" && {
            color: "#E2E8F0",
            fontWeight: 800,
          }),
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          ...(mode === "dark" && {
            backgroundColor: SLATE_MID,
          }),
        },
        bar: {
          ...(mode === "dark" && {
            backgroundColor: "#60A5FA",
          }),
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          ...(mode === "dark" && {
            backgroundColor: SLATE_DARK,
            borderColor: SLATE_MID,
          }),
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          ...(mode === "dark" && {
            backgroundColor: SLATE_DARK,
            backgroundImage: "none",
          }),
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          ...(mode === "dark" && {
            color: "#F1F5F9",
          }),
        },
      },
    },
    MuiDialogContent: {
      styleOverrides: {
        root: {
          ...(mode === "dark" && {
            color: "#E2E8F0",
          }),
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          ...(mode === "dark" && {
            backgroundColor: SLATE_DARK,
            borderColor: SLATE_MID,
          }),
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          ...(mode === "dark" && {
            color: "#E2E8F0",
            "&:hover": {
              backgroundColor: "rgba(255,255,255,0.08)",
            },
            "&.Mui-selected": {
              backgroundColor: "rgba(59, 130, 246, 0.2)",
            },
          }),
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        icon: {
          ...(mode === "dark" && {
            color: "#94A3B8",
          }),
        },
      },
    },
    MuiAutocomplete: {
      styleOverrides: {
        paper: {
          ...(mode === "dark" && {
            backgroundColor: SLATE_DARK,
            borderColor: SLATE_MID,
          }),
        },
        option: {
          ...(mode === "dark" && {
            color: "#E2E8F0",
            "&:hover": {
              backgroundColor: "rgba(255,255,255,0.08)",
            },
            "&.Mui-focused": {
              backgroundColor: "rgba(59, 130, 246, 0.15)",
            },
          }),
        },
        listbox: {
          ...(mode === "dark" && {
            backgroundColor: SLATE_DARK,
          }),
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          ...(mode === "dark" && {
            backgroundColor: SLATE_MID,
            color: "#F1F5F9",
          }),
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          ...(mode === "dark" && {
            borderColor: SLATE_MID,
          }),
        },
      },
    },
    MuiSkeleton: {
      defaultProps: {
        animation: "wave",
      },
      styleOverrides: {
        root: ({ theme }) => ({
          bgcolor:
            theme.palette.mode === "dark"
              ? "rgba(255,255,255,0.08)"
              : "rgba(15,23,42,0.06)",
          "&::after": {
            background:
              theme.palette.mode === "dark"
                ? "linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)"
                : "linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent)",
          },
        }),
      },
    },
  },
});

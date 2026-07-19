export const NAVY = "#0B1220";
export const BLUE = "#3B82F6";

/** Dark primary button with forced white label text. */
export const btnPrimarySx = {
  bgcolor: NAVY,
  color: "#FFFFFF !important",
  fontWeight: 800,
  "&:hover": { bgcolor: "#1E293B" },
  "&.Mui-disabled": { color: "rgba(255,255,255,0.5) !important" },
};

/** Outlined button styled for gradient page headers. */
export const btnOnGradientSx = {
  color: "#FFFFFF !important",
  borderColor: "rgba(255,255,255,0.7) !important",
  borderWidth: "2px !important",
  fontWeight: 800,
  bgcolor: "rgba(255,255,255,0.08) !important",
  "&:hover": {
    borderColor: "#FFFFFF !important",
    bgcolor: "rgba(255,255,255,0.16) !important",
  },
  "& .MuiButton-startIcon, & .MuiButton-endIcon": {
    color: "#FFFFFF !important",
  },
};

/** Matching outlined buttons for gradient page headers (LTR and RTL). */
export const headerActionBtnSx = {
  borderRadius: 2,
  fontWeight: 800,
  minWidth: { xs: "100%", sm: 152 },
  maxWidth: { sm: 210 },
  whiteSpace: "nowrap",
  px: 2,
  py: 0.9,
  fontSize: { xs: 13, sm: 14 },
  textTransform: "none",
  color: "#FFFFFF !important",
  border: "2px solid #FFFFFF !important",
  bgcolor: "rgba(255,255,255,0.1) !important",
  boxShadow: "none !important",
  backgroundImage: "none !important",
  "&:hover": {
    color: "#FFFFFF !important",
    bgcolor: "rgba(255,255,255,0.2) !important",
    borderColor: "#FFFFFF !important",
    boxShadow: "none !important",
    backgroundImage: "none !important",
  },
  "& .MuiButton-startIcon, & .MuiButton-endIcon": {
    color: "#FFFFFF !important",
    marginInlineEnd: "6px",
    marginInlineStart: "-2px",
  },
};

/** @deprecated Use headerActionBtnSx. */
export const headerActionContainedSx = headerActionBtnSx;
/** @deprecated Use headerActionBtnSx. */
export const headerActionOutlinedSx = headerActionBtnSx;

/** Hoverable dashboard stat/content card shell. */
export const dashboardCardSx = {
  height: "100%",
  borderRadius: 3,
  border: "1px solid",
  borderColor: "divider",
  bgcolor: "background.paper",
  boxShadow: (theme) =>
    theme.palette.mode === "dark" ? "none" : "0 4px 20px rgba(15,23,42,0.06)",
  display: "flex",
  flexDirection: "column",
  transition: "transform 0.2s ease, box-shadow 0.2s ease",
  "&:hover": {
    transform: "translateY(-3px)",
    boxShadow: (theme) =>
      theme.palette.mode === "dark"
        ? "0 8px 24px rgba(0,0,0,0.35)"
        : "0 12px 28px rgba(15,23,42,0.1)",
  },
};

/** Standard padded section container on dashboard pages. */
export const sectionPaperSx = {
  p: { xs: 2, md: 2.5 },
  mb: 3,
  borderRadius: 3,
  border: "1px solid",
  borderColor: "divider",
  bgcolor: "background.paper",
  boxShadow: (theme) =>
    theme.palette.mode === "dark" ? "none" : "0 2px 12px rgba(15,23,42,0.04)",
};

/** Top accent border helper for cards and panels. */
export const accentTop = (color) => ({
  borderTop: `4px solid ${color}`,
});

/** Wrapper that applies headerActionBtnSx to child buttons. */
export const headerActionsBoxSx = {
  width: { xs: "100%", sm: "auto" },
  "& .MuiButton-root": headerActionBtnSx,
};

/** Standard admin page width — layout already applies outer padding. */
export const pageContainerSx = {
  width: "100%",
  maxWidth: 1400,
  mx: "auto",
};

/** Horizontally scrollable tables on small screens. */
export const tableContainerSx = {
  overflowX: "auto",
  width: "100%",
};

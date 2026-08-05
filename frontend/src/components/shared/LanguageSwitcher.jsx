import React from "react";
import { ToggleButton, ToggleButtonGroup, Box, alpha } from "@mui/material";
import { useLanguage } from "../../context/LanguageContext";
import LanguageRoundedIcon from "@mui/icons-material/LanguageRounded";

/** Toggle between Arabic and English using the language context. */
export default function LanguageSwitcher({ size = "small", sx = {} }) {
  const { lang, setLang } = useLanguage();

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.75,
        bgcolor: (theme) =>
          theme.palette.mode === "dark"
            ? alpha(theme.palette.common.white, 0.05)
            : alpha(theme.palette.common.black, 0.04),
        borderRadius: 2.5,
        px: 1,
        py: 0.5,
        ...sx,
      }}
    >
      <LanguageRoundedIcon
        sx={{
          fontSize: 18,
          color: "text.secondary",
          opacity: 0.7,
        }}
      />
      <ToggleButtonGroup
        size={size}
        exclusive
        value={lang}
        onChange={(_, v) => v && setLang(v)}
        sx={{
          "& .MuiToggleButton-root": {
            border: "none",
            borderRadius: "8px !important",
            px: 1.5,
            py: 0.4,
            fontWeight: 800,
            fontSize: "0.8rem",
            textTransform: "none",
            color: "text.secondary",
            transition: "all 0.2s ease",
            "&.Mui-selected": {
              bgcolor: (theme) =>
                theme.palette.mode === "dark"
                  ? alpha(theme.palette.primary.main, 0.2)
                  : "primary.main",
              color: (theme) =>
                theme.palette.mode === "dark"
                  ? "primary.light"
                  : "white",
              "&:hover": {
                bgcolor: (theme) =>
                  theme.palette.mode === "dark"
                    ? alpha(theme.palette.primary.main, 0.3)
                    : "primary.dark",
              },
            },
            "&:hover": {
              bgcolor: (theme) =>
                theme.palette.mode === "dark"
                  ? alpha(theme.palette.common.white, 0.08)
                  : alpha(theme.palette.common.black, 0.06),
            },
          },
        }}
      >
        <ToggleButton value="ar">ع</ToggleButton>
        <ToggleButton value="en">EN</ToggleButton>
      </ToggleButtonGroup>
    </Box>
  );
}

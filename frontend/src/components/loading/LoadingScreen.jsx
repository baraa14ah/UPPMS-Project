import React from "react";
import { Box, Stack, Typography, keyframes } from "@mui/material";
import BrandLogo from "../BrandLogo";
import { useLanguage } from "../../context/LanguageContext";

const pulse = keyframes`
  0%, 100% { opacity: 0.35; transform: scale(0.92); }
  50% { opacity: 1; transform: scale(1); }
`;

/** Branded full-screen loader for auth bootstrap and initial session restore. */
export default function LoadingScreen() {
  const { t } = useLanguage();

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "background.default",
        px: 2,
      }}
    >
      <Stack spacing={2.5} alignItems="center">
        <BrandLogo size="lg" variant="hero" />
        <Stack direction="row" spacing={0.75} aria-hidden>
          {[0, 1, 2].map((i) => (
            <Box
              key={i}
              sx={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                bgcolor: "secondary.main",
                animation: `${pulse} 1.1s ease-in-out infinite`,
                animationDelay: `${i * 0.16}s`,
              }}
            />
          ))}
        </Stack>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ fontWeight: 700, letterSpacing: 0.2 }}
        >
          {t("common.loading")}
        </Typography>
      </Stack>
    </Box>
  );
}

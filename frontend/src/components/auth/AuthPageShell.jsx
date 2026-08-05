import React, { useEffect, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { Box, Paper, Typography, Link as MuiLink, Stack, alpha, keyframes } from "@mui/material";
import BrandLogo from "../shared/BrandLogo";
import LanguageSwitcher from "../shared/LanguageSwitcher";
import { useLanguage } from "../../context/LanguageContext";
import { AUTH_COLORS, authLightScopeSx } from "./authStyles";
import {
  authPageBgRadials,
  GRADIENT,
  rtlSafeGradientStyle,
} from "../../utils/rtlSafeGradient";

const shimmer = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
`;

/** Two-column layout shell for login and registration pages. */
export default function AuthPageShell({
  title,
  subtitle,
  brandTitle = "إدارة مشاريعك بذكاء.",
  brandBody = "مهام، إصدارات، تعليقات، ودعوات — كل شيء في مكان واحد.",
  brandHighlights = [],
  brandSlides,
  children,
}) {
  const { t, dir, isRtl } = useLanguage();

  const defaultSlides = [
    { title: t("auth.slide1Title"), desc: t("auth.slide1Desc") },
    { title: t("auth.slide2Title"), desc: t("auth.slide2Desc") },
    { title: t("auth.slide3Title"), desc: t("auth.slide3Desc") },
  ];

  const slides =
    brandSlides?.length > 0
      ? brandSlides
      : brandHighlights.length > 0
        ? brandHighlights
        : defaultSlides;

  const [slideIndex, setSlideIndex] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return undefined;
    const id = setInterval(() => {
      setSlideIndex((i) => (i + 1) % slides.length);
    }, 4000);
    return () => clearInterval(id);
  }, [slides.length]);

  return (
    <Box
      dir={dir}
      style={rtlSafeGradientStyle(
        authPageBgRadials(AUTH_COLORS.blue, AUTH_COLORS.teal),
        AUTH_COLORS.bg,
      )}
      sx={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        p: 2,
        direction: dir,
      }}
    >
      <Paper
        elevation={0}
        dir={dir}
        sx={{
          width: "min(1120px, 100%)",
          borderRadius: 4,
          overflow: "hidden",
          border: `1px solid ${AUTH_COLORS.border}`,
          boxShadow: "0 28px 80px rgba(15,23,42,0.12)",
          display: "flex",
          flexDirection: { xs: "column", md: isRtl ? "row-reverse" : "row" },
          minHeight: { xs: "auto", md: 620 },
          bgcolor: AUTH_COLORS.surface,
          backgroundImage: "none",
        }}
      >
        <Box
          style={rtlSafeGradientStyle(GRADIENT.authBrand)}
          sx={{
            display: { xs: "none", md: "flex" },
            flex: { md: "1.05 1 0" },
            minWidth: 0,
            flexDirection: "column",
            justifyContent: "space-between",
            p: 5,
            color: "white",
            position: "relative",
            overflow: "hidden",
            backgroundSize: "200% 200%",
            animation: `${shimmer} 18s ease infinite`,
          }}
        >
          <Box
            style={rtlSafeGradientStyle(
              `radial-gradient(${alpha("#fff", 0.12)} 1px, transparent 1px)`,
            )}
            sx={{
              position: "absolute",
              inset: 0,
              opacity: 0.25,
              backgroundSize: "24px 24px",
            }}
          />
          <Box
            style={rtlSafeGradientStyle(
              `radial-gradient(circle, ${alpha(AUTH_COLORS.teal, 0.35)}, transparent 70%)`,
            )}
            sx={{
              position: "absolute",
              width: 320,
              height: 320,
              borderRadius: "50%",
              top: -100,
              ...(isRtl ? { left: -80 } : { right: -80 }),
            }}
          />

          <Stack
            component={RouterLink}
            to="/"
            direction="row"
            spacing={1.5}
            alignItems="center"
            sx={{
              position: "relative",
              textDecoration: "none",
              color: "inherit",
              "&:hover": { opacity: 0.92 },
            }}
          >
            <BrandLogo size="lg" variant="hero" />
            <Box>
              <Typography sx={{ fontWeight: 950, fontSize: 20 }}>{t("common.appName")}</Typography>
              <Typography variant="caption" sx={{ color: alpha("#fff", 0.9), fontWeight: 600 }}>
                {t("auth.brandTagline")}
              </Typography>
            </Box>
          </Stack>

          <Box sx={{ position: "relative", my: 4 }}>
            <Typography variant="h3" sx={{ fontWeight: 950, lineHeight: 1.2 }}>
              {brandTitle}
            </Typography>
            <Typography
              sx={{
                mt: 2,
                color: alpha("#fff", 0.92),
                maxWidth: 400,
                lineHeight: 1.9,
                fontWeight: 500,
              }}
            >
              {brandBody}
            </Typography>

            <Paper
              elevation={0}
              sx={{
                mt: 3,
                p: 2.25,
                borderRadius: 3,
                bgcolor: alpha("#0B1220", 0.55),
                border: `1px solid ${alpha("#fff", 0.22)}`,
                boxShadow: `0 8px 32px ${alpha("#000", 0.25)}`,
                minHeight: 96,
                transition: "opacity 0.4s",
                backgroundImage: "none",
              }}
            >
              <Typography sx={{ fontWeight: 900, fontSize: 15, color: "#FFFFFF" }}>
                {slides[slideIndex]?.title}
              </Typography>
              <Typography
                variant="body2"
                sx={{ mt: 0.75, color: alpha("#fff", 0.92), lineHeight: 1.7, fontWeight: 500 }}
              >
                {slides[slideIndex]?.desc}
              </Typography>
              <Stack direction="row" spacing={0.75} sx={{ mt: 1.5 }}>
                {slides.map((_, i) => (
                  <Box
                    key={i}
                    sx={{
                      width: i === slideIndex ? 20 : 8,
                      height: 8,
                      borderRadius: 99,
                      bgcolor: i === slideIndex ? AUTH_COLORS.teal : alpha("#fff", 0.35),
                      transition: "width 0.3s, background-color 0.3s",
                    }}
                  />
                ))}
              </Stack>
            </Paper>
          </Box>

          <Typography variant="caption" sx={{ opacity: 0.6, position: "relative" }}>
            © {new Date().getFullYear()} {t("common.appName")}
          </Typography>
        </Box>

        <Box
          dir={dir}
          sx={{
            flex: { md: "0.95 1 0" },
            minWidth: 0,
            p: { xs: 3, md: 5 },
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            bgcolor: "#FFFFFF",
            color: AUTH_COLORS.text,
            animation: `${fadeUp} 0.5s ease-out`,
            ...authLightScopeSx,
          }}
        >
          <Stack
            component={RouterLink}
            to="/"
            direction="row"
            spacing={1.2}
            alignItems="center"
            sx={{
              display: { md: "none" },
              textDecoration: "none",
              color: AUTH_COLORS.navy,
              mb: 2,
              fontWeight: 900,
            }}
          >
            <BrandLogo size="sm" variant="onLight" />
            {t("common.appName")}
          </Stack>

          <BrandLogo
            size="md"
            variant="onLight"
            sx={{ display: { md: "none" }, mb: 2, alignSelf: "center" }}
          />

          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
            <Typography variant="h4" sx={{ fontWeight: 800, color: AUTH_COLORS.heading }}>
              {title}
            </Typography>
            <LanguageSwitcher size="small" />
          </Stack>
          {subtitle && (
            <Typography variant="body2" sx={{ mt: 1, color: AUTH_COLORS.muted, lineHeight: 1.7, fontWeight: 500 }}>
              {subtitle}
            </Typography>
          )}
          {children}
        </Box>
      </Paper>
    </Box>
  );
}

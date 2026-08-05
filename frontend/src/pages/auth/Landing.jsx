import React, { useMemo } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import {
  Box,
  Container,
  Typography,
  Button,
  Stack,
  Paper,
  Grid,
  alpha,
  keyframes,
  createTheme,
  ThemeProvider,
} from "@mui/material";
import createCache from "@emotion/cache";
import { CacheProvider } from "@emotion/react";
import { prefixer } from "stylis";
import { getDesignTokens } from "../../theme";
import { useThemeMode } from "../../context/ThemeContext";
import RocketLaunchRoundedIcon from "@mui/icons-material/RocketLaunchRounded";
import SchoolRoundedIcon from "@mui/icons-material/SchoolRounded";
import AdminPanelSettingsRoundedIcon from "@mui/icons-material/AdminPanelSettingsRounded";
import SupervisorAccountRoundedIcon from "@mui/icons-material/SupervisorAccountRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import FolderSpecialRoundedIcon from "@mui/icons-material/FolderSpecialRounded";
import TaskAltRoundedIcon from "@mui/icons-material/TaskAltRounded";
import ForumRoundedIcon from "@mui/icons-material/ForumRounded";
import LayersRoundedIcon from "@mui/icons-material/LayersRounded";
import MailOutlineRoundedIcon from "@mui/icons-material/MailOutlineRounded";
import ShieldRoundedIcon from "@mui/icons-material/ShieldRounded";
import HubRoundedIcon from "@mui/icons-material/HubRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import NotificationsActiveRoundedIcon from "@mui/icons-material/NotificationsActiveRounded";
import LockResetRoundedIcon from "@mui/icons-material/LockResetRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import BrandLogo from "../../components/shared/BrandLogo";
import LanguageSwitcher from "../../components/shared/LanguageSwitcher";
import { useLanguage } from "../../context/LanguageContext";
import {
  GRADIENT,
  rtlSafeGradientStyle,
  rtlSafeTextGradientStyle,
} from "../../utils/rtlSafeGradient";

const NAVY = "#0B1220";
const SLATE = "#1E293B";
const BLUE = "#3B82F6";
const TEAL = "#14B8A6";
const AMBER = "#F59E0B";

// Emotion cache without RTL plugin; landing mirrors layout explicitly.
const landingLtrCache = createCache({
  key: "landing-ltr",
  stylisPlugins: [prefixer],
});

/** Grid order for sections that swap text and visual columns in RTL. */
function mirrorColumns(isRtl) {
  return {
    text: { xs: 1, md: isRtl ? 2 : 1 },
    visual: { xs: 2, md: isRtl ? 1 : 2 },
  };
}

/** Text direction, alignment, and flex helpers for the active language. */
function textFlow(isRtl) {
  return {
    dir: isRtl ? "rtl" : "ltr",
    direction: isRtl ? "rtl" : "ltr",
    textAlign: isRtl ? "right" : "left",
    align: isRtl ? "flex-end" : "flex-start",
  };
}

/** CSS direction value for mirrored grid sections. */
function gridFlowDirection(isRtl) {
  return isRtl ? "rtl" : "ltr";
}

/** Hero headline gradient angle for LTR vs RTL. */
function heroTitleGradient(isRtl) {
  return isRtl
    ? `linear-gradient(270deg, ${TEAL}, ${BLUE})`
    : `linear-gradient(90deg, ${TEAL}, ${BLUE})`;
}

/** CTA arrow icon flipped horizontally in RTL. */
function mirroredArrowIcon(isRtl) {
  return (
    <ArrowForwardRoundedIcon
      sx={{ transform: isRtl ? "scaleX(-1)" : "none" }}
    />
  );
}

/** Public marketing landing page with bilingual RTL/LTR layout. */
export default function Landing() {
  const navigate = useNavigate();
  const { t, isRtl, lang } = useLanguage();
  const { mode } = useThemeMode();
  const landingTheme = useMemo(
    () => createTheme(getDesignTokens(mode, "ltr", lang)),
    [mode, lang],
  );
  const columns = mirrorColumns(isRtl);
  const flow = textFlow(isRtl);

  const journeySteps = [
    { step: "1", title: t("landing.step1Title"), desc: t("landing.step1Desc") },
    { step: "2", title: t("landing.step2Title"), desc: t("landing.step2Desc") },
    { step: "3", title: t("landing.step3Title"), desc: t("landing.step3Desc") },
    { step: "4", title: t("landing.step4Title"), desc: t("landing.step4Desc") },
  ];

  return (
    <CacheProvider value={landingLtrCache}>
      <ThemeProvider theme={landingTheme}>
        <Box
          dir={flow.dir}
          sx={{
            minHeight: "100vh",
            direction: flow.direction,
            bgcolor: "#FAFBFC",
          }}
        >
          <LandingNav navigate={navigate} isRtl={isRtl} />

          <Box
            component="section"
            style={rtlSafeGradientStyle(GRADIENT.landingHero)}
            sx={{
              position: "relative",
              overflow: "hidden",
              color: "white",
              pt: { xs: 6, md: 10 },
              pb: { xs: 10, md: 14 },
            }}
          >
            <HeroBackground isRtl={isRtl} />
            <Container maxWidth="lg" sx={{ position: "relative", zIndex: 1 }}>
              <Box
                dir="ltr"
                sx={{
                  display: "grid",
                  direction: "ltr",
                  alignItems: "center",
                  gap: { xs: 4, md: 6, lg: 8 },
                  gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                  gridTemplateAreas: {
                    xs: `"hero-text" "hero-visual"`,
                    md: isRtl
                      ? `"hero-visual hero-text"`
                      : `"hero-text hero-visual"`,
                  },
                }}
              >
                <Box
                  sx={{
                    gridArea: "hero-text",
                    position: "relative",
                    zIndex: 2,
                    direction: "ltr",
                    display: "grid",
                    justifyItems: isRtl ? "end" : "start",
                    width: "100%",
                  }}
                >
                  <Stack
                    spacing={3}
                    alignItems={isRtl ? "flex-end" : "flex-start"}
                    sx={{
                      width: "100%",
                      maxWidth: 520,
                      textAlign: flow.textAlign,
                    }}
                  >
                    <Box
                      sx={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 1,
                        px: 2,
                        py: 0.75,
                        borderRadius: 99,
                        bgcolor: alpha(BLUE, 0.2),
                        border: `1px solid ${alpha(BLUE, 0.45)}`,
                        direction: "ltr",
                        flexDirection: isRtl ? "row-reverse" : "row",
                        alignSelf: isRtl ? "flex-end" : "flex-start",
                      }}
                    >
                      <HubRoundedIcon sx={{ fontSize: 18, color: TEAL }} />
                      <Typography
                        dir={flow.dir}
                        sx={{
                          fontWeight: 800,
                          fontSize: 13,
                          textAlign: flow.textAlign,
                          direction: flow.direction,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {t("landing.heroBadge")}
                      </Typography>
                    </Box>

                    <Typography
                      component="h1"
                      dir={flow.dir}
                      sx={{
                        fontWeight: 950,
                        fontSize: { xs: "2.1rem", sm: "2.75rem", md: "3.2rem" },
                        lineHeight: 1.35,
                        letterSpacing: isRtl ? 0 : -0.5,
                        width: "100%",
                        textAlign: flow.textAlign,
                        direction: flow.direction,
                      }}
                    >
                      {t("landing.heroTitle1")}
                      <Box
                        component="span"
                        dir={flow.dir}
                        style={rtlSafeTextGradientStyle(
                          heroTitleGradient(isRtl),
                        )}
                        sx={{
                          display: "block",
                          textAlign: flow.textAlign,
                          direction: flow.direction,
                        }}
                      >
                        {t("landing.heroTitle2")}
                      </Box>
                    </Typography>

                    <Typography
                      dir={flow.dir}
                      sx={{
                        fontSize: { xs: 16, md: 18 },
                        lineHeight: 1.95,
                        color: alpha("#fff", 0.82),
                        fontWeight: 500,
                        width: "100%",
                        textAlign: flow.textAlign,
                        direction: flow.direction,
                      }}
                    >
                      {t("landing.heroBody")}
                    </Typography>

                    <Stack
                      spacing={2}
                      sx={{
                        width: "100%",
                        alignItems: isRtl ? "flex-end" : "flex-start",
                      }}
                    >
                      <Stack
                        spacing={1.5}
                        direction="row"
                        sx={{
                          direction: "ltr",
                          width: { xs: "100%", sm: "auto" },
                          flexDirection: {
                            xs: "column",
                            sm: isRtl ? "row-reverse" : "row",
                          },
                          alignItems: isRtl ? "flex-end" : "flex-start",
                        }}
                      >
                        <Button
                          size="large"
                          variant="contained"
                          {...(isRtl
                            ? { startIcon: mirroredArrowIcon(isRtl) }
                            : { endIcon: mirroredArrowIcon(isRtl) })}
                          onClick={() => navigate("/register")}
                          sx={{
                            py: 1.5,
                            px: 3,
                            fontWeight: 900,
                            borderRadius: 3,
                            fontSize: 16,
                            bgcolor: BLUE,
                            color: "#fff",
                            boxShadow: `0 12px 40px ${alpha(BLUE, 0.45)}`,
                            "&:hover": { bgcolor: "#2563EB", color: "#fff" },
                          }}
                        >
                          {t("landing.ctaRegister")}
                        </Button>
                        <Button
                          size="large"
                          variant="outlined"
                          onClick={() => navigate("/login")}
                          sx={{
                            py: 1.5,
                            px: 3,
                            fontWeight: 800,
                            borderRadius: 3,
                            borderColor: alpha("#fff", 0.35),
                            color: "white",
                            "&:hover": {
                              borderColor: "white",
                              bgcolor: alpha("#fff", 0.08),
                            },
                          }}
                        >
                          {t("landing.login")}
                        </Button>
                      </Stack>

                      <Stack
                        spacing={1.25}
                        sx={{
                          width: "100%",
                          alignItems: isRtl ? "flex-end" : "flex-start",
                        }}
                      >
                        <TrustPill
                          icon={<ShieldRoundedIcon />}
                          text={t("landing.trust1")}
                          isRtl={isRtl}
                        />
                        <TrustPill
                          icon={<CheckCircleRoundedIcon />}
                          text={t("landing.trust2")}
                          isRtl={isRtl}
                        />
                        <TrustPill
                          icon={<NotificationsActiveRoundedIcon />}
                          text={t("landing.trust3")}
                          isRtl={isRtl}
                        />
                        <TrustPill
                          icon={<AutoAwesomeRoundedIcon />}
                          text={t("landing.trust4")}
                          isRtl={isRtl}
                        />
                      </Stack>
                    </Stack>
                  </Stack>
                </Box>

                <Box
                  sx={{
                    gridArea: "hero-visual",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    overflow: "visible",
                    width: "100%",
                    minHeight: { md: 420 },
                    py: { xs: 2, md: 0 },
                    px: { xs: 1, md: 2 },
                  }}
                >
                  <EcosystemVisual isRtl={isRtl} flow={flow} />
                </Box>
              </Box>
            </Container>
          </Box>

          <Box
            component="section"
            sx={{
              py: { xs: 8, md: 12 },
              bgcolor: "#FAFBFC",
              direction: flow.direction,
            }}
          >
            <Container maxWidth="lg">
              <SectionHeader
                eyebrow={t("landing.rolesEyebrow")}
                title={t("landing.rolesTitle")}
                subtitle={t("landing.rolesSubtitle")}
              />
              <Grid
                container
                spacing={3}
                alignItems="stretch"
                sx={{ direction: gridFlowDirection(isRtl) }}
              >
                <RoleCard
                  icon={<PersonRoundedIcon />}
                  color={TEAL}
                  role={t("landing.studentRole")}
                  points={[
                    t("landing.studentP1"),
                    t("landing.studentP2"),
                    t("landing.studentP3"),
                  ]}
                />
                <RoleCard
                  icon={<SupervisorAccountRoundedIcon />}
                  color={BLUE}
                  role={t("landing.supervisorRole")}
                  points={[
                    t("landing.supervisorP1"),
                    t("landing.supervisorP2"),
                    t("landing.supervisorP3"),
                  ]}
                />
                <RoleCard
                  icon={<AdminPanelSettingsRoundedIcon />}
                  color={AMBER}
                  role={t("landing.adminRole")}
                  points={[
                    t("landing.adminP1"),
                    t("landing.adminP2"),
                    t("landing.adminP3"),
                  ]}
                />
                <RoleCard
                  icon={<ShieldRoundedIcon />}
                  color="#A78BFA"
                  role={t("landing.superAdminRole")}
                  points={[
                    t("landing.superAdminP1"),
                    t("landing.superAdminP2"),
                    t("landing.superAdminP3"),
                  ]}
                />
              </Grid>
            </Container>
          </Box>

          <Box
            component="section"
            style={rtlSafeGradientStyle(
              `linear-gradient(180deg, ${alpha(BLUE, 0.04)} 0%, transparent 100%)`,
            )}
            sx={{ py: { xs: 8, md: 10 }, direction: flow.direction }}
          >
            <Container maxWidth="lg">
              <SectionHeader
                eyebrow={t("landing.journeyEyebrow")}
                title={t("landing.journeyTitle")}
                subtitle={t("landing.journeySubtitle")}
              />
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    sm: "repeat(2, 1fr)",
                    md: "repeat(4, 1fr)",
                  },
                  gap: 2,
                  direction: gridFlowDirection(isRtl),
                }}
              >
                {journeySteps.map((item) => (
                  <Paper
                    key={item.step}
                    elevation={0}
                    sx={{
                      p: 2.5,
                      height: "100%",
                      minHeight: 168,
                      borderRadius: 3,
                      border: "1px solid",
                      borderColor: "divider",
                      bgcolor: "background.paper",
                      display: "flex",
                      flexDirection: "column",
                      textAlign: flow.textAlign,
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: 48,
                        fontWeight: 950,
                        color: alpha(BLUE, 0.14),
                        lineHeight: 1,
                        mb: 1,
                      }}
                    >
                      {item.step}
                    </Typography>
                    <Typography
                      sx={{
                        fontWeight: 900,
                        fontSize: 17,
                        color: "text.primary",
                      }}
                    >
                      {item.title}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        mt: 0.8,
                        lineHeight: 1.8,
                        fontWeight: 600,
                        flex: 1,
                      }}
                    >
                      {item.desc}
                    </Typography>
                  </Paper>
                ))}
              </Box>
            </Container>
          </Box>

          <Box
            component="section"
            sx={{
              py: { xs: 8, md: 12 },
              bgcolor: "white",
              direction: flow.direction,
            }}
          >
            <Container maxWidth="lg">
              <SectionHeader
                eyebrow={t("landing.featuresEyebrow")}
                title={t("landing.featuresTitle")}
                subtitle={t("landing.featuresSubtitle")}
              />
              <Grid
                container
                spacing={2.5}
                sx={{ direction: gridFlowDirection(isRtl) }}
              >
                <FeatureTile
                  icon={<SchoolRoundedIcon />}
                  title={t("landing.feat1Title")}
                  desc={t("landing.feat1Desc")}
                  color={TEAL}
                />
                <FeatureTile
                  icon={<MailOutlineRoundedIcon />}
                  title={t("landing.feat2Title")}
                  desc={t("landing.feat2Desc")}
                  color={BLUE}
                />
                <FeatureTile
                  icon={<TaskAltRoundedIcon />}
                  title={t("landing.feat3Title")}
                  desc={t("landing.feat3Desc")}
                  color="#8B5CF6"
                />
                <FeatureTile
                  icon={<ForumRoundedIcon />}
                  title={t("landing.feat4Title")}
                  desc={t("landing.feat4Desc")}
                  color="#EC4899"
                />
                <FeatureTile
                  icon={<LayersRoundedIcon />}
                  title={t("landing.feat5Title")}
                  desc={t("landing.feat5Desc")}
                  color="#0891B2"
                />
                <FeatureTile
                  icon={<LockResetRoundedIcon />}
                  title={t("landing.feat6Title")}
                  desc={t("landing.feat6Desc")}
                  color={AMBER}
                />
                <FeatureTile
                  icon={<AutoAwesomeRoundedIcon />}
                  title={t("landing.feat7Title")}
                  desc={t("landing.feat7Desc")}
                  color="#7C3AED"
                />
              </Grid>
            </Container>
          </Box>

          <Box
            component="section"
            sx={{
              py: { xs: 8, md: 10 },
              bgcolor: NAVY,
              color: "white",
              direction: flow.direction,
            }}
          >
            <Container maxWidth="lg">
              <Grid container spacing={4} alignItems="center">
                <Grid
                  size={{ xs: 12, md: 5 }}
                  dir={flow.dir}
                  sx={{
                    textAlign: flow.textAlign,
                    direction: flow.direction,
                    order: columns.text,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: flow.align,
                  }}
                >
                  <Typography
                    sx={{
                      fontWeight: 900,
                      fontSize: { xs: "1.75rem", md: "2.25rem" },
                      lineHeight: 1.4,
                      letterSpacing: isRtl ? 0 : undefined,
                      textAlign: flow.textAlign,
                      width: "100%",
                    }}
                  >
                    {t("landing.previewTitle")}
                  </Typography>
                  <Typography
                    sx={{
                      mt: 2,
                      opacity: 0.85,
                      lineHeight: 1.9,
                      fontWeight: 500,
                      textAlign: flow.textAlign,
                      width: "100%",
                    }}
                  >
                    {t("landing.previewBody")}
                  </Typography>
                  <Button
                    variant="contained"
                    size="large"
                    {...(isRtl
                      ? {
                          endIcon: (
                            <RocketLaunchRoundedIcon
                              sx={{ transform: "scaleX(-1)" }}
                            />
                          ),
                        }
                      : { startIcon: <RocketLaunchRoundedIcon /> })}
                    onClick={() => navigate("/register")}
                    sx={{
                      mt: 3,
                      fontWeight: 900,
                      borderRadius: 3,
                      bgcolor: TEAL,
                      color: NAVY,
                      alignSelf: flow.align,
                      display: "inline-flex",
                      "&:hover": { bgcolor: "#0D9488" },
                    }}
                  >
                    {t("landing.previewCta")}
                  </Button>
                </Grid>
                <Grid size={{ xs: 12, md: 7 }} sx={{ order: columns.visual }}>
                  <DashboardMockup />
                </Grid>
              </Grid>
            </Container>
          </Box>

          <Box
            component="section"
            style={rtlSafeGradientStyle(
              `linear-gradient(135deg, ${alpha(BLUE, 0.08)}, ${alpha(TEAL, 0.12)})`,
            )}
            sx={{ py: { xs: 8, md: 10 }, direction: flow.direction }}
          >
            <Container maxWidth="md">
              <Paper
                elevation={0}
                sx={{
                  p: { xs: 4, md: 5 },
                  borderRadius: 4,
                  textAlign: "center",
                  direction: flow.direction,
                  border: `1px solid ${alpha(BLUE, 0.2)}`,
                  background: "white",
                }}
              >
                <FolderSpecialRoundedIcon
                  sx={{ fontSize: 56, color: BLUE, mb: 2 }}
                />
                <Typography variant="h4" sx={{ fontWeight: 950, color: NAVY }}>
                  {t("landing.ctaTitle")}
                </Typography>
                <Typography
                  color="text.secondary"
                  sx={{
                    mt: 1.5,
                    maxWidth: 480,
                    mx: "auto",
                    lineHeight: 1.9,
                    fontWeight: 600,
                  }}
                >
                  {t("landing.ctaBody")}
                </Typography>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={1.5}
                  justifyContent="center"
                  sx={{ mt: 4 }}
                >
                  <Button
                    variant="contained"
                    size="large"
                    onClick={() => navigate("/register")}
                    sx={{
                      fontWeight: 900,
                      borderRadius: 3,
                      px: 4,
                      bgcolor: NAVY,
                      color: "#fff",
                      "&:hover": { bgcolor: SLATE, color: "#fff" },
                    }}
                  >
                    {t("landing.ctaRegisterFree")}
                  </Button>
                  <Button
                    variant="outlined"
                    size="large"
                    onClick={() => navigate("/login")}
                    sx={{
                      fontWeight: 800,
                      borderRadius: 3,
                      px: 4,
                      borderColor: "#CBD5E1",
                    }}
                  >
                    {t("landing.ctaHasAccount")}
                  </Button>
                </Stack>
              </Paper>
            </Container>
          </Box>

          <Box
            component="footer"
            dir={flow.dir}
            sx={{
              py: 4,
              textAlign: "center",
              borderTop: "1px solid #E2E8F0",
              bgcolor: "white",
              direction: flow.direction,
            }}
          >
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              justifyContent="center"
              sx={{ mb: 1 }}
            >
              <BrandLogo size="sm" variant="onLight" />
              <Typography sx={{ fontWeight: 900, color: NAVY }}>
                {t("common.appName")}
              </Typography>
            </Stack>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ fontWeight: 600 }}
            >
              © {new Date().getFullYear()} — {t("landing.footer")}
            </Typography>
          </Box>
        </Box>
      </ThemeProvider>
    </CacheProvider>
  );
}

/** Sticky top navigation: logo and auth actions, mirrored for RTL. */
function LandingNav({ navigate, isRtl }) {
  const { t } = useLanguage();
  return (
    <Box
      sx={{
        position: "sticky",
        top: 0,
        zIndex: 40,
        bgcolor: alpha("#FAFBFC", 0.92),
        backdropFilter: "blur(16px)",
        borderBottom: "1px solid #E2E8F0",
      }}
    >
      <Container maxWidth="lg">
        <Stack
          alignItems="center"
          justifyContent="space-between"
          py={1.5}
          direction="row"
          sx={{
            direction: "ltr",
            flexDirection: isRtl ? "row-reverse" : "row",
          }}
        >
          <Stack
            component={RouterLink}
            to="/"
            direction="row"
            spacing={1.2}
            alignItems="center"
            sx={{
              textDecoration: "none",
              color: NAVY,
              direction: "ltr",
              flexDirection: isRtl ? "row-reverse" : "row",
            }}
          >
            <BrandLogo size="md" variant="onLight" />
            <Box sx={{ textAlign: isRtl ? "right" : "left" }}>
              <Typography
                dir={isRtl ? "rtl" : "ltr"}
                sx={{ fontWeight: 950, lineHeight: 1.1 }}
              >
                {t("common.appName")}
              </Typography>
              <Typography
                variant="caption"
                dir={isRtl ? "rtl" : "ltr"}
                sx={{ color: "text.secondary", fontWeight: 700, display: "block" }}
              >
                {t("common.appTagline")}
              </Typography>
            </Box>
          </Stack>
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{
              direction: "ltr",
              flexDirection: isRtl ? "row-reverse" : "row",
            }}
          >
            <LanguageSwitcher size="small" />
            <Button
              onClick={() => navigate("/login")}
              sx={{ fontWeight: 800, color: NAVY }}
            >
              {t("landing.login")}
            </Button>
            <Button
              variant="contained"
              onClick={() => navigate("/register")}
              sx={{
                fontWeight: 900,
                borderRadius: 2.5,
                bgcolor: NAVY,
                color: "#fff",
                boxShadow: "none",
                "&:hover": { bgcolor: SLATE, color: "#fff" },
              }}
            >
              {t("landing.register")}
            </Button>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}

/** Decorative hero background glows; mirrored horizontally in RTL. */
function HeroBackground({ isRtl }) {
  return (
    <Box
      sx={{
        position: "absolute",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
        overflow: "hidden",
        transform: isRtl ? "scaleX(-1)" : "none",
      }}
    >
      <Box
        style={rtlSafeGradientStyle(
          `radial-gradient(${alpha("#fff", 0.12)} 1px, transparent 1px)`,
        )}
        sx={{
          position: "absolute",
          inset: 0,
          opacity: 0.2,
          backgroundSize: "32px 32px",
        }}
      />
      <Box
        style={rtlSafeGradientStyle(
          `radial-gradient(circle, ${alpha(TEAL, 0.14)}, transparent 72%)`,
        )}
        sx={{
          position: "absolute",
          width: { xs: 280, md: 420 },
          height: { xs: 280, md: 420 },
          borderRadius: "50%",
          top: "5%",
          right: { xs: "-12%", md: "2%" },
          left: "auto",
        }}
      />
      <Box
        style={rtlSafeGradientStyle(
          `radial-gradient(circle, ${alpha(BLUE, 0.16)}, transparent 70%)`,
        )}
        sx={{
          position: "absolute",
          width: { xs: 240, md: 360 },
          height: { xs: 240, md: 360 },
          borderRadius: "50%",
          bottom: "0%",
          right: { xs: "-8%", md: "8%" },
          left: "auto",
        }}
      />
    </Box>
  );
}

/** Absolute position for an ecosystem node, swapping left/right in RTL. */
function nodePosition(node, isRtl) {
  const pos = { top: node.top };
  const edge = (value) => (value === "0%" ? "4%" : value);
  if (isRtl) {
    if (node.left) pos.right = edge(node.left);
    if (node.right) pos.left = edge(node.right);
  } else {
    if (node.left) pos.left = edge(node.left);
    if (node.right) pos.right = edge(node.right);
  }
  return pos;
}

/** Animated hub-and-spoke diagram of platform roles in the hero. */
function EcosystemVisual({ isRtl, flow }) {
  const { t } = useLanguage();
  const drift = isRtl ? "-6px" : "6px";
  const floatDir = keyframes`
    0%, 100% { transform: translateY(0) translateX(0); }
    50% { transform: translateY(-12px) translateX(${drift}); }
  `;
  const hubPulse = keyframes`
    0%, 100% { box-shadow: 0 0 32px ${alpha(TEAL, 0.2)}, 0 0 64px ${alpha(BLUE, 0.1)}; }
    50% { box-shadow: 0 0 48px ${alpha(TEAL, 0.35)}, 0 0 80px ${alpha(BLUE, 0.18)}; }
  `;

  const nodes = [
    {
      label: t("landing.ecoUniversity"),
      sub: t("landing.ecoUniversitySub"),
      color: AMBER,
      top: "2%",
      right: "36%",
    },
    {
      label: t("landing.ecoAdmin"),
      sub: t("landing.ecoAdminSub"),
      color: AMBER,
      top: "26%",
      right: "0%",
    },
    {
      label: t("landing.ecoSupervisor"),
      sub: t("landing.ecoSupervisorSub"),
      color: BLUE,
      top: "26%",
      left: "0%",
    },
    {
      label: t("landing.ecoStudent"),
      sub: t("landing.ecoStudentSub"),
      color: TEAL,
      top: "58%",
      right: "10%",
    },
    {
      label: t("landing.ecoProject"),
      sub: t("landing.ecoProjectSub"),
      color: "#A78BFA",
      top: "74%",
      left: "14%",
    },
  ];

  return (
    <Box
      sx={{
        position: "relative",
        width: "100%",
        maxWidth: { xs: 360, sm: 420, md: 460, lg: 500 },
        aspectRatio: "1 / 1",
        mx: "auto",
        overflow: "visible",
        animation: `${floatDir} 8s ease-in-out infinite`,
      }}
    >
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "78%",
          height: "78%",
          borderRadius: "50%",
          border: `1px dashed ${alpha("#fff", 0.1)}`,
          pointerEvents: "none",
        }}
      />
      <Box
        style={rtlSafeGradientStyle(
          `radial-gradient(circle, ${alpha(TEAL, 0.14)} 0%, transparent 72%)`,
        )}
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "52%",
          height: "52%",
          borderRadius: "50%",
          pointerEvents: "none",
        }}
      />
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: { xs: 76, md: 92 },
          height: { xs: 76, md: 92 },
          borderRadius: "50%",
          bgcolor: alpha(BLUE, 0.22),
          border: `2px solid ${alpha(TEAL, 0.5)}`,
          display: "grid",
          placeItems: "center",
          zIndex: 2,
          animation: `${hubPulse} 4s ease-in-out infinite`,
        }}
      >
        <HubRoundedIcon sx={{ fontSize: { xs: 34, md: 42 }, color: TEAL }} />
      </Box>
      {nodes.map((n) => (
        <Box
          key={n.label}
          sx={{
            position: "absolute",
            ...nodePosition(n, isRtl),
            zIndex: 3,
            px: 1.5,
            py: 1,
            borderRadius: 2.5,
            maxWidth: { xs: 140, md: 160 },
            bgcolor: alpha("#0B1220", 0.55),
            backdropFilter: "blur(10px)",
            border: `1px solid ${alpha(n.color, 0.45)}`,
            boxShadow: `0 8px 28px ${alpha(n.color, 0.18)}`,
            transition: "transform 0.25s ease, box-shadow 0.25s ease",
            "&:hover": {
              transform: "translateY(-4px) scale(1.03)",
              boxShadow: `0 12px 36px ${alpha(n.color, 0.28)}`,
            },
          }}
        >
          <Typography
            dir={flow.dir}
            sx={{
              fontWeight: 800,
              fontSize: 11.5,
              lineHeight: 1.3,
              color: "#fff",
              textAlign: flow.textAlign,
            }}
          >
            {n.label}
          </Typography>
          <Typography
            variant="caption"
            dir={flow.dir}
            sx={{
              color: alpha("#fff", 0.78),
              fontWeight: 600,
              fontSize: 9.5,
              display: "block",
              mt: 0.2,
              textAlign: flow.textAlign,
            }}
          >
            {n.sub}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

/** Static dashboard preview card shown in the preview section. */
function DashboardMockup() {
  const { t, isRtl } = useLanguage();
  const flow = textFlow(isRtl);

  const mockNotifications = [
    { key: "mock1", color: BLUE },
    { key: "mock2", color: TEAL },
    { key: "mock3", color: AMBER },
  ];

  return (
    <Paper
      elevation={0}
      dir={flow.dir}
      sx={{
        borderRadius: 3,
        overflow: "hidden",
        border: `1px solid ${alpha("#fff", 0.15)}`,
        boxShadow: "0 32px 80px rgba(0,0,0,0.35)",
        direction: flow.direction,
      }}
    >
      <Box
        sx={{
          px: 2,
          py: 1.5,
          bgcolor: alpha("#fff", 0.08),
          display: "flex",
          gap: 0.75,
          flexDirection: isRtl ? "row-reverse" : "row",
          alignItems: "center",
        }}
      >
        {["#EF4444", "#F59E0B", "#22C55E"].map((c) => (
          <Box
            key={c}
            sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: c }}
          />
        ))}
        <Typography
          variant="caption"
          sx={{ marginInlineStart: 1, opacity: 0.7, fontWeight: 700 }}
        >
          {t("landing.mockDashboard")}
        </Typography>
      </Box>
      <Box
        sx={{
          p: 2.5,
          bgcolor: "#F8FAFC",
          color: NAVY,
          textAlign: flow.textAlign,
          direction: flow.direction,
        }}
      >
        <Grid
          container
          spacing={1.5}
          sx={{ direction: gridFlowDirection(isRtl) }}
        >
          {[
            { label: t("dashboard.projects"), val: "12", c: BLUE },
            { label: t("dashboard.tasks"), val: "48", c: TEAL },
            { label: t("dashboard.progress"), val: "67%", c: AMBER },
          ].map((s) => (
            <Grid size={4} key={s.label}>
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: "white",
                  border: "1px solid #E2E8F0",
                }}
              >
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontWeight: 700 }}
                >
                  {s.label}
                </Typography>
                <Typography sx={{ fontWeight: 950, color: s.c, fontSize: 22 }}>
                  {s.val}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
        <Stack spacing={1} sx={{ mt: 2 }}>
          {mockNotifications.map((item, i) => (
            <Box
              key={item.key}
              sx={{
                p: 1.2,
                borderRadius: 2,
                bgcolor: "white",
                border: "1px solid #E2E8F0",
                display: "flex",
                alignItems: "center",
                gap: 1,
                flexDirection: isRtl ? "row-reverse" : "row",
              }}
            >
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  bgcolor: item.color,
                  flexShrink: 0,
                }}
              />
              <Typography
                variant="body2"
                sx={{ fontWeight: 700, fontSize: 12, flex: 1 }}
              >
                {t(`landing.mockNotif${i + 1}`)}
              </Typography>
            </Box>
          ))}
        </Stack>
      </Box>
    </Paper>
  );
}

/** Centered section title block: eyebrow, heading, and subtitle. */
function SectionHeader({ eyebrow, title, subtitle }) {
  const { isRtl } = useLanguage();
  const flow = textFlow(isRtl);
  return (
    <Box
      dir={flow.dir}
      sx={{
        textAlign: flow.textAlign,
        mb: 5,
        maxWidth: 640,
        mx: "auto",
        direction: flow.direction,
      }}
    >
      <Typography
        sx={{
          fontWeight: 800,
          fontSize: 13,
          color: BLUE,
          letterSpacing: isRtl ? 0 : 0.5,
          mb: 1,
        }}
      >
        {eyebrow}
      </Typography>
      <Typography
        variant="h4"
        sx={{
          fontWeight: 950,
          color: NAVY,
          fontSize: { xs: "1.6rem", md: "2rem" },
        }}
      >
        {title}
      </Typography>
      <Typography
        color="text.secondary"
        sx={{ mt: 1.5, lineHeight: 1.85, fontWeight: 600 }}
      >
        {subtitle}
      </Typography>
    </Box>
  );
}

/** Role card listing who the platform is for and key benefits. */
function RoleCard({ icon, color, role, points }) {
  const { isRtl } = useLanguage();
  const flow = textFlow(isRtl);
  return (
    <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
      <Paper
        elevation={0}
        dir={flow.dir}
        sx={{
          p: 3,
          height: "100%",
          borderRadius: 3,
          border: "1px solid #E2E8F0",
          textAlign: flow.textAlign,
          direction: flow.direction,
          transition: "all 0.25s",
          "&:hover": {
            borderColor: alpha(color, 0.5),
            boxShadow: `0 16px 40px ${alpha(color, 0.12)}`,
            transform: "translateY(-4px)",
          },
        }}
      >
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: 2,
            bgcolor: alpha(color, 0.12),
            color,
            display: "grid",
            placeItems: "center",
            mb: 2,
            marginInlineStart: 0,
            "& svg": { fontSize: 26 },
          }}
        >
          {icon}
        </Box>
        <Typography
          sx={{ fontWeight: 950, fontSize: 20, color: NAVY, mb: 1.5 }}
        >
          {role}
        </Typography>
        <Stack spacing={1}>
          {points.map((p) => (
            <Stack
              key={p}
              direction="row"
              spacing={1}
              alignItems="flex-start"
              sx={{ flexDirection: isRtl ? "row-reverse" : "row" }}
            >
              <CheckCircleRoundedIcon
                sx={{ fontSize: 18, color, mt: 0.2, flexShrink: 0 }}
              />
              <Typography
                variant="body2"
                sx={{ fontWeight: 600, lineHeight: 1.7 }}
              >
                {p}
              </Typography>
            </Stack>
          ))}
        </Stack>
      </Paper>
    </Grid>
  );
}

/** Single feature tile in the features grid. */
function FeatureTile({ icon, title, desc, color }) {
  const { isRtl } = useLanguage();
  const flow = textFlow(isRtl);
  return (
    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
      <Paper
        elevation={0}
        dir={flow.dir}
        sx={{
          p: 2.5,
          height: "100%",
          borderRadius: 3,
          border: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
          textAlign: flow.textAlign,
          direction: flow.direction,
        }}
      >
        <Box sx={{ color, mb: 1.5, "& svg": { fontSize: 28 } }}>{icon}</Box>
        <Typography sx={{ fontWeight: 900, color: NAVY }}>{title}</Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mt: 0.8, lineHeight: 1.75, fontWeight: 600 }}
        >
          {desc}
        </Typography>
      </Paper>
    </Grid>
  );
}

/** Hero trust line with icon, aligned for the active language. */
function TrustPill({ icon, text, isRtl }) {
  return (
    <Stack
      direction="row"
      spacing={0.75}
      alignItems="center"
      sx={{
        direction: "ltr",
        flexDirection: isRtl ? "row-reverse" : "row",
      }}
    >
      <Box
        sx={{
          color: TEAL,
          display: "flex",
          flexShrink: 0,
          "& svg": { fontSize: 18 },
        }}
      >
        {icon}
      </Box>
      <Typography
        dir={isRtl ? "rtl" : "ltr"}
        sx={{
          fontSize: { xs: 15, md: 16 },
          fontWeight: 500,
          color: alpha("#fff", 0.82),
          textAlign: isRtl ? "right" : "left",
          direction: isRtl ? "rtl" : "ltr",
          lineHeight: 1.95,
        }}
      >
        {text}
      </Typography>
    </Stack>
  );
}

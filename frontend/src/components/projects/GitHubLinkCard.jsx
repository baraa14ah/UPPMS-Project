import React from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  Typography,
  alpha,
} from "@mui/material";
import GitHubIcon from "@mui/icons-material/GitHub";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import CloudUploadRoundedIcon from "@mui/icons-material/CloudUploadRounded";
import SyncRoundedIcon from "@mui/icons-material/SyncRounded";
import CodeRoundedIcon from "@mui/icons-material/CodeRounded";
import { useLanguage } from "../../context/LanguageContext";
import { buildGithubRedirectUrl } from "../../utils/githubLink";

/** Renders a single GitHub integration feature bullet with icon. */
function FeatureItem({ icon, text }) {
  const ItemIcon = icon;
  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <ItemIcon sx={{ fontSize: 18, color: "text.secondary" }} />
      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
        {text}
      </Typography>
    </Stack>
  );
}

/** Prompts users to link GitHub in banner, profile, or dashboard card layouts. */
export default function GitHubLinkCard({
  userId,
  apiBaseUrl,
  linked = false,
  returnTo = "/dashboard",
  variant = "card",
  onUnlink,
  unlinking = false,
  sx,
}) {
  const { t } = useLanguage();

  const features = [
    { icon: CloudUploadRoundedIcon, text: t("github.featurePush") },
    { icon: SyncRoundedIcon, text: t("github.featureSync") },
    { icon: CodeRoundedIcon, text: t("github.featureTrack") },
  ];

  /** Redirects the browser to the GitHub OAuth authorize URL. */
  const handleLink = () => {
    if (!userId || !apiBaseUrl) return;
    window.location.href = buildGithubRedirectUrl(apiBaseUrl, userId, returnTo);
  };

  if (variant === "banner") {
    if (linked) return null;
    return (
      <Alert
        severity="warning"
        icon={<GitHubIcon />}
        sx={{ mb: 2, borderRadius: 2.5, alignItems: "flex-start", ...sx }}
        action={
          <Button
            size="small"
            variant="contained"
            onClick={handleLink}
            startIcon={<GitHubIcon />}
            sx={{
              bgcolor: "#24292e",
              "&:hover": { bgcolor: "#000" },
              fontWeight: 800,
              whiteSpace: "nowrap",
            }}
          >
            {t("github.linkNow")}
          </Button>
        }
      >
        <Typography sx={{ fontWeight: 800, mb: 0.5 }}>{t("github.bannerTitle")}</Typography>
        <Typography variant="body2">{t("github.bannerBody")}</Typography>
      </Alert>
    );
  }

  if (variant === "profile") {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 2.6,
          borderRadius: 4,
          border: "1px solid",
          borderColor: linked ? "success.main" : "divider",
          bgcolor: linked
            ? (theme) => alpha(theme.palette.success.main, 0.04)
            : (theme) => alpha(theme.palette.common.black, 0.02),
          ...sx,
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 2,
              bgcolor: "#24292e",
              color: "#fff",
              display: "grid",
              placeItems: "center",
            }}
          >
            <GitHubIcon />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontWeight: 900 }}>{t("github.profileTitle")}</Typography>
            <Typography variant="body2" color="text.secondary">
              {t("github.profileSubtitle")}
            </Typography>
          </Box>
          {linked && (
            <Chip
              icon={<CheckCircleRoundedIcon />}
              label={t("profile.githubConnected")}
              color="success"
              variant="outlined"
              sx={{ fontWeight: 700 }}
            />
          )}
        </Stack>

        <Stack spacing={0.75} sx={{ mb: 2, mt: 1 }}>
          {features.map((f) => (
            <FeatureItem key={f.text} icon={f.icon} text={f.text} />
          ))}
        </Stack>

        {!linked ? (
          <Button
            variant="contained"
            startIcon={<GitHubIcon />}
            onClick={handleLink}
            fullWidth
            sx={{ bgcolor: "#24292e", "&:hover": { bgcolor: "#000" }, fontWeight: 800, py: 1.2 }}
          >
            {t("profile.linkGithub")}
          </Button>
        ) : (
          onUnlink && (
            <Button
              variant="outlined"
              color="error"
              size="small"
              onClick={onUnlink}
              disabled={unlinking}
              sx={{ fontWeight: 700, borderRadius: 2 }}
            >
              {unlinking ? t("profile.unlinking") : t("profile.unlinkGithub")}
            </Button>
          )
        )}
      </Paper>
    );
  }

  if (linked) return null;

  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 2, md: 2.5 },
        mb: 2.5,
        borderRadius: 3,
        border: "1px solid",
        borderColor: "divider",
        background: (theme) =>
          `linear-gradient(135deg, ${alpha(theme.palette.common.black, 0.03)} 0%, ${alpha(theme.palette.primary.main, 0.06)} 100%)`,
        ...sx,
      }}
    >
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        alignItems={{ xs: "flex-start", sm: "center" }}
        justifyContent="space-between"
      >
        <Stack direction="row" spacing={2} alignItems="flex-start" sx={{ flex: 1 }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2,
              bgcolor: "#24292e",
              color: "#fff",
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
            }}
          >
            <GitHubIcon />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 900, mb: 0.5 }}>
              {t("github.dashboardTitle")}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, maxWidth: 520 }}>
              {t("github.dashboardBody")}
            </Typography>
            <Stack spacing={0.5}>
              {features.map((f) => (
                <FeatureItem key={f.text} icon={f.icon} text={f.text} />
              ))}
            </Stack>
          </Box>
        </Stack>
        <Button
          variant="contained"
          startIcon={<GitHubIcon />}
          onClick={handleLink}
          sx={{
            bgcolor: "#24292e",
            "&:hover": { bgcolor: "#000" },
            fontWeight: 800,
            px: 3,
            py: 1.2,
            borderRadius: 2,
            flexShrink: 0,
          }}
        >
          {t("github.linkNow")}
        </Button>
      </Stack>
    </Paper>
  );
}

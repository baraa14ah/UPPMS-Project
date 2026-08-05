import React from "react";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import LanguageSwitcher from "../../components/shared/LanguageSwitcher";
import {
  Box,
  Paper,
  Typography,
  Button,
  Alert,
  Divider,
  Stack,
} from "@mui/material";
import DomainDisabledRoundedIcon from "@mui/icons-material/DomainDisabledRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";

/** Shown when the user has no active university membership. */
export default function AccountBlocked() {
  const { logout } = useAuth();
  const { t, dir } = useLanguage();

  /** Signs the user out and returns to the login flow. */
  const handleLogout = () => {
    logout();
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "#F7F8FA",
        display: "grid",
        placeItems: "center",
        p: 2,
        direction: dir,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: "min(500px, 100%)",
          borderRadius: 4,
          overflow: "hidden",
          border: "1px solid #E6E8EC",
          boxShadow: "0 18px 60px rgba(0,0,0,0.08)",
          p: { xs: 3, md: 5 },
          textAlign: "center",
        }}
      >
        <Stack direction="row" justifyContent="flex-end" sx={{ mb: 1 }}>
          <LanguageSwitcher size="small" />
        </Stack>

        <DomainDisabledRoundedIcon sx={{ fontSize: 64, color: "warning.main", mb: 2 }} />

        <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
          {t("blocked.noUniversityTitle")}
        </Typography>

        <Typography variant="body1" sx={{ color: "text.secondary", mb: 3, fontWeight: 500 }}>
          {t("blocked.noUniversityBody")}
        </Typography>

        <Alert severity="warning" sx={{ borderRadius: 2, mb: 3 }}>
          {t("blocked.noUniversityAlert")}
        </Alert>

        <Divider sx={{ my: 2 }} />

        <Button
          onClick={handleLogout}
          variant="outlined"
          color="inherit"
          fullWidth
          startIcon={<LogoutRoundedIcon />}
          sx={{ borderRadius: 2.5, py: 1.2, fontWeight: 800, textTransform: "none" }}
        >
          {t("common.logout")}
        </Button>
      </Paper>
    </Box>
  );
}

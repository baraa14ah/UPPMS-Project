import React from "react";
import { Link as RouterLink } from "react-router-dom";
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
import HourglassEmptyRoundedIcon from "@mui/icons-material/HourglassEmptyRounded";
import BlockRoundedIcon from "@mui/icons-material/BlockRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";

/** Shown when account is pending approval or rejected by admin. */
export default function PendingApproval() {
  const { status, logout } = useAuth();
  const { t, dir } = useLanguage();

  const isRejected = status === "rejected";

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

        {isRejected ? (
          <BlockRoundedIcon sx={{ fontSize: 64, color: "error.main", mb: 2 }} />
        ) : (
          <HourglassEmptyRoundedIcon sx={{ fontSize: 64, color: "warning.main", mb: 2 }} />
        )}

        <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
          {isRejected ? t("pending.rejectedTitle") : t("pending.pendingTitle")}
        </Typography>

        <Typography variant="body1" sx={{ color: "text.secondary", mb: 3, fontWeight: 500 }}>
          {isRejected ? t("pending.rejectedBody") : t("pending.pendingBody")}
        </Typography>

        <Alert severity={isRejected ? "error" : "info"} sx={{ borderRadius: 2, mb: 3 }}>
          {isRejected ? t("pending.rejectedAlert") : t("pending.pendingAlert")}
        </Alert>

        {isRejected && (
          <Button
            component={RouterLink}
            to="/register"
            variant="contained"
            fullWidth
            sx={{
              borderRadius: 2.5,
              py: 1.4,
              fontWeight: 800,
              textTransform: "none",
              bgcolor: "#0B1220",
              color: "#fff",
              "&:hover": { bgcolor: "#1E293B", color: "#fff" },
              mb: 2,
            }}
          >
            {t("pending.reRegister")}
          </Button>
        )}

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

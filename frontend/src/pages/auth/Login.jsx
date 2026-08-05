import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  InputAdornment,
  Divider,
  Link as MuiLink,
  IconButton,
  Stack,
  Box,
} from "@mui/material";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import LoginRoundedIcon from "@mui/icons-material/LoginRounded";
import AuthPageShell from "../../components/auth/AuthPageShell";
import { useLanguage } from "../../context/LanguageContext";
import { API_BASE_URL } from "../../utils/api";
import { authFieldSx, authPrimaryBtnSx, AUTH_COLORS } from "../../components/auth/authStyles";
import { AUTH_PRIMARY_BTN_CLASS } from "../../utils/rtlSafeGradient";

/** Login page with email/password authentication. */
export default function Login() {
  const { t, isRtl } = useLanguage();
  const { login, isAuthenticated, status, loadingProfile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated && status === "active" && !loadingProfile) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, status, loadingProfile, navigate]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(null);

  const canSubmit = useMemo(
    () => email.trim() && password.trim() && !loading,
    [email, password, loading],
  );

  /** Submits credentials to the API and navigates to dashboard on success. */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.token) {
        await login(data.token);
        toast.success(t("auth.loginSuccess"));
        navigate("/dashboard");
      } else {
        setMessageType("error");
        setMessage(data?.message || t("auth.loginFailed"));
        toast.error(data?.message || t("auth.loginFailed"));
      }
    } catch {
      setMessageType("error");
      setMessage(t("common.serverError"));
      toast.error(t("common.serverError"));
    }
    setLoading(false);
  };

  return (
    <AuthPageShell
      title={t("auth.loginTitle")}
      subtitle={t("auth.loginSubtitle")}
      brandTitle={t("auth.loginTitle")}
      brandBody={t("auth.loginSubtitle")}
    >
      {message && (
        <Alert severity={messageType} sx={{ mt: 3, borderRadius: 2.5 }}>
          {message}
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
        <Typography variant="body2" sx={{ fontWeight: 700, mb: 1, color: focused === "email" ? AUTH_COLORS.blue : AUTH_COLORS.label }}>
          {t("auth.email")}
        </Typography>
        <TextField
          fullWidth
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onFocus={() => setFocused("email")}
          onBlur={() => setFocused(null)}
          autoComplete="email"
          placeholder="name@university.edu"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <EmailOutlinedIcon fontSize="small" color={focused === "email" ? "primary" : "action"} />
              </InputAdornment>
            ),
          }}
          sx={authFieldSx}
        />

        <Typography
          variant="body2"
          sx={{ fontWeight: 700, mt: 2.5, mb: 1, color: focused === "pass" ? AUTH_COLORS.blue : AUTH_COLORS.label }}
        >
          {t("auth.password")}
        </Typography>
        <TextField
          fullWidth
          type={showPass ? "text" : "password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onFocus={() => setFocused("pass")}
          onBlur={() => setFocused(null)}
          autoComplete="current-password"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <LockOutlinedIcon fontSize="small" color={focused === "pass" ? "primary" : "action"} />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => setShowPass((v) => !v)} edge="end" tabIndex={-1}>
                  {showPass ? <VisibilityOffOutlinedIcon fontSize="small" /> : <VisibilityOutlinedIcon fontSize="small" />}
                </IconButton>
              </InputAdornment>
            ),
          }}
          sx={authFieldSx}
        />

        <Button
          type="submit"
          fullWidth
          disabled={!canSubmit}
          variant="contained"
          className={AUTH_PRIMARY_BTN_CLASS}
          {...(isRtl
            ? { endIcon: !loading && <LoginRoundedIcon /> }
            : { startIcon: !loading && <LoginRoundedIcon /> })}
          sx={authPrimaryBtnSx}
        >
          {loading ? (
            <Stack direction="row" spacing={1} alignItems="center">
              <CircularProgress size={20} sx={{ color: "white" }} />
              <span>{t("auth.signingIn")}</span>
            </Stack>
          ) : (
            t("auth.signIn")
          )}
        </Button>

        <Typography variant="body2" sx={{ mt: 2, textAlign: "center" }}>
          <MuiLink component={RouterLink} to="/forgot-password" underline="hover" sx={{ fontWeight: 700, color: AUTH_COLORS.muted }}>
            {t("auth.forgotPassword")}
          </MuiLink>
        </Typography>

        <Divider sx={{ my: 3 }} />

        <Typography variant="body2" color="text.secondary" textAlign="center">
          {t("auth.noAccount")}{" "}
          <MuiLink component={RouterLink} to="/register" underline="hover" sx={{ fontWeight: 800, color: AUTH_COLORS.heading }}>
            {t("auth.createAccount")}
          </MuiLink>
        </Typography>
      </Box>
    </AuthPageShell>
  );
}

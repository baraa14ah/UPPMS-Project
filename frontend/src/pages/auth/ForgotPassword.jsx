import React, { useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Box,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Link as MuiLink,
  Stack,
  Paper,
  Alert,
  InputAdornment,
} from "@mui/material";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import SupportAgentRoundedIcon from "@mui/icons-material/SupportAgentRounded";
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import AuthPageShell from "../../components/auth/AuthPageShell";
import { useLanguage } from "../../context/LanguageContext";
import { API_BASE_URL } from "../../utils/api";

/** Password recovery page that submits a help request to admins. */
export default function ForgotPassword() {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [studentNumber, setStudentNumber] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [serverMessage, setServerMessage] = useState("");

  /** Sends password help request and shows confirmation state. */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/password/request-help`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          student_number: studentNumber.trim() || undefined,
          message: message.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      setServerMessage(data?.message || t("auth.forgotDefaultReply"));
      setSubmitted(true);
    } catch {
      setServerMessage(t("auth.forgotDefaultReply"));
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <AuthPageShell
        title={t("auth.forgotSentTitle")}
        subtitle={t("auth.forgotSentSubtitle")}
        brandTitle={t("auth.forgotSentTitle")}
        brandBody={t("auth.forgotSentSubtitle")}
      >
        <Box sx={{ mt: 3, textAlign: "center" }}>
          <SupportAgentRoundedIcon sx={{ fontSize: 72, color: "primary.main", mb: 2 }} />
          <Alert severity="success" sx={{ mb: 3 }}>
            {serverMessage}
          </Alert>

          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, bgcolor: "#F9FAFB", mb: 3 }}>
            <Stack spacing={1.5}>
              {[t("auth.forgotHint")].map((step, i) => (
                <Stack key={step} direction="row" spacing={1} alignItems="flex-start">
                  <CheckCircleOutlineRoundedIcon
                    sx={{ fontSize: 20, color: "success.main", mt: 0.2 }}
                  />
                  <Typography variant="body2" color="text.secondary">
                    {i + 1}. {step}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          </Paper>

          <MuiLink component={RouterLink} to="/login" underline="hover" sx={{ fontWeight: 800 }}>
            {t("auth.backToLogin")}
          </MuiLink>
        </Box>
      </AuthPageShell>
    );
  }

  return (
    <AuthPageShell title={t("auth.forgotTitle")} subtitle={t("auth.forgotSubtitle")}>
      <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
        <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>
          {t("auth.email")}
        </Typography>
        <TextField
          fullWidth
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="example@university.edu"
          required
          autoComplete="email"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <EmailOutlinedIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
          sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2.5 }, mb: 2 }}
        />

        <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>
          {t("auth.studentNumber")}
        </Typography>
        <TextField
          fullWidth
          value={studentNumber}
          onChange={(e) => setStudentNumber(e.target.value)}
          sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2.5 }, mb: 2 }}
        />

        <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>
          {t("auth.forgotMessage")}
        </Typography>
        <TextField
          fullWidth
          multiline
          minRows={2}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2.5 }, mb: 2 }}
        />

        <Button
          type="submit"
          fullWidth
          disabled={loading || !email.trim()}
          sx={{
            mt: 1,
            borderRadius: 2.5,
            py: 1.4,
            fontWeight: 800,
            textTransform: "none",
            bgcolor: "#0B1220",
            color: "#fff",
            "&:hover": { bgcolor: "#1E293B", color: "#fff" },
          }}
          variant="contained"
        >
          {loading ? (
            <CircularProgress size={20} sx={{ color: "white" }} />
          ) : (
            t("auth.requestHelp")
          )}
        </Button>

        <Typography variant="body2" sx={{ mt: 2, textAlign: "center" }}>
          <MuiLink component={RouterLink} to="/login" underline="hover" sx={{ fontWeight: 700 }}>
            {t("auth.backToLogin")}
          </MuiLink>
        </Typography>
      </Box>
    </AuthPageShell>
  );
}

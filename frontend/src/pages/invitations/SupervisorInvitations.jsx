import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import toast from "react-hot-toast";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Stack,
  Button,
  Alert,
  CircularProgress,
  Chip,
  Divider,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Tooltip,
  IconButton,
} from "@mui/material";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import HighlightOffRoundedIcon from "@mui/icons-material/HighlightOffRounded";
import SchoolRoundedIcon from "@mui/icons-material/SchoolRounded";

/** Supervisor invitation inbox with accept/reject actions. */
export default function SupervisorInvitations() {
  const { token, user, authHeaders, apiFetch, API_BASE_URL } = useAuth();
  const { t, lang } = useLanguage();
  const roleName = (user?.role || "").toLowerCase();
  const dateLocale = lang === "ar" ? "ar-EG" : "en-US";

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");

  /** Loads pending supervisor invitations from the API. */
  const fetchInvitations = async () => {
    try {
      setLoading(true);
      setError("");

      const { res, data } = await apiFetch(
        `${API_BASE_URL}/supervisor/invitations`,
        { headers: authHeaders() },
      );

      if (!res.ok) {
        setError(data?.message || t("supervisorInvitations.loadError"));
        setItems([]);
        return;
      }

      setItems(data?.invitations || []);
    } catch {
      setError(t("common.serverError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    fetchInvitations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  /** Accepts a supervisor invitation and refreshes sidebar badges. */
  const acceptInvite = async (inviteId) => {
    try {
      setBusyId(inviteId);
      const { res, data } = await apiFetch(
        `${API_BASE_URL}/supervisor/invitations/${inviteId}/accept`,
        { method: "POST", headers: authHeaders() },
      );
      if (!res.ok) {
        return toast.error(data?.message || t("supervisorInvitations.acceptError"));
      }

      setItems((prev) => prev.filter((x) => x.id !== inviteId));
      toast.success(t("supervisorInvitations.acceptSuccess"));
      window.dispatchEvent(new Event("updateSidebarBadges"));
    } catch {
      toast.error(t("common.serverError"));
    } finally {
      setBusyId(null);
    }
  };

  /** Rejects a supervisor invitation and refreshes sidebar badges. */
  const rejectInvite = async (inviteId) => {
    try {
      setBusyId(inviteId);
      const { res, data } = await apiFetch(
        `${API_BASE_URL}/supervisor/invitations/${inviteId}/reject`,
        { method: "POST", headers: authHeaders() },
      );
      if (!res.ok) {
        return toast.error(data?.message || t("supervisorInvitations.rejectError"));
      }

      setItems((prev) => prev.filter((x) => x.id !== inviteId));
      toast.success(t("supervisorInvitations.rejectSuccess"));
      window.dispatchEvent(new Event("updateSidebarBadges"));
    } catch {
      toast.error(t("common.serverError"));
    } finally {
      setBusyId(null);
    }
  };

  if (roleName !== "supervisor") {
    return (
      <Box sx={{ maxWidth: 1200, mx: "auto", mt: 4 }}>
        <Alert severity="warning" sx={{ borderRadius: 2, fontWeight: "bold" }}>
          {t("supervisorInvitations.supervisorsOnly")}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1200, mx: "auto" }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 2 }}
      >
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 900 }}>
            {t("supervisorInvitations.title")}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {t("supervisorInvitations.subtitle")}
          </Typography>
        </Box>

        <Button
          variant="outlined"
          startIcon={<RefreshRoundedIcon />}
          onClick={fetchInvitations}
          sx={{ borderRadius: 2, textTransform: "none", fontWeight: 900 }}
        >
          {t("common.refresh")}
        </Button>
      </Stack>

      {loading && (
        <Card sx={{ borderRadius: 3, border: "1px solid #E7E8F0" }}>
          <CardContent>
            <Stack direction="row" spacing={2} alignItems="center">
              <CircularProgress size={22} />
              <Typography sx={{ fontWeight: 700 }}>
                {t("supervisorInvitations.loading")}
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      )}

      {!loading && error && (
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      {!loading && !error && items.length === 0 && (
        <Card sx={{ borderRadius: 3, border: "1px solid #E7E8F0" }}>
          <CardContent>
            <Stack spacing={1} alignItems="flex-start">
              <Chip
                icon={<SchoolRoundedIcon />}
                label={t("supervisorInvitations.empty")}
                variant="outlined"
                sx={{ fontWeight: 800 }}
              />
              <Typography color="text.secondary">
                {t("supervisorInvitations.emptyDesc")}
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      )}

      {!loading && !error && items.length > 0 && (
        <Card sx={{ borderRadius: 3, border: "1px solid #E7E8F0" }}>
          <CardContent>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{ mb: 1 }}
            >
              <Typography variant="h6" sx={{ fontWeight: 900 }}>
                {t("supervisorInvitations.incoming")}
              </Typography>
              <Chip
                label={t("supervisorInvitations.countBadge", { count: items.length })}
                size="small"
              />
            </Stack>

            <Divider sx={{ mb: 2 }} />

            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 900 }}>
                    {t("supervisorInvitations.project")}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 900 }}>
                    {t("supervisorInvitations.from")}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 900 }}>
                    {t("supervisorInvitations.sentAt")}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 900, width: 160 }}>
                    {t("supervisorInvitations.actions")}
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {items.map((inv) => (
                  <TableRow key={inv.id} hover>
                    <TableCell sx={{ fontWeight: 800 }}>
                      {inv.project_title || inv.project?.title || "—"}
                    </TableCell>

                    <TableCell>
                      <Stack spacing={0.25}>
                        <Typography sx={{ fontWeight: 800 }}>
                          {inv.student?.name || t("supervisorInvitations.studentOwner")}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {inv.student?.email || ""}
                        </Typography>
                      </Stack>
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {inv.created_at
                          ? new Date(inv.created_at).toLocaleString(dateLocale)
                          : "—"}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Stack direction="row" spacing={1}>
                        <Tooltip title={t("common.approve")}>
                          <span>
                            <IconButton
                              color="success"
                              onClick={() => acceptInvite(inv.id)}
                              disabled={busyId === inv.id}
                            >
                              <CheckCircleRoundedIcon />
                            </IconButton>
                          </span>
                        </Tooltip>

                        <Tooltip title={t("common.reject")}>
                          <span>
                            <IconButton
                              color="error"
                              onClick={() => rejectInvite(inv.id)}
                              disabled={busyId === inv.id}
                            >
                              <HighlightOffRoundedIcon />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}

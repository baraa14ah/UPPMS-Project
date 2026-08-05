import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";

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
import GroupAddRoundedIcon from "@mui/icons-material/GroupAddRounded";
import toast from "react-hot-toast";

/** Student invitation inbox with accept/reject actions. */
export default function StudentInvitations() {
  const { token, user, authHeaders, apiFetch, API_BASE_URL } = useAuth();
  const { t, lang } = useLanguage();
  const roleName = (user?.role || "").toLowerCase();
  const dateLocale = lang === "ar" ? "ar-EG" : "en-US";

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");

  /** Loads pending student invitations from the API. */
  const fetchInvitations = async () => {
    try {
      setLoading(true);
      setError("");

      const { res, data } = await apiFetch(
        `${API_BASE_URL}/student/invitations`,
        { headers: authHeaders() },
      );
      if (!res.ok) {
        setError(data?.message || t("studentInvitations.loadError"));
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

  /** Accepts a student invitation and redirects to projects. */
  const acceptInvite = async (inviteId) => {
    try {
      setBusyId(inviteId);
      const { res, data } = await apiFetch(
        `${API_BASE_URL}/student/invitations/${inviteId}/accept`,
        { method: "POST", headers: authHeaders() },
      );
      if (!res.ok) {
        const msg =
          data?.message ||
          Object.values(data?.errors || {})
            .flat()
            .join(" | ") ||
          t("studentInvitations.acceptError");
        return toast.error(msg);
      }

      setItems((prev) => prev.filter((x) => x.id !== inviteId));
      toast.success(t("studentInvitations.acceptSuccess"));
      window.location.href = "/dashboard/projects";
    } catch {
      toast.error(t("common.serverError"));
    } finally {
      setBusyId(null);
    }
  };

  /** Rejects a student invitation. */
  const rejectInvite = async (inviteId) => {
    try {
      setBusyId(inviteId);
      const { res, data } = await apiFetch(
        `${API_BASE_URL}/student/invitations/${inviteId}/reject`,
        { method: "POST", headers: authHeaders() },
      );
      if (!res.ok) {
        return toast.error(data?.message || t("studentInvitations.rejectError"));
      }

      setItems((prev) => prev.filter((x) => x.id !== inviteId));
      toast.success(t("studentInvitations.rejectSuccess"));
    } catch {
      toast.error(t("common.serverError"));
    } finally {
      setBusyId(null);
    }
  };

  if (roleName !== "student") {
    return (
      <Alert severity="warning" sx={{ borderRadius: 2 }}>
        {t("studentInvitations.studentsOnly")}
      </Alert>
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
            {t("studentInvitations.title")}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {t("studentInvitations.subtitle")}
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
                {t("studentInvitations.loading")}
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
                icon={<GroupAddRoundedIcon />}
                label={t("studentInvitations.empty")}
                variant="outlined"
                sx={{ fontWeight: 800 }}
              />
              <Typography color="text.secondary">
                {t("studentInvitations.emptyDesc")}
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
                {t("studentInvitations.incoming")}
              </Typography>
              <Chip
                label={t("studentInvitations.countBadge", { count: items.length })}
                size="small"
              />
            </Stack>

            <Divider sx={{ mb: 2 }} />

            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 900 }}>
                    {t("studentInvitations.project")}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 900 }}>
                    {t("studentInvitations.sender")}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 900 }}>
                    {t("studentInvitations.trackStep")}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 900 }}>
                    {t("studentInvitations.sentAt")}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 900, width: 160 }}>
                    {t("studentInvitations.actions")}
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {items.map((inv) => (
                  <TableRow key={inv.id} hover>
                    <TableCell sx={{ fontWeight: 800 }}>
                      {inv.project?.title || inv.project_title || "—"}
                    </TableCell>
                    <TableCell>
                      <Stack spacing={0.25}>
                        <Typography sx={{ fontWeight: 800 }}>
                          {inv.sender?.name ||
                            inv.project?.user?.name ||
                            t("studentInvitations.senderFallback")}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {inv.sender?.email || ""}
                        </Typography>
                      </Stack>
                    </TableCell>

                    <TableCell>
                      {inv.track_stage?.display_label ? (
                        <Chip
                          size="small"
                          label={inv.track_stage.display_label}
                          color="secondary"
                          variant="outlined"
                          sx={{ fontWeight: 800 }}
                        />
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          —
                        </Typography>
                      )}
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

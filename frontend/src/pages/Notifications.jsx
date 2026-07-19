import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import PageHeader from "../components/PageHeader";
import NotificationsListSkeleton from "../components/loading/NotificationsListSkeleton";
import { headerActionBtnSx } from "../styles/dashboardUi";
import {
  Box,
  Paper,
  Typography,
  Stack,
  Button,
  Chip,
  Alert,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  alpha,
} from "@mui/material";
import NotificationsActiveRoundedIcon from "@mui/icons-material/NotificationsActiveRounded";
import DoneAllRoundedIcon from "@mui/icons-material/DoneAllRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import MarkEmailReadRoundedIcon from "@mui/icons-material/MarkEmailReadRounded";
import EmptyState from "../components/EmptyState";
import NotificationsOffRoundedIcon from "@mui/icons-material/NotificationsOffRounded";
import {
  parseNotification,
  resolveNotificationUrl,
  getNotificationMeta,
  formatNotificationTime,
} from "../utils/notifications";

/** Notifications inbox with read, delete, and filter actions. */
export default function Notifications() {
  const { t } = useLanguage();
  const { token, authHeaders, apiFetch, API_BASE_URL } = useAuth();
  const navigate = useNavigate();
  const outlet = useOutletContext() || {};
  const { unreadCount = 0, setUnreadCount = () => {} } = outlet;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState("all");

  /** Loads all notifications and syncs the unread count. */
  const fetchAll = async () => {
    try {
      setLoading(true);
      setError("");
      const { res, data } = await apiFetch(`${API_BASE_URL}/notifications`, {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error(data?.message || t("notifications.loadError"));
      const list = data?.notifications;
      setItems(Array.isArray(list) ? list : []);
      if (data?.unread_count !== undefined) {
        setUnreadCount(Number(data.unread_count));
      }
    } catch (e) {
      setError(e?.message || t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    if (filter === "unread") return items.filter((n) => !n.read_at);
    return items;
  }, [items, filter]);

  /** Marks one notification as read with optimistic UI update. */
  const markRead = async (id) => {
    setUnreadCount((prev) => Math.max(0, prev - 1));
    setItems((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, read_at: new Date().toISOString() } : n,
      ),
    );
    try {
      await apiFetch(`${API_BASE_URL}/notifications/${id}/mark-read`, {
        method: "POST",
        headers: authHeaders(),
      });
    } catch {
      /* ignore */
    }
  };

  /** Marks every notification as read. */
  const markAll = async () => {
    setUnreadCount(0);
    setItems((prev) =>
      prev.map((n) => ({
        ...n,
        read_at: n.read_at || new Date().toISOString(),
      })),
    );
    try {
      await apiFetch(`${API_BASE_URL}/notifications/mark-all-read`, {
        method: "POST",
        headers: authHeaders(),
      });
    } catch {
      /* ignore */
    }
  };

  /** Deletes a single notification and adjusts unread count. */
  const deleteOne = async (id, isUnread) => {
    if (isUnread) setUnreadCount((prev) => Math.max(0, prev - 1));
    setItems((prev) => prev.filter((n) => n.id !== id));
    try {
      await apiFetch(`${API_BASE_URL}/notifications/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
    } catch {
      /* ignore */
    }
  };

  /** Clears all notifications from the inbox. */
  const deleteAll = async () => {
    setItems([]);
    setUnreadCount(0);
    try {
      await apiFetch(`${API_BASE_URL}/notifications/delete-all`, {
        method: "DELETE",
        headers: authHeaders(),
      });
    } catch {
      /* ignore */
    }
  };

  /** Marks unread if needed and navigates to the notification target. */
  const openNotification = async (n) => {
    if (n?.id && !n?.read_at) await markRead(n.id);
    navigate(resolveNotificationUrl(n));
  };

  useEffect(() => {
    if (token) fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <Box sx={{ width: "100%", maxWidth: 1400, mx: "auto" }}>
      <PageHeader
        title={t("notifications.title")}
        subtitle={t("notifications.subtitle")}
        icon={<NotificationsActiveRoundedIcon />}
        actions={
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
            sx={{ width: { xs: "100%", sm: "auto" } }}
          >
            <Chip
              label={`${t("notifications.unread")}: ${unreadCount}`}
              sx={{
                fontWeight: 800,
                color: "#fff",
                bgcolor: "rgba(255,255,255,0.14)",
                border: "1px solid rgba(255,255,255,0.35)",
              }}
            />
            <Button
              variant="outlined"
              startIcon={<RefreshRoundedIcon />}
              onClick={fetchAll}
              disabled={loading}
              sx={headerActionBtnSx}
            >
              {t("common.refresh")}
            </Button>
            <Button
              variant="outlined"
              startIcon={<DoneAllRoundedIcon />}
              onClick={markAll}
              disabled={!unreadCount || loading}
              sx={headerActionBtnSx}
            >
              {t("notifications.markAllRead")}
            </Button>
            <Button
              variant="outlined"
              startIcon={<DeleteOutlineRoundedIcon />}
              onClick={deleteAll}
              disabled={!items.length || loading}
              sx={{
                ...headerActionBtnSx,
                color: "#FECACA !important",
                borderColor: "rgba(254,202,202,0.8) !important",
              }}
            >
              {t("notifications.deleteAll")}
            </Button>
          </Stack>
        }
      />

      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          border: "1px solid",
          borderColor: "divider",
          overflow: "hidden",
          bgcolor: "background.paper",
        }}
      >
        <Tabs
          value={filter}
          onChange={(_, v) => setFilter(v)}
          sx={{
            px: { xs: 1.5, md: 2.5 },
            minHeight: 52,
            borderBottom: "1px solid",
            borderColor: "divider",
            "& .MuiTab-root": {
              fontWeight: 800,
              fontSize: 15,
              minHeight: 52,
              textTransform: "none",
            },
          }}
        >
          <Tab label={t("notifications.all")} value="all" />
          <Tab
            label={`${t("notifications.unread")}${unreadCount ? ` (${unreadCount})` : ""}`}
            value="unread"
          />
        </Tabs>

        <Box sx={{ p: { xs: 2, md: 2.5 }, minHeight: 320 }}>
          {loading && <NotificationsListSkeleton count={6} />}

          {!loading && error && (
            <Alert
              severity="error"
              action={
                <Button onClick={fetchAll} sx={{ fontWeight: 800 }}>
                  {t("common.retry")}
                </Button>
              }
              sx={{ borderRadius: 2 }}
            >
              {error}
            </Alert>
          )}

          {!loading && !error && filtered.length === 0 && (
            <EmptyState
              icon={<NotificationsOffRoundedIcon />}
              title={
                filter === "unread"
                  ? t("notifications.emptyUnread")
                  : t("notifications.empty")
              }
              description={t("notifications.emptyDescription")}
            />
          )}

          {!loading && !error && filtered.length > 0 && (
            <Stack spacing={2}>
              {filtered.map((n) => (
                <NotificationCard
                  key={n.id}
                  notification={n}
                  onOpen={() => openNotification(n)}
                  onMarkRead={() => markRead(n.id)}
                  onDelete={() => deleteOne(n.id, !n.read_at)}
                />
              ))}
            </Stack>
          )}
        </Box>
      </Paper>
    </Box>
  );
}

/** Single notification row with actions and type styling. */
function NotificationCard({ notification: n, onOpen, onMarkRead, onDelete }) {
  const { t, lang } = useLanguage();
  const { type, title, body } = parseNotification(n, t);
  const meta = getNotificationMeta(type, t);
  const Icon = meta.icon;
  const isUnread = !n.read_at;

  return (
    <Paper
      elevation={0}
      onClick={onOpen}
      sx={{
        p: { xs: 2, md: 2.5 },
        borderRadius: 3,
        cursor: "pointer",
        border: "1px solid",
        borderColor: isUnread ? alpha(meta.color, 0.35) : "divider",
        bgcolor: isUnread ? alpha(meta.color, 0.06) : "background.paper",
        transition: "box-shadow 0.2s ease, transform 0.2s ease",
        "&:hover": {
          boxShadow: "0 10px 28px rgba(15,23,42,0.08)",
          transform: "translateY(-2px)",
        },
      }}
    >
      <Stack direction="row" spacing={2} alignItems="flex-start">
        <Box
          sx={{
            width: 52,
            height: 52,
            borderRadius: 2.5,
            bgcolor: meta.bg,
            color: meta.color,
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
          }}
        >
          <Icon />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="flex-start"
            spacing={1.5}
          >
            <Typography sx={{ fontWeight: 900, fontSize: "1.02rem", lineHeight: 1.4 }}>
              {title}
            </Typography>
            <Chip
              label={meta.label}
              size="small"
              sx={{
                height: 26,
                fontWeight: 800,
                fontSize: 12,
                bgcolor: meta.bg,
                color: meta.color,
              }}
            />
          </Stack>
          {body ? (
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{ mt: 0.75, lineHeight: 1.7, fontSize: "0.95rem" }}
            >
              {body}
            </Typography>
          ) : null}
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 1.25, display: "block", fontWeight: 600 }}
          >
            {formatNotificationTime(n.created_at, t, lang)}
          </Typography>
        </Box>
        <Stack direction="row" spacing={0.5} onClick={(e) => e.stopPropagation()}>
          {isUnread && (
            <Tooltip title={t("notifications.markRead")}>
              <IconButton size="medium" color="primary" onClick={onMarkRead}>
                <MarkEmailReadRoundedIcon />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title={t("common.delete")}>
            <IconButton size="medium" color="error" onClick={onDelete}>
              <DeleteOutlineRoundedIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>
    </Paper>
  );
}

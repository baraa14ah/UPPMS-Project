import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  IconButton,
  Badge,
  Menu,
  MenuItem,
  Divider,
  Button,
  Tooltip,
  Stack,
  Chip,
} from "@mui/material";
import NotificationsRoundedIcon from "@mui/icons-material/NotificationsRounded";
import { useLanguage } from "../../context/LanguageContext";
import { textEllipsisSx } from "../../styles/textEllipsis";
import DoneAllRoundedIcon from "@mui/icons-material/DoneAllRounded";
import NotificationMenuSkeleton from "../loading/NotificationMenuSkeleton";
import {
  parseNotification,
  resolveNotificationUrl,
  getNotificationMeta,
  formatNotificationTime,
} from "../../utils/notifications";

/** Header bell menu that lists recent notifications and unread counts. */
export default function NotificationBellMenu({
  token,
  authHeaders,
  apiFetch,
  API_BASE_URL,
  unreadCount,
  setUnreadCount,
}) {
  const navigate = useNavigate();
  const { t, lang, isRtl } = useLanguage();
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [items, setItems] = useState([]);

  /** Loads the latest notifications when the dropdown opens. */
  const fetchLatest = async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const { res, data } = await apiFetch(`${API_BASE_URL}/notifications`, {
        headers: authHeaders(),
      });
      if (!res.ok) {
        setError(data?.message || t("notifications.loadError"));
        setItems([]);
        return;
      }
      const list = data?.notifications || [];
      setItems(list.slice(0, 3));
      if (data?.unread_count !== undefined) {
        setUnreadCount(Number(data.unread_count) || 0);
      }
    } catch {
      setError(t("notifications.connectionError"));
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) fetchLatest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, token]);

  /** Opens the notification dropdown menu. */
  const handleOpen = (e) => setAnchorEl(e.currentTarget);
  /** Closes the notification dropdown menu. */
  const handleClose = () => setAnchorEl(null);

  /** Marks every notification as read locally and on the server. */
  const markAllRead = async () => {
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

  /** Marks a notification read and navigates to its target URL. */
  const handleClick = async (n) => {
    handleClose();
    const url = resolveNotificationUrl(n);
    if (n?.id && !n?.read_at) {
      setUnreadCount((prev) => Math.max(0, prev - 1));
      setItems((prev) =>
        prev.map((item) =>
          item.id === n.id
            ? { ...item, read_at: new Date().toISOString() }
            : item,
        ),
      );
      try {
        await apiFetch(`${API_BASE_URL}/notifications/${n.id}/mark-read`, {
          method: "POST",
          headers: authHeaders(),
        });
      } catch {
        /* ignore */
      }
    }
    navigate(url);
  };

  return (
    <>
      <Tooltip title={t("nav.notifications")}>
        <IconButton onClick={handleOpen} aria-label={t("notifications.title")}>
          <Badge color="error" badgeContent={unreadCount} max={99}>
            <NotificationsRoundedIcon />
          </Badge>
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        disableScrollLock
        transformOrigin={{ horizontal: isRtl ? "left" : "right", vertical: "top" }}
        anchorOrigin={{ horizontal: isRtl ? "left" : "right", vertical: "bottom" }}
        PaperProps={{
          sx: {
            width: { xs: "min(100vw - 24px, 440px)", sm: 440 },
            borderRadius: 3,
            mt: 1,
            border: "1px solid",
            borderColor: "divider",
            boxShadow: "0 20px 50px rgba(15,23,42,0.14)",
            overflow: "hidden",
          },
        }}
      >
        <Box
          sx={{
            px: 2,
            py: 1.75,
            bgcolor: "primary.main",
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Typography sx={{ fontWeight: 900, fontSize: 15 }}>
            {t("notifications.title")}
          </Typography>
          <Stack direction="row" spacing={0.5} alignItems="center">
            {unreadCount > 0 && (
              <Chip
                size="small"
                label={`${unreadCount} ${t("notifications.unread")}`}
                sx={{
                  height: 22,
                  fontWeight: 800,
                  bgcolor: "rgba(255,255,255,0.15)",
                  color: "white",
                }}
              />
            )}
            {unreadCount > 0 && (
              <Tooltip title={t("notifications.markAllRead")}>
                <IconButton
                  size="small"
                  onClick={markAllRead}
                  sx={{ color: "white" }}
                >
                  <DoneAllRoundedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        </Box>

        {loading && <NotificationMenuSkeleton count={3} />}

        {!loading && error && (
          <Typography variant="body2" color="error" sx={{ p: 2 }}>
            {error}
          </Typography>
        )}

        {!loading && !error && items.length === 0 && (
          <Box sx={{ p: 3, textAlign: "center" }}>
            <NotificationsRoundedIcon
              sx={{ fontSize: 40, color: "text.disabled", mb: 1 }}
            />
            <Typography variant="body2" color="text.secondary">
              {t("notifications.empty")}
            </Typography>
          </Box>
        )}

        {!loading &&
          !error &&
          items.map((n) => {
            const { type, title, body } = parseNotification(n, t);
            const meta = getNotificationMeta(type, t);
            const Icon = meta.icon;
            const isUnread = !n.read_at;

            return (
              <MenuItem
                key={n.id}
                onClick={() => handleClick(n)}
                sx={{
                  alignItems: "flex-start",
                  gap: 1.5,
                  py: 1.75,
                  px: 2,
                  whiteSpace: "normal",
                  bgcolor: isUnread ? "rgba(37,99,235,0.06)" : "transparent",
                  borderInlineStart: isUnread
                    ? "3px solid #2563EB"
                    : "3px solid transparent",
                }}
              >
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: 2,
                    bgcolor: meta.bg,
                    color: meta.color,
                    display: "grid",
                    placeItems: "center",
                    flexShrink: 0,
                  }}
                >
                  <Icon fontSize="small" />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    spacing={1}
                  >
                    <Typography
                      sx={{ fontWeight: 800, fontSize: 14, ...textEllipsisSx }}
                    >
                      {title}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ flexShrink: 0, fontWeight: 600 }}
                    >
                      {formatNotificationTime(n.created_at, t, lang)}
                    </Typography>
                  </Stack>
                  {body ? (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        mt: 0.4,
                        fontSize: 13,
                        lineHeight: 1.55,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {body}
                    </Typography>
                  ) : null}
                  <Chip
                    label={meta.label}
                    size="small"
                    sx={{
                      mt: 0.9,
                      height: 22,
                      fontSize: 11,
                      fontWeight: 700,
                      bgcolor: meta.bg,
                      color: meta.color,
                    }}
                  />
                </Box>
              </MenuItem>
            );
          })}

        <Divider />
        <Box sx={{ p: 1.25 }}>
          <Button
            fullWidth
            variant="contained"
            onClick={() => {
              handleClose();
              navigate("/dashboard/notifications");
            }}
            sx={{
              borderRadius: 2,
              fontWeight: 800,
              bgcolor: "#111827",
              color: "#fff",
              "&:hover": { bgcolor: "#0B1220", color: "#fff" },
            }}
          >
            {t("notifications.viewAll")}
          </Button>
        </Box>
      </Menu>
    </>
  );
}

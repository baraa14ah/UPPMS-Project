import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Typography,
  Stack,
  TextField,
  IconButton,
  Tooltip,
  Avatar,
  Chip,
  Button,
  alpha,
} from "@mui/material";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { textEllipsisSx } from "../../styles/textEllipsis";

import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import CancelRoundedIcon from "@mui/icons-material/CancelRounded";
import ForumRoundedIcon from "@mui/icons-material/ForumRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import ProjectSectionShell from "../../components/ProjectSectionShell";

/** Project comments chat panel with add, edit, and delete support. */
export default function CommentsTab({
  projectId,
  comments,
  setComments,
  currentUserId,
  currentRole,
  setDialogConfig,
  setDialogLoading,
  closeDialog,
  variant = "tab",
  compact = false,
}) {
  const { authHeaders, apiFetch, API_BASE_URL, user } = useAuth();
  const { t, lang } = useLanguage();
  const dateLocale = lang === "ar" ? "ar-EG" : "en-US";
  const isSidebar = variant === "sidebar";
  const currentUserName = user?.user?.name ?? user?.name ?? "";

  const [newComment, setNewComment] = useState("");
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingCommentValue, setEditingCommentValue] = useState("");
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  const scrollContainerRef = useRef(null);
  const messagesEndRef = useRef(null);

  /** Scrolls the message list to the latest comment. */
  const scrollToBottom = useCallback((behavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior, block: "end" });
  }, []);

  /** Toggles the scroll-to-bottom button based on scroll position. */
  const handleMessagesScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollBtn(distanceFromBottom > 120);
  }, []);

  const sortedComments = useMemo(
    () =>
      [...comments].sort(
        (a, b) => new Date(a.created_at) - new Date(b.created_at),
      ),
    [comments],
  );

  useEffect(() => {
    if (sortedComments.length === 0) return;
    const timer = window.setTimeout(() => scrollToBottom("auto"), 50);
    return () => window.clearTimeout(timer);
  }, [sortedComments.length, scrollToBottom]);

  /** Resolves the display name for a comment author. */
  const resolveAuthorName = (comment, isMine) => {
    const apiName = comment.user?.name?.trim();
    if (apiName) return apiName;
    if (isMine && currentUserName) return currentUserName;
    return t("projectDetails.unknownUser");
  };

  /** Posts a new comment to the project. */
  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return toast.error(t("projectDetails.emptyComment"));

    try {
      const { res, data } = await apiFetch(
        `${API_BASE_URL}/project/${projectId}/comment`,
        {
          method: "POST",
          headers: authHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({ comment: newComment }),
        },
      );

      if (!res.ok) return toast.error(data?.message || t("projectDetails.commentSendError"));

      setComments((prev) => [...prev, data?.comment].filter(Boolean));
      setNewComment("");
      toast.success(t("projectDetails.commentSent"));
      window.setTimeout(() => scrollToBottom(), 80);
    } catch {
      toast.error(t("common.serverError"));
    }
  };

  /** Saves edits to an existing comment. */
  const handleUpdateComment = async (commentId) => {
    if (!editingCommentValue.trim())
      return toast.error(t("projectDetails.emptyCommentSave"));

    try {
      const { res } = await apiFetch(`${API_BASE_URL}/comment/${commentId}`, {
        method: "PUT",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ comment: editingCommentValue }),
      });

      if (!res.ok) return toast.error(t("projectDetails.commentUpdateError"));

      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId ? { ...c, comment: editingCommentValue } : c,
        ),
      );
      toast.success(t("projectDetails.commentUpdated"));
      setEditingCommentId(null);
      setEditingCommentValue("");
    } catch {
      toast.error(t("projectDetails.commentUpdateFailed"));
    }
  };

  /** Opens a confirm dialog and deletes a comment on approval. */
  const handleDeleteComment = (commentId) => {
    setDialogConfig({
      isOpen: true,
      title: t("projectDetails.commentDeleteTitle"),
      content: t("projectDetails.commentDeleteContent"),
      confirmText: t("common.delete"),
      confirmColor: "error",
      onConfirm: async () => {
        try {
          setDialogLoading(true);
          const { res } = await apiFetch(`${API_BASE_URL}/comment/${commentId}`, {
            method: "DELETE",
            headers: authHeaders(),
          });

          if (!res.ok) {
            toast.error(t("projectDetails.commentDeleteError"));
            return;
          }

          setComments((prev) => prev.filter((c) => c.id !== commentId));
          toast.success(t("projectDetails.commentDeleted"));
          closeDialog();
        } catch {
          toast.error(t("common.serverError"));
        } finally {
          setDialogLoading(false);
        }
      },
    });
  };

  const avatarSize = isSidebar ? 32 : compact ? 36 : 40;
  const msgFontSize = isSidebar ? "0.82rem" : compact ? "0.9rem" : "0.95rem";
  const chatHeight = isSidebar
    ? undefined
    : compact
      ? { xs: "min(70vh, 680px)", md: "min(74vh, 760px)" }
      : { xs: "min(68vh, 640px)", md: "min(72vh, 720px)" };

  const chatPanel = (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        height: chatHeight,
        minHeight: isSidebar ? undefined : compact ? { xs: 460, md: 520 } : { xs: 420, md: 480 },
        borderRadius: isSidebar ? 0 : compact ? 2.5 : 3,
        position: "relative",
        border: isSidebar ? "none" : "1px solid",
        borderColor: "divider",
        bgcolor: isSidebar
          ? "transparent"
          : (theme) =>
              theme.palette.mode === "dark"
                ? alpha(theme.palette.background.default, 0.5)
                : alpha("#F8FAFC", 0.95),
        overflow: "hidden",
      }}
    >
      <Box
        ref={scrollContainerRef}
        onScroll={handleMessagesScroll}
        sx={{
          flex: 1,
          overflowY: "auto",
          px: isSidebar ? 1.5 : { xs: 2, sm: 2.5 },
          py: isSidebar ? 1.5 : 2,
          display: "flex",
          flexDirection: "column",
          gap: isSidebar ? 1 : 1.25,
          minHeight: 0,
          "&::-webkit-scrollbar": { width: 6 },
          "&::-webkit-scrollbar-thumb": {
            bgcolor: "divider",
            borderRadius: 10,
          },
        }}
      >
        {sortedComments.length === 0 ? (
          <Box sx={{ flex: 1, display: "grid", placeItems: "center", py: isSidebar ? 4 : 8 }}>
            <Stack alignItems="center" spacing={1.5} sx={{ px: 2, textAlign: "center" }}>
              <ForumRoundedIcon sx={{ fontSize: isSidebar ? 36 : 56, color: "text.disabled" }} />
              <Typography
                color="text.secondary"
                sx={{ fontWeight: 800, fontSize: isSidebar ? "0.85rem" : "1.1rem" }}
              >
                {t("projectDetails.noComments")}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 360 }}>
                {t("projectDetails.commentsEmptyHint")}
              </Typography>
            </Stack>
          </Box>
        ) : (
          <>
            {sortedComments.map((c) => {
              const isMine = Number(c.user_id) === Number(currentUserId);
              const canEdit = currentUserId && isMine;
              const canDelete = currentRole === "admin" || canEdit;
              const isEditing = editingCommentId === c.id;
              const authorName = resolveAuthorName(c, isMine);
              const timeLabel = c.created_at
                ? new Date(c.created_at).toLocaleString(dateLocale, {
                    hour: "2-digit",
                    minute: "2-digit",
                    day: "numeric",
                    month: "short",
                  })
                : "";

              return (
                <Box
                  key={c.id}
                  sx={{
                    display: "flex",
                    gap: 1.25,
                    p: isSidebar ? 1.25 : 1.5,
                    borderRadius: 2.5,
                    border: "1px solid",
                    borderColor: isMine
                      ? (theme) => alpha(theme.palette.primary.main, 0.28)
                      : "divider",
                    bgcolor: isMine
                      ? (theme) => alpha(theme.palette.primary.main, 0.05)
                      : "background.paper",
                  }}
                >
                  <Avatar
                    sx={{
                      width: avatarSize,
                      height: avatarSize,
                      fontSize: isSidebar ? "0.75rem" : "0.9rem",
                      fontWeight: 800,
                      flexShrink: 0,
                      bgcolor: isMine ? "secondary.main" : "primary.main",
                    }}
                  >
                    {authorName.charAt(0)}
                  </Avatar>

                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Stack
                      direction="row"
                      alignItems="center"
                      justifyContent="space-between"
                      spacing={1}
                      sx={{ mb: 0.75 }}
                    >
                      <Stack direction="row" alignItems="center" spacing={0.75} sx={{ minWidth: 0 }}>
                        <Typography
                          variant="subtitle2"
                          sx={{ fontWeight: 900, lineHeight: 1.2, ...textEllipsisSx }}
                        >
                          {authorName}
                        </Typography>
                        {isMine && (
                          <Chip
                            size="small"
                            label={t("projectDetails.commentYou")}
                            sx={{
                              height: 20,
                              fontWeight: 800,
                              fontSize: "0.68rem",
                              bgcolor: (theme) => alpha(theme.palette.primary.main, 0.12),
                              color: "primary.main",
                            }}
                          />
                        )}
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ fontWeight: 600, flexShrink: 0 }}
                        >
                          · {timeLabel}
                        </Typography>
                      </Stack>

                      {(canEdit || canDelete) && !isEditing && (
                        <Stack direction="row" spacing={0.25} sx={{ flexShrink: 0 }}>
                          {canEdit && (
                            <Tooltip title={t("common.edit")}>
                              <IconButton
                                size="small"
                                onClick={() => {
                                  setEditingCommentId(c.id);
                                  setEditingCommentValue(c.comment || "");
                                }}
                              >
                                <EditRoundedIcon sx={{ fontSize: 16 }} />
                              </IconButton>
                            </Tooltip>
                          )}
                          {canDelete && (
                            <Tooltip title={t("common.delete")}>
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleDeleteComment(c.id)}
                              >
                                <DeleteOutlineRoundedIcon sx={{ fontSize: 16 }} />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Stack>
                      )}
                    </Stack>

                    {isEditing ? (
                      <Stack spacing={0.75}>
                        <TextField
                          fullWidth
                          multiline
                          minRows={2}
                          size="small"
                          value={editingCommentValue}
                          onChange={(e) => setEditingCommentValue(e.target.value)}
                        />
                        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                          <IconButton size="small" color="primary" onClick={() => handleUpdateComment(c.id)}>
                            <SaveRoundedIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => {
                              setEditingCommentId(null);
                              setEditingCommentValue("");
                            }}
                          >
                            <CancelRoundedIcon fontSize="small" />
                          </IconButton>
                        </Stack>
                      </Stack>
                    ) : (
                      <Typography
                        variant="body1"
                        sx={{ whiteSpace: "pre-wrap", lineHeight: 1.7, fontSize: msgFontSize }}
                      >
                        {c.comment}
                      </Typography>
                    )}
                  </Box>
                </Box>
              );
            })}
            <Box ref={messagesEndRef} sx={{ height: 1, flexShrink: 0 }} />
          </>
        )}
      </Box>

      {showScrollBtn && sortedComments.length > 0 && (
        <Box
          sx={{
            position: "absolute",
            bottom: isSidebar ? 72 : 88,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 2,
          }}
        >
          <Button
            size="small"
            variant="contained"
            startIcon={<KeyboardArrowDownRoundedIcon />}
            onClick={() => scrollToBottom()}
            sx={{
              fontWeight: 800,
              textTransform: "none",
              borderRadius: 99,
              px: 2,
              boxShadow: 3,
              bgcolor: "#8B5CF6",
              "&:hover": { bgcolor: "#7C3AED" },
            }}
          >
            {t("projectDetails.scrollToLatest")}
          </Button>
        </Box>
      )}

      <Box
        component="form"
        onSubmit={handleAddComment}
        sx={{
          px: isSidebar ? 1.5 : { xs: 2, sm: 3, md: 4 },
          py: isSidebar ? 1.25 : 2,
          borderTop: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
          flexShrink: 0,
        }}
      >
        <Stack
          direction="row"
          spacing={1}
          alignItems="flex-end"
          sx={{
            p: isSidebar ? 0.75 : 1.25,
            borderRadius: 3,
            border: "1px solid",
            borderColor: "divider",
            bgcolor: (theme) =>
              theme.palette.mode === "dark"
                ? alpha(theme.palette.background.default, 0.8)
                : "#fff",
            boxShadow: isSidebar
              ? "none"
              : (theme) =>
                  theme.palette.mode === "dark"
                    ? "none"
                    : "0 4px 16px rgba(15,23,42,0.06)",
          }}
        >
          <TextField
            fullWidth
            multiline
            minRows={isSidebar ? 1 : 2}
            maxRows={isSidebar ? 3 : 5}
            size={isSidebar ? "small" : "medium"}
            variant="standard"
            placeholder={t("projectDetails.commentPlaceholder")}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            InputProps={{ disableUnderline: true }}
            sx={{
              "& .MuiInputBase-input": {
                fontSize: isSidebar ? "0.85rem" : "1rem",
                py: 0.75,
                px: 0.5,
              },
            }}
          />
          <IconButton
            type="submit"
            size={isSidebar ? "small" : "medium"}
            sx={{
              width: isSidebar ? 36 : 48,
              height: isSidebar ? 36 : 48,
              bgcolor: "#8B5CF6",
              color: "#fff",
              flexShrink: 0,
              "&:hover": { bgcolor: "#7C3AED" },
            }}
          >
            <SendRoundedIcon sx={{ fontSize: isSidebar ? 18 : 22 }} />
          </IconButton>
        </Stack>
      </Box>
    </Box>
  );

  if (isSidebar) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          flex: 1,
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            flexShrink: 0,
            px: 2,
            py: 1.5,
            borderBottom: "1px solid",
            borderColor: "divider",
            bgcolor: "background.paper",
            borderTop: "3px solid",
            borderTopColor: "#8B5CF6",
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1.25}>
            <ForumRoundedIcon sx={{ color: "#8B5CF6", fontSize: 22 }} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontWeight: 900, fontSize: "0.9rem", lineHeight: 1.2 }}>
                {t("projectDetails.commentsSidebarTitle")}
              </Typography>
            </Box>
            {comments.length > 0 && (
              <Chip
                size="small"
                label={comments.length}
                sx={{
                  height: 22,
                  fontWeight: 900,
                  fontSize: "0.72rem",
                  bgcolor: alpha("#8B5CF6", 0.12),
                  color: "#7C3AED",
                }}
              />
            )}
          </Stack>
        </Box>
        {chatPanel}
      </Box>
    );
  }

  return (
    <ProjectSectionShell
      icon={ForumRoundedIcon}
      title={t("projectDetails.commentsTitle")}
      subtitle={t("projectDetails.commentsSubtitle")}
      accent="#8B5CF6"
      noPadding
      compact={compact}
      actions={
        <Chip
          size="small"
          label={t("projectDetails.commentsCount", { count: comments.length })}
          sx={{ fontWeight: 800 }}
        />
      }
      contentSx={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}
    >
      {chatPanel}
    </ProjectSectionShell>
  );
}

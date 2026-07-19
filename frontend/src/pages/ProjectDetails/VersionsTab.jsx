import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Paper,
  Typography,
  Stack,
  TextField,
  Button,
  Alert,
  IconButton,
  Tooltip,
  Chip,
  CircularProgress,
} from "@mui/material";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import GitHubLinkCard from "../../components/GitHubLinkCard";
import { buildGithubRedirectUrl, isGithubLinked } from "../../utils/githubLink";

import UploadFileRoundedIcon from "@mui/icons-material/UploadFileRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import CancelRoundedIcon from "@mui/icons-material/CancelRounded";
import CloudUploadRoundedIcon from "@mui/icons-material/CloudUploadRounded";
import FolderZipRoundedIcon from "@mui/icons-material/FolderZipRounded";
import ProjectSectionShell from "../../components/ProjectSectionShell";

/** Project versions tab with upload, edit, delete, and GitHub push. */
export default function VersionsTab({
  projectId,
  project,
  versions,
  setVersions,
  currentUserId,
  currentRole,
  canUploadVersion,
  normalizeFileUrl,
  setDialogConfig,
  setDialogLoading,
  closeDialog,
  compact = false,
}) {
  const { user, authHeaders, apiFetch, API_BASE_URL } = useAuth();
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const dateLocale = lang === "ar" ? "ar-EG" : "en-US";
  const githubLinked = isGithubLinked(user);
  const isProjectOwner =
    Number(project?.user_id) === Number(currentUserId);
  const showGithubBanner =
    isProjectOwner && !!project?.github_repo_url && !githubLinked;
  const showNoRepoWarning = isProjectOwner && !project?.github_repo_url;

  const [versionTitle, setVersionTitle] = useState("");
  const [versionNote, setVersionNote] = useState("");
  const [versionFile, setVersionFile] = useState(null);
  const [uploadingVersion, setUploadingVersion] = useState(false);
  const [versionMsg, setVersionMsg] = useState({ type: "", text: "" });

  const [editingVersionId, setEditingVersionId] = useState(null);
  const [editVersionTitle, setEditVersionTitle] = useState("");
  const [editVersionDesc, setEditVersionDesc] = useState("");
  const [savingEditVersion, setSavingEditVersion] = useState(false);

  const [pushingVersionId, setPushingVersionId] = useState(null);

  /** Uploads a new project version file with title and notes. */
  const handleUploadVersion = async (e) => {
    e.preventDefault();
    setVersionMsg({ type: "", text: "" });
    if (!versionTitle.trim() || !versionFile)
      return setVersionMsg({ type: "error", text: t("projectDetails.versionTitleFileRequired") });

    try {
      setUploadingVersion(true);
      const fd = new FormData();
      fd.append("version_title", versionTitle);
      fd.append("version_description", versionNote || "");
      fd.append("file", versionFile);

      const { res, data } = await apiFetch(
        `${API_BASE_URL}/project/${projectId}/versions/upload`,
        {
          method: "POST",
          headers: authHeaders(),
          body: fd,
        },
      );
      if (!res.ok)
        return setVersionMsg({
          type: "error",
          text: data?.message || t("projectDetails.versionUploadFailed"),
        });

      setVersions((prev) =>
        [normalizeFileUrl(data?.version), ...prev].filter(Boolean),
      );
      setVersionTitle("");
      setVersionNote("");
      setVersionFile(null);
      setVersionMsg({ type: "success", text: t("projectDetails.versionUploaded") });
    } catch {
      setVersionMsg({ type: "error", text: t("common.serverError") });
    } finally {
      setUploadingVersion(false);
    }
  };

  /** Opens inline edit form for a version. */
  const openEditVersion = (v) => {
    setEditingVersionId(v.id);
    setEditVersionTitle(v.version_title || "");
    setEditVersionDesc(v.version_description || "");
  };

  /** Cancels version editing and clears form state. */
  const cancelEditVersion = () => {
    setEditingVersionId(null);
    setEditVersionTitle("");
    setEditVersionDesc("");
  };

  /** Saves title and description edits for a version. */
  const handleSaveEditVersion = async (e) => {
    e.preventDefault();
    if (!editVersionTitle.trim()) return toast.error(t("projectDetails.versionTitleRequired"));
    try {
      setSavingEditVersion(true);
      const { res, data } = await apiFetch(
        `${API_BASE_URL}/project/versions/${editingVersionId}`,
        {
          method: "PUT",
          headers: authHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({
            version_title: editVersionTitle,
            version_description: editVersionDesc || null,
          }),
        },
      );
      if (!res.ok) return toast.error(t("projectDetails.versionEditFailed"));

      setVersions((prev) =>
        prev.map((v) =>
          v.id === editingVersionId
            ? normalizeFileUrl({ ...v, ...data?.version })
            : v,
        ),
      );
      cancelEditVersion();
    } catch {
      toast.error(t("projectDetails.versionEditError"));
    } finally {
      setSavingEditVersion(false);
    }
  };

  /** Opens a confirm dialog and deletes a version on approval. */
  const handleDeleteVersion = (versionId) => {
    setDialogConfig({
      isOpen: true,
      title: t("projectDetails.versionDeleteTitle"),
      content: t("projectDetails.versionDeleteContent"),
      confirmText: t("projectDetails.versionDeleteConfirm"),
      confirmColor: "error",
      onConfirm: async () => {
        try {
          setDialogLoading(true);
          const { res } = await apiFetch(
            `${API_BASE_URL}/project/versions/${versionId}`,
            { method: "DELETE", headers: authHeaders() },
          );

          if (!res.ok) {
            toast.error(t("projectDetails.versionDeleteFailed"));
            return;
          }

          setVersions((prev) => prev.filter((v) => v.id !== versionId));
          toast.success(t("projectDetails.versionDeleted"));
          closeDialog();
        } catch {
          toast.error(t("common.serverError"));
        } finally {
          setDialogLoading(false);
        }
      },
    });
  };

  /** Pushes a version file to the linked GitHub repository. */
  const handlePushToGithub = (versionId) => {
    if (!isProjectOwner) {
      return toast.error(t("projectDetails.onlyOwnerCanPush"));
    }
    if (!project?.github_repo_url) {
      return toast.error(t("projectDetails.githubRepoRequired"));
    }
    if (!githubLinked) {
      setDialogConfig({
        isOpen: true,
        title: t("github.linkRequiredTitle"),
        content: `${t("github.linkRequiredBody")} ${t("github.notLinkedPush")}`,
        confirmText: t("github.linkNow"),
        confirmColor: "primary",
        onConfirm: () => {
          closeDialog();
          window.location.href = buildGithubRedirectUrl(
            API_BASE_URL,
            currentUserId,
            `/dashboard/projects/${projectId}?tab=versions`,
          );
        },
      });
      return;
    }
    setDialogConfig({
      isOpen: true,
      title: t("projectDetails.githubPushTitle"),
      content: t("projectDetails.githubPushContent"),
      confirmText: t("projectDetails.githubPushConfirm"),
      confirmColor: "primary",
      onConfirm: async () => {
        try {
          setDialogLoading(true);
          setPushingVersionId(versionId);
          const { res, data } = await apiFetch(
            `${API_BASE_URL}/project-versions/${versionId}/push-to-github`,
            { method: "POST", headers: authHeaders() },
          );

          if (!res.ok) {
            const msg = data?.message || t("projectDetails.githubPushFailed");
            if (/github|token|ربط/i.test(msg)) {
              toast.error(t("github.linkRequiredBody"));
            } else {
              toast.error(msg);
            }
            return;
          }

          toast.success(t("projectDetails.githubPushSuccess"));
          closeDialog();
        } catch {
          toast.error(t("common.serverError"));
        } finally {
          setDialogLoading(false);
          setPushingVersionId(null);
        }
      },
    });
  };

  return (
    <ProjectSectionShell
      icon={FolderZipRoundedIcon}
      title={t("projectDetails.versionsTitle")}
      subtitle={t("projectDetails.versionsSubtitle")}
      accent="#F59E0B"
      compact={compact}
    >
      {showNoRepoWarning && (
        <Alert
          severity="warning"
          sx={{ mb: 2, borderRadius: 2.5 }}
          action={
            <Button
              color="inherit"
              size="small"
              sx={{ fontWeight: 800, whiteSpace: "nowrap" }}
              onClick={() =>
                navigate(`/dashboard/projects/${projectId}?tab=overview`)
              }
            >
              {t("projectDetails.goToProjectInfo")}
            </Button>
          }
        >
          <Typography sx={{ fontWeight: 800, mb: 0.5 }}>
            {t("projectDetails.githubRepoMissingAlert")}
          </Typography>
          <Typography variant="body2">
            {t("projectDetails.githubRepoMissingHint")}
          </Typography>
        </Alert>
      )}

      {showGithubBanner && (
        <GitHubLinkCard
          variant="banner"
          userId={currentUserId}
          apiBaseUrl={API_BASE_URL}
          linked={githubLinked}
          returnTo={`/dashboard/projects/${projectId}?tab=versions`}
        />
      )}

      {!canUploadVersion && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {t("projectDetails.cannotUploadVersions")}
        </Alert>
      )}

      {canUploadVersion && (
        <Box component="form" onSubmit={handleUploadVersion} sx={{ mb: 2 }}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <TextField
              fullWidth
              size="small"
              label={t("projectDetails.versionTitle")}
              value={versionTitle}
              onChange={(e) => setVersionTitle(e.target.value)}
            />
            <TextField
              fullWidth
              size="small"
              label={t("projectDetails.versionDescOptional")}
              value={versionNote}
              onChange={(e) => setVersionNote(e.target.value)}
            />
            <Button
              component="label"
              variant="outlined"
              startIcon={<UploadFileRoundedIcon />}
              sx={{ minWidth: 170 }}
            >
              {t("projectDetails.chooseFile")}
              <input
                hidden
                type="file"
                onChange={(e) => setVersionFile(e.target.files?.[0] || null)}
              />
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={uploadingVersion}
              sx={{ minWidth: 110 }}
            >
              {uploadingVersion ? "..." : t("common.upload")}
            </Button>
          </Stack>
          {versionFile && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", mt: 1 }}
            >
              {t("projectDetails.fileLabel", { name: versionFile.name })}
            </Typography>
          )}
          {versionMsg.text && (
            <Alert
              severity={versionMsg.type === "error" ? "error" : "success"}
              sx={{ mt: 1 }}
            >
              {versionMsg.text}
            </Alert>
          )}
        </Box>
      )}

      {editingVersionId && (
        <Paper
          variant="outlined"
          sx={{ p: 2, borderRadius: 2, mb: 2, bgcolor: "#fcfcfc" }}
        >
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{ mb: 1 }}
          >
            <Typography sx={{ fontWeight: 800 }}>
              {t("projectDetails.editVersion", { id: editingVersionId })}
            </Typography>
            <Button
              size="small"
              variant="outlined"
              onClick={cancelEditVersion}
              startIcon={<CancelRoundedIcon />}
            >
              {t("common.cancel")}
            </Button>
          </Stack>
          <Box component="form" onSubmit={handleSaveEditVersion}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
              <TextField
                fullWidth
                size="small"
                label={t("projectDetails.versionTitle")}
                value={editVersionTitle}
                onChange={(e) => setEditVersionTitle(e.target.value)}
              />
              <TextField
                fullWidth
                size="small"
                label={t("projectDetails.descriptionOptional")}
                value={editVersionDesc}
                onChange={(e) => setEditVersionDesc(e.target.value)}
              />
              <Button
                type="submit"
                variant="contained"
                disabled={savingEditVersion}
                startIcon={<SaveRoundedIcon />}
                sx={{ minWidth: 120 }}
              >
                {savingEditVersion ? "..." : t("common.save")}
              </Button>
            </Stack>
          </Box>
        </Paper>
      )}

      <Box
        sx={{
          maxHeight: "450px",
          overflowY: "auto",
          pr: 1,
          "&::-webkit-scrollbar": { width: "6px" },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: "#ccc",
            borderRadius: "10px",
          },
        }}
      >
        {versions.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            {t("projectDetails.noVersions")}
          </Typography>
        ) : (
          <Stack spacing={1}>
            {versions.map((v) => {
              const ownerId = String(v?.user_id || "");
              const safeCurrentUserId = String(currentUserId || "");
              const canEditV =
                safeCurrentUserId !== "" && ownerId === safeCurrentUserId;
              const canDeleteV = currentRole === "admin" || canEditV;

              return (
                <Paper
                  key={v.id}
                  variant="outlined"
                  sx={{ p: 1.5, borderRadius: 2, borderColor: "#EFEFEF" }}
                >
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="flex-start"
                    spacing={1}
                  >
                    <Box>
                      <Typography sx={{ fontWeight: 800 }}>
                        {v.version_title || `Version #${v.id}`}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {v.created_at
                          ? new Date(v.created_at).toLocaleString(dateLocale)
                          : ""}
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mt: 1 }}
                      >
                        {v.version_description || t("common.noDescription")}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={0.5}>
                      {v.file_url ? (
                        <Button
                          size="small"
                          variant="outlined"
                          component="a"
                          href={v.file_url}
                          target="_blank"
                          rel="noreferrer"
                          download
                        >
                          {t("common.download")}
                        </Button>
                      ) : (
                        <Chip
                          size="small"
                          label={t("projectDetails.noFile")}
                          variant="outlined"
                        />
                      )}

                      {isProjectOwner &&
                        !!project?.github_repo_url &&
                        !!v.file_url && (
                          <Tooltip title={t("projectDetails.pushToGithub")}>
                            <Button
                              size="small"
                              variant="outlined"
                              color="inherit"
                              onClick={() => handlePushToGithub(v.id)}
                              disabled={pushingVersionId === v.id}
                              startIcon={
                                pushingVersionId === v.id ? (
                                  <CircularProgress size={16} />
                                ) : (
                                  <CloudUploadRoundedIcon fontSize="small" />
                                )
                              }
                              sx={{
                                fontWeight: 700,
                                borderColor: "#24292e",
                                color: "#24292e",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {t("projectDetails.pushToGithub")}
                            </Button>
                          </Tooltip>
                        )}

                      {canEditV && (
                        <Tooltip title={t("common.edit")}>
                          <IconButton
                            size="small"
                            onClick={() => openEditVersion(v)}
                          >
                            <EditRoundedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      {canDeleteV && (
                        <Tooltip title={t("common.delete")}>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteVersion(v.id)}
                          >
                            <DeleteOutlineRoundedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Stack>
                  </Stack>
                </Paper>
              );
            })}
          </Stack>
        )}
      </Box>
    </ProjectSectionShell>
  );
}

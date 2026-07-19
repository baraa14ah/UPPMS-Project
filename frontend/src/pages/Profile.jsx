import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import SupervisorProfilePanel from "./Profile/SupervisorProfilePanel";
import toast from "react-hot-toast";
import {
  Box,
  Paper,
  Typography,
  Stack,
  Button,
  Chip,
  Divider,
  TextField,
  Alert,
  Avatar,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Grid,
} from "@mui/material";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import CancelRoundedIcon from "@mui/icons-material/CancelRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import SchoolRoundedIcon from "@mui/icons-material/SchoolRounded";
import BadgeRoundedIcon from "@mui/icons-material/BadgeRounded";
import PhotoCameraRoundedIcon from "@mui/icons-material/PhotoCameraRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import GitHubLinkCard from "../components/GitHubLinkCard";
import PageHeader from "../components/PageHeader";
import ProfilePageSkeleton from "../components/loading/ProfilePageSkeleton";
import { isGithubLinked } from "../utils/githubLink";
import {
  sectionPaperSx,
  btnPrimarySx,
  headerActionBtnSx,
} from "../styles/dashboardUi";

const fieldSx = {
  "& .MuiInputBase-root": { fontSize: "0.98rem" },
  "& .MuiInputLabel-root": { fontWeight: 700 },
};

/** Normalizes supervisor university memberships from API payload. */
function resolveSupervisorMemberships(user) {
  const fromApi = user?.supervisor_memberships || [];
  if (fromApi.length > 0) return fromApi;

  if (user?.university_id && user?.university?.name) {
    return [{
      id: user.university_id,
      name: user.university.name,
      status: user.status === "active" ? "active" : (user.status || "pending"),
      accepting_supervision: true,
    }];
  }

  const raw = user?.supervisor_universities || user?.supervisorUniversities || [];
  return raw.map((uni) => ({
    id: uni.id,
    name: uni.name,
    status: uni.pivot?.status || uni.status || "pending",
    accepting_supervision: uni.pivot?.accepting_supervision !== false,
  }));
}

/** User profile page with edit, password, and GitHub linking. */
export default function Profile() {
  const { t } = useLanguage();
  const { token, user, authHeaders, apiFetch, API_BASE_URL } = useAuth();

  const role = (user?.role || "").toLowerCase();
  const isStudent = role === "student";
  const isSupervisor = role === "supervisor";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [editMode, setEditMode] = useState(false);
  const [pwdForm, setPwdForm] = useState({
    current_password: "",
    new_password: "",
    new_password_confirmation: "",
  });
  const [pwdSaving, setPwdSaving] = useState(false);
  const [availabilitySaving, setAvailabilitySaving] = useState({});

  const [serverUser, setServerUser] = useState(null);
  const [profile, setProfile] = useState(null);

  const [form, setForm] = useState({
    phone: "",
    avatar: "",
    university_name: "",
    student_number: "",
  });

  const setField = (key) => (e) =>
    setForm((p) => ({ ...p, [key]: e.target.value }));

  const fetchProfile = async () => {
    setLoading(true);
    setError("");

    try {
      const { res, data } = await apiFetch(`${API_BASE_URL}/profile/me`, {
        headers: authHeaders(),
      });

      if (!res.ok) {
        setError(data?.message || t("profile.loadError"));
        setServerUser(null);
        setProfile(null);
        return;
      }

      setServerUser(data?.user || null);
      setProfile(data?.profile || null);

      const p = data?.profile || {};
      const universityName =
        p.university_name
        || data?.user?.university?.name
        || data?.user?.university_name
        || "";
      setForm({
        phone: p.phone || "",
        avatar: p.avatar || "",
        university_name: universityName,
        student_number:
          data?.user?.student_number || p.student_number || "",
      });
    } catch {
      setError(t("common.serverError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleToggleAvailability = async (universityId, nextValue) => {
    setAvailabilitySaving((prev) => ({ ...prev, [universityId]: true }));
    try {
      const { res, data } = await apiFetch(
        `${API_BASE_URL}/profile/supervisor-availability`,
        {
          method: "PUT",
          headers: authHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({
            university_id: universityId,
            accepting_supervision: nextValue,
          }),
        },
      );

      if (!res.ok) {
        toast.error(data?.message || t("profile.availabilityError"));
        return;
      }

      setServerUser(data?.user || null);
      toast.success(
        nextValue
          ? t("profile.availabilityOn")
          : t("profile.availabilityOff"),
      );
    } catch {
      toast.error(t("common.serverError"));
    } finally {
      setAvailabilitySaving((prev) => ({ ...prev, [universityId]: false }));
    }
  };

  const handleCancel = () => {
    setEditMode(false);
    const p = profile || {};
    setForm({
      phone: p.phone || "",
      avatar: p.avatar || "",
      university_name:
        p.university_name
        || serverUser?.university?.name
        || serverUser?.university_name
        || "",
      student_number:
        serverUser?.student_number || p.student_number || "",
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const payload = {
        phone: form.phone || null,
        avatar: form.avatar || null,
        ...(isStudent
          ? { university_name: form.university_name || null }
          : {}),
      };

      const { res, data } = await apiFetch(`${API_BASE_URL}/profile/me`, {
        method: "PUT",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const firstError =
          data?.errors &&
          Object.values(data.errors)?.[0] &&
          Object.values(data.errors)?.[0]?.[0];

        toast.error(firstError || data?.message || t("profile.saveError"));
        return;
      }

      toast.success(t("profile.saved"));
      setProfile(data?.profile || null);
      setServerUser(data?.user || serverUser);
      setEditMode(false);

      const p = data?.profile || {};
      const updatedUser = data?.user || serverUser;
      setForm({
        phone: p.phone || "",
        avatar: p.avatar || "",
        university_name:
          p.university_name
          || updatedUser?.university?.name
          || updatedUser?.university_name
          || "",
        student_number:
          updatedUser?.student_number || p.student_number || "",
      });
    } catch {
      toast.error(t("common.serverError"));
    } finally {
      setSaving(false);
    }
  };

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [unlinking, setUnlinking] = useState(false);

  const performUnlinkGithub = async () => {
    setConfirmOpen(false);

    try {
      setUnlinking(true);

      const { res, data } = await apiFetch(
        `${API_BASE_URL}/profile/unlink-github`,
        { method: "POST", headers: authHeaders() },
      );

      if (!res.ok) {
        toast.error(data?.message || t("profile.unlinkError"));
        return;
      }

      toast.success(t("profile.unlinkSuccess"));
      fetchProfile();
    } catch {
      toast.error(t("common.serverError"));
    } finally {
      setUnlinking(false);
    }
  };

  const handleChangePassword = async () => {
    try {
      setPwdSaving(true);
      const { res, data } = await apiFetch(
        `${API_BASE_URL}/profile/change-password`,
        {
          method: "PUT",
          headers: authHeaders({
            "Content-Type": "application/json",
          }),
          body: JSON.stringify(pwdForm),
        },
      );
      if (!res.ok) {
        throw new Error(
          data?.message || t("profile.passwordChangeError"),
        );
      }
      toast.success(t("profile.passwordUpdated"));
      setPwdForm({
        current_password: "",
        new_password: "",
        new_password_confirmation: "",
      });
    } catch (e) {
      toast.error(e.message);
    } finally {
      setPwdSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ width: "100%" }}>
        <PageHeader
          title={t("profile.title")}
          subtitle={t("profile.accountData")}
          icon={<PersonRoundedIcon />}
        />
        <ProfilePageSkeleton />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ width: "100%" }}>
        <PageHeader
          title={t("profile.title")}
          icon={<PersonRoundedIcon />}
        />
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
          {error}
        </Alert>
        <Button variant="outlined" onClick={fetchProfile}>
          {t("common.retry")}
        </Button>
      </Box>
    );
  }

  const displayName =
    serverUser?.name || serverUser?.user?.name || user?.user?.name || t("profile.userFallback");
  const displayEmail =
    serverUser?.email || serverUser?.user?.email || user?.user?.email || "—";
  const displayUniversity =
    form.university_name
    || serverUser?.university?.name
    || serverUser?.university_name
    || "";

  const currentUserId = serverUser?.id || user?.user?.id;
  const isGithubConnected = isGithubLinked(user, serverUser);
  const supervisorMemberships = resolveSupervisorMemberships(serverUser);
  const supervisorAcceptingCount = supervisorMemberships.filter(
    (m) => m.status === "active" && m.accepting_supervision !== false,
  ).length;

  return (
    <Box sx={{ width: "100%", maxWidth: 1400, mx: "auto" }}>
      <PageHeader
        title={t("profile.title")}
        subtitle={`${displayName} · ${displayEmail}`}
        icon={<PersonRoundedIcon />}
        actions={
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            {!editMode ? (
              <Button
                variant="outlined"
                startIcon={<EditRoundedIcon />}
                onClick={() => setEditMode(true)}
                sx={headerActionBtnSx}
              >
                {t("profile.edit")}
              </Button>
            ) : (
              <>
                <Button
                  variant="outlined"
                  startIcon={<SaveRoundedIcon />}
                  onClick={handleSave}
                  disabled={saving}
                  sx={headerActionBtnSx}
                >
                  {saving ? t("profile.saving") : t("profile.save")}
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<CancelRoundedIcon />}
                  onClick={handleCancel}
                  disabled={saving}
                  sx={headerActionBtnSx}
                >
                  {t("profile.cancel")}
                </Button>
              </>
            )}
          </Stack>
        }
      />

      <Paper
        elevation={0}
        sx={{
          ...sectionPaperSx,
          p: { xs: 2.5, md: 3 },
          mb: 3,
        }}
      >
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2.5}
          alignItems={{ xs: "flex-start", md: "center" }}
        >
          <Avatar
            src={form.avatar || undefined}
            sx={{
              width: { xs: 72, md: 88 },
              height: { xs: 72, md: 88 },
              borderRadius: 3,
              bgcolor: "background.default",
              border: "2px solid",
              borderColor: "divider",
            }}
          >
            <PersonRoundedIcon sx={{ fontSize: 40 }} />
          </Avatar>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h4" sx={{ fontWeight: 900, lineHeight: 1.2 }}>
              {displayName}
            </Typography>
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{ mt: 0.5, fontWeight: 600 }}
            >
              {displayEmail}
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 1.5, flexWrap: "wrap" }} useFlexGap>
              <Chip
                label={`${t("common.role")}: ${t(`roles.${role}`, role || "—")}`}
                sx={{ fontWeight: 800 }}
              />
              {isStudent && (
                <Chip
                  icon={<SchoolRoundedIcon />}
                  label={displayUniversity || t("profile.universityPending")}
                  variant="outlined"
                  sx={{ fontWeight: 700 }}
                />
              )}
              {isSupervisor && (
                <>
                  {supervisorMemberships.length > 0 ? (
                    supervisorMemberships.map((uni) => (
                      <Chip
                        key={uni.id}
                        icon={<SchoolRoundedIcon />}
                        label={uni.name}
                        variant="outlined"
                        color={uni.status === "active" ? "primary" : "default"}
                        sx={{ fontWeight: 700, maxWidth: 280 }}
                      />
                    ))
                  ) : (
                    <Chip
                      icon={<SchoolRoundedIcon />}
                      label={t("profile.supervisorNoUniversities")}
                      variant="outlined"
                      color="warning"
                      sx={{ fontWeight: 700 }}
                    />
                  )}
                  <Chip
                    icon={<GroupsRoundedIcon />}
                    color={supervisorAcceptingCount > 0 ? "success" : "default"}
                    label={t("profile.supervisorStatsAccepting", {
                      count: supervisorAcceptingCount,
                    })}
                    sx={{ fontWeight: 800 }}
                  />
                </>
              )}
              <Chip
                size="small"
                label={editMode ? t("profile.editMode") : t("profile.viewMode")}
                color={editMode ? "warning" : "default"}
                sx={{ fontWeight: 800 }}
              />
            </Stack>
          </Box>
        </Stack>
      </Paper>

      {isSupervisor && (
        <Box sx={{ mb: 3 }}>
          <SupervisorProfilePanel
            memberships={supervisorMemberships}
            availabilitySaving={availabilitySaving}
            onToggleAvailability={handleToggleAvailability}
          />
        </Box>
      )}

      <Grid container spacing={3} alignItems="flex-start">
        <Grid size={{ xs: 12, lg: 7 }}>
          <Paper
            elevation={0}
            sx={{ ...sectionPaperSx, p: { xs: 2.5, md: 3 } }}
          >
            <Typography variant="h6" sx={{ fontWeight: 900, mb: 0.5 }}>
              {t("profile.accountData")}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontWeight: 600 }}>
              {t("profile.nameHelper")}
            </Typography>
            <Divider sx={{ mb: 2.5 }} />

            <Stack spacing={2.25}>
              <TextField
                label={t("profile.name")}
                value={displayName}
                disabled
                fullWidth
                sx={fieldSx}
              />

              <TextField
                label={t("profile.email")}
                value={displayEmail}
                disabled
                fullWidth
                sx={fieldSx}
              />

              <TextField
                label={t("profile.phone")}
                value={form.phone}
                onChange={setField("phone")}
                disabled={!editMode}
                placeholder={t("profile.phonePlaceholder")}
                helperText={!form.phone ? t("profile.phoneEmptyHint") : ""}
                fullWidth
                sx={fieldSx}
              />

              <TextField
                label={t("profile.avatarUrl")}
                value={form.avatar}
                onChange={setField("avatar")}
                disabled={!editMode}
                placeholder={t("profile.avatarPlaceholder")}
                helperText={
                  !form.avatar
                    ? t("profile.avatarEmptyHint")
                    : t("profile.avatarTooltip")
                }
                fullWidth
                sx={fieldSx}
                InputProps={{
                  endAdornment: (
                    <Tooltip title={t("profile.avatarTooltip")}>
                      <IconButton size="small">
                        <PhotoCameraRoundedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  ),
                }}
              />

              {isStudent && (
                <>
                  <Divider sx={{ my: 0.5 }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>
                    {t("profile.extraInfo")}
                  </Typography>
                  <TextField
                    label={t("profile.universityName")}
                    value={form.university_name}
                    onChange={setField("university_name")}
                    disabled={!editMode}
                    placeholder={
                      serverUser?.university?.name || t("profile.universityPlaceholder")
                    }
                    fullWidth
                    sx={fieldSx}
                    InputProps={{
                      startAdornment: (
                        <SchoolRoundedIcon sx={{ mr: 1, color: "text.secondary" }} />
                      ),
                    }}
                  />
                  <TextField
                    label={t("profile.studentNumber")}
                    value={form.student_number || serverUser?.student_number || ""}
                    disabled
                    placeholder={t("profile.studentNumberPlaceholder")}
                    helperText={t("profile.studentNumberHelper")}
                    fullWidth
                    sx={fieldSx}
                    InputProps={{
                      startAdornment: (
                        <BadgeRoundedIcon sx={{ mr: 1, color: "text.secondary" }} />
                      ),
                    }}
                  />
                </>
              )}

              {!isStudent && !isSupervisor && (
                <Alert severity="info" sx={{ borderRadius: 2 }}>
                  {t("profile.noRoleFields")}
                </Alert>
              )}
            </Stack>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, lg: 5 }}>
          <Stack spacing={3}>
            <GitHubLinkCard
              variant="profile"
              userId={currentUserId}
              apiBaseUrl={API_BASE_URL}
              linked={isGithubConnected}
              returnTo="/dashboard/profile"
              onUnlink={() => setConfirmOpen(true)}
              unlinking={unlinking}
            />

            <Paper
              elevation={0}
              sx={{ ...sectionPaperSx, p: { xs: 2.5, md: 3 } }}
            >
              <Typography variant="h6" sx={{ fontWeight: 900, mb: 0.5 }}>
                {t("profile.changePassword")}
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Stack spacing={2}>
                <TextField
                  label={t("profile.currentPassword")}
                  type="password"
                  value={pwdForm.current_password}
                  onChange={(e) =>
                    setPwdForm((p) => ({
                      ...p,
                      current_password: e.target.value,
                    }))
                  }
                  fullWidth
                  sx={fieldSx}
                />
                <TextField
                  label={t("profile.newPassword")}
                  type="password"
                  value={pwdForm.new_password}
                  onChange={(e) =>
                    setPwdForm((p) => ({ ...p, new_password: e.target.value }))
                  }
                  fullWidth
                  sx={fieldSx}
                />
                <TextField
                  label={t("profile.confirmNewPassword")}
                  type="password"
                  value={pwdForm.new_password_confirmation}
                  onChange={(e) =>
                    setPwdForm((p) => ({
                      ...p,
                      new_password_confirmation: e.target.value,
                    }))
                  }
                  fullWidth
                  sx={fieldSx}
                />
                <Button
                  variant="contained"
                  disabled={pwdSaving}
                  onClick={handleChangePassword}
                  sx={{ ...btnPrimarySx, fontWeight: 800, alignSelf: "flex-start", borderRadius: 2, px: 3 }}
                >
                  {pwdSaving ? t("profile.saving") : t("profile.savePassword")}
                </Button>
              </Stack>
            </Paper>
          </Stack>
        </Grid>
      </Grid>

      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 900 }}>{t("profile.unlinkTitle")}</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ fontWeight: 500 }}>
            {t("profile.unlinkContent")}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setConfirmOpen(false)}
            color="inherit"
            sx={{ fontWeight: 700, borderRadius: 2 }}
          >
            {t("profile.unlinkBack")}
          </Button>
          <Button
            onClick={performUnlinkGithub}
            color="error"
            variant="contained"
            sx={{ fontWeight: 700, borderRadius: 2 }}
            disableElevation
          >
            {t("profile.unlinkConfirm")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

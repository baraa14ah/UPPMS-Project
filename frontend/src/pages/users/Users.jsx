import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import toast from "react-hot-toast";

import ConfirmDialog from "../../components/shared/ConfirmDialog";
import ListToolbar from "../../components/shared/ListToolbar";
import TablePageSkeleton from "../../components/loading/TablePageSkeleton";
import { btnPrimarySx, pageContainerSx, tableContainerSx } from "../../styles/dashboardUi";
import { textEllipsisSx } from "../../styles/textEllipsis";

import {
  Box,
  Paper,
  Typography,
  Stack,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  Alert,
} from "@mui/material";

import PersonAddAltRoundedIcon from "@mui/icons-material/PersonAddAltRounded";
import GroupRoundedIcon from "@mui/icons-material/GroupRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import CancelRoundedIcon from "@mui/icons-material/CancelRounded";
import HourglassEmptyRoundedIcon from "@mui/icons-material/HourglassEmptyRounded";
import LockResetRoundedIcon from "@mui/icons-material/LockResetRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import VpnKeyRoundedIcon from "@mui/icons-material/VpnKeyRounded";
import VerifiedUserRoundedIcon from "@mui/icons-material/VerifiedUserRounded";
import UploadFileRoundedIcon from "@mui/icons-material/UploadFileRounded";
import { ROLE_THEMES } from "../../config/roleTheme";
import XmlImportPanel from "../../components/users/XmlImportPanel";

/** Admin user management page with approval and password requests. */
export default function Users() {
  const { dir, t } = useLanguage();
  const {
    token,
    user: currentUser,
    authHeaders,
    apiFetch,
    API_BASE_URL,
  } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const jsonHeaders = useMemo(
    () => authHeaders({ "Content-Type": "application/json" }),
    [authHeaders],
  );

  const adminRole = String(
    currentUser?.role?.name ?? currentUser?.role ?? "",
  ).toLowerCase();
  const isAdmin = adminRole === "admin";

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentTab, setCurrentTab] = useState(
    () => searchParams.get("tab") || "all",
  );
  const [passwordRequests, setPasswordRequests] = useState([]);
  const [passwordRequestsLoading, setPasswordRequestsLoading] = useState(false);
  const [passwordRequestsError, setPasswordRequestsError] = useState("");
  const [pendingUsersCount, setPendingUsersCount] = useState(0);
  const [tempPasswordDialog, setTempPasswordDialog] = useState({
    open: false,
    password: "",
    userName: "",
  });
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  const [openEdit, setOpenEdit] = useState(false);
  const [editData, setEditData] = useState({ id: "", name: "", email: "" });
  const [isSaving, setIsSaving] = useState(false);

  const [openAdd, setOpenAdd] = useState(false);
  const [addData, setAddData] = useState({
    name: "",
    email: "",
    password: "",
    role: "student",
    student_number: "",
  });
  const [isAdding, setIsAdding] = useState(false);

  const [dialogConfig, setDialogConfig] = useState({
    isOpen: false,
    title: "",
    content: "",
    confirmText: "تأكيد",
    confirmColor: "error",
    onConfirm: null,
  });
  const [dialogLoading, setDialogLoading] = useState(false);
  /** Closes the shared confirmation dialog. */
  const closeDialog = () =>
    setDialogConfig((prev) => ({ ...prev, isOpen: false }));

  /** Resolves the universities column label for a user row. */
  const universityLabel = (u) => {
    const roleName = String(u.role?.name || u.role).toLowerCase();
    if (roleName === "supervisor") {
      const names = u.supervisor_university_names || [];
      if (names.length > 0) return names.join("، ");
    }
    return u.university_name || u.university?.name || "—";
  };

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  /** Fetches users filtered by tab, role, and search query. */
  const fetchUsers = async (status = currentTab) => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();
      if (status !== "all") params.set("status", status);
      if (roleFilter) params.set("role", roleFilter);
      if (searchDebounced.trim()) params.set("search", searchDebounced.trim());
      const qs = params.toString();
      const url = `${API_BASE_URL}/users${qs ? `?${qs}` : ""}`;

      const { res, data } = await apiFetch(url, {
        headers: jsonHeaders,
      });
      if (!res.ok) throw new Error(data?.message || t("users.loadError"));
      setUsers(data?.users || data?.data || []);
    } catch (err) {
      setError(err.message);
      toast.error(t("users.serverError"));
    } finally {
      setLoading(false);
    }
  };

  /** Loads pending password reset help requests. */
  const fetchPasswordRequests = async () => {
    try {
      setPasswordRequestsLoading(true);
      setPasswordRequestsError("");
      const { res, data } = await apiFetch(
        `${API_BASE_URL}/password-reset-requests`,
        { headers: jsonHeaders },
      );
      if (!res.ok) {
        throw new Error(data?.message || t("users.loadError"));
      }
      setPasswordRequests(data?.requests || []);
    } catch (err) {
      setPasswordRequestsError(err.message);
      toast.error(err.message);
    } finally {
      setPasswordRequestsLoading(false);
    }
  };

  /** Fetches sidebar badge counts for pending user approvals. */
  const fetchAdminBadges = async () => {
    if (!token || !isAdmin) return;
    try {
      const { res, data } = await apiFetch(`${API_BASE_URL}/dashboard/badges`, {
        headers: jsonHeaders,
      });
      if (res.ok) {
        setPendingUsersCount(Number(data?.pending_users) || 0);
      }
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    if (!token || !isAdmin) return;
    apiFetch(`${API_BASE_URL}/password-reset-requests`, {
      headers: jsonHeaders,
    })
      .then(({ res, data }) => {
        if (res.ok) setPasswordRequests(data?.requests || []);
      })
      .catch(() => {});
    fetchAdminBadges();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, isAdmin]);

  useEffect(() => {
    if (!token) return;
    if (currentTab === "password_requests") {
      fetchPasswordRequests();
    } else if (currentTab !== "xml_import") {
      fetchUsers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, currentTab, roleFilter, searchDebounced]);

  /** Switches list tab and syncs the URL search param. */
  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
    if (newValue === "password_requests" || newValue === "pending" || newValue === "xml_import") {
      setSearchParams({ tab: newValue });
    } else {
      setSearchParams({});
    }
  };

  /** Opens confirm dialog to issue a temporary password for a request. */
  const handleIssueTempPassword = (req) => {
    const userName = req?.user?.name || req?.email;
    setDialogConfig({
      isOpen: true,
      title: t("users.tempPasswordTitle"),
      content: t("users.tempPasswordContent"),
      confirmText: t("users.tempPasswordBtn"),
      confirmColor: "primary",
      onConfirm: async () => {
        try {
          setDialogLoading(true);
          const { res, data } = await apiFetch(
            `${API_BASE_URL}/password-reset-requests/${req.id}/temporary-password`,
            { method: "POST", headers: jsonHeaders },
          );
          if (!res.ok) {
            const msg =
              data?.errors?.request?.[0] || data?.message || t("common.error");
            throw new Error(msg);
          }
          closeDialog();
          setPasswordRequests((prev) => prev.filter((r) => r.id !== req.id));
          setTempPasswordDialog({
            open: true,
            password: data.temporary_password,
            userName,
          });
          toast.success(t("users.tempPasswordSet"));
          window.dispatchEvent(new Event("updateSidebarBadges"));
        } catch (e) {
          toast.error(e.message);
          closeDialog();
        } finally {
          setDialogLoading(false);
        }
      },
    });
  };

  /** Opens confirm dialog to dismiss a password help request. */
  const handleDismissPasswordRequest = (req) => {
    setDialogConfig({
      isOpen: true,
      title: t("users.dismissRequestTitle"),
      content: t("users.dismissRequestContent"),
      confirmText: t("users.dismissRequestBtn"),
      confirmColor: "inherit",
      onConfirm: async () => {
        try {
          setDialogLoading(true);
          const { res, data } = await apiFetch(
            `${API_BASE_URL}/password-reset-requests/${req.id}/dismiss`,
            { method: "POST", headers: jsonHeaders },
          );
          if (!res.ok) {
            throw new Error(data?.message || t("common.error"));
          }
          setPasswordRequests((prev) => prev.filter((r) => r.id !== req.id));
          closeDialog();
          toast.success(t("users.requestDismissed"));
          window.dispatchEvent(new Event("updateSidebarBadges"));
        } catch (e) {
          toast.error(e.message);
          closeDialog();
        } finally {
          setDialogLoading(false);
        }
      },
    });
  };

  /** Copies the generated temporary password to the clipboard. */
  const copyTempPassword = async () => {
    try {
      await navigator.clipboard.writeText(tempPasswordDialog.password);
      toast.success(t("users.copied"));
    } catch {
      toast.error(t("users.copyFailed"));
    }
  };

  /** Creates a new user via the admin API. */
  const handleAddSubmit = async () => {
    if (!addData.name || !addData.email) {
      return toast.error(t("users.fillAllFields"));
    }

    try {
      setIsAdding(true);
      const { res, data } = await apiFetch(`${API_BASE_URL}/users`, {
        method: "POST",
        headers: jsonHeaders,
        body: JSON.stringify({
          name: addData.name,
          email: addData.email,
          role: addData.role,
          ...(addData.role === "student"
            ? { student_number: addData.student_number }
            : {}),
        }),
      });

      if (!res.ok) {
        throw new Error(data?.message || t("common.error"));
      }

      toast.success(t("users.userAdded"));
      setUsers((prev) => [data.user, ...prev]);
      setAddData({ name: "", email: "", role: "student", student_number: "" });
      setOpenAdd(false);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setIsAdding(false);
    }
  };

  /** Opens the edit dialog prefilled with the selected user. */
  const handleOpenEdit = (user) => {
    setEditData({ id: user.id, name: user.name, email: user.email });
    setOpenEdit(true);
  };

  /** Saves name and email changes for the edited user. */
  const handleSaveEdit = async () => {
    if (!editData.name || !editData.email)
      return toast.error(t("users.fillAllFields"));

    try {
      setIsSaving(true);
      const { res, data } = await apiFetch(
        `${API_BASE_URL}/users/${editData.id}`,
        {
          method: "PUT",
          headers: jsonHeaders,
          body: JSON.stringify({ name: editData.name, email: editData.email }),
        },
      );
      if (!res.ok) throw new Error(data?.message || t("common.error"));

      toast.success(t("users.userUpdated"));
      setUsers((prev) =>
        prev.map((u) =>
          u.id === editData.id
            ? { ...u, name: editData.name, email: editData.email }
            : u,
        ),
      );
      setOpenEdit(false);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setIsSaving(false);
    }
  };

  /** Opens confirm dialog to delete a user by id. */
  const handleDelete = (id) => {
    setDialogConfig({
      isOpen: true,
      title: t("users.deleteConfirmTitle"),
      content: t("users.deleteConfirmContent"),
      confirmText: t("users.deleteConfirmBtn"),
      confirmColor: "error",
      onConfirm: async () => {
        try {
          setDialogLoading(true);
          const { res, data } = await apiFetch(`${API_BASE_URL}/users/${id}`, {
            method: "DELETE",
            headers: jsonHeaders,
          });

          if (!res.ok) {
            throw new Error(data?.message || t("common.error"));
          }

          toast.success(t("users.userDeleted"));
          setUsers((prev) => prev.filter((u) => u.id !== id));
          closeDialog();
        } catch (e) {
          toast.error(e.message);
          closeDialog();
        } finally {
          setDialogLoading(false);
        }
      },
    });
  };

  /** Opens confirm dialog to approve a pending user. */
  const handleApprove = (id) => {
    setDialogConfig({
      isOpen: true,
      title: t("users.approveConfirmTitle"),
      content: t("users.approveConfirmContent"),
      confirmText: t("users.approveConfirmBtn"),
      confirmColor: "success",
      onConfirm: async () => {
        try {
          setDialogLoading(true);
          const { res, data } = await apiFetch(
            `${API_BASE_URL}/users/${id}/approve`,
            { method: "POST", headers: jsonHeaders },
          );

          if (!res.ok) {
            throw new Error(data?.message || t("common.error"));
          }

          toast.success(t("users.userApproved"));
          const approved = data?.user;
          setUsers((prev) =>
            prev.map((u) =>
              u.id === id
                ? {
                    ...u,
                    status: approved?.status ?? "active",
                    membership_status: approved?.membership_status ?? "active",
                  }
                : u,
            ),
          );
          closeDialog();
          setPendingUsersCount((c) => Math.max(0, c - 1));
          window.dispatchEvent(new Event("updateSidebarBadges"));
        } catch (e) {
          toast.error(e.message);
          closeDialog();
        } finally {
          setDialogLoading(false);
        }
      },
    });
  };

  /** Opens confirm dialog to reject a pending user. */
  const handleReject = (id) => {
    setDialogConfig({
      isOpen: true,
      title: t("users.rejectConfirmTitle"),
      content: t("users.rejectConfirmContent"),
      confirmText: t("users.rejectConfirmBtn"),
      confirmColor: "error",
      onConfirm: async () => {
        try {
          setDialogLoading(true);
          const { res, data } = await apiFetch(
            `${API_BASE_URL}/users/${id}/reject`,
            { method: "POST", headers: jsonHeaders },
          );

          if (!res.ok) {
            throw new Error(data?.message || t("common.error"));
          }

          toast.success(t("users.userRejected"));
          const rejected = data?.user;
          setUsers((prev) =>
            prev.map((u) =>
              u.id === id
                ? {
                    ...u,
                    status: rejected?.status ?? "rejected",
                    membership_status:
                      rejected?.membership_status ?? "rejected",
                  }
                : u,
            ),
          );
          closeDialog();
          setPendingUsersCount((c) => Math.max(0, c - 1));
          window.dispatchEvent(new Event("updateSidebarBadges"));
        } catch (e) {
          toast.error(e.message);
          closeDialog();
        } finally {
          setDialogLoading(false);
        }
      },
    });
  };

  /** Renders a membership status chip (pending, rejected, active). */
  const statusChip = (status) => {
    const s = String(status || "active").toLowerCase();
    if (s === "pending")
      return (
        <Chip
          size="small"
          color="warning"
          icon={<HourglassEmptyRoundedIcon />}
          label={t("users.statusPending")}
          sx={{ fontWeight: 800 }}
        />
      );
    if (s === "rejected")
      return (
        <Chip
          size="small"
          color="error"
          icon={<CancelRoundedIcon />}
          label={t("users.statusRejected")}
          sx={{ fontWeight: 800 }}
        />
      );
    return (
      <Chip
        size="small"
        color="success"
        icon={<VerifiedUserRoundedIcon />}
        label={t("users.statusActive")}
        sx={{ fontWeight: 800 }}
      />
    );
  };

  /** Renders a themed role chip with icon and localized label. */
  const roleChip = (roleName) => {
    const role = String(roleName || "").toLowerCase();
    const theme = ROLE_THEMES[role];

    const roleLabelMap = {
      student: t("users.roleStudent"),
      supervisor: t("users.roleSupervisor"),
      admin: t("users.roleAdmin"),
      super_admin: t("roles.super_admin"),
    };

    if (theme) {
      const RoleIcon = theme.icon;
      return (
        <Chip
          size="small"
          icon={<RoleIcon />}
          label={roleLabelMap[role] || role}
          sx={{
            fontWeight: 800,
            bgcolor: theme.accentSoft,
            color: theme.accent,
            "& .MuiChip-icon": { color: theme.accent },
          }}
        />
      );
    }

    return (
      <Chip
        size="small"
        variant="outlined"
        label={role || t("users.roleUnknown")}
      />
    );
  };

  const isPasswordTab = currentTab === "password_requests";
  const isXmlTab = currentTab === "xml_import";
  const passwordRequestCount = passwordRequests.length;
  const showPendingAlert =
    isAdmin && pendingUsersCount > 0 && currentTab !== "pending";
  const showPasswordAlert =
    isAdmin && passwordRequestCount > 0 && !isPasswordTab;

  return (
    <Box sx={pageContainerSx}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <GroupRoundedIcon color="primary" fontSize="large" />
            <Typography variant="h4" sx={{ fontWeight: 900 }}>
              {t("users.title")}
            </Typography>
          </Stack>
          <Typography
            variant="subtitle1"
            color="text.secondary"
            sx={{ mt: 0.5, fontWeight: 500 }}
          >
            {t("users.subtitle")}
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<PersonAddAltRoundedIcon />}
          sx={{ ...btnPrimarySx, borderRadius: 2, px: 3, py: 1 }}
          onClick={() => setOpenAdd(true)}
        >
          {t("users.addNew")}
        </Button>
      </Stack>

      {isAdmin && (showPendingAlert || showPasswordAlert) && (
        <Stack spacing={1.5} sx={{ mb: 2 }}>
          {showPendingAlert && (
            <Alert
              severity="warning"
              icon={<HourglassEmptyRoundedIcon />}
              action={
                <Button
                  color="inherit"
                  size="small"
                  onClick={() => handleTabChange(null, "pending")}
                  sx={{ fontWeight: 800 }}
                >
                  {t("users.pendingAlertAction")}
                </Button>
              }
              sx={{ borderRadius: 2, fontWeight: 600 }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>
                {t("users.pendingAlertTitle")}
              </Typography>
              {t("users.pendingAlertBody", { count: pendingUsersCount })}
            </Alert>
          )}
          {showPasswordAlert && (
            <Alert
              severity="info"
              icon={<LockResetRoundedIcon />}
              action={
                <Button
                  color="inherit"
                  size="small"
                  onClick={() => handleTabChange(null, "password_requests")}
                  sx={{ fontWeight: 800 }}
                >
                  {t("users.passwordAlertAction")}
                </Button>
              }
              sx={{ borderRadius: 2, fontWeight: 600 }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>
                {t("users.passwordAlertTitle")}
              </Typography>
              {t("users.passwordAlertBody", { count: passwordRequestCount })}
            </Alert>
          )}
        </Stack>
      )}

      <Box sx={{ mb: 3 }}>
        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          textColor="primary"
          indicatorColor="primary"
          sx={{
            "& .MuiTab-root": { fontWeight: 800, fontSize: "1rem" },
            borderBottom: 1,
            borderColor: "divider",
          }}
        >
          <Tab label={t("users.tabAll")} value="all" />
          <Tab
            label={
              <Stack direction="row" spacing={1} alignItems="center">
                <span>{t("users.tabPending")}</span>
                {isAdmin && pendingUsersCount > 0 && (
                  <Chip
                    size="small"
                    color="warning"
                    label={pendingUsersCount}
                    sx={{ height: 22, fontWeight: 800 }}
                  />
                )}
              </Stack>
            }
            value="pending"
          />
          <Tab label={t("users.tabActive")} value="active" />
          <Tab label={t("users.tabRejected")} value="rejected" />
          {isAdmin && (
            <Tab
              icon={<UploadFileRoundedIcon sx={{ fontSize: 18 }} />}
              iconPosition="start"
              label={t("users.tabXmlImport")}
              value="xml_import"
            />
          )}
          {isAdmin && (
            <Tab
              label={
                <Stack direction="row" spacing={1} alignItems="center">
                  <span>{t("users.tabPasswordRequests")}</span>
                  {passwordRequestCount > 0 && (
                    <Chip
                      size="small"
                      color="warning"
                      label={passwordRequestCount}
                      sx={{ height: 22, fontWeight: 800 }}
                    />
                  )}
                </Stack>
              }
              value="password_requests"
            />
          )}
        </Tabs>
      </Box>

      {!isPasswordTab && !isXmlTab && (
        <ListToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder={t("users.searchPlaceholder")}
          onRefresh={() => fetchUsers()}
          filters={[
            {
              key: "role",
              label: t("users.roleFilter"),
              value: roleFilter,
              onChange: setRoleFilter,
              options: [
                { value: "student", label: t("users.roleStudent") },
                { value: "supervisor", label: t("users.roleSupervisor") },
              ],
            },
          ]}
        />
      )}

      {isXmlTab ? (
        <XmlImportPanel />
      ) : (
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          border: "1px solid #EAEAEA",
          overflow: "hidden",
        }}
      >
        {isPasswordTab ? (
          passwordRequestsLoading ? (
            <TablePageSkeleton
              rows={6}
              columnWidths={["16%", "18%", "12%", "12%", "14%", "16%", "12%"]}
            />
          ) : passwordRequestsError ? (
            <Box sx={{ p: 5, textAlign: "center" }}>
              <Typography color="error" sx={{ fontWeight: 800, mb: 2 }}>
                {passwordRequestsError}
              </Typography>
              <Button variant="outlined" onClick={fetchPasswordRequests}>
                {t("users.retry")}
              </Button>
            </Box>
          ) : passwordRequests.length === 0 ? (
            <Box sx={{ p: 10, textAlign: "center" }}>
              <LockResetRoundedIcon
                sx={{ fontSize: 56, color: "text.disabled", mb: 2 }}
              />
              <Typography sx={{ fontWeight: 800, color: "text.secondary" }}>
                {t("users.passwordRequestsEmpty")}
              </Typography>
            </Box>
          ) : (
            <TableContainer sx={tableContainerSx}>
              <Table>
                <TableHead sx={{ bgcolor: "rgba(0,0,0,0.02)" }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 900 }}>
                      {t("users.user")}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 900 }}>
                      {t("users.email")}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 900 }}>
                      {t("users.studentNumber")}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 900 }}>
                      {t("users.accountStatus")}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 900 }}>
                      {t("users.date")}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 900 }}>
                      {t("users.note")}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 900, textAlign: "center" }}>
                      {t("users.actions")}
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {passwordRequests.map((req) => (
                    <TableRow key={req.id} hover>
                      <TableCell sx={{ fontWeight: 800 }}>
                        {req.user?.name || "—"}
                      </TableCell>
                      <TableCell>{req.email}</TableCell>
                      <TableCell>
                        {req.student_number || req.user?.student_number || "—"}
                      </TableCell>
                      <TableCell>{statusChip(req.user?.status)}</TableCell>
                      <TableCell>
                        {req.created_at
                          ? new Date(req.created_at).toLocaleString("ar-EG")
                          : "—"}
                      </TableCell>
                      <TableCell sx={{ maxWidth: 200 }}>
                        <Typography variant="body2" sx={textEllipsisSx} title={req.message}>
                          {req.message || "—"}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ textAlign: "center" }}>
                        <Stack
                          direction="row"
                          spacing={1}
                          justifyContent="center"
                        >
                          <Tooltip title={t("users.tempPassword")}>
                            <span>
                              <IconButton
                                color="primary"
                                size="small"
                                disabled={req.user?.status !== "active"}
                                onClick={() => handleIssueTempPassword(req)}
                              >
                                <VpnKeyRoundedIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title={t("users.dismissRequest")}>
                            <IconButton
                              size="small"
                              onClick={() => handleDismissPasswordRequest(req)}
                            >
                              <CancelRoundedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )
        ) : loading ? (
          <TablePageSkeleton rows={9} />
        ) : error ? (
          <Box sx={{ p: 5, textAlign: "center" }}>
            <Typography color="error" sx={{ fontWeight: 800, mb: 2 }}>
              {error}
            </Typography>
            <Button variant="outlined" onClick={() => fetchUsers()}>
              {t("users.retry")}
            </Button>
          </Box>
        ) : users.length === 0 ? (
          <Box sx={{ p: 10, textAlign: "center" }}>
            <GroupRoundedIcon
              sx={{ fontSize: 60, color: "text.disabled", mb: 2 }}
            />
            <Typography
              variant="h6"
              sx={{ fontWeight: 800, color: "text.secondary" }}
            >
              {t("users.noUsers")}
            </Typography>
          </Box>
        ) : (
          <TableContainer sx={tableContainerSx}>
            <Table>
              <TableHead sx={{ bgcolor: "rgba(0,0,0,0.02)" }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 900, py: 2 }}>
                    {t("users.name")}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 900, py: 2 }}>
                    {t("users.studentNumber")}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 900, py: 2 }}>
                    {t("users.email")}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 900, py: 2 }}>
                    {t("users.role")}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 900, py: 2 }}>
                    {t("users.universities")}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 900, py: 2 }}>
                    {t("users.status")}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 900, py: 2 }}>
                    {t("users.joinDate")}
                  </TableCell>
                  <TableCell
                    sx={{ fontWeight: 900, py: 2, textAlign: "center" }}
                  >
                    {t("users.actions")}
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((u) => (
                  <TableRow
                    key={u.id}
                    hover
                    sx={{ "&:last-child td": { border: 0 } }}
                  >
                    <TableCell sx={{ fontWeight: 800 }}>{u.name}</TableCell>
                    <TableCell sx={{ color: "text.secondary" }}>
                      {u.student_number || "—"}
                    </TableCell>
                    <TableCell
                      sx={{ color: "text.secondary", fontWeight: 500 }}
                    >
                      {u.email}
                    </TableCell>
                    <TableCell>{roleChip(u.role?.name || u.role)}</TableCell>
                    <TableCell sx={{ color: "text.secondary", maxWidth: 220 }}>
                      <Typography
                        variant="body2"
                        sx={textEllipsisSx}
                        title={universityLabel(u)}
                      >
                        {universityLabel(u)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {statusChip(u.membership_status || u.status)}
                    </TableCell>
                    <TableCell
                      sx={{ color: "text.secondary", fontSize: "0.9rem" }}
                    >
                      {u.created_at
                        ? new Date(u.created_at).toLocaleDateString("ar-EG")
                        : "—"}
                    </TableCell>
                    <TableCell sx={{ textAlign: "center" }}>
                      <Stack
                        direction="row"
                        spacing={1}
                        justifyContent="center"
                      >
                        {isAdmin &&
                          (u.membership_status || u.status) === "pending" && (
                            <>
                              <Tooltip title={t("users.approve")}>
                                <IconButton
                                  color="success"
                                  size="small"
                                  onClick={() => handleApprove(u.id)}
                                >
                                  <CheckCircleRoundedIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title={t("users.reject")}>
                                <IconButton
                                  color="error"
                                  size="small"
                                  onClick={() => handleReject(u.id)}
                                >
                                  <CancelRoundedIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </>
                          )}
                        <Tooltip title={t("users.edit")}>
                          <IconButton
                            color="primary"
                            size="small"
                            onClick={() => handleOpenEdit(u)}
                          >
                            <EditRoundedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={t("users.delete")}>
                          <IconButton
                            color="error"
                            size="small"
                            onClick={() => handleDelete(u.id)}
                          >
                            <DeleteRoundedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
      )}

      <Dialog
        open={openEdit}
        onClose={() => setOpenEdit(false)}
        maxWidth="sm"
        fullWidth
        dir={dir}
      >
        <DialogTitle sx={{ fontWeight: 900 }}>
          {t("users.editTitle")}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              label={t("users.fullName")}
              fullWidth
              value={editData.name}
              onChange={(e) =>
                setEditData({ ...editData, name: e.target.value })
              }
            />
            <TextField
              label={t("users.email")}
              type="email"
              fullWidth
              value={editData.email}
              onChange={(e) =>
                setEditData({ ...editData, email: e.target.value })
              }
              dir="ltr"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2, px: 3 }}>
          <Button
            onClick={() => setOpenEdit(false)}
            color="inherit"
            sx={{ fontWeight: 800 }}
          >
            {t("common.cancel")}
          </Button>
          <Button
            onClick={handleSaveEdit}
            variant="contained"
            disabled={isSaving}
            sx={{ ...btnPrimarySx, px: 3 }}
          >
            {isSaving ? t("users.saving") : t("users.saveChanges")}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={tempPasswordDialog.open}
        onClose={() =>
          setTempPasswordDialog({ open: false, password: "", userName: "" })
        }
        maxWidth="sm"
        fullWidth
        dir={dir}
      >
        <DialogTitle sx={{ fontWeight: 900 }}>
          {t("users.tempPasswordDialog")} — {tempPasswordDialog.userName}
        </DialogTitle>
        <DialogContent dividers>
          <Alert severity="warning" sx={{ mb: 2 }}>
            {t("users.tempPasswordWarning")}
          </Alert>
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              borderRadius: 2,
              bgcolor: (theme) =>
                theme.palette.mode === "dark"
                  ? "rgba(255,255,255,0.05)"
                  : "#F9FAFB",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 2,
            }}
          >
            <Typography
              sx={{
                fontFamily: "monospace",
                fontWeight: 800,
                fontSize: "1.1rem",
                letterSpacing: 1,
              }}
              dir="ltr"
            >
              {tempPasswordDialog.password}
            </Typography>
            <IconButton onClick={copyTempPassword} color="primary">
              <ContentCopyRoundedIcon />
            </IconButton>
          </Paper>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            variant="contained"
            onClick={() =>
              setTempPasswordDialog({ open: false, password: "", userName: "" })
            }
            sx={btnPrimarySx}
          >
            {t("users.tempPasswordDone")}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={dialogConfig.isOpen}
        title={dialogConfig.title}
        content={dialogConfig.content}
        confirmText={dialogConfig.confirmText}
        confirmColor={dialogConfig.confirmColor}
        loading={dialogLoading}
        onClose={closeDialog}
        onConfirm={dialogConfig.onConfirm}
      />
      <Dialog
        open={openAdd}
        onClose={() => setOpenAdd(false)}
        maxWidth="sm"
        fullWidth
        dir={dir}
      >
        <DialogTitle sx={{ fontWeight: 900 }}>
          {t("users.addTitle")}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              label={t("users.fullName")}
              fullWidth
              value={addData.name}
              onChange={(e) => setAddData({ ...addData, name: e.target.value })}
            />
            <TextField
              label={t("users.email")}
              type="email"
              fullWidth
              value={addData.email}
              onChange={(e) =>
                setAddData({ ...addData, email: e.target.value })
              }
              dir="ltr"
            />

            <FormControl fullWidth>
              <InputLabel>{t("users.userRole")}</InputLabel>
              <Select
                value={addData.role}
                label={t("users.userRole")}
                onChange={(e) =>
                  setAddData({ ...addData, role: e.target.value })
                }
              >
                <MenuItem value="student" sx={{ fontWeight: 600 }}>
                  {t("users.roleStudent")}
                </MenuItem>
                <MenuItem value="supervisor" sx={{ fontWeight: 600 }}>
                  {t("users.roleSupervisor")}
                </MenuItem>
              </Select>
            </FormControl>

            {addData.role === "student" && (
              <TextField
                label={t("users.studentNumber")}
                fullWidth
                required
                value={addData.student_number}
                onChange={(e) =>
                  setAddData({ ...addData, student_number: e.target.value })
                }
              />
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2, px: 3 }}>
          <Button
            onClick={() => setOpenAdd(false)}
            color="inherit"
            sx={{ fontWeight: 800 }}
          >
            {t("common.cancel")}
          </Button>
          <Button
            onClick={handleAddSubmit}
            variant="contained"
            disabled={isAdding}
            sx={{ ...btnPrimarySx, px: 3 }}
          >
            {isAdding ? t("users.adding") : t("users.addUser")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

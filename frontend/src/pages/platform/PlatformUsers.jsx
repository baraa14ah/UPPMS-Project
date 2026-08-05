import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import toast from "react-hot-toast";
import ConfirmDialog from "../../components/shared/ConfirmDialog";
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
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Alert,
  IconButton,
  Tooltip,
  alpha,
} from "@mui/material";
import PersonAddAltRoundedIcon from "@mui/icons-material/PersonAddAltRounded";
import AdminPanelSettingsRoundedIcon from "@mui/icons-material/AdminPanelSettingsRounded";
import SupervisorAccountRoundedIcon from "@mui/icons-material/SupervisorAccountRounded";
import SchoolRoundedIcon from "@mui/icons-material/SchoolRounded";
import ShieldRoundedIcon from "@mui/icons-material/ShieldRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import HourglassBottomRoundedIcon from "@mui/icons-material/HourglassBottomRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import CancelRoundedIcon from "@mui/icons-material/CancelRounded";
import ListToolbar from "../../components/shared/ListToolbar";

const USER_ROLE_STYLES = {
  admin: {
    color: "#7C3AED",
    Icon: AdminPanelSettingsRoundedIcon,
    labelKey: "platformUsers.universityAdmin",
  },
  supervisor: {
    color: "#3B82F6",
    Icon: SupervisorAccountRoundedIcon,
    labelKey: "users.roleSupervisor",
  },
  student: {
    color: "#14B8A6",
    Icon: SchoolRoundedIcon,
    labelKey: "users.roleStudent",
  },
  super_admin: {
    color: "#0F172A",
    Icon: ShieldRoundedIcon,
    labelKey: "roles.super_admin",
  },
};

const USER_STATUS_STYLES = {
  active: {
    color: "#10B981",
    Icon: CheckCircleRoundedIcon,
    labelKey: "users.statusActive",
  },
  pending: {
    color: "#F59E0B",
    Icon: HourglassBottomRoundedIcon,
    labelKey: "users.statusPending",
  },
  rejected: {
    color: "#EF4444",
    Icon: CancelRoundedIcon,
    labelKey: "users.statusRejected",
  },
};

/** Platform admin page for managing users across universities. */
export default function PlatformUsers() {
  const { t } = useLanguage();
  const { user: authUser, authHeaders, apiFetch, API_BASE_URL } = useAuth();
  const currentUserId = Number(authUser?.user?.id ?? authUser?.id ?? 0);

  const [users, setUsers] = useState([]);
  const [universities, setUniversities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [universityFilter, setUniversityFilter] = useState("");

  const [openAdd, setOpenAdd] = useState(false);
  const [addData, setAddData] = useState({
    name: "",
    email: "",
    password: "",
    role: "admin",
    university_id: "",
    university_ids: [],
    student_number: "",
    status: "active",
  });
  const [saving, setSaving] = useState(false);

  const [editData, setEditData] = useState(null);

  const [dialogConfig, setDialogConfig] = useState({
    isOpen: false,
    title: "",
    content: "",
    onConfirm: null,
  });
  const [dialogLoading, setDialogLoading] = useState(false);
  /** Closes the confirmation dialog. */
  const closeDialog = () =>
    setDialogConfig((p) => ({ ...p, isOpen: false }));

  /** Loads universities for filter and form dropdowns. */
  const fetchUniversities = async () => {
    const { res, data } = await apiFetch(`${API_BASE_URL}/admin/universities`, {
      headers: authHeaders(),
    });
    if (res.ok) setUniversities(data?.universities || []);
  };

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  /** Fetches users with current search and filter params. */
  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError("");
      const params = new URLSearchParams();
      if (searchDebounced.trim()) params.set("search", searchDebounced.trim());
      if (statusFilter) params.set("status", statusFilter);
      if (roleFilter) params.set("role", roleFilter);
      if (universityFilter) params.set("university_id", universityFilter);
      const qs = params.toString();
      const { res, data } = await apiFetch(
        `${API_BASE_URL}/admin/users${qs ? `?${qs}` : ""}`,
        { headers: authHeaders() },
      );
      if (!res.ok) throw new Error(data?.message || t("platformUsers.loadError"));
      setUsers(data?.users || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUniversities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchDebounced, statusFilter, roleFilter, universityFilter]);

  /** Creates a new platform user from the add dialog. */
  const handleCreate = async () => {
    if (!addData.name || !addData.email || !addData.university_id) {
      return toast.error(t("platformUsers.requiredFields"));
    }
    setSaving(true);
    try {
      const payload = {
        name: addData.name,
        email: addData.email,
        password: addData.password,
        role: addData.role,
        status: addData.status,
        university_id: Number(addData.university_id),
      };
      if (addData.role === "supervisor" && addData.university_ids?.length) {
        payload.university_ids = addData.university_ids.map(Number);
        payload.university_id = Number(addData.university_ids[0]);
      }
      if (addData.role === "student") {
        payload.student_number = addData.student_number?.trim();
      }

      const { res, data } = await apiFetch(`${API_BASE_URL}/admin/users`, {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(data?.message || t("platformUsers.createError"));
      toast.success(
        addData.role === "admin"
          ? t("platformUsers.adminCreated")
          : t("platformUsers.userCreated"),
      );
      setOpenAdd(false);
      setAddData({
        name: "",
        email: "",
        password: "",
        role: "admin",
        university_id: "",
        university_ids: [],
        student_number: "",
        status: "active",
      });
      fetchUsers();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  /** Saves edits to an existing platform user. */
  const handleSaveEdit = async () => {
    if (!editData) return;
    setSaving(true);
    try {
      const body = {
        name: editData.name,
        email: editData.email,
        role: editData.role,
        status: editData.status,
        university_id: Number(editData.university_id),
      };
      if (editData.role === "supervisor" && editData.university_ids?.length) {
        body.university_ids = editData.university_ids.map(Number);
        body.university_id = Number(editData.university_ids[0]);
      }
      if (editData.role === "student") {
        body.student_number = editData.student_number;
      }
      if (editData.password?.trim()) body.password = editData.password;

      const { res, data } = await apiFetch(
        `${API_BASE_URL}/admin/users/${editData.id}`,
        {
          method: "PUT",
          headers: authHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify(body),
        },
      );
      if (!res.ok) throw new Error(data?.message || t("platformUsers.updateError"));
      toast.success(t("platformUsers.updated"));
      setEditData(null);
      fetchUsers();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  /** Returns whether the current admin may delete the given user. */
  const canDeleteUser = (user) => {
    const roleName = String(user?.role?.name ?? "").toLowerCase();
    if (roleName === "super_admin") return false;
    if (currentUserId && Number(user?.id) === currentUserId) return false;
    return true;
  };

  /** Returns the localized reason deletion is blocked, if any. */
  const deleteBlockReason = (user) => {
    const roleName = String(user?.role?.name ?? "").toLowerCase();
    if (roleName === "super_admin") return t("platformUsers.cannotDeleteSuperAdmin");
    if (currentUserId && Number(user?.id) === currentUserId) return t("platformUsers.cannotDeleteSelf");
    return "";
  };

  /** Opens a confirm dialog and deletes the user on approval. */
  const handleDelete = (user) => {
    if (!canDeleteUser(user)) {
      return toast.error(deleteBlockReason(user));
    }

    setDialogConfig({
      isOpen: true,
      title: t("platformUsers.deleteTitle"),
      content: t("platformUsers.deleteContent", {
        name: user.name,
        email: user.email,
      }),
      onConfirm: async () => {
        try {
          setDialogLoading(true);
          const { res, data } = await apiFetch(
            `${API_BASE_URL}/admin/users/${user.id}`,
            { method: "DELETE", headers: authHeaders() },
          );
          if (!res.ok) throw new Error(data?.message || t("platformUsers.deleteError"));
          toast.success(t("platformUsers.deleted"));
          fetchUsers();
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

  /** Renders a styled chip from a key and style map. */
  const renderStyledChip = (key, stylesMap, fallback) => {
    const style = stylesMap[key];
    const label = style ? t(style.labelKey) : fallback || key || "—";

    if (!style) {
      return (
        <Chip
          size="small"
          variant="outlined"
          label={label}
          sx={{ fontWeight: 700 }}
        />
      );
    }

    const ChipIcon = style.Icon;
    return (
      <Chip
        size="small"
        icon={<ChipIcon sx={{ fontSize: "15px !important" }} />}
        label={label}
        sx={{
          fontWeight: 800,
          bgcolor: alpha(style.color, 0.12),
          color: style.color,
          border: "1px solid",
          borderColor: alpha(style.color, 0.32),
          "& .MuiChip-icon": { color: style.color },
        }}
      />
    );
  };

  /** Renders a role chip for a user row. */
  const renderRoleChip = (roleName) => {
    const key = String(roleName || "").toLowerCase();
    return renderStyledChip(key, USER_ROLE_STYLES, t(`roles.${key}`, roleName));
  };

  /** Renders a status chip for a user row. */
  const renderStatusChip = (status) => {
    const key = String(status || "pending").toLowerCase();
    return renderStyledChip(key, USER_STATUS_STYLES, status);
  };

  const activeUniversities = useMemo(
    () => universities.filter((u) => u.is_active !== false),
    [universities],
  );

  /** Formats university names for display in the users table. */
  const formatUniversities = (u) => {
    if (u.role?.name === "supervisor" && u.supervisor_universities?.length) {
      return u.supervisor_universities.map((uni) => uni.name).join("، ");
    }
    return u.university?.name || "—";
  };

  return (
    <Box>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 900 }}>
            {t("platformUsers.title")}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t("platformUsers.subtitle")}
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<PersonAddAltRoundedIcon />}
          onClick={() => setOpenAdd(true)}
          sx={{ fontWeight: 800 }}
        >
          {t("platformUsers.addUser")}
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <ListToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={t("platformUsers.searchPlaceholder")}
        onRefresh={fetchUsers}
        filters={[
          {
            key: "status",
            label: t("users.status"),
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { value: "active", label: t("users.statusActive") },
              { value: "pending", label: t("users.statusPending") },
              { value: "rejected", label: t("users.statusRejected") },
            ],
          },
          {
            key: "role",
            label: t("users.role"),
            value: roleFilter,
            onChange: setRoleFilter,
            options: [
              { value: "admin", label: t("users.roleAdmin") },
              { value: "supervisor", label: t("users.roleSupervisor") },
              { value: "student", label: t("users.roleStudent") },
            ],
          },
          {
            key: "university",
            label: t("common.university"),
            value: universityFilter,
            onChange: setUniversityFilter,
            options: universities.map((u) => ({
              value: String(u.id),
              label: u.name,
            })),
          },
        ]}
      />

      <Paper sx={{ borderRadius: 3, overflow: "hidden" }}>
        {loading ? (
          <Box sx={{ p: 4, textAlign: "center" }}>
            <CircularProgress />
            <Typography sx={{ mt: 2, fontWeight: 700, color: "text.secondary" }}>
              {t("common.loading")}
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>{t("platformUsers.colName")}</TableCell>
                  <TableCell>{t("platformUsers.colStudentNumber")}</TableCell>
                  <TableCell>{t("platformUsers.colEmail")}</TableCell>
                  <TableCell>{t("platformUsers.colRole")}</TableCell>
                  <TableCell>{t("platformUsers.colUniversity")}</TableCell>
                  <TableCell>{t("platformUsers.colStatus")}</TableCell>
                  <TableCell align="right">{t("platformUsers.colActions")}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>{u.name}</TableCell>
                    <TableCell>{u.student_number || "—"}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>{renderRoleChip(u.role?.name)}</TableCell>
                    <TableCell>{formatUniversities(u)}</TableCell>
                    <TableCell>{renderStatusChip(u.status)}</TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                        <Tooltip title={t("common.edit")}>
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() =>
                              setEditData({
                                id: u.id,
                                name: u.name,
                                email: u.email,
                                role: u.role?.name || "student",
                                status: u.status,
                                university_id: u.university_id,
                                university_ids: (u.supervisor_universities || []).map(
                                  (uni) => uni.id,
                                ),
                                student_number: u.student_number || "",
                                password: "",
                              })
                            }
                          >
                            <EditRoundedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip
                          title={
                            canDeleteUser(u)
                              ? t("common.delete")
                              : deleteBlockReason(u)
                          }
                        >
                          <span>
                            <IconButton
                              size="small"
                              color="error"
                              disabled={!canDeleteUser(u)}
                              onClick={() => handleDelete(u)}
                            >
                              <DeleteOutlineRoundedIcon fontSize="small" />
                            </IconButton>
                          </span>
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

      <Dialog open={openAdd} onClose={() => setOpenAdd(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 900 }}>
          {t("platformUsers.addTitle")}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label={t("users.name")}
              fullWidth
              value={addData.name}
              onChange={(e) =>
                setAddData((p) => ({ ...p, name: e.target.value }))
              }
            />
            <TextField
              label={t("users.email")}
              fullWidth
              value={addData.email}
              onChange={(e) =>
                setAddData((p) => ({ ...p, email: e.target.value }))
              }
            />
            <TextField
              label={t("auth.password")}
              type="password"
              fullWidth
              value={addData.password}
              onChange={(e) =>
                setAddData((p) => ({ ...p, password: e.target.value }))
              }
            />
            <TextField
              select
              label={t("users.role")}
              fullWidth
              value={addData.role}
              onChange={(e) =>
                setAddData((p) => ({ ...p, role: e.target.value }))
              }
            >
              <MenuItem value="admin">{t("users.roleAdmin")}</MenuItem>
              <MenuItem value="supervisor">{t("users.roleSupervisor")}</MenuItem>
              <MenuItem value="student">{t("users.roleStudent")}</MenuItem>
            </TextField>
            {addData.role === "supervisor" ? (
              <TextField
                select
                label={t("platformUsers.universitiesMulti")}
                fullWidth
                SelectProps={{ multiple: true }}
                value={addData.university_ids}
                onChange={(e) => {
                  const ids = e.target.value;
                  setAddData((p) => ({
                    ...p,
                    university_ids: ids,
                    university_id: ids[0] || "",
                  }));
                }}
              >
                {activeUniversities.map((uni) => (
                  <MenuItem key={uni.id} value={uni.id}>
                    {uni.name}
                  </MenuItem>
                ))}
              </TextField>
            ) : (
              <TextField
                select
                label={t("common.university")}
                fullWidth
                value={addData.university_id}
                onChange={(e) =>
                  setAddData((p) => ({ ...p, university_id: e.target.value }))
                }
              >
                <MenuItem value="" disabled>
                  {t("platformUsers.chooseUniversity")}
                </MenuItem>
                {activeUniversities.map((uni) => (
                  <MenuItem key={uni.id} value={uni.id}>
                    {uni.name}
                  </MenuItem>
                ))}
              </TextField>
            )}
            {addData.role === "student" && (
              <TextField
                label={t("users.studentNumber")}
                fullWidth
                required
                value={addData.student_number}
                onChange={(e) =>
                  setAddData((p) => ({ ...p, student_number: e.target.value }))
                }
              />
            )}
            <TextField
              select
              label={t("users.status")}
              fullWidth
              value={addData.status}
              onChange={(e) =>
                setAddData((p) => ({ ...p, status: e.target.value }))
              }
            >
              <MenuItem value="active">{t("users.statusActive")}</MenuItem>
              <MenuItem value="pending">{t("users.statusPending")}</MenuItem>
              <MenuItem value="rejected">{t("users.statusRejected")}</MenuItem>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAdd(false)}>{t("common.cancel")}</Button>
          <Button variant="contained" onClick={handleCreate} disabled={saving}>
            {saving ? t("common.executing") : t("common.add")}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(editData)}
        onClose={() => setEditData(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ fontWeight: 900 }}>{t("platformUsers.editTitle")}</DialogTitle>
        <DialogContent>
          {editData && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label={t("users.name")}
                fullWidth
                value={editData.name}
                onChange={(e) =>
                  setEditData((p) => ({ ...p, name: e.target.value }))
                }
              />
              <TextField
                label={t("users.email")}
                fullWidth
                value={editData.email}
                onChange={(e) =>
                  setEditData((p) => ({ ...p, email: e.target.value }))
                }
              />
              <TextField
                label={t("platformUsers.newPasswordOptional")}
                type="password"
                fullWidth
                value={editData.password}
                onChange={(e) =>
                  setEditData((p) => ({ ...p, password: e.target.value }))
                }
              />
              <TextField
                select
                label={t("users.role")}
                fullWidth
                value={editData.role}
                onChange={(e) =>
                  setEditData((p) => ({ ...p, role: e.target.value }))
                }
              >
                <MenuItem value="admin">{t("users.roleAdmin")}</MenuItem>
                <MenuItem value="supervisor">{t("users.roleSupervisor")}</MenuItem>
                <MenuItem value="student">{t("users.roleStudent")}</MenuItem>
              </TextField>
              {editData.role === "supervisor" ? (
                <TextField
                  select
                  label={t("platformUsers.universitiesMulti")}
                  fullWidth
                  SelectProps={{ multiple: true }}
                  value={editData.university_ids || []}
                  onChange={(e) => {
                    const ids = e.target.value;
                    setEditData((p) => ({
                      ...p,
                      university_ids: ids,
                      university_id: ids[0] || p.university_id,
                    }));
                  }}
                >
                  {universities.map((uni) => (
                    <MenuItem key={uni.id} value={uni.id}>
                      {uni.name}
                    </MenuItem>
                  ))}
                </TextField>
              ) : (
                <TextField
                  select
                  label={t("common.university")}
                  fullWidth
                  value={editData.university_id}
                  onChange={(e) =>
                    setEditData((p) => ({
                      ...p,
                      university_id: e.target.value,
                    }))
                  }
                >
                  {universities.map((uni) => (
                    <MenuItem key={uni.id} value={uni.id}>
                      {uni.name}
                    </MenuItem>
                  ))}
                </TextField>
              )}
              {editData.role === "student" && (
                <TextField
                  label={t("users.studentNumber")}
                  fullWidth
                  value={editData.student_number || ""}
                  onChange={(e) =>
                    setEditData((p) => ({
                      ...p,
                      student_number: e.target.value,
                    }))
                  }
                />
              )}
              <TextField
                select
                label={t("users.status")}
                fullWidth
                value={editData.status}
                onChange={(e) =>
                  setEditData((p) => ({ ...p, status: e.target.value }))
                }
              >
                <MenuItem value="active">{t("users.statusActive")}</MenuItem>
                <MenuItem value="pending">{t("users.statusPending")}</MenuItem>
                <MenuItem value="rejected">{t("users.statusRejected")}</MenuItem>
              </TextField>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditData(null)}>{t("common.cancel")}</Button>
          <Button variant="contained" onClick={handleSaveEdit} disabled={saving}>
            {saving ? t("common.executing") : t("common.save")}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={dialogConfig.isOpen}
        title={dialogConfig.title}
        content={dialogConfig.content}
        loading={dialogLoading}
        onClose={closeDialog}
        onConfirm={dialogConfig.onConfirm}
        confirmColor="error"
      />
    </Box>
  );
}

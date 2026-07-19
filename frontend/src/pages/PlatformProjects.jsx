import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import toast from "react-hot-toast";
import ConfirmDialog from "../components/ConfirmDialog";
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
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Tooltip,
  alpha,
} from "@mui/material";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import HourglassBottomRoundedIcon from "@mui/icons-material/HourglassBottomRounded";
import AutorenewRoundedIcon from "@mui/icons-material/AutorenewRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ListToolbar from "../components/ListToolbar";

const PROJECT_STATUS_STYLES = {
  pending: {
    color: "#F59E0B",
    Icon: HourglassBottomRoundedIcon,
  },
  in_progress: {
    color: "#3B82F6",
    Icon: AutorenewRoundedIcon,
  },
  completed: {
    color: "#10B981",
    Icon: CheckCircleRoundedIcon,
  },
};

/** Platform admin page for browsing and managing all projects. */
export default function PlatformProjects() {
  const { authHeaders, apiFetch, API_BASE_URL } = useAuth();
  const { t } = useLanguage();

  const [projects, setProjects] = useState([]);
  const [universities, setUniversities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [universityFilter, setUniversityFilter] = useState("");
  const [editData, setEditData] = useState(null);
  const [saving, setSaving] = useState(false);

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

  useEffect(() => {
    const timer = setTimeout(() => setSearchDebounced(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const statusLabel = useMemo(
    () => ({
      pending: t("dashboard.pending"),
      in_progress: t("dashboard.inProgress"),
      completed: t("dashboard.completed"),
    }),
    [t],
  );

  /** Renders a styled project status chip. */
  const renderStatusChip = (status) => {
    const key = String(status || "pending").toLowerCase();
    const style = PROJECT_STATUS_STYLES[key];
    const label = statusLabel[key] || status || "—";

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

    const StatusIcon = style.Icon;
    return (
      <Chip
        size="small"
        icon={<StatusIcon sx={{ fontSize: "15px !important" }} />}
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

  const statusOptions = [
    { value: "pending", label: statusLabel.pending },
    { value: "in_progress", label: statusLabel.in_progress },
    { value: "completed", label: statusLabel.completed },
  ];

  /** Loads universities for the filter dropdown. */
  const fetchUniversities = async () => {
    const { res, data } = await apiFetch(`${API_BASE_URL}/admin/universities`, {
      headers: authHeaders(),
    });
    if (res.ok) setUniversities(data?.universities || []);
  };

  /** Fetches projects with current search and filter params. */
  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError("");
      const params = new URLSearchParams();
      if (searchDebounced.trim()) params.set("search", searchDebounced.trim());
      if (statusFilter) params.set("status", statusFilter);
      if (universityFilter) params.set("university_id", universityFilter);
      const qs = params.toString();
      const { res, data } = await apiFetch(
        `${API_BASE_URL}/admin/projects${qs ? `?${qs}` : ""}`,
        { headers: authHeaders() },
      );
      if (!res.ok) throw new Error(data?.message || t("platformProjects.loadError"));
      setProjects(data?.projects || []);
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
    fetchProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchDebounced, statusFilter, universityFilter]);

  /** Saves project edits from the edit dialog. */
  const handleSave = async () => {
    if (!editData) return;
    setSaving(true);
    try {
      const { res, data } = await apiFetch(
        `${API_BASE_URL}/admin/projects/${editData.id}`,
        {
          method: "PUT",
          headers: authHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({
            title: editData.title,
            description: editData.description,
            status: editData.status,
          }),
        },
      );
      if (!res.ok) throw new Error(data?.message || t("platformProjects.updateError"));
      toast.success(t("platformProjects.updated"));
      setEditData(null);
      fetchProjects();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  /** Opens a confirm dialog and deletes the project on approval. */
  const handleDelete = (project) => {
    setDialogConfig({
      isOpen: true,
      title: t("platformProjects.deleteTitle"),
      content: t("platformProjects.deleteContent", { title: project.title }),
      onConfirm: async () => {
        try {
          setDialogLoading(true);
          const { res, data } = await apiFetch(
            `${API_BASE_URL}/admin/projects/${project.id}`,
            { method: "DELETE", headers: authHeaders() },
          );
          if (!res.ok) throw new Error(data?.message || t("platformProjects.deleteError"));
          toast.success(t("platformProjects.deleted"));
          fetchProjects();
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
            {t("platformProjects.title")}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t("platformProjects.subtitle")}
          </Typography>
        </Box>
      </Stack>

      <ListToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={t("platformProjects.searchPlaceholder")}
        onRefresh={fetchProjects}
        filters={[
          {
            key: "status",
            label: t("projects.statusFilter"),
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { value: "pending", label: t("dashboard.pending") },
              { value: "in_progress", label: t("dashboard.inProgress") },
              { value: "completed", label: t("dashboard.completed") },
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

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

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
                  <TableCell>{t("platformProjects.colTitle")}</TableCell>
                  <TableCell>{t("platformProjects.colUniversity")}</TableCell>
                  <TableCell>{t("platformProjects.colPhase")}</TableCell>
                  <TableCell>{t("platformProjects.colOwner")}</TableCell>
                  <TableCell>{t("platformProjects.colSupervisor")}</TableCell>
                  <TableCell>{t("platformProjects.colStatus")}</TableCell>
                  <TableCell align="right">{t("platformProjects.colActions")}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {projects.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <Button
                        component={Link}
                        to={`/dashboard/projects/${p.id}`}
                        size="small"
                      >
                        {p.title}
                      </Button>
                    </TableCell>
                    <TableCell>{p.university?.name || "—"}</TableCell>
                    <TableCell>
                      {p.phase_name ? (
                        <Chip size="small" label={p.phase_name} color="secondary" variant="outlined" sx={{ fontWeight: 800 }} />
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>{p.user?.name || "—"}</TableCell>
                    <TableCell>{p.supervisor?.name || "—"}</TableCell>
                    <TableCell>{renderStatusChip(p.status)}</TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                        <Tooltip title={t("common.edit")}>
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() =>
                              setEditData({
                                id: p.id,
                                title: p.title,
                                description: p.description || "",
                                status: p.status || "pending",
                              })
                            }
                          >
                            <EditRoundedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={t("common.delete")}>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDelete(p)}
                          >
                            <DeleteOutlineRoundedIcon fontSize="small" />
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

      <Dialog
        open={Boolean(editData)}
        onClose={() => setEditData(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ fontWeight: 900 }}>{t("platformProjects.editTitle")}</DialogTitle>
        <DialogContent>
          {editData && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label={t("projects.titleLabel")}
                fullWidth
                value={editData.title}
                onChange={(e) =>
                  setEditData((prev) => ({ ...prev, title: e.target.value }))
                }
              />
              <TextField
                label={t("projects.descLabel")}
                fullWidth
                multiline
                minRows={2}
                value={editData.description}
                onChange={(e) =>
                  setEditData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
              />
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, mb: 1, display: "block" }}>
                  {t("projects.statusFilter")}
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {statusOptions.map((opt) => {
                    const style = PROJECT_STATUS_STYLES[opt.value];
                    const StatusIcon = style.Icon;
                    const selected = editData.status === opt.value;
                    return (
                      <Chip
                        key={opt.value}
                        clickable
                        onClick={() =>
                          setEditData((prev) => ({ ...prev, status: opt.value }))
                        }
                        icon={<StatusIcon sx={{ fontSize: "15px !important" }} />}
                        label={opt.label}
                        variant={selected ? "filled" : "outlined"}
                        sx={{
                          fontWeight: 800,
                          bgcolor: selected ? alpha(style.color, 0.16) : "transparent",
                          color: style.color,
                          borderColor: alpha(style.color, selected ? 0.45 : 0.28),
                          "& .MuiChip-icon": { color: style.color },
                        }}
                      />
                    );
                  })}
                </Stack>
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditData(null)}>{t("common.cancel")}</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
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

import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import toast from "react-hot-toast";
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Stack,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Switch,
  FormControlLabel,
  IconButton,
  Tooltip,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import SchoolRoundedIcon from "@mui/icons-material/SchoolRounded";

/** Admin page for listing and managing universities. */
export default function Universities() {
  const { authHeaders, apiFetch, API_BASE_URL } = useAuth();
  const { t, lang } = useLanguage();
  const dateLocale = lang === "ar" ? "ar-EG" : "en-US";

  const [universities, setUniversities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUni, setEditingUni] = useState(null);
  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formActive, setFormActive] = useState(true);
  const [saving, setSaving] = useState(false);

  /** Fetches all universities for the admin table. */
  const fetchUniversities = async () => {
    try {
      setLoading(true);
      setError("");
      const { res, data } = await apiFetch(
        `${API_BASE_URL}/admin/universities`,
        {
          headers: authHeaders(),
        },
      );
      if (res.ok && Array.isArray(data?.universities)) {
        setUniversities(data.universities);
      } else {
        setError(data?.message || t("universitiesPage.loadError"));
      }
    } catch {
      setError(t("common.serverError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUniversities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Opens the dialog in create-university mode. */
  const openAddDialog = () => {
    setEditingUni(null);
    setFormName("");
    setFormSlug("");
    setFormActive(true);
    setDialogOpen(true);
  };

  /** Opens the dialog pre-filled for editing a university. */
  const openEditDialog = (uni) => {
    setEditingUni(uni);
    setFormName(uni.name || "");
    setFormSlug(uni.slug || "");
    setFormActive(uni.is_active !== false);
    setDialogOpen(true);
  };

  /** Closes the university form dialog and resets edit state. */
  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingUni(null);
  };

  /** Creates or updates a university via the admin API. */
  const handleSave = async () => {
    if (!formName.trim()) {
      toast.error(t("universitiesPage.nameRequired"));
      return;
    }

    setSaving(true);
    try {
      const isEdit = !!editingUni;
      const url = isEdit
        ? `${API_BASE_URL}/admin/universities/${editingUni.id}`
        : `${API_BASE_URL}/admin/universities`;
      const method = isEdit ? "PUT" : "POST";

      const body = { name: formName.trim() };
      if (formSlug.trim()) body.slug = formSlug.trim();
      if (isEdit) body.is_active = formActive;

      const { res, data } = await apiFetch(url, {
        method,
        headers: {
          ...authHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const msg = data?.errors
          ? Object.values(data.errors).flat().join(" | ")
          : data?.message || t("universitiesPage.saveError");
        toast.error(msg);
        setSaving(false);
        return;
      }

      toast.success(
        isEdit ? t("universitiesPage.updated") : t("universitiesPage.created"),
      );
      handleCloseDialog();
      fetchUniversities();
    } catch {
      toast.error(t("common.serverError"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1200, mx: "auto" }}>
      <Paper
        elevation={0}
        sx={{
          p: 3,
          borderRadius: 3,
          border: "1px solid #EAEAEA",
          mb: 3,
        }}
      >
        <Stack
          direction={{ xs: "column", md: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", md: "center" }}
          spacing={2}
        >
          <Stack direction="row" spacing={1.5} alignItems="center">
            <SchoolRoundedIcon color="primary" fontSize="large" />
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 900 }}>
                {t("universitiesPage.title")}
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                {t("universitiesPage.subtitle")}
              </Typography>
            </Box>
          </Stack>
          <Button
            variant="contained"
            startIcon={<AddRoundedIcon />}
            onClick={openAddDialog}
            sx={{ borderRadius: 2, fontWeight: 800, px: 3 }}
          >
            {t("universitiesPage.addUniversity")}
          </Button>
        </Stack>
      </Paper>

      {loading ? (
        <Stack direction="row" spacing={2} alignItems="center" sx={{ p: 3 }}>
          <CircularProgress size={24} />
          <Typography sx={{ fontWeight: 700 }} color="text.secondary">
            {t("universitiesPage.loading")}
          </Typography>
        </Stack>
      ) : error ? (
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          {error}
        </Alert>
      ) : (
        <Paper
          elevation={0}
          sx={{
            borderRadius: 3,
            border: "1px solid #EAEAEA",
            overflow: "hidden",
          }}
        >
          <TableContainer>
            <Table>
              <TableHead sx={{ bgcolor: "rgba(0,0,0,0.02)" }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800 }}>
                    {t("universitiesPage.colIndex")}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>
                    {t("universitiesPage.colName")}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>
                    {t("universitiesPage.colStatus")}
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 800 }}>
                    {t("universitiesPage.colUsers")}
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 800 }}>
                    {t("universitiesPage.colProjects")}
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 800 }}>
                    {t("universitiesPage.colTracks")}
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 800 }}>
                    {t("universitiesPage.colSchedules")}
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 800 }}>
                    {t("universitiesPage.colCommittees")}
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 800 }}>
                    {t("universitiesPage.colRooms")}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 800, textAlign: "left" }}>
                    {t("universitiesPage.colActions")}
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {universities.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">
                        {t("universitiesPage.empty")}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  universities.map((uni, idx) => (
                    <TableRow key={uni.id} hover>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell>
                        <Typography sx={{ fontWeight: 800 }}>{uni.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {uni.slug || "—"}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={
                            uni.is_active
                              ? t("universitiesPage.statusActive")
                              : t("universitiesPage.statusInactive")
                          }
                          color={uni.is_active ? "success" : "default"}
                        />
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 800 }}>
                        {uni.users_total ?? 0}
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 800 }}>
                        {uni.projects ?? 0}
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 800 }}>
                        {uni.active_tracks ?? uni.tracks ?? 0}
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 800 }}>
                        {uni.active_schedules ?? 0}
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 800 }}>
                        {uni.committees ?? 0}
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 800 }}>
                        {uni.defense_rooms ?? 0}
                      </TableCell>
                      <TableCell sx={{ textAlign: "left" }}>
                        <Tooltip title={t("common.edit")}>
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => openEditDialog(uni)}
                          >
                            <EditRoundedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>
          {editingUni
            ? t("universitiesPage.editUniversity")
            : t("universitiesPage.addNewUniversity")}
        </DialogTitle>
        <DialogContent sx={{ pt: "16px !important" }}>
          <TextField
            label={t("universitiesPage.nameLabel")}
            fullWidth
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            sx={{ mb: 2, "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
          />
          <TextField
            label={t("universitiesPage.slugOptional")}
            fullWidth
            value={formSlug}
            onChange={(e) => setFormSlug(e.target.value)}
            sx={{ mb: 2, "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
          />
          {editingUni && (
            <FormControlLabel
              control={
                <Switch
                  checked={formActive}
                  onChange={(e) => setFormActive(e.target.checked)}
                />
              }
              label={t("universitiesPage.activeLabel")}
            />
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={handleCloseDialog}
            sx={{ fontWeight: 700 }}
            disabled={saving}
          >
            {t("common.cancel")}
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving || !formName.trim()}
            sx={{ borderRadius: 2, fontWeight: 800, px: 3 }}
          >
            {saving ? (
              <CircularProgress size={20} sx={{ color: "white" }} />
            ) : editingUni ? (
              t("universitiesPage.updateBtn")
            ) : (
              t("universitiesPage.createBtn")
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

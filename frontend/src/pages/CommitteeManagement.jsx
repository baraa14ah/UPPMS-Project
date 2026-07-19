import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Grid,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import GroupsIcon from "@mui/icons-material/Groups";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import PageHeader from "../components/PageHeader";
import CommitteeCard from "../components/CommitteeCard";
import CommitteeFormDialog from "../components/CommitteeFormDialog";
import ConfirmDialog from "../components/ConfirmDialog";
import DefenseWorkflowGuide from "../components/defense/DefenseWorkflowGuide";
import AdminCardGridSkeleton from "../components/loading/AdminCardGridSkeleton";
import { sectionPaperSx, btnPrimarySx, pageContainerSx } from "../styles/dashboardUi";

const STATUS_TABS = [
  { value: "active", labelKey: "committees.active" },
  { value: "inactive", labelKey: "committees.inactive" },
  { value: "all", labelKey: "common.all" },
];

/** Admin page for creating and managing defense committees. */
export default function CommitteeManagement() {
  const { authHeaders, apiFetch, API_BASE_URL } = useAuth();
  const { t } = useLanguage();

  const jsonHeaders = useMemo(
    () => authHeaders({ "Content-Type": "application/json" }),
    [authHeaders],
  );

  const [committees, setCommittees] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("active");
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCommittee, setSelectedCommittee] = useState(null);
  const [saving, setSaving] = useState(false);
  const [dialogError, setDialogError] = useState("");
  const [confirmState, setConfirmState] = useState(null);
  const [fetchError, setFetchError] = useState("");

  const fetchCommittees = useCallback(async () => {
    setLoading(true);
    setFetchError("");
    try {
      const params = new URLSearchParams({ status, per_page: "50" });
      if (search.trim()) params.set("search", search.trim());

      const { res, data } = await apiFetch(`${API_BASE_URL}/committees?${params}`, {
        headers: authHeaders(),
      });
      if (!res.ok) {
        const message = data?.message || t("common.error");
        setFetchError(message);
        return;
      }
      setCommittees(data?.data?.committees || []);
    } catch {
      setFetchError(t("common.serverError"));
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL, apiFetch, authHeaders, search, status, t]);

  const fetchSupervisors = useCallback(async (excludeCommitteeId = null) => {
    try {
      const params = excludeCommitteeId ? `?exclude_committee_id=${excludeCommitteeId}` : "";
      const { res, data } = await apiFetch(`${API_BASE_URL}/supervisors/for-committee${params}`, {
        headers: authHeaders(),
      });
      if (res.ok) {
        setSupervisors(data?.data || []);
      }
    } catch {
      // non-blocking
    }
  }, [API_BASE_URL, apiFetch, authHeaders]);

  useEffect(() => {
    fetchCommittees();
  }, [fetchCommittees]);

  useEffect(() => {
    fetchSupervisors();
  }, [fetchSupervisors]);

  const openCreate = () => {
    setSelectedCommittee(null);
    setDialogError("");
    setDialogOpen(true);
    fetchSupervisors();
  };

  const openEdit = async (committee) => {
    try {
      const { res, data } = await apiFetch(`${API_BASE_URL}/committees/${committee.id}`, {
        headers: authHeaders(),
      });
      if (!res.ok) {
        toast.error(data?.message || t("common.error"));
        return;
      }
      setSelectedCommittee(data?.data || committee);
      setDialogError("");
      setDialogOpen(true);
      fetchSupervisors(committee.id);
    } catch {
      toast.error(t("common.serverError"));
    }
  };

  const handleSave = async (formData) => {
    setSaving(true);
    setDialogError("");
    try {
      if (selectedCommittee?.id) {
        const { res, data } = await apiFetch(`${API_BASE_URL}/committees/${selectedCommittee.id}`, {
          method: "PUT",
          headers: jsonHeaders,
          body: JSON.stringify({
            name: formData.name,
            description: formData.description,
            version: formData.version,
          }),
        });

        if (res.status === 409) {
          setDialogError(t("committees.versionConflict"));
          return;
        }
        if (!res.ok) {
          setDialogError(data?.message || t("common.error"));
          return;
        }

        try {
          await syncMemberChanges(selectedCommittee, formData.members);
        } catch (memberError) {
          setDialogError(memberError.message || t("common.error"));
          await fetchCommittees();
          return;
        }

        toast.success(t("committees.updated"));
      } else {
        const { res, data } = await apiFetch(`${API_BASE_URL}/committees`, {
          method: "POST",
          headers: jsonHeaders,
          body: JSON.stringify(formData),
        });

        if (!res.ok) {
          const message = data?.message || data?.errors?.name?.[0] || t("common.error");
          setDialogError(message);
          return;
        }
        toast.success(t("committees.created"));
      }

      setDialogOpen(false);
      setSelectedCommittee(null);
      fetchCommittees();
    } catch {
      setDialogError(t("common.serverError"));
    } finally {
      setSaving(false);
    }
  };

  const syncMemberChanges = async (original, nextMembers) => {
    const originalMembers = original.members || [];
    const nextIds = new Set(nextMembers.map((member) => member.user_id));

    for (const member of originalMembers) {
      if (!nextIds.has(member.id)) {
        const { res, data } = await apiFetch(
          `${API_BASE_URL}/committees/${original.id}/members/${member.id}`,
          {
            method: "DELETE",
            headers: jsonHeaders,
            body: JSON.stringify({ confirm_affects_defenses: true }),
          },
        );
        if (!res.ok) {
          throw new Error(
            data?.message || data?.errors?.members?.[0] || t("common.error"),
          );
        }
      }
    }

    for (const member of nextMembers) {
      const existing = originalMembers.find((item) => item.id === member.user_id);
      if (!existing) {
        const { res, data } = await apiFetch(`${API_BASE_URL}/committees/${original.id}/members`, {
          method: "POST",
          headers: jsonHeaders,
          body: JSON.stringify({
            user_id: member.user_id,
            role: member.role,
            confirm_affects_defenses: true,
          }),
        });
        if (!res.ok) {
          throw new Error(
            data?.message || data?.errors?.user_id?.[0] || t("common.error"),
          );
        }
      } else if (existing.role !== member.role) {
        const { res, data } = await apiFetch(
          `${API_BASE_URL}/committees/${original.id}/members/${member.user_id}`,
          {
            method: "PUT",
            headers: jsonHeaders,
            body: JSON.stringify({
              role: member.role,
              confirm_affects_defenses: true,
            }),
          },
        );
        if (!res.ok) {
          throw new Error(
            data?.message || data?.errors?.role?.[0] || t("common.error"),
          );
        }
      }
    }
  };

  const handleDeactivate = (committee) => {
    setConfirmState({
      title: t("committees.deactivate"),
      message: t("committees.confirmDeactivate"),
      action: async () => {
        const { res, data } = await apiFetch(
          `${API_BASE_URL}/committees/${committee.id}/deactivate`,
          { method: "POST", headers: jsonHeaders },
        );
        if (!res.ok) {
          toast.error(data?.message || t("committees.cannotDeactivate"));
          return;
        }
        toast.success(t("committees.deactivated"));
        fetchCommittees();
      },
    });
  };

  const handleReactivate = async (committee) => {
    const { res, data } = await apiFetch(
      `${API_BASE_URL}/committees/${committee.id}/reactivate`,
      { method: "POST", headers: jsonHeaders },
    );
    if (!res.ok) {
      toast.error(data?.message || t("common.error"));
      return;
    }
    toast.success(t("committees.reactivated"));
    fetchCommittees();
  };

  return (
    <Box sx={pageContainerSx}>
      <PageHeader
        title={t("committees.title")}
        subtitle={t("committees.subtitle")}
        icon={<GroupsIcon />}
        actions={
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={openCreate}
            sx={{ ...btnPrimarySx, fontWeight: 800, borderRadius: 2 }}
          >
            {t("committees.create")}
          </Button>
        }
      />

      <DefenseWorkflowGuide variant="committees" />

      <Paper elevation={0} sx={{ ...sectionPaperSx, p: { xs: 2, md: 2.5 }, mb: 3 }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          alignItems={{ xs: "stretch", md: "center" }}
          justifyContent="space-between"
        >
          <Tabs
            value={status}
            onChange={(_, value) => setStatus(value)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ minHeight: 40 }}
          >
            {STATUS_TABS.map((tab) => (
              <Tab key={tab.value} value={tab.value} label={t(tab.labelKey)} />
            ))}
          </Tabs>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: { md: 280 } }}>
            <TextField
              size="small"
              fullWidth
              placeholder={t("common.search")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") fetchCommittees();
              }}
              InputProps={{
                startAdornment: (
                  <SearchRoundedIcon sx={{ mr: 1, color: "text.secondary", fontSize: 20 }} />
                ),
              }}
            />
            <Button variant="outlined" onClick={fetchCommittees} sx={{ fontWeight: 700, flexShrink: 0 }}>
              {t("common.search")}
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {fetchError ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {fetchError}
        </Alert>
      ) : null}

      {loading ? (
        <AdminCardGridSkeleton count={6} layout="grid" />
      ) : committees.length === 0 ? (
        <Alert severity="info">{t("committees.noCommittees")}</Alert>
      ) : (
        <Grid container spacing={2.5}>
          {committees.map((committee) => (
            <Grid key={committee.id} size={{ xs: 12, sm: 6, lg: 4 }}>
              <CommitteeCard
                committee={committee}
                onEdit={openEdit}
                onDeactivate={handleDeactivate}
                onReactivate={handleReactivate}
              />
            </Grid>
          ))}
        </Grid>
      )}

      <CommitteeFormDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setSelectedCommittee(null);
          setDialogError("");
        }}
        committee={selectedCommittee}
        availableSupervisors={supervisors}
        onSave={handleSave}
        saving={saving}
        error={dialogError}
      />

      <ConfirmDialog
        open={Boolean(confirmState)}
        title={confirmState?.title}
        content={confirmState?.message}
        onClose={() => setConfirmState(null)}
        onConfirm={async () => {
          await confirmState?.action?.();
          setConfirmState(null);
        }}
      />
    </Box>
  );
}

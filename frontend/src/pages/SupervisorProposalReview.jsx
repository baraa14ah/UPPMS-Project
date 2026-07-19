import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import RateReviewRoundedIcon from "@mui/icons-material/RateReviewRounded";
import InboxRoundedIcon from "@mui/icons-material/InboxRounded";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import PageHeader from "../components/PageHeader";
import ListPageSkeleton from "../components/loading/ListPageSkeleton";
import ProposalCard from "../components/ProposalCard";

/** Supervisor and admin page for reviewing, approving, rejecting, or reassigning proposals. */
export default function SupervisorProposalReview() {
  const { apiFetch, authHeaders, API_BASE_URL, user, role } = useAuth();
  const { t } = useLanguage();

  const roleName = String(user?.role?.name || role || "").toLowerCase();
  const isAdmin = roleName === "admin";
  const isSupervisor = roleName === "supervisor";

  const [proposals, setProposals] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState(null);

  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectFeedback, setRejectFeedback] = useState("");
  const [rejectingProposal, setRejectingProposal] = useState(null);

  const [reassignDialogOpen, setReassignDialogOpen] = useState(false);
  const [reassignSupervisorId, setReassignSupervisorId] = useState("");
  const [reassigningProposal, setReassigningProposal] = useState(null);

  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [approvingProposal, setApprovingProposal] = useState(null);

  const listUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (isSupervisor || isAdmin) params.set("status", "pending");
    return `${API_BASE_URL}/proposals${params.toString() ? `?${params}` : ""}`;
  }, [API_BASE_URL, isSupervisor, isAdmin]);

  const loadProposals = useCallback(async () => {
    const { res, data } = await apiFetch(listUrl, { headers: authHeaders() });
    if (!res.ok) {
      throw new Error(data?.message || t("common.serverError"));
    }
    setProposals(Array.isArray(data?.data) ? data.data : []);
  }, [apiFetch, authHeaders, listUrl, t]);

  const loadSupervisors = useCallback(async () => {
    if (!isAdmin) return;
    const { res, data } = await apiFetch(`${API_BASE_URL}/supervisors`, {
      headers: authHeaders(),
    });
    if (!res.ok) return;
    const list = data?.supervisors || data?.data || [];
    setSupervisors(Array.isArray(list) ? list : []);
  }, [apiFetch, authHeaders, API_BASE_URL, isAdmin]);

  const loadPage = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      await Promise.all([loadProposals(), loadSupervisors()]);
    } catch (err) {
      setError(err.message || t("common.serverError"));
    } finally {
      setLoading(false);
    }
  }, [loadProposals, loadSupervisors, t]);

  useEffect(() => {
    loadPage();
  }, [loadPage]);

  const handleView = async (proposal) => {
    try {
      const { res, data } = await apiFetch(`${API_BASE_URL}/proposals/${proposal.id}`, {
        headers: authHeaders(),
      });
      if (!res.ok) {
        toast.error(data?.message || t("common.error"));
        return;
      }
      setSelectedProposal(data?.data || proposal);
      setDetailsOpen(true);
    } catch {
      setSelectedProposal(proposal);
      setDetailsOpen(true);
    }
  };

  const handleApprove = async (proposal) => {
    setBusyId(proposal.id);
    try {
      const { res, data } = await apiFetch(`${API_BASE_URL}/proposals/${proposal.id}/approve`, {
        method: "POST",
        headers: authHeaders(),
      });
      if (!res.ok) {
        toast.error(data?.message || t("common.error"));
        return;
      }
      toast.success(t("proposals.approveSuccess"));
      setApproveDialogOpen(false);
      setApprovingProposal(null);
      await loadProposals();
    } catch {
      toast.error(t("common.serverError"));
    } finally {
      setBusyId(null);
    }
  };

  const openApproveDialog = (proposal) => {
    setApprovingProposal(proposal);
    setApproveDialogOpen(true);
  };

  const openRejectDialog = (proposal) => {
    setRejectingProposal(proposal);
    setRejectFeedback("");
    setRejectDialogOpen(true);
  };

  const handleReject = async () => {
    if (!rejectingProposal) return;
    setBusyId(rejectingProposal.id);
    try {
      const { res, data } = await apiFetch(
        `${API_BASE_URL}/proposals/${rejectingProposal.id}/reject`,
        {
          method: "POST",
          headers: authHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({ feedback: rejectFeedback.trim() || null }),
        },
      );
      if (!res.ok) {
        toast.error(data?.message || t("common.error"));
        return;
      }
      toast.success(t("proposals.rejectSuccess"));
      setRejectDialogOpen(false);
      setRejectingProposal(null);
      await loadProposals();
    } catch {
      toast.error(t("common.serverError"));
    } finally {
      setBusyId(null);
    }
  };

  const openReassignDialog = (proposal) => {
    setReassigningProposal(proposal);
    setReassignSupervisorId("");
    setReassignDialogOpen(true);
  };

  const handleReassign = async () => {
    if (!reassigningProposal || !reassignSupervisorId) return;
    setBusyId(reassigningProposal.id);
    try {
      const { res, data } = await apiFetch(
        `${API_BASE_URL}/proposals/${reassigningProposal.id}/reassign`,
        {
          method: "POST",
          headers: authHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({ new_supervisor_id: Number(reassignSupervisorId) }),
        },
      );
      if (!res.ok) {
        toast.error(data?.message || t("common.error"));
        return;
      }
      toast.success(t("proposals.reassignSuccess"));
      setReassignDialogOpen(false);
      setReassigningProposal(null);
      await loadProposals();
    } catch {
      toast.error(t("common.serverError"));
    } finally {
      setBusyId(null);
    }
  };

  const visibleProposals = proposals;

  if (loading) {
    return <ListPageSkeleton rows={5} />;
  }

  return (
    <Box>
      <PageHeader
        title={isAdmin ? t("proposals.reviewProposals") : t("proposals.pendingProposals")}
        subtitle={t("proposals.reviewSubtitle")}
        icon={<RateReviewRoundedIcon sx={{ fontSize: 28 }} />}
        actions={
          <Button variant="outlined" onClick={loadPage} disabled={Boolean(busyId)}>
            {t("common.refresh")}
          </Button>
        }
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {visibleProposals.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: "center" }}>
          <InboxRoundedIcon sx={{ fontSize: 56, color: "text.disabled", mb: 1 }} />
          <Typography color="text.secondary">{t("proposals.noPendingProposals")}</Typography>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {visibleProposals.map((proposal) => (
            <Grid size={{ xs: 12, md: 6, lg: 4 }} key={proposal.id}>
              <ProposalCard
                proposal={proposal}
                userRole={roleName}
                showActions
                onView={handleView}
                onApprove={isSupervisor ? openApproveDialog : undefined}
                onReject={isSupervisor ? openRejectDialog : undefined}
                onReassign={isAdmin ? openReassignDialog : undefined}
              />
            </Grid>
          ))}
        </Grid>
      )}

      <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{selectedProposal?.title}</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {t("projects.owner")}: {selectedProposal?.student?.name}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t("projects.supervisor")}: {selectedProposal?.requested_supervisor?.name}
          </Typography>
          <Typography variant="body1" sx={{ whiteSpace: "pre-wrap" }}>
            {selectedProposal?.description}
          </Typography>
          {selectedProposal?.supervisor_feedback && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              {selectedProposal.supervisor_feedback}
            </Alert>
          )}
          {selectedProposal?.project?.id && (
            <Button
              component={RouterLink}
              to={`/dashboard/projects/${selectedProposal.project.id}`}
              sx={{ mt: 2 }}
            >
              {t("proposals.openProject")}
            </Button>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>{t("common.close")}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={approveDialogOpen} onClose={() => setApproveDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{t("proposals.approveConfirmTitle")}</DialogTitle>
        <DialogContent>
          <Typography>{t("proposals.approveConfirmBody")}</Typography>
          {approvingProposal?.title && (
            <Typography sx={{ mt: 1, fontWeight: 700 }}>{approvingProposal.title}</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApproveDialogOpen(false)}>{t("common.cancel")}</Button>
          <Button
            color="success"
            onClick={() => approvingProposal && handleApprove(approvingProposal)}
            disabled={busyId != null}
          >
            {t("proposals.approve")}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={rejectDialogOpen} onClose={() => setRejectDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t("proposals.reject")}</DialogTitle>
        <DialogContent>
          <TextField
            label={t("proposals.feedback")}
            value={rejectFeedback}
            onChange={(e) => setRejectFeedback(e.target.value)}
            inputProps={{ maxLength: 2000 }}
            helperText={`${rejectFeedback.length}/2000`}
            fullWidth
            multiline
            minRows={4}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialogOpen(false)}>{t("common.cancel")}</Button>
          <Button color="error" onClick={handleReject} disabled={busyId != null}>
            {t("proposals.reject")}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={reassignDialogOpen} onClose={() => setReassignDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t("proposals.reassign")}</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 1 }}>
            <InputLabel>{t("proposals.selectSupervisor")}</InputLabel>
            <Select
              label={t("proposals.selectSupervisor")}
              value={reassignSupervisorId}
              onChange={(e) => setReassignSupervisorId(e.target.value)}
            >
              {supervisors.map((supervisor) => (
                <MenuItem key={supervisor.id} value={String(supervisor.id)}>
                  {supervisor.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReassignDialogOpen(false)}>{t("common.cancel")}</Button>
          <Button onClick={handleReassign} disabled={!reassignSupervisorId || busyId != null}>
            {t("proposals.reassign")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

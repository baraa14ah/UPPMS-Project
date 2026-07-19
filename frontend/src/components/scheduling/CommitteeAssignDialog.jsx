import React, { useEffect, useState } from "react";
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
} from "@mui/material";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";

/** Assign an active committee to a defense session. */
export default function CommitteeAssignDialog({
  open,
  onClose,
  defenseSession,
  onAssigned,
}) {
  const { authHeaders, apiFetch, API_BASE_URL } = useAuth();
  const { t } = useLanguage();

  const [committees, setCommittees] = useState([]);
  const [selectedCommitteeId, setSelectedCommitteeId] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;

    const loadCommittees = async () => {
      setFetching(true);
      setError("");
      try {
        const { res, data } = await apiFetch(`${API_BASE_URL}/committees?status=active&per_page=50`, {
          headers: authHeaders(),
        });
        if (!res.ok) {
          setError(data?.message || t("common.error"));
          return;
        }
        const list = data?.data?.committees || [];
        setCommittees(list.filter((committee) => committee.is_active));
        setSelectedCommitteeId("");
      } catch {
        setError(t("common.serverError"));
      } finally {
        setFetching(false);
      }
    };

    loadCommittees();
  }, [open, API_BASE_URL, apiFetch, authHeaders, t]);

  const handleAssign = async () => {
    if (!defenseSession?.id || !selectedCommitteeId) return;

    setLoading(true);
    setError("");
    try {
      const { res, data } = await apiFetch(
        `${API_BASE_URL}/defense-sessions/${defenseSession.id}/assign-committee`,
        {
          method: "POST",
          headers: authHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({ committee_id: Number(selectedCommitteeId) }),
        },
      );

      if (!res.ok) {
        const message =
          data?.message ||
          data?.errors?.committee_id?.[0] ||
          t("common.error");
        setError(message);
        return;
      }

      onAssigned?.(data?.data);
      onClose?.();
    } catch {
      setError(t("common.serverError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{t("committees.assign")}</DialogTitle>
      <DialogContent>
        {fetching ? (
          <CircularProgress size={28} sx={{ my: 2 }} />
        ) : committees.length === 0 ? (
          <Alert severity="warning" sx={{ mt: 1 }}>
            {t("committees.noActiveCommittees")}
          </Alert>
        ) : (
          <FormControl fullWidth sx={{ mt: 1 }}>
            <InputLabel>{t("committees.selectCommittee")}</InputLabel>
            <Select
              value={selectedCommitteeId}
              label={t("committees.selectCommittee")}
              onChange={(e) => setSelectedCommitteeId(e.target.value)}
            >
              {committees.map((committee) => (
                <MenuItem key={committee.id} value={String(committee.id)}>
                  {committee.name} ({committee.member_count} {t("committees.members")})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        {error ? (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
            {error.toLowerCase().includes("supervisor") ? (
              <div style={{ marginTop: 8 }}>{t("committees.conflictSuggestion")}</div>
            ) : null}
          </Alert>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          {t("common.cancel")}
        </Button>
        <Button
          variant="contained"
          onClick={handleAssign}
          disabled={loading || !selectedCommitteeId}
          startIcon={loading ? <CircularProgress size={18} color="inherit" /> : null}
        >
          {t("committees.assign")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

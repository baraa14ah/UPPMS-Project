import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormHelperText,
  TextField,
} from "@mui/material";
import { useLanguage } from "../context/LanguageContext";
import CommitteeMembersList from "./CommitteeMembersList";

/** Create or edit a defense committee (name, description, members). */
export default function CommitteeFormDialog({
  open,
  onClose,
  onSave,
  committee = null,
  availableSupervisors = [],
  saving = false,
  error = "",
}) {
  const { t } = useLanguage();
  const isEdit = Boolean(committee?.id);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [localError, setLocalError] = useState("");

  const supervisorOptions = useMemo(
    () =>
      availableSupervisors.filter(
        (supervisor) => !selectedMembers.some((member) => member.user_id === supervisor.id),
      ),
    [availableSupervisors, selectedMembers],
  );

  useEffect(() => {
    if (!open) return;

    if (committee) {
      setName(committee.name || "");
      setDescription(committee.description || "");
      setSelectedMembers(
        (committee.members || []).map((member) => ({
          user_id: member.id,
          name: member.name,
          email: member.email,
          role: member.role || "member",
        })),
      );
    } else {
      setName("");
      setDescription("");
      setSelectedMembers([]);
    }
    setLocalError("");
  }, [open, committee]);

  const handleAddSupervisor = (_, supervisor) => {
    if (!supervisor) return;
    if (selectedMembers.length >= 5) {
      setLocalError(t("committees.maxMembersError"));
      return;
    }
    setSelectedMembers((prev) => [
      ...prev,
      {
        user_id: supervisor.id,
        name: supervisor.name,
        email: supervisor.email,
        role: "member",
      },
    ]);
    setLocalError("");
  };

  const handleRoleChange = (member, role) => {
    setSelectedMembers((prev) =>
      prev.map((item) => {
        if (item.user_id === member.user_id || item.user_id === member.id) {
          return { ...item, role };
        }
        if (role === "chair" && item.role === "chair") {
          return { ...item, role: "member" };
        }
        return item;
      }),
    );
  };

  const handleRemove = (member) => {
    setSelectedMembers((prev) =>
      prev.filter((item) => item.user_id !== member.id && item.user_id !== member.user_id),
    );
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      setLocalError(t("committees.nameRequired"));
      return;
    }
    if (selectedMembers.length < 2) {
      setLocalError(t("committees.minMembersError"));
      return;
    }
    if (selectedMembers.length > 5) {
      setLocalError(t("committees.maxMembersError"));
      return;
    }

    onSave({
      name: name.trim(),
      description: description.trim() || null,
      members: selectedMembers.map((member) => ({
        user_id: member.user_id,
        role: member.role || "member",
      })),
      version: committee?.version,
    });
  };

  const displayError = error || localError;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        {isEdit ? t("committees.edit") : t("committees.create")}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          {displayError ? <Alert severity="error">{displayError}</Alert> : null}

          <TextField
            label={t("committees.name")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            fullWidth
          />

          <TextField
            label={t("committees.description")}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            multiline
            minRows={2}
            fullWidth
          />

          <Autocomplete
            options={supervisorOptions}
            getOptionLabel={(option) => `${option.name} (${option.email})`}
            onChange={handleAddSupervisor}
            value={null}
            disabled={selectedMembers.length >= 5}
            renderInput={(params) => (
              <TextField
                {...params}
                label={t("committees.selectSupervisors")}
                placeholder={t("committees.selectSupervisors")}
              />
            )}
          />

          <FormHelperText>
            {t("committees.membersRequired")} · {t("committees.maxMembers")}
          </FormHelperText>

          {selectedMembers.length >= 2 &&
            !selectedMembers.some((member) => member.role === "chair") && (
              <Alert severity="info">{t("committees.chairRecommendation")}</Alert>
            )}

          <CommitteeMembersList
            members={selectedMembers.map((member) => ({
              id: member.user_id,
              name: member.name,
              email: member.email,
              role: member.role,
            }))}
            editable
            onRemove={handleRemove}
            onRoleChange={handleRoleChange}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          {t("common.cancel")}
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={saving}
          startIcon={saving ? <CircularProgress size={18} color="inherit" /> : null}
        >
          {saving ? t("committees.saving") : t("common.save")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

import React from "react";
import {
  Alert,
  Box,
  Button,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
} from "@mui/material";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import { useLanguage } from "../../context/LanguageContext";
import { btnPrimarySx } from "../../styles/dashboardUi";

const fieldSx = {
  "& .MuiInputBase-root": { fontSize: "0.98rem" },
  "& .MuiInputLabel-root": { fontWeight: 700 },
};

/** Shared proposal form fields for create and resubmit flows. */
export default function ProposalFormFields({
  title,
  onTitleChange,
  description,
  onDescriptionChange,
  supervisorId,
  onSupervisorChange,
  selectedStageId,
  onStageChange,
  supervisors = [],
  availableTracks = [],
  formatSupervisorLabel,
  resolveSupervisorLabel,
  isSupervisorBlocked,
  formMode,
  editingProposal,
  canSubmit,
  submitting,
  onSubmit,
  onCancel,
  onDelete,
}) {
  const { t } = useLanguage();

  return (
    <Box component="form" onSubmit={onSubmit}>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            label={t("proposals.proposalTitle")}
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            inputProps={{ maxLength: 200 }}
            helperText={`${title.length}/200`}
            required
            fullWidth
            autoFocus
            sx={fieldSx}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <FormControl fullWidth required sx={fieldSx}>
            <InputLabel id="proposal-supervisor-label">
              {t("proposals.selectSupervisor")}
            </InputLabel>
            <Select
              labelId="proposal-supervisor-label"
              label={t("proposals.selectSupervisor")}
              value={supervisorId}
              onChange={(e) => onSupervisorChange(e.target.value)}
              renderValue={resolveSupervisorLabel}
              MenuProps={{ PaperProps: { sx: { maxHeight: 320 } } }}
            >
              {supervisors.length === 0 ? (
                <MenuItem disabled value="">
                  {t("proposals.noSupervisorsAvailable")}
                </MenuItem>
              ) : (
                supervisors.map((supervisor) => {
                  const blocked = isSupervisorBlocked(supervisor);
                  return (
                    <MenuItem
                      key={supervisor.id}
                      value={String(supervisor.id)}
                      disabled={blocked}
                    >
                      {formatSupervisorLabel(supervisor)}
                      {blocked ? ` — ${t("proposals.supervisorBlocked")}` : ""}
                    </MenuItem>
                  );
                })
              )}
            </Select>
          </FormControl>
        </Grid>
        {availableTracks.length > 0 && (
          <Grid size={{ xs: 12, md: 6 }}>
            <FormControl fullWidth sx={fieldSx}>
              <InputLabel>{t("progress.selectStage")}</InputLabel>
              <Select
                label={t("progress.selectStage")}
                value={selectedStageId}
                onChange={(e) => onStageChange(e.target.value)}
              >
                <MenuItem value="">{t("common.none")}</MenuItem>
                {availableTracks.map((track) => [
                  <MenuItem
                    key={`track-${track.id}`}
                    disabled
                    sx={{ fontWeight: 800, opacity: 1 }}
                  >
                    {track.name}
                  </MenuItem>,
                  ...track.stages.map((stage) => (
                    <MenuItem
                      key={stage.id}
                      value={String(stage.id)}
                      disabled={!stage.unlocked || stage.status === "locked"}
                      sx={{ pl: 3 }}
                    >
                      {stage.name}
                      {stage.status === "locked"
                        ? ` (${t("progress.locked")})`
                        : ""}
                    </MenuItem>
                  )),
                ])}
              </Select>
            </FormControl>
          </Grid>
        )}
        <Grid size={12}>
          <TextField
            label={t("proposals.proposalDescription")}
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            inputProps={{ maxLength: 5000 }}
            helperText={`${description.length}/5000`}
            required
            fullWidth
            multiline
            minRows={5}
            sx={fieldSx}
          />
        </Grid>
      </Grid>

      {formMode === "resubmit" && editingProposal && (
        <Alert severity="info" sx={{ mt: 2, borderRadius: 2 }}>
          {t("proposals.remainingAttempts", {
            count: Math.max(0, 3 - (editingProposal.resubmission_count || 0)),
          })}
        </Alert>
      )}

      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1}
        sx={{ mt: 2.5 }}
      >
        <Button
          type="submit"
          variant="contained"
          disabled={!canSubmit || submitting}
          sx={{ ...btnPrimarySx, borderRadius: 2, px: 3 }}
        >
          {submitting
            ? t("common.loading")
            : formMode === "resubmit"
              ? t("proposals.resubmit")
              : t("proposals.submit")}
        </Button>
        <Button
          type="button"
          variant="outlined"
          onClick={onCancel}
          sx={{ fontWeight: 800, borderRadius: 2 }}
        >
          {t("common.cancel")}
        </Button>
        {formMode === "resubmit" && onDelete && (
          <Button
            type="button"
            color="error"
            variant="text"
            startIcon={<DeleteOutlineRoundedIcon />}
            onClick={onDelete}
            sx={{ fontWeight: 800, ml: { sm: "auto" } }}
          >
            {t("proposals.deleteProposal")}
          </Button>
        )}
      </Stack>
    </Box>
  );
}

import React from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Collapse,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
  alpha,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import EditNoteRoundedIcon from "@mui/icons-material/EditNoteRounded";
import LightbulbRoundedIcon from "@mui/icons-material/LightbulbRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import { useLanguage } from "../../context/LanguageContext";
import { btnPrimarySx, sectionPaperSx, accentTop } from "../../styles/dashboardUi";

const fieldSx = {
  "& .MuiInputBase-root": { fontSize: "0.98rem" },
  "& .MuiInputLabel-root": { fontWeight: 700 },
};

/** Blocked state when the student cannot submit. */
function WorkspaceBlocked({ icon, title, body, action }) {
  return (
    <Stack alignItems="center" textAlign="center" sx={{ py: 4, px: 2 }}>
      <Box
        sx={{
          width: 72,
          height: 72,
          borderRadius: "50%",
          display: "grid",
          placeItems: "center",
          bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
          color: "primary.main",
          mb: 2,
          "& svg": { fontSize: 36 },
        }}
      >
        {icon}
      </Box>
      <Typography variant="h6" sx={{ fontWeight: 900, mb: 1 }}>
        {title}
      </Typography>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ maxWidth: 360, lineHeight: 1.7, fontWeight: 600 }}
      >
        {body}
      </Typography>
      {action}
    </Stack>
  );
}

/** Left workspace — open form on demand, then submit. */
export default function ProposalWorkspacePanel({
  formOpen,
  onOpenNew,
  canCreateNew,
  isEditing,
  hasActiveProject,
  activeProject,
  pendingProposal,
  title,
  onTitleChange,
  description,
  onDescriptionChange,
  supervisorId,
  onSupervisorChange,
  selectedStageId,
  onStageChange,
  supervisors,
  availableTracks,
  supervisorLabel,
  isSupervisorBlocked,
  editingProposal,
  canSubmit,
  submitting,
  onSubmit,
  onCancel,
}) {
  const { t } = useLanguage();
  const showForm = formOpen || isEditing;

  const panelTitle = isEditing
    ? t("proposals.modifyResubmit")
    : showForm
      ? t("proposals.workspaceTitle")
      : t("proposals.ideasQuota");

  const panelSubtitle = isEditing
    ? editingProposal?.title
    : showForm
      ? t("proposals.workspaceSubtitle")
      : t("proposals.statusReadyBody");

  return (
    <Paper
      elevation={0}
      sx={{
        ...sectionPaperSx,
        ...accentTop("#8B5CF6"),
        mb: 0,
        height: "100%",
        position: { lg: "sticky" },
        top: { lg: 16 },
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: 2.5,
            display: "grid",
            placeItems: "center",
            bgcolor: alpha("#8B5CF6", 0.12),
            color: "#7C3AED",
            flexShrink: 0,
          }}
        >
          {isEditing ? (
            <EditNoteRoundedIcon />
          ) : (
            <LightbulbRoundedIcon />
          )}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h6" sx={{ fontWeight: 900, lineHeight: 1.25 }}>
            {panelTitle}
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ fontWeight: 600, mt: 0.25 }}
          >
            {panelSubtitle}
          </Typography>
        </Box>
      </Stack>

      {hasActiveProject ? (
        <WorkspaceBlocked
          icon={<CheckCircleRoundedIcon />}
          title={t("proposals.statusActiveProjectTitle")}
          body={t("proposals.statusActiveProjectBody")}
          action={
            <Button
              component={RouterLink}
              to={`/dashboard/projects/${activeProject.id}`}
              variant="contained"
              endIcon={<OpenInNewRoundedIcon />}
              sx={{ ...btnPrimarySx, borderRadius: 2, mt: 2.5, px: 3 }}
            >
              {t("proposals.openProject")}
            </Button>
          }
        />
      ) : !canCreateNew && !isEditing ? (
        <WorkspaceBlocked
          icon={<LightbulbRoundedIcon />}
          title={
            pendingProposal
              ? t("proposals.statusPendingTitle")
              : t("proposals.statusLimitTitle")
          }
          body={
            pendingProposal
              ? t("proposals.statusPendingBody")
              : t("proposals.deleteToFreeSlot")
          }
        />
      ) : (
        <>
          {canCreateNew && !showForm && (
            <Button
              fullWidth
              variant="contained"
              startIcon={<AddRoundedIcon />}
              onClick={onOpenNew}
              sx={{ ...btnPrimarySx, borderRadius: 2, py: 1.35, mb: 1 }}
            >
              {t("proposals.startNewProposal")}
            </Button>
          )}

          <Collapse in={showForm} timeout="auto" unmountOnExit>
            <Box component="form" onSubmit={onSubmit} sx={{ pt: 0.5 }}>
              <Stack spacing={2}>
                <TextField
                  label={t("proposals.proposalTitle")}
                  value={title}
                  onChange={(e) => onTitleChange(e.target.value)}
                  inputProps={{ maxLength: 200 }}
                  helperText={`${title.length}/200`}
                  required
                  fullWidth
                  autoFocus={showForm}
                  sx={fieldSx}
                />
                <FormControl fullWidth required sx={fieldSx}>
                  <InputLabel>{t("proposals.selectSupervisor")}</InputLabel>
                  <Select
                    label={t("proposals.selectSupervisor")}
                    value={supervisorId}
                    onChange={(e) => onSupervisorChange(e.target.value)}
                  >
                    {supervisors.length === 0 ? (
                      <MenuItem disabled value="">
                        {t("proposals.noSupervisorsAvailable")}
                      </MenuItem>
                    ) : (
                      supervisors.map((s) => (
                        <MenuItem
                          key={s.id}
                          value={String(s.id)}
                          disabled={isSupervisorBlocked(s)}
                        >
                          {supervisorLabel(s)}
                        </MenuItem>
                      ))
                    )}
                  </Select>
                </FormControl>
                {availableTracks.length > 0 && (
                  <FormControl fullWidth sx={fieldSx}>
                    <InputLabel>{t("progress.selectStage")}</InputLabel>
                    <Select
                      label={t("progress.selectStage")}
                      value={selectedStageId}
                      onChange={(e) => onStageChange(e.target.value)}
                    >
                      <MenuItem value="">{t("common.none")}</MenuItem>
                      {availableTracks.flatMap((track) =>
                        track.stages.map((stage) => (
                          <MenuItem
                            key={stage.id}
                            value={String(stage.id)}
                            disabled={
                              !stage.unlocked || stage.status === "locked"
                            }
                          >
                            {track.name} — {stage.name}
                          </MenuItem>
                        )),
                      )}
                    </Select>
                  </FormControl>
                )}
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
              </Stack>

              {isEditing && editingProposal && (
                <Alert severity="info" sx={{ mt: 2, borderRadius: 2 }}>
                  {t("proposals.remainingAttempts", {
                    count: Math.max(
                      0,
                      3 - (editingProposal.resubmission_count || 0),
                    ),
                  })}
                </Alert>
              )}

              <Stack direction="row" spacing={1} sx={{ mt: 2.5 }}>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={!canSubmit || submitting}
                  sx={{ ...btnPrimarySx, borderRadius: 2, flex: 1, py: 1.1 }}
                >
                  {submitting
                    ? t("common.loading")
                    : isEditing
                      ? t("proposals.resubmit")
                      : t("proposals.submit")}
                </Button>
                <Button
                  type="button"
                  variant="outlined"
                  onClick={onCancel}
                  sx={{ fontWeight: 800, borderRadius: 2, px: 2.5 }}
                >
                  {t("common.cancel")}
                </Button>
              </Stack>
            </Box>
          </Collapse>
        </>
      )}
    </Paper>
  );
}

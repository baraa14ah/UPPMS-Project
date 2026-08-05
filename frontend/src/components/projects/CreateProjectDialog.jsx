import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  TextField,
  Button,
  Stack,
  IconButton,
  alpha,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
} from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import RocketLaunchRoundedIcon from "@mui/icons-material/RocketLaunchRounded";
import { btnPrimarySx } from "../../styles/dashboardUi";

const TITLE_MAX = 120;
const DESC_MAX = 600;

/** Modal form for creating a project; optional academic phase (first step applied server-side). */
export default function CreateProjectDialog({
  open,
  onClose,
  onSubmit,
  submitting,
  t,
  phaseOptions = [],
  phasesLoading = false,
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [trackPhaseId, setTrackPhaseId] = useState("");

  useEffect(() => {
    if (!open) {
      setTitle("");
      setDescription("");
      setTrackPhaseId("");
    }
  }, [open]);

  const handleClose = () => {
    if (submitting) return;
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;
    const ok = await onSubmit({
      title: title.trim(),
      description: description.trim(),
      track_phase_id: trackPhaseId ? Number(trackPhaseId) : null,
    });
    if (ok) {
      setTitle("");
      setDescription("");
      setTrackPhaseId("");
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: {
          borderRadius: 3,
          overflow: "hidden",
          borderTop: "4px solid",
          borderTopColor: "#8B5CF6",
        },
      }}
    >
      <DialogTitle sx={{ px: 3, pt: 2.5, pb: 1 }}>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 2.5,
                display: "grid",
                placeItems: "center",
                bgcolor: alpha("#8B5CF6", 0.12),
                color: "#7C3AED",
              }}
            >
              <RocketLaunchRoundedIcon />
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 900, fontSize: "1.15rem", lineHeight: 1.25 }}>
                {t("projects.createDialogTitle")}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.35, fontWeight: 500 }}>
                {t("projects.createDialogHint")}
              </Typography>
            </Box>
          </Stack>
          <IconButton size="small" onClick={handleClose} disabled={submitting} aria-label={t("common.cancel")}>
            <CloseRoundedIcon fontSize="small" />
          </IconButton>
        </Stack>
      </DialogTitle>

      <Box component="form" onSubmit={handleSubmit}>
        <DialogContent sx={{ px: 3, pt: 1, pb: 2 }}>
          <Stack spacing={2.25}>
            <TextField
              fullWidth
              label={t("projects.titleLabel")}
              placeholder={t("projects.createTitlePlaceholder")}
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, TITLE_MAX))}
              required
              autoFocus
              helperText={`${title.length}/${TITLE_MAX}`}
              inputProps={{ maxLength: TITLE_MAX }}
            />
            <TextField
              fullWidth
              label={t("projects.descLabel")}
              placeholder={t("projects.createDescPlaceholder")}
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, DESC_MAX))}
              required
              multiline
              minRows={4}
              helperText={`${description.length}/${DESC_MAX}`}
              inputProps={{ maxLength: DESC_MAX }}
            />
            <FormControl fullWidth disabled={phasesLoading || submitting}>
              <InputLabel id="create-project-phase-label">{t("projects.trackPhaseLabel")}</InputLabel>
              <Select
                labelId="create-project-phase-label"
                label={t("projects.trackPhaseLabel")}
                value={trackPhaseId}
                onChange={(e) => setTrackPhaseId(e.target.value)}
              >
                <MenuItem value="">
                  <em>{t("projects.trackPhaseDefaultOption")}</em>
                </MenuItem>
                {phaseOptions.map((phase) => (
                  <MenuItem key={phase.id} value={String(phase.id)}>
                    {phase.label || phase.name}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>{t("projects.trackPhaseOptionalHint")}</FormHelperText>
            </FormControl>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5, pt: 0, gap: 1 }}>
          <Button
            onClick={handleClose}
            disabled={submitting}
            sx={{ fontWeight: 800, textTransform: "none" }}
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={submitting || !title.trim() || !description.trim()}
            startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : null}
            sx={{ ...btnPrimarySx, px: 3, borderRadius: 2, textTransform: "none" }}
          >
            {submitting ? t("projects.creating") : t("projects.createBtn")}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

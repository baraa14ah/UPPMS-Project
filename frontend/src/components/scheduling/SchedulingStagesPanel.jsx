import React, { useMemo } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Grid,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  Add,
  CalendarMonth,
  Close,
  Delete,
  Edit,
  Save,
  School,
  ArrowForward,
} from "@mui/icons-material";
import SchedulingSection from "./SchedulingSection";
import { getDayOptions } from "../../config/schedulingDays";
import {
  applyDayHoursToForm,
  applyPeriodDatesToForm,
  isMandatoryStage,
  todayIsoDate,
  updateMandatorySlotTime,
} from "../../utils/schedulingFormUtils";
import { useLanguage } from "../../context/LanguageContext";

/** Step 1 — defense types catalog and calendar settings. */
export default function SchedulingStagesPanel({
  stages,
  selectedStageId,
  onSelectStage,
  stageForm,
  setStageForm,
  stageFormErrors = {},
  onAddStage,
  addingStage,
  editingStageId,
  editForm,
  setEditForm,
  editFormErrors = {},
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  savingEdit,
  onDeleteStage,
  deletingStageId,
  onOpenAvailability,
  openingAvailabilityStageId,
  onEnsureCatalog,
  ensuringCatalog,
  onNext,
}) {
  const { t } = useLanguage();
  const dayOptions = useMemo(() => getDayOptions(t), [t]);
  const minDate = todayIsoDate();

  return (
    <Stack spacing={3}>
      {stages.length === 0 && onEnsureCatalog && (
        <Alert
          severity="warning"
          action={
            <Button color="inherit" size="small" onClick={onEnsureCatalog} disabled={ensuringCatalog}>
              {ensuringCatalog ? <CircularProgress size={18} /> : t("scheduling.ensureCatalog")}
            </Button>
          }
        >
          {t("scheduling.ensureCatalog")}
        </Alert>
      )}

      <SchedulingSection title={t("scheduling.stages.addTitle")} icon={<School fontSize="small" />}>
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: "action.hover" }}>
          <StagePeriodFields
            form={stageForm}
            setForm={setStageForm}
            dayOptions={dayOptions}
            minDate={minDate}
            nameEditable
            fieldErrors={stageFormErrors}
          />

          <Button
            variant="contained"
            startIcon={addingStage ? <CircularProgress size={16} color="inherit" /> : <Add />}
            onClick={onAddStage}
            disabled={addingStage}
            sx={{ mt: 2, fontWeight: 800 }}
          >
            {t("scheduling.stages.addStage")}
          </Button>
        </Paper>
      </SchedulingSection>

      <SchedulingSection
        title={t("scheduling.stages.registeredTitle", { count: stages.length })}
        icon={<CalendarMonth fontSize="small" />}
      >
        {stages.length === 0 ? (
          <Alert severity="info">{t("scheduling.stages.empty")}</Alert>
        ) : (
          <Stack spacing={2}>
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 900 }}>{t("scheduling.stages.colType")}</TableCell>
                    <TableCell sx={{ fontWeight: 900 }}>{t("scheduling.stages.colPeriod")}</TableCell>
                    <TableCell sx={{ fontWeight: 900 }}>{t("scheduling.stages.colDays")}</TableCell>
                    <TableCell sx={{ fontWeight: 900 }}>{t("scheduling.stages.colDailyHours")}</TableCell>
                    <TableCell sx={{ fontWeight: 900 }}>{t("scheduling.stages.colDuration")}</TableCell>
                    <TableCell sx={{ fontWeight: 900 }}>{t("scheduling.stages.colRegistration")}</TableCell>
                    <TableCell align="left" sx={{ fontWeight: 900 }}>
                      {t("common.actions")}
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {stages.map((stage) => {
                    const mandatory = isMandatoryStage(stage);
                    const isSelected = String(selectedStageId) === String(stage.id);
                    const period =
                      stage.defense_period_start && stage.defense_period_end
                        ? `${String(stage.defense_period_start).slice(0, 10)} → ${String(stage.defense_period_end).slice(0, 10)}`
                        : "—";
                    const daysText = (stage.allowed_defense_days || [])
                      .map((d) => dayOptions.find((o) => o.value === d)?.label || d)
                      .join(t("scheduling.stages.daySeparator"));
                    const hours =
                      stage.day_start_time || stage.day_end_time
                        ? `${String(stage.day_start_time || "08:00").slice(0, 5)} – ${String(stage.day_end_time || "15:00").slice(0, 5)}`
                        : "—";
                    let registration = "—";
                    if (mandatory) {
                      registration = t("scheduling.stages.registrationMandatory");
                    } else if (stage.availability_open) {
                      registration = t("scheduling.stages.registrationOpen");
                    } else {
                      registration = t("scheduling.stages.registrationClosed");
                    }

                    return (
                      <TableRow
                        key={stage.id}
                        hover
                        selected={isSelected}
                        sx={{ cursor: "pointer" }}
                        onClick={() => onSelectStage(String(stage.id))}
                      >
                        <TableCell sx={{ fontWeight: 700 }}>
                          <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
                            <span>{stage.name}</span>
                            {stage.is_system_stage ? (
                              <Chip size="small" label={t("scheduling.stages.systemBadge")} color="secondary" />
                            ) : null}
                            {isSelected ? (
                              <Chip size="small" label={t("scheduling.stages.selectedBadge")} color="primary" />
                            ) : null}
                          </Stack>
                        </TableCell>
                        <TableCell>{period}</TableCell>
                        <TableCell>{daysText || "—"}</TableCell>
                        <TableCell>{hours}</TableCell>
                        <TableCell>
                          {t("scheduling.stages.durationMinutes", { minutes: stage.duration_minutes })}
                        </TableCell>
                        <TableCell>{registration}</TableCell>
                        <TableCell align="left" onClick={(e) => e.stopPropagation()}>
                          <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                            {!mandatory &&
                              !stage.availability_open &&
                              stage.defense_period_start &&
                              stage.defense_period_end && (
                                <Button
                                  size="small"
                                  variant="outlined"
                                  onClick={() => onOpenAvailability(stage.id)}
                                  disabled={openingAvailabilityStageId === stage.id}
                                >
                                  {t("scheduling.stages.openRegistration")}
                                </Button>
                              )}
                            <Tooltip title={t("common.edit")}>
                              <IconButton size="small" color="primary" onClick={() => onStartEdit(stage)}>
                                <Edit fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            {!stage.is_system_stage && (
                              <Tooltip title={t("common.delete")}>
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => onDeleteStage(stage.id)}
                                  disabled={deletingStageId === stage.id}
                                >
                                  {deletingStageId === stage.id ? (
                                    <CircularProgress size={18} />
                                  ) : (
                                    <Delete fontSize="small" />
                                  )}
                                </IconButton>
                              </Tooltip>
                            )}
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            {editingStageId && (
              <StageCard
                stage={stages.find((s) => String(s.id) === String(editingStageId))}
                isEditing
                editForm={editForm}
                setEditForm={setEditForm}
                fieldErrors={editFormErrors}
                onCancelEdit={onCancelEdit}
                onSaveEdit={onSaveEdit}
                savingEdit={savingEdit}
                dayOptions={dayOptions}
                minDate={minDate}
              />
            )}
          </Stack>
        )}
      </SchedulingSection>

      <Stack direction="row" justifyContent="flex-end">
        <Button
          variant="contained"
          endIcon={<ArrowForward />}
          onClick={onNext}
          disabled={stages.length === 0}
          sx={{ fontWeight: 800, px: 3 }}
        >
          {t("scheduling.stages.continueToRooms")}
        </Button>
      </Stack>
    </Stack>
  );
}

function StagePeriodFields({
  form,
  setForm,
  dayOptions,
  minDate,
  nameEditable = true,
  nameDisabled = false,
  fieldErrors = {},
}) {
  const { t } = useLanguage();
  const derivedDays = form.allowed_defense_days || [];

  return (
    <Stack spacing={2}>
      {(fieldErrors.defense_period_start ||
        fieldErrors.defense_period_end ||
        fieldErrors.day_start_time ||
        fieldErrors.day_end_time ||
        fieldErrors.allowed_defense_days) && (
        <Alert severity="error">
          {fieldErrors.defense_period_start ||
            fieldErrors.defense_period_end ||
            fieldErrors.day_start_time ||
            fieldErrors.day_end_time ||
            fieldErrors.allowed_defense_days}
        </Alert>
      )}

      <Grid container spacing={2}>
        {nameEditable && (
          <Grid item xs={12} md={4}>
            <TextField
              label={t("scheduling.stages.name")}
              placeholder={t("scheduling.stages.namePlaceholder")}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              fullWidth
              size="small"
              disabled={nameDisabled}
              error={Boolean(fieldErrors.name)}
              helperText={fieldErrors.name || undefined}
            />
          </Grid>
        )}
        <Grid item xs={6} md={2}>
          <TextField
            label={t("scheduling.stages.sessionDuration")}
            type="number"
            value={form.duration_minutes}
            onChange={(e) =>
              setForm((f) => ({ ...f, duration_minutes: Number(e.target.value) }))
            }
            fullWidth
            size="small"
            InputProps={{
              endAdornment: (
                <Typography variant="caption">{t("scheduling.stages.minutesAbbrev")}</Typography>
              ),
            }}
          />
        </Grid>
        <Grid item xs={6} md={2}>
          <TextField
            label={t("scheduling.stages.committeeSize")}
            type="number"
            value={form.default_committee_size}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                default_committee_size: Number(e.target.value),
              }))
            }
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} md={2}>
          <TextField
            label={t("scheduling.stages.periodStart")}
            type="date"
            value={form.defense_period_start}
            onChange={(e) =>
              setForm((f) =>
                applyPeriodDatesToForm(f, { defense_period_start: e.target.value }),
              )
            }
            inputProps={{ min: minDate }}
            InputLabelProps={{ shrink: true }}
            fullWidth
            size="small"
            error={Boolean(fieldErrors.defense_period_start)}
            helperText={fieldErrors.defense_period_start || t("scheduling.stages.periodFromToday")}
          />
        </Grid>
        <Grid item xs={12} md={2}>
          <TextField
            label={t("scheduling.stages.periodEnd")}
            type="date"
            value={form.defense_period_end}
            onChange={(e) =>
              setForm((f) =>
                applyPeriodDatesToForm(f, { defense_period_end: e.target.value }),
              )
            }
            inputProps={{
              min: form.defense_period_start || minDate,
            }}
            InputLabelProps={{ shrink: true }}
            fullWidth
            size="small"
            error={Boolean(fieldErrors.defense_period_end)}
            helperText={fieldErrors.defense_period_end || undefined}
          />
        </Grid>
        <Grid item xs={6} md={2}>
          <TextField
            label={t("scheduling.stages.timeFrom")}
            type="time"
            value={form.day_start_time || "08:00"}
            onChange={(e) =>
              setForm((f) => applyDayHoursToForm(f, { day_start_time: e.target.value }))
            }
            InputLabelProps={{ shrink: true }}
            fullWidth
            size="small"
            error={Boolean(fieldErrors.day_start_time)}
            helperText={fieldErrors.day_start_time || t("scheduling.stages.hoursApplyAllDays")}
          />
        </Grid>
        <Grid item xs={6} md={2}>
          <TextField
            label={t("scheduling.stages.timeTo")}
            type="time"
            value={form.day_end_time || "15:00"}
            onChange={(e) =>
              setForm((f) => applyDayHoursToForm(f, { day_end_time: e.target.value }))
            }
            InputLabelProps={{ shrink: true }}
            fullWidth
            size="small"
            error={Boolean(fieldErrors.day_end_time)}
            helperText={fieldErrors.day_end_time || undefined}
          />
        </Grid>
      </Grid>

      <Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
          {t("scheduling.stages.defenseDaysHint")}
        </Typography>
        <Stack direction="row" flexWrap="wrap" gap={0.5} useFlexGap>
          {dayOptions.map((day) => {
            const on = derivedDays.includes(day.value);
            return (
              <Chip
                key={day.value}
                label={day.label}
                color={on ? "primary" : "default"}
                variant={on ? "filled" : "outlined"}
                sx={{ fontWeight: on ? 800 : 500, opacity: on ? 1 : 0.55 }}
              />
            );
          })}
        </Stack>
        {form.defense_period_start && form.defense_period_end && derivedDays.length === 0 && (
          <Alert severity="warning" sx={{ mt: 1 }}>
            {t("scheduling.stages.noValidDaysInRange")}
          </Alert>
        )}
      </Box>
    </Stack>
  );
}

function StageCard({
  stage,
  isEditing,
  editForm,
  setEditForm,
  fieldErrors = {},
  onCancelEdit,
  onSaveEdit,
  savingEdit,
  dayOptions,
  minDate,
}) {
  const { t } = useLanguage();
  const mandatory = stage ? isMandatoryStage(stage) : false;

  if (!stage || !isEditing || !editForm) {
    return null;
  }

  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, borderColor: "primary.main" }}>
      <Stack spacing={2}>
        <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>
          {t("scheduling.stages.editing", { name: stage.name })}
        </Typography>

        <StagePeriodFields
          form={editForm}
          setForm={setEditForm}
          dayOptions={dayOptions}
          minDate={minDate}
          nameEditable
          nameDisabled={Boolean(stage.is_system_stage)}
          fieldErrors={fieldErrors}
        />

        {mandatory && (
          <MandatoryDaysEditor
            editForm={editForm}
            setEditForm={setEditForm}
            dayOptions={dayOptions}
          />
        )}

        <Stack direction="row" spacing={1} justifyContent="flex-end" flexWrap="wrap" useFlexGap>
          <Button size="small" startIcon={<Close />} onClick={onCancelEdit}>
            {t("common.cancel")}
          </Button>
          <Button
            size="small"
            variant="contained"
            startIcon={savingEdit ? <CircularProgress size={16} color="inherit" /> : <Save />}
            onClick={onSaveEdit}
            disabled={savingEdit}
          >
            {t("common.save")}
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}

function MandatoryDaysEditor({ editForm, setEditForm, dayOptions }) {
  const { t } = useLanguage();
  const options = dayOptions || [];
  const slots = editForm.mandatory_slots || [];
  const days = editForm.allowed_defense_days || [];

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.5 }}>
        {t("scheduling.stages.mandatorySlotsTitle")}
      </Typography>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
        {t("scheduling.stages.mandatorySlotsHint")}
      </Typography>
      <Stack spacing={1}>
        {options
          .filter((day) => days.includes(day.value))
          .map((day) => {
            const slot = slots.find((s) => s.day_of_week === day.value);
            return (
              <Paper
                key={day.value}
                variant="outlined"
                sx={{
                  p: 1.25,
                  borderColor: "primary.main",
                  bgcolor: "action.hover",
                }}
              >
                <Typography sx={{ fontWeight: 800, mb: 0.75 }}>{day.label}</Typography>
                {slot && (
                  <Stack direction="row" spacing={1.5}>
                    <TextField
                      label={t("scheduling.stages.slotFrom")}
                      type="time"
                      size="small"
                      value={slot.start_time}
                      onChange={(e) =>
                        setEditForm((f) =>
                          updateMandatorySlotTime(f, day.value, "start_time", e.target.value),
                        )
                      }
                      InputLabelProps={{ shrink: true }}
                    />
                    <TextField
                      label={t("scheduling.stages.slotTo")}
                      type="time"
                      size="small"
                      value={slot.end_time}
                      onChange={(e) =>
                        setEditForm((f) =>
                          updateMandatorySlotTime(f, day.value, "end_time", e.target.value),
                        )
                      }
                      InputLabelProps={{ shrink: true }}
                    />
                  </Stack>
                )}
              </Paper>
            );
          })}
      </Stack>
      {days.length === 0 && (
        <Alert severity="warning" sx={{ mt: 1 }}>
          {t("scheduling.stages.pickDatesFirst")}
        </Alert>
      )}
    </Box>
  );
}

export { emptyStageForm } from "../../utils/schedulingFormUtils";

import React, { useEffect, useMemo, useState } from "react";
import {
  Typography,
  Stack,
  Button,
  TextField,
  IconButton,
  Chip,
  CircularProgress,
  Alert,
  Paper,
  Box,
  Divider,
  alpha,
} from "@mui/material";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import EventAvailableRoundedIcon from "@mui/icons-material/EventAvailableRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { getDayOptions } from "../../config/schedulingDays";

/** Supervisor panel — register free time when admin opens collection for a stage. */
export default function DoctorAvailabilityPanel() {
  const { authHeaders, apiFetch, API_BASE_URL } = useAuth();
  const { t } = useLanguage();
  const [context, setContext] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeDay, setActiveDay] = useState(null);
  const [slotForm, setSlotForm] = useState({
    start_time: "09:00",
    end_time: "12:00",
  });

  const fetchContext = async () => {
    try {
      const { res, data } = await apiFetch(
        `${API_BASE_URL}/scheduling/availability-context`,
        { headers: authHeaders() },
      );
      if (res.ok) {
        setContext(data);
        const days = data.stage?.allowed_defense_days || [];
        if (days.length > 0) {
          setActiveDay((prev) =>
            prev != null && days.includes(prev) ? prev : days[0],
          );
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContext();
  }, []);

  const allowedDays = context?.stage?.allowed_defense_days || [];
  const slots = context?.my_slots || [];

  const slotsByDay = useMemo(() => {
    const map = {};
    allowedDays.forEach((d) => {
      map[d] = [];
    });
    slots.forEach((slot) => {
      if (!map[slot.day_of_week]) map[slot.day_of_week] = [];
      map[slot.day_of_week].push(slot);
    });
    return map;
  }, [slots, allowedDays]);

  const dayOptions = useMemo(() => getDayOptions(t), [t]);

  const dayLabel = (value) => {
    const found = dayOptions.find((d) => d.value === value);
    return found?.label || String(value);
  };

  const handleAdd = async () => {
    if (activeDay == null) {
      toast.error(t("profile.doctorAvailabilitySelectDay"));
      return;
    }

    setSaving(true);
    try {
      const { res, data } = await apiFetch(`${API_BASE_URL}/doctor-availabilities`, {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          day_of_week: activeDay,
          start_time: slotForm.start_time,
          end_time: slotForm.end_time,
        }),
      });

      if (!res.ok) {
        toast.error(
          data?.message ||
            data?.errors?.day_of_week?.[0] ||
            t("profile.doctorAvailabilitySaveError"),
        );
        return;
      }

      toast.success(t("profile.doctorAvailabilitySaveSuccess"));
      await fetchContext();
    } catch {
      toast.error(t("profile.doctorAvailabilitySaveError"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (slotId) => {
    try {
      const { res, data } = await apiFetch(
        `${API_BASE_URL}/doctor-availabilities/${slotId}`,
        { method: "DELETE", headers: authHeaders() },
      );

      if (!res.ok) {
        toast.error(data?.message || t("profile.doctorAvailabilityDeleteError"));
        return;
      }

      toast.success(t("profile.doctorAvailabilityDeleteSuccess"));
      await fetchContext();
    } catch {
      toast.error(t("profile.doctorAvailabilityDeleteError"));
    }
  };

  if (loading) {
    return (
      <Stack alignItems="center" py={3} spacing={1}>
        <CircularProgress size={28} />
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
          {t("profile.doctorAvailabilityLoading")}
        </Typography>
      </Stack>
    );
  }

  if (!context?.is_open) {
    return (
      <Stack spacing={2}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              display: "grid",
              placeItems: "center",
              bgcolor: alpha("#64748B", 0.12),
              color: "text.secondary",
            }}
          >
            <EventAvailableRoundedIcon />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 900 }}>
              {t("profile.doctorAvailabilityTitle")}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
              {t("profile.doctorAvailabilityClosedHint")}
            </Typography>
          </Box>
        </Stack>
        <Alert severity="info" icon={<CalendarMonthRoundedIcon />} sx={{ borderRadius: 2 }}>
          {context?.message || t("profile.doctorAvailabilityClosedBody")}
        </Alert>
      </Stack>
    );
  }

  const { stage } = context;
  const daysText = stage.allowed_defense_days_labels?.join("، ") || "";

  return (
    <Stack spacing={2}>
      <Paper
        variant="outlined"
        sx={{
          p: 1.75,
          borderRadius: 2,
          borderColor: "primary.main",
          bgcolor: alpha("#3B82F6", 0.06),
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 900, color: "primary.main" }}>
          {stage.name} — {t("profile.doctorAvailabilityOpen")}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontWeight: 600 }}>
          {stage.defense_period_start} → {stage.defense_period_end}
          {daysText ? ` · ${daysText}` : ""}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.75, fontWeight: 600 }}>
          {t("profile.doctorAvailabilityOpenNote")}
        </Typography>
      </Paper>

      <Typography variant="body2" sx={{ fontWeight: 800 }}>
        {t("profile.doctorAvailabilityPickDay")}
      </Typography>

      <Stack spacing={1}>
        {dayOptions.filter((d) => allowedDays.includes(d.value)).map((day) => {
          const daySlots = slotsByDay[day.value] || [];
          const selected = activeDay === day.value;

          return (
            <Paper
              key={day.value}
              variant="outlined"
              sx={{
                p: 1.5,
                borderRadius: 2,
                borderColor: selected ? "primary.main" : "divider",
                bgcolor: selected ? alpha("#3B82F6", 0.04) : "background.paper",
                cursor: "pointer",
              }}
              onClick={() => setActiveDay(day.value)}
            >
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                spacing={1}
              >
                <Typography sx={{ fontWeight: selected ? 900 : 700 }}>
                  {dayLabel(day.value)}
                </Typography>
                <Chip
                  size="small"
                  label={
                    daySlots.length
                      ? t("profile.doctorAvailabilitySlotsCount", {
                          count: daySlots.length,
                        })
                      : t("profile.doctorAvailabilityNotRegistered")
                  }
                  color={daySlots.length ? "success" : "default"}
                  variant={daySlots.length ? "filled" : "outlined"}
                  sx={{ fontWeight: 800 }}
                />
              </Stack>

              {selected && (
                <Box sx={{ mt: 1.5 }} onClick={(e) => e.stopPropagation()}>
                  {daySlots.length === 0 ? (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 1, fontWeight: 600 }}
                    >
                      {t("profile.doctorAvailabilityNoSlots")}
                    </Typography>
                  ) : (
                    <Stack spacing={0.75} sx={{ mb: 1.5 }}>
                      {daySlots.map((slot) => (
                        <Stack
                          key={slot.id}
                          direction="row"
                          alignItems="center"
                          justifyContent="space-between"
                          sx={{
                            px: 1.25,
                            py: 0.75,
                            borderRadius: 1.5,
                            bgcolor: "background.default",
                          }}
                        >
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            {String(slot.start_time).slice(0, 5)} –{" "}
                            {String(slot.end_time).slice(0, 5)}
                          </Typography>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDelete(slot.id)}
                          >
                            <DeleteOutlineRoundedIcon fontSize="small" />
                          </IconButton>
                        </Stack>
                      ))}
                    </Stack>
                  )}

                  <Divider sx={{ mb: 1.5 }} />

                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1}
                    alignItems={{ sm: "center" }}
                  >
                    <TextField
                      label={t("profile.doctorAvailabilityFrom")}
                      type="time"
                      size="small"
                      value={slotForm.start_time}
                      onChange={(e) =>
                        setSlotForm((f) => ({ ...f, start_time: e.target.value }))
                      }
                      InputLabelProps={{ shrink: true }}
                    />
                    <TextField
                      label={t("profile.doctorAvailabilityTo")}
                      type="time"
                      size="small"
                      value={slotForm.end_time}
                      onChange={(e) =>
                        setSlotForm((f) => ({ ...f, end_time: e.target.value }))
                      }
                      InputLabelProps={{ shrink: true }}
                    />
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={
                        saving ? (
                          <CircularProgress size={14} color="inherit" />
                        ) : (
                          <AddRoundedIcon />
                        )
                      }
                      onClick={handleAdd}
                      disabled={saving}
                      sx={{ fontWeight: 800, borderRadius: 2 }}
                    >
                      {t("profile.doctorAvailabilityAddSlot")}
                    </Button>
                  </Stack>
                </Box>
              )}
            </Paper>
          );
        })}
      </Stack>
    </Stack>
  );
}

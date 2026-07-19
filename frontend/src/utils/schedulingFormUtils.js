import { DEFAULT_DEFENSE_DAYS } from "../config/schedulingDays";

export const defaultMandatorySlots = () => [
  { day_of_week: 6, start_time: "08:00", end_time: "15:00" },
];

export const DEFAULT_SLOT_TIMES = { start_time: "08:00", end_time: "15:00" };

export const DEFAULT_DAY_START = "08:00";
export const DEFAULT_DAY_END = "15:00";

/** Local calendar YYYY-MM-DD for today (browser timezone). */
export const todayIsoDate = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

/** Weekdays (0=Sun … 6=Sat) that occur between start and end inclusive. */
export const daysOfWeekInRange = (startIso, endIso) => {
  if (!startIso || !endIso) return [];
  const start = new Date(`${startIso}T00:00:00`);
  const end = new Date(`${endIso}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return [];
  }

  const days = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    const dow = cursor.getDay();
    if (!days.includes(dow)) days.push(dow);
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
};

export const normalizeTimeValue = (value, fallback = DEFAULT_DAY_START) => {
  if (!value) return fallback;
  const text = String(value);
  return text.length >= 5 ? text.slice(0, 5) : fallback;
};

/**
 * When period dates change: validate order, derive allowed days, sync mandatory slots times.
 */
export const applyPeriodDatesToForm = (form, patch) => {
  const next = { ...form, ...patch };
  const start = next.defense_period_start;
  const end = next.defense_period_end;

  if (start && end) {
    if (end < start) {
      next.defense_period_end = start;
    }
    const derived = daysOfWeekInRange(
      next.defense_period_start,
      next.defense_period_end < next.defense_period_start
        ? next.defense_period_start
        : next.defense_period_end,
    );
    if (derived.length > 0) {
      next.allowed_defense_days = derived;
      next.mandatory_slots = syncMandatorySlotsWithDays(derived, [
        {
          day_of_week: derived[0],
          start_time: normalizeTimeValue(next.day_start_time),
          end_time: normalizeTimeValue(next.day_end_time, DEFAULT_DAY_END),
        },
      ]);
    }
  }

  return next;
};

export const applyDayHoursToForm = (form, patch) => {
  const next = {
    ...form,
    ...patch,
    day_start_time: normalizeTimeValue(patch.day_start_time ?? form.day_start_time),
    day_end_time: normalizeTimeValue(patch.day_end_time ?? form.day_end_time, DEFAULT_DAY_END),
  };

  next.mandatory_slots = syncMandatorySlotsWithDays(next.allowed_defense_days || [], [
    {
      day_of_week: 0,
      start_time: next.day_start_time,
      end_time: next.day_end_time,
    },
  ]);

  return next;
};

/** Client-side period validation. Returns error message key or null. */
export const validateStagePeriod = (form) => {
  const start = form.defense_period_start;
  const end = form.defense_period_end;
  if (!start && !end) return null;
  if ((start && !end) || (!start && end)) {
    return "periodBothRequired";
  }
  if (start < todayIsoDate()) {
    return "periodStartPast";
  }
  if (end < start) {
    return "periodEndBeforeStart";
  }
  const startTime = normalizeTimeValue(form.day_start_time);
  const endTime = normalizeTimeValue(form.day_end_time, DEFAULT_DAY_END);
  if (startTime >= endTime) {
    return "dayHoursInvalid";
  }
  return null;
};

export const toggleDefenseDay = (days, dayValue) => {
  if (days.includes(dayValue)) {
    return days.filter((d) => d !== dayValue);
  }
  return [...days, dayValue].sort((a, b) => a - b);
};

export const isMandatoryStage = (stage) =>
  stage?.availability_mode === "mandatory" || stage?.stage_key === "final_defense";

export const syncMandatorySlotsWithDays = (days, existingSlots = []) => {
  const sorted = [...days].sort((a, b) => a - b);
  const template = existingSlots[0] || DEFAULT_SLOT_TIMES;

  return sorted.map((day) => {
    const existing = existingSlots.find((s) => s.day_of_week === day);
    return existing
      ? {
          day_of_week: day,
          start_time: normalizeTimeValue(existing.start_time, template.start_time),
          end_time: normalizeTimeValue(existing.end_time, template.end_time),
        }
      : {
          day_of_week: day,
          start_time: normalizeTimeValue(template.start_time),
          end_time: normalizeTimeValue(template.end_time, DEFAULT_DAY_END),
        };
  });
};

export const toggleMandatoryDayInForm = (form, dayValue) => {
  const newDays = toggleDefenseDay(form.allowed_defense_days, dayValue);

  return {
    ...form,
    allowed_defense_days: newDays,
    mandatory_slots: syncMandatorySlotsWithDays(newDays, form.mandatory_slots),
  };
};

export const updateMandatorySlotTime = (form, dayValue, field, value) => ({
  ...form,
  mandatory_slots: form.mandatory_slots.map((slot) =>
    slot.day_of_week === dayValue ? { ...slot, [field]: value } : slot,
  ),
});

export const emptyStageForm = () => ({
  name: "",
  duration_minutes: 60,
  default_committee_size: 3,
  defense_period_start: "",
  defense_period_end: "",
  allowed_defense_days: DEFAULT_DEFENSE_DAYS,
  day_start_time: DEFAULT_DAY_START,
  day_end_time: DEFAULT_DAY_END,
  mandatory_slots: defaultMandatorySlots(),
});

export const stageFormFromStage = (stage) => {
  const days = stage.allowed_defense_days?.length
    ? stage.allowed_defense_days
    : DEFAULT_DEFENSE_DAYS;
  const dayStart = normalizeTimeValue(stage.day_start_time, DEFAULT_DAY_START);
  const dayEnd = normalizeTimeValue(stage.day_end_time, DEFAULT_DAY_END);
  const rawSlots = stage.mandatory_slots?.length
    ? stage.mandatory_slots
    : [{ day_of_week: days[0], start_time: dayStart, end_time: dayEnd }];

  return {
    name: stage.name,
    duration_minutes: stage.duration_minutes,
    default_committee_size: stage.default_committee_size,
    defense_period_start:
      stage.defense_period_start?.slice?.(0, 10) || stage.defense_period_start || "",
    defense_period_end:
      stage.defense_period_end?.slice?.(0, 10) || stage.defense_period_end || "",
    allowed_defense_days: days,
    day_start_time: dayStart,
    day_end_time: dayEnd,
    mandatory_slots: syncMandatorySlotsWithDays(days, rawSlots),
  };
};

export const WORKFLOW_STEPS = [
  { id: "stages", labelKey: "scheduling.workflow.stages", captionKey: "scheduling.workflow.stagesCaption" },
  { id: "rooms", labelKey: "scheduling.workflow.rooms", captionKey: "scheduling.workflow.roomsCaption" },
  { id: "generate", labelKey: "scheduling.workflow.generate", captionKey: "scheduling.workflow.generateCaption" },
];

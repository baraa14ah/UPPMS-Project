/** Scheduling day labels shared across admin and supervisor UIs. */

const DAY_KEYS = {
  0: "sunday",
  1: "monday",
  2: "tuesday",
  3: "wednesday",
  4: "thursday",
  5: "friday",
  6: "saturday",
};

export const DAY_ORDER = [6, 0, 1, 2, 3, 4, 5];

/** @deprecated Use getDayOptions(t) for locale-aware labels */
export const ALL_DAY_OPTIONS = DAY_ORDER.map((value) => ({
  value,
  label: String(value),
}));

export const getDayOptions = (t) =>
  DAY_ORDER.map((value) => ({
    value,
    label: t(`scheduling.days.${DAY_KEYS[value]}`),
  }));

export const dayLabel = (dayOfWeek, t) => {
  const key = DAY_KEYS[dayOfWeek];
  if (!key) return String(dayOfWeek);
  if (typeof t === "function") {
    return t(`scheduling.days.${key}`);
  }
  return ALL_DAY_OPTIONS.find((d) => d.value === dayOfWeek)?.label ?? String(dayOfWeek);
};

export const dayOptionsForValues = (dayValues = [], t) => {
  const options = typeof t === "function" ? getDayOptions(t) : ALL_DAY_OPTIONS;
  return options.filter((d) => dayValues.includes(d.value));
};

/** Suggested default when admin creates a new stage (editable). */
export const DEFAULT_DEFENSE_DAYS = [6, 0, 1, 2];

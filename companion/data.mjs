// Kept deliberately small: the companion records data; the desktop owns the model.
export const METRICS = [
  { id: "weight", label: "Poids", unit: "kg", max: 700, min: 0.1 },
  { id: "sleep", label: "Sommeil", unit: "h", max: 24 },
  { id: "steps", label: "Pas", unit: "pas", max: 200000, integer: true },
  { id: "stress", label: "Stress déclaré", unit: "/10", max: 10 },
  { id: "exercise", label: "Sport", unit: "min", max: 1440, event: true },
  { id: "walk", label: "Marche", unit: "min", max: 1440, event: true },
  { id: "reading", label: "Lecture", unit: "min", max: 1440, event: true },
  {
    id: "screen",
    label: "Réseaux sociaux / écran",
    unit: "min",
    max: 1440,
    event: true,
  },
  {
    id: "tobacco",
    label: "Tabac",
    unit: "cigarette",
    max: 100,
    event: true,
    integer: true,
  },
  { id: "vaping", label: "Vapotage", unit: "min", max: 1440, event: true },
  {
    id: "screen_evening",
    label: "Écran le soir",
    unit: "min",
    max: 1440,
    event: true,
  },
  {
    id: "sedentary",
    label: "Temps sédentaire",
    unit: "min",
    max: 1440,
    event: true,
  },
];

/** @spec TECH-COMPANION-DATA */
export function localDate(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

/** @spec TECH-COMPANION-DATA */
export function localTime(now = new Date()) {
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

/** @spec TECH-COMPANION-DATA */
export function observationOperation({
  id,
  profileId,
  metricId,
  date,
  at,
  value,
  createdAt,
}) {
  const metric = METRICS.find((m) => m.id === metricId);
  const numeric = Number(value);
  if (
    !id ||
    !profileId ||
    !metric ||
    !validDate(date) ||
    value === "" ||
    value == null ||
    !Number.isFinite(numeric) ||
    numeric < (metric.min ?? 0) ||
    numeric > metric.max ||
    (metric.integer && !Number.isInteger(numeric)) ||
    (metric.event && numeric > 0 && !/^([01]\d|2[0-3]):[0-5]\d$/.test(at ?? ""))
  ) {
    throw new Error("Vérifie la date, l’heure et la valeur.");
  }
  return {
    id,
    kind: "observation",
    profileId,
    createdAt,
    payload: {
      id,
      date,
      metric: metric.id,
      value: numeric,
      unit: metric.unit,
      source: "Compagnon mobile",
      batchId: null,
      at: metric.event && numeric > 0 ? at : null,
      durationMinutes:
        metric.event && metric.unit === "min" && numeric > 0 ? numeric : null,
      context: null,
    },
  };
}

/** @spec TECH-COMPANION-DATA */
export function habitOperation({
  id,
  profileId,
  habitId,
  date,
  answer,
  createdAt,
}) {
  if (
    !id ||
    !profileId ||
    !habitId ||
    !validDate(date) ||
    typeof answer !== "boolean"
  ) {
    throw new Error("Réponse d’habitude invalide.");
  }
  return {
    id,
    kind: "habit-answer",
    profileId,
    createdAt,
    payload: { date, habitId, answer, at: createdAt },
  };
}

/** @spec TECH-COMPANION-DATA */
function validDate(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const [year, month, day] = date.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() + 1 === month &&
    parsed.getUTCDate() === day
  );
}

/** @spec TECH-COMPANION-DATA */
export function applySyncResult(operations, result) {
  const accepted = new Set(result.accepted ?? []);
  const issues = new Map([
    ...(result.conflicts ?? []).map((issue) => [
      issue.id,
      { status: "conflict", reason: issue.reason },
    ]),
    ...(result.rejected ?? []).map((issue) => [
      issue.id,
      { status: "rejected", reason: issue.reason },
    ]),
  ]);
  return operations
    .filter((operation) => !accepted.has(operation.id))
    .map((operation) => ({ ...operation, ...issues.get(operation.id) }));
}

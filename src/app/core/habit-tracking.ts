import { HabitDay, HabitDefinition } from "./models";

/** @spec TECH-FRONTEND-TRACKING-101 */
export function localDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/** @spec TECH-FRONTEND-TRACKING-101 */
export function shiftDate(key: string, days: number): string {
  const [year, month, day] = key.split("-").map(Number);
  const date = new Date(year, month - 1, day, 12);
  date.setDate(date.getDate() + days);
  return localDate(date);
}

/** @spec TECH-FRONTEND-TRACKING-101 */
export function activeHabits(habits: HabitDefinition[], date: string) {
  return habits.filter(
    (habit) =>
      habit.startDate <= date &&
      (habit.archivedAt === null || habit.archivedAt > date),
  );
}

/** @spec TECH-FRONTEND-TRACKING-101 */
export function evaluateHabitDay(
  habits: HabitDefinition[],
  day: HabitDay | undefined,
  date: string,
) {
  const active = activeHabits(habits, date);
  const answers = day?.answers ?? {};
  const answered = active.filter((habit) =>
    Object.prototype.hasOwnProperty.call(answers, habit.id),
  );
  const matched = answered.filter(
    (habit) => answers[habit.id] === (habit.kind === "good"),
  ).length;
  const preview = answered.length
    ? Math.round((matched / answered.length) * 100)
    : null;
  const complete = active.length > 0 && answered.length === active.length;
  return {
    total: active.length,
    answered: answered.length,
    matched,
    preview,
    validated: complete && !!day?.validatedAt,
    score: complete && day?.validatedAt ? preview : null,
  };
}

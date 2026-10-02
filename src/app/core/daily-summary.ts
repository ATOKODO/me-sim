import { HABIT_METRICS, Observation, TargetDay } from "./models";
import { shiftDate } from "./habit-tracking";

export function timelineEvents(observations: Observation[], now: number) {
  const start = now - 24 * 60 * 60 * 1000;
  return observations
    .filter(
      (o) =>
        o.at && o.value > 0 && HABIT_METRICS.some((m) => m.id === o.metric),
    )
    .map((observation) => ({
      observation,
      time: new Date(observation.date + "T" + observation.at + ":00"),
    }))
    .filter(
      ({ time }) =>
        Number.isFinite(time.getTime()) &&
        time.getTime() >= start &&
        time.getTime() <= now,
    )
    .sort((a, b) => a.time.getTime() - b.time.getTime());
}

export function dailyRecap(
  observations: Observation[],
  date: string,
  now: number,
) {
  const rows = observations.filter(
    (o) =>
      o.date === date &&
      (!o.at || new Date(o.date + "T" + o.at + ":00").getTime() <= now),
  );
  const sum = (...metrics: string[]) => {
    const known = rows.filter((o) => metrics.includes(o.metric));
    return known.length
      ? Math.round(known.reduce((n, o) => n + o.value, 0) * 10) / 10
      : null;
  };
  const dailyActivity = rows.find((o) => o.metric === "activity")?.value;
  return {
    events: rows.filter(
      (o) =>
        o.at && o.value > 0 && HABIT_METRICS.some((m) => m.id === o.metric),
    ).length,
    // The declared daily total already includes individual walks/exercise sessions.
    activeMinutes: dailyActivity ?? sum("exercise", "walk"),
    sleepHours: rows.find((o) => o.metric === "sleep")?.value ?? null,
    socialMinutes: sum("social"),
    screenAndGamingMinutes: sum("screen", "gaming"),
    alcohol: sum("alcohol"),
    tobaccoCigarettes: sum("tobacco"),
    vapingMinutes: sum("vaping"),
    eveningScreenMinutes: sum("screen_evening"),
    sedentaryMinutes: sum("sedentary"),
  };
}

export function targetTrajectory(
  observations: Observation[],
  target: TargetDay,
  today: string,
) {
  return Array.from({ length: 7 }, (_, index) => {
    const date = shiftDate(today, index - 6);
    const rows = observations.filter((o) => o.date === date);
    const latest = (metric: string) =>
      rows.find((o) => o.metric === metric)?.value;
    const sum = (metric: string) => {
      const found = rows.filter((o) => o.metric === metric);
      return found.length ? found.reduce((n, o) => n + o.value, 0) : undefined;
    };
    const actuals: [number | undefined, number, "high" | "low"][] = [
      [latest("sleep"), target.sleepHours, "low"],
      [latest("steps"), target.steps, "low"],
      [latest("activity"), target.activityMinutes, "low"],
      [sum("exercise"), target.exerciseMinutes, "low"],
      [sum("walk"), target.walkMinutes, "low"],
      [sum("social"), target.socialMinutes, "low"],
      [sum("screen"), target.screenMinutes, "high"],
      [sum("gaming"), target.gamingMinutes, "high"],
      [sum("alcohol"), target.alcoholGlasses, "high"],
      [sum("tobacco"), target.tobaccoCigarettes, "high"],
      [sum("vaping"), target.vapingMinutes, "high"],
      [sum("screen_evening"), target.eveningScreenMinutes, "high"],
      [sum("sedentary"), target.sedentaryMinutes, "high"],
    ];
    const errors = actuals
      .filter(([actual]) => actual !== undefined)
      .map(([actual, goal, direction]) => {
        const delta =
          direction === "low"
            ? Math.max(0, goal - actual!)
            : Math.max(0, actual! - goal);
        // Zero means avoidance: any positive amount deviates fully for this dimension.
        return goal > 0 ? Math.min(1, delta / goal) : delta > 0 ? 1 : 0;
      });
    return {
      date,
      deviation: errors.length
        ? Math.round((errors.reduce((a, b) => a + b, 0) / errors.length) * 100)
        : null,
      coverage: errors.length,
      total: actuals.length,
      actual: rows.length,
      hasData: errors.length > 0,
    };
  });
}

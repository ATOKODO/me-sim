import { expect, test } from "@playwright/test";
import {
  dailyRecap,
  targetTrajectory,
  timelineEvents,
} from "../src/app/core/daily-summary";
import { DEFAULT_TARGET, Observation } from "../src/app/core/models";
const now = new Date("2026-10-01T12:00:00").getTime();
/** @spec TECH-TOOLING-TESTS */
function row(
  metric: Observation["metric"],
  value: number,
  date = "2026-10-01",
  at: string | null = null,
): Observation {
  return {
    id: metric + date + at,
    profileId: "p",
    date,
    metric,
    value,
    unit: "test",
    source: "test",
    batchId: null,
    at,
    durationMinutes: at ? value : null,
  };
}
test("daily recap excludes past days and distinguishes missing data from declared zero", () => {
  const recap = dailyRecap(
    [row("activity", 90, "2026-09-20"), row("sleep", 8, "2026-09-30")],
    "2026-10-01",
    now,
  );
  expect(recap.activeMinutes).toBeNull();
  expect(recap.sleepHours).toBeNull();
  expect(recap.tobaccoCigarettes).toBeNull();
  expect(recap.alcohol).toBeNull();
  const zero = dailyRecap([row("vaping", 0)], "2026-10-01", now);
  expect(zero.vapingMinutes).toBe(0);
  expect(zero.events).toBe(0);
});
test("declared activity total includes its component sessions and future events stay outside recap", () => {
  const rows = [
    row("activity", 60),
    row("walk", 30, "2026-10-01", "08:00"),
    row("exercise", 30, "2026-10-01", "09:00"),
    row("exercise", 100, "2026-10-01", "18:00"),
  ];
  expect(dailyRecap(rows, "2026-10-01", now).activeMinutes).toBe(60);
  expect(dailyRecap(rows.slice(1), "2026-10-01", now).activeMinutes).toBe(60);
});
test("timeline excludes declared zero and expired events with an explicit clock input", () => {
  const rows = [
    row("vaping", 0, "2026-10-01", "08:00"),
    row("walk", 30, "2026-09-30", "12:01"),
  ];
  expect(timelineEvents(rows, now)).toHaveLength(1);
  expect(timelineEvents(rows, now + 32 * 60_000)).toHaveLength(0);
});
test("trajectory reports data coverage and zero goals use the same rule for each unit", () => {
  const partial = targetTrajectory(
    [row("sleep", 8)],
    DEFAULT_TARGET,
    "2026-10-01",
  ).at(-1)!;
  expect(partial.deviation).toBe(0);
  expect(partial.coverage).toBe(1);
  expect(partial.total).toBe(13);
  const unscored = targetTrajectory(
    [row("weight", 70)],
    DEFAULT_TARGET,
    "2026-10-01",
  ).at(-1)!;
  expect(unscored.deviation).toBeNull();
  expect(unscored.coverage).toBe(0);
  for (const metric of ["tobacco", "alcohol", "vaping"] as const) {
    expect(
      targetTrajectory([row(metric, 1)], DEFAULT_TARGET, "2026-10-01").at(-1)!
        .deviation,
    ).toBe(100);
    expect(
      targetTrajectory([row(metric, 0)], DEFAULT_TARGET, "2026-10-01").at(-1)!
        .deviation,
    ).toBe(0);
  }
});

import { timelineEvents } from "../src/app/core/daily-summary";
import { dailyRecap, targetTrajectory } from "../src/app/core/daily-summary";
import { DEFAULT_TARGET } from "../src/app/core/models";
import { localStamp } from "../src/app/core/ghost";
import { test, expect } from "@playwright/test";
import {
  applyGhostMutation,
  dominant,
  compareSchedule,
  frequencyBins,
  eventsAt,
  eventsForDay,
  frequency,
  plannedEvents,
  recorded,
  referenceDates,
} from "../src/app/core/ghost";
import type {
  Observation,
  RoutineVersion,
  Snapshot,
} from "../src/app/core/models";
/** @spec TECH-TOOLING-TESTS */
const row = (
  id: string,
  date: string,
  at: string,
  metric: Observation["metric"],
  value: number,
): Observation => ({
  id,
  profileId: "p",
  date,
  at,
  metric,
  value,
  unit: metric === "tobacco" ? "cigarette" : "min",
  source: "Fictional test",
  batchId: null,
  durationMinutes: metric === "tobacco" ? null : value,
});
test("ghost intervals clip to now, split midnight, preserve points and union overlapping durations", () => {
  const now = new Date("2026-10-21T18:40:00").getTime();
  const observations = [
    row("cross", "2026-10-20", "23:40", "walk", 60),
    row("a", "2026-10-21", "18:00", "screen", 60),
    row("b", "2026-10-21", "18:20", "screen", 60),
    row("point", "2026-10-21", "18:30", "tobacco", 2),
    row("future", "2026-10-21", "20:00", "walk", 30),
  ];
  const events = eventsForDay(observations, "2026-10-21", now);
  expect(recorded(events, 1440, { metric: "walk" })).toBe(40);
  expect(recorded(events, 1440, { metric: "screen" })).toBe(40);
  expect(recorded(events, 1440, { metric: "tobacco" })).toBe(2);
  expect(events.some((e) => e.id.startsWith("future"))).toBe(false);
  expect(eventsAt(events, 720)).toEqual([]);
});
test("frequency exposes coverage and does not create activities in gaps or break ties", () => {
  const now = new Date("2026-10-22T00:00:00").getTime();
  const one = eventsForDay(
    [row("a", "2026-10-21", "18:00", "screen", 60)],
    "2026-10-21",
    now,
  );
  const two = eventsForDay(
    [row("b", "2026-10-21", "18:00", "walk", 60)],
    "2026-10-21",
    now,
  );
  expect(frequency([one, two, []], 1120, { metric: "screen" })).toEqual({
    known: 2,
    matched: 1,
    total: 3,
  });
  expect(dominant([one, two, []], 1120)).toBeNull();
  expect(frequency([one, two, []], 720, { metric: "screen" })).toEqual({
    known: 0,
    matched: 0,
    total: 3,
  });
  expect(referenceDates("2026-10-21", 7, "weekend")).toEqual([
    "2026-10-18",
    "2026-10-17",
  ]);
});
test("Target versions retain historical plans, change weekdays and allow an empty suspension", () => {
  const plan: RoutineVersion = {
    id: "v1",
    routineId: "r",
    name: "Routine",
    effectiveFrom: "2026-10-01",
    weekdays: [1, 2, 3, 4, 5],
    blocks: [
      {
        id: "b",
        metric: "walk",
        label: "Walk",
        habitId: null,
        startMinute: 1080,
        durationMinutes: 30,
      },
    ],
  };
  const newer = { ...plan, id: "v2", effectiveFrom: "2026-10-21", blocks: [] };
  expect(plannedEvents([plan, newer], "2026-10-20")).toHaveLength(1);
  expect(plannedEvents([plan, newer], "2026-10-21")).toHaveLength(0);
  expect(plannedEvents([plan], "2026-10-18")).toHaveLength(0);
});
test("named activities remain distinct and an active session supplies only elapsed time", () => {
  const now = new Date("2026-10-21T18:40:00").getTime();
  const ig = {
    ...row("ig", "2026-10-21", "18:00", "screen", 20),
    context: {
      label: "Instagram",
      habitId: null,
      start: null,
      end: null,
      timeZone: "Europe/Paris",
    },
  };
  const events = eventsForDay([ig], "2026-10-21", now, {
    id: "run",
    metric: "walk",
    label: "Outside",
    habitId: null,
    start: new Date("2026-10-21T18:30:00").toISOString(),
    timeZone: "Europe/Paris",
  });
  expect(recorded(events, 1440, { metric: "screen", label: "Instagram" })).toBe(
    20,
  );
  expect(recorded(events, 1440, { metric: "screen", label: "YouTube" })).toBe(
    0,
  );
  expect(recorded(events, 1440, { metric: "walk" })).toBe(10);
});
test("preview finishes a session atomically and keeps other profiles and answers separate", () => {
  const snapshot = {
    version: 1,
    profiles: [
      {
        id: "p",
        name: "Test",
        birthDate: null,
        sex: null,
        heightCm: null,
        color: "#bde883",
        demo: false,
        habits: [
          {
            id: "h",
            label: "Walk",
            kind: "good",
            startDate: "2020-01-01",
            archivedAt: null,
            metric: "walk",
          },
        ],
      },
    ],
    observations: [],
    habitDays: [],
    batches: [],
    scenarios: [],
    runs: [],
    settings: { animations: false, jitter: false },
  } as Snapshot;
  const start = new Date(Date.now() - 600000).toISOString();
  applyGhostMutation(snapshot, {
    type: "startActivity",
    value: {
      profileId: "p",
      session: {
        id: "s",
        metric: "walk",
        label: "Walk",
        habitId: "h",
        start,
        timeZone: "UTC",
      },
    },
  });
  expect(() =>
    applyGhostMutation(snapshot, {
      type: "finishActivity",
      value: {
        profileId: "p",
        sessionId: "wrong",
        end: new Date().toISOString(),
      },
    }),
  ).toThrow();
  expect(snapshot.observations).toHaveLength(0);
  applyGhostMutation(snapshot, {
    type: "finishActivity",
    value: { profileId: "p", sessionId: "s", end: new Date().toISOString() },
  });
  expect(snapshot.profiles[0].ghost?.active).toBeNull();
  expect(snapshot.observations).toHaveLength(1);
  expect(snapshot.habitDays?.[0].answers.h).toBe(true);
  expect(snapshot.habitDays?.[0].validatedAt).toBeNull();
});
test("absolute durations remain correct through a clock offset change", () => {
  const original = process.env.TZ;
  process.env.TZ = "Europe/Paris";
  try {
    const observation = {
      ...row("dst", "2026-10-25", "02:30", "walk", 60),
      context: {
        label: "Walk",
        habitId: null,
        start: "2026-10-25T02:30:00+02:00",
        end: "2026-10-25T02:30:00+01:00",
        timeZone: "Europe/Paris",
      },
    };
    const events = eventsForDay(
      [observation],
      "2026-10-25",
      Date.parse("2026-10-26T00:00:00Z"),
    );
    expect(events.length).toBe(2);
    // Timeline unions the repeated local minutes; source quantity retains 60 elapsed minutes.
    expect(recorded(events, 1440, { metric: "walk" })).toBe(60);
    expect(events.every((e) => e.start >= 120 && e.end <= 180)).toBe(true);
  } finally {
    if (original === undefined) delete process.env.TZ;
    else process.env.TZ = original;
  }
});

test("short activities contribute to frequency bins and planned slots expose timing margins", () => {
  const events = eventsForDay(
    [row("short", "2026-10-21", "18:00", "walk", 5)],
    "2026-10-21",
    new Date("2026-10-21T20:00:00").getTime(),
  );
  expect(
    frequencyBins([events], { metric: "walk" }).find((e) => e.start === 1080)
      ?.value,
  ).toBe(1);
  const plan = {
    id: "plan",
    metric: "walk" as const,
    label: "Walk",
    start: 1070,
    end: 1100,
    value: 30,
    point: false,
    planned: true,
    toleranceMinutes: 15,
  };
  const [comparison] = compareSchedule(events, [plan], 1200);
  expect(comparison.delay).toBe(10);
  expect(comparison.withinTolerance).toBe(true);
  expect(comparison.status).toBe("partial");
  expect(comparison.durationDelta).toBe(-25);
  expect(compareSchedule([], [plan], 1060)[0].status).toBe("upcoming");
  expect(compareSchedule([], [plan], 1200)[0].status).toBe("unknown");
});

test("unrelated earlier activities are not assigned to an evening Target slot", () => {
  const actual = [
    {
      id: "old",
      metric: "walk" as const,
      label: "Walk",
      start: 900,
      end: 930,
      point: false,
      value: 30,
    },
  ];
  const plans = [
    {
      id: "target",
      metric: "walk" as const,
      label: "Walk",
      start: 1080,
      end: 1110,
      point: false,
      value: 30,
      toleranceMinutes: 15,
    },
  ];
  expect(compareSchedule(actual, plans, 1200)[0].status).toBe("unknown");
});

test("overnight sessions keep journal identity but split daily totals and Target deviation", () => {
  const start = new Date("2026-10-20T23:40:00"),
    end = new Date("2026-10-21T00:40:00"),
    now = new Date("2026-10-21T01:00:00").getTime();
  const observation = {
    ...row("night", "2026-10-20", "23:40", "walk", 60),
    context: {
      label: "Walk",
      habitId: null,
      start: localStamp(start),
      end: localStamp(end),
      timeZone: "Europe/Paris",
    },
  };
  expect(dailyRecap([observation], "2026-10-20", now).activeMinutes).toBe(20);
  expect(dailyRecap([observation], "2026-10-21", now).activeMinutes).toBe(40);
  const trajectory = targetTrajectory(
    [observation],
    DEFAULT_TARGET,
    "2026-10-21",
    now,
  );
  expect(trajectory.at(-2)?.deviation).toBe(33);
  expect(trajectory.at(-1)?.deviation).toBe(0);
});

test("point habits contribute occurrences to frequency without becoming durations", () => {
  const now = new Date("2026-10-22T00:00:00").getTime(),
    events = eventsForDay(
      [row("point", "2026-10-21", "18:00", "tobacco", 2)],
      "2026-10-21",
      now,
    );
  expect(frequency([events, []], 1080, { metric: "tobacco" })).toEqual({
    known: 1,
    matched: 1,
    total: 2,
  });
  expect(recorded(events, 1200, { metric: "tobacco" })).toBe(2);
  expect(recorded(events, 1200)).toBe(0);
});

test("24-hour replay orders absolute sessions independently of repeated wall times", () => {
  const first = {
      ...row("first", "2026-10-25", "02:30", "walk", 10),
      context: {
        label: "Walk",
        habitId: null,
        start: "2026-10-25T02:30:00+02:00",
        end: "2026-10-25T02:40:00+02:00",
        timeZone: "Europe/Paris",
      },
    },
    second = {
      ...first,
      id: "second",
      context: {
        ...first.context,
        start: "2026-10-25T02:30:00+01:00",
        end: "2026-10-25T02:40:00+01:00",
      },
    };
  const events = timelineEvents(
    [second, first],
    Date.parse("2026-10-25T03:00:00Z"),
  );
  expect(events.map((e) => e.observation.id)).toEqual(["first", "second"]);
  expect(events[1].time.getTime() - events[0].time.getTime()).toBe(3600000);
});

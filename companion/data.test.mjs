import test from "node:test";
import assert from "node:assert/strict";
import {
  applySyncResult,
  habitOperation,
  observationOperation,
} from "./data.mjs";

test("offline observation keeps a stable id and the desktop unit", () => {
  const input = {
    id: "op-1",
    profileId: "profile-1",
    metricId: "exercise",
    date: "2026-10-23",
    at: "08:30",
    value: "35",
    createdAt: "2026-10-23T08:30:00Z",
  };
  const operation = observationOperation(input);
  assert.equal(operation.payload.id, "op-1");
  assert.equal(operation.payload.durationMinutes, 35);
  assert.equal(operation.payload.unit, "min");
  assert.equal(operation.profileId, "profile-1");
});

test("invalid event time and out-of-range value do not enter the queue", () => {
  const base = {
    id: "op-1",
    profileId: "p",
    metricId: "exercise",
    date: "2026-10-23",
    at: "",
    value: 30,
    createdAt: "2026-10-23T08:30:00Z",
  };
  assert.throws(() => observationOperation(base));
  assert.throws(() =>
    observationOperation({ ...base, at: "08:30", value: 1441 }),
  );
  assert.throws(() =>
    observationOperation({ ...base, metricId: "tobacco", value: 0.5 }),
  );
  assert.throws(() =>
    observationOperation({ ...base, at: "08:30", value: "" }),
  );
  assert.throws(() =>
    observationOperation({ ...base, date: "2026-02-31", at: "08:30" }),
  );
});

test("habit answer is a per-habit patch and acknowledgements only remove accepted items", () => {
  const habit = habitOperation({
    id: "h1",
    profileId: "p",
    habitId: "reading",
    date: "2026-10-23",
    answer: true,
    createdAt: "2026-10-23T08:30:00Z",
  });
  assert.deepEqual(habit.payload, {
    date: "2026-10-23",
    habitId: "reading",
    answer: true,
    at: "2026-10-23T08:30:00Z",
  });
  const pending = applySyncResult([habit, { id: "h2" }, { id: "h3" }], {
    accepted: ["h1"],
    conflicts: [{ id: "h2", reason: "Conflit" }],
    rejected: [{ id: "h3", reason: "Invalide" }],
  });
  assert.deepEqual(
    pending.map(({ id, status }) => [id, status]),
    [
      ["h2", "conflict"],
      ["h3", "rejected"],
    ],
  );
});

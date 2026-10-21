import {
  ActivitySession,
  HABIT_METRICS,
  Metric,
  Mutation,
  Observation,
  RoutineVersion,
  Snapshot,
  uid,
} from "./models";
import { localDate, shiftDate } from "./habit-tracking";

export interface GhostEvent {
  id: string;
  metric: Metric;
  label: string;
  start: number;
  end: number;
  value: number;
  point: boolean;
  running?: boolean;
  planned?: boolean;
  frequency?: number;
  absoluteStart?: number;
  absoluteEnd?: number;
  habitId?: string | null;
  toleranceMinutes?: number;
}
export function minuteOf(date: Date) {
  return date.getHours() * 60 + date.getMinutes();
}
export function timeLabel(minute: number) {
  return `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(Math.floor(minute % 60)).padStart(2, "0")}`;
}
/** RFC3339 includes the original wall-clock offset; duration uses absolute instants. */
export function localStamp(date = new Date()) {
  const offset = -date.getTimezoneOffset(),
    sign = offset < 0 ? "-" : "+";
  return `${localDate(date)}T${timeLabel(minuteOf(date))}:${String(date.getSeconds()).padStart(2, "0")}${sign}${timeLabel(Math.abs(offset))}`;
}
export function defaultLabel(metric: Metric) {
  return HABIT_METRICS.find((m) => m.id === metric)?.label ?? metric;
}
export function eventLabel(o: Observation) {
  return o.context?.label || defaultLabel(o.metric);
}
export function eventsForDay(
  observations: Observation[],
  date: string,
  now: number,
  active?: ActivitySession | null,
): GhostEvent[] {
  const startDay = new Date(date + "T00:00:00").getTime();
  const endDay = new Date(shiftDate(date, 1) + "T00:00:00").getTime();
  const list: GhostEvent[] = [];
  const include = (
    id: string,
    metric: Metric,
    label: string,
    start: number,
    end: number,
    value: number,
    point: boolean,
    running = false,
    habitId: string | null = null,
  ) => {
    end = Math.min(end, now);
    if (
      start > now ||
      start >= endDay ||
      end < startDay ||
      (!point && end <= Math.max(start, startDay))
    )
      return;
    // Split at local clock discontinuities. A repeated DST minute remains one wall-clock minute.
    if (point) {
      if (start >= startDay && start < endDay)
        list.push({
          id,
          metric,
          label,
          start: minuteOf(new Date(start)),
          end: minuteOf(new Date(start)),
          value,
          point: true,
          habitId,
        });
      return;
    }
    let previous: GhostEvent | undefined;
    for (
      let instant = Math.max(start, startDay);
      instant < Math.min(end, endDay);
    ) {
      const next = Math.min(
        Math.floor(instant / 900000) * 900000 + 900000,
        end,
        endDay,
      );
      const wall =
        minuteOf(new Date(instant)) + new Date(instant).getSeconds() / 60;
      const wallEnd = wall + (next - instant) / 60000;
      if (previous && Math.abs(previous.end - wall) < 0.001) {
        previous.end = wallEnd;
        previous.absoluteEnd = next;
      } else {
        previous = {
          id: id + ":" + instant,
          metric,
          label,
          start: wall,
          end: wallEnd,
          value,
          point: false,
          running,
          habitId,
          absoluteStart: instant,
          absoluteEnd: next,
        };
        list.push(previous);
      }
      instant = next;
    }
  };
  for (const o of observations) {
    if (!HABIT_METRICS.some((m) => m.id === o.metric) || !o.at || o.value <= 0)
      continue;
    const start = o.context?.start
      ? Date.parse(o.context.start)
      : new Date(o.date + "T" + o.at + ":00").getTime();
    if (!Number.isFinite(start)) continue;
    const duration = o.durationMinutes ?? (o.unit === "min" ? o.value : 0);
    const end = o.context?.end
      ? Date.parse(o.context.end)
      : start + duration * 60000;
    if (Number.isFinite(end))
      include(
        o.id,
        o.metric,
        eventLabel(o),
        start,
        end,
        o.value,
        duration === 0,
        false,
        o.context?.habitId ?? null,
      );
  }
  if (active)
    include(
      active.id,
      active.metric,
      active.label,
      Date.parse(active.start),
      now,
      0,
      false,
      true,
      active.habitId,
    );
  return list.sort((a, b) => a.start - b.start);
}
export function routineForDay(
  plans: RoutineVersion[],
  date: string,
): RoutineVersion[] {
  const latest = new Map<string, RoutineVersion>();
  for (const plan of plans)
    if (
      plan.effectiveFrom <= date &&
      (!latest.has(plan.routineId) ||
        latest.get(plan.routineId)!.effectiveFrom <= plan.effectiveFrom)
    )
      latest.set(plan.routineId, plan);
  const weekday = new Date(date + "T12:00:00").getDay();
  return [...latest.values()].filter((p) => p.weekdays.includes(weekday));
}
export function plannedEvents(
  plans: RoutineVersion[],
  date: string,
): GhostEvent[] {
  return routineForDay(plans, date).flatMap((plan) =>
    plan.blocks.map((b) => ({
      id: b.id,
      metric: b.metric,
      label: b.label,
      start: b.startMinute,
      end: b.startMinute + b.durationMinutes,
      value: b.durationMinutes,
      point: false,
      planned: true,
      habitId: b.habitId,
      toleranceMinutes: b.toleranceMinutes ?? 0,
    })),
  );
}
export function eventsAt(events: GhostEvent[], minute: number) {
  return events.filter((e) =>
    e.point
      ? Math.floor(e.start) === Math.floor(minute)
      : e.start <= minute && (e.end > minute || (e.running && e.end >= minute)),
  );
}
export function referenceDates(
  today: string,
  days: number,
  kind: "all" | "workdays" | "weekend",
) {
  return Array.from({ length: days }, (_, i) =>
    shiftDate(today, -i - 1),
  ).filter((date) => {
    const day = new Date(date + "T12:00:00").getDay(),
      weekend = day === 0 || day === 6;
    return kind === "all" || (kind === "weekend" ? weekend : !weekend);
  });
}
export interface Focus {
  metric: Metric;
  label?: string;
}
export function matches(e: GhostEvent, focus: Focus) {
  return e.metric === focus.metric && (!focus.label || e.label === focus.label);
}
function unionLength(intervals: [number, number][]) {
  let total = 0,
    end = -1;
  for (const [a, b] of intervals.sort((a, b) => a[0] - b[0])) {
    if (b <= a) continue;
    total += Math.max(0, b - Math.max(a, end));
    end = Math.max(end, b);
  }
  return Math.round(total * 10) / 10;
}
export function recorded(events: GhostEvent[], minute: number, focus?: Focus) {
  const found = events.filter(
    (e) => (!focus || matches(e, focus)) && e.start <= minute,
  );
  if (focus && HABIT_METRICS.find((m) => m.id === focus.metric)?.unit !== "min")
    return found.filter((e) => e.point).reduce((n, e) => n + e.value, 0);
  const intervals = found
    .filter((e) => !e.point)
    .map((e) => {
      const end = Math.min(e.end, minute);
      return e.absoluteStart !== undefined
        ? ([e.absoluteStart, e.absoluteStart + (end - e.start) * 60000] as [
            number,
            number,
          ])
        : ([e.start * 60000, end * 60000] as [number, number]);
    });
  return Math.round((unionLength(intervals) / 60000) * 10) / 10;
}
export function frequency(days: GhostEvent[][], minute: number, focus: Focus) {
  const pointFocus =
    HABIT_METRICS.find((m) => m.id === focus.metric)?.unit !== "min";
  const known = days.filter((events) =>
    eventsAt(events, minute).some((e) => !e.point || pointFocus),
  );
  return {
    known: known.length,
    matched: known.filter((events) =>
      eventsAt(events, minute).some((e) => matches(e, focus)),
    ).length,
    total: days.length,
  };
}
/** Aggregate covered minutes, including short sessions between grid midpoints. */
export function frequencyBins(
  days: GhostEvent[][],
  focus: Focus,
): GhostEvent[] {
  const bins: GhostEvent[] = [];
  for (let start = 0; start < 1440; start += 15) {
    let known = 0,
      matched = 0;
    for (let minute = start; minute < start + 15; minute++) {
      const sample = frequency(days, minute + 0.5, focus);
      known += sample.known;
      matched += sample.matched;
    }
    if (known)
      bins.push({
        id: "bin" + start,
        metric: focus.metric,
        label: `${matched}/${known}`,
        start,
        end: start + 15,
        value: matched / known,
        frequency: 0.12 + (0.75 * matched) / known,
        point: false,
      });
  }
  return bins;
}
export function compareSchedule(
  actual: GhostEvent[],
  plans: GhostEvent[],
  minute: number,
) {
  const used = new Set<string>();
  return [...plans]
    .sort((a, b) => a.start - b.start)
    .map((plan) => {
      const candidates = actual.filter(
        (e) =>
          !e.point &&
          e.start <= minute &&
          e.end > plan.start - (plan.toleranceMinutes ?? 0) &&
          e.start < plan.end + (plan.toleranceMinutes ?? 0) &&
          !used.has(e.id) &&
          e.metric === plan.metric &&
          (plan.habitId
            ? e.habitId === plan.habitId
            : plan.metric === "screen" &&
                plan.label !== defaultLabel(plan.metric)
              ? e.label === plan.label
              : true),
      );
      const match = candidates.sort(
        (a, b) =>
          Math.abs(a.start - plan.start) - Math.abs(b.start - plan.start),
      )[0];
      if (match) used.add(match.id);
      const minutes = match ? recorded([match], minute) : null;
      return {
        plan,
        match,
        status: match
          ? match.running
            ? "running"
            : minutes! >= plan.end - plan.start
              ? "recorded"
              : "partial"
          : plan.start > minute
            ? "upcoming"
            : "unknown",
        delay: match ? Math.round(match.start - plan.start) : null,
        durationDelta:
          minutes === null
            ? null
            : Math.round(minutes - (plan.end - plan.start)),
        withinTolerance: match
          ? Math.abs(match.start - plan.start) <= (plan.toleranceMinutes ?? 0)
          : null,
      };
    });
}
export function dominant(
  days: GhostEvent[][],
  minute: number,
): GhostEvent | null {
  const counts = new Map<string, { event: GhostEvent; count: number }>();
  for (const day of days)
    for (const event of new Map(
      eventsAt(day, minute).map((e) => [e.metric + "|" + e.label, e]),
    ).values()) {
      const key = event.metric + "|" + event.label,
        previous = counts.get(key);
      counts.set(key, { event, count: (previous?.count ?? 0) + 1 });
    }
  const sorted = [...counts.values()].sort((a, b) => b.count - a.count);
  return sorted.length && sorted[0].count > (sorted[1]?.count ?? 0)
    ? sorted[0].event
    : null;
}

/** Browser preview mirrors native atomic operations; production is always validated in Rust. */
export function recordLinkedHabit(s: Snapshot, o: Observation) {
  const id = o.context?.habitId,
    p = s.profiles.find((p) => p.id === o.profileId),
    h = p?.habits?.find((h) => h.id === id);
  if (
    !id ||
    !h ||
    o.value <= 0 ||
    h.startDate > o.date ||
    (h.archivedAt && h.archivedAt <= o.date)
  )
    return;
  if (h.metric && h.metric !== o.metric)
    throw Error("Habitude liée incompatible.");
  s.habitDays ??= [];
  let day = s.habitDays.find(
    (d) => d.profileId === o.profileId && d.date === o.date,
  );
  if (!day) {
    day = {
      profileId: o.profileId,
      date: o.date,
      answers: {},
      validatedAt: null,
    };
    s.habitDays.push(day);
  }
  day.answers[id] = true;
  day.validatedAt = null;
}
export function applyGhostMutation(s: Snapshot, op: Mutation): boolean {
  if (
    ![
      "saveGhostPlan",
      "startActivity",
      "finishActivity",
      "cancelActivity",
    ].includes(op.type)
  )
    return false;
  const action = op as Extract<
    Mutation,
    {
      type:
        | "saveGhostPlan"
        | "startActivity"
        | "finishActivity"
        | "cancelActivity";
    }
  >;
  const p = s.profiles.find((p) => p.id === action.value.profileId);
  if (!p) throw Error("Profil introuvable.");
  const ghost = (p.ghost ??= { plans: [], active: null });
  if (action.type === "saveGhostPlan") {
    if (action.value.plan.effectiveFrom < localDate(new Date()))
      throw Error("Le planning ne peut pas modifier le passé.");
    if (ghost.plans.some((v) => v.id === action.value.plan.id))
      throw Error("Version du planning déjà enregistrée.");
    ghost.plans.push(action.value.plan);
  } else if (action.type === "startActivity") {
    if (ghost.active) throw Error("Une activité est déjà en cours.");
    ghost.active = action.value.session;
  } else {
    const session = ghost.active;
    if (!session || session.id !== action.value.sessionId)
      throw Error("Cette session a changé. Rechargez la page.");
    if (action.type === "finishActivity") {
      const duration =
        (Date.parse(action.value.end) - Date.parse(session.start)) / 60000;
      if (
        !Number.isFinite(duration) ||
        duration <= 0 ||
        duration > 1440 ||
        Date.parse(action.value.end) > Date.now() + 60000
      )
        throw Error(
          "La fin doit suivre le début, sans dépasser 24 h ni être future.",
        );
      const observation: Observation = {
        id: session.id,
        profileId: p.id,
        date: session.start.slice(0, 10),
        at: session.start.slice(11, 16),
        metric: session.metric,
        value: duration,
        unit: "min",
        durationMinutes: duration,
        source: "Session locale",
        batchId: null,
        context: {
          label: session.label,
          habitId: session.habitId,
          start: session.start,
          end: action.value.end,
          timeZone: session.timeZone,
        },
      };
      if (
        s.observations.some(
          (o) =>
            o.profileId === p.id &&
            o.date === observation.date &&
            observationKey(o) === observationKey(observation) &&
            o.metric === observation.metric,
        )
      )
        throw Error(
          "Cette activité existe déjà à cette heure. Modifiez-la dans le journal.",
        );
      s.observations.push(observation);
      ghost.active = null;
      if (session.habitId) {
        s.habitDays ??= [];
        let day = s.habitDays.find(
          (d) => d.profileId === p.id && d.date === observation.date,
        );
        if (!day) {
          day = {
            profileId: p.id,
            date: observation.date,
            answers: {},
            validatedAt: null,
          };
          s.habitDays.push(day);
        }
        day.answers[session.habitId] = true;
        day.validatedAt = null;
      }
    } else ghost.active = null;
  }
  return true;
}

export function observationKey(o: Observation) {
  return o.context?.start ?? o.at ?? "";
}

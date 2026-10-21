import {
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { Store } from "../core/store";
import { I18n, TranslatePipe, LocalNumberPipe } from "../core/i18n";
import {
  HABIT_METRICS,
  Metric,
  RoutineBlock,
  RoutineVersion,
  uid,
} from "../core/models";
import {
  dominant,
  compareSchedule,
  frequencyBins,
  frequency,
  eventsAt,
  eventsForDay,
  Focus,
  GhostEvent,
  localStamp,
  minuteOf,
  plannedEvents,
  recorded,
  referenceDates,
  routineForDay,
  timeLabel,
} from "../core/ghost";
import { shiftDate } from "../core/habit-tracking";
import { AvatarScene } from "../scene/avatar";
import { GhostTimeline } from "../scene/ghost-timeline";

@Component({
  imports: [
    FormsModule,
    RouterLink,
    TranslatePipe,
    LocalNumberPipe,
    AvatarScene,
    GhostTimeline,
  ],
  styleUrl: "./ghost.css",
  templateUrl: "./ghost.html",
})
export class GhostPage {
  store = inject(Store);
  i18n = inject(I18n);
  tr = this.i18n.t;
  clock = this.store.clock;
  today = this.clock.today;
  date = signal(this.today());
  pastDate = signal(shiftDate(this.today(), -1));
  yesterday = computed(() => shiftDate(this.date(), -1));
  reference = signal<"past" | "average" | "target">("past");
  period = signal(7);
  dayKind = signal<"all" | "workdays" | "weekend">("all");
  focusKey = signal("screen");
  live = signal(true);
  cursor = signal(0);
  playing = signal(false);
  selected = signal<GhostEvent | null>(null);
  discarding = signal(false);
  minute = computed(() =>
    this.live()
      ? minuteOf(new Date(this.clock.now())) +
        new Date(this.clock.now()).getSeconds() / 60
      : this.cursor(),
  );
  active = computed(() => this.store.profile()?.ghost?.active ?? null);
  plans = computed(() => this.store.profile()?.ghost?.plans ?? []);
  currentEvents = computed(() =>
    eventsForDay(
      this.store.observations(),
      this.date(),
      this.clock.now(),
      this.active(),
    ),
  );
  referenceDays = computed(() =>
    referenceDates(this.date(), this.period(), this.dayKind()),
  );
  dayEvents = computed(() =>
    this.referenceDays().map((date) =>
      eventsForDay(this.store.observations(), date, this.clock.now()),
    ),
  );
  coveredDays = computed(() =>
    this.dayEvents().filter((events) =>
      events.some(
        (e) => e.start <= this.minute() && (e.point || e.start < this.minute()),
      ),
    ),
  );
  pastEvents = computed(() =>
    eventsForDay(this.store.observations(), this.pastDate(), this.clock.now()),
  );
  targetEvents = computed(() => plannedEvents(this.plans(), this.date()));
  focuses = computed(() => [
    ...HABIT_METRICS.map((m) => ({
      key: m.id,
      label: this.tr(m.label),
      focus: { metric: m.id } as Focus,
    })),
    ...Array.from(
      new Map(
        this.store
          .observations()
          .filter(
            (o) =>
              o.context?.label && HABIT_METRICS.some((m) => m.id === o.metric),
          )
          .map((o) => [JSON.stringify([o.metric, o.context!.label]), o]),
      ).entries(),
    ).map(([key, o]) => ({
      key,
      label:
        o.context!.label + " · " + this.tr(this.store.metric(o.metric).label),
      focus: { metric: o.metric, label: o.context!.label } as Focus,
    })),
  ]);
  focus = computed(
    () =>
      this.focuses().find((f) => f.key === this.focusKey())?.focus ?? {
        metric: "screen" as Metric,
      },
  );
  focusUnit = computed(() => this.store.metric(this.focus().metric).unit);
  referenceEvents = computed(() => {
    if (this.reference() === "target") return this.targetEvents();
    if (this.reference() === "past") return this.pastEvents();
    return frequencyBins(this.dayEvents(), this.focus()).map((bin) => ({
      ...bin,
      label:
        this.tr("Échantillons renseignés avec cette activité") +
        " : " +
        bin.label,
    }));
  });
  currentAt = computed(() => eventsAt(this.currentEvents(), this.minute()));
  referenceAt = computed(() =>
    this.reference() === "average"
      ? dominant(this.dayEvents(), this.minute())
        ? [dominant(this.dayEvents(), this.minute())!]
        : []
      : eventsAt(this.referenceEvents(), this.minute()),
  );
  currentMode = computed(() => this.mode(this.currentAt()));
  referenceMode = computed(() =>
    this.referenceAt().length === 1 ? this.mode(this.referenceAt()) : null,
  );
  actualTotal = computed(() =>
    this.currentEvents().some(
      (e) => e.start <= this.minute() && (e.point || e.start < this.minute()),
    )
      ? recorded(this.currentEvents(), this.minute(), this.focus())
      : null,
  );
  referenceTotal = computed(() =>
    this.reference() === "average"
      ? this.coveredDays().length
        ? this.coveredDays().reduce(
            (n, events) => n + recorded(events, this.minute(), this.focus()),
            0,
          ) / this.coveredDays().length
        : null
      : (
            this.reference() === "target"
              ? this.referenceEvents().length
              : this.referenceEvents().some((e) => e.start <= this.minute())
          )
        ? recorded(this.referenceEvents(), this.minute(), this.focus())
        : null,
  );
  difference = computed(() =>
    this.referenceTotal() !== null && this.actualTotal() !== null
      ? this.actualTotal()! - this.referenceTotal()!
      : null,
  );
  currentCoverage = computed(() =>
    recorded(this.currentEvents(), this.minute()),
  );
  sameTime = computed(() => this.frequencyAt(this.minute()));
  scheduleComparison = computed(() =>
    compareSchedule(this.currentEvents(), this.targetEvents(), this.minute()),
  );
  applicable = computed(() => routineForDay(this.plans(), this.date()));
  latestPlans = computed(() => {
    const m = new Map<string, RoutineVersion>();
    for (const p of this.plans())
      if (
        !m.has(p.routineId) ||
        m.get(p.routineId)!.effectiveFrom <= p.effectiveFrom
      )
        m.set(p.routineId, p);
    return [...m.values()];
  });
  elapsed = computed(() =>
    this.active()
      ? Math.max(
          0,
          (this.clock.now() - Date.parse(this.active()!.start)) / 60000,
        )
      : 0,
  );
  localNow = computed(() =>
    localStamp(new Date(this.clock.now())).slice(0, 16),
  );
  durationMetrics = HABIT_METRICS.filter((m) => m.unit === "min");
  pointMetrics = HABIT_METRICS.filter((m) => m.unit !== "min");
  sessionMetric: Metric = "walk";
  sessionLabel = "";
  sessionHabit = "";
  pointHabit = "";
  linkableHabits = computed(() =>
    this.store
      .habits()
      .filter(
        (h) =>
          !h.archivedAt &&
          (!h.metric || this.durationMetrics.some((m) => m.id === h.metric)),
      ),
  );
  endTime = "";
  pointMetric: Metric = "tobacco";
  pointValue = 1;
  pointTime = "";
  routineId = "";
  routineName = "";
  effectiveFrom = this.today();
  routineDays = [1, 2, 3, 4, 5];
  blocks = signal<RoutineBlock[]>([]);
  blockMetric: Metric = "walk";
  blockLabel = "";
  blockHabit = "";
  blockTime = "18:00";
  blockDuration = 30;
  blockTolerance = 15;
  weekdays = [
    { value: 1, label: "Lun" },
    { value: 2, label: "Mar" },
    { value: 3, label: "Mer" },
    { value: 4, label: "Jeu" },
    { value: 5, label: "Ven" },
    { value: 6, label: "Sam" },
    { value: 0, label: "Dim" },
  ];
  overlapping = computed(() =>
    this.blocks().some((b, i, all) =>
      all.some(
        (a, j) =>
          i !== j &&
          b.startMinute < a.startMinute + a.durationMinutes &&
          a.startMinute < b.startMinute + b.durationMinutes,
      ),
    ),
  );
  time = timeLabel;
  private timer?: ReturnType<typeof setInterval>;
  constructor() {
    const initialDate =
      inject(ActivatedRoute).snapshot.queryParamMap.get("date");
    if (initialDate && initialDate !== this.today())
      this.changeDate(initialDate);
    let previous = this.store.activeId();
    let day = this.today();
    effect(() => {
      const profile = this.store.activeId(),
        today = this.today();
      untracked(() => {
        if (profile !== previous) {
          this.stop();
          this.live.set(true);
          this.date.set(today);
          this.pastDate.set(shiftDate(today, -1));
          this.focusKey.set("screen");
          this.selected.set(null);
          this.newRoutine();
          this.sessionHabit = "";
          this.sessionLabel = "";
          this.sessionMetric = "walk";
          this.endTime = "";
          this.pointTime = "";
          this.pointMetric = "tobacco";
          this.pointValue = 1;
          this.blockMetric = "walk";
          this.blockTime = "18:00";
          this.blockDuration = 30;
          this.blockTolerance = 15;
          this.pointHabit = "";
          this.discarding.set(false);
        } else if (day !== today && this.live()) {
          this.date.set(today);
          this.pastDate.set(shiftDate(today, -1));
        }
        previous = profile;
        day = today;
      });
    });
    inject(DestroyRef).onDestroy(() => this.stop());
  }
  slotStatus(status: string) {
    return this.tr(
      (
        {
          upcoming: "À venir",
          unknown: "Non renseigné",
          recorded: "Durée prévue renseignée",
          partial: "Durée partielle renseignée",
          running: "En cours",
        } as Record<string, string>
      )[status],
    );
  }
  mode(events: GhostEvent[]) {
    if (events.length !== 1) return "idle";
    return events[0].metric;
  }
  stateLabel(events: GhostEvent[]) {
    return events.length
      ? events.map((e) => this.tr(e.label)).join(" + ")
      : this.tr("Inconnu / non prévu");
  }
  frequencyAt(minute: number) {
    return frequency(this.dayEvents(), minute, this.focus());
  }
  changeDate(value: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value > this.today()) return;
    this.cursor.set(this.minute());
    this.stop();
    this.live.set(false);
    this.date.set(value);
    this.pastDate.set(shiftDate(value, -1));
    this.selected.set(null);
  }
  goLive() {
    this.stop();
    this.date.set(this.today());
    this.live.set(true);
    this.selected.set(null);
  }
  scrub(minute: number) {
    this.stop();
    this.live.set(false);
    this.cursor.set(minute);
    this.selected.set(null);
  }
  selectEvent(event: GhostEvent) {
    this.scrub(Math.floor(event.start));
    this.selected.set(event);
  }
  stop() {
    clearInterval(this.timer);
    this.timer = undefined;
    this.playing.set(false);
  }
  togglePlayback() {
    if (this.playing()) {
      this.stop();
      return;
    }
    this.cursor.set(this.minute() >= 1439 ? 0 : this.minute());
    this.live.set(false);
    this.playing.set(true);
    this.timer = setInterval(() => {
      this.cursor.update((m) => Math.min(1439, m + 5));
      if (this.cursor() >= 1439) this.stop();
    }, 300);
  }
  linkSession(id: string) {
    this.sessionHabit = id;
    const habit = this.store.habits().find((h) => h.id === id);
    if (habit) {
      this.sessionLabel = habit.label;
      if (this.durationMetrics.some((m) => m.id === habit.metric))
        this.sessionMetric = habit.metric!;
    }
  }
  linkBlock(id: string) {
    this.blockHabit = id;
    const habit = this.store.habits().find((h) => h.id === id);
    if (habit) {
      this.blockLabel = habit.label;
      if (this.durationMetrics.some((m) => m.id === habit.metric))
        this.blockMetric = habit.metric!;
    }
  }
  async start() {
    const now = new Date();
    await this.store.mutate({
      type: "startActivity",
      value: {
        profileId: this.store.activeId(),
        session: {
          id: uid(),
          metric: this.sessionMetric,
          label:
            this.sessionLabel.trim() ||
            this.tr(this.store.metric(this.sessionMetric).label),
          habitId: this.sessionHabit || null,
          start: localStamp(now),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      },
    });
    this.clock.now.set(Date.now());
    this.endTime = "";
    this.goLive();
  }
  async finish() {
    const session = this.active();
    if (!session) return;
    const end = this.endTime ? new Date(this.endTime) : new Date();
    if (!Number.isFinite(end.getTime())) return;
    const success = await this.store.mutate({
      type: "finishActivity",
      value: {
        profileId: this.store.activeId(),
        sessionId: session.id,
        end: localStamp(end),
      },
    });
    if (success) {
      this.clock.now.set(Date.now());
      this.endTime = "";
      this.discarding.set(false);
    }
  }
  async cancel() {
    const session = this.active();
    if (
      session &&
      (await this.store.mutate({
        type: "cancelActivity",
        value: { profileId: this.store.activeId(), sessionId: session.id },
      }))
    )
      this.discarding.set(false);
  }
  async recordPoint() {
    const at = this.pointTime ? new Date(this.pointTime) : new Date();
    const metric = this.store.metric(this.pointMetric);
    if (
      !Number.isFinite(at.getTime()) ||
      at.getTime() > Date.now() ||
      !Number.isFinite(this.pointValue) ||
      this.pointValue <= 0 ||
      this.pointValue > metric.max ||
      (metric.integer && !Number.isInteger(this.pointValue))
    ) {
      this.store.error.set(this.tr("Événement ou quantité invalide."));
      return;
    }
    const stamp = localStamp(at);
    if (
      await this.store.mutate({
        type: "saveObservation",
        value: {
          id: uid(),
          profileId: this.store.activeId(),
          metric: this.pointMetric,
          date: stamp.slice(0, 10),
          at: stamp.slice(11, 16),
          value: this.pointValue,
          unit: metric.unit,
          source: "Saisie manuelle",
          batchId: null,
          durationMinutes: null,
          context: this.pointHabit
            ? {
                label: this.store
                  .habits()
                  .find((h) => h.id === this.pointHabit)!.label,
                habitId: this.pointHabit,
                start: null,
                end: null,
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              }
            : null,
        },
      })
    )
      this.pointTime = "";
  }
  prepareChange(event: GhostEvent) {
    this.blockTime = timeLabel(event.start);
    this.blockDuration = Math.max(1, Math.round(event.end - event.start));
    this.blockMetric = "walk";
    this.blockLabel = "";
    if (!this.routineName.trim()) this.routineName = this.tr("Mon ajustement");
    this.effectiveFrom = shiftDate(this.today(), 1);
    document
      .getElementById("ghost-target-editor")
      ?.scrollIntoView({ behavior: "instant", block: "start" });
  }
  newRoutine() {
    this.routineId = "";
    this.routineName = "";
    this.effectiveFrom = this.today();
    this.routineDays = [1, 2, 3, 4, 5];
    this.blocks.set([]);
    this.blockHabit = "";
    this.blockLabel = "";
  }
  loadRoutine(id: string) {
    const p = this.latestPlans().find((p) => p.routineId === id);
    if (!p) {
      this.newRoutine();
      return;
    }
    this.routineId = id;
    this.routineName = p.name;
    this.effectiveFrom =
      p.effectiveFrom > this.today() ? p.effectiveFrom : this.today();
    this.routineDays = [...p.weekdays];
    this.blocks.set(structuredClone(p.blocks));
  }
  toggleDay(day: number, on: boolean) {
    this.routineDays = on
      ? [...this.routineDays, day]
      : this.routineDays.filter((d) => d !== day);
  }
  addBlock() {
    const [h, m] = this.blockTime.split(":").map(Number),
      start = h * 60 + m;
    if (
      !Number.isInteger(start) ||
      start < 0 ||
      start >= 1440 ||
      !Number.isInteger(this.blockTolerance) ||
      this.blockTolerance < 0 ||
      this.blockTolerance > 180 ||
      !Number.isInteger(this.blockDuration) ||
      this.blockDuration <= 0 ||
      start + this.blockDuration > 1440
    ) {
      this.store.error.set(this.tr("Le créneau doit tenir dans la journée."));
      return;
    }
    this.blocks.update((blocks) =>
      [
        ...blocks,
        {
          id: uid(),
          metric: this.blockMetric,
          label:
            this.blockLabel.trim() ||
            this.tr(this.store.metric(this.blockMetric).label),
          habitId: this.blockHabit || null,
          startMinute: start,
          durationMinutes: this.blockDuration,
          toleranceMinutes: this.blockTolerance,
        },
      ].sort((a, b) => a.startMinute - b.startMinute),
    );
  }
  removeBlock(id: string) {
    this.blocks.update((blocks) => blocks.filter((b) => b.id !== id));
  }
  async saveRoutine() {
    if (this.effectiveFrom < this.today()) {
      this.store.error.set(
        this.tr("Le planning ne peut pas modifier le passé."),
      );
      return;
    }
    const plan: RoutineVersion = {
      id: uid(),
      routineId: this.routineId || uid(),
      name: this.routineName.trim(),
      effectiveFrom: this.effectiveFrom,
      weekdays: [...this.routineDays],
      blocks: structuredClone(this.blocks()),
    };
    if (
      await this.store.mutate({
        type: "saveGhostPlan",
        value: { profileId: this.store.activeId(), plan },
      })
    )
      this.routineId = plan.routineId;
  }
}

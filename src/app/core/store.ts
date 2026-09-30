import { Injectable, computed, signal } from "@angular/core";
import { invoke, isTauri } from "@tauri-apps/api/core";
import {
  addDemo,
  DEFAULT_TARGET,
  emptySnapshot,
  HABIT_METRICS,
  Initial,
  METRICS,
  ModelDefinition,
  Mutation,
  Snapshot,
  TargetDay,
} from "./models";
@Injectable({ providedIn: "root" })
export class Store {
  readonly desktop = isTauri();
  readonly data = signal<Snapshot>(emptySnapshot());
  readonly activeId = signal("");
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly notice = signal("");
  readonly error = signal("");
  readonly storagePath = signal("Aperçu temporaire en mémoire");
  readonly model = signal<ModelDefinition | null>(null);
  readonly profiles = computed(() => this.data().profiles);
  readonly profile = computed(
    () => this.profiles().find((p) => p.id === this.activeId()) ?? null,
  );
  readonly habits = computed(() => this.profile()?.habits ?? []);
  readonly habitDays = computed(() =>
    (this.data().habitDays ?? []).filter(
      (day) => day.profileId === this.activeId(),
    ),
  );
  readonly target = computed(() => ({
    ...DEFAULT_TARGET,
    ...(this.profile()?.target ?? {}),
  }));
  readonly observations = computed(() =>
    this.data()
      .observations.filter((o) => o.profileId === this.activeId())
      .sort((a, b) => {
        const date = b.date.localeCompare(a.date);
        return date || (b.at ?? "").localeCompare(a.at ?? "");
      }),
  );
  readonly dayEvents = computed(() => {
    const now = Date.now();
    const start = now - 24 * 60 * 60 * 1000;
    return this.observations()
      .filter((o) => o.at && HABIT_METRICS.some((m) => m.id === o.metric))
      .map((o) => ({ observation: o, time: new Date(`${o.date}T${o.at}:00`) }))
      .filter(
        ({ time }) =>
          !Number.isNaN(time.getTime()) &&
          time.getTime() >= start &&
          time.getTime() <= now,
      )
      .sort((a, b) => a.time.getTime() - b.time.getTime());
  });
  readonly dayRecap = computed(() => {
    const totals = new Map<string, number>();
    for (const { observation } of this.dayEvents())
      totals.set(
        observation.metric,
        (totals.get(observation.metric) ?? 0) + observation.value,
      );
    const value = (metric: string) =>
      Math.round((totals.get(metric) ?? 0) * 10) / 10;
    const daily = (metric: string) => this.latest(metric)?.value ?? 0;
    return {
      events: this.dayEvents().length,
      activeMinutes: daily("activity") + value("exercise") + value("walk"),
      sleepHours: this.latest("sleep")?.value ?? null,
      socialMinutes: value("social"),
      screenMinutes: value("screen"),
      gamingMinutes: value("gaming"),
      alcohol: value("alcohol"),
      tobaccoCigarettes: value("tobacco"),
      vapingMinutes: value("vaping"),
      eveningScreenMinutes: value("screen_evening"),
      sedentaryMinutes: value("sedentary"),
      positiveMinutes:
        value("exercise") +
        value("walk") +
        value("social") +
        value("reading") +
        value("rest"),
    };
  });
  readonly targetTrajectory = computed(() => {
    const target = this.target();
    const observations = this.observations();
    const result: {
      date: string;
      deviation: number | null;
      actual: number;
      hasData: boolean;
    }[] = [];
    const now = new Date();
    for (let offset = 6; offset >= 0; offset--) {
      const date = new Date(now);
      date.setHours(12, 0, 0, 0);
      date.setDate(date.getDate() - offset);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      const rows = observations.filter((o) => o.date === key);
      const latest = (metric: string) =>
        rows.find((o) => o.metric === metric)?.value;
      const sum = (metric: string) => {
        const matching = rows.filter((o) => o.metric === metric);
        return matching.length
          ? matching.reduce((total, o) => total + o.value, 0)
          : undefined;
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
          const base = Math.max(goal, direction === "high" ? 60 : 1);
          const delta =
            direction === "low"
              ? Math.max(0, goal - actual!)
              : Math.max(0, actual! - goal);
          return Math.min(1, delta / base);
        });
      const deviation = errors.length
        ? Math.round((errors.reduce((a, b) => a + b, 0) / errors.length) * 100)
        : null;
      result.push({
        date: key,
        deviation,
        actual: rows.length,
        hasData: rows.length > 0,
      });
    }
    return result;
  });
  readonly scenarios = computed(() =>
    this.data().scenarios.filter((s) => s.profileId === this.activeId()),
  );
  readonly batches = computed(() =>
    this.data().batches.filter((b) => b.profileId === this.activeId()),
  );
  async init() {
    try {
      if (this.desktop) {
        const v = await invoke<Initial>("initial_state");
        this.data.set(v.snapshot);
        this.storagePath.set(v.storagePath);
        this.model.set(v.model);
      } else {
        const s = emptySnapshot();
        addDemo(s);
        this.data.set(s);
        this.model.set({
          id: "hall-2011",
          version: "0.1.0-research",
          name: "Hall · NIDDK (2011)",
          status: "validation_pending",
          enabled: false,
          reasons: [
            "Modèle complet et licence à vérifier.",
            "Courbes de référence non encore reproduites. Aucun horizon activé.",
          ],
          source:
            "https://www.niddk.nih.gov/research-funding/at-niddk/labs-branches/laboratory-biological-modeling/integrative-physiology-section/research/body-weight-planner",
          horizons: [],
        });
      }
      this.activeId.set(this.profiles()[0]?.id ?? "");
    } catch (e) {
      this.fail(e);
    } finally {
      this.loading.set(false);
    }
  }
  select(id: string) {
    this.activeId.set(id);
    this.error.set("");
    this.notice.set("");
  }
  fail(e: unknown) {
    this.error.set(
      typeof e === "object" && e && "message" in e
        ? String(e.message)
        : String(e),
    );
  }
  async task<T>(fn: () => Promise<T>): Promise<T | undefined> {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set("");
    this.notice.set("");
    try {
      return await fn();
    } catch (e) {
      this.fail(e);
      return undefined;
    } finally {
      this.busy.set(false);
    }
  }
  async mutate(operation: Mutation) {
    return this.task(async () => {
      const old = this.activeId();
      const next = this.desktop
        ? await invoke<Snapshot>("mutate", { operation })
        : this.previewMutation(operation);
      this.data.set(next);
      if (!next.profiles.some((p) => p.id === old))
        this.activeId.set(next.profiles[0]?.id ?? "");
      if (operation.type === "demo")
        this.activeId.set(next.profiles.at(-1)!.id);
      this.notice.set(
        this.desktop
          ? "Enregistré sur cet appareil."
          : "Aperçu mis à jour · données temporaires.",
      );
      return true;
    });
  }
  async saveTarget(target: TargetDay) {
    const profile = this.profile();
    if (!profile) return false;
    return this.mutate({
      type: "saveProfile",
      value: { ...profile, target },
    });
  }
  apply(s: Snapshot) {
    this.data.set(s);
    if (!s.profiles.some((p) => p.id === this.activeId()))
      this.activeId.set(s.profiles[0]?.id ?? "");
  }
  latest(metric: string) {
    return this.observations().find((o) => o.metric === metric);
  }
  series(metric: string) {
    return this.observations()
      .filter((o) => o.metric === metric)
      .slice(0, 28)
      .reverse();
  }
  metric(id: string) {
    return METRICS.find((m) => m.id === id)!;
  }
  private previewMutation(op: Mutation): Snapshot {
    const s = structuredClone(this.data());
    switch (op.type) {
      case "demo":
        addDemo(s);
        break;
      case "settings":
        s.settings = op.value;
        break;
      case "saveProfile":
        s.profiles = s.profiles.filter((p) => p.id !== op.value.id);
        s.profiles.push(op.value);
        break;
      case "deleteProfile":
        s.profiles = s.profiles.filter((p) => p.id !== op.value);
        s.observations = s.observations.filter((o) => o.profileId !== op.value);
        s.habitDays = (s.habitDays ?? []).filter(
          (o) => o.profileId !== op.value,
        );
        s.scenarios = s.scenarios.filter((o) => o.profileId !== op.value);
        s.batches = s.batches.filter((o) => o.profileId !== op.value);
        s.runs = s.runs.filter((o) => o.profileId !== op.value);
        break;
      case "saveObservation":
        if (
          s.observations.some(
            (o) =>
              o.profileId === op.value.profileId &&
              o.date === op.value.date &&
              o.metric === op.value.metric &&
              (o.at ?? null) === (op.value.at ?? null) &&
              o.id !== op.value.id,
          )
        )
          throw Error(
            "Cette activité existe déjà à cette heure. Modifiez-la dans le journal.",
          );
        s.observations = s.observations.filter((o) => o.id !== op.value.id);
        s.observations.push(op.value);
        break;
      case "saveHabitDay":
        if (!s.profiles.some((p) => p.id === op.value.profileId))
          throw Error("Profil introuvable.");
        s.habitDays = (s.habitDays ?? []).filter(
          (day) =>
            day.profileId !== op.value.profileId || day.date !== op.value.date,
        );
        s.habitDays.push(op.value);
        break;
      case "deleteObservation":
        s.observations = s.observations.filter(
          (o) => o.id !== op.value.id || o.profileId !== op.value.profileId,
        );
        break;
      case "saveScenario":
        s.scenarios = s.scenarios.filter((o) => o.id !== op.value.id);
        s.scenarios.push(op.value);
        break;
      case "deleteScenario":
        s.scenarios = s.scenarios.filter(
          (o) => o.id !== op.value.id || o.profileId !== op.value.profileId,
        );
        break;
    }
    return s;
  }
}

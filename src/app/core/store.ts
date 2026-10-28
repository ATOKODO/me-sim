import { Injectable, computed, inject, signal } from "@angular/core";
import { applyGhostMutation, recordLinkedHabit, observationKey } from "./ghost";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { LocalClock } from "./clock";
import { dailyRecap, targetTrajectory, timelineEvents } from "./daily-summary";
import {
  addDemo,
  DEFAULT_TARGET,
  emptySnapshot,
  Initial,
  METRICS,
  ModelDefinition,
  Mutation,
  Snapshot,
  TargetDay,
  VersionedSnapshot,
} from "./models";
@Injectable({ providedIn: "root" })
export class Store {
  readonly clock = inject(LocalClock);
  readonly desktop = isTauri();
  readonly data = signal<Snapshot>(emptySnapshot());
  readonly activeId = signal("");
  readonly revision = signal(0);
  readonly externalRefresh = signal(0);
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
  readonly dayEvents = computed(() =>
    timelineEvents(this.observations(), this.clock.now()),
  );
  readonly dayRecap = computed(() =>
    dailyRecap(this.observations(), this.clock.today(), this.clock.now()),
  );
  readonly targetTrajectory = computed(() =>
    targetTrajectory(
      this.observations(),
      this.target(),
      this.clock.today(),
      this.clock.now(),
    ),
  );
  readonly scenarios = computed(() =>
    this.data().scenarios.filter((s) => s.profileId === this.activeId()),
  );
  readonly batches = computed(() =>
    this.data().batches.filter((b) => b.profileId === this.activeId()),
  );
  private refreshInFlight?: Promise<void>;
  private refreshPending = false;
  /** @spec TECH-FRONTEND-STORE-101 */
  async init() {
    try {
      if (this.desktop) {
        const v = await invoke<Initial>("initial_state");
        this.apply(v);
        this.storagePath.set(v.storagePath);
        this.model.set(v.model);
        window.addEventListener("focus", () => void this.refreshFromDisk());
        document.addEventListener("visibilitychange", () => {
          if (!document.hidden) void this.refreshFromDisk();
        });
        void listen("companion-sync", () => void this.refreshFromDisk()).catch(
          () => {},
        );
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
  /** @spec TECH-FRONTEND-STORE-101 */
  private refreshFromDisk(): Promise<void> {
    if (!this.desktop || this.loading()) return Promise.resolve();
    this.refreshPending = true;
    if (this.busy()) return Promise.resolve();
    if (!this.refreshInFlight) {
      this.refreshInFlight = this.drainRefreshes().finally(() => {
        this.refreshInFlight = undefined;
        if (this.refreshPending && !this.busy()) void this.refreshFromDisk();
      });
    }
    return this.refreshInFlight;
  }
  /** @spec TECH-FRONTEND-STORE-101 */
  private async drainRefreshes() {
    while (this.refreshPending && !this.busy()) {
      this.refreshPending = false;
      try {
        const current = await invoke<Initial>("initial_state");
        if (this.busy()) {
          this.refreshPending = true;
          return;
        }
        if (current.revision > this.revision()) {
          this.apply(current);
          this.externalRefresh.update((value) => value + 1);
        }
      } catch {
        // The next focus or sync event retries a failed read without erasing drafts.
      }
    }
  }
  /** @spec TECH-FRONTEND-STORE-101 */
  select(id: string) {
    this.activeId.set(id);
    this.error.set("");
    this.notice.set("");
  }
  /** @spec TECH-FRONTEND-STORE-101 */
  fail(e: unknown) {
    this.error.set(
      typeof e === "object" && e && "message" in e
        ? String(e.message)
        : String(e),
    );
  }
  /** @spec TECH-FRONTEND-STORE-101 */
  async task<T>(fn: () => Promise<T>): Promise<T | undefined> {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set("");
    this.notice.set("");
    try {
      return await fn();
    } catch (e) {
      if (
        typeof e === "object" &&
        e &&
        "code" in e &&
        e.code === "CONCURRENT_CHANGE"
      ) {
        try {
          const current = await invoke<Initial>("initial_state");
          this.apply(current);
          this.externalRefresh.update((value) => value + 1);
          this.error.set(
            "Les données ont changé dans une autre fenêtre. Les dernières données ont été rechargées ; ton brouillon est conservé. Vérifie-le avant de réessayer.",
          );
        } catch (refreshError) {
          this.fail(refreshError);
        }
      } else this.fail(e);
      return undefined;
    } finally {
      this.busy.set(false);
      if (this.refreshPending) void this.refreshFromDisk();
    }
  }
  /** @spec TECH-FRONTEND-STORE-101 */
  async mutate(operation: Mutation) {
    return this.task(async () => {
      const old = this.activeId();
      const next = this.desktop
        ? await invoke<VersionedSnapshot>("mutate", {
            operation,
            expectedRevision: this.revision(),
          })
        : {
            snapshot: this.previewMutation(operation),
            revision: this.revision() + 1,
          };
      this.apply(next);
      const snapshot = next.snapshot;
      if (!snapshot.profiles.some((p) => p.id === old))
        this.activeId.set(snapshot.profiles[0]?.id ?? "");
      if (operation.type === "demo")
        this.activeId.set(snapshot.profiles.at(-1)!.id);
      this.notice.set(
        this.desktop
          ? "Enregistré sur cet appareil."
          : "Aperçu mis à jour · données temporaires.",
      );
      return true;
    });
  }
  /** @spec TECH-FRONTEND-STORE-101 */
  async saveTarget(target: TargetDay) {
    const profile = this.profile();
    if (!profile) return false;
    return this.mutate({
      type: "saveProfile",
      value: { ...profile, target },
    });
  }
  /** @spec TECH-FRONTEND-STORE-101 */
  apply(current: VersionedSnapshot) {
    if (current.revision < this.revision()) return;
    const s = current.snapshot;
    this.revision.set(current.revision);
    this.data.set(s);
    if (!s.profiles.some((p) => p.id === this.activeId()))
      this.activeId.set(s.profiles[0]?.id ?? "");
  }
  /** @spec TECH-FRONTEND-STORE-101 */
  latest(metric: string) {
    return this.observations().find((o) => o.metric === metric);
  }
  /** @spec TECH-FRONTEND-STORE-101 */
  series(metric: string) {
    return this.observations()
      .filter((o) => o.metric === metric)
      .slice(0, 28)
      .reverse();
  }
  /** @spec TECH-FRONTEND-STORE-101 */
  metric(id: string) {
    return METRICS.find((m) => m.id === id)!;
  }
  /** @spec TECH-FRONTEND-STORE-101 */
  private previewMutation(op: Mutation): Snapshot {
    const s = structuredClone(this.data());
    if (applyGhostMutation(s, op)) return s;
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
              observationKey(o) === observationKey(op.value) &&
              o.id !== op.value.id,
          )
        )
          throw Error(
            "Cette activité existe déjà à cette heure. Modifiez-la dans le journal.",
          );
        s.observations = s.observations.filter((o) => o.id !== op.value.id);
        s.observations.push(op.value);
        recordLinkedHabit(s, op.value);
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

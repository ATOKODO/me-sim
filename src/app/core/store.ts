import { Injectable, computed, signal } from "@angular/core";
import { invoke, isTauri } from "@tauri-apps/api/core";
import {
  addDemo,
  emptySnapshot,
  Initial,
  METRICS,
  ModelDefinition,
  Mutation,
  Snapshot,
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
  readonly observations = computed(() =>
    this.data()
      .observations.filter((o) => o.profileId === this.activeId())
      .sort((a, b) => b.date.localeCompare(a.date)),
  );
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
              o.id !== op.value.id,
          )
        )
          throw Error(
            "Cette mesure existe déjà pour cette date. Modifiez-la dans le journal.",
          );
        s.observations = s.observations.filter((o) => o.id !== op.value.id);
        s.observations.push(op.value);
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

export type Metric =
  | "weight"
  | "sleep"
  | "steps"
  | "activity"
  | "intake"
  | "stress";
export interface Profile {
  id: string;
  name: string;
  birthDate: string | null;
  sex: string | null;
  heightCm: number | null;
  color: string;
  demo: boolean;
}
export interface Observation {
  id: string;
  profileId: string;
  date: string;
  metric: Metric;
  value: number;
  unit: string;
  source: string;
  batchId: string | null;
}
export interface Scenario {
  id: string;
  profileId: string;
  name: string;
  months: number;
  intakeDelta: number;
  activityDelta: number;
}
export interface ImportBatch {
  id: string;
  profileId: string;
  filename: string;
  importedAt: string;
  count: number;
}
export interface Settings {
  animations: boolean;
  jitter: boolean;
  force2d: boolean;
}
export interface SimulationRun {
  id: string;
  profileId: string;
  modelVersion: string;
  inputs: unknown;
  results: unknown;
}
export interface Snapshot {
  version: 1;
  profiles: Profile[];
  observations: Observation[];
  batches: ImportBatch[];
  scenarios: Scenario[];
  runs: SimulationRun[];
  settings: Settings;
}
export interface ModelDefinition {
  id: string;
  version: string;
  name: string;
  status: string;
  enabled: boolean;
  reasons: string[];
  source: string;
  horizons: number[];
}
export interface Initial {
  snapshot: Snapshot;
  storagePath: string;
  model: ModelDefinition;
}
export interface Workbook {
  token: string;
  filename: string;
  sheets: { name: string; headers: string[]; rows: string[][] }[];
}
export interface Mapping {
  sheet: number;
  dateColumn: number;
  metricColumn: number | null;
  valueColumn: number;
  unitColumn: number | null;
  metric: string;
  unit: string;
  dateFormat: string;
}
export interface Preview {
  token: string;
  profileId: string;
  filename: string;
  rows: {
    row: number;
    observation: Observation | null;
    status: string;
    message: string;
  }[];
}
export interface RestorePreview {
  token: string;
  profiles: string[];
  observations: number;
  scenarios: number;
}
export type Mutation =
  | { type: "saveProfile"; value: Profile }
  | { type: "deleteProfile"; value: string }
  | { type: "saveObservation"; value: Observation }
  | { type: "deleteObservation"; value: { id: string; profileId: string } }
  | { type: "saveScenario"; value: Scenario }
  | { type: "deleteScenario"; value: { id: string; profileId: string } }
  | { type: "settings"; value: Settings }
  | { type: "demo" };
export const METRICS: {
  id: Metric;
  label: string;
  unit: string;
  icon: string;
  color: string;
  max: number;
}[] = [
  {
    id: "weight",
    label: "Poids",
    unit: "kg",
    icon: "weight",
    color: "#d1b9fa",
    max: 700,
  },
  {
    id: "sleep",
    label: "Sommeil",
    unit: "h",
    icon: "moon",
    color: "#a7b9f9",
    max: 24,
  },
  {
    id: "steps",
    label: "Pas quotidiens",
    unit: "pas",
    icon: "steps",
    color: "#c1ed88",
    max: 200000,
  },
  {
    id: "activity",
    label: "Activité",
    unit: "min",
    icon: "activity",
    color: "#f2b988",
    max: 1440,
  },
  {
    id: "intake",
    label: "Apports",
    unit: "kcal",
    icon: "sun",
    color: "#e9d580",
    max: 30000,
  },
  {
    id: "stress",
    label: "Stress déclaré",
    unit: "/10",
    icon: "heart",
    color: "#e3a0b0",
    max: 10,
  },
];
export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export const uid = () => crypto.randomUUID();
export function emptySnapshot(): Snapshot {
  return {
    version: 1,
    profiles: [],
    observations: [],
    batches: [],
    scenarios: [],
    runs: [],
    settings: {
      animations: !matchMedia("(prefers-reduced-motion: reduce)").matches,
      jitter: false,
      force2d: false,
    },
  };
}
export function addDemo(s: Snapshot): Profile {
  const p: Profile = {
    id: uid(),
    name: "Alex · Démo",
    birthDate: "1994-04-12",
    sex: "male",
    heightCm: 178,
    color: "#bde883",
    demo: true,
  };
  s.profiles.push(p);
  for (let i = 0; i < 28; i++) {
    const d = new Date();
    d.setDate(d.getDate() - 27 + i);
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    for (const [metric, value] of [
      ["weight", 76.4 - i * 0.025 + Math.sin(i * 1.7) * 0.2],
      ["sleep", 7.1 + Math.sin(i) * 0.7],
      ["steps", Math.round(6200 + i * 57 + Math.sin(i) * 1400)],
      ["activity", i % 3 === 0 ? 45 : 20],
      ["stress", 4 + (i % 3)],
    ] as [Metric, number][]) {
      s.observations.push({
        id: uid(),
        profileId: p.id,
        date,
        metric,
        value: Math.round(value * 100) / 100,
        unit: METRICS.find((m) => m.id === metric)!.unit,
        source: "Démonstration fictive",
        batchId: null,
      });
    }
  }
  return p;
}

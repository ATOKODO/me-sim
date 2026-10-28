import { Language, Theme, readPresentation } from "./presentation";
export type Metric =
  | "weight"
  | "sleep"
  | "steps"
  | "activity"
  | "intake"
  | "stress"
  | "exercise"
  | "walk"
  | "work"
  | "social"
  | "gaming"
  | "screen"
  | "reading"
  | "meal"
  | "rest"
  | "alcohol"
  | "tobacco"
  | "vaping"
  | "screen_evening"
  | "sedentary";
export interface Profile {
  id: string;
  name: string;
  birthDate: string | null;
  sex: string | null;
  heightCm: number | null;
  color: string;
  demo: boolean;
  target?: TargetDay | null;
  habits?: HabitDefinition[];
  ghost?: GhostState | null;
}
export interface ActivityContext {
  label: string;
  habitId: string | null;
  start: string | null;
  end: string | null;
  timeZone: string;
}
export interface ActivitySession {
  id: string;
  metric: Metric;
  label: string;
  habitId: string | null;
  start: string;
  timeZone: string;
}
export interface RoutineBlock {
  id: string;
  metric: Metric;
  label: string;
  habitId: string | null;
  startMinute: number;
  durationMinutes: number;
  toleranceMinutes?: number;
}
export interface RoutineVersion {
  id: string;
  routineId: string;
  name: string;
  effectiveFrom: string;
  weekdays: number[];
  blocks: RoutineBlock[];
}
export interface GhostState {
  plans: RoutineVersion[];
  active: ActivitySession | null;
}
export interface HabitDefinition {
  id: string;
  label: string;
  kind: "good" | "bad";
  startDate: string;
  archivedAt: string | null;
  metric: Metric | null;
}
export interface HabitDay {
  profileId: string;
  date: string;
  answers: Record<string, boolean>;
  validatedAt: string | null;
}
export interface TargetDay {
  sleepHours: number;
  steps: number;
  activityMinutes: number;
  exerciseMinutes: number;
  walkMinutes: number;
  socialMinutes: number;
  screenMinutes: number;
  gamingMinutes: number;
  alcoholGlasses: number;
  tobaccoCigarettes: number;
  vapingMinutes: number;
  eveningScreenMinutes: number;
  sedentaryMinutes: number;
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
  /** Optional local time (HH:mm) for activities shown in the 24 h replay. */
  at?: string | null;
  /** Duration in minutes for an activity event. Kept separate from value for import compatibility. */
  durationMinutes?: number | null;
  context?: ActivityContext | null;
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
  language: Language;
  theme: Theme;
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
  habitDays?: HabitDay[];
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
export interface VersionedSnapshot {
  snapshot: Snapshot;
  revision: number;
}
export interface Initial extends VersionedSnapshot {
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
  timeColumn?: number | null;
  durationColumn?: number | null;
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
  habitDays: number;
  scenarios: number;
}
export type Mutation =
  | {
      type: "saveGhostPlan";
      value: { profileId: string; plan: RoutineVersion };
    }
  | {
      type: "startActivity";
      value: { profileId: string; session: ActivitySession };
    }
  | {
      type: "finishActivity";
      value: { profileId: string; sessionId: string; end: string };
    }
  | { type: "cancelActivity"; value: { profileId: string; sessionId: string } }
  | { type: "saveProfile"; value: Profile }
  | { type: "deleteProfile"; value: string }
  | { type: "saveObservation"; value: Observation }
  | { type: "deleteObservation"; value: { id: string; profileId: string } }
  | { type: "saveHabitDay"; value: HabitDay }
  | { type: "saveScenario"; value: Scenario }
  | { type: "deleteScenario"; value: { id: string; profileId: string } }
  | { type: "settings"; value: Settings }
  | { type: "demo" };
export const DEFAULT_TARGET: TargetDay = {
  sleepHours: 8,
  steps: 8000,
  activityMinutes: 30,
  exerciseMinutes: 30,
  walkMinutes: 30,
  socialMinutes: 60,
  screenMinutes: 90,
  gamingMinutes: 60,
  alcoholGlasses: 0,
  tobaccoCigarettes: 0,
  vapingMinutes: 0,
  eveningScreenMinutes: 60,
  sedentaryMinutes: 480,
};
export const METRICS: {
  id: Metric;
  label: string;
  unit: string;
  icon: string;
  color: string;
  max: number;
  event?: boolean;
  positive?: boolean;
  valueLabel?: string;
  integer?: boolean;
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
    integer: true,
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
  {
    id: "exercise",
    label: "Sport / entraînement",
    unit: "min",
    icon: "activity",
    color: "#bde883",
    max: 1440,
    event: true,
    positive: true,
    valueLabel: "Durée",
  },
  {
    id: "walk",
    label: "Marche / sortie",
    unit: "min",
    icon: "steps",
    color: "#a9d673",
    max: 1440,
    event: true,
    positive: true,
    valueLabel: "Durée",
  },
  {
    id: "work",
    label: "Travail / étude",
    unit: "min",
    icon: "briefcase",
    color: "#9ec5e7",
    max: 1440,
    event: true,
    positive: true,
    valueLabel: "Durée",
  },
  {
    id: "social",
    label: "Temps social",
    unit: "min",
    icon: "users",
    color: "#f5c980",
    max: 1440,
    event: true,
    positive: true,
    valueLabel: "Durée",
  },
  {
    id: "gaming",
    label: "Jeux vidéo",
    unit: "min",
    icon: "gamepad",
    color: "#d4a4e8",
    max: 1440,
    event: true,
    positive: false,
    valueLabel: "Durée",
  },
  {
    id: "screen",
    label: "Réseaux sociaux / écran",
    unit: "min",
    icon: "phone",
    color: "#e7a3a3",
    max: 1440,
    event: true,
    positive: false,
    valueLabel: "Durée",
  },
  {
    id: "reading",
    label: "Lecture / apprentissage",
    unit: "min",
    icon: "book",
    color: "#a9d9ca",
    max: 1440,
    event: true,
    positive: true,
    valueLabel: "Durée",
  },
  {
    id: "meal",
    label: "Repas",
    unit: "min",
    icon: "sun",
    color: "#e9d580",
    max: 240,
    event: true,
    positive: true,
    valueLabel: "Durée",
  },
  {
    id: "rest",
    label: "Repos / pause",
    unit: "min",
    icon: "moon",
    color: "#a7b9f9",
    max: 1440,
    event: true,
    positive: true,
    valueLabel: "Durée",
  },
  {
    id: "alcohol",
    label: "Alcool",
    unit: "verre",
    icon: "glass",
    color: "#ec9a83",
    max: 20,
    event: true,
    positive: false,
    valueLabel: "Nombre de verres",
  },
  {
    id: "tobacco",
    integer: true,
    label: "Tabac",
    unit: "cigarette",
    icon: "cigarette",
    color: "#d6a995",
    max: 100,
    event: true,
    positive: false,
    valueLabel: "Nombre de cigarettes",
  },
  {
    id: "vaping",
    label: "Vapotage",
    unit: "min",
    icon: "vape",
    color: "#a5c8d5",
    max: 1440,
    event: true,
    positive: false,
    valueLabel: "Durée",
  },
  {
    id: "screen_evening",
    label: "Écran le soir",
    unit: "min",
    icon: "phone",
    color: "#9ca9d5",
    max: 1440,
    event: true,
    positive: false,
    valueLabel: "Durée",
  },
  {
    id: "sedentary",
    label: "Temps sédentaire",
    unit: "min",
    icon: "chair",
    color: "#c6a8a1",
    max: 1440,
    event: true,
    positive: false,
    valueLabel: "Durée",
  },
];
/** The journal is the source of truth for playable timeline habits. */
export const HABIT_METRICS = METRICS.filter((metric) => metric.event);
export const DEFAULT_HABITS: Omit<HabitDefinition, "id" | "startDate">[] = [
  {
    label: "Courir / faire du sport",
    kind: "good",
    metric: "exercise",
    archivedAt: null,
  },
  { label: "Lire", kind: "good", metric: "reading", archivedAt: null },
  { label: "Fumer", kind: "bad", metric: "tobacco", archivedAt: null },
  {
    label: "Écran le soir",
    kind: "bad",
    metric: "screen_evening",
    archivedAt: null,
  },
];
/** @spec TECH-FRONTEND-MODELS-101 */
export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
/** @spec TECH-FRONTEND-MODELS-101 */
export const uid = () => crypto.randomUUID();
/** @spec TECH-FRONTEND-MODELS-101 */
export function emptySnapshot(): Snapshot {
  return {
    version: 1,
    profiles: [],
    observations: [],
    habitDays: [],
    batches: [],
    scenarios: [],
    runs: [],
    settings: {
      animations: !matchMedia("(prefers-reduced-motion: reduce)").matches,
      jitter: false,
      ...readPresentation(),
    },
  };
}
/** @spec TECH-FRONTEND-MODELS-101 */
export function addDemo(s: Snapshot): Profile {
  const start = new Date();
  start.setDate(start.getDate() - 13);
  const startDate = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`;
  const p: Profile = {
    id: uid(),
    name: "Alex · Démo",
    birthDate: "1994-04-12",
    sex: "male",
    heightCm: 178,
    color: "#bde883",
    demo: true,
    target: { ...DEFAULT_TARGET },
    habits: DEFAULT_HABITS.map((habit) => ({ ...habit, id: uid(), startDate })),
  };
  s.profiles.push(p);
  for (let offset = 13; offset >= 0; offset--) {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() - offset);
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const answers: Record<string, boolean> = {};
    p.habits!.forEach((habit, index) => {
      answers[habit.id] =
        index < 2 ? (offset + index) % 4 !== 0 : (offset + index) % 5 === 0;
    });
    s.habitDays!.push({
      profileId: p.id,
      date,
      answers,
      validatedAt: new Date().toISOString(),
    });
  }
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
  const events: [Metric, number, number][] = [
    ["exercise", 30, 90],
    ["walk", 25, 180],
    ["sedentary", 120, 280],
    ["work", 150, 400],
    ["social", 55, 540],
    ["screen", 35, 650],
    ["gaming", 80, 750],
    ["alcohol", 2, 830],
    ["tobacco", 2, 910],
    ["vaping", 10, 990],
    ["screen_evening", 45, 1070],
    ["meal", 30, 1150],
    ["reading", 25, 1230],
    ["rest", 20, 1310],
  ];
  for (const [metric, value, minutesAgo] of events) {
    const when = new Date(Date.now() - minutesAgo * 60_000);
    const date = `${when.getFullYear()}-${String(when.getMonth() + 1).padStart(2, "0")}-${String(when.getDate()).padStart(2, "0")}`;
    const at = `${String(when.getHours()).padStart(2, "0")}:${String(when.getMinutes()).padStart(2, "0")}`;
    s.observations.push({
      id: uid(),
      profileId: p.id,
      date,
      metric,
      value,
      unit: METRICS.find((m) => m.id === metric)!.unit,
      source: "Démonstration fictive",
      batchId: null,
      at,
      durationMinutes:
        METRICS.find((m) => m.id === metric)!.unit === "min" ? value : null,
    });
  }
  return p;
}

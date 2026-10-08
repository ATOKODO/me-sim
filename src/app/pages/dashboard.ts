import {
  I18n,
  TranslatePipe,
  LocalDatePipe,
  LocalNumberPipe,
} from "../core/i18n";
import {
  Component,
  computed,
  effect,
  inject,
  OnDestroy,
  signal,
  ViewChild,
} from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { Store } from "../core/store";
import {
  DEFAULT_TARGET,
  HABIT_METRICS,
  METRICS,
  Observation,
  TargetDay,
} from "../core/models";
import { evaluateHabitDay } from "../core/habit-tracking";
import { Icon } from "../core/icon";
import { Chart } from "../core/chart";
import { UiButton } from "../ui/button";
import { MetricCard } from "../ui/metric-card";
import { AvatarScene } from "../scene/avatar";
@Component({
  imports: [
    UiButton,
    MetricCard,
    TranslatePipe,
    LocalDatePipe,
    LocalNumberPipe,
    RouterLink,
    Icon,
    Chart,
    AvatarScene,
    ReactiveFormsModule,
  ],
  template: `<div class="page-heading">
      <div>
        <div class="eyebrow">{{ date() | localDate: "EEEE d MMMM yyyy" }}</div>
        <h1>
          {{ "Un peu plus toi, chaque jour" | t }}<span class="accent">.</span>
        </h1>
        <p>
          {{
            "Observe tes habitudes. Explore tes possibles. Avance à ton rythme."
              | t
          }}
        </p>
      </div>
      <a uiButton="primary" routerLink="/journal"
        ><ui-icon name="plus" /> {{ "Ajouter une mesure" | t }}</a
      >
    </div>
    @if (store.profile(); as profile) {
      <div class="dashboard-grid">
        <section class="panel avatar-panel">
          <div class="panel-heading">
            <div>
              <span class="eyebrow">{{ "ICI ET MAINTENANT" | t }}</span>
              <h2>{{ "Ton avatar aujourd’hui" | t }}</h2>
            </div>
            <span class="pill">{{
              profile.demo ? tr("DÉMONSTRATION") : tr("MON AVATAR")
            }}</span>
          </div>
          <div class="main-scene">
            <avatar-scene
              [color]="profile.color"
              [animations]="store.data().settings.animations"
              [jitter]="store.data().settings.jitter"
              [mode]="mode()"
              [replayKey]="replayKey()"
            />
          </div>
          <div class="avatar-toolbar">
            <div>
              <strong>{{ profile.name }}</strong
              ><span>{{ "Un reflet de toi. À ta façon." | t }}</span>
            </div>
            <div
              class="scene-controls"
              [attr.aria-label]="'Animation de l’avatar' | t"
            >
              @for (m of modes; track m.id) {
                <button
                  [class.selected]="mode() === m.id"
                  [attr.aria-pressed]="mode() === m.id"
                  (click)="previewMode(m.id)"
                  [title]="tr(m.label)"
                >
                  <ui-icon [name]="m.icon" /><span>{{ tr(m.label) }}</span>
                </button>
              }
              <label class="scene-preview">
                {{ "Prévisualiser" | t }}
                <select
                  [attr.aria-label]="
                    'Prévisualiser l’animation d’une habitude' | t
                  "
                  [value]="mode()"
                  (change)="previewMode($any($event.target).value)"
                >
                  @for (m of previewModes; track m.id) {
                    <option [value]="m.id">{{ tr(m.label) }}</option>
                  }
                </select>
              </label>
            </div>
          </div>
        </section>
        <section class="today-column">
          <div class="section-inline">
            <h2>{{ "Tes repères" | t }}</h2>
            <span>{{ "Dernières mesures" | t }}</span>
          </div>
          @for (m of essentials; track m.id) {
            <ui-metric-card
              [label]="m.label"
              [unit]="m.unit"
              [icon]="m.icon"
              [color]="m.color"
              [value]="store.latest(m.id)?.value ?? null"
              [date]="store.latest(m.id)?.date ?? null"
              [demo]="profile.demo"
              [values]="values(m.id)"
            />
          }
          <a class="subtle-link" routerLink="/journal"
            >{{ "Voir toutes mes mesures" | t }} <ui-icon name="arrow"
          /></a>
        </section>
      </div>
      <div class="lower-grid">
        <section class="future-card">
          <div class="eyebrow">
            <span class="tiny-square"></span>
            {{ "LE FUTUR N’EST PAS ÉCRIT" | t }}
          </div>
          <h2>
            {{ "Et si tu changeais" | t }}<br />{{
              "une petite habitude ?" | t
            }}
          </h2>
          <p>
            {{ "Prépare un scénario et découvre les hypothèses" | t
            }}<br class="desktop-break" />

            {{ "nécessaires pour comparer tes futurs." | t }}
          </p>
          <a uiButton="primary" routerLink="/futurs"
            >{{ "Explorer mes futurs" | t }} <ui-icon name="arrow"
          /></a>
          <div class="future-art" aria-hidden="true">
            <span class="orbit o1"></span><span class="orbit o2"></span
            ><span class="orbit o3"></span>
          </div>
          <span class="lab-note">{{
            "LAB · Modèle scientifique en validation" | t
          }}</span>
        </section>
        <section class="panel trend-card">
          <div class="panel-heading">
            <div>
              <span class="eyebrow">{{ "LES PETITS PAS COMPTENT" | t }}</span>
              <h2>{{ "Ton activité au fil du temps" | t }}</h2>
            </div>
            <span class="pill muted">{{ "28 MESURES" | t }}</span>
          </div>
          <div class="chart-legend">
            <span class="legend-dot"></span> {{ "Pas enregistrés" | t }}
            <span>{{ "· observations" | t }}</span>
          </div>
          <mini-chart
            [values]="values('steps')"
            [label]="'Pas enregistrés, jusqu’aux 28 dernières mesures' | t"
          />
          <div class="chart-range">
            <span>{{
              store.series("steps")[0]?.date | localDate: "d MMM"
            }}</span
            ><span>{{ store.latest("steps")?.date | localDate: "d MMM" }}</span>
          </div>
          <div class="info-footnote">
            <ui-icon name="info" />{{
              "Les tendances décrivent ton historique, sans prédire ta santé."
                | t
            }}
          </div>
        </section>
      </div>
      <section class="panel habit-today-card">
        <div>
          <span class="eyebrow">{{ "MON CHECK-IN" | t }}</span>
          <h2>{{ "Mes habitudes aujourd’hui" | t }}</h2>
          @if (habitToday().total) {
            <p>
              {{ habitToday().answered }} / {{ habitToday().total }}
              {{ "réponses" | t }}
              {{
                habitToday().validated
                  ? tr("· journée validée")
                  : tr("· à compléter")
              }}
            </p>
          } @else {
            <p>
              {{ "Choisis les habitudes que tu veux suivre au quotidien." | t }}
            </p>
          }
        </div>
        <a uiButton="primary" routerLink="/habitudes">
          <ui-icon name="check" />
          {{
            habitToday().total
              ? tr("Renseigner ma journée")
              : tr("Configurer mes habitudes")
          }}
        </a>
      </section>
      <section class="panel day-panel">
        <div class="panel-heading day-panel-heading">
          <div>
            <span class="eyebrow">{{ "LES 24 DERNIÈRES HEURES" | t }}</span>
            <h2>{{ "La journée de" | t }} {{ profile.name }}</h2>
            <p class="day-intro">
              {{
                "Fais défiler les activités et regarde ton avatar les rejouer dans l’ordre. Chaque moment est résumé en une courte séquence."
                  | t
              }}
            </p>
          </div>
          <button
            uiButton="secondary"
            (click)="replay()"
            [disabled]="!store.dayEvents().length"
          >
            <ui-icon [name]="replaying() ? 'pause' : 'play'" />{{
              replaying()
                ? tr("Arrêter la relecture")
                : tr("Rejouer la journée")
            }}
          </button>
        </div>
        <div
          class="timeline-scroll"
          tabindex="0"
          [attr.aria-label]="'Timeline des dernières 24 heures' | t"
        >
          @for (event of store.dayEvents(); track event.observation.id) {
            <button
              class="timeline-event"
              [class.active]="selectedEvent()?.id === event.observation.id"
              [class.negative]="
                !store.metric(event.observation.metric).positive
              "
              (click)="selectEvent(event.observation)"
            >
              <span class="timeline-time">{{ event.observation.at }}</span>
              <span class="timeline-dot"></span>
              <strong>{{
                tr(store.metric(event.observation.metric).label)
              }}</strong>
              <span class="timeline-value"
                >{{ event.observation.value | localNumber: "1.0-0" }}
                {{ tr(event.observation.unit) }}</span
              >
            </button>
          } @empty {
            <div class="timeline-empty">
              <ui-icon name="info" />{{
                "Aucune activité horodatée sur les dernières 24 h. Ajoute un moment dans le journal."
                  | t
              }}
            </div>
          }
        </div>
        <div class="day-recap">
          <div class="recap-title">
            <ui-icon name="journal" /> {{ "Récap d’aujourd’hui" | t }}
            <span>{{ store.dayRecap().events }} {{ "moments" | t }}</span>
          </div>
          <p class="field-help">
            {{
              "Observations renseignées aujourd’hui. — indique une donnée inconnue. Le total d’activité déclaré inclut déjà la marche et le sport."
                | t
            }}
          </p>
          <div class="recap-grid">
            <div>
              <span>{{ "Actif" | t }}</span
              ><strong
                >{{ store.dayRecap().activeMinutes ?? "—"
                }}<small> {{ "min" | t }}</small></strong
              >
            </div>
            <div>
              <span>{{ "Sommeil aujourd’hui" | t }}</span
              ><strong
                >{{ store.dayRecap().sleepHours ?? "—"
                }}<small> {{ "h" | t }}</small></strong
              >
            </div>
            <div>
              <span>{{ "Social" | t }}</span
              ><strong
                >{{ store.dayRecap().socialMinutes ?? "—"
                }}<small> {{ "min" | t }}</small></strong
              >
            </div>
            <div class="recap-negative">
              <span>{{ "Écran + jeux" | t }}</span
              ><strong
                >{{ store.dayRecap().screenAndGamingMinutes ?? "—"
                }}<small> {{ "min" | t }}</small></strong
              >
            </div>
            <div class="recap-negative">
              <span>{{ "Alcool" | t }}</span
              ><strong
                >{{ store.dayRecap().alcohol ?? "—"
                }}<small> {{ "verres" | t }}</small></strong
              >
            </div>
            <div class="recap-negative">
              <span>{{ "Tabac" | t }}</span
              ><strong
                >{{ store.dayRecap().tobaccoCigarettes ?? "—"
                }}<small> {{ "cigarettes" | t }}</small></strong
              >
            </div>
            <div class="recap-negative">
              <span>{{ "Vapotage" | t }}</span
              ><strong
                >{{ store.dayRecap().vapingMinutes ?? "—"
                }}<small> {{ "min" | t }}</small></strong
              >
            </div>
            <div class="recap-negative">
              <span>{{ "Écran le soir" | t }}</span
              ><strong
                >{{ store.dayRecap().eveningScreenMinutes ?? "—"
                }}<small> {{ "min" | t }}</small></strong
              >
            </div>
            <div class="recap-negative">
              <span>{{ "Sédentarité" | t }}</span
              ><strong
                >{{ store.dayRecap().sedentaryMinutes ?? "—"
                }}<small> {{ "min" | t }}</small></strong
              >
            </div>
          </div>
        </div>
      </section>
      <div class="target-layout">
        <section class="panel target-editor">
          <div class="panel-heading">
            <div>
              <span class="eyebrow">{{ "PROFIL TARGET" | t }}</span>
              <h2>{{ "Ma journée idéale, à ma portée" | t }}</h2>
            </div>
            <span class="pill target-pill">{{ "CIBLE LOCALE" | t }}</span>
          </div>
          <p class="target-copy">
            {{
              "Décris une journée que tu veux atteindre. Les écarts servent de repère personnel, jamais de note médicale. Les valeurs de départ sont modifiables et ne constituent pas des recommandations."
                | t
            }}
          </p>
          <form
            class="target-form"
            [formGroup]="targetForm"
            (ngSubmit)="saveTarget()"
          >
            <div class="target-fields">
              <label
                >{{ "Sommeil cible (h)" | t
                }}<input
                  type="number"
                  formControlName="sleepHours"
                  min="0"
                  max="24"
                  step="0.5"
              /></label>
              <label
                >{{ "Pas cibles" | t
                }}<input
                  type="number"
                  formControlName="steps"
                  min="0"
                  max="200000"
                  step="500"
              /></label>
              <label
                >{{ "Activité totale (min)" | t
                }}<input
                  type="number"
                  formControlName="activityMinutes"
                  min="0"
                  max="1440"
                  step="5"
              /></label>
              <label
                >{{ "Sport (min)" | t
                }}<input
                  type="number"
                  formControlName="exerciseMinutes"
                  min="0"
                  max="1440"
                  step="5"
              /></label>
              <label
                >{{ "Marche (min)" | t
                }}<input
                  type="number"
                  formControlName="walkMinutes"
                  min="0"
                  max="1440"
                  step="5"
              /></label>
              <label
                >{{ "Temps social (min)" | t
                }}<input
                  type="number"
                  formControlName="socialMinutes"
                  min="0"
                  max="1440"
                  step="5"
              /></label>
              <label
                >{{ "Réseaux / écran max (min)" | t
                }}<input
                  type="number"
                  formControlName="screenMinutes"
                  min="0"
                  max="1440"
                  step="5"
              /></label>
              <label
                >{{ "Jeux vidéo max (min)" | t
                }}<input
                  type="number"
                  formControlName="gamingMinutes"
                  min="0"
                  max="1440"
                  step="5"
              /></label>
              <label
                >{{ "Alcool max (verres)" | t
                }}<input
                  type="number"
                  formControlName="alcoholGlasses"
                  min="0"
                  max="20"
                  step="1"
              /></label>
              <label
                >{{ "Tabac max (cigarettes)" | t
                }}<input
                  type="number"
                  formControlName="tobaccoCigarettes"
                  min="0"
                  max="100"
                  step="1"
              /></label>
              <label
                >{{ "Vapotage max (min)" | t
                }}<input
                  type="number"
                  formControlName="vapingMinutes"
                  min="0"
                  max="1440"
                  step="5"
              /></label>
              <label
                >{{ "Écran le soir max (min)" | t
                }}<input
                  type="number"
                  formControlName="eveningScreenMinutes"
                  min="0"
                  max="1440"
                  step="5"
              /></label>
              <label
                >{{ "Sédentarité max (min)" | t
                }}<input
                  type="number"
                  formControlName="sedentaryMinutes"
                  min="0"
                  max="1440"
                  step="5"
              /></label>
            </div>
            <button
              uiButton="primary"
              [disabled]="targetForm.invalid || store.busy()"
            >
              <ui-icon name="check" /> {{ "Enregistrer ma cible" | t }}
            </button>
          </form>
        </section>
        <section class="panel deviation-panel">
          <div class="panel-heading">
            <div>
              <span class="eyebrow">{{ "TRAJECTOIRE" | t }}</span>
              <h2>{{ "Ma déviation vers le Target" | t }}</h2>
            </div>
            <span class="pill muted">{{ "7 JOURS" | t }}</span>
          </div>
          <p class="deviation-copy">
            {{
              "La déviation compare uniquement les indicateurs renseignés à ta cible. Une journée partielle peut afficher 0 % : vérifie sa couverture. Pour une cible à zéro, toute quantité positive compte comme un écart complet pour cet indicateur."
                | t
            }}
          </p>
          <div
            class="deviation-chart"
            role="img"
            [attr.aria-label]="
              'Déviation de la trajectoire sur les sept derniers jours' | t
            "
          >
            @for (point of store.targetTrajectory(); track point.date) {
              <div class="deviation-day">
                <span class="deviation-number">{{
                  point.deviation === null ? "?" : point.deviation + "%"
                }}</span>
                <span
                  class="deviation-coverage"
                  [attr.title]="tr('Indicateurs renseignés')"
                  >{{ point.coverage }} / {{ point.total
                  }}<span class="sr-only">
                    {{ "indicateurs renseignés" | t }}</span
                  ></span
                >
                <div class="deviation-track">
                  <span
                    [class.unknown]="point.deviation === null"
                    [class.on-target]="point.deviation === 0"
                    [style.height.%]="barHeight(point.deviation)"
                  ></span>
                </div>
                <span class="deviation-date">{{
                  point.date | localDate: "EEE"
                }}</span>
              </div>
            }
          </div>
          <div class="deviation-legend">
            <span class="legend-dot"></span>
            {{ "observations disponibles" | t }}
            <span class="legend-unknown">?</span> {{ "données manquantes" | t }}
          </div>
        </section>
      </div>
    } @else {
      <section class="empty-state panel">
        <h2>{{ "Ton histoire commence ici." | t }}</h2>
        <p>
          {{
            "Crée ton premier profil ou explore un monde de démonstration." | t
          }}
        </p>
        <div class="button-row">
          <a uiButton="primary" routerLink="/profils"
            >{{ "Créer mon profil" | t }} <ui-icon name="arrow" /></a
          ><button
            uiButton="secondary"
            (click)="store.mutate({ type: 'demo' })"
            [disabled]="store.busy()"
          >
            {{ "Explorer la démo" | t }}
          </button>
        </div>
      </section>
    }`,
})
export class Dashboard implements OnDestroy {
  i18n = inject(I18n);
  tr = this.i18n.t;
  @ViewChild(AvatarScene) avatar?: AvatarScene;
  store = inject(Store);
  fb = inject(FormBuilder);
  date = computed(() => new Date(this.store.clock.now()));
  habitToday = computed(() =>
    evaluateHabitDay(
      this.store.habits(),
      this.store
        .habitDays()
        .find((day) => day.date === this.store.clock.today()),
      this.store.clock.today(),
    ),
  );
  essentials = METRICS.slice(0, 3);
  mode = signal("idle");
  replayKey = signal(0);
  selectedEvent = signal<Observation | null>(null);
  replaying = signal(false);
  private replayTimer?: ReturnType<typeof setTimeout>;
  private replayGeneration = 0;
  targetForm = this.fb.group({
    sleepHours: [
      DEFAULT_TARGET.sleepHours,
      [Validators.min(0), Validators.max(24)],
    ],
    steps: [DEFAULT_TARGET.steps, [Validators.min(0), Validators.max(200000)]],
    activityMinutes: [
      DEFAULT_TARGET.activityMinutes,
      [Validators.min(0), Validators.max(1440)],
    ],
    exerciseMinutes: [
      DEFAULT_TARGET.exerciseMinutes,
      [Validators.min(0), Validators.max(1440)],
    ],
    walkMinutes: [
      DEFAULT_TARGET.walkMinutes,
      [Validators.min(0), Validators.max(1440)],
    ],
    socialMinutes: [
      DEFAULT_TARGET.socialMinutes,
      [Validators.min(0), Validators.max(1440)],
    ],
    screenMinutes: [
      DEFAULT_TARGET.screenMinutes,
      [Validators.min(0), Validators.max(1440)],
    ],
    gamingMinutes: [
      DEFAULT_TARGET.gamingMinutes,
      [Validators.min(0), Validators.max(1440)],
    ],
    alcoholGlasses: [
      DEFAULT_TARGET.alcoholGlasses,
      [Validators.min(0), Validators.max(20)],
    ],
    tobaccoCigarettes: [
      DEFAULT_TARGET.tobaccoCigarettes,
      [Validators.min(0), Validators.max(100), Validators.pattern(/^\d+$/)],
    ],
    vapingMinutes: [
      DEFAULT_TARGET.vapingMinutes,
      [Validators.min(0), Validators.max(1440)],
    ],
    eveningScreenMinutes: [
      DEFAULT_TARGET.eveningScreenMinutes,
      [Validators.min(0), Validators.max(1440)],
    ],
    sedentaryMinutes: [
      DEFAULT_TARGET.sedentaryMinutes,
      [Validators.min(0), Validators.max(1440)],
    ],
  });
  private targetFormSource = "";
  private targetProfile = "";
  private targetBaseline: TargetDay = { ...DEFAULT_TARGET };
  constructor() {
    effect(() => {
      const target = this.store.target();
      const source = JSON.stringify([this.store.activeId(), target]);
      if (source === this.targetFormSource) return;
      const profile = this.store.activeId();
      if (profile === this.targetProfile && this.targetForm.dirty) return;
      this.targetProfile = profile;
      this.targetFormSource = source;
      this.targetBaseline = { ...target };
      this.targetForm.reset(target, { emitEvent: false });
    });
    effect(() => {
      this.store.activeId();
      this.stopReplay();
      this.selectedEvent.set(null);
      this.mode.set("idle");
      this.replayKey.set(0);
    });
  }
  modes = [
    { id: "idle", label: "Pause", icon: "sun" },
    { id: "walk", label: "Marche", icon: "steps" },
    { id: "rest", label: "Repos", icon: "moon" },
    { id: "exercise", label: "Sport", icon: "activity" },
  ];
  previewModes = [
    { id: "idle", label: "Pause" },
    ...HABIT_METRICS.map((metric) => ({
      id: metric.id,
      label: metric.label,
    })),
  ];
  values(metric: string) {
    return this.store.series(metric).map((o) => o.value);
  }
  barHeight(value: number | null) {
    return value === null ? 8 : Math.max(8, Math.min(100, value));
  }
  async saveTarget() {
    if (this.targetForm.invalid) return;
    const value = this.targetForm.getRawValue();
    const target: TargetDay = {
      sleepHours: Number(value.sleepHours ?? 0),
      steps: Number(value.steps ?? 0),
      activityMinutes: Number(value.activityMinutes ?? 0),
      exerciseMinutes: Number(value.exerciseMinutes ?? 0),
      walkMinutes: Number(value.walkMinutes ?? 0),
      socialMinutes: Number(value.socialMinutes ?? 0),
      screenMinutes: Number(value.screenMinutes ?? 0),
      gamingMinutes: Number(value.gamingMinutes ?? 0),
      alcoholGlasses: Number(value.alcoholGlasses ?? 0),
      tobaccoCigarettes: Number(value.tobaccoCigarettes ?? 0),
      vapingMinutes: Number(value.vapingMinutes ?? 0),
      eveningScreenMinutes: Number(value.eveningScreenMinutes ?? 0),
      sedentaryMinutes: Number(value.sedentaryMinutes ?? 0),
    };
    const merged = { ...this.store.target() };
    for (const key of Object.keys(target) as (keyof TargetDay)[]) {
      if (target[key] !== this.targetBaseline[key]) merged[key] = target[key];
    }
    if (await this.store.saveTarget(merged)) {
      this.targetBaseline = { ...merged };
      this.targetForm.reset(merged, { emitEvent: false });
    }
  }
  selectEvent(o: Observation) {
    this.stopReplay();
    this.showEvent(o);
  }
  private showEvent(o: Observation) {
    this.selectedEvent.set(o);
    this.mode.set(o.metric);
    this.replayKey.update((key) => key + 1);
  }
  previewMode(mode: string) {
    if (!this.previewModes.some((item) => item.id === mode)) return;
    this.stopReplay();
    this.selectedEvent.set(null);
    this.mode.set(mode);
    this.replayKey.update((key) => key + 1);
  }
  async replay() {
    if (this.replaying()) {
      this.stopReplay();
      return;
    }
    const events = this.store.dayEvents().map((v) => v.observation);
    if (!events.length) return;
    this.stopReplay();
    const generation = this.replayGeneration;
    this.replaying.set(true);
    await this.avatar?.prepareModes([
      ...new Set(events.map((event) => event.metric)),
    ]);
    if (generation !== this.replayGeneration) return;
    let index = 0;
    const next = () => {
      if (generation !== this.replayGeneration) return;
      if (index >= events.length) {
        this.stopReplay();
        return;
      }
      this.showEvent(events[index++]);
      this.replayTimer = setTimeout(next, 2000);
    };
    next();
  }
  private stopReplay() {
    this.replayGeneration += 1;
    if (this.replayTimer) clearTimeout(this.replayTimer);
    this.replayTimer = undefined;
    this.replaying.set(false);
  }
  ngOnDestroy() {
    this.stopReplay();
  }
}

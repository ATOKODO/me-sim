import {
  Component,
  computed,
  effect,
  inject,
  OnDestroy,
  signal,
  ViewChild,
} from "@angular/core";
import { DatePipe, DecimalPipe } from "@angular/common";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { Store } from "../core/store";
import {
  DEFAULT_TARGET,
  HABIT_METRICS,
  METRICS,
  Observation,
  TargetDay,
  today,
} from "../core/models";
import { evaluateHabitDay } from "../core/habit-tracking";
import { Icon } from "../core/icon";
import { Chart } from "../core/chart";
import { AvatarScene } from "../scene/avatar";
@Component({
  imports: [
    DatePipe,
    DecimalPipe,
    RouterLink,
    Icon,
    Chart,
    AvatarScene,
    ReactiveFormsModule,
  ],
  template: `<div class="page-heading">
      <div>
        <div class="eyebrow">{{ date | date: "EEEE d MMMM yyyy" }}</div>
        <h1>Un peu plus toi, chaque jour<span class="accent">.</span></h1>
        <p>
          Observe tes habitudes. Explore tes possibles. Avance à ton rythme.
        </p>
      </div>
      <a class="button primary" routerLink="/journal"
        ><ui-icon name="plus" /> Ajouter une mesure</a
      >
    </div>
    @if (store.profile(); as profile) {
      <div class="dashboard-grid">
        <section class="panel avatar-panel">
          <div class="panel-heading">
            <div>
              <span class="eyebrow">ICI ET MAINTENANT</span>
              <h2>Ton avatar aujourd’hui</h2>
            </div>
            <span class="pill">{{
              profile.demo ? "DÉMONSTRATION" : "MON AVATAR"
            }}</span>
          </div>
          <div class="main-scene">
            <avatar-scene
              [color]="profile.color"
              [animations]="store.data().settings.animations"
              [jitter]="store.data().settings.jitter"
              [force2d]="store.data().settings.force2d"
              [mode]="mode()"
              [replayKey]="replayKey()"
            />
          </div>
          <div class="avatar-toolbar">
            <div>
              <strong>{{ profile.name }}</strong
              ><span>Un reflet de toi. À ta façon.</span>
            </div>
            <div class="scene-controls" aria-label="Animation de l’avatar">
              @for (m of modes; track m.id) {
                <button
                  [class.selected]="mode() === m.id"
                  [attr.aria-pressed]="mode() === m.id"
                  (click)="previewMode(m.id)"
                  [title]="m.label"
                >
                  <ui-icon [name]="m.icon" /><span>{{ m.label }}</span>
                </button>
              }
              <label class="scene-preview">
                Prévisualiser
                <select
                  aria-label="Prévisualiser l’animation d’une habitude"
                  [value]="mode()"
                  (change)="previewMode($any($event.target).value)"
                >
                  @for (m of previewModes; track m.id) {
                    <option [value]="m.id">{{ m.label }}</option>
                  }
                </select>
              </label>
            </div>
          </div>
        </section>
        <section class="today-column">
          <div class="section-inline">
            <h2>Tes repères</h2>
            <span>Dernières mesures</span>
          </div>
          @for (m of essentials; track m.id) {
            <article class="metric-card">
              <div class="metric-icon" [style.color]="m.color">
                <ui-icon [name]="m.icon" />
              </div>
              <div class="metric-body">
                <span>{{ m.label }}</span>
                <div class="metric-value">
                  @if (store.latest(m.id); as o) {
                    {{ o.value | number: "1.0-1" }}<small>{{ m.unit }}</small>
                  } @else {
                    <span class="unknown">Non renseigné</span>
                  }
                </div>
                <span class="metric-date"
                  >{{ store.latest(m.id)?.date | date: "d MMM" }}
                  @if (profile.demo) {
                    · données fictives
                  }
                </span>
              </div>
              <mini-chart
                [values]="values(m.id)"
                [color]="m.color"
                [label]="'Historique : ' + m.label"
              />
            </article>
          }
          <a class="subtle-link" routerLink="/journal"
            >Voir toutes mes mesures <ui-icon name="arrow"
          /></a>
        </section>
      </div>
      <div class="lower-grid">
        <section class="future-card">
          <div class="eyebrow">
            <span class="tiny-square"></span> LE FUTUR N’EST PAS ÉCRIT
          </div>
          <h2>Et si tu changeais<br />une petite habitude ?</h2>
          <p>
            Prépare un scénario et découvre les hypothèses<br
              class="desktop-break"
            />
            nécessaires pour comparer tes futurs.
          </p>
          <a class="button primary" routerLink="/futurs"
            >Explorer mes futurs <ui-icon name="arrow"
          /></a>
          <div class="future-art" aria-hidden="true">
            <span class="orbit o1"></span><span class="orbit o2"></span
            ><span class="orbit o3"></span><span class="gem g1">◆</span
            ><span class="gem g2">◆</span><span class="gem g3">◆</span>
          </div>
          <span class="lab-note">LAB · Modèle scientifique en validation</span>
        </section>
        <section class="panel trend-card">
          <div class="panel-heading">
            <div>
              <span class="eyebrow">LES PETITS PAS COMPTENT</span>
              <h2>Ton activité au fil du temps</h2>
            </div>
            <span class="pill muted">28 MESURES</span>
          </div>
          <div class="chart-legend">
            <span class="legend-dot"></span> Pas enregistrés
            <span>· observations</span>
          </div>
          <mini-chart
            [values]="values('steps')"
            label="Pas enregistrés, jusqu’aux 28 dernières mesures"
          />
          <div class="chart-range">
            <span>{{ store.series("steps")[0]?.date | date: "d MMM" }}</span
            ><span>{{ store.latest("steps")?.date | date: "d MMM" }}</span>
          </div>
          <div class="info-footnote">
            <ui-icon name="info" />Les tendances décrivent ton historique, sans
            prédire ta santé.
          </div>
        </section>
      </div>
      <section class="panel habit-today-card">
        <div>
          <span class="eyebrow">MON CHECK-IN</span>
          <h2>Mes habitudes aujourd’hui</h2>
          @if (habitToday().total) {
            <p>
              {{ habitToday().answered }} / {{ habitToday().total }} réponses
              {{
                habitToday().validated ? "· journée validée" : "· à compléter"
              }}
            </p>
          } @else {
            <p>Choisis les habitudes que tu veux suivre au quotidien.</p>
          }
        </div>
        <a class="button primary" routerLink="/habitudes">
          <ui-icon name="check" />
          {{
            habitToday().total
              ? "Renseigner ma journée"
              : "Configurer mes habitudes"
          }}
        </a>
      </section>
      <section class="panel day-panel">
        <div class="panel-heading day-panel-heading">
          <div>
            <span class="eyebrow">LES 24 DERNIÈRES HEURES</span>
            <h2>La journée de {{ profile.name }}</h2>
            <p class="day-intro">
              Fais défiler les activités et regarde ton avatar les rejouer dans
              l’ordre. Chaque moment est résumé en une courte séquence.
            </p>
          </div>
          <button
            class="button secondary"
            (click)="replay()"
            [disabled]="!store.dayEvents().length"
          >
            <ui-icon [name]="replaying() ? 'pause' : 'play'" />{{
              replaying() ? "Arrêter la relecture" : "Rejouer la journée"
            }}
          </button>
        </div>
        <div
          class="timeline-scroll"
          tabindex="0"
          aria-label="Timeline des dernières 24 heures"
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
                store.metric(event.observation.metric).label
              }}</strong>
              <span class="timeline-value"
                >{{ event.observation.value | number: "1.0-0" }}
                {{ event.observation.unit }}</span
              >
            </button>
          } @empty {
            <div class="timeline-empty">
              <ui-icon name="info" />Aucune activité horodatée sur les dernières
              24 h. Ajoute un moment dans le journal.
            </div>
          }
        </div>
        <div class="day-recap">
          <div class="recap-title">
            <ui-icon name="journal" /> Récap de la journée
            <span>{{ store.dayRecap().events }} moments</span>
          </div>
          <div class="recap-grid">
            <div>
              <span>Actif</span
              ><strong
                >{{ store.dayRecap().activeMinutes }}<small> min</small></strong
              >
            </div>
            <div>
              <span>Sommeil récent</span
              ><strong
                >{{ store.dayRecap().sleepHours ?? "—"
                }}<small> h</small></strong
              >
            </div>
            <div>
              <span>Social</span
              ><strong
                >{{ store.dayRecap().socialMinutes }}<small> min</small></strong
              >
            </div>
            <div class="recap-negative">
              <span>Écran + jeux</span
              ><strong
                >{{
                  store.dayRecap().screenMinutes +
                    store.dayRecap().gamingMinutes
                }}<small> min</small></strong
              >
            </div>
            <div class="recap-negative">
              <span>Alcool</span
              ><strong
                >{{ store.dayRecap().alcohol }}<small> verres</small></strong
              >
            </div>
            <div class="recap-negative">
              <span>Tabac</span
              ><strong
                >{{ store.dayRecap().tobaccoCigarettes
                }}<small> cigarettes</small></strong
              >
            </div>
            <div class="recap-negative">
              <span>Vapotage</span
              ><strong
                >{{ store.dayRecap().vapingMinutes }}<small> min</small></strong
              >
            </div>
            <div class="recap-negative">
              <span>Écran le soir</span
              ><strong
                >{{ store.dayRecap().eveningScreenMinutes
                }}<small> min</small></strong
              >
            </div>
            <div class="recap-negative">
              <span>Sédentarité</span
              ><strong
                >{{ store.dayRecap().sedentaryMinutes
                }}<small> min</small></strong
              >
            </div>
          </div>
        </div>
      </section>
      <div class="target-layout">
        <section class="panel target-editor">
          <div class="panel-heading">
            <div>
              <span class="eyebrow">PROFIL TARGET</span>
              <h2>Ma journée idéale, à ma portée</h2>
            </div>
            <span class="pill target-pill">CIBLE LOCALE</span>
          </div>
          <p class="target-copy">
            Décris une journée que tu veux atteindre. Les écarts servent de
            repère personnel, jamais de note médicale. Les valeurs de départ
            sont modifiables et ne constituent pas des recommandations.
          </p>
          <form
            class="target-form"
            [formGroup]="targetForm"
            (ngSubmit)="saveTarget()"
          >
            <div class="target-fields">
              <label
                >Sommeil cible (h)<input
                  type="number"
                  formControlName="sleepHours"
                  min="0"
                  max="24"
                  step="0.5"
              /></label>
              <label
                >Pas cibles<input
                  type="number"
                  formControlName="steps"
                  min="0"
                  max="200000"
                  step="500"
              /></label>
              <label
                >Activité totale (min)<input
                  type="number"
                  formControlName="activityMinutes"
                  min="0"
                  max="1440"
                  step="5"
              /></label>
              <label
                >Sport (min)<input
                  type="number"
                  formControlName="exerciseMinutes"
                  min="0"
                  max="1440"
                  step="5"
              /></label>
              <label
                >Marche (min)<input
                  type="number"
                  formControlName="walkMinutes"
                  min="0"
                  max="1440"
                  step="5"
              /></label>
              <label
                >Temps social (min)<input
                  type="number"
                  formControlName="socialMinutes"
                  min="0"
                  max="1440"
                  step="5"
              /></label>
              <label
                >Réseaux / écran max (min)<input
                  type="number"
                  formControlName="screenMinutes"
                  min="0"
                  max="1440"
                  step="5"
              /></label>
              <label
                >Jeux vidéo max (min)<input
                  type="number"
                  formControlName="gamingMinutes"
                  min="0"
                  max="1440"
                  step="5"
              /></label>
              <label
                >Alcool max (verres)<input
                  type="number"
                  formControlName="alcoholGlasses"
                  min="0"
                  max="20"
                  step="1"
              /></label>
              <label
                >Tabac max (cigarettes)<input
                  type="number"
                  formControlName="tobaccoCigarettes"
                  min="0"
                  max="100"
                  step="1"
              /></label>
              <label
                >Vapotage max (min)<input
                  type="number"
                  formControlName="vapingMinutes"
                  min="0"
                  max="1440"
                  step="5"
              /></label>
              <label
                >Écran le soir max (min)<input
                  type="number"
                  formControlName="eveningScreenMinutes"
                  min="0"
                  max="1440"
                  step="5"
              /></label>
              <label
                >Sédentarité max (min)<input
                  type="number"
                  formControlName="sedentaryMinutes"
                  min="0"
                  max="1440"
                  step="5"
              /></label>
            </div>
            <button
              class="button primary"
              [disabled]="targetForm.invalid || store.busy()"
            >
              <ui-icon name="check" /> Enregistrer ma cible
            </button>
          </form>
        </section>
        <section class="panel deviation-panel">
          <div class="panel-heading">
            <div>
              <span class="eyebrow">TRAJECTOIRE</span>
              <h2>Ma déviation vers le Target</h2>
            </div>
            <span class="pill muted">7 JOURS</span>
          </div>
          <p class="deviation-copy">
            0 % correspond à ta journée cible. Plus la barre monte, plus les
            observations s’en éloignent.
          </p>
          <div
            class="deviation-chart"
            role="img"
            aria-label="Déviation de la trajectoire sur les sept derniers jours"
          >
            @for (point of store.targetTrajectory(); track point.date) {
              <div class="deviation-day">
                <span class="deviation-number">{{
                  point.deviation === null ? "?" : point.deviation + "%"
                }}</span>
                <div class="deviation-track">
                  <span
                    [class.unknown]="point.deviation === null"
                    [class.on-target]="point.deviation === 0"
                    [style.height.%]="barHeight(point.deviation)"
                  ></span>
                </div>
                <span class="deviation-date">{{
                  point.date | date: "EEE"
                }}</span>
              </div>
            }
          </div>
          <div class="deviation-legend">
            <span class="legend-dot"></span> observations disponibles
            <span class="legend-unknown">?</span> données manquantes
          </div>
        </section>
      </div>
    } @else {
      <section class="empty-state panel">
        <span class="empty-gem">◆</span>
        <h2>Ton histoire commence ici.</h2>
        <p>Crée ton premier profil ou explore un monde de démonstration.</p>
        <div class="button-row">
          <a class="button primary" routerLink="/profils"
            >Créer mon profil <ui-icon name="arrow" /></a
          ><button
            class="button secondary"
            (click)="store.mutate({ type: 'demo' })"
            [disabled]="store.busy()"
          >
            Explorer la démo
          </button>
        </div>
      </section>
    }`,
})
export class Dashboard implements OnDestroy {
  @ViewChild(AvatarScene) avatar?: AvatarScene;
  store = inject(Store);
  fb = inject(FormBuilder);
  date = new Date();
  habitToday = computed(() =>
    evaluateHabitDay(
      this.store.habits(),
      this.store.habitDays().find((day) => day.date === today()),
      today(),
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
  constructor() {
    effect(() =>
      this.targetForm.patchValue(this.store.target(), { emitEvent: false }),
    );
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
    await this.store.saveTarget(target);
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

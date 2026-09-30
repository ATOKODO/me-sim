import { DatePipe } from "@angular/common";
import { Component, computed, effect, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { Store } from "../core/store";
import {
  HABIT_METRICS,
  HabitDefinition,
  HabitDay,
  today,
  uid,
} from "../core/models";
import {
  activeHabits,
  evaluateHabitDay,
  localDate,
  shiftDate,
} from "../core/habit-tracking";
import { Icon } from "../core/icon";

@Component({
  imports: [DatePipe, FormsModule, RouterLink, Icon],
  template: `
    <div class="page-heading">
      <div>
        <div class="eyebrow">UN GESTE À LA FOIS</div>
        <h1>Mes habitudes<span class="accent">.</span></h1>
        <p>Choisis ce que tu veux cultiver ou réduire, puis note ta journée.</p>
      </div>
      <a class="button secondary" routerLink="/journal"
        ><ui-icon name="journal" /> Journal détaillé</a
      >
    </div>
    @if (store.profile(); as profile) {
      <div class="habit-intro">
        <span class="pill">{{
          profile.demo ? "DÉMONSTRATION" : "PROFIL LOCAL"
        }}</span>
        <p>
          Le cap souhaité est simple : faire tes bonnes habitudes et éviter
          celles que tu veux réduire. Une coche indique seulement « oui » ou «
          non » ; les quantités restent dans le journal. Ce repère personnel
          n’est pas une évaluation médicale.
        </p>
      </div>
      <div class="habits-layout">
        <section class="panel habit-calendar-panel">
          <div class="panel-heading">
            <div>
              <span class="eyebrow">AU JOUR LE JOUR</span>
              <h2>Mon calendrier</h2>
            </div>
            <div class="habit-month-nav">
              <button aria-label="Mois précédent" (click)="moveMonth(-1)">
                ‹
              </button>
              <strong>{{ month() | date: "MMMM yyyy" }}</strong>
              <button
                aria-label="Mois suivant"
                (click)="moveMonth(1)"
                [disabled]="month() >= currentMonth"
              >
                ›
              </button>
            </div>
          </div>
          <div class="habit-calendar" role="group" aria-label="Choisir un jour">
            @for (weekday of weekdays; track $index) {
              <span class="habit-weekday">{{ weekday }}</span>
            }
            @for (cell of calendar(); track cell.date) {
              <button
                class="habit-calendar-day"
                [class.outside]="!cell.inMonth"
                [class.selected]="selectedDate() === cell.date"
                [class.validated]="cell.status === 'validated'"
                [class.partial]="cell.status === 'partial'"
                [disabled]="cell.date > todayKey"
                [attr.aria-label]="calendarLabel(cell.date, cell.status)"
                [attr.aria-pressed]="selectedDate() === cell.date"
                (click)="selectedDate.set(cell.date)"
              >
                <span>{{ cell.number }}</span
                ><i></i>
              </button>
            }
          </div>
          <div class="habit-calendar-legend">
            <span><i class="good-dot"></i> Validée</span>
            <span><i class="partial-dot"></i> En cours</span>
            <span><i class="empty-dot"></i> Non renseignée</span>
          </div>
        </section>

        <section class="panel habit-check-panel">
          <div class="panel-heading">
            <div>
              <span class="eyebrow">MES RÉPONSES</span>
              <h2>{{ selectedDate() | date: "EEEE d MMMM" }}</h2>
            </div>
            <span class="pill" [class.target-pill]="selectedStatus().validated">
              {{ selectedStatus().validated ? "VALIDÉE" : "À COMPLÉTER" }}
            </span>
          </div>
          @if (selectedHabits().length) {
            <p class="habit-progress">
              {{ selectedStatus().answered }} / {{ selectedStatus().total }}
              habitudes renseignées
              @if (selectedStatus().preview !== null) {
                · {{ selectedStatus().preview }} % en accord avec ton cap
                {{ selectedStatus().validated ? "" : "(aperçu)" }}
              }
            </p>
            <div class="habit-check-list">
              @for (habit of selectedHabits(); track habit.id) {
                <div class="habit-check-row" [class.bad]="habit.kind === 'bad'">
                  <div class="habit-check-name">
                    <span class="habit-kind-icon">
                      <ui-icon [name]="icon(habit)" />
                    </span>
                    <div>
                      <strong>{{ habit.label }}</strong>
                      <small>{{
                        habit.kind === "good" ? "À cultiver" : "À réduire"
                      }}</small>
                    </div>
                  </div>
                  <div
                    class="habit-answer-buttons"
                    [attr.aria-label]="habit.label"
                  >
                    <button
                      [class.chosen]="answerFor(habit) === true"
                      [attr.aria-pressed]="answerFor(habit) === true"
                      [disabled]="store.busy()"
                      (click)="setAnswer(habit, true)"
                    >
                      Oui
                    </button>
                    <button
                      [class.chosen]="answerFor(habit) === false"
                      [attr.aria-pressed]="answerFor(habit) === false"
                      [disabled]="store.busy()"
                      (click)="setAnswer(habit, false)"
                    >
                      Non
                    </button>
                    @if (answerFor(habit) !== null) {
                      <button
                        class="habit-clear"
                        [attr.aria-label]="
                          'Effacer la réponse : ' + habit.label
                        "
                        [disabled]="store.busy()"
                        (click)="setAnswer(habit, null)"
                      >
                        ×
                      </button>
                    }
                  </div>
                </div>
              }
            </div>
            <div class="habit-validation">
              <button
                class="button primary"
                [disabled]="
                  store.busy() ||
                  selectedStatus().answered !== selectedStatus().total ||
                  selectedStatus().validated
                "
                (click)="validateDay()"
              >
                <ui-icon name="check" />
                {{
                  selectedStatus().validated
                    ? "Journée validée"
                    : "Valider la journée"
                }}
              </button>
              <span>Tu peux corriger une réponse, puis revalider ce jour.</span>
            </div>
          } @else {
            <div class="habit-empty-day">
              <ui-icon name="info" /> Aucune habitude suivie à cette date.
              Ajoute-en une ci-dessous pour commencer aujourd’hui.
            </div>
          }
        </section>
      </div>

      <div class="habits-layout habit-lower-layout">
        <section class="panel habit-trajectory-panel">
          <div class="panel-heading">
            <div>
              <span class="eyebrow">TRAJECTOIRE PERSONNELLE</span>
              <h2>Vers la journée souhaitée</h2>
            </div>
            <span class="pill muted">14 JOURS</span>
          </div>
          <p>
            100 % signifie que toutes les habitudes suivies ont correspondu à
            ton cap ce jour-là. La ligne pointillée est le cap souhaité ; les
            jours non validés restent vides.
          </p>
          <svg
            class="habit-trajectory"
            viewBox="0 0 600 190"
            role="img"
            aria-label="Alignement quotidien avec la journée souhaitée sur quatorze jours"
          >
            <path
              d="M32 20H552"
              stroke="#bde883"
              stroke-dasharray="6 6"
              opacity=".7"
            />
            <path d="M32 90H552M32 160H552" stroke="#66716e" opacity=".3" />
            <text x="0" y="24">100</text>
            <text x="8" y="94">50</text>
            <text x="16" y="164">0</text>
            @if (trajectoryPath()) {
              <path
                [attr.d]="trajectoryPath()"
                fill="none"
                stroke="#f2b988"
                stroke-width="3"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            }
            @for (point of trajectory(); track point.date; let i = $index) {
              @if (point.score !== null) {
                <circle
                  [attr.cx]="x(i)"
                  [attr.cy]="y(point.score)"
                  r="4"
                  fill="#f2b988"
                >
                  <title>{{ point.date }} : {{ point.score }} %</title>
                </circle>
              } @else if (
                point.date === selectedDate() && point.preview !== null
              ) {
                <circle
                  [attr.cx]="x(i)"
                  [attr.cy]="y(point.preview)"
                  r="6"
                  fill="none"
                  stroke="#f2b988"
                  stroke-width="2"
                  stroke-dasharray="3 2"
                >
                  <title>Aperçu non validé : {{ point.preview }} %</title>
                </circle>
              }
            }
            <text x="32" y="185">
              {{ trajectory()[0].date | date: "d MMM" }}
            </text>
            <text x="552" y="185" text-anchor="end">
              {{ trajectory()[13].date | date: "d MMM" }}
            </text>
          </svg>
          <div class="habit-chart-legend">
            <span><i class="target-line"></i> Journée souhaitée</span>
            <span><i class="observed-line"></i> Jours validés</span>
            <span><i class="preview-ring"></i> Aperçu du jour sélectionné</span>
          </div>
        </section>

        <section class="panel habit-config-panel">
          <div class="panel-heading">
            <div>
              <span class="eyebrow">PERSONNALISER</span>
              <h2>Les habitudes que je suis</h2>
            </div>
            <span class="pill muted">{{ currentHabits().length }} ACTIVES</span>
          </div>
          <div class="habit-config-list">
            @for (habit of currentHabits(); track habit.id) {
              <div class="habit-config-row">
                <div>
                  <strong>{{ habit.label }}</strong>
                  <small>{{
                    habit.kind === "good" ? "Bonne habitude" : "À réduire"
                  }}</small>
                </div>
                <button
                  class="text-button"
                  [attr.aria-label]="'Retirer du suivi : ' + habit.label"
                  [disabled]="store.busy()"
                  (click)="archive(habit)"
                >
                  Retirer
                </button>
              </div>
            } @empty {
              <p>Aucune habitude configurée pour ce profil.</p>
            }
          </div>
          <div class="habit-add-form">
            <h3>Ajouter une habitude</h3>
            <label
              >Choisir un exemple
              <select
                aria-label="Choisir un exemple d’habitude"
                [ngModel]="preset()"
                (ngModelChange)="choosePreset($event)"
              >
                <option value="">Personnalisée</option>
                @for (metric of presets; track metric.id) {
                  <option [value]="metric.id">{{ metric.label }}</option>
                }
              </select></label
            >
            <label
              >Nom de l’habitude
              <input
                [ngModel]="newLabel()"
                (ngModelChange)="newLabel.set($event)"
                maxlength="100"
                placeholder="Ex. Courir, fumer, méditer…"
              />
            </label>
            <label
              >Je souhaite
              <select
                aria-label="Objectif de l’habitude"
                [ngModel]="newKind()"
                (ngModelChange)="newKind.set($event)"
              >
                <option value="good">La faire chaque jour</option>
                <option value="bad">L’éviter chaque jour</option>
              </select></label
            >
            <button
              class="button secondary"
              [disabled]="
                store.busy() ||
                !newLabel().trim() ||
                currentHabits().length >= 100
              "
              (click)="addHabit()"
            >
              <ui-icon name="plus" /> Ajouter au suivi
            </button>
          </div>
        </section>
      </div>
    } @else {
      <section class="panel empty-state">
        <h2>Commence par créer un profil.</h2>
        <p>Tes habitudes et ton calendrier resteront attachés à ce profil.</p>
        <a class="button primary" routerLink="/profils">Créer un profil</a>
      </section>
    }
  `,
})
export class Habits {
  store = inject(Store);
  todayKey = today();
  currentMonth = `${this.todayKey.slice(0, 7)}-01`;
  month = signal(this.currentMonth);
  selectedDate = signal(this.todayKey);
  preset = signal("");
  newLabel = signal("");
  newKind = signal<"good" | "bad">("good");
  weekdays = ["L", "M", "M", "J", "V", "S", "D"];
  presets = HABIT_METRICS;
  currentHabits = computed(() =>
    activeHabits(this.store.habits(), this.todayKey),
  );
  selectedHabits = computed(() =>
    activeHabits(this.store.habits(), this.selectedDate()),
  );
  selectedDay = computed(() =>
    this.store.habitDays().find((day) => day.date === this.selectedDate()),
  );
  selectedStatus = computed(() =>
    evaluateHabitDay(
      this.store.habits(),
      this.selectedDay(),
      this.selectedDate(),
    ),
  );
  calendar = computed(() => {
    const [year, month] = this.month().split("-").map(Number);
    const first = new Date(year, month - 1, 1, 12);
    const firstOffset = (first.getDay() + 6) % 7;
    const start = shiftDate(localDate(first), -firstOffset);
    return Array.from({ length: 42 }, (_, index) => {
      const date = shiftDate(start, index);
      const day = this.store.habitDays().find((item) => item.date === date);
      const result = evaluateHabitDay(this.store.habits(), day, date);
      return {
        date,
        number: Number(date.slice(-2)),
        inMonth: date.slice(0, 7) === this.month().slice(0, 7),
        status: result.validated
          ? "validated"
          : result.answered
            ? "partial"
            : "empty",
      };
    });
  });
  trajectory = computed(() =>
    Array.from({ length: 14 }, (_, index) => {
      const date = shiftDate(this.todayKey, index - 13);
      const day = this.store.habitDays().find((item) => item.date === date);
      return { date, ...evaluateHabitDay(this.store.habits(), day, date) };
    }),
  );
  trajectoryPath = computed(() => {
    let drawing = false;
    return this.trajectory()
      .map((point, index) => {
        if (point.score === null) {
          drawing = false;
          return "";
        }
        const segment = `${drawing ? "L" : "M"}${this.x(index)} ${this.y(point.score)}`;
        drawing = true;
        return segment;
      })
      .filter(Boolean)
      .join(" ");
  });

  constructor() {
    effect(() => {
      this.store.activeId();
      this.selectedDate.set(this.todayKey);
      this.month.set(this.currentMonth);
    });
  }

  x(index: number) {
    return 32 + index * 40;
  }
  y(score: number) {
    return 160 - score * 1.4;
  }
  icon(habit: HabitDefinition) {
    return (
      this.store.metric(habit.metric ?? "")?.icon ??
      (habit.kind === "good" ? "check" : "info")
    );
  }
  answerFor(habit: HabitDefinition): boolean | null {
    const answers = this.selectedDay()?.answers;
    return answers && Object.prototype.hasOwnProperty.call(answers, habit.id)
      ? answers[habit.id]
      : null;
  }
  calendarLabel(date: string, status: string) {
    const name = new Date(`${date}T12:00:00`).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    return `${name} · ${status === "validated" ? "validée" : status === "partial" ? "en cours" : "non renseignée"}`;
  }
  moveMonth(delta: number) {
    const [year, month] = this.month().split("-").map(Number);
    this.month.set(localDate(new Date(year, month - 1 + delta, 1, 12)));
  }
  choosePreset(metric: string) {
    this.preset.set(metric);
    const match = HABIT_METRICS.find((item) => item.id === metric);
    if (match) {
      this.newLabel.set(match.label);
      this.newKind.set(match.positive ? "good" : "bad");
    }
  }
  async addHabit() {
    const profile = this.store.profile();
    const label = this.newLabel().trim();
    if (!profile || !label || this.currentHabits().length >= 100) return;
    const habit: HabitDefinition = {
      id: uid(),
      label,
      kind: this.newKind(),
      startDate: this.todayKey,
      archivedAt: null,
      metric: (this.preset() || null) as HabitDefinition["metric"],
    };
    if (
      await this.store.mutate({
        type: "saveProfile",
        value: { ...profile, habits: [...(profile.habits ?? []), habit] },
      })
    ) {
      this.preset.set("");
      this.newLabel.set("");
      this.newKind.set("good");
    }
  }
  async archive(habit: HabitDefinition) {
    const profile = this.store.profile();
    if (!profile) return;
    await this.store.mutate({
      type: "saveProfile",
      value: {
        ...profile,
        habits: (profile.habits ?? []).map((item) =>
          item.id === habit.id ? { ...item, archivedAt: this.todayKey } : item,
        ),
      },
    });
  }
  async setAnswer(habit: HabitDefinition, value: boolean | null) {
    const profile = this.store.profile();
    if (!profile || !this.selectedHabits().some((item) => item.id === habit.id))
      return;
    const answers = { ...(this.selectedDay()?.answers ?? {}) };
    if (value === null) delete answers[habit.id];
    else answers[habit.id] = value;
    const day: HabitDay = {
      profileId: profile.id,
      date: this.selectedDate(),
      answers,
      validatedAt: null,
    };
    await this.store.mutate({ type: "saveHabitDay", value: day });
  }
  async validateDay() {
    const profile = this.store.profile();
    const status = this.selectedStatus();
    if (!profile || !status.total || status.answered !== status.total) return;
    await this.store.mutate({
      type: "saveHabitDay",
      value: {
        profileId: profile.id,
        date: this.selectedDate(),
        answers: { ...this.selectedDay()!.answers },
        validatedAt: new Date().toISOString(),
      },
    });
  }
}

import { I18n, TranslatePipe, LocalDatePipe } from "../core/i18n";
import {
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from "@angular/core";
import { FormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { Store } from "../core/store";
import { HABIT_METRICS, HabitDefinition, HabitDay, uid } from "../core/models";
import {
  activeHabits,
  evaluateHabitDay,
  localDate,
  shiftDate,
} from "../core/habit-tracking";
import { Icon } from "../core/icon";

@Component({
  imports: [TranslatePipe, LocalDatePipe, FormsModule, RouterLink, Icon],
  template: `
    <div class="page-heading">
      <div>
        <div class="eyebrow">{{ "UN GESTE À LA FOIS" | t }}</div>
        <h1>{{ "Mes habitudes" | t }}<span class="accent">.</span></h1>
        <p>
          {{
            "Choisis ce que tu veux cultiver ou réduire, puis note ta journée."
              | t
          }}
        </p>
      </div>
      <div class="button-row">
        <a
          class="button secondary"
          routerLink="/fantome"
          [queryParams]="{ date: selectedDate() }"
          >{{ "Mon fantôme" | t }}</a
        >
        <a class="button secondary" routerLink="/journal"
          ><ui-icon name="journal" /> {{ "Journal détaillé" | t }}</a
        >
      </div>
    </div>
    @if (store.profile(); as profile) {
      <div class="habit-intro">
        <span class="pill">{{
          profile.demo ? tr("DÉMONSTRATION") : tr("PROFIL LOCAL")
        }}</span>
        <p>
          {{
            "Le cap souhaité est simple : faire tes bonnes habitudes et éviter celles que tu veux réduire. Une coche indique seulement « oui » ou « non » ; les quantités restent dans le journal. Ce repère personnel n’est pas une évaluation médicale."
              | t
          }}
        </p>
      </div>
      <div class="habits-layout">
        <section class="panel habit-calendar-panel">
          <div class="panel-heading">
            <div>
              <span class="eyebrow">{{ "AU JOUR LE JOUR" | t }}</span>
              <h2>{{ "Mon calendrier" | t }}</h2>
            </div>
            <div class="habit-month-nav">
              <button
                [attr.aria-label]="'Mois précédent' | t"
                (click)="moveMonth(-1)"
              >
                <ui-icon name="arrow" />
              </button>
              <strong>{{ month() | localDate: "MMMM yyyy" }}</strong>
              <button
                [attr.aria-label]="'Mois suivant' | t"
                (click)="moveMonth(1)"
                [disabled]="month() >= currentMonth()"
              >
                <ui-icon name="arrow" />
              </button>
            </div>
          </div>
          <div
            class="habit-calendar"
            role="group"
            [attr.aria-label]="'Choisir un jour' | t"
          >
            @for (weekday of weekdays(); track $index) {
              <span class="habit-weekday">{{ weekday }}</span>
            }
            @for (cell of calendar(); track cell.date) {
              <button
                class="habit-calendar-day"
                [class.outside]="!cell.inMonth"
                [class.selected]="selectedDate() === cell.date"
                [class.validated]="cell.status === 'validated'"
                [class.partial]="cell.status === 'partial'"
                [disabled]="cell.date > todayKey()"
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
            <span><i class="good-dot"></i> {{ "Validée" | t }}</span>
            <span><i class="partial-dot"></i> {{ "En cours" | t }}</span>
            <span><i class="empty-dot"></i> {{ "Non renseignée" | t }}</span>
          </div>
        </section>

        <section class="panel habit-check-panel">
          <div class="panel-heading">
            <div>
              <span class="eyebrow">{{ "MES RÉPONSES" | t }}</span>
              <h2>{{ selectedDate() | localDate: "EEEE d MMMM" }}</h2>
            </div>
            <span class="pill" [class.target-pill]="selectedStatus().validated">
              {{
                selectedStatus().validated ? tr("VALIDÉE") : tr("À COMPLÉTER")
              }}
            </span>
          </div>
          @if (selectedHabits().length) {
            <p class="habit-progress">
              {{ selectedStatus().answered }} / {{ selectedStatus().total }}
              {{ "habitudes renseignées" | t }}
              @if (selectedStatus().preview !== null) {
                · {{ selectedStatus().preview }}
                {{ "% en accord avec ton cap" | t }}
                {{ selectedStatus().validated ? "" : tr("(aperçu)") }}
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
                        habit.kind === "good"
                          ? tr("À cultiver")
                          : tr("À réduire")
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
                      {{ "Oui" | t }}
                    </button>
                    <button
                      [class.chosen]="answerFor(habit) === false"
                      [attr.aria-pressed]="answerFor(habit) === false"
                      [disabled]="store.busy()"
                      (click)="setAnswer(habit, false)"
                    >
                      {{ "Non" | t }}
                    </button>
                    @if (answerFor(habit) !== null) {
                      <button
                        class="habit-clear"
                        [attr.aria-label]="
                          tr('Effacer la réponse : ') + habit.label
                        "
                        [disabled]="store.busy()"
                        (click)="setAnswer(habit, null)"
                      >
                        {{ "×" | t }}
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
                    ? tr("Journée validée")
                    : tr("Valider la journée")
                }}
              </button>
              <span>{{
                "Tu peux corriger une réponse, puis revalider ce jour." | t
              }}</span>
            </div>
          } @else {
            <div class="habit-empty-day">
              <ui-icon name="info" />
              {{
                "Aucune habitude suivie à cette date. Ajoute-en une ci-dessous pour commencer aujourd’hui."
                  | t
              }}
            </div>
          }
        </section>
      </div>

      <div class="habits-layout habit-lower-layout">
        <section class="panel habit-trajectory-panel">
          <div class="panel-heading">
            <div>
              <span class="eyebrow">{{ "TRAJECTOIRE PERSONNELLE" | t }}</span>
              <h2>{{ "Vers la journée souhaitée" | t }}</h2>
            </div>
            <span class="pill muted">{{ "14 JOURS" | t }}</span>
          </div>
          <p>
            {{
              "100 % signifie que toutes les habitudes suivies ont correspondu à ton cap ce jour-là. La ligne pointillée est le cap souhaité ; les jours non validés restent vides."
                | t
            }}
          </p>
          <svg
            class="habit-trajectory"
            viewBox="0 0 600 190"
            role="img"
            [attr.aria-label]="
              'Alignement quotidien avec la journée souhaitée sur quatorze jours'
                | t
            "
          >
            <path
              d="M32 20H552"
              [attr.stroke]="i18n.color('#bde883')"
              stroke-dasharray="6 6"
              opacity=".7"
            />
            <path
              d="M32 90H552M32 160H552"
              [attr.stroke]="i18n.color('#66716e')"
              opacity=".3"
            />
            <text x="0" y="24">100</text>
            <text x="8" y="94">50</text>
            <text x="16" y="164">0</text>
            @if (trajectoryPath()) {
              <path
                [attr.d]="trajectoryPath()"
                fill="none"
                [attr.stroke]="i18n.color('#f2b988')"
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
                  [attr.fill]="i18n.color('#f2b988')"
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
                  [attr.stroke]="i18n.color('#f2b988')"
                  stroke-width="2"
                  stroke-dasharray="3 2"
                >
                  <title>
                    {{ "Aperçu non validé :" | t }} {{ point.preview }} %
                  </title>
                </circle>
              }
            }
            <text x="32" y="185">
              {{ trajectory()[0].date | localDate: "d MMM" }}
            </text>
            <text x="552" y="185" text-anchor="end">
              {{ trajectory()[13].date | localDate: "d MMM" }}
            </text>
          </svg>
          <div class="habit-chart-legend">
            <span
              ><i class="target-line"></i> {{ "Journée souhaitée" | t }}</span
            >
            <span><i class="observed-line"></i> {{ "Jours validés" | t }}</span>
            <span
              ><i class="preview-ring"></i>
              {{ "Aperçu du jour sélectionné" | t }}</span
            >
          </div>
        </section>

        <section class="panel habit-config-panel">
          <div class="panel-heading">
            <div>
              <span class="eyebrow">{{ "PERSONNALISER" | t }}</span>
              <h2>{{ "Les habitudes que je suis" | t }}</h2>
            </div>
            <span class="pill muted"
              >{{ currentHabits().length }} {{ "ACTIVES" | t }}</span
            >
          </div>
          <div class="habit-config-list">
            @for (habit of currentHabits(); track habit.id) {
              <div class="habit-config-row">
                <div>
                  <strong>{{ habit.label }}</strong>
                  <small>{{
                    habit.kind === "good"
                      ? tr("Bonne habitude")
                      : tr("À réduire")
                  }}</small>
                </div>
                <button
                  class="text-button"
                  [attr.aria-label]="tr('Retirer du suivi : ') + habit.label"
                  [disabled]="store.busy()"
                  (click)="archive(habit)"
                >
                  {{ "Retirer" | t }}
                </button>
              </div>
            } @empty {
              <p>{{ "Aucune habitude configurée pour ce profil." | t }}</p>
            }
          </div>
          <div class="habit-add-form">
            <h3>{{ "Ajouter une habitude" | t }}</h3>
            <label
              >{{ "Choisir un exemple" | t }}
              <select
                [attr.aria-label]="'Choisir un exemple d’habitude' | t"
                [ngModel]="preset()"
                (ngModelChange)="choosePreset($event)"
              >
                <option value="">{{ "Personnalisée" | t }}</option>
                @for (metric of presets; track metric.id) {
                  <option [value]="metric.id">{{ tr(metric.label) }}</option>
                }
              </select></label
            >
            <label
              >{{ "Nom de l’habitude" | t }}
              <input
                [ngModel]="newLabel()"
                (ngModelChange)="newLabel.set($event)"
                maxlength="100"
                [placeholder]="'Ex. Courir, fumer, méditer…' | t"
              />
            </label>
            <label
              >{{ "Je souhaite" | t }}
              <select
                [attr.aria-label]="'Objectif de l’habitude' | t"
                [ngModel]="newKind()"
                (ngModelChange)="newKind.set($event)"
              >
                <option value="good">{{ "La faire chaque jour" | t }}</option>
                <option value="bad">{{ "L’éviter chaque jour" | t }}</option>
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
              <ui-icon name="plus" /> {{ "Ajouter au suivi" | t }}
            </button>
          </div>
        </section>
      </div>
    } @else {
      <section class="panel empty-state">
        <h2>{{ "Commence par créer un profil." | t }}</h2>
        <p>
          {{
            "Tes habitudes et ton calendrier resteront attachés à ce profil."
              | t
          }}
        </p>
        <a class="button primary" routerLink="/profils">{{
          "Créer un profil" | t
        }}</a>
      </section>
    }
  `,
})
export class Habits {
  i18n = inject(I18n);
  tr = this.i18n.t;
  store = inject(Store);
  todayKey = this.store.clock.today;
  currentMonth = computed(() => this.todayKey().slice(0, 7) + "-01");
  month = signal(`${this.todayKey().slice(0, 7)}-01`);
  selectedDate = signal(this.todayKey());
  preset = signal("");
  newLabel = signal("");
  newKind = signal<"good" | "bad">("good");
  weekdays = computed(() =>
    this.i18n.language() === "fr"
      ? ["L", "M", "M", "J", "V", "S", "D"]
      : ["M", "T", "W", "T", "F", "S", "S"],
  );
  presets = HABIT_METRICS;
  currentHabits = computed(() =>
    activeHabits(this.store.habits(), this.todayKey()),
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
      const date = shiftDate(this.todayKey(), index - 13);
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
    let previousProfile = this.store.activeId();
    let previousDay = this.todayKey();
    effect(() => {
      const profile = this.store.activeId();
      const day = this.todayKey();
      untracked(() => {
        if (
          profile !== previousProfile ||
          (day !== previousDay && this.selectedDate() === previousDay)
        ) {
          this.selectedDate.set(day);
          this.month.set(day.slice(0, 7) + "-01");
        }
      });
      previousProfile = profile;
      previousDay = day;
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
    const name = new Date(`${date}T12:00:00`).toLocaleDateString(
      this.i18n.locale(),
      {
        day: "numeric",
        month: "long",
        year: "numeric",
      },
    );
    return `${name} · ${this.tr(status === "validated" ? "validée" : status === "partial" ? "en cours" : "non renseignée")}`;
  }
  moveMonth(delta: number) {
    const [year, month] = this.month().split("-").map(Number);
    this.month.set(localDate(new Date(year, month - 1 + delta, 1, 12)));
  }
  choosePreset(metric: string) {
    this.preset.set(metric);
    const match = HABIT_METRICS.find((item) => item.id === metric);
    if (match) {
      this.newLabel.set(this.tr(match.label));
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
      startDate: this.todayKey(),
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
          item.id === habit.id
            ? { ...item, archivedAt: this.todayKey() }
            : item,
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

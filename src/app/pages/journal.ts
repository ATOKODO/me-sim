import {
  I18n,
  TranslatePipe,
  LocalDatePipe,
  LocalNumberPipe,
} from "../core/i18n";
import { FocusDialog } from "../core/focus-dialog";
import { Component, inject, signal, effect, untracked } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { Store } from "../core/store";
import { METRICS, Metric, Observation, uid } from "../core/models";
import { Icon } from "../core/icon";
@Component({
  imports: [
    TranslatePipe,
    LocalDatePipe,
    LocalNumberPipe,
    FocusDialog,
    ReactiveFormsModule,
    Icon,
    RouterLink,
  ],
  template: `<div class="page-heading">
      <div>
        <div class="eyebrow">{{ "TES OBSERVATIONS, AU QUOTIDIEN" | t }}</div>
        <h1>{{ "Mon journal" | t }}<span class="accent">.</span></h1>
        <p>{{ "Quelques repères pour mieux comprendre tes habitudes." | t }}</p>
      </div>
      <a routerLink="/donnees" class="button secondary"
        ><ui-icon name="upload" />{{ "Importer un fichier" | t }}</a
      >
    </div>
    @if (store.profile()) {
      <div class="journal-layout">
        <section class="panel form-panel">
          <div class="eyebrow">
            {{
              editing() ? tr("MODIFIER UNE MESURE") : tr("UN NOUVEAU REPÈRE")
            }}
          </div>
          <h2>
            {{
              editing()
                ? tr("Corriger mon journal")
                : tr("Comment vas-tu aujourd’hui ?")
            }}
          </h2>
          <div
            class="quick-habits"
            [attr.aria-label]="'Saisie rapide d’une activité' | t"
          >
            <span class="quick-label">{{ "Ajouter vite" | t }}</span>
            @for (m of quickMetrics; track m.id) {
              <button type="button" class="quick-habit" (click)="choose(m.id)">
                <ui-icon [name]="m.icon" />{{ tr(m.label) }}
              </button>
            }
          </div>
          <form [formGroup]="form" (ngSubmit)="save()">
            <label
              >{{ "Date" | t
              }}<input type="date" formControlName="date" required /></label
            ><label
              >{{ "Repère ou activité" | t
              }}<select formControlName="metric">
                <optgroup [label]="'Repères quotidiens' | t">
                  @for (m of dailyMetrics; track m.id) {
                    <option [value]="m.id">
                      {{ tr(m.label) }} ({{ tr(m.unit) }})
                    </option>
                  }
                </optgroup>
                <optgroup [label]="'Habitudes positives' | t">
                  @for (m of positiveMetrics; track m.id) {
                    <option [value]="m.id">
                      {{ tr(m.label) }} ({{ tr(m.unit) }})
                    </option>
                  }
                </optgroup>
                <optgroup [label]="'Habitudes à observer' | t">
                  @for (m of negativeMetrics; track m.id) {
                    <option [value]="m.id">
                      {{ tr(m.label) }} ({{ tr(m.unit) }})
                    </option>
                  }
                </optgroup>
              </select></label
            ><label
              >{{ tr(currentMetric().valueLabel ?? "Valeur") }} ·
              {{ tr(currentMetric().unit)
              }}<input
                type="number"
                formControlName="value"
                [min]="currentMetric().id === 'weight' ? 0.1 : 0"
                [max]="currentMetric().max"
                [step]="currentMetric().integer ? 1 : 0.1"
                [placeholder]="'Ta mesure' | t"
                required
            /></label>
            @if (currentMetric().event) {
              <label
                >{{ "Nom de l’activité (facultatif)" | t
                }}<input formControlName="label" maxlength="100"
              /></label>
              <label
                >{{ "Heure de début" | t
                }}<input type="time" formControlName="time" required
              /></label>
            }
            @if (currentMetric().event && form.controls.value.value === 0) {
              <p class="field-help">
                {{
                  "Une quantité nulle renseigne la journée sans créer de moment à rejouer."
                    | t
                }}
              </p>
            }
            <p class="field-help">
              {{
                currentMetric().id === "stress"
                  ? tr(
                      "De 0 (aucun stress) à 10 (stress maximal), selon ton ressenti."
                    )
                  : currentMetric().event
                    ? currentMetric().positive
                      ? tr(
                          "Note aussi ce qui te fait du bien : le personnage le rejouera dans l’ordre de ta journée."
                        )
                      : tr(
                          "Tu peux le documenter sans jugement : cette trace sert à comprendre ta journée."
                        )
                    : tr(
                        "Une valeur par mesure et par jour. Tu peux la corriger à tout moment."
                      )
              }}
            </p>
            <button
              class="button primary full"
              [disabled]="form.invalid || store.busy()"
            >
              <ui-icon name="check" />{{
                editing()
                  ? tr("Enregistrer la correction")
                  : tr("Ajouter au journal")
              }}
            </button>
            @if (editing()) {
              <button type="button" class="button ghost full" (click)="reset()">
                {{ "Annuler" | t }}
              </button>
            }
          </form>
        </section>
        <section class="panel">
          <div class="panel-heading">
            <h2>
              {{ "Mes observations" | t }}
              <span class="count">{{ filtered().length }}</span>
            </h2>
            <select
              [attr.aria-label]="'Filtrer les mesures' | t"
              [value]="filter()"
              (change)="filter.set($any($event.target).value); page.set(0)"
            >
              <option value="">{{ "Toutes les mesures" | t }}</option>
              @for (m of metrics; track m.id) {
                <option [value]="m.id">{{ tr(m.label) }}</option>
              }
            </select>
          </div>
          <div class="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>{{ "Date" | t }}</th>
                  <th>{{ "Mesure" | t }}</th>
                  <th>{{ "Valeur" | t }}</th>
                  <th>{{ "Source" | t }}</th>
                  <th>
                    <span class="sr-only">{{ "Actions" | t }}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                @for (o of paged(); track o.id) {
                  <tr>
                    <td>
                      {{ o.date | localDate: "dd MMM yyyy" }}
                      @if (o.at) {
                        <span class="dim">· {{ o.at }}</span>
                      }
                    </td>
                    <td>
                      <span class="table-metric"
                        ><ui-icon [name]="store.metric(o.metric).icon" />{{
                          o.context?.label || tr(store.metric(o.metric).label)
                        }}</span
                      >
                    </td>
                    <td class="numeric">
                      {{ o.value | localNumber: "1.0-2" }}
                      <span class="dim">{{ tr(o.unit) }}</span>
                    </td>
                    <td class="source-cell">{{ tr(o.source) }}</td>
                    <td>
                      <div class="row-actions">
                        <button
                          class="icon-button"
                          (click)="edit(o)"
                          [attr.aria-label]="
                            tr('Modifier ') +
                            tr(store.metric(o.metric).label) +
                            tr(' du ') +
                            o.date
                          "
                        >
                          <ui-icon name="edit" /></button
                        ><button
                          class="icon-button"
                          (click)="deleting.set(o)"
                          [attr.aria-label]="
                            tr('Supprimer ') +
                            tr(store.metric(o.metric).label) +
                            tr(' du ') +
                            o.date
                          "
                        >
                          <ui-icon name="trash" />
                        </button>
                      </div>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="5" class="empty-cell">
                      {{ "Aucune mesure pour le moment." | t }}
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <div class="pagination">
            <button
              class="button ghost small"
              (click)="page.set(page() - 1)"
              [disabled]="page() === 0"
            >
              {{ "Précédent" | t }}</button
            ><span>{{ "Page" | t }} {{ page() + 1 }} / {{ pages() }}</span
            ><button
              class="button ghost small"
              (click)="page.set(page() + 1)"
              [disabled]="page() + 1 >= pages()"
            >
              {{ "Suivant" | t }}
            </button>
          </div>
        </section>
      </div>
    } @else {
      <div class="empty-state panel">
        <h2>{{ "Un profil pour commencer" | t }}</h2>
        <a routerLink="/profils" class="button primary">{{
          "Créer un profil" | t
        }}</a>
      </div>
    }
    @if (deleting(); as o) {
      <div class="modal-backdrop">
        <section
          focusDialog
          (dismissed)="deleting.set(null)"
          class="modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-title"
        >
          <h2 id="delete-title">{{ "Supprimer cette mesure ?" | t }}</h2>
          <p>
            {{ o.context?.label || tr(store.metric(o.metric).label) }} ·
            {{ o.date | localDate: "dd MMM yyyy" }} · {{ o.value }}
            {{ tr(o.unit) }}
          </p>
          <div class="button-row">
            <button class="button secondary" (click)="deleting.set(null)">
              {{ "Annuler" | t }}</button
            ><button
              class="button danger"
              [disabled]="store.busy()"
              (click)="remove(o)"
            >
              {{ "Supprimer" | t }}
            </button>
          </div>
        </section>
      </div>
    }`,
})
export class Journal {
  i18n = inject(I18n);
  tr = this.i18n.t;
  store = inject(Store);
  fb = inject(FormBuilder);
  metrics = METRICS;
  dailyMetrics = METRICS.filter((m) => !m.event);
  positiveMetrics = METRICS.filter((m) => m.event && m.positive);
  negativeMetrics = METRICS.filter((m) => m.event && !m.positive);
  quickMetrics = METRICS.filter((m) =>
    [
      "exercise",
      "walk",
      "social",
      "gaming",
      "screen",
      "alcohol",
      "tobacco",
      "vaping",
      "screen_evening",
      "sedentary",
    ].includes(m.id),
  );
  filter = signal("");
  page = signal(0);
  editing = signal<Observation | null>(null);
  deleting = signal<Observation | null>(null);
  selectedMetric = signal<Metric>("weight");
  form = this.fb.group({
    date: [this.store.clock.today(), Validators.required],
    metric: ["weight" as Metric, Validators.required],
    value: [null as number | null, Validators.required],
    time: [""],
    label: ["", Validators.maxLength(100)],
  });
  constructor() {
    effect(() => {
      this.store.activeId();
      untracked(() => {
        this.reset();
        this.page.set(0);
        this.deleting.set(null);
      });
    });
    this.form.controls.metric.valueChanges.subscribe((m) => {
      this.selectedMetric.set(m ?? "weight");
      this.form.controls.value.setValidators([
        Validators.required,
        Validators.min(m === "weight" ? 0.1 : 0),
        Validators.max(this.currentMetric().max),
        ...(this.currentMetric().integer ? [Validators.pattern(/^\d+$/)] : []),
      ]);
      this.form.controls.value.updateValueAndValidity();
      this.updateTimeValidators();
    });
    this.form.controls.value.valueChanges.subscribe(() =>
      this.updateTimeValidators(),
    );
    let previousDay = this.store.clock.today();
    effect(() => {
      const day = this.store.clock.today();
      if (
        day !== previousDay &&
        !this.editing() &&
        this.form.controls.date.value === previousDay
      )
        this.form.controls.date.setValue(day);
      previousDay = day;
    });
  }
  private updateTimeValidators() {
    this.form.controls.time.setValidators(
      this.currentMetric().event && (this.form.controls.value.value ?? 0) > 0
        ? [
            Validators.required,
            Validators.pattern(/^(?:[01]\d|2[0-3]):[0-5]\d$/),
          ]
        : [],
    );
    this.form.controls.time.updateValueAndValidity({ emitEvent: false });
  }
  currentMetric = () => METRICS.find((m) => m.id === this.selectedMetric())!;
  filtered = () =>
    this.store
      .observations()
      .filter((o) => !this.filter() || o.metric === this.filter());
  pages = () => Math.max(1, Math.ceil(this.filtered().length / 15));
  paged = () => this.filtered().slice(this.page() * 15, this.page() * 15 + 15);
  reset() {
    this.editing.set(null);
    this.form.reset({
      date: this.store.clock.today(),
      metric: "weight",
      value: null,
      time: this.nowTime(),
      label: "",
    });
  }
  nowTime() {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }
  choose(metric: Metric) {
    this.form.controls.metric.setValue(metric);
    this.form.controls.time.setValue(this.nowTime());
    this.form.controls.value.setValue(null);
  }
  edit(o: Observation) {
    this.editing.set(o);
    this.form.setValue({
      date: o.date,
      metric: o.metric,
      value: o.value,
      time: o.at ?? this.nowTime(),
      label: o.context?.label ?? "",
    });
  }
  async save() {
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    if (!v.date || !v.metric || v.value === null) return;
    const o: Observation = {
      id: this.editing()?.id ?? uid(),
      profileId: this.store.activeId(),
      date: v.date,
      metric: v.metric,
      value: v.value,
      unit: this.currentMetric().unit,
      context:
        this.currentMetric().event &&
        (v.label?.trim() || this.editing()?.context)
          ? {
              label: v.label?.trim() || this.tr(this.currentMetric().label),
              habitId:
                this.editing()?.metric === v.metric
                  ? (this.editing()?.context?.habitId ?? null)
                  : null,
              start: null,
              end: null,
              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            }
          : null,
      source: "Saisie manuelle",
      batchId: this.editing()?.batchId ?? null,
      at:
        this.currentMetric().event && v.value > 0
          ? v.time || this.nowTime()
          : null,
      durationMinutes:
        this.currentMetric().event &&
        this.currentMetric().unit === "min" &&
        v.value > 0
          ? v.value
          : null,
    };
    if (await this.store.mutate({ type: "saveObservation", value: o }))
      this.reset();
  }
  async remove(o: Observation) {
    if (
      await this.store.mutate({
        type: "deleteObservation",
        value: { id: o.id, profileId: o.profileId },
      })
    ) {
      this.deleting.set(null);
      if (this.editing()?.id === o.id) this.reset();
      this.page.set(Math.min(this.page(), this.pages() - 1));
    }
  }
}

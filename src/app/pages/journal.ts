import { FocusDialog } from "../core/focus-dialog";
import { Component, inject, signal, effect } from "@angular/core";
import { DatePipe, DecimalPipe } from "@angular/common";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { Store } from "../core/store";
import { METRICS, Metric, Observation, today, uid } from "../core/models";
import { Icon } from "../core/icon";
@Component({
  imports: [
    FocusDialog,
    ReactiveFormsModule,
    DatePipe,
    DecimalPipe,
    Icon,
    RouterLink,
  ],
  template: `<div class="page-heading">
      <div>
        <div class="eyebrow">TES OBSERVATIONS, AU QUOTIDIEN</div>
        <h1>Mon journal<span class="accent">.</span></h1>
        <p>Quelques repères pour mieux comprendre tes habitudes.</p>
      </div>
      <a routerLink="/donnees" class="button secondary"
        ><ui-icon name="upload" />Importer un fichier</a
      >
    </div>
    @if (store.profile()) {
      <div class="journal-layout">
        <section class="panel form-panel">
          <div class="eyebrow">
            {{ editing() ? "MODIFIER UNE MESURE" : "UN NOUVEAU REPÈRE" }}
          </div>
          <h2>
            {{
              editing()
                ? "Corriger mon journal"
                : "Comment vas-tu aujourd’hui ?"
            }}
          </h2>
          <form [formGroup]="form" (ngSubmit)="save()">
            <label
              >Date<input type="date" formControlName="date" required /></label
            ><label
              >Mesure<select formControlName="metric">
                @for (m of metrics; track m.id) {
                  <option [value]="m.id">{{ m.label }} ({{ m.unit }})</option>
                }
              </select></label
            ><label
              >Valeur · {{ currentMetric().unit
              }}<input
                type="number"
                formControlName="value"
                [min]="currentMetric().id === 'weight' ? 0.1 : 0"
                [max]="currentMetric().max"
                [step]="currentMetric().id === 'steps' ? 1 : 0.1"
                placeholder="Ta mesure"
                required
            /></label>
            <p class="field-help">
              {{
                currentMetric().id === "stress"
                  ? "De 0 (aucun stress) à 10 (stress maximal), selon ton ressenti."
                  : "Une valeur par mesure et par jour. Tu peux la corriger à tout moment."
              }}
            </p>
            <button
              class="button primary full"
              [disabled]="form.invalid || store.busy()"
            >
              <ui-icon name="check" />{{
                editing() ? "Enregistrer la correction" : "Ajouter au journal"
              }}
            </button>
            @if (editing()) {
              <button type="button" class="button ghost full" (click)="reset()">
                Annuler
              </button>
            }
          </form>
        </section>
        <section class="panel">
          <div class="panel-heading">
            <h2>
              Mes observations
              <span class="count">{{ filtered().length }}</span>
            </h2>
            <select
              aria-label="Filtrer les mesures"
              [value]="filter()"
              (change)="filter.set($any($event.target).value); page.set(0)"
            >
              <option value="">Toutes les mesures</option>
              @for (m of metrics; track m.id) {
                <option [value]="m.id">{{ m.label }}</option>
              }
            </select>
          </div>
          <div class="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Mesure</th>
                  <th>Valeur</th>
                  <th>Source</th>
                  <th><span class="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                @for (o of paged(); track o.id) {
                  <tr>
                    <td>{{ o.date | date: "dd MMM yyyy" }}</td>
                    <td>
                      <span class="table-metric"
                        ><ui-icon [name]="store.metric(o.metric).icon" />{{
                          store.metric(o.metric).label
                        }}</span
                      >
                    </td>
                    <td class="numeric">
                      {{ o.value | number: "1.0-2" }}
                      <span class="dim">{{ o.unit }}</span>
                    </td>
                    <td class="source-cell">{{ o.source }}</td>
                    <td>
                      <div class="row-actions">
                        <button
                          class="icon-button"
                          (click)="edit(o)"
                          [attr.aria-label]="
                            'Modifier ' + o.metric + ' du ' + o.date
                          "
                        >
                          <ui-icon name="edit" /></button
                        ><button
                          class="icon-button"
                          (click)="deleting.set(o)"
                          [attr.aria-label]="
                            'Supprimer ' + o.metric + ' du ' + o.date
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
                      Aucune mesure pour le moment.
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
              Précédent</button
            ><span>Page {{ page() + 1 }} / {{ pages() }}</span
            ><button
              class="button ghost small"
              (click)="page.set(page() + 1)"
              [disabled]="page() + 1 >= pages()"
            >
              Suivant
            </button>
          </div>
        </section>
      </div>
    } @else {
      <div class="empty-state panel">
        <h2>Un profil pour commencer</h2>
        <a routerLink="/profils" class="button primary">Créer un profil</a>
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
          <h2 id="delete-title">Supprimer cette mesure ?</h2>
          <p>
            {{ store.metric(o.metric).label }} ·
            {{ o.date | date: "dd MMM yyyy" }} · {{ o.value }} {{ o.unit }}
          </p>
          <div class="button-row">
            <button class="button secondary" (click)="deleting.set(null)">
              Annuler</button
            ><button
              class="button danger"
              [disabled]="store.busy()"
              (click)="remove(o)"
            >
              Supprimer
            </button>
          </div>
        </section>
      </div>
    }`,
})
export class Journal {
  store = inject(Store);
  fb = inject(FormBuilder);
  metrics = METRICS;
  filter = signal("");
  page = signal(0);
  editing = signal<Observation | null>(null);
  deleting = signal<Observation | null>(null);
  selectedMetric = signal<Metric>("weight");
  form = this.fb.group({
    date: [today(), Validators.required],
    metric: ["weight" as Metric, Validators.required],
    value: [null as number | null, Validators.required],
  });
  constructor() {
    effect(() => {
      this.store.activeId();
      this.reset();
      this.page.set(0);
      this.deleting.set(null);
    });
    this.form.controls.metric.valueChanges.subscribe((m) => {
      this.selectedMetric.set(m ?? "weight");
      this.form.controls.value.setValidators([
        Validators.required,
        Validators.min(m === "weight" ? 0.1 : 0),
        Validators.max(this.currentMetric().max),
      ]);
      this.form.controls.value.updateValueAndValidity();
    });
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
    this.form.reset({ date: today(), metric: "weight", value: null });
  }
  edit(o: Observation) {
    this.editing.set(o);
    this.form.setValue({ date: o.date, metric: o.metric, value: o.value });
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
      source: "Saisie manuelle",
      batchId: null,
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

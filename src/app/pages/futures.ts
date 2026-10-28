import { I18n, TranslatePipe, LocalNumberPipe } from "../core/i18n";
import { Component, inject, signal, effect, untracked } from "@angular/core";
import { ReactiveFormsModule, FormBuilder, Validators } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { Store } from "../core/store";
import { Scenario, uid } from "../core/models";
import { AvatarScene } from "../scene/avatar";
import { Icon } from "../core/icon";
@Component({
  imports: [
    TranslatePipe,
    LocalNumberPipe,
    ReactiveFormsModule,
    AvatarScene,
    Icon,
    RouterLink,
  ],
  template: `<div class="page-heading">
      <div>
        <div class="eyebrow">{{ "PLUSIEURS CHEMINS, TOUJOURS TOI" | t }}</div>
        <h1>{{ "Mes futurs possibles" | t }}<span class="accent">.</span></h1>
        <p>
          {{ "Une hypothèse à explorer, pas une promesse sur ton avenir." | t }}
        </p>
      </div>
      <span class="pill lab-pill">{{ "LABORATOIRE" | t }}</span>
    </div>
    @if (store.profile(); as p) {
      <section class="science-banner">
        <ui-icon name="lock" />
        <div>
          <strong>{{
            "Les projections attendent leur validation scientifique." | t
          }}</strong>
          <p>
            {{
              "Tu peux préparer et conserver tes scénarios. Aucun poids futur ni résultat de santé n’est calculé dans cette version."
                | t
            }}
          </p>
        </div>
        <button class="text-button" (click)="showModel.set(!showModel())">
          {{ showModel() ? tr("Fermer la fiche") : tr("Voir la fiche modèle") }}
          <ui-icon name="arrow" />
        </button>
      </section>
      @if (showModel()) {
        <section class="panel model-sheet">
          <span class="eyebrow">{{ store.model()?.version }}</span>
          <h2>{{ store.model()?.name }}</h2>
          <ul>
            @for (reason of store.model()?.reasons; track reason) {
              <li>{{ tr(reason) }}</li>
            }
          </ul>
          <p>
            {{
              "Le modèle source concerne les adultes, hors grossesse et allaitement. Sommeil et stress ne sont pas convertis en effets sur le poids."
                | t
            }}
          </p>
          <p class="field-help">
            {{
              "Source : Hall et al., Lancet, 2011 · DOI 10.1016/S0140-6736(11)60812-X. Fiche scientifique complète embarquée dans la documentation du projet."
                | t
            }}
          </p>
        </section>
      }
      <div class="comparison-grid">
        <section class="panel">
          <div class="panel-heading">
            <div>
              <span class="eyebrow">{{ "SCÉNARIO A" | t }}</span>
              <h2>{{ "Mes habitudes actuelles" | t }}</h2>
            </div>
            <span class="pill muted">{{ "OBSERVATIONS" | t }}</span>
          </div>
          <avatar-scene
            [compact]="true"
            [label]="'POINT DE DÉPART' | t"
            [color]="p.color"
            [variant]="p.sex === 'female' ? 'female' : 'default'"
            [animations]="store.data().settings.animations"
          />
          <div class="comparison-info">
            <div>
              <span>{{ "Dernier poids" | t }}</span
              ><strong>{{
                store.latest("weight")
                  ? (store.latest("weight")!.value | localNumber: "1.0-1") +
                    " kg"
                  : tr("Non renseigné")
              }}</strong>
            </div>
            <div>
              <span>{{ "Derniers apports" | t }}</span
              ><strong>{{
                store.latest("intake")
                  ? (store.latest("intake")!.value | localNumber: "1.0-0") +
                    " kcal"
                  : tr("Non renseignés")
              }}</strong>
            </div>
          </div>
        </section>
        <section class="panel scenario-panel">
          <div class="panel-heading">
            <div>
              <span class="eyebrow accent">{{ "SCÉNARIO B" | t }}</span>
              <h2>{{ "Si je change une habitude" | t }}</h2>
            </div>
            <span class="pill">{{ "HYPOTHÈSE" | t }}</span>
          </div>
          <avatar-scene
            [compact]="true"
            [label]="'ILLUSTRATION · PAS UNE PRÉDICTION' | t"
            [color]="'#b5bbe8'"
            [variant]="p.sex === 'female' ? 'female' : 'default'"
            mode="walk"
            [animations]="store.data().settings.animations"
          />
          <div class="comparison-info">
            <div>
              <span>{{ "Poids futur" | t }}</span
              ><strong class="dim">{{ "Non calculé" | t }}</strong>
            </div>
            <div>
              <span>{{ "Horizon scientifique" | t }}</span
              ><strong class="dim">{{ "Non activé" | t }}</strong>
            </div>
          </div>
        </section>
      </div>
      <section class="panel scenario-editor">
        <form [formGroup]="form" (ngSubmit)="save()">
          <div class="section-inline">
            <h2>{{ "Composer mon scénario" | t }}</h2>
            <span>{{
              "Paramètres de recherche · aucun conseil nutritionnel" | t
            }}</span>
          </div>
          <div class="scenario-fields">
            <label
              >{{ "Nom" | t
              }}<input
                formControlName="name"
                [placeholder]="'Mon scénario' | t"
                maxlength="120" /></label
            ><label
              >{{ "Horizon souhaité" | t
              }}<select formControlName="months">
                <option [ngValue]="1">{{ "1 mois · non activé" | t }}</option>
                <option [ngValue]="3">{{ "3 mois · non activé" | t }}</option>
                <option [ngValue]="6">{{ "6 mois · non activé" | t }}</option>
                <option [ngValue]="12">{{ "12 mois · non activé" | t }}</option>
              </select></label
            ><label
              >{{ "Variation d’apports (kcal/j)" | t
              }}<input
                type="number"
                formControlName="intakeDelta"
                min="-2000"
                max="2000"
                step="25" /></label
            ><label
              >{{ "Variation d’activité (kJ/kg/j)" | t
              }}<input
                type="number"
                formControlName="activityDelta"
                min="-100"
                max="100"
                step="1"
            /></label>
          </div>
          <p class="field-help">
            {{
              "L’activité utilise directement le paramètre énergétique du modèle. Aucune conversion automatique depuis les pas ou les séances de sport."
                | t
            }}
          </p>
          <div class="button-row">
            <button
              class="button primary"
              [disabled]="form.invalid || store.busy()"
            >
              <ui-icon name="check" />
              {{ "Enregistrer le scénario" | t }}</button
            ><button type="button" class="button secondary" disabled>
              <ui-icon name="lock" /> {{ "Projections indisponibles" | t }}
            </button>
            @if (editing()) {
              <button type="button" class="button ghost" (click)="reset()">
                {{ "Annuler" | t }}
              </button>
            }
          </div>
        </form>
      </section>
      @if (store.scenarios().length) {
        <section class="scenario-saved">
          <h2>{{ "Mes scénarios enregistrés" | t }}</h2>
          @for (s of store.scenarios(); track s.id) {
            <div class="panel saved-row">
              <div>
                <strong>{{ s.name }}</strong>
                <p>
                  {{ s.months }} {{ "mois ·" | t }} {{ s.intakeDelta }}
                  {{ "kcal/j ·" | t }} {{ s.activityDelta }} {{ "kJ/kg/j" | t }}
                </p>
              </div>
              <div class="row-actions">
                <button class="button secondary small" (click)="edit(s)">
                  {{ "Modifier" | t }}</button
                ><button
                  class="icon-button"
                  (click)="remove(s)"
                  [attr.aria-label]="tr('Supprimer le scénario ') + s.name"
                >
                  <ui-icon name="trash" />
                </button>
              </div>
            </div>
          }
        </section>
      }
    } @else {
      <div class="empty-state panel">
        <h2>{{ "Commence par ton profil" | t }}</h2>
        <a class="button primary" routerLink="/profils">{{
          "Créer un profil" | t
        }}</a>
      </div>
    }`,
})
export class Futures {
  i18n = inject(I18n);
  tr = this.i18n.t;
  store = inject(Store);
  fb = inject(FormBuilder);
  showModel = signal(false);
  editing = signal<string | null>(null);
  form = this.fb.nonNullable.group({
    name: [
      this.tr("Un petit changement"),
      [Validators.required, Validators.maxLength(120)],
    ],
    months: [3],
    intakeDelta: [
      0,
      [Validators.required, Validators.min(-2000), Validators.max(2000)],
    ],
    activityDelta: [
      0,
      [Validators.required, Validators.min(-100), Validators.max(100)],
    ],
  });
  /** @spec TECH-FRONTEND-FUTURES-101 */
  constructor() {
    effect(() => {
      this.store.activeId();
      this.reset();
    });
  }
  /** @spec TECH-FRONTEND-FUTURES-101 */
  reset() {
    this.editing.set(null);
    this.form.reset({
      name: untracked(() => this.tr("Un petit changement")),
      months: 3,
      intakeDelta: 0,
      activityDelta: 0,
    });
  }
  /** @spec TECH-FRONTEND-FUTURES-101 */
  edit(s: Scenario) {
    this.editing.set(s.id);
    this.form.setValue({
      name: s.name,
      months: s.months,
      intakeDelta: s.intakeDelta,
      activityDelta: s.activityDelta,
    });
  }
  /** @spec TECH-FRONTEND-FUTURES-101 */
  async save() {
    if (this.form.invalid) return;
    if (
      await this.store.mutate({
        type: "saveScenario",
        value: {
          ...this.form.getRawValue(),
          id: this.editing() ?? uid(),
          profileId: this.store.activeId(),
        },
      })
    )
      this.reset();
  }
  /** @spec TECH-FRONTEND-FUTURES-101 */
  async remove(s: Scenario) {
    if (
      await this.store.mutate({
        type: "deleteScenario",
        value: { id: s.id, profileId: s.profileId },
      })
    ) {
      if (this.editing() === s.id) this.reset();
    }
  }
}

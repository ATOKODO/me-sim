import { Component, inject, signal, effect } from "@angular/core";
import { ReactiveFormsModule, FormBuilder, Validators } from "@angular/forms";
import { DecimalPipe } from "@angular/common";
import { RouterLink } from "@angular/router";
import { Store } from "../core/store";
import { Scenario, uid } from "../core/models";
import { AvatarScene } from "../scene/avatar";
import { Icon } from "../core/icon";
@Component({
  imports: [ReactiveFormsModule, DecimalPipe, AvatarScene, Icon, RouterLink],
  template: `<div class="page-heading">
      <div>
        <div class="eyebrow">PLUSIEURS CHEMINS, TOUJOURS TOI</div>
        <h1>Mes futurs possibles<span class="accent">.</span></h1>
        <p>Une hypothèse à explorer, pas une promesse sur ton avenir.</p>
      </div>
      <span class="pill lab-pill">LABORATOIRE</span>
    </div>
    @if (store.profile(); as p) {
      <section class="science-banner">
        <ui-icon name="lock" />
        <div>
          <strong
            >Les projections attendent leur validation scientifique.</strong
          >
          <p>
            Tu peux préparer et conserver tes scénarios. Aucun poids futur ni
            résultat de santé n’est calculé dans cette version.
          </p>
        </div>
        <button class="text-button" (click)="showModel.set(!showModel())">
          {{ showModel() ? "Fermer la fiche" : "Voir la fiche modèle" }}
          <ui-icon name="arrow" />
        </button>
      </section>
      @if (showModel()) {
        <section class="panel model-sheet">
          <span class="eyebrow">{{ store.model()?.version }}</span>
          <h2>{{ store.model()?.name }}</h2>
          <ul>
            @for (reason of store.model()?.reasons; track reason) {
              <li>{{ reason }}</li>
            }
          </ul>
          <p>
            Le modèle source concerne les adultes, hors grossesse et
            allaitement. Sommeil et stress ne sont pas convertis en effets sur
            le poids.
          </p>
          <p class="field-help">
            Source : Hall et al., Lancet, 2011 · DOI
            10.1016/S0140-6736(11)60812-X. Fiche scientifique complète embarquée
            dans la documentation du projet.
          </p>
        </section>
      }
      <div class="comparison-grid">
        <section class="panel">
          <div class="panel-heading">
            <div>
              <span class="eyebrow">SCÉNARIO A</span>
              <h2>Mes habitudes actuelles</h2>
            </div>
            <span class="pill muted">OBSERVATIONS</span>
          </div>
          <avatar-scene
            [compact]="true"
            label="POINT DE DÉPART"
            [color]="p.color"
            [animations]="store.data().settings.animations"
            [force2d]="store.data().settings.force2d"
          />
          <div class="comparison-info">
            <div>
              <span>Dernier poids</span
              ><strong>{{
                store.latest("weight")
                  ? (store.latest("weight")!.value | number: "1.0-1") + " kg"
                  : "Non renseigné"
              }}</strong>
            </div>
            <div>
              <span>Derniers apports</span
              ><strong>{{
                store.latest("intake")
                  ? (store.latest("intake")!.value | number: "1.0-0") + " kcal"
                  : "Non renseignés"
              }}</strong>
            </div>
          </div>
        </section>
        <section class="panel scenario-panel">
          <div class="panel-heading">
            <div>
              <span class="eyebrow accent">SCÉNARIO B</span>
              <h2>Si je change une habitude</h2>
            </div>
            <span class="pill">HYPOTHÈSE</span>
          </div>
          <avatar-scene
            [compact]="true"
            label="ILLUSTRATION · PAS UNE PRÉDICTION"
            [color]="'#b5bbe8'"
            mode="walk"
            [animations]="store.data().settings.animations"
            [force2d]="store.data().settings.force2d"
          />
          <div class="comparison-info">
            <div>
              <span>Poids futur</span><strong class="dim">Non calculé</strong>
            </div>
            <div>
              <span>Horizon scientifique</span
              ><strong class="dim">Non activé</strong>
            </div>
          </div>
        </section>
      </div>
      <section class="panel scenario-editor">
        <form [formGroup]="form" (ngSubmit)="save()">
          <div class="section-inline">
            <h2>Composer mon scénario</h2>
            <span>Paramètres de recherche · aucun conseil nutritionnel</span>
          </div>
          <div class="scenario-fields">
            <label
              >Nom<input
                formControlName="name"
                placeholder="Mon scénario"
                maxlength="120" /></label
            ><label
              >Horizon souhaité<select formControlName="months">
                <option [ngValue]="1">1 mois · non activé</option>
                <option [ngValue]="3">3 mois · non activé</option>
                <option [ngValue]="6">6 mois · non activé</option>
                <option [ngValue]="12">12 mois · non activé</option>
              </select></label
            ><label
              >Variation d’apports (kcal/j)<input
                type="number"
                formControlName="intakeDelta"
                min="-2000"
                max="2000"
                step="25" /></label
            ><label
              >Variation d’activité (kJ/kg/j)<input
                type="number"
                formControlName="activityDelta"
                min="-100"
                max="100"
                step="1"
            /></label>
          </div>
          <p class="field-help">
            L’activité utilise directement le paramètre énergétique du modèle.
            Aucune conversion automatique depuis les pas ou les séances de
            sport.
          </p>
          <div class="button-row">
            <button
              class="button primary"
              [disabled]="form.invalid || store.busy()"
            >
              <ui-icon name="check" /> Enregistrer le scénario</button
            ><button type="button" class="button secondary" disabled>
              <ui-icon name="lock" /> Projections indisponibles
            </button>
            @if (editing()) {
              <button type="button" class="button ghost" (click)="reset()">
                Annuler
              </button>
            }
          </div>
        </form>
      </section>
      @if (store.scenarios().length) {
        <section class="scenario-saved">
          <h2>Mes scénarios enregistrés</h2>
          @for (s of store.scenarios(); track s.id) {
            <div class="panel saved-row">
              <div>
                <strong>{{ s.name }}</strong>
                <p>
                  {{ s.months }} mois · {{ s.intakeDelta }} kcal/j ·
                  {{ s.activityDelta }} kJ/kg/j
                </p>
              </div>
              <div class="row-actions">
                <button class="button secondary small" (click)="edit(s)">
                  Modifier</button
                ><button
                  class="icon-button"
                  (click)="remove(s)"
                  [attr.aria-label]="'Supprimer le scénario ' + s.name"
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
        <h2>Commence par ton profil</h2>
        <a class="button primary" routerLink="/profils">Créer un profil</a>
      </div>
    }`,
})
export class Futures {
  store = inject(Store);
  fb = inject(FormBuilder);
  showModel = signal(false);
  editing = signal<string | null>(null);
  form = this.fb.nonNullable.group({
    name: [
      "Un petit changement",
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
  constructor() {
    effect(() => {
      this.store.activeId();
      this.reset();
    });
  }
  reset() {
    this.editing.set(null);
    this.form.reset({
      name: "Un petit changement",
      months: 3,
      intakeDelta: 0,
      activityDelta: 0,
    });
  }
  edit(s: Scenario) {
    this.editing.set(s.id);
    this.form.setValue({
      name: s.name,
      months: s.months,
      intakeDelta: s.intakeDelta,
      activityDelta: s.activityDelta,
    });
  }
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

import { I18n, TranslatePipe } from "../core/i18n";
import { FocusDialog } from "../core/focus-dialog";
import { Component, inject, signal } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { Store } from "../core/store";
import { DEFAULT_TARGET, Profile, uid } from "../core/models";
import { Icon } from "../core/icon";
@Component({
  imports: [TranslatePipe, FocusDialog, ReactiveFormsModule, Icon],
  template: `<div class="page-heading">
      <div>
        <div class="eyebrow">{{ "À CHACUN SON HISTOIRE" | t }}</div>
        <h1>{{ "Mes profils" | t }}<span class="accent">.</span></h1>
        <p>
          {{
            "Des espaces distincts sur cet appareil, sans compte à créer." | t
          }}
        </p>
      </div>
      <button
        class="button secondary"
        [disabled]="store.busy()"
        (click)="store.mutate({ type: 'demo' })"
      >
        <ui-icon name="play" /> {{ "Ajouter un profil démo" | t }}
      </button>
    </div>
    <div class="profiles-layout">
      <section class="panel form-panel">
        <h2>
          {{ editing() ? tr("Modifier le profil") : tr("Créer un profil") }}
        </h2>
        <form [formGroup]="form" (ngSubmit)="save()">
          <label
            >{{ "Prénom ou pseudonyme" | t
            }}<input
              formControlName="name"
              maxlength="120"
              [placeholder]="'Comment t’appelles-tu ?' | t"
              required
          /></label>
          <div class="form-pair">
            <label
              >{{ "Date de naissance" | t
              }}<input
                formControlName="birthDate"
                type="date"
                [max]="today()" /></label
            ><label
              >{{ "Taille (cm)" | t
              }}<input
                formControlName="heightCm"
                type="number"
                min="50"
                max="250"
                [placeholder]="'Facultatif' | t"
            /></label>
          </div>
          <label
            >{{ "Sexe physiologique · pour le modèle" | t
            }}<select formControlName="sex">
              <option value="">{{ "Non renseigné" | t }}</option>
              <option value="female">{{ "Féminin" | t }}</option>
              <option value="male">{{ "Masculin" | t }}</option>
            </select></label
          >
          <p class="field-help">
            {{
              "Ces informations sont facultatives pour le journal. Elles seront nécessaires aux modèles scientifiques concernés."
                | t
            }}
          </p>
          <label class="color-field"
            >{{ "Couleur de ton avatar" | t
            }}<input type="color" formControlName="color"
          /></label>
          <div class="button-row">
            <button
              class="button primary"
              [disabled]="form.invalid || store.busy()"
            >
              <ui-icon name="check" />{{
                editing() ? tr("Enregistrer") : tr("Créer le profil")
              }}
            </button>
            @if (editing()) {
              <button type="button" class="button ghost" (click)="reset()">
                {{ "Annuler" | t }}
              </button>
            }
          </div>
        </form>
      </section>
      <div class="profile-list">
        @for (p of store.profiles(); track p.id) {
          <article
            class="panel profile-card"
            [class.chosen]="store.activeId() === p.id"
          >
            <div class="profile-monogram" [style.background]="p.color">
              {{ p.name.charAt(0) }}
            </div>
            <div class="profile-details">
              <h2>{{ p.name }}</h2>
              <p>
                {{ count(p.id) }} {{ "mesures" | t }}
                @if (p.demo) {
                  <span class="pill">{{ "FICTIF" | t }}</span>
                }
              </p>
            </div>
            <div class="row-actions">
              <button
                class="button secondary small"
                [disabled]="store.activeId() === p.id"
                (click)="store.select(p.id)"
              >
                {{
                  store.activeId() === p.id ? tr("Actif") : tr("Ouvrir")
                }}</button
              ><button
                class="icon-button"
                (click)="edit(p)"
                [attr.aria-label]="tr('Modifier ') + p.name"
              >
                <ui-icon name="edit" /></button
              ><button
                class="icon-button"
                (click)="deleting.set(p)"
                [attr.aria-label]="tr('Supprimer ') + p.name"
              >
                <ui-icon name="trash" />
              </button>
            </div>
          </article>
        } @empty {
          <div class="panel empty-state">
            <span class="empty-gem">◆</span>
            <h2>{{ "Une place pour toi." | t }}</h2>
            <p>{{ "Ton premier profil apparaîtra ici." | t }}</p>
          </div>
        }
        <div class="info-footnote standalone">
          <ui-icon name="lock" />{{
            "Les profils partagent la même session Windows. Ils ne sont pas protégés les uns des autres par un mot de passe."
              | t
          }}
        </div>
      </div>
    </div>
    @if (deleting(); as p) {
      <div class="modal-backdrop">
        <section
          focusDialog
          (dismissed)="deleting.set(null)"
          class="modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="profile-delete"
        >
          <h2 id="profile-delete">{{ "Supprimer" | t }} {{ p.name }} ?</h2>
          <p>
            {{
              "Ses mesures, habitudes, journées suivies, imports et scénarios seront supprimés de la base. Les fichiers déjà exportés resteront sur le disque."
                | t
            }}
          </p>
          <div class="button-row">
            <button class="button secondary" (click)="deleting.set(null)">
              {{ "Annuler" | t }}</button
            ><button
              class="button danger"
              [disabled]="store.busy()"
              (click)="remove(p)"
            >
              {{ "Supprimer le profil" | t }}
            </button>
          </div>
        </section>
      </div>
    }`,
})
export class Profiles {
  i18n = inject(I18n);
  tr = this.i18n.t;
  store = inject(Store);
  fb = inject(FormBuilder);
  today = this.store.clock.today;
  editing = signal<Profile | null>(null);
  deleting = signal<Profile | null>(null);
  form = this.fb.group({
    name: ["", [Validators.required, Validators.maxLength(120)]],
    birthDate: [""],
    heightCm: [
      null as number | null,
      [Validators.min(50), Validators.max(250)],
    ],
    sex: [""],
    color: ["#bde883", Validators.required],
  });
  count = (id: string) =>
    this.store.data().observations.filter((o) => o.profileId === id).length;
  reset() {
    this.editing.set(null);
    this.form.reset({
      name: "",
      birthDate: "",
      heightCm: null,
      sex: "",
      color: "#bde883",
    });
  }
  edit(p: Profile) {
    this.editing.set(p);
    this.form.setValue({
      name: p.name,
      birthDate: p.birthDate ?? "",
      heightCm: p.heightCm,
      sex: p.sex ?? "",
      color: p.color,
    });
  }
  async save() {
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    if (!v.name?.trim()) {
      this.store.error.set("Le nom ne peut pas être vide.");
      return;
    }
    const original = this.editing();
    const id = original?.id ?? uid();
    const latest = this.store.profiles().find((profile) => profile.id === id);
    if (original && !latest) {
      this.store.error.set("Profil introuvable.");
      return;
    }
    const p: Profile = {
      id,
      name: v.name.trim(),
      birthDate: v.birthDate || null,
      sex: v.sex || null,
      heightCm: v.heightCm,
      color: v.color!,
      demo: latest?.demo ?? false,
      target: latest ? (latest.target ?? null) : { ...DEFAULT_TARGET },
      habits: latest?.habits ?? [],
    };
    // After an explicit retry, retain fields changed elsewhere when they were not edited here.
    if (original && latest) {
      for (const key of [
        "name",
        "birthDate",
        "sex",
        "heightCm",
        "color",
      ] as const) {
        if (p[key] === original[key]) Object.assign(p, { [key]: latest[key] });
      }
    }
    if (await this.store.mutate({ type: "saveProfile", value: p })) {
      this.store.select(id);
      this.reset();
    }
  }
  async remove(p: Profile) {
    if (await this.store.mutate({ type: "deleteProfile", value: p.id })) {
      if (this.editing()?.id === p.id) this.reset();
      this.deleting.set(null);
    }
  }
}

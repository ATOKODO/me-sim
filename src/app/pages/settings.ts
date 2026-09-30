import { I18n, TranslatePipe } from "../core/i18n";
import { FormsModule } from "@angular/forms";
import { Component, inject } from "@angular/core";
import { Store } from "../core/store";
import { Settings } from "../core/models";
import { Icon } from "../core/icon";
import { RouterLink } from "@angular/router";
@Component({
  imports: [TranslatePipe, Icon, RouterLink, FormsModule],
  template: `<div class="page-heading">
      <div>
        <div class="eyebrow">{{ "À TON RYTHME" | t }}</div>
        <h1>{{ "Préférences" | t }}<span class="accent">.</span></h1>
        <p>
          {{ "Un espace confortable, et des données sous ton contrôle." | t }}
        </p>
      </div>
    </div>
    <section class="panel settings-panel">
      <h2>{{ "Apparence et langue" | t }}</h2>
      <p>
        {{
          "Ces préférences s’appliquent à tous les profils et restent sur cet appareil."
            | t
        }}
      </p>
      <div class="appearance-fields">
        <label
          >{{ "Langue" | t
          }}<select
            [attr.aria-label]="'Langue des préférences' | t"
            [ngModel]="i18n.language()"
            [disabled]="store.busy()"
            (ngModelChange)="i18n.setLanguage($event)"
          >
            <option value="fr">Français</option>
            <option value="en">English</option>
          </select></label
        >
        <label
          >{{ "Thème" | t
          }}<select
            [attr.aria-label]="'Thème' | t"
            [ngModel]="i18n.theme()"
            [disabled]="store.busy()"
            (ngModelChange)="i18n.setTheme($event)"
          >
            <option value="dark">{{ "Sombre" | t }}</option>
            <option value="light">{{ "Clair" | t }}</option>
          </select></label
        >
      </div>
    </section>
    <section class="panel settings-panel">
      <h2>{{ "Ton petit monde" | t }}</h2>
      @for (option of options; track option.key) {
        <label class="toggle-row"
          ><div>
            <strong>{{ tr(option.title) }}</strong>
            <p>{{ tr(option.description) }}</p>
          </div>
          <input
            type="checkbox"
            role="switch"
            [checked]="value(option.key)"
            [disabled]="store.busy()"
            (change)="toggle(option.key, $any($event.target).checked)"
        /></label>
      }
    </section>
    <section class="panel settings-panel">
      <h2><ui-icon name="lock" /> {{ "Confidentialité" | t }}</h2>
      <p>
        {{
          "Tes données restent sur cet appareil. Aucun compte, service distant ou suivi d’utilisation n’est nécessaire."
            | t
        }}
      </p>
      <div class="storage-location">
        <span class="eyebrow">{{ "EMPLACEMENT DE LA BASE" | t }}</span
        ><code>{{ store.storagePath() | t }}</code>
      </div>
      <p class="field-help">
        {{
          "La base et les exports ne sont pas chiffrés. Leur protection dépend de ta session Windows et des personnes ayant accès au disque."
            | t
        }}
      </p>
      <div class="button-row">
        <a routerLink="/donnees" class="button secondary"
          >{{ "Sauvegarder ou restaurer" | t }} <ui-icon name="arrow" /></a
        ><a routerLink="/profils" class="button ghost">{{
          "Gérer ou supprimer mes profils" | t
        }}</a>
      </div>
    </section>
    <section class="panel settings-panel">
      <h2>{{ "À propos de Me-Sim" | t }}</h2>
      <p>{{ "Version 0.1.0 · Windows · Angular, Tauri et Three.js." | t }}</p>
      <p class="field-help">
        {{
          "Les avatars sont des illustrations. Les projections scientifiques sont désactivées tant que le modèle complet n’est pas validé. Les données de démonstration sont entièrement fictives."
            | t
        }}
      </p>
    </section>`,
})
export class SettingsPage {
  i18n = inject(I18n);
  tr = this.i18n.t;
  store = inject(Store);
  options: {
    key: keyof Pick<Settings, "animations" | "jitter" | "force2d">;
    title: string;
    description: string;
  }[] = [
    {
      key: "animations",
      title: "Donner vie à l’avatar",
      description: "Animations de marche, repos et exercice.",
    },
    {
      key: "jitter",
      title: "Tremblement rétro",
      description: "Un léger mouvement de la scène, inspiré de la PS1.",
    },
    {
      key: "force2d",
      title: "Préférer le mode 2D",
      description: "Une vue légère, sans rendu 3D actif.",
    },
  ];
  value = (key: keyof Pick<Settings, "animations" | "jitter" | "force2d">) =>
    this.store.data().settings[key];
  toggle(
    key: keyof Pick<Settings, "animations" | "jitter" | "force2d">,
    v: boolean,
  ) {
    void this.store.mutate({
      type: "settings",
      value: { ...this.store.data().settings, [key]: v },
    });
  }
}

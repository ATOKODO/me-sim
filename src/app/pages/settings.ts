import { Component, inject } from "@angular/core";
import { Store } from "../core/store";
import { Settings } from "../core/models";
import { Icon } from "../core/icon";
import { RouterLink } from "@angular/router";
@Component({
  imports: [Icon, RouterLink],
  template: `<div class="page-heading">
      <div>
        <div class="eyebrow">À TON RYTHME</div>
        <h1>Préférences<span class="accent">.</span></h1>
        <p>Un espace confortable, et des données sous ton contrôle.</p>
      </div>
    </div>
    <section class="panel settings-panel">
      <h2>Ton petit monde</h2>
      @for (option of options; track option.key) {
        <label class="toggle-row"
          ><div>
            <strong>{{ option.title }}</strong>
            <p>{{ option.description }}</p>
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
      <h2><ui-icon name="lock" /> Confidentialité</h2>
      <p>
        Tes données restent sur cet appareil. Aucun compte, service distant ou
        suivi d’utilisation n’est nécessaire.
      </p>
      <div class="storage-location">
        <span class="eyebrow">EMPLACEMENT DE LA BASE</span
        ><code>{{ store.storagePath() }}</code>
      </div>
      <p class="field-help">
        La base et les exports ne sont pas chiffrés. Leur protection dépend de
        ta session Windows et des personnes ayant accès au disque.
      </p>
      <div class="button-row">
        <a routerLink="/donnees" class="button secondary"
          >Sauvegarder ou restaurer <ui-icon name="arrow" /></a
        ><a routerLink="/profils" class="button ghost"
          >Gérer ou supprimer mes profils</a
        >
      </div>
    </section>
    <section class="panel settings-panel">
      <h2>À propos de Me-Sim</h2>
      <p>Version 0.1.0 · Windows · Angular, Tauri et Three.js.</p>
      <p class="field-help">
        Les avatars sont des illustrations. Les projections scientifiques sont
        désactivées tant que le modèle complet n’est pas validé. Les données de
        démonstration sont entièrement fictives.
      </p>
    </section>`,
})
export class SettingsPage {
  store = inject(Store);
  options: { key: keyof Settings; title: string; description: string }[] = [
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
  value = (key: keyof Settings) => this.store.data().settings[key];
  toggle(key: keyof Settings, v: boolean) {
    void this.store.mutate({
      type: "settings",
      value: { ...this.store.data().settings, [key]: v },
    });
  }
}

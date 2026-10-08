import { I18n, TranslatePipe } from "./core/i18n";
import { FormsModule } from "@angular/forms";
import { Component, inject } from "@angular/core";
import { RouterLink, RouterLinkActive, RouterOutlet } from "@angular/router";
import { Store } from "./core/store";
import { Icon } from "./core/icon";
@Component({
  selector: "app-root",
  imports: [
    TranslatePipe,
    FormsModule,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    Icon,
  ],
  template: `<a class="skip-link" href="#main">{{ "Aller au contenu" | t }}</a>
    <aside class="sidebar">
      <a routerLink="/" class="brand" aria-label="Me-Sim">
        <span class="brand-name">me</span
        ><span class="brand-tail"><span class="brand-dash">—</span>sim</span>
        <span class="version">{{ "ALPHA" | t }}</span>
      </a>
      <div class="sidebar-section">{{ "TON PETIT MONDE" | t }}</div>
      <nav [attr.aria-label]="'Navigation principale' | t">
        @for (item of links; track item.path) {
          <a
            [attr.aria-label]="tr(item.label)"
            [routerLink]="item.path"
            routerLinkActive="active"
            [routerLinkActiveOptions]="{ exact: item.path === '/' }"
            ><ui-icon [name]="item.icon" /><span>{{ tr(item.label) }}</span>
            @if (item.path === "/futurs") {
              <span class="nav-small">{{ "LAB" | t }}</span>
            }
          </a>
        }
      </nav>
      <div class="sidebar-bottom">
        <div class="privacy-note">
          <ui-icon name="lock" />
          <div>
            <strong>{{ "Ta vie reste privée." | t }}</strong
            ><span>{{ "Tes données restent chez toi." | t }}</span>
          </div>
        </div>
        <a
          routerLink="/parametres"
          routerLinkActive="active"
          class="settings-link"
          [attr.aria-label]="'Préférences' | t"
          [title]="'Préférences' | t"
          ><ui-icon name="settings" /><span>{{ "Préférences" | t }}</span></a
        >
        <div class="build-label">
          <span class="status-dot"></span> {{ "LOCAL FIRST" | t }}
          <span>{{ "v0.1.0" | t }}</span>
        </div>
      </div>
    </aside>
    <div class="workspace">
      <header class="topbar">
        <div class="breadcrumb">
          {{ "MON ESPACE" | t }} <span>/</span> <b>{{ "Me-Sim" | t }}</b>
        </div>
        <div class="topbar-right">
          <label class="language-menu">
            <span>{{ "Langue" | t }}</span>
            <select
              [attr.aria-label]="'Langue' | t"
              [ngModel]="i18n.language()"
              [disabled]="store.busy() || store.loading()"
              (ngModelChange)="i18n.setLanguage($event)"
            >
              <option value="fr">Français</option>
              <option value="en">English</option>
            </select>
          </label>
          <button
            class="theme-button"
            [attr.aria-label]="
              i18n.theme() === 'dark'
                ? tr('Passer au thème clair')
                : tr('Passer au thème sombre')
            "
            [title]="
              i18n.theme() === 'dark'
                ? tr('Passer au thème clair')
                : tr('Passer au thème sombre')
            "
            [disabled]="store.busy() || store.loading()"
            (click)="i18n.setTheme(i18n.theme() === 'dark' ? 'light' : 'dark')"
          >
            <ui-icon [name]="i18n.theme() === 'dark' ? 'sun' : 'moon'" />
          </button>
          <span class="local-badge"
            ><ui-icon name="lock" />
            {{
              store.desktop ? tr("Hors ligne") : tr("Aperçu navigateur")
            }}</span
          ><span class="top-divider"></span
          ><label class="profile-switch"
            ><span
              class="profile-dot"
              [style.background]="store.profile()?.color"
              >{{ store.profile()?.name?.charAt(0) || "?" }}</span
            ><select
              [attr.aria-label]="'Profil actif' | t"
              [disabled]="store.busy()"
              [ngModel]="store.activeId()"
              (ngModelChange)="store.select($event)"
            >
              @if (!store.profiles().length) {
                <option value="">{{ "Aucun profil" | t }}</option>
              }
              @for (p of store.profiles(); track p.id) {
                <option [ngValue]="p.id">{{ p.name }}</option>
              }
            </select></label
          >
        </div>
      </header>
      @if (!store.desktop) {
        <div class="preview-banner">
          {{
            "Aperçu de l’interface · données fictives en mémoire. Ouvre l’application Windows pour enregistrer et échanger tes données."
              | t
          }}
        </div>
      }
      <main id="main" tabindex="-1">
        @if (store.error()) {
          <div class="notice error" role="alert">
            <ui-icon name="info" />{{ store.error() | t
            }}<button
              class="text-button"
              (click)="store.error.set('')"
              [attr.aria-label]="'Fermer l’erreur' | t"
            >
              {{ "×" | t }}
            </button>
          </div>
        }
        @if (store.notice()) {
          <div class="notice" role="status">
            <ui-icon name="check" />{{ store.notice() | t
            }}<button
              class="text-button"
              (click)="store.notice.set('')"
              [attr.aria-label]="'Fermer le message' | t"
            >
              {{ "×" | t }}
            </button>
          </div>
        }
        @if (store.loading()) {
          <div class="empty-state">{{ "Ouverture de ton espace…" | t }}</div>
        } @else {
          <router-outlet />
        }
      </main>
      <footer>
        <span>{{ "Un peu mieux te connaître. Un futur à la fois." | t }}</span
        ><span
          >{{ "CONÇU POUR RESTER CHEZ TOI" | t }} <ui-icon name="lock"
        /></span>
      </footer>
    </div>`,
})
export class App {
  i18n = inject(I18n);
  tr = this.i18n.t;
  store = inject(Store);
  links = [
    { path: "/", label: "Mon aperçu", icon: "home" },
    { path: "/journal", label: "Mon journal", icon: "journal" },
    { path: "/habitudes", label: "Mes habitudes", icon: "check" },
    { path: "/futurs", label: "Mes futurs", icon: "future" },
    { path: "/donnees", label: "Mes données", icon: "data" },
    { path: "/profils", label: "Mes profils", icon: "profiles" },
  ];
  constructor() {
    void this.store.init();
  }
}

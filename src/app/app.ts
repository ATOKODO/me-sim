import {FormsModule} from "@angular/forms";
import { Component, inject } from "@angular/core";
import { RouterLink, RouterLinkActive, RouterOutlet } from "@angular/router";
import { Store } from "./core/store";
import { Icon } from "./core/icon";
@Component({
  selector: "app-root",
  imports: [FormsModule,RouterLink, RouterLinkActive, RouterOutlet, Icon],
  template: `<a class="skip-link" href="#main">Aller au contenu</a>
    <aside class="sidebar">
      <a routerLink="/" class="brand"
        ><span class="brand-gem">◆</span> me<span class="brand-dash">—</span
        >sim<span class="version">ALPHA</span></a
      >
      <div class="sidebar-section">TON PETIT MONDE</div>
      <nav aria-label="Navigation principale">
        @for (item of links; track item.path) {
          <a
            [attr.aria-label]="item.label"
            [routerLink]="item.path"
            routerLinkActive="active"
            [routerLinkActiveOptions]="{ exact: item.path === '/' }"
            ><ui-icon [name]="item.icon" /><span>{{ item.label }}</span>
            @if (item.path === "/futurs") {
              <span class="nav-small">LAB</span>
            }
          </a>
        }
      </nav>
      <div class="sidebar-bottom">
        <div class="privacy-note">
          <ui-icon name="lock" />
          <div>
            <strong>Ta vie reste privée.</strong
            ><span>Tes données restent chez toi.</span>
          </div>
        </div>
        <a
          routerLink="/parametres"
          routerLinkActive="active"
          class="settings-link"
          ><ui-icon name="settings" /> Préférences</a
        >
        <div class="build-label">
          <span class="status-dot"></span> LOCAL FIRST <span>v0.1.0</span>
        </div>
      </div>
    </aside>
    <div class="workspace">
      <header class="topbar">
        <div class="breadcrumb">MON ESPACE <span>/</span> <b>Me-Sim</b></div>
        <div class="topbar-right">
          <span class="local-badge"
            ><ui-icon name="lock" />
            {{ store.desktop ? "Hors ligne" : "Aperçu navigateur" }}</span
          ><span class="top-divider"></span
          ><label class="profile-switch"
            ><span
              class="profile-dot"
              [style.background]="store.profile()?.color"
              >{{ store.profile()?.name?.charAt(0) || "?" }}</span
            ><select
              aria-label="Profil actif"
              [disabled]="store.busy()"
              [ngModel]="store.activeId()"
              (ngModelChange)="store.select($event)"
            >
              @if (!store.profiles().length) {
                <option value="">Aucun profil</option>
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
          Aperçu de l’interface · données fictives en mémoire. Ouvre
          l’application Windows pour enregistrer et échanger tes données.
        </div>
      }
      <main id="main" tabindex="-1">
        @if (store.error()) {
          <div class="notice error" role="alert">
            <ui-icon name="info" />{{ store.error()
            }}<button
              class="text-button"
              (click)="store.error.set('')"
              aria-label="Fermer l’erreur"
            >
              ×
            </button>
          </div>
        }
        @if (store.notice()) {
          <div class="notice" role="status">
            <ui-icon name="check" />{{ store.notice()
            }}<button
              class="text-button"
              (click)="store.notice.set('')"
              aria-label="Fermer le message"
            >
              ×
            </button>
          </div>
        }
        @if (store.loading()) {
          <div class="empty-state">Ouverture de ton espace…</div>
        } @else {
          <router-outlet />
        }
      </main>
      <footer>
        <span>Un peu mieux te connaître. Un futur à la fois.</span
        ><span>CONÇU POUR RESTER CHEZ TOI <ui-icon name="lock" /></span>
      </footer>
    </div>`,
})
export class App {
  store = inject(Store);
  links = [
    { path: "/", label: "Mon aperçu", icon: "home" },
    { path: "/journal", label: "Mon journal", icon: "journal" },
    { path: "/futurs", label: "Mes futurs", icon: "future" },
    { path: "/donnees", label: "Mes données", icon: "data" },
    { path: "/profils", label: "Mes profils", icon: "profiles" },
  ];
  constructor() {
    void this.store.init();
  }
}

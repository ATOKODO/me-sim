import { I18n, TranslatePipe } from "../core/i18n";
import { FormsModule } from "@angular/forms";
import { Component, computed, inject, OnInit, signal } from "@angular/core";
import { invoke } from "@tauri-apps/api/core";
import { Store } from "../core/store";
import { Settings } from "../core/models";
import { Icon } from "../core/icon";
import { RouterLink } from "@angular/router";

interface CompanionStatus {
  running: boolean;
  url: string | null;
  port: number | null;
  certificatePath: string | null;
  certificateFingerprint: string | null;
  pairingCode: string | null;
  pairingExpiresAt: string | null;
  profileId: string | null;
  devices: { id: string; name: string; profileId: string }[];
}
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
          "Me-Sim n’utilise ni compte ni service distant. La base principale reste sur le PC ; le compagnon conserve ses saisies en attente sur le téléphone."
            | t
        }}
      </p>
      <div class="storage-location">
        <span class="eyebrow">{{ "EMPLACEMENT DE LA BASE" | t }}</span
        ><code>{{ store.storagePath() | t }}</code>
      </div>
      <p class="field-help">
        {{
          "La base et les exports ne sont pas chiffrés. Leur protection dépend de ta session sur cet ordinateur et des personnes ayant accès au disque."
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
      <h2>{{ "Compagnon téléphone" | t }}</h2>
      <p class="field-help">
        {{
          "Compagnon expérimental en alpha, non stable et sans développement actif. La confiance accordée au certificat racine concerne aussi d’autres sites : protège sa clé privée et consulte la documentation avant de l’approuver."
            | t
        }}
      </p>
      <p>
        {{
          "Saisis tes observations sur ton téléphone, même hors ligne. Quand la PWA est ouverte et retrouve ce PC sur le même Wi-Fi, elle renvoie les saisies en attente."
            | t
        }}
      </p>
      <p class="field-help">
        {{
          "Les saisies et la clé d’association conservées sur le téléphone ne sont pas chiffrées par Me-Sim. Protège l’accès à ton téléphone."
            | t
        }}
      </p>
      @if (!store.desktop) {
        <p class="field-help">
          {{ "Disponible dans l’application de bureau." | t }}
        </p>
      } @else {
        <label class="companion-profile">
          {{ "Profil accessible sur le téléphone" | t }}
          <select
            [ngModel]="companionProfileId()"
            [disabled]="companionBusy() || companionStatus()?.running === true"
            (ngModelChange)="companionProfileId.set($event)"
          >
            @for (profile of store.profiles(); track profile.id) {
              <option [value]="profile.id">{{ profile.name }}</option>
            }
          </select>
        </label>
        <div class="button-row companion-actions">
          @if (companionStatus()?.running) {
            <button
              type="button"
              class="button secondary"
              [disabled]="companionBusy()"
              (click)="newPairingCode()"
            >
              {{ "Créer un code d’appairage" | t }}
            </button>
            <button
              type="button"
              class="button ghost"
              [disabled]="companionBusy()"
              (click)="stopCompanion()"
            >
              {{ "Arrêter le compagnon" | t }}
            </button>
          } @else {
            <button
              type="button"
              class="button primary"
              [disabled]="companionBusy() || !companionProfileId()"
              (click)="startCompanion()"
            >
              {{ "Activer sur ce Wi-Fi" | t }}
            </button>
          }
        </div>
        @if (activeCompanion(); as active) {
          <div class="storage-location companion-connection">
            <span class="eyebrow">{{ "ADRESSE DU COMPAGNON" | t }}</span>
            <code>{{ active.url }}</code>
            @if (active.pairingCode) {
              <span class="eyebrow">{{
                "CODE TEMPORAIRE · 5 MINUTES" | t
              }}</span>
              <strong class="companion-code">{{ active.pairingCode }}</strong>
            }
          </div>
          <p class="field-help">
            {{
              "Si ton système demande une autorisation réseau, limite-la au réseau local. Garde cette adresse locale stable : un changement d’adresse isole les saisies en attente sur le téléphone."
                | t
            }}
          </p>
          <p class="field-help">
            {{
              "Pour installer la PWA hors ligne, approuve d’abord le certificat local sur le téléphone. Vérifie son empreinte avec celle affichée ici."
                | t
            }}
          </p>
          @if (active.certificatePath) {
            <div class="storage-location companion-connection">
              <span class="eyebrow">{{ "TÉLÉCHARGEMENT SUR LE TÉLÉPHONE" | t }}</span>
              <code>{{ active.url }}ca.crt</code>
              <span class="eyebrow">{{
                "CERTIFICAT LOCAL À TRANSFÉRER" | t
              }}</span>
              <code>{{ active.certificatePath }}</code>
              <span class="eyebrow">{{ "EMPREINTE SHA-256" | t }}</span>
              <code>{{ active.certificateFingerprint }}</code>
            </div>
            <p class="field-help">
              {{
                "Au premier accès, vérifie l’empreinte du certificat avant de l’approuver sur le téléphone, puis rouvre l’adresse du compagnon."
                  | t
              }}
            </p>
          }
        }
        <h3>{{ "Téléphones associés" | t }}</h3>
        @if (companionStatus()?.devices?.length) {
          @for (device of companionStatus()?.devices ?? []; track device.id) {
              <div class="companion-device">
                <span>{{ device.name }} · {{ profileName(device.profileId) }}</span>
                <button
                  type="button"
                  class="button ghost"
                  [disabled]="companionBusy()"
                  (click)="revokeCompanion(device.id)"
                >
                  {{ "Retirer l’accès" | t }}
                </button>
              </div>
          }
        } @else {
          <p class="field-help">{{ "Aucun téléphone associé." | t }}</p>
        }
        @if (companionError()) {
          <p class="field-help" role="alert">{{ companionError() }}</p>
        }
      }
    </section>
    <section class="panel settings-panel">
      <h2>{{ "À propos de Me-Sim" | t }}</h2>
      <p>{{ "Version 0.1.0 · Angular, Tauri et Three.js." | t }}</p>
      <p class="field-help">
        {{
          "Les avatars sont des illustrations. Les projections scientifiques sont désactivées tant que le modèle complet n’est pas validé. Les données de démonstration sont entièrement fictives."
            | t
        }}
      </p>
    </section>`,
})
export class SettingsPage implements OnInit {
  i18n = inject(I18n);
  tr = this.i18n.t;
  store = inject(Store);
  companionStatus = signal<CompanionStatus | null>(null);
  activeCompanion = computed(() => {
    const status = this.companionStatus();
    return status?.running ? status : null;
  });
  companionProfileId = signal("");
  companionBusy = signal(false);
  companionError = signal("");
  /** @spec TECH-FRONTEND-SETTINGS-101 */
  async ngOnInit() {
    if (!this.store.desktop) return;
    this.companionProfileId.set(this.store.activeId());
    await this.companionCommand("companion_status");
  }
  /** @spec TECH-FRONTEND-SETTINGS-101 */
  private async companionCommand(
    command: string,
    args?: Record<string, string>,
  ) {
    this.companionBusy.set(true);
    this.companionError.set("");
    try {
      const status = await invoke<CompanionStatus>(command, args);
      this.companionStatus.set(status);
      if (status.profileId) this.companionProfileId.set(status.profileId);
    } catch (error) {
      this.companionError.set(
        typeof error === "string"
          ? error
          : error instanceof Error
            ? error.message
            : String(error),
      );
    } finally {
      this.companionBusy.set(false);
    }
  }
  /** @spec TECH-FRONTEND-SETTINGS-101 */
  startCompanion() {
    void this.companionCommand("companion_start", {
      profileId: this.companionProfileId(),
    });
  }
  /** @spec TECH-FRONTEND-SETTINGS-101 */
  newPairingCode() {
    void this.companionCommand("companion_new_pairing_code");
  }
  /** @spec TECH-FRONTEND-SETTINGS-101 */
  stopCompanion() {
    void this.companionCommand("companion_stop");
  }
  /** @spec TECH-FRONTEND-SETTINGS-101 */
  revokeCompanion(deviceId: string) {
    void this.companionCommand("companion_revoke", { deviceId });
  }
  /** @spec TECH-FRONTEND-SETTINGS-101 */
  profileName(id: string) {
    return this.store.profiles().find((profile) => profile.id === id)?.name ?? id;
  }
  options: {
    key: keyof Pick<Settings, "animations" | "jitter">;
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
  ];
  /** @spec TECH-FRONTEND-SETTINGS-101 */
  value = (key: keyof Pick<Settings, "animations" | "jitter">) =>
    this.store.data().settings[key];
  /** @spec TECH-FRONTEND-SETTINGS-101 */
  toggle(key: keyof Pick<Settings, "animations" | "jitter">, v: boolean) {
    void this.store.mutate({
      type: "settings",
      value: { ...this.store.data().settings, [key]: v },
    });
  }
}

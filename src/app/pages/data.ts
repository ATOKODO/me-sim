import {
  I18n,
  TranslatePipe,
  LocalDatePipe,
  LocalNumberPipe,
} from "../core/i18n";
import { FocusDialog } from "../core/focus-dialog";
import { Component, inject, signal, effect } from "@angular/core";
import { ReactiveFormsModule, FormBuilder } from "@angular/forms";
import { invoke } from "@tauri-apps/api/core";
import { Store } from "../core/store";
import {
  METRICS,
  Workbook,
  Mapping,
  Preview,
  VersionedSnapshot,
  RestorePreview,
} from "../core/models";
import { Icon } from "../core/icon";
@Component({
  imports: [
    TranslatePipe,
    LocalDatePipe,
    LocalNumberPipe,
    FocusDialog,
    ReactiveFormsModule,
    Icon,
  ],
  template: `<div class="page-heading">
      <div>
        <div class="eyebrow">{{ "TES DONNÉES T’APPARTIENNENT" | t }}</div>
        <h1>{{ "Mes données" | t }}<span class="accent">.</span></h1>
        <p>{{ "Fais entrer ton historique. Emporte-le quand tu veux." | t }}</p>
      </div>
      <span class="local-badge"
        ><ui-icon name="lock" /> {{ "Traitement sur cet appareil" | t }}</span
      >
    </div>
    @if (!store.desktop) {
      <div class="notice">
        {{
          "Les échanges de fichiers sont disponibles dans l’application Windows. Cet aperçu ne lit ni n’enregistre de fichiers personnels."
            | t
        }}
      </div>
    }
    <div class="data-grid">
      <section class="panel import-panel">
        <div class="panel-heading">
          <div>
            <span class="eyebrow">{{ "01 / IMPORTER" | t }}</span>
            <h2>{{ "Retrouver mes repères" | t }}</h2>
          </div>
          <ui-icon name="upload" />
        </div>
        <div class="drop-area">
          <div class="file-stack">
            <span>{{ "CSV" | t }}</span
            ><span>{{ "XLS" | t }}</span
            ><span>{{ "JSON" | t }}</span>
          </div>
          <h3>{{ "Un historique, plusieurs formats." | t }}</h3>
          <p>
            {{ "CSV, XLS, XLSX ou tableau JSON · jusqu’à 25 Mo" | t }}<br />{{
              "Choisis les colonnes et vérifie avant d’importer." | t
            }}
          </p>
          <button
            class="button primary"
            (click)="choose()"
            [disabled]="!store.desktop || !store.profile() || store.busy()"
          >
            <ui-icon name="plus" /> {{ "Choisir un fichier" | t }}
          </button>
          @if (!store.profile()) {
            <p>{{ "Crée un profil avant d’importer des mesures." | t }}</p>
          }
        </div>
      </section>
      <section class="panel export-panel">
        <div class="panel-heading">
          <div>
            <span class="eyebrow">{{ "02 / EXPORTER" | t }}</span>
            <h2>{{ "Emporter mes données" | t }}</h2>
          </div>
          <ui-icon name="download" />
        </div>
        <div class="export-body">
          <p>
            {{ "Mesures du profil" | t }}
            <strong>{{ store.profile()?.name || "—" }}</strong>
          </p>
          <div class="export-formats">
            @for (f of ["csv", "xls", "xlsx"]; track f) {
              <button
                class="format-button"
                [disabled]="!store.desktop || !store.profile() || store.busy()"
                (click)="export(f)"
              >
                <ui-icon name="download" />{{ f.toUpperCase()
                }}<span>{{ "Mesures" | t }}</span>
              </button>
            }
          </div>
          <div class="divider"></div>
          <h3>{{ "Sauvegarde complète" | t }}</h3>
          <p>
            {{
              "Tous les profils, observations, scénarios et préférences dans un fichier JSON versionné."
                | t
            }}
          </p>
          <button
            class="button secondary full"
            (click)="export('json')"
            [disabled]="!store.desktop || store.busy()"
          >
            <ui-icon name="download" />
            {{ "Sauvegarder tout l’espace (.json)" | t }}
          </button>
        </div>
      </section>
    </div>
    @if (book(); as b) {
      <section class="panel mapping-panel">
        <div class="panel-heading">
          <div>
            <span class="eyebrow">{{ "CORRESPONDANCE DES COLONNES" | t }}</span>
            <h2>{{ b.filename }}</h2>
          </div>
          <button class="text-button" (click)="cancelImport()">
            {{ "Fermer ×" | t }}
          </button>
        </div>
        <form [formGroup]="form" (ngSubmit)="preview()">
          <div class="mapping-grid">
            <label
              >{{ "Feuille" | t
              }}<select formControlName="sheet">
                @for (sheet of b.sheets; track $index) {
                  <option [ngValue]="$index">
                    {{ sheet.name }} · {{ sheet.rows.length }}
                    {{ "lignes" | t }}
                  </option>
                }
              </select></label
            ><label
              >{{ "Colonne date" | t
              }}<select formControlName="dateColumn">
                @for (h of headers(); track $index) {
                  <option [ngValue]="$index">
                    {{ h || tr("Colonne ") + ($index + 1) }}
                  </option>
                }
              </select></label
            ><label
              >{{ "Format des dates" | t
              }}<select formControlName="dateFormat">
                <option value="">{{ "Choisir explicitement…" | t }}</option>
                <option value="iso">{{ "AAAA-MM-JJ" | t }}</option>
                <option value="dmy">{{ "JJ/MM/AAAA" | t }}</option>
                <option value="mdy">{{ "MM/JJ/AAAA" | t }}</option>
              </select></label
            ><label
              >{{ "Colonne valeur" | t
              }}<select formControlName="valueColumn">
                @for (h of headers(); track $index) {
                  <option [ngValue]="$index">
                    {{ h || tr("Colonne ") + ($index + 1) }}
                  </option>
                }
              </select></label
            ><label
              >{{ "Mesure par ligne" | t
              }}<select formControlName="metricColumn">
                <option [ngValue]="null">
                  {{ "Une seule mesure pour le fichier" | t }}
                </option>
                @for (h of headers(); track $index) {
                  <option [ngValue]="$index">
                    {{ h || tr("Colonne ") + ($index + 1) }}
                  </option>
                }
              </select></label
            ><label
              >{{ "Mesure fixe" | t
              }}<select formControlName="metric">
                @for (m of metrics; track m.id) {
                  <option [value]="m.id">{{ tr(m.label) }}</option>
                }
              </select></label
            ><label
              >{{ "Unité par ligne" | t
              }}<select formControlName="unitColumn">
                <option [ngValue]="null">
                  {{ "Une unité fixe pour le fichier" | t }}
                </option>
                @for (h of headers(); track $index) {
                  <option [ngValue]="$index">
                    {{ h || tr("Colonne ") + ($index + 1) }}
                  </option>
                }
              </select></label
            ><label
              >{{ "Unité fixe" | t
              }}<select formControlName="unit">
                <option value="">{{ "Choisir explicitement…" | t }}</option>
                @for (u of units; track u) {
                  <option [value]="u">{{ tr(u) }}</option>
                }
              </select></label
            ><label
              >{{ "Heure (optionnel)" | t
              }}<select formControlName="timeColumn">
                <option [ngValue]="null">{{ "Aucune heure" | t }}</option>
                @for (h of headers(); track $index) {
                  <option [ngValue]="$index">
                    {{ h || tr("Colonne ") + ($index + 1) }}
                  </option>
                }
              </select></label
            ><label
              >{{ "Durée (optionnel)" | t
              }}<select formControlName="durationColumn">
                <option [ngValue]="null">{{ "Utiliser la valeur" | t }}</option>
                @for (h of headers(); track $index) {
                  <option [ngValue]="$index">
                    {{ h || tr("Colonne ") + ($index + 1) }}
                  </option>
                }
              </select></label
            >
          </div>
          <p class="field-help">
            {{ "Profil destinataire :" | t }}
            <strong>{{ store.profile()?.name }}</strong
            >{{
              ". Les unités seront converties vers kg, h, pas, min, kcal, verre ou /10. Les formules et macros ne sont jamais exécutées."
                | t
            }}
          </p>
          <details>
            <summary>
              {{ "Voir les 5 premières lignes du fichier" | t }}
            </summary>
            <div class="table-scroll">
              <table>
                <thead>
                  <tr>
                    @for (h of headers(); track $index) {
                      <th>{{ h }}</th>
                    }
                  </tr>
                </thead>
                <tbody>
                  @for (row of sample(); track $index) {
                    <tr>
                      @for (c of row; track $index) {
                        <td>{{ c }}</td>
                      }
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </details>
          <button
            class="button primary"
            [disabled]="
              store.busy() ||
              !form.controls.dateFormat.value ||
              (!form.controls.unit.value &amp;&amp;
                form.controls.unitColumn.value === null)
            "
          >
            {{ "Vérifier les lignes" | t }} <ui-icon name="arrow" />
          </button>
        </form>
      </section>
    }
    @if (previewData(); as p) {
      <section class="panel preview-panel">
        <div class="panel-heading">
          <h2>{{ "Vérifier avant d’ajouter" | t }}</h2>
          <span class="pill">{{ p.rows.length }} {{ "LIGNES" | t }}</span>
        </div>
        <div class="import-counts">
          <span>{{ count("new") }} {{ "nouvelles" | t }}</span
          ><span>{{ count("duplicate") }} {{ "doublons" | t }}</span
          ><span>{{ count("conflict") }} {{ "conflits" | t }}</span
          ><span class="danger-text"
            >{{ count("error") }} {{ "erreurs" | t }}</span
          >
        </div>
        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th>{{ "Ligne" | t }}</th>
                <th>{{ "Date" | t }}</th>
                <th>{{ "Mesure" | t }}</th>
                <th>{{ "Valeur convertie" | t }}</th>
                <th>{{ "Vérification" | t }}</th>
              </tr>
            </thead>
            <tbody>
              @for (r of previewRows(); track r.row) {
                <tr>
                  <td>{{ r.row }}</td>
                  <td>{{ r.observation?.date || "—" }}</td>
                  <td>
                    {{
                      r.observation
                        ? tr(store.metric(r.observation.metric).label)
                        : "—"
                    }}
                  </td>
                  <td>
                    {{ r.observation?.value | localNumber: "1.0-3" }}
                    {{ tr(r.observation?.unit) }}
                  </td>
                  <td [class.danger-text]="r.status === 'error'">
                    {{ r.message | t }}
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <div class="pagination">
          <button
            class="button ghost small"
            [disabled]="previewPage() === 0"
            (click)="previewPage.set(previewPage() - 1)"
          >
            {{ "Précédent" | t }}</button
          ><span
            >{{ "Page" | t }} {{ previewPage() + 1 }} /
            {{ previewPages() }}</span
          ><button
            class="button ghost small"
            [disabled]="previewPage() + 1 >= previewPages()"
            (click)="previewPage.set(previewPage() + 1)"
          >
            {{ "Suivant" | t }}
          </button>
        </div>
        <div class="import-confirm">
          <label
            >{{ "En cas de conflit" | t
            }}<select
              [value]="policy()"
              (change)="policy.set($any($event.target).value)"
            >
              <option value="skip">
                {{ "Conserver la valeur déjà présente" | t }}
              </option>
              <option value="replace">
                {{ "Remplacer par la valeur du fichier (dernière ligne)" | t }}
              </option>
            </select></label
          >
          @if (count("error")) {
            <label class="checkbox-label"
              ><input
                type="checkbox"
                [checked]="skipErrors()"
                (change)="skipErrors.set($any($event.target).checked)"
              />{{ "Ignorer explicitement les" | t }} {{ count("error") }}
              {{ "lignes invalides" | t }}</label
            >
          }
          <button
            class="button primary"
            [disabled]="store.busy() || (count('error') > 0 &amp;&amp; !skipErrors())"
            (click)="commit()"
          >
            <ui-icon name="check" /> {{ "Confirmer l’import dans" | t }}
            {{ store.profile()?.name }}
          </button>
        </div>
      </section>
    }
    <section class="panel restore-panel">
      <div>
        <h2>{{ "Restaurer une sauvegarde" | t }}</h2>
        <p>
          {{
            "Remplace tout l’espace local par une sauvegarde JSON. Un aperçu et une copie de l’état actuel précèdent la restauration."
              | t
          }}
        </p>
      </div>
      <button
        class="button secondary"
        [disabled]="!store.desktop || store.busy()"
        (click)="restorePreview()"
      >
        <ui-icon name="data" /> {{ "Choisir une sauvegarde" | t }}
      </button>
    </section>
    @if (store.batches().length) {
      <section class="panel">
        <div class="panel-heading">
          <h2>{{ "Historique des imports" | t }}</h2>
        </div>
        <table>
          <thead>
            <tr>
              <th>{{ "Fichier" | t }}</th>
              <th>{{ "Date" | t }}</th>
              <th>{{ "Mesures traitées" | t }}</th>
            </tr>
          </thead>
          <tbody>
            @for (b of store.batches(); track b.id) {
              <tr>
                <td>{{ b.filename }}</td>
                <td>{{ b.importedAt | localDate: "dd/MM/yyyy HH:mm" }}</td>
                <td>{{ b.count }}</td>
              </tr>
            }
          </tbody>
        </table>
      </section>
    }
    @if (restore(); as r) {
      <div class="modal-backdrop">
        <section
          focusDialog
          (dismissed)="restore.set(null)"
          class="modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="restore-title"
        >
          <h2 id="restore-title">
            {{ "Remplacer tout l’espace local ?" | t }}
          </h2>
          <p>
            {{ r.profiles.length }} {{ "profils ·" | t }} {{ r.observations }}
            {{ "mesures ·" | t }} {{ r.habitDays }}
            {{ "journées d’habitudes ·" | t }} {{ r.scenarios }}
            {{ "scénarios" | t }}
          </p>
          <p>{{ r.profiles.join(", ") || tr("Sauvegarde vide") }}</p>
          <p>
            {{
              "Une copie JSON de l’état actuel sera enregistrée à côté de la base avant le remplacement."
                | t
            }}
          </p>
          <div class="button-row">
            <button class="button secondary" (click)="restore.set(null)">
              {{ "Annuler" | t }}</button
            ><button
              class="button danger"
              [disabled]="store.busy()"
              (click)="restoreCommit()"
            >
              {{ "Sauvegarder puis remplacer" | t }}
            </button>
          </div>
        </section>
      </div>
    }`,
})
export class DataPage {
  i18n = inject(I18n);
  tr = this.i18n.t;
  store = inject(Store);
  fb = inject(FormBuilder);
  metrics = METRICS;
  units = [
    ...new Set([...METRICS.map((metric) => metric.unit), "lb", "g", "kJ"]),
  ];
  book = signal<Workbook | null>(null);
  previewData = signal<Preview | null>(null);
  previewPage = signal(0);
  policy = signal("skip");
  skipErrors = signal(false);
  restore = signal<RestorePreview | null>(null);
  form = this.fb.group({
    sheet: [0],
    dateColumn: [0],
    valueColumn: [1],
    metricColumn: [null as number | null],
    unitColumn: [null as number | null],
    timeColumn: [null as number | null],
    durationColumn: [null as number | null],
    metric: ["weight"],
    unit: [""],
    dateFormat: [""],
  });
  constructor() {
    effect(() => {
      this.store.activeId();
      this.cancelImport();
    });
    effect(() => {
      this.store.externalRefresh();
      this.previewData.set(null);
    });
    this.form.valueChanges.subscribe(() => this.previewData.set(null));
  }
  headers = () =>
    this.book()?.sheets[this.form.controls.sheet.value ?? 0]?.headers ?? [];
  sample = () =>
    this.book()?.sheets[this.form.controls.sheet.value ?? 0]?.rows.slice(
      0,
      5,
    ) ?? [];
  count = (status: string) =>
    this.previewData()?.rows.filter((r) => r.status === status).length ?? 0;
  previewRows = () =>
    this.previewData()?.rows.slice(
      this.previewPage() * 15,
      this.previewPage() * 15 + 15,
    ) ?? [];
  previewPages = () =>
    Math.max(1, Math.ceil((this.previewData()?.rows.length ?? 0) / 15));
  cancelImport() {
    this.book.set(null);
    this.previewData.set(null);
    this.skipErrors.set(false);
    this.policy.set("skip");
  }
  async choose() {
    await this.store.task(async () => {
      const b = await invoke<Workbook | null>("choose_import");
      if (b) {
        this.cancelImport();
        this.book.set(b);
        this.form.reset({
          sheet: 0,
          dateColumn: 0,
          valueColumn: 1,
          metricColumn: null,
          unitColumn: null,
          timeColumn: null,
          durationColumn: null,
          metric: "weight",
          unit: "",
          dateFormat: "",
        });
        const headers = b.sheets[0]?.headers ?? [];
        for (const [field, name] of [
          ["dateColumn", "date"],
          ["valueColumn", "value"],
          ["metricColumn", "metric"],
          ["unitColumn", "unit"],
          ["timeColumn", "time"],
          ["durationColumn", "durationMinutes"],
        ] as const) {
          const index = headers.indexOf(name);
          if (index >= 0) this.form.controls[field].setValue(index);
        }
      }
    });
  }
  async preview() {
    await this.store.task(async () => {
      const p = await invoke<Preview>("preview_import", {
        token: this.book()!.token,
        mapping: this.form.getRawValue() as Mapping,
        profileId: this.store.activeId(),
      });
      this.previewData.set(p);
      this.previewPage.set(0);
    });
  }
  async commit() {
    await this.store.task(async () => {
      const s = await invoke<VersionedSnapshot>("commit_import", {
        expectedRevision: this.store.revision(),
        token: this.previewData()!.token,
        policy: this.policy(),
        skipErrors: this.skipErrors(),
      });
      this.store.apply(s);
      this.cancelImport();
      this.store.notice.set(
        "Import terminé. Les mesures sont enregistrées localement.",
      );
    });
  }
  async export(format: string) {
    await this.store.task(async () => {
      const path = await invoke<string | null>("export_data", {
        format,
        profileId: this.store.activeId(),
      });
      if (path) this.store.notice.set("Export enregistré : " + path);
    });
  }
  async restorePreview() {
    await this.store.task(async () =>
      this.restore.set(await invoke<RestorePreview | null>("preview_restore")),
    );
  }
  async restoreCommit() {
    await this.store.task(async () => {
      const r = await invoke<{ state: VersionedSnapshot; backupPath: string }>(
        "commit_restore",
        {
          token: this.restore()!.token,
          expectedRevision: this.store.revision(),
        },
      );
      this.store.apply(r.state);
      this.restore.set(null);
      this.cancelImport();
      this.store.notice.set(
        "Restauration terminée. Copie précédente : " + r.backupPath,
      );
    });
  }
}

import { FocusDialog } from "../core/focus-dialog";
import { Component, inject, signal, effect } from "@angular/core";
import { ReactiveFormsModule, FormBuilder } from "@angular/forms";
import { DatePipe, DecimalPipe } from "@angular/common";
import { invoke } from "@tauri-apps/api/core";
import { Store } from "../core/store";
import {
  METRICS,
  Workbook,
  Mapping,
  Preview,
  Snapshot,
  RestorePreview,
} from "../core/models";
import { Icon } from "../core/icon";
@Component({
  imports: [FocusDialog, ReactiveFormsModule, DatePipe, DecimalPipe, Icon],
  template: `<div class="page-heading">
      <div>
        <div class="eyebrow">TES DONNÉES T’APPARTIENNENT</div>
        <h1>Mes données<span class="accent">.</span></h1>
        <p>Fais entrer ton historique. Emporte-le quand tu veux.</p>
      </div>
      <span class="local-badge"
        ><ui-icon name="lock" /> Traitement sur cet appareil</span
      >
    </div>
    @if (!store.desktop) {
      <div class="notice">
        Les échanges de fichiers sont disponibles dans l’application Windows.
        Cet aperçu ne lit ni n’enregistre de fichiers personnels.
      </div>
    }
    <div class="data-grid">
      <section class="panel import-panel">
        <div class="panel-heading">
          <div>
            <span class="eyebrow">01 / IMPORTER</span>
            <h2>Retrouver mes repères</h2>
          </div>
          <ui-icon name="upload" />
        </div>
        <div class="drop-area">
          <div class="file-stack">
            <span>CSV</span><span>XLS</span><span>JSON</span>
          </div>
          <h3>Un historique, plusieurs formats.</h3>
          <p>
            CSV, XLS, XLSX ou tableau JSON · jusqu’à 25 Mo<br />Choisis les
            colonnes et vérifie avant d’importer.
          </p>
          <button
            class="button primary"
            (click)="choose()"
            [disabled]="!store.desktop || !store.profile() || store.busy()"
          >
            <ui-icon name="plus" /> Choisir un fichier
          </button>
          @if (!store.profile()) {
            <p>Crée un profil avant d’importer des mesures.</p>
          }
        </div>
      </section>
      <section class="panel export-panel">
        <div class="panel-heading">
          <div>
            <span class="eyebrow">02 / EXPORTER</span>
            <h2>Emporter mes données</h2>
          </div>
          <ui-icon name="download" />
        </div>
        <div class="export-body">
          <p>
            Mesures du profil
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
                }}<span>Mesures</span>
              </button>
            }
          </div>
          <div class="divider"></div>
          <h3>Sauvegarde complète</h3>
          <p>
            Tous les profils, observations, scénarios et préférences dans un
            fichier JSON versionné.
          </p>
          <button
            class="button secondary full"
            (click)="export('json')"
            [disabled]="!store.desktop || store.busy()"
          >
            <ui-icon name="download" /> Sauvegarder tout l’espace (.json)
          </button>
        </div>
      </section>
    </div>
    @if (book(); as b) {
      <section class="panel mapping-panel">
        <div class="panel-heading">
          <div>
            <span class="eyebrow">CORRESPONDANCE DES COLONNES</span>
            <h2>{{ b.filename }}</h2>
          </div>
          <button class="text-button" (click)="cancelImport()">Fermer ×</button>
        </div>
        <form [formGroup]="form" (ngSubmit)="preview()">
          <div class="mapping-grid">
            <label
              >Feuille<select formControlName="sheet">
                @for (sheet of b.sheets; track $index) {
                  <option [ngValue]="$index">
                    {{ sheet.name }} · {{ sheet.rows.length }} lignes
                  </option>
                }
              </select></label
            ><label
              >Colonne date<select formControlName="dateColumn">
                @for (h of headers(); track $index) {
                  <option [ngValue]="$index">
                    {{ h || "Colonne " + ($index + 1) }}
                  </option>
                }
              </select></label
            ><label
              >Format des dates<select formControlName="dateFormat">
                <option value="">Choisir explicitement…</option>
                <option value="iso">AAAA-MM-JJ</option>
                <option value="dmy">JJ/MM/AAAA</option>
                <option value="mdy">MM/JJ/AAAA</option>
              </select></label
            ><label
              >Colonne valeur<select formControlName="valueColumn">
                @for (h of headers(); track $index) {
                  <option [ngValue]="$index">
                    {{ h || "Colonne " + ($index + 1) }}
                  </option>
                }
              </select></label
            ><label
              >Mesure par ligne<select formControlName="metricColumn">
                <option [ngValue]="null">
                  Une seule mesure pour le fichier
                </option>
                @for (h of headers(); track $index) {
                  <option [ngValue]="$index">
                    {{ h || "Colonne " + ($index + 1) }}
                  </option>
                }
              </select></label
            ><label
              >Mesure fixe<select formControlName="metric">
                @for (m of metrics; track m.id) {
                  <option [value]="m.id">{{ m.label }}</option>
                }
              </select></label
            ><label
              >Unité par ligne<select formControlName="unitColumn">
                <option [ngValue]="null">Une unité fixe pour le fichier</option>
                @for (h of headers(); track $index) {
                  <option [ngValue]="$index">
                    {{ h || "Colonne " + ($index + 1) }}
                  </option>
                }
              </select></label
            ><label
              >Unité fixe<select formControlName="unit">
                <option value="">Choisir explicitement…</option>
                @for (u of units; track u) {
                  <option [value]="u">{{ u }}</option>
                }
              </select></label
            >
          </div>
          <p class="field-help">
            Profil destinataire : <strong>{{ store.profile()?.name }}</strong
            >. Les unités seront converties vers kg, h, pas, min, kcal ou /10.
            Les formules et macros ne sont jamais exécutées.
          </p>
          <details>
            <summary>Voir les 5 premières lignes du fichier</summary>
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
              (!form.controls.unit.value &&
                form.controls.unitColumn.value === null)
            "
          >
            Vérifier les lignes <ui-icon name="arrow" />
          </button>
        </form>
      </section>
    }
    @if (previewData(); as p) {
      <section class="panel preview-panel">
        <div class="panel-heading">
          <h2>Vérifier avant d’ajouter</h2>
          <span class="pill">{{ p.rows.length }} LIGNES</span>
        </div>
        <div class="import-counts">
          <span>{{ count("new") }} nouvelles</span
          ><span>{{ count("duplicate") }} doublons</span
          ><span>{{ count("conflict") }} conflits</span
          ><span class="danger-text">{{ count("error") }} erreurs</span>
        </div>
        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Ligne</th>
                <th>Date</th>
                <th>Mesure</th>
                <th>Valeur convertie</th>
                <th>Vérification</th>
              </tr>
            </thead>
            <tbody>
              @for (r of previewRows(); track r.row) {
                <tr>
                  <td>{{ r.row }}</td>
                  <td>{{ r.observation?.date || "—" }}</td>
                  <td>{{ r.observation?.metric || "—" }}</td>
                  <td>
                    {{ r.observation?.value | number: "1.0-3" }}
                    {{ r.observation?.unit }}
                  </td>
                  <td [class.danger-text]="r.status === 'error'">
                    {{ r.message }}
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
            Précédent</button
          ><span>Page {{ previewPage() + 1 }} / {{ previewPages() }}</span
          ><button
            class="button ghost small"
            [disabled]="previewPage() + 1 >= previewPages()"
            (click)="previewPage.set(previewPage() + 1)"
          >
            Suivant
          </button>
        </div>
        <div class="import-confirm">
          <label
            >En cas de conflit<select
              [value]="policy()"
              (change)="policy.set($any($event.target).value)"
            >
              <option value="skip">Conserver la valeur déjà présente</option>
              <option value="replace">
                Remplacer par la valeur du fichier (dernière ligne)
              </option>
            </select></label
          >
          @if (count("error")) {
            <label class="checkbox-label"
              ><input
                type="checkbox"
                [checked]="skipErrors()"
                (change)="skipErrors.set($any($event.target).checked)"
              />Ignorer explicitement les {{ count("error") }} lignes
              invalides</label
            >
          }
          <button
            class="button primary"
            [disabled]="store.busy() || (count('error') > 0 && !skipErrors())"
            (click)="commit()"
          >
            <ui-icon name="check" /> Confirmer l’import dans
            {{ store.profile()?.name }}
          </button>
        </div>
      </section>
    }
    <section class="panel restore-panel">
      <div>
        <h2>Restaurer une sauvegarde</h2>
        <p>
          Remplace tout l’espace local par une sauvegarde JSON. Un aperçu et une
          copie de l’état actuel précèdent la restauration.
        </p>
      </div>
      <button
        class="button secondary"
        [disabled]="!store.desktop || store.busy()"
        (click)="restorePreview()"
      >
        <ui-icon name="data" /> Choisir une sauvegarde
      </button>
    </section>
    @if (store.batches().length) {
      <section class="panel">
        <div class="panel-heading"><h2>Historique des imports</h2></div>
        <table>
          <thead>
            <tr>
              <th>Fichier</th>
              <th>Date</th>
              <th>Mesures traitées</th>
            </tr>
          </thead>
          <tbody>
            @for (b of store.batches(); track b.id) {
              <tr>
                <td>{{ b.filename }}</td>
                <td>{{ b.importedAt | date: "dd/MM/yyyy HH:mm" }}</td>
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
          <h2 id="restore-title">Remplacer tout l’espace local ?</h2>
          <p>
            {{ r.profiles.length }} profils · {{ r.observations }} mesures ·
            {{ r.scenarios }} scénarios
          </p>
          <p>{{ r.profiles.join(", ") || "Sauvegarde vide" }}</p>
          <p>
            Une copie JSON de l’état actuel sera enregistrée à côté de la base
            avant le remplacement.
          </p>
          <div class="button-row">
            <button class="button secondary" (click)="restore.set(null)">
              Annuler</button
            ><button
              class="button danger"
              [disabled]="store.busy()"
              (click)="restoreCommit()"
            >
              Sauvegarder puis remplacer
            </button>
          </div>
        </section>
      </div>
    }`,
})
export class DataPage {
  store = inject(Store);
  fb = inject(FormBuilder);
  metrics = METRICS;
  units = ["kg", "lb", "g", "h", "min", "pas", "kcal", "kJ", "/10"];
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
    metric: ["weight"],
    unit: [""],
    dateFormat: [""],
  });
  constructor() {
    effect(() => {
      this.store.activeId();
      this.cancelImport();
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
      const s = await invoke<Snapshot>("commit_import", {
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
      const r = await invoke<{ snapshot: Snapshot; backupPath: string }>(
        "commit_restore",
        { token: this.restore()!.token },
      );
      this.store.apply(r.snapshot);
      this.restore.set(null);
      this.cancelImport();
      this.store.notice.set(
        "Restauration terminée. Copie précédente : " + r.backupPath,
      );
    });
  }
}

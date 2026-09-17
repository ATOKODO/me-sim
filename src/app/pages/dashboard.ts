import { Component, inject, signal } from "@angular/core";
import { DatePipe, DecimalPipe } from "@angular/common";
import { RouterLink } from "@angular/router";
import { Store } from "../core/store";
import { METRICS } from "../core/models";
import { Icon } from "../core/icon";
import { Chart } from "../core/chart";
import { AvatarScene } from "../scene/avatar";
@Component({
  imports: [DatePipe, DecimalPipe, RouterLink, Icon, Chart, AvatarScene],
  template: `<div class="page-heading">
      <div>
        <div class="eyebrow">{{ date | date: "EEEE d MMMM yyyy" }}</div>
        <h1>Un peu plus toi, chaque jour<span class="accent">.</span></h1>
        <p>
          Observe tes habitudes. Explore tes possibles. Avance à ton rythme.
        </p>
      </div>
      <a class="button primary" routerLink="/journal"
        ><ui-icon name="plus" /> Ajouter une mesure</a
      >
    </div>
    @if (store.profile(); as profile) {
      <div class="dashboard-grid">
        <section class="panel avatar-panel">
          <div class="panel-heading">
            <div>
              <span class="eyebrow">ICI ET MAINTENANT</span>
              <h2>Ton avatar aujourd’hui</h2>
            </div>
            <span class="pill">{{
              profile.demo ? "DÉMONSTRATION" : "MON AVATAR"
            }}</span>
          </div>
          <div class="main-scene">
            <avatar-scene
              [color]="profile.color"
              [animations]="store.data().settings.animations"
              [jitter]="store.data().settings.jitter"
              [force2d]="store.data().settings.force2d"
              [mode]="mode()"
            />
          </div>
          <div class="avatar-toolbar">
            <div>
              <strong>{{ profile.name }}</strong
              ><span>Un reflet de toi. À ta façon.</span>
            </div>
            <div class="scene-controls" aria-label="Animation de l’avatar">
              @for (m of modes; track m.id) {
                <button
                  [class.selected]="mode() === m.id"
                  [attr.aria-pressed]="mode() === m.id"
                  (click)="mode.set(m.id)"
                  [title]="m.label"
                >
                  <ui-icon [name]="m.icon" /><span>{{ m.label }}</span>
                </button>
              }
            </div>
          </div>
        </section>
        <section class="today-column">
          <div class="section-inline">
            <h2>Tes repères</h2>
            <span>Dernières mesures</span>
          </div>
          @for (m of essentials; track m.id) {
            <article class="metric-card">
              <div class="metric-icon" [style.color]="m.color">
                <ui-icon [name]="m.icon" />
              </div>
              <div class="metric-body">
                <span>{{ m.label }}</span>
                <div class="metric-value">
                  @if (store.latest(m.id); as o) {
                    {{ o.value | number: "1.0-1" }}<small>{{ m.unit }}</small>
                  } @else {
                    <span class="unknown">Non renseigné</span>
                  }
                </div>
                <span class="metric-date"
                  >{{ store.latest(m.id)?.date | date: "d MMM" }}
                  @if (profile.demo) {
                    · données fictives
                  }
                </span>
              </div>
              <mini-chart
                [values]="values(m.id)"
                [color]="m.color"
                [label]="'Historique : ' + m.label"
              />
            </article>
          }
          <a class="subtle-link" routerLink="/journal"
            >Voir toutes mes mesures <ui-icon name="arrow"
          /></a>
        </section>
      </div>
      <div class="lower-grid">
        <section class="future-card">
          <div class="eyebrow">
            <span class="tiny-square"></span> LE FUTUR N’EST PAS ÉCRIT
          </div>
          <h2>Et si tu changeais<br />une petite habitude ?</h2>
          <p>
            Prépare un scénario et découvre les hypothèses<br
              class="desktop-break"
            />
            nécessaires pour comparer tes futurs.
          </p>
          <a class="button primary" routerLink="/futurs"
            >Explorer mes futurs <ui-icon name="arrow"
          /></a>
          <div class="future-art" aria-hidden="true">
            <span class="orbit o1"></span><span class="orbit o2"></span
            ><span class="orbit o3"></span><span class="gem g1">◆</span
            ><span class="gem g2">◆</span><span class="gem g3">◆</span>
          </div>
          <span class="lab-note">LAB · Modèle scientifique en validation</span>
        </section>
        <section class="panel trend-card">
          <div class="panel-heading">
            <div>
              <span class="eyebrow">LES PETITS PAS COMPTENT</span>
              <h2>Ton activité au fil du temps</h2>
            </div>
            <span class="pill muted">28 MESURES</span>
          </div>
          <div class="chart-legend">
            <span class="legend-dot"></span> Pas enregistrés
            <span>· observations</span>
          </div>
          <mini-chart
            [values]="values('steps')"
            label="Pas enregistrés, jusqu’aux 28 dernières mesures"
          />
          <div class="chart-range">
            <span>{{ store.series("steps")[0]?.date | date: "d MMM" }}</span
            ><span>{{ store.latest("steps")?.date | date: "d MMM" }}</span>
          </div>
          <div class="info-footnote">
            <ui-icon name="info" />Les tendances décrivent ton historique, sans
            prédire ta santé.
          </div>
        </section>
      </div>
    } @else {
      <section class="empty-state panel">
        <span class="empty-gem">◆</span>
        <h2>Ton histoire commence ici.</h2>
        <p>Crée ton premier profil ou explore un monde de démonstration.</p>
        <div class="button-row">
          <a class="button primary" routerLink="/profils"
            >Créer mon profil <ui-icon name="arrow" /></a
          ><button
            class="button secondary"
            (click)="store.mutate({ type: 'demo' })"
            [disabled]="store.busy()"
          >
            Explorer la démo
          </button>
        </div>
      </section>
    }`,
})
export class Dashboard {
  store = inject(Store);
  date = new Date();
  essentials = METRICS.slice(0, 3);
  mode = signal("idle");
  modes = [
    { id: "idle", label: "Pause", icon: "sun" },
    { id: "walk", label: "Marche", icon: "steps" },
    { id: "rest", label: "Repos", icon: "moon" },
    { id: "exercise", label: "Sport", icon: "activity" },
  ];
  values(metric: string) {
    return this.store.series(metric).map((o) => o.value);
  }
}

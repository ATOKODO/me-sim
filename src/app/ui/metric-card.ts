import { Component, input, inject } from "@angular/core";
import {
  I18n,
  TranslatePipe,
  LocalDatePipe,
  LocalNumberPipe,
} from "../core/i18n";
import { Chart } from "../core/chart";
import { Icon } from "../core/icon";
/** Latest known measurement. Missing data stays unknown; a reported zero stays zero. */
@Component({
  selector: "ui-metric-card",
  imports: [TranslatePipe, LocalDatePipe, LocalNumberPipe, Chart, Icon],
  host: { class: "metric-card" },
  template: `
    <div class="metric-heading">
      <div class="metric-icon" [style.color]="i18n.color(color())">
        <ui-icon [name]="icon()" />
      </div>
      <span>{{ label() | t }}</span>
    </div>
    <div class="metric-reading">
      <div class="metric-value">
        @if (value() !== null) {
          {{ value() | localNumber: "1.0-1" }}<small>{{ unit() | t }}</small>
        } @else {
          <span class="unknown">{{ "Non renseigné" | t }}</span>
        }
      </div>
      <mini-chart
        [values]="values()"
        [color]="color()"
        [label]="i18n.t('Historique : ') + i18n.t(label())"
      />
    </div>
    <span class="metric-date">
      {{ date() | localDate: "d MMM" }}
      @if (demo()) {
        {{ "· données fictives" | t }}
      }
    </span>
  `,
})
export class MetricCard {
  readonly i18n = inject(I18n);
  label = input.required<string>();
  unit = input("kg");
  icon = input("weight");
  color = input("#bde883");
  value = input<number | null>(null);
  date = input<string | null>(null);
  demo = input(false);
  values = input<number[]>([]);
}

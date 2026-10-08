import { I18n, TranslatePipe } from "./i18n";
import { Component, inject, computed, input } from "@angular/core";
import { chartPath } from "./chart-path";
@Component({
  selector: "mini-chart",
  imports: [TranslatePipe],
  template: `<svg
    viewBox="0 0 400 100"
    preserveAspectRatio="none"
    role="img"
    [attr.aria-label]="label() | t"
  >
    <path
      d="M0 25H400M0 50H400M0 75H400"
      stroke="currentColor"
      opacity=".06"
      fill="none"
    />
    @if (values().length > 1) {
      <path [attr.d]="area()" [attr.fill]="i18n.color(color())" opacity=".09" />
      <path
        [attr.d]="line()"
        [attr.stroke]="i18n.color(color())"
        fill="none"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        vector-effect="non-scaling-stroke"
      />
    } @else {
      <text
        x="200"
        y="55"
        text-anchor="middle"
        fill="var(--muted)"
        font-size="12"
      >
        {{ "Historique insuffisant" | t }}
      </text>
    }
  </svg>`,
  styles: [
    ":host{display:block;height:100px}svg{width:100%;height:100%;overflow:visible}",
  ],
})
export class Chart {
  i18n = inject(I18n);
  tr = this.i18n.t;
  values = input<number[]>([]);
  color = input("#bde883");
  label = input("Évolution des mesures observées");
  smooth = input(false);
  line = computed(() => chartPath(this.values(), this.smooth()));
  area = computed(() => this.line() + " L400,100 L0,100Z");
}

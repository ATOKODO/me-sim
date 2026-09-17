import { Component, computed, input } from "@angular/core";
@Component({
  selector: "mini-chart",
  template: `<svg
    viewBox="0 0 400 100"
    preserveAspectRatio="none"
    role="img"
    [attr.aria-label]="label()"
  >
    <path
      d="M0 25H400M0 50H400M0 75H400"
      stroke="currentColor"
      opacity=".06"
      fill="none"
    />
    @if (values().length > 1) {
      <path [attr.d]="area()" [attr.fill]="color()" opacity=".09" />
      <path
        [attr.d]="line()"
        [attr.stroke]="color()"
        fill="none"
        stroke-width="2"
        vector-effect="non-scaling-stroke"
      />
    } @else {
      <text x="200" y="55" text-anchor="middle" fill="#8f9b9c" font-size="12">
        Historique insuffisant
      </text>
    }
  </svg>`,
  styles: [
    ":host{display:block;height:100px}svg{width:100%;height:100%;overflow:visible}",
  ],
})
export class Chart {
  values = input<number[]>([]);
  color = input("#bde883");
  label = input("Évolution des mesures observées");
  line = computed(() => {
    const v = this.values();
    const min = Math.min(...v),
      max = Math.max(...v),
      span = max - min || 1;
    return v
      .map(
        (y, i) =>
          `${i ? "L" : "M"}${(i / Math.max(v.length - 1, 1)) * 400},${85 - ((y - min) / span) * 65}`,
      )
      .join(" ");
  });
  area = computed(() => this.line() + " L400,100 L0,100Z");
}

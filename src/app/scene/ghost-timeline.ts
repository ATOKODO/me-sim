import { I18n } from "../core/i18n";
import { Component, inject, input, output } from "@angular/core";
import { GhostEvent, timeLabel } from "../core/ghost";

@Component({
  selector: "ghost-timeline",

  template: `<div class="axis" aria-hidden="true">
      <span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span
      ><span>24:00</span>
    </div>
    <div
      class="lane"
      [class.reference]="ghost()"
      [attr.aria-label]="label()"
      role="group"
    >
      @for (event of events(); track event.id; let i = $index) {
        <button
          type="button"
          class="event"
          [class.point]="event.point"
          [class.running]="event.running"
          [style.left.%]="event.start / 14.4"
          [style.width.%]="width(event)"
          [style.top.px]="4 + (i % 3) * 16"
          [title]="description(event)"
          [attr.aria-label]="description(event)"
          (click)="select.emit(event)"
          [style.background]="
            event.metric === focusMetric()
              ? 'var(--accent)'
              : 'var(--text-96a09b, #96a09b)'
          "
          [style.opacity]="event.frequency ?? null"
        ></button>
      }
      <div
        class="cursor"
        [style.left.%]="minute() / 14.4"
        aria-hidden="true"
      ></div>
    </div>`,
  styles: [
    `
      :host {
        display: block;
        min-width: 0;
      }
      .axis {
        display: flex;
        justify-content: space-between;
        font:
          11px Consolas,
          monospace;
        color: var(--text-96a09b, #96a09b);
        margin: 10px 0 7px;
      }
      .lane {
        height: 59px;
        position: relative;
        background: repeating-linear-gradient(
          135deg,
          transparent,
          transparent 5px,
          var(--edge-343d40, #343d40) 5px,
          var(--edge-343d40, #343d40) 6px
        );
        margin-bottom: 16px;
      }
      .event {
        position: absolute;
        height: 13px;
        min-width: 3px;
        padding: 0;
        border: 0;
        border-radius: 2px;
      }
      .event:focus-visible {
        z-index: 3;
        outline-offset: 2px;
      }
      .event.running {
        outline: 1px dashed var(--accent);
        outline-offset: 2px;
      }
      .reference .event {
        opacity: 0.45;
      }
      .event.point {
        border-radius: 50%;
        width: 6px !important;
        height: 6px;
        top: 24px !important;
        transform: translateX(-50%);
      }
      .cursor {
        position: absolute;
        width: 2px;
        top: -3px;
        bottom: -3px;
        background: var(--text-e1e6dd, #e1e6dd);
        pointer-events: none;
      }
      .cursor:before {
        content: "";
        position: absolute;
        top: -5px;
        left: -3px;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: inherit;
      }
    `,
  ],
})
export class GhostTimeline {
  private readonly i18n = inject(I18n);
  events = input<GhostEvent[]>([]);
  minute = input(0);
  label = input("");
  ghost = input(false);
  focusMetric = input("screen");
  select = output<GhostEvent>();
  width(e: GhostEvent) {
    return Math.max(0.15, (e.end - e.start) / 14.4);
  }
  description(e: GhostEvent) {
    return `${this.i18n.t(e.label)} · ${timeLabel(e.start)}${e.point ? "" : "–" + timeLabel(e.end)}${e.running ? " · " + this.i18n.t("En cours") : ""}`;
  }
}

import { I18n, TranslatePipe } from "../core/i18n";
import {
  AfterViewInit,
  Component,
  inject,
  ElementRef,
  OnDestroy,
  ViewChild,
  effect,
  input,
  signal,
} from "@angular/core";
import type { CameraState, Room } from "./room";
@Component({
  selector: "avatar-scene",
  imports: [TranslatePipe],
  template: `<div
    class="scene"
    [class.compact]="compact()"
    [attr.data-mode]="mode()"
  >
    <div
      #host
      class="render-host"
      role="img"
      [attr.aria-hidden]="unavailable() ? true : null"
      [attr.tabindex]="cameraReady() &amp;&amp; !unavailable() ? 0 : null"
      [attr.aria-label]="
        'Scène 3D : glisser pour tourner, molette pour zoomer. Au clavier : flèches pour tourner, plus ou moins pour zoomer, R pour réinitialiser.'
          | t
      "
      (keydown)="cameraKey($event)"
      (pointerdown)="focusCamera()"
    ></div>
    @if (unavailable()) {
      <div class="unavailable" role="status">
        <strong>{{ "3D indisponible" | t }}</strong>
        <p>
          {{
            "Le rendu 3D n’est pas disponible sur cet appareil. Tes données restent accessibles."
              | t
          }}
        </p>
        <button type="button" class="button secondary" (click)="retry()">
          {{ "Réessayer la 3D" | t }}
        </button>
      </div>
    }
    @if (cameraReady() && !unavailable()) {
      <div
        class="camera-controls"
        role="group"
        [attr.aria-label]="'Caméra 3D' | t"
      >
        <button
          type="button"
          [attr.aria-label]="'Dézoomer la scène' | t"
          [title]="'Dézoomer (−)' | t"
          [disabled]="!cameraState().canZoomOut"
          (click)="zoomCamera(-1)"
        >
          <span aria-hidden="true">−</span>
        </button>
        <output class="camera-zoom" [attr.aria-label]="'Niveau de zoom' | t"
          >{{ zoomPercent() }} %</output
        >
        <button
          type="button"
          [attr.aria-label]="'Zoomer la scène' | t"
          [title]="'Zoomer (+)' | t"
          [disabled]="!cameraState().canZoomIn"
          (click)="zoomCamera(1)"
        >
          <span aria-hidden="true">+</span>
        </button>
        <button
          type="button"
          [attr.aria-label]="'Réinitialiser la caméra' | t"
          [title]="'Réinitialiser la caméra (R)' | t"
          (click)="resetCamera()"
        >
          <span aria-hidden="true">↺</span>
        </button>
      </div>
      <div class="camera-hint" aria-hidden="true">
        {{ "Glisser : tourner" | t }}<br />{{ "Molette : zoomer" | t }}
      </div>
    }
    <div class="scene-grid"></div>
    <div class="scene-corner">{{ label() | t }}</div>
    <div class="scene-caption">
      <span class="tiny-dot"></span>
      {{
        unavailable()
          ? tr("3D indisponible")
          : source() === "artist"
            ? tr("ANIMATION GLB")
            : tr("SCÈNE 3D")
      }}
      <span class="separator">/</span> {{ "PS1 EDITION" | t }}
    </div>
  </div>`,
  styles: [
    `
      :host {
        display: block;
        height: 100%;
        min-height: 260px;
      }
      .scene {
        height: 100%;
        min-height: 380px;
        position: relative;
        overflow: hidden;
        background: radial-gradient(
          ellipse at 50% 55%,
          #343d33 0,
          #202a25 45%,
          #171e20 85%
        );
      }
      .scene.compact {
        min-height: 290px;
      }
      .render-host {
        position: absolute;
        inset: 0;
        cursor: grab;
      }
      .render-host:focus-visible {
        outline: 2px solid #bde883;
        outline-offset: -4px;
      }
      .camera-controls {
        position: absolute;
        top: 16px;
        right: 16px;
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 4px;
        border: 1px solid #5c7362;
        border-radius: 7px;
        background: #17241df2;
      }
      .camera-controls button {
        width: 32px;
        height: 32px;
        padding: 0;
        border: 1px solid #607466;
        border-radius: 4px;
        color: #dae7d4;
        background: #26372d;
        font:
          19px Consolas,
          monospace;
        cursor: pointer;
      }
      .camera-controls button:hover:not(:disabled) {
        background: #3a513d;
      }
      .camera-controls button:focus-visible {
        outline: 2px solid #bde883;
        outline-offset: 2px;
      }
      .camera-controls button:disabled {
        opacity: 0.4;
        cursor: default;
      }
      .camera-zoom {
        min-width: 43px;
        text-align: center;
        color: #dae7d4;
        font:
          10px Consolas,
          monospace;
      }
      .camera-hint {
        position: absolute;
        top: 66px;
        right: 18px;
        text-align: right;
        color: #c1d0bf;
        font:
          9px/1.6 Consolas,
          monospace;
        pointer-events: none;
        padding: 3px 5px;
        border-radius: 4px;
        background: #17241df2;
      }
      .render-host:empty {
        display: none;
      }
      .scene-grid {
        pointer-events: none;
        position: absolute;
        inset: 0;
        background: repeating-linear-gradient(
          0deg,
          transparent,
          transparent 3px,
          #07130d08 3px,
          #07130d08 4px
        );
      }
      .scene-corner {
        position: absolute;
        top: 23px;
        left: 25px;
        color: #cbdac1;
        max-width: calc(100% - 200px);
        line-height: 1.5;
        pointer-events: none;
        font:
          10px Consolas,
          monospace;
        letter-spacing: 2px;
      }
      .scene-caption {
        pointer-events: none;
        position: absolute;
        bottom: 22px;
        left: 25px;
        color: #8d9f92;
        font:
          9px Consolas,
          monospace;
        letter-spacing: 1.8px;
        display: flex;
        gap: 10px;
        align-items: center;
      }
      .tiny-dot {
        height: 5px;
        width: 5px;
        background: #bde883;
        border-radius: 50%;
      }
      .separator {
        opacity: 0.3;
      }
      .unavailable {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-direction: column;
        gap: 16px;
        padding: 64px 28px;
        text-align: center;
      }
      .unavailable strong {
        color: #e7ece4;
      }
      .unavailable p {
        max-width: 360px;
        color: #b4c1b4;
        font-size: 13px;
      }
    `,
  ],
})
export class AvatarScene implements AfterViewInit, OnDestroy {
  i18n = inject(I18n);
  tr = this.i18n.t;
  @ViewChild("host") host!: ElementRef<HTMLDivElement>;
  color = input("#bde883");
  animations = input(true);
  jitter = input(false);
  mode = input("idle");
  replayKey = input(0);
  compact = input(false);
  label = input("TON ESPACE");
  unavailable = signal(false);
  source = signal<"artist" | "procedural">("procedural");
  cameraReady = signal(false);
  cameraState = signal<CameraState>({
    zoom: 1,
    canZoomIn: true,
    canZoomOut: true,
  });
  zoomPercent = () => Math.round(this.cameraState().zoom * 100);
  private room?: Room;
  private destroyed = false;
  private ready = signal(false);
  private creating = false;
  private roomTask?: Promise<void>;
  constructor() {
    effect(() => {
      const options = {
        color: this.color(),
        animations: this.animations(),
        jitter: this.jitter(),
        mode: this.mode(),
        replayKey: this.replayKey(),
      };
      if (!this.ready()) return;
      if (this.unavailable()) {
        this.room?.dispose();
        this.room = undefined;
        this.cameraReady.set(false);
        this.source.set("procedural");
      } else if (this.room) this.room.update(options);
      else if (!this.creating) this.roomTask = this.createRoom();
    });
  }
  ngAfterViewInit() {
    this.ready.set(true);
  }
  private async createRoom() {
    this.creating = true;
    try {
      const { Room } = await import("./room");
      if (this.destroyed || this.unavailable()) return;
      this.room = new Room(
        this.host.nativeElement,
        () => this.unavailable.set(true),
        (source) => this.source.set(source),
        (state) => this.cameraState.set(state),
      );
      this.room.update({
        color: this.color(),
        animations: this.animations(),
        jitter: this.jitter(),
        mode: this.mode(),
        replayKey: this.replayKey(),
      });
      this.cameraReady.set(true);
    } catch {
      this.unavailable.set(true);
    } finally {
      this.creating = false;
    }
  }
  retry() {
    if (this.destroyed || this.creating) return;
    this.unavailable.set(false);
  }
  focusCamera() {
    if (this.cameraReady() && !this.unavailable())
      this.host.nativeElement.focus({ preventScroll: true });
  }
  zoomCamera(direction: number) {
    this.room?.zoomCamera(direction);
  }
  resetCamera() {
    this.room?.resetCamera();
  }
  cameraKey(event: KeyboardEvent) {
    if (!this.room || event.altKey || event.ctrlKey || event.metaKey) return;
    switch (event.key) {
      case "ArrowLeft":
        this.room.rotateCamera(-1, 0);
        break;
      case "ArrowRight":
        this.room.rotateCamera(1, 0);
        break;
      case "ArrowUp":
        this.room.rotateCamera(0, -1);
        break;
      case "ArrowDown":
        this.room.rotateCamera(0, 1);
        break;
      case "+":
      case "=":
        this.zoomCamera(1);
        break;
      case "-":
        this.zoomCamera(-1);
        break;
      case "r":
      case "R":
      case "Home":
        this.resetCamera();
        break;
      default:
        return;
    }
    event.preventDefault();
  }
  async prepareModes(modes: string[]) {
    if (this.destroyed || this.unavailable()) return;
    if (this.roomTask) await this.roomTask;
    await this.room?.preloadModes(modes);
  }
  ngOnDestroy() {
    this.destroyed = true;
    this.room?.dispose();
  }
}

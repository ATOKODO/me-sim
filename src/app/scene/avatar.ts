import {
  AfterViewInit,
  Component,
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
  template: `<div
    class="scene"
    [class.compact]="compact()"
    [attr.data-mode]="mode()"
  >
    <div
      #host
      class="render-host"
      role="img"
      [attr.tabindex]="cameraReady() && !force2d() && !fallback() ? 0 : null"
      aria-label="Scène 3D : glisser pour tourner, molette pour zoomer. Au clavier : flèches pour tourner, plus ou moins pour zoomer, R pour réinitialiser."
      (keydown)="cameraKey($event)"
      (pointerdown)="focusCamera()"
    ></div>
    @if (fallback() || force2d()) {
      <div class="fallback">
        @for (key of [mode() + ":" + replayKey()]; track key) {
          <div
            class="pixel-person"
            [class.still]="!animations()"
            [style.--shirt]="color()"
            [attr.data-mode]="mode()"
          >
            <i class="head"></i><i class="body"></i><i class="arm a1"></i
            ><i class="arm a2"></i><i class="leg l1"></i><i class="leg l2"></i>
          </div>
        }
        <span>Vue 2D · ton avatar</span>
      </div>
    }
    @if (cameraReady() && !fallback() && !force2d()) {
      <div class="camera-controls" role="group" aria-label="Caméra 3D">
        <button
          type="button"
          aria-label="Dézoomer la scène"
          title="Dézoomer (−)"
          [disabled]="!cameraState().canZoomOut"
          (click)="zoomCamera(-1)"
        >
          <span aria-hidden="true">−</span>
        </button>
        <output class="camera-zoom" aria-label="Niveau de zoom"
          >{{ zoomPercent() }} %</output
        >
        <button
          type="button"
          aria-label="Zoomer la scène"
          title="Zoomer (+)"
          [disabled]="!cameraState().canZoomIn"
          (click)="zoomCamera(1)"
        >
          <span aria-hidden="true">+</span>
        </button>
        <button
          type="button"
          aria-label="Réinitialiser la caméra"
          title="Réinitialiser la caméra (R)"
          (click)="resetCamera()"
        >
          <span aria-hidden="true">↺</span>
        </button>
      </div>
      <div class="camera-hint" aria-hidden="true">
        Glisser : tourner<br />Molette : zoomer
      </div>
    }
    <div class="scene-grid"></div>
    <div class="scene-corner">{{ label() }}</div>
    <div class="scene-caption">
      <span class="tiny-dot"></span>
      {{
        force2d() || fallback()
          ? "MODE 2D"
          : source() === "artist"
            ? "ANIMATION GLB"
            : "SCÈNE 3D"
      }}
      <span class="separator">/</span> PS1 EDITION
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
      .fallback {
        height: 100%;
        min-height: 300px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-direction: column;
        gap: 35px;
        background: linear-gradient(145deg, #24342d, #171e20);
      }
      .fallback span {
        font:
          11px Consolas,
          monospace;
        color: #a6b7a7;
      }
      .pixel-person {
        width: 90px;
        height: 160px;
        position: relative;
        filter: drop-shadow(8px 8px 0 #101713);
      }
      .pixel-person i {
        position: absolute;
        display: block;
      }
      @keyframes pixel-idle {
        0%,
        100% {
          transform: translateY(0);
        }
        50% {
          transform: translateY(-3px);
        }
      }
      @keyframes pixel-walk {
        0%,
        100% {
          transform: translateY(0) rotate(-1deg);
        }
        50% {
          transform: translateY(-7px) rotate(1deg);
        }
      }
      @keyframes pixel-exercise {
        0%,
        100% {
          transform: translateY(0) scaleY(1);
        }
        50% {
          transform: translateY(11px) scaleY(0.94);
        }
      }
      @keyframes pixel-work {
        0%,
        100% {
          transform: rotate(-2deg);
        }
        50% {
          transform: rotate(2deg);
        }
      }
      @keyframes pixel-social {
        0%,
        100% {
          transform: translateX(0);
        }
        50% {
          transform: translateX(5px);
        }
      }
      @keyframes pixel-screen {
        0%,
        100% {
          transform: rotate(-4deg) translateY(2px);
        }
        50% {
          transform: rotate(4deg) translateY(-2px);
        }
      }
      @keyframes pixel-screen-evening {
        0%,
        100% {
          transform: translateY(5px) rotate(-7deg);
        }
        50% {
          transform: translateY(7px) rotate(-9deg);
        }
      }
      @keyframes pixel-tobacco {
        0%,
        100% {
          transform: rotate(-2deg);
        }
        55% {
          transform: translateY(-3px) rotate(2deg);
        }
      }
      @keyframes pixel-vaping {
        0%,
        100% {
          transform: rotate(3deg) scaleX(1);
        }
        50% {
          transform: translateY(-4px) rotate(4deg) scaleX(0.98);
        }
      }
      @keyframes pixel-sedentary {
        0%,
        100% {
          transform: translateY(12px) rotate(0);
        }
        50% {
          transform: translateY(13px) rotate(1deg);
        }
      }
      @keyframes pixel-gaming {
        0%,
        100% {
          transform: translateY(0) rotate(-3deg);
        }
        50% {
          transform: translateY(-4px) rotate(3deg);
        }
      }
      @keyframes pixel-reading {
        0%,
        100% {
          transform: rotate(-5deg);
        }
        50% {
          transform: rotate(3deg);
        }
      }
      @keyframes pixel-meal {
        0%,
        100% {
          transform: translateY(0);
        }
        50% {
          transform: translateY(-4px) rotate(2deg);
        }
      }
      @keyframes pixel-drink {
        0%,
        100% {
          transform: rotate(0);
        }
        50% {
          transform: rotate(7deg) translateY(-3px);
        }
      }
      @keyframes pixel-rest {
        0%,
        100% {
          transform: rotate(5deg) translateY(3px);
        }
        50% {
          transform: rotate(7deg) translateY(1px);
        }
      }
      @keyframes pixel-vapor {
        0% {
          opacity: 0;
          transform: translate(0, 6px) scale(0.7);
        }
        35% {
          opacity: 0.9;
        }
        100% {
          opacity: 0;
          transform: translate(5px, -18px) scale(1.2);
        }
      }
      .pixel-person[data-mode="idle"] {
        animation: pixel-idle 2.4s ease-in-out infinite;
      }
      .pixel-person[data-mode="walk"] {
        animation: pixel-walk 0.55s ease-in-out infinite;
      }
      .pixel-person[data-mode="exercise"] {
        animation: pixel-exercise 0.65s ease-in-out infinite;
      }
      .pixel-person[data-mode="work"] {
        animation: pixel-work 1.4s ease-in-out infinite;
      }
      .pixel-person[data-mode="social"] {
        animation: pixel-social 1.1s ease-in-out infinite;
      }
      .pixel-person[data-mode="screen"] {
        animation: pixel-screen 1.8s ease-in-out infinite;
      }
      .pixel-person[data-mode="screen_evening"] {
        animation: pixel-screen-evening 2.7s ease-in-out infinite;
      }
      .pixel-person[data-mode="gaming"] {
        animation: pixel-gaming 0.8s ease-in-out infinite;
      }
      .pixel-person[data-mode="reading"] {
        animation: pixel-reading 2s ease-in-out infinite;
      }
      .pixel-person[data-mode="meal"] {
        animation: pixel-meal 1.5s ease-in-out infinite;
      }
      .pixel-person[data-mode="alcohol"] {
        animation: pixel-drink 1.2s ease-in-out infinite;
      }
      .pixel-person[data-mode="rest"] {
        animation: pixel-rest 2.8s ease-in-out infinite;
      }
      .pixel-person[data-mode="tobacco"] {
        animation: pixel-tobacco 1.35s ease-in-out infinite;
      }
      .pixel-person[data-mode="vaping"] {
        animation: pixel-vaping 2.2s ease-in-out infinite;
      }
      .pixel-person[data-mode="sedentary"] {
        transform: translateY(12px);
        animation: pixel-sedentary 2.6s ease-in-out infinite;
      }
      .pixel-person[data-mode="tobacco"] .a1 {
        transform: rotate(-135deg);
        transform-origin: top center;
      }
      .pixel-person[data-mode="vaping"] .a1 {
        transform: rotate(-145deg);
        transform-origin: top center;
      }
      .pixel-person[data-mode="vaping"] .a2 {
        transform: rotate(35deg);
        transform-origin: top center;
      }
      .pixel-person[data-mode="tobacco"]::after,
      .pixel-person[data-mode="vaping"]::after {
        content: "";
        position: absolute;
        width: 8px;
        height: 8px;
        left: 52px;
        top: 6px;
        background: #d5d3c5;
        box-shadow:
          -7px -8px 0 -1px #d5d3c5,
          3px -15px 0 -2px #d5d3c5;
        image-rendering: pixelated;
        animation: pixel-vapor 1.6s ease-out infinite;
      }
      .pixel-person[data-mode="vaping"]::after {
        background: #b8d9df;
        box-shadow:
          -8px -8px 0 -1px #b8d9df,
          3px -15px 0 -2px #b8d9df;
        animation-duration: 1.2s;
      }
      .pixel-person[data-mode="screen_evening"]::after {
        content: "";
        position: absolute;
        width: 22px;
        height: 16px;
        left: 50px;
        top: 74px;
        background: #a9c9e8;
        opacity: 0.42;
        filter: blur(5px);
      }
      .pixel-person[data-mode="sedentary"] .l1,
      .pixel-person[data-mode="sedentary"] .l2 {
        transform: rotate(62deg);
        transform-origin: top center;
      }
      .pixel-person[data-mode="gaming"] .a1,
      .pixel-person[data-mode="gaming"] .a2 {
        animation: pixel-game-arm 0.4s ease-in-out infinite alternate;
      }
      .pixel-person.still,
      .pixel-person.still .a1,
      .pixel-person.still .a2 {
        animation: none !important;
      }
      .pixel-person.still::after {
        animation: none !important;
      }
      @keyframes pixel-game-arm {
        from {
          transform: rotate(-8deg);
        }
        to {
          transform: rotate(8deg);
        }
      }
      .head {
        width: 42px;
        height: 42px;
        background: #d7a786;
        left: 24px;
        top: 0;
        border-top: 12px solid #473e35;
      }
      .body {
        width: 48px;
        height: 58px;
        left: 21px;
        top: 42px;
        background: var(--shirt);
      }
      .arm {
        width: 15px;
        height: 60px;
        top: 45px;
        background: #d7a786;
        border-top: 20px solid var(--shirt);
      }
      .a1 {
        left: 4px;
      }
      .a2 {
        right: 4px;
      }
      .leg {
        width: 20px;
        height: 58px;
        top: 100px;
        background: #455467;
        border-bottom: 10px solid #dad9c7;
      }
      .l1 {
        left: 22px;
      }
      .l2 {
        right: 22px;
      }
    `,
  ],
})
export class AvatarScene implements AfterViewInit, OnDestroy {
  @ViewChild("host") host!: ElementRef<HTMLDivElement>;
  color = input("#bde883");
  animations = input(true);
  jitter = input(false);
  force2d = input(false);
  mode = input("idle");
  replayKey = input(0);
  compact = input(false);
  label = input("TON ESPACE");
  fallback = signal(false);
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
        hidden: this.force2d(),
      };
      if (!this.ready()) return;
      if (options.hidden || this.fallback()) {
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
      if (this.destroyed || this.force2d() || this.fallback()) return;
      this.room = new Room(
        this.host.nativeElement,
        () => this.fallback.set(true),
        (source) => this.source.set(source),
        (state) => this.cameraState.set(state),
      );
      this.room.update({
        color: this.color(),
        animations: this.animations(),
        jitter: this.jitter(),
        mode: this.mode(),
        replayKey: this.replayKey(),
        hidden: this.force2d(),
      });
      this.cameraReady.set(true);
    } catch {
      this.fallback.set(true);
    } finally {
      this.creating = false;
    }
  }
  focusCamera() {
    if (this.cameraReady() && !this.force2d() && !this.fallback())
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
    if (this.destroyed || this.force2d() || this.fallback()) return;
    if (this.roomTask) await this.roomTask;
    await this.room?.preloadModes(modes);
  }
  ngOnDestroy() {
    this.destroyed = true;
    this.room?.dispose();
  }
}

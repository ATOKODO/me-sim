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
import type { Room } from "./room";
@Component({
  selector: "avatar-scene",
  template: `<div class="scene" [class.compact]="compact()">
    <div
      #host
      class="render-host"
      role="img"
      aria-label="Avatar rétro dans une pièce isométrique"
    ></div>
    @if (fallback() || force2d()) {
      <div class="fallback">
        <div class="pixel-person" [style.--shirt]="color()">
          <i class="head"></i><i class="body"></i><i class="arm a1"></i
          ><i class="arm a2"></i><i class="leg l1"></i><i class="leg l2"></i>
        </div>
        <span>Vue 2D · ton avatar</span>
      </div>
    }
    <div class="scene-grid"></div>
    <div class="scene-corner">{{ label() }}</div>
    <div class="scene-caption">
      <span class="tiny-dot"></span>
      {{ force2d() || fallback() ? "MODE 2D" : "SCÈNE 3D" }}
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
        font:
          10px Consolas,
          monospace;
        letter-spacing: 2px;
      }
      .scene-caption {
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
  compact = input(false);
  label = input("TON ESPACE");
  fallback = signal(false);
  private room?: Room;
  private destroyed = false;
  private ready = signal(false);
  private creating = false;
  constructor() {
    effect(() => {
      const options = {
        color: this.color(),
        animations: this.animations(),
        jitter: this.jitter(),
        mode: this.mode(),
        hidden: this.force2d(),
      };
      if (!this.ready()) return;
      if (options.hidden) {
        this.room?.dispose();
        this.room = undefined;
      } else if (this.room) this.room.update(options);
      else if (!this.creating && !this.fallback()) void this.createRoom();
    });
  }
  ngAfterViewInit() {
    this.ready.set(true);
  }
  private async createRoom() {
    this.creating = true;
    try {
      const { Room } = await import("./room");
      if (this.destroyed || this.force2d()) return;
      this.room = new Room(this.host.nativeElement, () =>
        this.fallback.set(true),
      );
      this.room.update({
        color: this.color(),
        animations: this.animations(),
        jitter: this.jitter(),
        mode: this.mode(),
        hidden: this.force2d(),
      });
    } catch {
      this.fallback.set(true);
    } finally {
      this.creating = false;
    }
  }
  ngOnDestroy() {
    this.destroyed = true;
    this.room?.dispose();
  }
}

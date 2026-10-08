import * as T from "three";
import { ArtistAnimations } from "./artist-animations";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

export interface CameraState {
  zoom: number;
  canZoomIn: boolean;
  canZoomOut: boolean;
}
export class Room {
  private renderer: T.WebGLRenderer;
  private scene = new T.Scene();
  private camera = new T.OrthographicCamera(-5.3, 5.3, 4, -4, 0.1, 80);
  private controls: OrbitControls;
  private readonly emitCameraState = () => {
    this.onCameraState?.({
      zoom: this.camera.zoom,
      canZoomIn: this.camera.zoom < this.controls.maxZoom,
      canZoomOut: this.camera.zoom > this.controls.minZoom,
    });
  };
  private frame = 0;
  private observer: ResizeObserver;
  private root = new T.Group();
  private person = new T.Group();
  private arms: T.Group[] = [];
  private legs: T.Group[] = [];
  private activityProps: Record<string, T.Group> = {};
  private artist: ArtistAnimations;
  private vaporPuffs: T.Mesh[] = [];
  private shirt = new T.MeshLambertMaterial({
    color: "#bde883",
    flatShading: true,
  });
  private options = {
    color: "#bde883",
    animations: true,
    jitter: false,
    mode: "idle",
    replayKey: 0,
  };
  private last = 0;
  private modeStartedAt = 0;
  private dead = false;
  private onLost = (e: Event) => {
    e.preventDefault();
    cancelAnimationFrame(this.frame);
    this.onUnavailable();
  };
  constructor(
    private host: HTMLElement,
    private onUnavailable: () => void,
    private onAnimationSource?: (source: "artist" | "procedural") => void,
    private onCameraState?: (state: CameraState) => void,
  ) {
    this.renderer = new T.WebGLRenderer({
      antialias: false,
      alpha: true,
      powerPreference: "low-power",
    });
    this.renderer.setPixelRatio(1);
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = T.SRGBColorSpace;
    this.renderer.domElement.style.cssText =
      "width:100%;height:100%;display:block;image-rendering:pixelated";
    host.append(this.renderer.domElement);
    this.renderer.domElement.addEventListener("webglcontextlost", this.onLost);
    this.camera.position.set(9, 8, 11);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0, 1, 0);
    this.controls.enablePan = false;
    this.controls.minZoom = 0.7;
    this.controls.maxZoom = 4;
    this.controls.minPolarAngle = 0.15;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.05;
    this.controls.update();
    this.controls.saveState();
    this.controls.addEventListener("change", this.emitCameraState);
    this.renderer.domElement.setAttribute("aria-hidden", "true");
    this.scene.add(new T.AmbientLight(0xcbdac5, 2));
    const sun = new T.DirectionalLight(0xffdfac, 3);
    sun.position.set(-3, 8, 5);
    this.scene.add(sun);
    this.scene.add(this.root);
    this.buildRoom();
    this.buildPerson();
    this.buildActivityProps();
    this.artist = new ArtistAnimations(this.root, (active) => {
      this.person.visible = !active;
      this.setActivityProps(active ? "idle" : this.options.mode);
      this.onAnimationSource?.(active ? "artist" : "procedural");
    });
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(host);
    this.resize();
    this.tick(0);
    this.emitCameraState();
  }
  private box(
    w: number,
    h: number,
    d: number,
    color: number | string,
    x: number,
    y: number,
    z: number,
    parent: T.Object3D = this.root,
  ) {
    const m = new T.Mesh(
      new T.BoxGeometry(w, h, d),
      new T.MeshLambertMaterial({ color, flatShading: true }),
    );
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  }
  private buildRoom() {
    this.box(7, 0.28, 5.7, 0x554c3c, 0, -0.18, 0);
    for (let x = 0; x < 14; x++)
      for (let z = 0; z < 6; z++)
        this.box(
          0.485,
          0.04,
          0.94,
          (x + z) % 3 === 0 ? 0xa89774 : 0x918365,
          -3.25 + x * 0.5,
          0,
          -2.37 + z * 0.95,
        );
    this.box(7, 3.3, 0.16, 0x6b8068, 0, 1.63, -2.85);
    this.box(0.16, 3.3, 5.7, 0x7f927b, -3.5, 1.63, 0);
    this.box(6.85, 0.15, 0.1, 0xb1b399, 0, 0.13, -2.72);
    this.box(0.1, 0.15, 5.5, 0xb1b399, -3.38, 0.13, 0);
    // Window, sky, four panes and a skyline, all local geometry.
    this.box(2.3, 1.85, 0.14, 0xc5c8b2, -1.3, 2, -2.69);
    this.box(2.05, 1.6, 0.16, 0x819c9e, -1.3, 2, -2.59);
    this.box(2.05, 0.06, 0.05, 0xd9d7bc, -1.3, 2, -2.48);
    this.box(0.06, 1.6, 0.05, 0xd9d7bc, -1.3, 2, -2.47);
    this.box(2.6, 0.1, 0.5, 0xddd8bb, -1.3, 1.05, -2.45);
    this.box(0.4, 0.55, 0.03, 0x698b79, -2, 1.5, -2.48);
    this.box(0.45, 0.35, 0.03, 0x6f8e7b, -1.5, 1.4, -2.48);
    // Rug, sofa, bookshelf, coffee table.
    this.box(3.4, 0.04, 2.2, 0x718b77, 0.3, 0.06, 0.2);
    this.box(3, 0.015, 1.85, 0x7f9882, 0.3, 0.085, 0.2);
    this.box(2.6, 0.55, 0.94, 0xc1ac89, 1.85, 0.44, -1.9);
    this.box(2.6, 0.7, 0.25, 0xcdb994, 1.85, 0.98, -2.24);
    this.box(0.22, 0.7, 1.1, 0xb59d7d, 0.5, 0.75, -1.85);
    this.box(0.22, 0.7, 1.1, 0xb59d7d, 3.17, 0.75, -1.85);
    for (let i = 0; i < 3; i++)
      this.box(0.76, 0.15, 0.75, 0xd2be9d, 1 + i * 0.81, 0.79, -1.73);
    const cushion = this.box(0.55, 0.45, 0.15, 0x7e9178, 2.65, 1.05, -2);
    cushion.rotation.z = 0.16;
    this.box(1.5, 0.12, 0.78, 0x654e3d, 1.6, 0.65, 0.4);
    for (const x of [1, 2.2])
      for (const z of [0.13, 0.67])
        this.box(0.09, 0.6, 0.09, 0x493d30, x, 0.3, z);
    this.box(0.38, 0.035, 0.3, 0xdbceaa, 1.6, 0.74, 0.4);
    this.box(0.25, 0.04, 0.32, 0x788d79, 1.7, 0.77, 0.38);
    this.box(0.7, 2, 1.3, 0x5b4d3c, -3.05, 1, 1.5);
    for (let y = 0; y < 3; y++) {
      this.box(0.75, 0.08, 1.3, 0x9b8661, -3.02, 0.2 + y * 0.7, 1.5);
      for (let i = 0; i < 4; i++)
        this.box(
          0.38,
          0.48,
          0.16,
          [0xd5bb87, 0x6d8f88, 0x9e7560, 0x92926a][i],
          -2.83,
          0.49 + y * 0.7,
          1.08 + i * 0.23,
        );
    }
    // Plant and poster.
    const pot = new T.Mesh(
      new T.CylinderGeometry(0.27, 0.2, 0.5, 6),
      new T.MeshLambertMaterial({ color: 0xbb8262 }),
    );
    pot.position.set(2.8, 0.3, 1.9);
    this.root.add(pot);
    this.box(0.07, 1.1, 0.07, 0x536a3e, 2.8, 1.03, 1.9);
    for (let i = 0; i < 7; i++) {
      const leaf = new T.Mesh(
        new T.IcosahedronGeometry(0.38, 0),
        new T.MeshLambertMaterial({ color: i % 2 ? 0x6c8d50 : 0x839c5f }),
      );
      leaf.scale.set(0.55, 1, 0.65);
      leaf.position.set(
        2.8 + Math.sin(i * 2) * 0.3,
        1 + i * 0.11,
        1.9 + Math.cos(i * 2) * 0.25,
      );
      this.root.add(leaf);
    }
    this.box(0.95, 1.25, 0.12, 0x5b5d49, 2, 2.35, -2.7);
    this.box(0.8, 1.1, 0.13, 0xd3ca9f, 2, 2.35, -2.61);
    this.box(0.55, 0.08, 0.03, 0x90966c, 2, 2.13, -2.52);
    const art = new T.Mesh(
      new T.CircleGeometry(0.24, 12),
      new T.MeshBasicMaterial({ color: 0xc49262 }),
    );
    art.position.set(2, 2.49, -2.52);
    this.root.add(art);
  }
  private buildPerson() {
    this.root.add(this.person);
    this.person.position.set(-0.45, 0.1, 0.75);
    this.person.rotation.y = 0.15;
    const torso = new T.Mesh(new T.BoxGeometry(0.55, 0.7, 0.32), this.shirt);
    torso.position.y = 1.25;
    this.person.add(torso);
    this.box(0.39, 0.44, 0.38, 0xd8a988, 0, 1.88, 0, this.person);
    this.box(0.42, 0.17, 0.4, 0x493e32, 0, 2.12, -0.015, this.person);
    this.box(0.08, 0.27, 0.39, 0x493e32, -0.18, 1.99, -0.01, this.person);
    for (const x of [-0.09, 0.09])
      this.box(0.045, 0.045, 0.02, 0x34332c, x, 1.92, 0.2, this.person);
    this.box(0.1, 0.035, 0.03, 0xaa7a64, 0, 1.79, 0.2, this.person);
    for (const sign of [-1, 1]) {
      const arm = new T.Group();
      arm.position.set(sign * 0.38, 1.54, 0);
      this.person.add(arm);
      const sleeve = new T.Mesh(new T.BoxGeometry(0.2, 0.28, 0.27), this.shirt);
      sleeve.position.y = -0.14;
      arm.add(sleeve);
      this.box(0.16, 0.4, 0.2, 0xd8a988, 0, -0.43, 0, arm);
      this.arms.push(arm);
      const leg = new T.Group();
      leg.position.set(sign * 0.15, 0.92, 0);
      this.person.add(leg);
      this.box(0.24, 0.72, 0.29, 0x495c68, 0, -0.34, 0, leg);
      this.box(0.26, 0.15, 0.42, 0xdddac2, 0, -0.74, 0.07, leg);
      this.legs.push(leg);
    }
    const shadow = new T.Mesh(
      new T.CircleGeometry(0.48, 16),
      new T.MeshBasicMaterial({
        color: 0x26372d,
        transparent: true,
        opacity: 0.3,
        depthWrite: false,
      }),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(-0.45, 0.11, 0.75);
    this.root.add(shadow);
  }
  private buildActivityProps() {
    const laptop = new T.Group();
    this.box(0.62, 0.04, 0.38, 0x3f5960, 0, 0, 0, laptop);
    this.box(0.54, 0.32, 0.035, 0x7fa4a1, 0, 0.18, -0.16, laptop);
    laptop.position.set(0, 0.72, 0.26);
    this.person.add(laptop);
    this.activityProps.work = laptop;

    const phone = new T.Group();
    this.box(0.12, 0.28, 0.035, 0x263e4b, 0, 0, 0, phone);
    this.box(0.09, 0.19, 0.012, 0x9cc8c2, 0, 0.01, -0.025, phone);
    phone.position.set(0.2, 1.08, 0.3);
    phone.rotation.z = -0.15;
    this.person.add(phone);
    this.activityProps.screen = phone;

    const eveningPhone = new T.Group();
    this.box(0.15, 0.3, 0.035, 0x2b3153, 0, 0, 0, eveningPhone);
    const nightDisplay = new T.Mesh(
      new T.BoxGeometry(0.12, 0.22, 0.015),
      new T.MeshBasicMaterial({ color: 0x849de2 }),
    );
    nightDisplay.position.set(0, 0.01, 0.027);
    eveningPhone.add(nightDisplay);
    eveningPhone.position.set(0.08, 1.31, 0.32);
    eveningPhone.rotation.z = 0.2;
    this.person.add(eveningPhone);
    this.activityProps.screen_evening = eveningPhone;

    const controller = new T.Group();
    this.box(0.35, 0.1, 0.16, 0x694f86, 0, 0, 0, controller);
    this.box(0.07, 0.035, 0.025, 0xd4a4e8, -0.1, 0.06, -0.03, controller);
    this.box(0.035, 0.07, 0.025, 0xd4a4e8, -0.1, 0.06, -0.03, controller);
    this.box(0.035, 0.035, 0.025, 0xf5c980, 0.1, 0.06, -0.03, controller);
    controller.position.set(0, 0.98, 0.31);
    this.person.add(controller);
    this.activityProps.gaming = controller;

    const book = new T.Group();
    this.box(0.42, 0.035, 0.28, 0x9a6b4d, -0.14, 0, 0, book);
    this.box(0.42, 0.035, 0.28, 0x6f8d79, 0.14, 0, 0, book);
    this.box(0.02, 0.02, 0.24, 0xe3d6af, 0, 0.03, 0, book);
    book.position.set(0, 1.02, 0.29);
    book.rotation.x = -0.28;
    this.person.add(book);
    this.activityProps.reading = book;

    const plate = new T.Group();
    const dish = new T.Mesh(
      new T.CylinderGeometry(0.24, 0.2, 0.035, 8),
      new T.MeshLambertMaterial({ color: 0xd7d1ad, flatShading: true }),
    );
    plate.add(dish);
    this.box(0.12, 0.06, 0.12, 0xe9d580, 0, 0.06, 0, plate);
    plate.position.set(0, 0.72, 0.3);
    this.person.add(plate);
    this.activityProps.meal = plate;

    const glass = new T.Group();
    const tumbler = new T.Mesh(
      new T.CylinderGeometry(0.07, 0.09, 0.2, 6),
      new T.MeshLambertMaterial({
        color: 0xec9a83,
        transparent: true,
        opacity: 0.85,
      }),
    );
    glass.add(tumbler);
    glass.position.set(0.2, 1.06, 0.3);
    this.person.add(glass);
    this.activityProps.alcohol = glass;

    const speech = new T.Group();
    const bubble = new T.Mesh(
      new T.IcosahedronGeometry(0.16, 0),
      new T.MeshLambertMaterial({ color: 0xf5c980, flatShading: true }),
    );
    speech.add(bubble);
    speech.position.set(0.42, 1.85, 0.08);
    this.person.add(speech);
    this.activityProps.social = speech;

    const cushion = new T.Group();
    this.box(0.5, 0.12, 0.32, 0x8899c6, 0, 0, 0, cushion);
    cushion.position.set(0, 1.03, 0.19);
    cushion.rotation.z = 0.12;
    this.person.add(cushion);
    this.activityProps.rest = cushion;

    const cigarette = new T.Group();
    const paper = new T.Mesh(
      new T.BoxGeometry(0.035, 0.22, 0.035),
      new T.MeshLambertMaterial({ color: 0xe3ddc5, flatShading: true }),
    );
    paper.rotation.z = -0.9;
    cigarette.add(paper);
    const ember = new T.Mesh(
      new T.BoxGeometry(0.038, 0.045, 0.04),
      new T.MeshLambertMaterial({
        color: 0xb96b48,
        emissive: 0x5b180b,
        flatShading: true,
      }),
    );
    ember.position.y = -0.1;
    cigarette.add(ember);
    cigarette.position.set(-0.14, 1.98, 0.28);
    this.person.add(cigarette);
    this.activityProps.tobacco = cigarette;
    this.addVapor(cigarette, 0xd1d2c0, 0.11);

    const vape = new T.Group();
    this.box(0.08, 0.3, 0.07, 0x648b9b, 0, 0, 0, vape);
    this.box(0.055, 0.07, 0.045, 0xc4e0d8, 0, 0.11, 0.04, vape);
    this.box(0.09, 0.04, 0.075, 0x354955, 0, -0.17, 0, vape);
    vape.position.set(-0.16, 1.98, 0.27);
    this.person.add(vape);
    this.activityProps.vaping = vape;
    this.addVapor(vape, 0xb9dbe0, 0.12);

    const chair = new T.Group();
    this.box(0.76, 0.12, 0.66, 0x8b745b, 0, 0.7, 0, chair);
    for (const x of [-0.29, 0.29])
      for (const z of [-0.23, 0.23])
        this.box(0.08, 0.68, 0.08, 0x665341, x, 0.34, z, chair);
    chair.position.set(-0.45, 0, 0.75);
    this.root.add(chair);
    this.activityProps.sedentary = chair;

    this.setActivityProps("idle");
  }
  private addVapor(parent: T.Group, color: number, height: number) {
    for (let i = 0; i < 3; i++) {
      const puff = new T.Mesh(
        new T.IcosahedronGeometry(0.055 + i * 0.012, 0),
        new T.MeshLambertMaterial({
          color,
          transparent: true,
          opacity: 0.42,
          flatShading: true,
          depthWrite: false,
        }),
      );
      puff.position.set(0.04, height + i * 0.1, 0.01);
      parent.add(puff);
      this.vaporPuffs.push(puff);
    }
  }
  private setActivityProps(mode: string) {
    Object.values(this.activityProps).forEach((prop) => (prop.visible = false));
    const prop = this.activityProps[mode];
    if (prop) prop.visible = true;
  }
  update(o: typeof this.options) {
    if (o.mode !== this.options.mode || o.replayKey !== this.options.replayKey)
      this.modeStartedAt = performance.now();
    this.options = o;
    this.shirt.color.set(o.color);
    this.setActivityProps(o.mode);
    this.artist.setColor(o.color);
    this.artist.play(o.mode, o.replayKey, o.animations);
  }
  async preloadModes(modes: string[]) {
    await this.artist.preload(modes);
  }
  zoomCamera(direction: number) {
    if (this.dead) return;
    this.camera.zoom = T.MathUtils.clamp(
      this.camera.zoom * Math.pow(1.25, direction),
      this.controls.minZoom,
      this.controls.maxZoom,
    );
    this.camera.updateProjectionMatrix();
    this.controls.update();
    this.emitCameraState();
  }
  rotateCamera(horizontal: number, vertical: number) {
    if (this.dead) return;
    const offset = this.camera.position.clone().sub(this.controls.target);
    const spherical = new T.Spherical().setFromVector3(offset);
    spherical.theta += (horizontal * Math.PI) / 12;
    spherical.phi = T.MathUtils.clamp(
      spherical.phi + (vertical * Math.PI) / 12,
      this.controls.minPolarAngle,
      this.controls.maxPolarAngle,
    );
    this.camera.position
      .copy(this.controls.target)
      .add(offset.setFromSpherical(spherical));
    this.controls.update();
  }
  resetCamera() {
    if (this.dead) return;
    this.controls.reset();
    this.emitCameraState();
  }
  private resize() {
    const w = this.host.clientWidth,
      h = this.host.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(Math.round(w * 0.7), Math.round(h * 0.7), false);
    const aspect = w / h;
    this.camera.left = -4.7 * aspect;
    this.camera.right = 4.7 * aspect;
    this.camera.top = 4.7;
    this.camera.bottom = -4.7;
    this.camera.updateProjectionMatrix();
  }
  private tick = (ms: number) => {
    if (this.dead) return;
    this.frame = requestAnimationFrame(this.tick);
    if (ms - this.last < 32 || document.hidden) return;
    const delta = Math.min((ms - this.last) / 1000, 0.1);
    this.last = ms;
    const t = this.options.animations
      ? Math.max(0, (ms - this.modeStartedAt) / 1000)
      : 0;
    const mode = this.options.mode;
    let bodyY = 0.1 + Math.sin(t * 2) * 0.018;
    let bodyZ = 0;
    let bodyRotY = 0.15;
    let armPose = (i: number) => 0.02 * Math.sin(t * 2 + i);
    let armZPose = (_i: number) => 0;
    let legPose = (_i: number) => 0;
    switch (mode) {
      case "walk":
        bodyY = 0.1 + Math.abs(Math.sin(t * 4)) * 0.04;
        armPose = (i) => Math.sin(t * 5 + i * Math.PI) * 0.65;
        legPose = (i) => Math.sin(t * 5 - i * Math.PI) * 0.45;
        break;
      case "exercise":
        bodyY = 0.1 + Math.abs(Math.sin(t * 3)) * 0.12;
        bodyZ = Math.sin(t * 3) * 0.04;
        armPose = (i) => 0.8 + Math.sin(t * 3 + i) * 0.28;
        legPose = (i) => Math.sin(t * 3 + i * Math.PI) * 0.32;
        break;
      case "work":
        bodyY = 0.06 + Math.sin(t * 1.6) * 0.01;
        bodyRotY = -0.3;
        armPose = (i) => 0.72 + Math.sin(t * 8 + i * Math.PI) * 0.14;
        break;
      case "social":
        bodyRotY = 0.3 + Math.sin(t * 1.7) * 0.08;
        armPose = (i) => 0.75 + Math.sin(t * 2.7 + i) * 0.24;
        break;
      case "screen":
        bodyY = 0.07 + Math.sin(t * 1.4) * 0.01;
        bodyRotY = -0.52;
        bodyZ = Math.sin(t * 1.8) * 0.03;
        armPose = (i) => 0.82 + Math.sin(t * 2 + i) * 0.12;
        break;
      case "screen_evening":
        bodyY = -0.02 + Math.sin(t * 0.8) * 0.008;
        bodyRotY = -0.65;
        bodyZ = -0.11 + Math.sin(t * 0.9) * 0.018;
        armPose = (i) => 1.08 + Math.sin(t * 1.1 + i) * 0.05;
        legPose = () => -0.24;
        break;
      case "gaming":
        bodyY = 0.08 + Math.sin(t * 2.2) * 0.025;
        bodyRotY = -0.42;
        armPose = (i) => 0.9 + Math.sin(t * 7 + i * Math.PI) * 0.1;
        legPose = (i) => Math.sin(t * 2 + i) * 0.06;
        break;
      case "reading":
        bodyY = 0.06 + Math.sin(t * 1.2) * 0.008;
        bodyRotY = -0.38;
        bodyZ = -0.04 + Math.sin(t * 1.3) * 0.02;
        armPose = (i) => 0.62 + Math.sin(t * 1.8 + i) * 0.08;
        break;
      case "meal":
        bodyRotY = -0.26;
        armPose = (i) =>
          0.65 + Math.abs(Math.sin(t * 2.2 + i * Math.PI)) * 0.35;
        break;
      case "alcohol":
        bodyRotY = -0.22;
        armPose = (i) =>
          i === 0
            ? 0.45 + Math.abs(Math.sin(t * 1.8)) * 0.85
            : 0.16 + Math.sin(t * 1.6) * 0.08;
        break;
      case "tobacco":
        bodyY = 0.07 + Math.sin(t * 1.1) * 0.012;
        bodyRotY = -0.25;
        bodyZ = Math.sin(t * 2.2) * 0.02;
        armZPose = (i) => (i === 0 ? 2.12 + Math.sin(t * 3.2) * 0.12 : 0);
        armPose = (i) => (i === 0 ? 0.12 + Math.sin(t * 3.2) * 0.08 : 0);
        break;
      case "vaping":
        bodyY = 0.04 + Math.sin(t * 0.7) * 0.02;
        bodyRotY = -0.41;
        bodyZ = -0.035;
        armZPose = (i) => (i === 0 ? 2.35 + Math.sin(t * 0.8) * 0.025 : -0.36);
        armPose = (i) => (i === 0 ? 0.2 : 0.48);
        break;
      case "sedentary":
        bodyY =
          -0.3 + (this.options.animations ? Math.sin(t * 1.2) * 0.008 : 0);
        bodyRotY = -0.34;
        armPose = () => 0.12;
        legPose = () => -0.9;
        break;
      case "rest":
        bodyY = 0.08 + Math.sin(t * 0.9) * 0.012;
        bodyZ = 0.09;
        bodyRotY = -0.34;
        armPose = (i) => 0.08 + Math.sin(t * 1.1 + i) * 0.05;
        break;
      default:
        break;
    }
    this.person.position.y = bodyY;
    this.person.rotation.z = bodyZ;
    this.person.rotation.y = bodyRotY;
    this.arms.forEach((a, i) => {
      a.rotation.x = armPose(i);
      a.rotation.z = armZPose(i);
    });
    this.legs.forEach((a, i) => (a.rotation.x = legPose(i)));
    if (this.options.animations) {
      this.vaporPuffs.forEach((puff, i) => {
        const phase = (t * (i < 3 ? 1.35 : 0.55) + (i % 3) / 3) % 1;
        puff.position.y = (i < 3 ? 0.11 : 0.12) + phase * 0.2;
        puff.position.x = 0.04 + Math.sin(t * 1.2 + i) * 0.035;
        puff.scale.setScalar(0.7 + phase * 0.65);
        const material = puff.material as T.MeshLambertMaterial;
        material.opacity = 0.42 * (1 - phase);
      });
    }
    this.root.rotation.y =
      this.options.jitter && this.options.animations
        ? Math.round(Math.sin(t * 7) * 2) * 0.001
        : 0;
    this.artist.tick(delta);
    this.renderer.render(this.scene, this.camera);
  };
  dispose() {
    this.dead = true;
    this.artist.dispose();
    this.controls.removeEventListener("change", this.emitCameraState);
    this.controls.dispose();
    cancelAnimationFrame(this.frame);
    this.observer.disconnect();
    this.renderer.domElement.removeEventListener(
      "webglcontextlost",
      this.onLost,
    );
    const mats = new Set<T.Material>();
    const geo = new Set<T.BufferGeometry>();
    this.scene.traverse((o) => {
      if (o instanceof T.Mesh) {
        geo.add(o.geometry);
        for (const m of Array.isArray(o.material) ? o.material : [o.material])
          mats.add(m);
      }
    });
    geo.forEach((g) => g.dispose());
    mats.forEach((m) => m.dispose());
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }
}

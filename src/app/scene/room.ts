import * as T from "three";
export class Room {
  private renderer: T.WebGLRenderer;
  private scene = new T.Scene();
  private camera = new T.OrthographicCamera(-5.3, 5.3, 4, -4, 0.1, 80);
  private frame = 0;
  private observer: ResizeObserver;
  private root = new T.Group();
  private person = new T.Group();
  private arms: T.Group[] = [];
  private legs: T.Group[] = [];
  private diamond: T.Mesh;
  private shirt = new T.MeshLambertMaterial({
    color: "#bde883",
    flatShading: true,
  });
  private options = {
    color: "#bde883",
    animations: true,
    jitter: false,
    mode: "idle",
    hidden: false,
  };
  private last = 0;
  private dead = false;
  private onLost = (e: Event) => {
    e.preventDefault();
    cancelAnimationFrame(this.frame);
    this.onFallback();
  };
  constructor(
    private host: HTMLElement,
    private onFallback: () => void,
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
    this.camera.lookAt(0, 1, 0);
    this.scene.add(new T.AmbientLight(0xcbdac5, 2));
    const sun = new T.DirectionalLight(0xffdfac, 3);
    sun.position.set(-3, 8, 5);
    this.scene.add(sun);
    this.scene.add(this.root);
    this.buildRoom();
    this.buildPerson();
    this.diamond = new T.Mesh(
      new T.OctahedronGeometry(0.18, 0),
      new T.MeshLambertMaterial({
        color: 0xc7f480,
        flatShading: true,
        emissive: 0x33551c,
      }),
    );
    this.diamond.position.set(0.4, 3.35, 0.3);
    this.root.add(this.diamond);
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(host);
    this.resize();
    this.tick(0);
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
  update(o: typeof this.options) {
    this.options = o;
    this.shirt.color.set(o.color);
    this.host.style.visibility = o.hidden ? "hidden" : "visible";
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
    if (ms - this.last < 32 || document.hidden || this.options.hidden) return;
    this.last = ms;
    const t = this.options.animations ? ms / 1000 : 0;
    const moving =
      this.options.mode === "walk" || this.options.mode === "exercise";
    this.person.position.y =
      0.1 +
      (this.options.mode === "exercise"
        ? Math.abs(Math.sin(t * 3)) * 0.1
        : Math.sin(t * 2) * 0.018);
    this.person.rotation.z = this.options.mode === "rest" ? 0.07 : 0;
    this.person.rotation.y = this.options.mode === "rest" ? -0.4 : 0.15;
    this.arms.forEach(
      (a, i) =>
        (a.rotation.x = moving
          ? Math.sin(t * 4 + i * Math.PI) * 0.65
          : 0.02 * Math.sin(t * 2 + i)),
    );
    this.legs.forEach(
      (a, i) =>
        (a.rotation.x = moving ? Math.sin(t * 4 - i * Math.PI) * 0.4 : 0),
    );
    this.diamond.rotation.y = t * 0.65;
    this.diamond.position.y = 3.35 + Math.sin(t * 2) * 0.06;
    this.root.rotation.y =
      this.options.jitter && this.options.animations
        ? Math.round(Math.sin(t * 7) * 2) * 0.001
        : 0;
    this.renderer.render(this.scene, this.camera);
  };
  dispose() {
    this.dead = true;
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

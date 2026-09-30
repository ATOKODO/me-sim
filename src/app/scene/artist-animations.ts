import * as T from "three";
import { HABIT_METRICS } from "../core/models";

interface Override {
  file: string;
  clip: string;
}

interface LoadedModel {
  scene: T.Group;
  mixer: T.AnimationMixer;
  clips: T.AnimationClip[];
}

interface LoadedAnimation {
  scene: T.Group;
  mixer: T.AnimationMixer;
  action: T.AnimationAction;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function materialsIn(root: T.Object3D) {
  const materials = new Set<T.Material>();
  root.traverse((object) => {
    if (object instanceof T.Mesh)
      for (const material of Array.isArray(object.material)
        ? object.material
        : [object.material])
        materials.add(material);
  });
  return materials;
}

/** Releases a GLB that finished loading after its room was destroyed. */
function disposeModel(root: T.Object3D) {
  const geometries = new Set<T.BufferGeometry>();
  const skeletons = new Set<T.Skeleton>();
  root.traverse((object) => {
    if (object instanceof T.Mesh) geometries.add(object.geometry);
    if (object instanceof T.SkinnedMesh) skeletons.add(object.skeleton);
  });
  const materials = materialsIn(root);
  const textures = new Set<T.Texture>();
  for (const material of materials)
    for (const value of Object.values(material))
      if (value instanceof T.Texture) textures.add(value);
  skeletons.forEach((skeleton) => skeleton.dispose());
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
  textures.forEach((texture) => {
    texture.dispose();
    if (
      typeof ImageBitmap !== "undefined" &&
      texture.image instanceof ImageBitmap
    )
      texture.image.close();
  });
}

/** Optional, local GLB overrides. Every unprovided habit keeps its procedural animation. */
export class ArtistAnimations {
  private readonly manifestUrl = new URL(
    "avatar/animations.json",
    document.baseURI,
  );
  private readonly anchor = new T.Group();
  private readonly specs: Record<string, Override> = {};
  // One model and mixer per file, even when many habits use its clips.
  private readonly models = new Map<string, LoadedModel>();
  private readonly modelPending = new Map<
    string,
    Promise<LoadedModel | null>
  >();
  private readonly loaded = new Map<string, LoadedAnimation>();
  private readonly pending = new Map<string, Promise<void>>();
  private readonly failed = new Set<string>();
  private readonly ready: Promise<void>;
  private active: LoadedAnimation | null = null;
  private mode = "idle";
  private replayKey = 0;
  private animate = true;
  private color = "#bde883";
  private disposed = false;

  constructor(
    root: T.Group,
    private readonly onActiveChange: (active: boolean) => void,
  ) {
    // The model origin is at the avatar's feet; the room remains procedural.
    this.anchor.position.set(-0.45, 0.1, 0.75);
    root.add(this.anchor);
    this.ready = this.readManifest();
  }

  async preload(modes: string[]) {
    await this.ready;
    if (this.disposed) return;
    await Promise.all(modes.map((mode) => this.load(mode)));
  }

  setColor(color: string) {
    this.color = color;
    for (const asset of this.models.values()) this.colorShirt(asset.scene);
  }

  play(mode: string, replayKey: number, animate: boolean) {
    const changed = mode !== this.mode || replayKey !== this.replayKey;
    this.mode = mode;
    this.replayKey = replayKey;
    this.animate = animate;
    const asset = this.loaded.get(mode);
    if (asset) {
      this.activate(asset, changed || this.active !== asset);
      return;
    }
    this.useProcedural();
    if (this.specs[mode])
      void this.load(mode).then(() => {
        if (
          !this.disposed &&
          this.mode === mode &&
          this.replayKey === replayKey
        ) {
          const loaded = this.loaded.get(mode);
          if (loaded) this.activate(loaded, true);
        }
      });
  }

  tick(seconds: number) {
    if (!this.active) return;
    this.active.action.paused = !this.animate;
    if (this.animate) this.active.mixer.update(seconds);
  }

  dispose() {
    this.disposed = true;
    for (const asset of this.models.values()) {
      asset.mixer.stopAllAction();
      asset.mixer.uncacheRoot(asset.scene);
      asset.scene.removeFromParent();
      disposeModel(asset.scene);
    }
    this.active = null;
    this.models.clear();
    this.loaded.clear();
    this.anchor.removeFromParent();
  }

  private async readManifest() {
    try {
      const response = await fetch(this.manifestUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const manifest: unknown = await response.json();
      if (
        !isRecord(manifest) ||
        manifest.version !== 1 ||
        !isRecord(manifest.overrides)
      )
        throw new Error("Format de manifeste invalide.");
      const modes = new Set([
        "idle",
        ...HABIT_METRICS.map((metric) => metric.id),
      ]);
      for (const [mode, value] of Object.entries(manifest.overrides)) {
        if (
          !modes.has(mode) ||
          !isRecord(value) ||
          typeof value.file !== "string" ||
          !/^(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+\.glb$/.test(value.file) ||
          typeof value.clip !== "string" ||
          !value.clip.trim() ||
          value.clip.length > 100
        ) {
          console.warn(
            `Animation 3D ignorée pour « ${mode} » : entrée invalide.`,
          );
          continue;
        }
        this.specs[mode] = { file: value.file, clip: value.clip };
      }
      if (!this.disposed) this.play(this.mode, this.replayKey, this.animate);
    } catch (error) {
      if (!this.disposed)
        console.warn("Animations 3D d’artiste indisponibles.", error);
    }
  }

  private load(mode: string): Promise<void> {
    const spec = this.specs[mode];
    if (
      this.disposed ||
      !spec ||
      this.loaded.has(mode) ||
      this.failed.has(mode)
    )
      return Promise.resolve();
    const existing = this.pending.get(mode);
    if (existing) return existing;
    const task = (async () => {
      try {
        const model = await this.loadModel(spec.file);
        if (!model || this.disposed) return;
        const clip = model.clips.find(
          (animation) =>
            animation.name === spec.clip &&
            animation.duration > 0 &&
            animation.tracks.length > 0,
        );
        if (!clip)
          throw new Error(`Clip « ${spec.clip} » introuvable ou vide.`);
        this.loaded.set(mode, {
          scene: model.scene,
          mixer: model.mixer,
          action: model.mixer.clipAction(clip),
        });
      } catch (error) {
        this.failed.add(mode);
        console.warn(`Animation 3D « ${mode} » indisponible.`, error);
      }
    })();
    this.pending.set(mode, task);
    void task.finally(() => this.pending.delete(mode));
    return task;
  }

  private loadModel(file: string): Promise<LoadedModel | null> {
    if (this.disposed) return Promise.resolve(null);
    const loaded = this.models.get(file);
    if (loaded) return Promise.resolve(loaded);
    const existing = this.modelPending.get(file);
    if (existing) return existing;
    const task = (async () => {
      const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");
      if (this.disposed) return null;
      const gltf = await new GLTFLoader().loadAsync(
        new URL(file, this.manifestUrl).href,
      );
      if (this.disposed) {
        disposeModel(gltf.scene);
        return null;
      }
      let hasMesh = false;
      gltf.scene.traverse((object) => {
        if (object instanceof T.Mesh) hasMesh = true;
      });
      if (!hasMesh) {
        disposeModel(gltf.scene);
        throw new Error("Modèle sans géométrie.");
      }
      for (const material of materialsIn(gltf.scene))
        for (const value of Object.values(material))
          if (value instanceof T.Texture) {
            value.magFilter = T.NearestFilter;
            value.minFilter = T.NearestFilter;
            value.needsUpdate = true;
          }
      gltf.scene.visible = false;
      this.anchor.add(gltf.scene);
      this.colorShirt(gltf.scene);
      const model = {
        scene: gltf.scene,
        mixer: new T.AnimationMixer(gltf.scene),
        clips: gltf.animations,
      };
      this.models.set(file, model);
      return model;
    })();
    this.modelPending.set(file, task);
    // Both handlers consume rejection; cleanup must not create an unhandled promise.
    void task.then(
      () => this.modelPending.delete(file),
      () => this.modelPending.delete(file),
    );
    return task;
  }

  private activate(asset: LoadedAnimation, restart: boolean) {
    if (this.active && this.active !== asset) {
      this.active.scene.visible = false;
      this.active.action.stop();
    }
    this.active = asset;
    asset.scene.visible = true;
    if (restart) {
      asset.action.reset();
      asset.action.setLoop(T.LoopRepeat, Infinity).play();
      asset.mixer.update(0);
    }
    asset.action.paused = !this.animate;
    this.onActiveChange(true);
  }

  private useProcedural() {
    if (this.active) {
      this.active.scene.visible = false;
      this.active.action.stop();
      this.active = null;
    }
    this.onActiveChange(false);
  }

  private colorShirt(scene: T.Object3D) {
    for (const material of materialsIn(scene))
      if (
        material.name === "AvatarShirt" &&
        (material instanceof T.MeshStandardMaterial ||
          material instanceof T.MeshBasicMaterial ||
          material instanceof T.MeshLambertMaterial ||
          material instanceof T.MeshPhongMaterial)
      )
        material.color.set(this.color);
  }
}

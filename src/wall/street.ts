import * as THREE from "three";
import { hands, type HandName } from "@/look/handPaint";
import { makeBrick, TILE_M } from "./brick";
import { WallPaint } from "./paint";
import { makePoster, type PosterLook } from "./poster";

/**
 * The wall as a night street (Tom picked A 11-14): a long brick wall along a pavement, street
 * lamps along the kerb, fog down the street. The visitor arrives on a poster of the page they left
 * and the camera pulls back until it is one poster on the wall; then they walk along it. Lamps come
 * on as they near them, and each tag writes itself again when it comes into the light.
 * Units are metres: x along the wall, y up, z out into the street. The wall's face is z = 0.
 */

export interface StreetLook extends PosterLook {
  night: string;
  lamp: string;
  moon: string;
  brick: string;
  mortar: string;
  pavement: string;
  iron: string;
  bone: string;
  pullback: number;
  lampOn: number;
}

export interface StreetState {
  /** Where along the wall the visitor stands, in metres. */
  at: number;
  /** How far the walk goes. */
  end: number;
  lit: number;
  written: number;
  tags: number;
  /** The pull-back is over and the visitor can walk. */
  walking: boolean;
}

const WALL = { from: -8, to: 40, height: 4.5 };
const WALK = { from: 0, to: 30 };
/** A lamp over the poster, one over each of Tom's pieces, then every 6.5 m. */
const LAMPS = [0.6, 5.1, 11.6, 18.1, 24.6, 31.1];
const KERB = 3.2; // where the pavement meets the road
const POSTER = { x: 0, y: 1.7, h: 1 };

/** Tom's own pieces, the first on the wall (more come with the visitors' tags). */
const TAGS: { name: HandName; x: number; y: number; w: number; ink: "spray" | "bone" }[] = [
  { name: "tlxq", x: 4.7, y: 1.3, w: 2.5, ink: "spray" },
  { name: "signature", x: 11.2, y: 1.55, w: 1.6, ink: "bone" },
];

interface Tag {
  paint: WallPaint;
  tex: THREE.CanvasTexture;
  x: number;
  since: number;
  done: boolean;
}

const smooth = (x: number) => x * x * (3 - 2 * x);
const inOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);

export class Street {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(40, 1, 0.05, 80);
  private readonly lamps: {
    x: number;
    light: THREE.SpotLight;
    bulb: THREE.MeshBasicMaterial;
    since: number;
  }[] = [];
  private readonly tags: Tag[] = [];
  private readonly normal: THREE.Texture;
  private posterMat: THREE.MeshStandardMaterial | null = null;
  private aspect = 1;
  private at = WALK.from;
  private goal = WALK.from;
  /** When the pull-back started; null before the page asks for it. */
  private pulled: number | null = null;
  private frame = 0;
  private awakeUntil = 0;
  private stopped = false;
  private lastState = "";

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly look: StreetLook,
    private readonly still: boolean,
    private readonly onState: (s: StreetState) => void,
  ) {
    THREE.ColorManagement.enabled = true;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1;
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));

    const night = new THREE.Color(look.night);
    this.scene.background = night;
    this.scene.fog = new THREE.Fog(night, 7, 24);
    this.scene.add(
      new THREE.HemisphereLight(new THREE.Color(look.moon), new THREE.Color(look.night), 1.5),
    );

    // The brick, drawn once, repeating along the wall.
    const brick = makeBrick(look.brick, look.mortar);
    const colour = new THREE.CanvasTexture(brick.colour);
    colour.colorSpace = THREE.SRGBColorSpace;
    this.normal = new THREE.CanvasTexture(brick.normal);
    for (const t of [colour, this.normal]) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    }
    this.buildWall(colour);
    this.buildStreet();
    this.buildLamps();
    this.buildThings();
    for (const t of TAGS) this.addTag(t);
    this.resize();
  }

  /** The brick's relief for a patch of wall, so paint and paper on it sit in the same bumps. */
  private reliefAt(x0: number, y0: number, w: number, h: number): THREE.Texture {
    const t = this.normal.clone();
    t.repeat.set(w / TILE_M.w, h / TILE_M.h);
    t.offset.set((x0 - WALL.from) / TILE_M.w, y0 / TILE_M.h);
    t.needsUpdate = true;
    return t;
  }

  private onWall(mat: THREE.Material, x: number, y: number, w: number, h: number, lift: number) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    m.position.set(x, y, lift);
    this.scene.add(m);
    return m;
  }

  private buildWall(colour: THREE.Texture) {
    const len = WALL.to - WALL.from;
    const geo = new THREE.PlaneGeometry(len, WALL.height, 1, 24);
    // Soot and splash low on the wall, darkest at the pavement.
    const pos = geo.getAttribute("position");
    const tint = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i) + WALL.height / 2;
      const k = 1 - 0.5 * Math.max(0, 1 - y / 1.3) ** 1.5;
      tint.set([k, k, k], i * 3);
    }
    geo.setAttribute("color", new THREE.BufferAttribute(tint, 3));
    colour.repeat.set(len / TILE_M.w, WALL.height / TILE_M.h);
    const relief = this.normal.clone();
    relief.repeat.copy(colour.repeat);
    relief.needsUpdate = true;
    const wall = new THREE.Mesh(
      geo,
      new THREE.MeshStandardMaterial({
        map: colour,
        normalMap: relief,
        normalScale: new THREE.Vector2(1.1, 1.1),
        roughness: 0.93,
        vertexColors: true,
      }),
    );
    wall.position.set((WALL.from + WALL.to) / 2, WALL.height / 2, 0);
    this.scene.add(wall);
    // A coping along the top.
    const top = new THREE.Mesh(
      new THREE.BoxGeometry(len, 0.12, 0.3),
      new THREE.MeshStandardMaterial({ color: new THREE.Color(this.look.mortar), roughness: 0.9 }),
    );
    top.position.set(wall.position.x, WALL.height + 0.06, 0.08);
    this.scene.add(top);
  }

  private buildStreet() {
    const pave = new THREE.Color(this.look.pavement);
    const walk = new THREE.Mesh(
      new THREE.PlaneGeometry(WALL.to - WALL.from + 20, KERB),
      new THREE.MeshStandardMaterial({ color: pave, roughness: 0.62, metalness: 0.05 }),
    );
    walk.rotation.x = -Math.PI / 2;
    walk.position.set((WALL.from + WALL.to) / 2, 0, KERB / 2);
    this.scene.add(walk);
    const road = new THREE.Mesh(
      new THREE.PlaneGeometry(WALL.to - WALL.from + 40, 14),
      new THREE.MeshStandardMaterial({
        color: pave.clone().multiplyScalar(0.55),
        roughness: 0.4,
        metalness: 0.1,
      }),
    );
    road.rotation.x = -Math.PI / 2;
    road.position.set((WALL.from + WALL.to) / 2, -0.14, KERB + 7);
    this.scene.add(road);
    const kerb = new THREE.Mesh(
      new THREE.BoxGeometry(WALL.to - WALL.from + 20, 0.16, 0.28),
      new THREE.MeshStandardMaterial({ color: pave.clone().multiplyScalar(1.6), roughness: 0.85 }),
    );
    kerb.position.set((WALL.from + WALL.to) / 2, -0.06, KERB);
    this.scene.add(kerb);
  }

  /** Lamps on brackets high on the wall: they light it from above, so every brick casts relief,
   * and nothing stands between the visitor and the wall. */
  private buildLamps() {
    const iron = new THREE.MeshStandardMaterial({
      color: new THREE.Color(this.look.iron),
      roughness: 0.45,
      metalness: 0.6,
    });
    const armGeo = new THREE.BoxGeometry(0.05, 0.05, 1.0);
    const plateGeo = new THREE.BoxGeometry(0.16, 0.24, 0.03);
    const shadeGeo = new THREE.ConeGeometry(0.2, 0.18, 18, 1, true);
    const bulbGeo = new THREE.SphereGeometry(0.06, 12, 8);
    const Y = 3.75;
    const OUT = 1.0;
    for (const x of LAMPS) {
      const plate = new THREE.Mesh(plateGeo, iron);
      plate.position.set(x, Y, 0.015);
      const arm = new THREE.Mesh(armGeo, iron);
      arm.position.set(x, Y, OUT / 2);
      const shade = new THREE.Mesh(shadeGeo, iron);
      shade.position.set(x, Y - 0.05, OUT);
      const bulb = new THREE.MeshBasicMaterial({ color: new THREE.Color(this.look.iron) });
      const glow = new THREE.Mesh(bulbGeo, bulb);
      glow.position.set(x, Y - 0.14, OUT);
      const light = new THREE.SpotLight(new THREE.Color(this.look.lamp), 0, 14, 0.9, 0.7, 2);
      light.position.set(x, Y - 0.16, OUT);
      light.target.position.set(x, 0.7, 0);
      this.scene.add(plate, arm, shade, glow, light, light.target);
      this.lamps.push({ x, light, bulb, since: -1 });
    }
  }

  /** What makes it a real street wall: downpipes, a door, old paint rolled over in grey. */
  private buildThings() {
    const iron = new THREE.MeshStandardMaterial({
      color: new THREE.Color(this.look.iron),
      roughness: 0.5,
      metalness: 0.5,
    });
    for (const x of [8.0, 21.2, 33]) {
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, WALL.height, 10), iron);
      pipe.position.set(x, WALL.height / 2, 0.09);
      this.scene.add(pipe);
    }
    const door = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 2.2, 0.06),
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(this.look.iron),
        roughness: 0.6,
        metalness: 0.4,
      }),
    );
    door.position.set(16.2, 1.1, 0.02);
    this.scene.add(door);
    // Old pieces painted over: flat grey patches that still carry the brick's bumps.
    const grey = new THREE.Color(this.look.mortar);
    for (const [x, y, w, h, k] of [
      [13.4, 1.0, 1.9, 1.1, 0.75],
      [19.2, 1.4, 2.6, 1.4, 0.65],
      [25.5, 0.9, 1.6, 0.9, 0.8],
      [27.4, 1.9, 2.2, 1.2, 0.7],
    ] as const) {
      const mat = new THREE.MeshStandardMaterial({
        color: grey.clone().multiplyScalar(k),
        normalMap: this.reliefAt(x - w / 2, y - h / 2, w, h),
        roughness: 0.85,
        polygonOffset: true,
        polygonOffsetFactor: -1,
      });
      this.onWall(mat, x, y, w, h, 0.002);
    }
  }

  private addTag(t: (typeof TAGS)[number]) {
    const ink = t.ink === "spray" ? this.look.spray : this.look.bone;
    const paint = new WallPaint(hands[t.name], ink, t.w, 520);
    const tex = new THREE.CanvasTexture(paint.canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    const { w, h } = paint.size;
    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      transparent: true,
      depthWrite: false,
      normalMap: this.reliefAt(t.x - w / 2, t.y - h / 2, w, h),
      roughness: 0.6,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    });
    this.onWall(mat, t.x, t.y, w, h, 0.004);
    const tag: Tag = { paint, tex, x: t.x, since: -1, done: false };
    if (this.still) this.finish(tag);
    else paint.draw(0);
    this.tags.push(tag);
  }

  private finish(tag: Tag) {
    tag.paint.draw(Infinity);
    tag.tex.needsUpdate = true;
    tag.done = true;
  }

  /** The page the visitor left, as a poster: made once the faces have loaded. */
  setPoster(): void {
    const ratio = Math.min(2.2, Math.max(0.45, this.aspect));
    const cv = makePoster(ratio, this.look);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    const w = POSTER.h * ratio;
    this.posterMat = new THREE.MeshStandardMaterial({
      map: tex,
      normalMap: this.reliefAt(POSTER.x - w / 2, POSTER.y - POSTER.h / 2, w, POSTER.h),
      normalScale: new THREE.Vector2(0.18, 0.18),
      roughness: 0.85,
      // Glows a little, so the visitor's first frame is the page as they saw it.
      emissive: new THREE.Color(0xffffff),
      emissiveMap: tex,
      emissiveIntensity: 1,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    });
    this.onWall(this.posterMat, POSTER.x, POSTER.y, w, POSTER.h, 0.004);
    this.wake(400);
  }

  /** Where the camera stands to walk at `s`, and what it looks at. */
  private walkPose(s: number) {
    const tall = this.aspect < 1;
    return tall
      ? {
          pos: new THREE.Vector3(s - 0.7, 1.6, 4.4),
          look: new THREE.Vector3(s + 0.5, 1.4, 0),
          fov: 62,
        }
      : {
          pos: new THREE.Vector3(s - 2.9, 1.55, 3.8),
          look: new THREE.Vector3(s + 1.2, 1.25, 0),
          fov: 42,
        };
  }

  /** Straight in front of the poster, close enough that it fills the screen. */
  private posterPose() {
    const { fov } = this.walkPose(0);
    const d = (POSTER.h / 2 / Math.tan(((fov / 2) * Math.PI) / 180)) * 0.985;
    return {
      pos: new THREE.Vector3(POSTER.x, POSTER.y, d),
      look: new THREE.Vector3(POSTER.x, POSTER.y, 0),
      fov,
    };
  }

  /** Starts the pull-back from the poster (straight to the street when motion is reduced). */
  pullBack(): void {
    this.pulled = this.still ? -Infinity : performance.now();
    this.wake(this.look.pullback + 400);
  }

  /** Walks by `metres` (forward is positive). */
  walk(metres: number): void {
    if (!this.walking()) return;
    this.goal = Math.min(WALK.to, Math.max(WALK.from, this.goal + metres));
    if (this.still) this.at = this.goal;
    this.wake(1200);
  }

  walkTo(s: number): void {
    this.walk(s - this.goal);
  }

  private walking(): boolean {
    return this.pulled !== null && performance.now() - this.pulled >= this.look.pullback;
  }

  resize(): void {
    const w = this.canvas.clientWidth || 1;
    const h = this.canvas.clientHeight || 1;
    this.aspect = w / h;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = this.aspect;
    this.wake(200);
  }

  private wake(ms: number) {
    this.awakeUntil = Math.max(this.awakeUntil, performance.now() + ms);
    if (!this.frame && !this.stopped) this.frame = requestAnimationFrame(this.tick);
  }

  private tick = (now: number) => {
    this.frame = 0;
    if (this.stopped) return;
    let busy = false;

    // The camera: on the poster, pulling back, or walking.
    const pull = this.pulled === null ? 0 : Math.min(1, (now - this.pulled) / this.look.pullback);
    if (this.walking()) {
      const step = this.goal - this.at;
      this.at += step * Math.min(1, 0.12);
      if (Math.abs(step) < 0.002) this.at = this.goal;
      else busy = true;
    }
    const from = this.posterPose();
    const to = this.walkPose(this.at);
    const e = inOut(pull);
    const pos = from.pos.clone().lerp(to.pos, e);
    // The camera rises slightly on the way out, as a step back would.
    pos.y += Math.sin(e * Math.PI) * 0.25;
    const look = from.look.clone().lerp(to.look, smooth(e));
    this.camera.fov = from.fov + (to.fov - from.fov) * e;
    this.camera.position.copy(pos);
    this.camera.lookAt(look);
    this.camera.updateProjectionMatrix();
    if (pull > 0 && pull < 1) busy = true;
    // The poster stops glowing as it becomes paper on the wall.
    if (this.posterMat)
      this.posterMat.emissiveIntensity = 0.85 * (1 - smooth(Math.min(1, pull * 1.6))) + 0.04;

    // Lamps come on as the visitor nears them, with a flicker, and stay on.
    let lit = 0;
    for (const l of this.lamps) {
      if (l.since < 0 && (l.x === LAMPS[0] || (this.walking() && l.x < this.at + 9))) l.since = now;
      if (l.since < 0) continue;
      lit++;
      const t = this.still ? 1 : Math.min(1, (now - l.since) / this.look.lampOn);
      const flick = t < 0.55 ? [0.2, 0, 0.7, 0.1, 0.9, 0.3][Math.floor(t * 11)]! : t;
      const k = t >= 1 ? 1 : flick;
      l.light.intensity = 24 * k;
      l.bulb.color.set(this.look.iron).lerp(new THREE.Color(this.look.lamp), k);
      if (t < 1) busy = true;
    }

    // A tag in the light writes itself again, once.
    let written = 0;
    for (const tag of this.tags) {
      // Starts when the tag reaches the middle of the view, under its lamp.
      const centre = this.at + (this.aspect < 1 ? 0.5 : 1.2);
      if (!tag.done && tag.since < 0 && this.walking() && Math.abs(tag.x - centre) < 1.6)
        tag.since = now;
      if (!tag.done && tag.since >= 0) {
        const t = now - tag.since;
        if (t >= tag.paint.lasts) this.finish(tag);
        else {
          tag.paint.draw(t);
          tag.tex.needsUpdate = true;
          busy = true;
        }
      }
      if (tag.done) written++;
    }

    this.renderer.render(this.scene, this.camera);
    const state: StreetState = {
      at: Math.round(this.at * 10) / 10,
      end: WALK.to,
      lit,
      written,
      tags: this.tags.length,
      walking: this.walking(),
    };
    const key = JSON.stringify(state);
    if (key !== this.lastState) {
      this.lastState = key;
      this.onState(state);
    }
    if (busy || now < this.awakeUntil) this.frame = requestAnimationFrame(this.tick);
  };

  dispose(): void {
    this.stopped = true;
    cancelAnimationFrame(this.frame);
    this.scene.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of mats) {
          for (const v of Object.values(m)) if (v instanceof THREE.Texture) v.dispose();
          m.dispose();
        }
      }
    });
    this.renderer.dispose();
  }
}

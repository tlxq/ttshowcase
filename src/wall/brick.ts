/**
 * The wall's brick, drawn by code once when the page opens: a colour picture and a normal map (which
 * way each spot of the surface faces), so the lamps light every brick and mortar line in relief.
 * One tile, 2.25 x 1.5 m, repeats along the wall without a seam: the bricks and every noise below
 * repeat on the tile's own size.
 */

/** Pixels per millimetre of wall. Picked so a brick (215 x 65 mm, 10 mm joints) is whole pixels. */
const PX = 0.48;
/** One brick with its joint, in pixels: 225 x 75 mm. */
const PITCH_X = 108;
const PITCH_Y = 36;
const JOINT = 5;
/** Bricks across and courses up one tile. */
const ACROSS = 10;
const UP = 20;
const TILE_W = ACROSS * PITCH_X; // 1080 px = 2.25 m
const TILE_H = UP * PITCH_Y; // 720 px = 1.5 m
/** The tile's size on the wall, in metres. */
export const TILE_M = { w: TILE_W / PX / 1000, h: TILE_H / PX / 1000 };

/** The same number for the same whole-number place, every time. */
function hash(x: number, y: number, k: number): number {
  let h = (x * 374761393 + y * 668265263 + k * 2246822519) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

/** Smooth noise with cells `cell` pixels big, repeating on the tile. */
function noise(x: number, y: number, cell: number, k: number): number {
  const nx = TILE_W / cell;
  const ny = TILE_H / cell;
  const fx = x / cell;
  const fy = y / cell;
  const xi = Math.floor(fx);
  const yi = Math.floor(fy);
  const u = fx - xi;
  const v = fy - yi;
  const s = (t: number) => t * t * (3 - 2 * t);
  const wrap = (n: number, m: number) => ((n % m) + m) % m;
  const a = hash(wrap(xi, nx), wrap(yi, ny), k);
  const b = hash(wrap(xi + 1, nx), wrap(yi, ny), k);
  const c = hash(wrap(xi, nx), wrap(yi + 1, ny), k);
  const d = hash(wrap(xi + 1, nx), wrap(yi + 1, ny), k);
  const su = s(u);
  const sv = s(v);
  return a + (b - a) * su + (c - a) * sv + (a - b - c + d) * su * sv;
}

/** Bumpy at several sizes at once; the cell sizes all divide the tile, so it repeats. */
const rough = (x: number, y: number) =>
  noise(x, y, 45, 1) * 0.5 +
  noise(x, y, 18, 2) * 0.25 +
  noise(x, y, 9, 3) * 0.15 +
  noise(x, y, 4, 4) * 0.1;

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

interface Brick {
  colour: HTMLCanvasElement;
  normal: HTMLCanvasElement;
}

/** Draws the tile in the brick and mortar colours given (tokens --wall-brick, --wall-mortar). */
export function makeBrick(brickHex: string, mortarHex: string): Brick {
  const [br, bg, bb] = rgb(brickHex);
  const [mr, mg, mb] = rgb(mortarHex);
  const height = new Float32Array(TILE_W * TILE_H);
  const colourCv = document.createElement("canvas");
  colourCv.width = TILE_W;
  colourCv.height = TILE_H;
  const cg = colourCv.getContext("2d")!;
  const img = cg.createImageData(TILE_W, TILE_H);
  const px = img.data;

  for (let y = 0; y < TILE_H; y++) {
    const row = Math.floor(y / PITCH_Y);
    const inY = y - row * PITCH_Y;
    const shift = (row % 2) * (PITCH_X / 2);
    for (let x = 0; x < TILE_W; x++) {
      const xs = x + shift;
      const col = Math.floor(xs / PITCH_X) % ACROSS;
      const inX = xs - Math.floor(xs / PITCH_X) * PITCH_X;
      const i = y * TILE_W + x;
      const n = rough(x, y);
      let h: number;
      let r: number;
      let g: number;
      let b: number;
      if (inX >= JOINT && inY >= JOINT) {
        // A brick: chipped, rounded edges, its own shade; a few burnt dark or pale ones.
        const ex = Math.min(inX - JOINT, PITCH_X - inX);
        const ey = Math.min(inY - JOINT, PITCH_Y - inY);
        const edge = Math.min(1, Math.min(ex, ey) / 4 + 0.2 * (n - 0.5));
        const shade = hash(col, row, 7);
        const odd = hash(col, row, 8);
        const lift = 0.78 + shade * 0.4 + (odd < 0.07 ? -0.32 : 0) + 0.28 * (n - 0.5);
        h = 0.55 + 0.35 * Math.sqrt(Math.max(0, edge)) + 0.2 * (n - 0.5);
        r = br * lift;
        g = bg * lift * (0.9 + hash(col, row, 9) * 0.2);
        b = bb * lift;
        if (odd > 0.93) {
          r += 30;
          g += 30;
          b += 28;
        }
      } else {
        // The joint: sunk back, sandy.
        h = 0.1 + 0.12 * n;
        const lift = 0.7 + 0.5 * n;
        r = mr * lift;
        g = mg * lift;
        b = mb * lift;
      }
      // Salt bloom in patches, pale and powdery.
      const salt = Math.max(0, noise(x, y, 120, 5) - 0.66) * 2.4 * noise(x, y, 4, 6);
      r += salt * 110;
      g += salt * 108;
      b += salt * 104;
      px[i * 4] = r;
      px[i * 4 + 1] = g;
      px[i * 4 + 2] = b;
      px[i * 4 + 3] = 255;
      height[i] = h;
    }
  }
  cg.putImageData(img, 0, 0);

  // Which way the surface faces at each pixel, from how the height changes round it (Sobel).
  const normalCv = document.createElement("canvas");
  normalCv.width = TILE_W;
  normalCv.height = TILE_H;
  const ng = normalCv.getContext("2d")!;
  const nimg = ng.createImageData(TILE_W, TILE_H);
  const nd = nimg.data;
  const at = (x: number, y: number) =>
    height[((y + TILE_H) % TILE_H) * TILE_W + ((x + TILE_W) % TILE_W)]!;
  const STRENGTH = 2.4;
  for (let y = 0; y < TILE_H; y++) {
    for (let x = 0; x < TILE_W; x++) {
      const dx =
        at(x + 1, y - 1) +
        2 * at(x + 1, y) +
        at(x + 1, y + 1) -
        (at(x - 1, y - 1) + 2 * at(x - 1, y) + at(x - 1, y + 1));
      const dy =
        at(x - 1, y + 1) +
        2 * at(x, y + 1) +
        at(x + 1, y + 1) -
        (at(x - 1, y - 1) + 2 * at(x, y - 1) + at(x + 1, y - 1));
      let nx = -dx * STRENGTH;
      let ny = dy * STRENGTH;
      let nz = 1;
      const l = Math.hypot(nx, ny, nz);
      nx /= l;
      ny /= l;
      nz /= l;
      const i = (y * TILE_W + x) * 4;
      nd[i] = (nx * 0.5 + 0.5) * 255;
      nd[i + 1] = (ny * 0.5 + 0.5) * 255;
      nd[i + 2] = (nz * 0.5 + 0.5) * 255;
      nd[i + 3] = 255;
    }
  }
  ng.putImageData(nimg, 0, 0);
  return { colour: colourCv, normal: normalCv };
}

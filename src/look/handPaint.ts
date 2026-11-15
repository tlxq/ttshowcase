import notFound from "@/content/hand/404.json";
import icon from "@/content/hand/icon.json";
import circle from "@/content/hand/circle.json";
import hi from "@/content/hand/hi-i-m-tom.json";
import tools from "@/content/hand/my-daily-tools.json";
import running from "@/content/hand/still-running.json";
import tlxq from "@/content/hand/tlxq.json";
import tryIt from "@/content/hand/try-it.json";
import askMe from "@/content/hand/ask-me.json";
import signature from "@/content/hand/signature.json";
import wip from "@/content/hand/work-in-progress.json";
import server from "@/content/hand/my-own-server.json";
import pens from "@/content/pens.json";
import type { Point } from "@/scene/math";

/**
 * Tom's own handwriting (written with the S Pen 11-13, src/content/hand/) as paint: each stroke
 * the mark of the pen he picked, revealed along its own path at the speed his pen moved. The pens
 * and the smoothing are src/content/pens.json, the same file the writing page draws with, so the
 * site shows what Tom saw while writing. Worked out once, at build time.
 */

/** Every hand-written piece on the new look, by name. */
const HANDS = {
  tlxq,
  hi,
  tools,
  running,
  circle,
  tryIt,
  server,
  wip,
  askMe,
  signature,
  notFound,
  icon,
} as const;
export type HandName = keyof typeof HANDS;

type PenName = keyof typeof pens.pens;
/** Room round the strokes so the felt's long side and the drips are not cut off. */
const PAD = 90;
/** Points closer than this (in the writing's units, cap height 1000) add nothing you can see. */
const FINE = 6;
/** How many steps the time-to-length curve of each stroke is told in (CSS linear()). */
const STEPS = 40;

interface Sample {
  at: Point;
  ms: number;
  pressure: number;
}

const r0 = (n: number) => n.toFixed(0);

/**
 * Points as SVG path data, short: each shape starts where the last one started (m) and every
 * corner is a step from the one before (l), rounded to 1 / scale of a unit. The page carries
 * every corner twice (the drawn page and its data for the browser), so short matters.
 */
function pathOf(shapes: Point[][], { scale = 1, closed = true } = {}): string {
  const num = (n: number) => {
    const t = n / scale;
    return `${t >= 0 ? " " : ""}${t}`;
  };
  let out = "";
  let [sx, sy] = [0, 0];
  shapes.forEach((shape, k) => {
    let [px, py] = [sx, sy];
    shape.forEach(([x, y], i) => {
      const [ix, iy] = [Math.round(x * scale), Math.round(y * scale)];
      const step = `${num(ix - px)}${num(iy - py)}`;
      out += i ? (i === 1 ? `l${step}` : step) : k ? `m${step}` : `M${step}`;
      [px, py] = [ix, iy];
      if (!i) [sx, sy] = [ix, iy];
    });
    if (closed) out += "z";
  });
  return out.replace(/([Mml]) /g, "$1");
}

/** The stroke with the hand's wobble taken out, as on the writing page (tools/write, steady()):
 * each point moved to the weighted middle of the points around it along the line. */
function steady(stroke: Sample[], units: number): Sample[] {
  const reach = units * pens.steady;
  const along = lengthsOf(stroke.map((s) => s.at));
  const total = along[along.length - 1] ?? 0;
  return stroke.map((pt, i) => {
    const r = Math.min(reach, along[i]!, total - along[i]!);
    if (r < 0.5) return pt;
    let x = 0;
    let y = 0;
    let w = 0;
    for (let j = 0; j < stroke.length; j++) {
      const d = Math.abs(along[j]! - along[i]!);
      if (d > r) continue;
      const k = Math.exp(-((d / r) ** 2) * 2);
      x += stroke[j]!.at[0] * k;
      y += stroke[j]!.at[1] * k;
      w += k;
    }
    return { ...pt, at: [x / w, y / w] };
  });
}

/** The felt block's corners round a point, as on the writing page (blockSweep()). */
function block(at: Point, pressure: number, pen: { length: number; depth: number }, units: number) {
  const rad = (pens.angle * Math.PI) / 180;
  const [ux, uy] = [Math.cos(rad), Math.sin(rad)];
  const [vx, vy] = [-uy, ux];
  const half = (units * pen.length * (0.9 + 0.2 * pressure)) / 2;
  const deep = half * pen.depth;
  const [x, y] = at;
  return [
    [x - ux * half - vx * deep, y - uy * half - vy * deep],
    [x + ux * half - vx * deep, y + uy * half - vy * deep],
    [x + ux * half + vx * deep, y + uy * half + vy * deep],
    [x - ux * half + vx * deep, y - uy * half + vy * deep],
  ] as Point[];
}

/** The smallest convex shape round the points, all turning the same way, so the pieces of a
 * stroke fill as one shape. */
function hull(points: Point[]): Point[] {
  const p = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: Point, a: Point, b: Point) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const side = (list: Point[]) => {
    const out: Point[] = [];
    for (const q of list) {
      while (out.length >= 2 && cross(out[out.length - 2]!, out[out.length - 1]!, q) <= 0)
        out.pop();
      out.push(q);
    }
    out.pop();
    return out;
  };
  return [...side(p), ...side([...p].reverse())];
}

/** The mark the felt block leaves along the stroke: the block swept from point to point. */
function sweep(stroke: Sample[], pen: { length: number; depth: number }, units: number): string {
  const pieces: Point[][] = [];
  const add = (shape: Point[]) => pieces.push(shape);
  add(hull(block(stroke[0]!.at, stroke[0]!.pressure, pen, units)));
  for (let i = 1; i < stroke.length; i++) {
    const a = stroke[i - 1]!;
    const b = stroke[i]!;
    add(hull([...block(a.at, a.pressure, pen, units), ...block(b.at, b.pressure, pen, units)]));
  }
  return pathOf(pieces);
}
const lengthsOf = (points: Point[]) =>
  points.reduce<number[]>(
    (sum, p, i) =>
      sum.concat(
        i ? sum[i - 1]! + Math.hypot(p[0] - points[i - 1]![0], p[1] - points[i - 1]![1]) : 0,
      ),
    [],
  );

/** The CSS timing that moves a reveal along the stroke the way the pen did: length share by time. */
function penTiming(stroke: Sample[]): string {
  const lengths = lengthsOf(stroke.map((s) => s.at));
  const length = lengths[lengths.length - 1] || 1;
  const start = stroke[0]!.ms;
  const runs = stroke[stroke.length - 1]!.ms - start || 1;
  const stops: string[] = [];
  let next = 0;
  stroke.forEach((s, i) => {
    const t = (s.ms - start) / runs;
    if (t < next && i < stroke.length - 1) return;
    stops.push(`${(lengths[i]! / length).toFixed(4)} ${(t * 100).toFixed(2)}%`);
    next = t + 1 / STEPS;
  });
  return `linear(0, ${stops.join(", ")}, 1)`;
}

interface HandStroke {
  /** The chisel's filled mark. */
  shape: string;
  /** The pen's path, which the reveal runs along. */
  path: string;
  /** How wide the reveal must be to cover the mark. */
  cover: number;
  /** When the pen starts this stroke and how long it runs, in ms from the writing's start. */
  from: number;
  runs: number;
  timing: string;
}

export interface HandPaint {
  strokes: HandStroke[];
  drips: HandDrip[];
  /** When the whole piece is written, in ms from its start. */
  written: number;
  box: { left: number; top: number; width: number; height: number };
  /** The strokes' own extent, without the room round them or the drips (for the tab icon). */
  ink: { left: number; top: number; width: number; height: number };
  /** Where the last stroke ends, as shares of the box, and which way the pen was going. */
  end: { x: number; y: number; angle: number };
  /** Where the first stroke starts, as shares of the box. */
  start: { x: number; y: number };
}

/** The same "random" every time for the same place, as on the writing page (chance()), so the
 * site's drips fall where the writing page's did. */
const chance = (n: number) => {
  const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};

/** A round blob of paint as a many-sided shape, turned the same way as the strokes' pieces. */
const blob = ([x, y]: Point, r: number) =>
  hull(
    Array.from({ length: 18 }, (_, k) => {
      const a = (k / 18) * Math.PI * 2;
      return [x + Math.cos(a) * r, y + Math.sin(a) * r] as Point;
    }),
  );

const shapeOf = (pieces: Point[][]) => pathOf(pieces);

interface HandDrip {
  shape: string;
  /** When the pen passed the spot it runs from, in ms from the writing's start. */
  at: number;
}

function paint(name: HandName): HandPaint {
  const hand = HANDS[name];
  const units = hand.units;
  const pen = pens.pens[(hand.pen in pens.pens ? hand.pen : "graffiti") as PenName];
  // How much this word spills and drips: the normal paint, with the levels picked on the writing page.
  const levels = pens.levels as Record<string, Record<string, Partial<typeof pens.paint>>>;
  const picked = ("paint" in hand ? hand.paint : {}) as Record<string, string>;
  const look = { ...pens.paint };
  for (const [kind, level] of Object.entries(picked)) Object.assign(look, levels[kind]?.[level]);
  const half = (units * pen.length) / 2;
  /** Every corner of the paint, for the box round it. */
  const corners: Point[] = [];
  const dripsOut: (HandDrip & { bottom: number })[] = [];

  const strokes: { kept: Sample[]; shape: string }[] = hand.strokes.map((flat, si) => {
    const raw: Sample[] = [];
    for (let i = 0; i + 3 < flat.length; i += 4)
      raw.push({ at: [flat[i]!, flat[i + 1]!], ms: flat[i + 2]!, pressure: flat[i + 3]! });
    // Smoothed as the writing page shows it.
    const smooth = steady(raw, units);
    const n = smooth.length;
    const mine: Point[][] = [];

    // How fast the hand went at each point, in capital heights a second (writing page: speed).
    const speed = smooth.map((_, i) => {
      const a = smooth[Math.max(0, i - 3)]!;
      const b = smooth[Math.min(n - 1, i + 3)]!;
      return (
        Math.hypot(b.at[0] - a.at[0], b.at[1] - a.at[1]) / units / (Math.max(1, b.ms - a.ms) / 1000)
      );
    });
    // Pools where the pen landed and where it left the wall.
    mine.push(
      blob(smooth[0]!.at, half * look.pool),
      blob(smooth[n - 1]!.at, half * look.pool * 0.85),
    );
    // Where the pen rested, the paint spilled.
    const most = units * pen.length * look.spillMost;
    for (let i = 1; i < n; i++) {
      const rest = smooth[i]!.ms - smooth[i - 1]!.ms;
      if (rest < look.spillAfter) continue;
      mine.push(
        blob(smooth[i]!.at, Math.min(most, most * Math.sqrt((rest - look.spillAfter) / 900))),
      );
    }
    // Drips: from the start, the slow spots and the end, each by its own fixed chance.
    const spots = [0];
    for (let i = 8; i < n - 8; i += 4) {
      if (speed[i]! < 1.2 && speed[i]! <= speed[i - 4]! && speed[i]! <= speed[i + 4]!)
        spots.push(i);
    }
    spots.push(n - 1);
    let dripped = 0;
    for (const i of spots) {
      const key = si * 1e4 + (i === n - 1 ? 9999 : i);
      if (dripped >= look.drips || chance(key + 3) > look.dripOdds) continue;
      dripped++;
      const [ax, ay] = smooth[i]!.at;
      const long = units * look.dripLongest * (0.35 + 0.65 * chance(key + 5));
      const w = half * 0.5;
      const x = ax + (chance(key + 7) - 0.5) * half * 0.8;
      // Wide where it leaves the line, thin as it runs, a small bead at the end.
      const run =
        `M${r0(x - w)} ${r0(ay - w * 0.4)}` +
        `Q${r0(x - w * 0.34)} ${r0(ay + w * 0.6)} ${r0(x - w * 0.3)} ${r0(ay + long)}` +
        `L${r0(x + w * 0.3)} ${r0(ay + long)}` +
        `Q${r0(x + w * 0.34)} ${r0(ay + w * 0.6)} ${r0(x + w)} ${r0(ay - w * 0.4)}Z`;
      const bead = blob([x, ay + long], w * 0.46);
      dripsOut.push({ shape: run + shapeOf([bead]), at: smooth[i]!.ms, bottom: ay + long + w });
    }

    // Thinned to what can be seen, for the swept mark and the reveal's path.
    const kept = [smooth[0]!];
    for (const s of smooth.slice(1, -1)) {
      const k = kept[kept.length - 1]!;
      if (Math.hypot(s.at[0] - k.at[0], s.at[1] - k.at[1]) >= FINE) kept.push(s);
    }
    if (n > 1) kept.push(smooth[n - 1]!);
    for (const s of kept) corners.push(...block(s.at, s.pressure, pen, units));
    corners.push(...mine.flat());
    return { kept, shape: sweep(kept, pen, units) + shapeOf(mine) };
  });

  const all = corners;
  const left = Math.min(...all.map(([x]) => x)) - PAD;
  const top = Math.min(...all.map(([, y]) => y)) - PAD;
  const right = Math.max(...all.map(([x]) => x)) + PAD;
  const bottom = Math.max(...all.map(([, y]) => y), ...dripsOut.map((d) => d.bottom)) + PAD;

  const marks: HandStroke[] = strokes.map(({ kept, shape }) => {
    const points = kept.map((s) => s.at);
    return {
      shape,
      path: pathOf([points], { scale: 10, closed: false }),
      // Wide enough to uncover the whole felt block and its pools, however it is turned.
      cover: units * pen.length * 1.6,
      from: kept[0]!.ms,
      runs: Math.max(1, kept[kept.length - 1]!.ms - kept[0]!.ms),
      timing: penTiming(kept),
    };
  });

  const last = strokes[strokes.length - 1]!.kept;
  const end = last[last.length - 1]!.at;
  const before = last[Math.max(0, last.length - 6)]!.at;
  return {
    strokes: marks,
    drips: dripsOut.map(({ shape, at }) => ({ shape, at })),
    written: Math.max(...marks.map((s) => s.from + s.runs)),
    box: { left, top, width: right - left, height: bottom - top },
    ink: {
      left: left + PAD,
      top: top + PAD,
      width: Math.max(...all.map(([x]) => x)) - left - PAD,
      height: Math.max(...all.map(([, y]) => y)) - top - PAD,
    },
    end: {
      x: (end[0] - left) / (right - left),
      y: (end[1] - top) / (bottom - top),
      angle: Math.atan2(end[1] - before[1], end[0] - before[0]),
    },
    start: {
      x: (strokes[0]!.kept[0]!.at[0] - left) / (right - left),
      y: (strokes[0]!.kept[0]!.at[1] - top) / (bottom - top),
    },
  };
}

/** How long a drip takes to run its whole length, as on the writing page. */
export const dripGrows = pens.paint.dripGrows;

/** Each piece, worked out once. */
export const hands: Record<HandName, HandPaint> = {
  tlxq: paint("tlxq"),
  hi: paint("hi"),
  tools: paint("tools"),
  running: paint("running"),
  circle: paint("circle"),
  tryIt: paint("tryIt"),
  server: paint("server"),
  wip: paint("wip"),
  askMe: paint("askMe"),
  signature: paint("signature"),
  notFound: paint("notFound"),
  icon: paint("icon"),
};

/** When the tag on the first screen is written, in ms from its start. */
export const tagWritten = hands.tlxq.written;

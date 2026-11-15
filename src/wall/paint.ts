import { dripGrows, type HandPaint } from "@/look/handPaint";

/**
 * One of Tom's hand-written pieces sprayed on the wall, as a picture the scene puts on the brick.
 * It writes itself again the way it was written: each stroke along its own path at the pen's own
 * speed (the same timing /look uses), then the drips run. Without motion it is drawn whole.
 */

/** "M x yL x y…" back to points. */
function pointsOf(path: string): [number, number][] {
  const nums = path.match(/-?[\d.]+/g)?.map(Number) ?? [];
  const out: [number, number][] = [];
  for (let i = 0; i + 1 < nums.length; i += 2) out.push([nums[i]!, nums[i + 1]!]);
  return out;
}

/** The pen's timing "linear(0, len time%, …, 1)" as [time share, length share] pairs. */
function stopsOf(timing: string): [number, number][] {
  const stops: [number, number][] = [[0, 0]];
  for (const m of timing.matchAll(/([\d.]+) ([\d.]+)%/g))
    stops.push([Number(m[2]) / 100, Number(m[1])]);
  stops.push([1, 1]);
  return stops;
}

function along(stops: [number, number][], t: number): number {
  for (let i = 1; i < stops.length; i++) {
    const [t1, l1] = stops[i]!;
    if (t <= t1) {
      const [t0, l0] = stops[i - 1]!;
      return t1 > t0 ? l0 + ((t - t0) / (t1 - t0)) * (l1 - l0) : l1;
    }
  }
  return 1;
}

const easeOut = (x: number) => 1 - (1 - x) ** 3;

export class WallPaint {
  readonly canvas: HTMLCanvasElement;
  /** The piece's size in metres on the wall, from the width it was given. */
  readonly size: { w: number; h: number };
  /** How long it takes to write, drips included, in ms. */
  readonly lasts: number;
  private readonly layer: HTMLCanvasElement;
  private readonly scratch: HTMLCanvasElement;
  private readonly scale: number;
  private readonly strokes: {
    shape: Path2D;
    path: Path2D;
    length: number;
    stops: [number, number][];
    from: number;
    runs: number;
    cover: number;
  }[];
  private readonly drips: { shape: Path2D; top: number; at: number }[];

  constructor(
    private readonly hand: HandPaint,
    private readonly ink: string,
    widthM: number,
    pxPerM: number,
  ) {
    const { box } = hand;
    const wide = Math.round(widthM * pxPerM);
    this.scale = wide / box.width;
    this.size = { w: widthM, h: (widthM * box.height) / box.width };
    const make = () => {
      const c = document.createElement("canvas");
      c.width = wide;
      c.height = Math.round(box.height * this.scale);
      return c;
    };
    this.canvas = make();
    this.layer = make();
    this.scratch = make();
    this.strokes = hand.strokes.map((s) => {
      const pts = pointsOf(s.path);
      let length = 0;
      for (let i = 1; i < pts.length; i++)
        length += Math.hypot(pts[i]![0] - pts[i - 1]![0], pts[i]![1] - pts[i - 1]![1]);
      return {
        shape: new Path2D(s.shape),
        path: new Path2D(s.path),
        length: Math.max(1, length),
        stops: stopsOf(s.timing),
        from: s.from,
        runs: s.runs,
        cover: s.cover,
      };
    });
    this.drips = hand.drips.map((d) => ({
      shape: new Path2D(d.shape),
      top: Number(d.shape.match(/^M-?[\d.]+ (-?[\d.]+)/)?.[1] ?? box.top),
      at: d.at,
    }));
    this.lasts = hand.written + (hand.drips.length ? dripGrows : 0);
  }

  private place(g: CanvasRenderingContext2D) {
    const { box } = this.hand;
    g.setTransform(this.scale, 0, 0, this.scale, -box.left * this.scale, -box.top * this.scale);
  }

  /** Draws the piece as it is `t` ms after it started being written. */
  draw(t: number): void {
    const { box } = this.hand;
    const lg = this.layer.getContext("2d")!;
    lg.setTransform(1, 0, 0, 1, 0, 0);
    lg.clearRect(0, 0, this.layer.width, this.layer.height);
    this.place(lg);
    lg.fillStyle = this.ink;
    for (const s of this.strokes) {
      if (t <= s.from) continue;
      if (t >= s.from + s.runs) {
        lg.fill(s.shape);
        continue;
      }
      // Partly written: the paint only where the pen has been so far.
      const sg = this.scratch.getContext("2d")!;
      sg.setTransform(1, 0, 0, 1, 0, 0);
      sg.clearRect(0, 0, this.scratch.width, this.scratch.height);
      this.place(sg);
      sg.globalCompositeOperation = "source-over";
      sg.lineCap = "round";
      sg.lineJoin = "round";
      sg.lineWidth = s.cover;
      sg.strokeStyle = "#fff";
      sg.setLineDash([along(s.stops, (t - s.from) / s.runs) * s.length, s.length + 1]);
      sg.stroke(s.path);
      sg.setLineDash([]);
      sg.globalCompositeOperation = "source-in";
      sg.fillStyle = this.ink;
      sg.fill(s.shape);
      sg.globalCompositeOperation = "source-over";
      lg.save();
      lg.setTransform(1, 0, 0, 1, 0, 0);
      lg.drawImage(this.scratch, 0, 0);
      lg.restore();
    }
    // The drips run down from where the pen was slow, after it passed.
    for (const d of this.drips) {
      if (t <= d.at) continue;
      const grown = easeOut(Math.min(1, (t - d.at) / dripGrows));
      lg.save();
      lg.beginPath();
      lg.rect(box.left, d.top, box.width, (box.top + box.height - d.top) * grown);
      lg.clip();
      lg.fill(d.shape);
      lg.restore();
    }
    // The spray's haze round every edge.
    const g = this.canvas.getContext("2d")!;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, this.canvas.width, this.canvas.height);
    g.shadowColor = this.ink;
    g.shadowBlur = Math.max(2, 22 * this.scale);
    g.globalAlpha = 0.55;
    g.drawImage(this.layer, 0, 0);
    g.shadowBlur = 0;
    g.globalAlpha = 1;
    g.drawImage(this.layer, 0, 0);
  }
}

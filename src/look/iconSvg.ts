import { readFileSync } from "node:fs";
import { DRIP_FRAMES } from "./dripFrames";
import { hands } from "./handPaint";

/** A colour from the one token file, so the icon never carries its own. */
const token = (name: string) =>
  new RegExp(`${name}:\\s*(#[0-9a-fA-F]{3,8})`).exec(
    readFileSync("src/design/tokens.css", "utf8"),
  )![1]!;

/** Room round the mark, as a share of its longer side. */
const ROOM = 0.14;

/** Tom's icon tag as a square picture: the view box, the colours and the paint's outline. The drips
 * are left out; they are lost at 16 px. Worked out at build time. */
export function iconSvg() {
  const { ink, strokes } = hands.icon;
  const side = Math.max(ink.width, ink.height) * (1 + 2 * ROOM);
  const x = ink.left + ink.width / 2 - side / 2;
  const y = ink.top + ink.height / 2 - side / 2;
  const n = (v: number) => v.toFixed(0);
  return {
    view: `${n(x)} ${n(y)} ${n(side)} ${n(side)}`,
    side,
    ground: token("--look-ground"),
    spray: token("--front-spray"),
    d: strokes.map((s) => s.shape).join(""),
  };
}

/** Where the icon's paint drips, in the icon tag's units: where each leaves a foot of the mark, how far it
 * runs, how wide it is where it leaves, and how late it starts as a share of the whole run. The run
 * is the look's (handPaint.ts): wide at the paint, thin as it goes, a bead at the end. The tag
 * itself has no drips, because the tab icon was made without them. */
const DRIPS = [
  { x: 560, y: -165, long: 165, w: 36, late: 0 },
  { x: 322, y: -180, long: 105, w: 32, late: 0.25 },
];

/** The tab icon, drip-free: the mark in the paint blue (--front-spray) on the look's dark ground. app/icon.svg/route.ts
 * serves it; tools/icons/mark.svg is the picture Tom approved 11-27, and a test holds the two equal. */
export function iconTabSvg() {
  const { view, side, ground, spray, d } = iconSvg();
  const [x, y] = view.split(" ");
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${view}">` +
    `<rect x="${x}" y="${y}" width="${side.toFixed(0)}" height="${side.toFixed(0)}" rx="${(side * 0.2).toFixed(0)}" fill="${ground}"/>` +
    `<path fill="${spray}" d="${d}"/></svg>`
  );
}

/** The tab icon with its drips grown to `step` of DRIP_FRAMES (1 to DRIP_FRAMES): a static picture, because a
 * browser shows only an SVG icon's first frame, so the page swaps between these (TabAway.tsx). */
export function iconDripSvg(step: number) {
  const { view, side, ground, spray, d } = iconSvg();
  const [x, y] = view.split(" ");
  const n = (v: number) => v.toFixed(0);
  const grown = DRIPS.map(({ x: dx, y: dy, long, w, late }) => {
    const t = Math.min(1, Math.max(0, (step / DRIP_FRAMES - late) / (1 - late)));
    const run = long * (1 - (1 - t) ** 2);
    const r = w * (0.62 + 0.18 * t);
    const end = dy + run;
    return (
      `<path d="M${n(dx - w)} ${n(dy - w * 0.4)}Q${n(dx - w * 0.34)} ${n(dy + w * 0.6)} ${n(dx - w * 0.4)} ${n(end)}` +
      `L${n(dx + w * 0.4)} ${n(end)}Q${n(dx + w * 0.34)} ${n(dy + w * 0.6)} ${n(dx + w)} ${n(dy - w * 0.4)}Z"/>` +
      `<circle cx="${n(dx)}" cy="${n(end)}" r="${n(r)}"/>`
    );
  }).join("");
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${view}">` +
    `<rect x="${x}" y="${y}" width="${n(side)}" height="${n(side)}" rx="${n(side * 0.2)}" fill="${ground}"/>` +
    `<g fill="${spray}"><path d="${d}"/>${grown}</g></svg>`
  );
}

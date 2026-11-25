import { type HandName, hands } from "./handPaint";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

/**
 * The strokes and drips of one piece of handwriting as svg markup: a mask per stroke that reveals
 * it along its path, the paint it reveals, and the drips. The tag over the first screen carries it
 * in the page (Tag.tsx); every other piece is a file of its own (app/hands) that Motion.tsx puts in.
 */
export function handMarkup(name: HandName): string {
  const { box, strokes, drips } = hands[name];
  const id = `lk-hand-${name}`;
  const masks = strokes
    .map(
      (s, i) =>
        `<mask id="${id}-${i}" maskUnits="userSpaceOnUse" x="${box.left}" y="${box.top}" width="${box.width}" height="${box.height}">` +
        `<path class="lk-reveal" d="${esc(s.path)}" pathLength="1" stroke-width="${s.cover}" style="--from:${s.from}ms;--runs:${s.runs}ms;--pen:${esc(s.timing)}"/>` +
        `</mask>`,
    )
    .join("");
  const paint = strokes
    .map((s, i) => `<path class="lk-paint" d="${esc(s.shape)}" mask="url(#${id}-${i})"/>`)
    .join("");
  const runs = drips
    .map((d) => `<path class="lk-drip" d="${esc(d.shape)}" style="--at:${d.at}ms"/>`)
    .join("");
  return `<defs>${masks}</defs>${paint}${runs}`;
}

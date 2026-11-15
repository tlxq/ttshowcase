#!/usr/bin/env node
// Makes the site's words as graffiti tags: one pen line per word, saved like a word written on the
// writing page (src/content/hand/<word>.json), so the page's Play and the site draw them the same way.
//
// A letter is a few points the pen passes through; "s" marks a sharp corner, the rest is curved
// through. The letters of a word are joined in one line, then leaned and timed like a fast hand:
// quick on the long straights, slower into the corners and the turns, where the paint pools.
//
// Usage: node tools/write/tag.mjs [word ...]     (no word: all of them)
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { LETTERS, WORDS } from "./tag-letters.mjs";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "../../src/content/hand");
const UNITS = 1000;
// How far apart the saved points are, in units.
const STEP = 6;

/** Centripetal Catmull-Rom through the points, sampled every STEP units. */
function curve(nodes) {
  if (nodes.length < 2) return nodes.slice();
  const p = [nodes[0], ...nodes, nodes[nodes.length - 1]];
  const out = [nodes[0]];
  for (let i = 1; i < p.length - 2; i++) {
    const [p0, p1, p2, p3] = [p[i - 1], p[i], p[i + 1], p[i + 2]];
    const d = (a, b) => Math.max(1e-3, Math.hypot(b[0] - a[0], b[1] - a[1]) ** 0.5);
    const t0 = 0,
      t1 = t0 + d(p0, p1),
      t2 = t1 + d(p1, p2),
      t3 = t2 + d(p2, p3);
    const n = Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / STEP));
    for (let k = 1; k <= n; k++) {
      const t = t1 + ((t2 - t1) * k) / n;
      const lerp = (a, b, ta, tb) => {
        const w = tb === ta ? 0 : (t - ta) / (tb - ta);
        return [a[0] + (b[0] - a[0]) * w, a[1] + (b[1] - a[1]) * w];
      };
      const a1 = lerp(p0, p1, t0, t1),
        a2 = lerp(p1, p2, t1, t2),
        a3 = lerp(p2, p3, t2, t3);
      const b1 = lerp(a1, a2, t0, t2),
        b2 = lerp(a2, a3, t1, t3);
      out.push(lerp(b1, b2, t1, t2));
    }
  }
  return out;
}

/** The word's line: letters placed one after the other, curved through, broken at sharp corners. */
function line(word, style) {
  const nodes = [];
  let at = 0;
  for (const ch of word.text) {
    const letter = LETTERS[ch];
    if (!letter) throw new Error(`No tag letter for "${ch}"`);
    const scale = letter.scale ?? 1;
    for (const [x, y, flag] of letter.path) nodes.push([at + x * scale, y * scale, flag]);
    at += letter.w * scale + style.space;
  }
  // The finishing move: a swoosh under the word, back from its end.
  if (word.bar) for (const [x, y, flag] of word.bar(at)) nodes.push([x, y, flag]);
  // Lean: x moves right with height (y is up = negative).
  const lean = nodes.map(([x, y, f]) => [x * style.squeeze - y * style.slant, y, f]);
  // Curve each run between sharp corners.
  const pts = [];
  let run = [];
  for (const n of lean) {
    run.push(n);
    if (n[2] === "s" && run.length > 1) {
      pts.push(...curve(run).slice(pts.length ? 1 : 0));
      run = [n];
    }
  }
  if (run.length > 1) pts.push(...curve(run).slice(pts.length ? 1 : 0));
  return pts;
}

/** Times and pressures like a fast, sure hand: speed builds on straights, drops into turns. */
function timed(pts, style) {
  const turn = pts.map((p, i) => {
    if (i === 0 || i === pts.length - 1) return 1;
    const a = Math.atan2(p[1] - pts[i - 1][1], p[0] - pts[i - 1][0]);
    const b = Math.atan2(pts[i + 1][1] - p[1], pts[i + 1][0] - p[0]);
    let d = Math.abs(b - a);
    if (d > Math.PI) d = Math.PI * 2 - d;
    return d;
  });
  // How sharply the line turns near each point, spread a little so the hand slows before a corner.
  const near = turn.map((_, i) => {
    let m = 0;
    for (let j = Math.max(0, i - 4); j <= Math.min(turn.length - 1, i + 4); j++)
      m = Math.max(m, turn[j] * (1 - Math.abs(j - i) / 6));
    return m;
  });
  let t = 0;
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    if (i) {
      const dist = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      // Units per ms: the top speed, less in turns, and starting from rest.
      const ease = Math.min(1, 0.35 + i / 25);
      const speed = style.speed * ease * Math.max(0.22, 1 - near[i] * 2.2);
      t += dist / speed;
    }
    const slow = 1 - Math.max(0.22, 1 - near[i] * 2.2);
    out.push([pts[i][0], pts[i][1], t, Math.min(1, 0.55 + 0.4 * slow)]);
  }
  // A short rest at the very end: the pen stops on the wall before it leaves.
  const last = out[out.length - 1];
  out.push([last[0] + 0.5, last[1], last[2] + style.rest, last[3]]);
  return out;
}

const words = process.argv.slice(2);
for (const word of WORDS.filter((w) => !words.length || words.includes(w.text))) {
  const style = { slant: 0.3, squeeze: 1.8, space: 0, speed: 3.2, rest: 140, ...word.style };
  const pts = timed(line(word, style), style);
  const left = Math.min(...pts.map((p) => p[0]));
  const data = {
    word: word.name,
    written: new Date().toISOString().slice(0, 10),
    units: UNITS,
    lifts: 0,
    pen: "graffiti",
    made: "tools/write/tag.mjs",
    strokes: [
      pts.flatMap(([x, y, t, p]) => [
        Math.round(x - left),
        Math.round(y),
        Math.round(t),
        Math.round(p * 100) / 100,
      ]),
    ],
  };
  writeFileSync(join(OUT, `${word.name.toLowerCase()}.json`), JSON.stringify(data) + "\n");
  console.log(`${word.name}: ${pts.length} points, ${Math.round(pts.at(-1)[2])} ms`);
}

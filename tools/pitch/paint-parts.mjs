// The paint pitch's style and script live in parts (pitch/paint/), so branches that touch different moments don't
// clash in one 2300-line file. The build (tools/pitch/build.mjs) puts them back where pitch/paint.src.html has its two
// markers. The script's parts share ONE scope (they are cut out of one function, at statement boundaries), so they
// are only ever joined, in the order pitch/paint/order.txt lists them; style.css is the page's own style.
// Tests: tools/pitch/paint-parts.test.mjs.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export const CSS_MARKER = "/* __PAINT_CSS__ */\n";
export const JS_MARKER = "/* __PAINT_JS__ */\n";

// Reads pitch/paint/: the order list against the files, in both directions, so nothing is left out or forgotten.
export function readParts(dir) {
  const order = readFileSync(join(dir, "order.txt"), "utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const dup = order.find((n, i) => order.indexOf(n) !== i);
  if (dup) throw new Error(`pitch/paint/order.txt lists ${dup} twice`);
  const missing = order.filter((n) => !existsSync(join(dir, n)));
  if (missing.length)
    throw new Error(
      `pitch/paint/order.txt lists ${missing.join(", ")}, which is not in pitch/paint/`,
    );
  const extra = readdirSync(dir).filter((n) => n.endsWith(".js") && !order.includes(n));
  if (extra.length)
    throw new Error(
      `pitch/paint/${extra.join(", ")} is not in pitch/paint/order.txt: add it where it should run`,
    );
  if (!existsSync(join(dir, "style.css"))) throw new Error("pitch/paint/style.css is missing");
  return {
    css: readFileSync(join(dir, "style.css"), "utf8"),
    js: order.map((n) => readFileSync(join(dir, n), "utf8")).join(""),
  };
}

// Puts the parts where the page has its markers (each marker is a whole line). A marker that is not there is an error.
export function fillParts(page, parts) {
  let out = page;
  for (const [marker, text] of [
    [CSS_MARKER, parts.css],
    [JS_MARKER, parts.js],
  ]) {
    if (!out.includes(marker))
      throw new Error(`pitch/paint.src.html has no ${marker.trim()} line any more`);
    out = out.replace(marker, () => text);
  }
  return out;
}

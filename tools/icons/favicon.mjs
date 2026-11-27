// Makes public/favicon.ico (16, 32 and 48 px) from the tab icon the site already builds, out/icon.svg (app/icon.svg/route.ts:
// Tom's icon tag), so the mark is never redrawn. Needs a build (`npm run build`) and rsvg-convert.
// Run when the icon changes: node tools/icons/favicon.mjs. The file is committed; public/ goes to the site as it is.
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const SIZES = [16, 32, 48];
/** The hash of the icon the committed .ico was made from. tools/header-check.sh fails when the built icon.svg differs, so a
 * changed icon can't leave a stale favicon.ico behind (the .ico's bytes depend on the machine's rsvg-convert, the svg's don't). */
export const SOURCE_HASH_FILE = "tools/icons/favicon.source.sha256";
export const sourceHash = (svg) => createHash("sha256").update(svg).digest("hex");

/** An .ico holding one PNG per size (PNG-in-ICO, read by every browser made since 2008). */
export function ico(pngs) {
  const head = Buffer.alloc(6 + 16 * pngs.length);
  head.writeUInt16LE(1, 2); // type: icon
  head.writeUInt16LE(pngs.length, 4);
  let offset = head.length;
  pngs.forEach(({ size, png }, i) => {
    const at = 6 + 16 * i;
    head[at] = size; // width, height (under 256: the byte itself)
    head[at + 1] = size;
    head.writeUInt16LE(1, at + 4); // colour planes
    head.writeUInt16LE(32, at + 6); // bits per pixel
    head.writeUInt32LE(png.length, at + 8);
    head.writeUInt32LE(offset, at + 12);
    offset += png.length;
  });
  return Buffer.concat([head, ...pngs.map((p) => p.png)]);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const root = fileURLToPath(new URL("../..", import.meta.url));
  const svg = readFileSync(`${root}out/icon.svg`);
  const pngs = SIZES.map((size) => ({
    size,
    png: execFileSync("rsvg-convert", ["-w", String(size), "-h", String(size), "-f", "png"], {
      input: svg,
    }),
  }));
  writeFileSync(`${root}public/favicon.ico`, ico(pngs));
  writeFileSync(`${root}${SOURCE_HASH_FILE}`, sourceHash(svg) + "\n");
  console.log(`public/favicon.ico: ${SIZES.join(", ")} px from out/icon.svg`);
}

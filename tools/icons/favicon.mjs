// Makes public/favicon.ico (16, 32 and 48 px) from the pictures Tom approved 11-27, committed in this folder: assets/mark-16.png and
// assets/mark-32.png (the TT mark in the paint blue on the black tile, the tab icon) and assets/piece-48.png (the TT mark as a piece letter).
// The file is committed; public/ goes to the site as it is. Run: node tools/icons/favicon.mjs
// If the tab icon itself changes (app/icon.svg), the guard in tools/header-check.sh fails: make new mark pictures with
//   node tools/icons/favicon.mjs --render   (needs a build, `npm run build`, and rsvg-convert; writes mark-16/32.png from out/icon.svg)
// and have Tom approve them. Note: the two mark PNGs are rendered from mark.svg by --render, and nothing checks that they match
// if someone edits mark.svg and the hash by hand.
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const SIZES = [16, 32, 48];
/** Which committed picture each size is made from. */
export const SOURCES = {
  16: "assets/mark-16.png",
  32: "assets/mark-32.png",
  48: "assets/piece-48.png",
};
/** The hash of the tab icon the committed mark pictures were made from. tools/header-check.sh fails when the built icon.svg
 * differs, so a changed icon can't leave a stale favicon.ico behind (the svg's bytes don't depend on the machine, a picture's do). */
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
  const dir = `${root}tools/icons/`;
  if (process.argv.includes("--render")) {
    const svg = readFileSync(`${root}out/icon.svg`);
    for (const size of [16, 32]) {
      const png = execFileSync(
        "rsvg-convert",
        ["-w", String(size), "-h", String(size), "-f", "png"],
        {
          input: svg,
        },
      );
      writeFileSync(`${dir}${SOURCES[size]}`, png);
    }
    writeFileSync(`${root}${SOURCE_HASH_FILE}`, sourceHash(svg) + "\n");
  }
  const pngs = SIZES.map((size) => ({ size, png: readFileSync(`${dir}${SOURCES[size]}`) }));
  writeFileSync(`${root}public/favicon.ico`, ico(pngs));
  console.log(`public/favicon.ico: ${SIZES.join(", ")} px from tools/icons/`);
}

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { SHARE_ALT, tokenColour } from "./head.ts";
import { ico, SIZES, SOURCES, sourceHash, SOURCE_HASH_FILE } from "../../tools/icons/favicon.mjs";

const read = (path: string) => readFileSync(path, "utf8");

/** The old page's orange, --look-spray: no served icon may carry it any more. */
const OLD_ORANGE = /#ff4f1a/i;

// The built icons (out/icon.svg, out/icon-drip/*.svg) are held to the approved mark by tools/header-check.sh, after the build.
test("the tab icon is the approved blue mark, made from the site's blue token, never the old orange", () => {
  const tokens = read("src/design/tokens.css");
  const blue = tokenColour(tokens, "--front-spray");
  const approved = read("tools/icons/mark.svg");
  assert.match(approved, new RegExp(`<path fill="${blue}" d="`)); // the approved picture uses exactly the site's blue
  assert.match(approved, new RegExp(`fill="${tokenColour(tokens, "--look-ground")}"`));
  assert.doesNotMatch(approved, OLD_ORANGE);
  assert.equal(sourceHash(approved), read(SOURCE_HASH_FILE).trim()); // what the built icon.svg is held to
  // the one generator (tab icon and every drip frame) reads the blue token and has no colour of its own
  const generator = read("src/look/iconSvg.ts");
  assert.match(generator, /spray: token\("--front-spray"\)/);
  assert.doesNotMatch(generator, OLD_ORANGE);
  assert.doesNotMatch(generator, /--look-spray/);
  assert.doesNotMatch(generator, /#[0-9a-f]{3,8}\b/i); // no pasted hex
  // the routes read the generator or the approved file
  assert.match(read("app/icon.svg/route.ts"), /iconTabSvg\(\)/);
  assert.match(read("app/apple-icon.png/route.ts"), /piece-180\.png/);
  assert.doesNotMatch(
    read("app/icon.svg/route.ts") + read("app/apple-icon.png/route.ts"),
    OLD_ORANGE,
  );
});

test("the .ico is made of the approved 16 and 32 px marks and the 48 px piece", () => {
  const file = readFileSync("public/favicon.ico");
  const from = (size: number) => readFileSync(`tools/icons/${SOURCES[size as 16 | 32 | 48]}`);
  assert.deepEqual(file, ico(SIZES.map((size) => ({ size, png: from(size) }))));
  assert.deepEqual(Object.values(SOURCES), [
    "assets/mark-16.png",
    "assets/mark-32.png",
    "assets/piece-48.png",
  ]);
  const apple = readFileSync("app/apple-icon.png/assets/piece-180.png");
  assert.deepEqual([apple.readUInt32BE(16), apple.readUInt32BE(20)], [180, 180]);
});

/** A JPEG's width and height, from its start-of-frame marker. */
function jpegSize(b: Buffer): [number, number] {
  let i = 2;
  while (i < b.length) {
    const marker = b[i + 1]!;
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker))
      return [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)];
    i += 2 + b.readUInt16BE(i + 2);
  }
  throw new Error("no frame in the JPEG");
}

test("the share picture is 1200 by 630, under 300 KB, the same on both fronts, with one alt text", () => {
  const live = readFileSync("public/share.jpg");
  assert.deepEqual(jpegSize(live), [1200, 630]);
  assert.ok(live.length < 300_000, `${live.length} bytes`);
  assert.deepEqual(readFileSync("pitch/assets/share.jpg"), live); // mise run share copies one to the other
  assert.match(read("app/page.tsx"), /alt: SHARE_ALT/);
  assert.match(read("app/page.tsx"), /images: \[\{ url: "\/share\.jpg", alt: SHARE_ALT \}\]/);
  for (const file of readdirSync("pitch").filter((f) => f.endsWith(".src.html"))) {
    const html = read(`pitch/${file}`);
    for (const tag of ['property="og:image:alt"', 'name="twitter:image:alt"'])
      assert.ok(html.includes(`<meta ${tag} content="${SHARE_ALT}">`), `${file}: ${tag}`);
    assert.match(html, /og:image:width" content="1200"/);
    assert.match(html, /og:image:height" content="630"/);
  }
});

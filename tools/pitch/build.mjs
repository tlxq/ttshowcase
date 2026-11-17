// Builds the paint pitch (pitch/paint.src.html) into .cache/pitch/paint.html: fonts, hand-written words and the
// stencil palette go into the page, the pictures are linked from pitch/assets.
// The fonts are fetched once into .cache/fonts and never go into git: Clash Display's licence (ITF FFL, section 02)
// does not allow the font file in a public repository; serving it on our own site is allowed.
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const fonts = join(root, ".cache/fonts");
const out = join(root, ".cache/pitch");
const hand = (name) => readFileSync(join(root, "src/content/hand", name + ".json"), "utf8").trim();

async function get(url, what) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/140 Safari/537.36",
    },
  });
  if (!res.ok) throw new Error(`Couldn't fetch ${what} (${res.status} from ${url})`);
  return res;
}

async function clash() {
  const file = join(fonts, "ClashDisplay-Bold.woff2");
  if (existsSync(file)) return file;
  const zip = join(fonts, "clash-display.zip");
  writeFileSync(
    zip,
    Buffer.from(
      await (
        await get("https://api.fontshare.com/v2/fonts/download/clash-display", "Clash Display")
      ).arrayBuffer(),
    ),
  );
  const py =
    "import sys, zipfile\nz = zipfile.ZipFile(sys.argv[1])\nopen(sys.argv[2], 'wb').write(z.read('ClashDisplay_Complete/Fonts/WEB/fonts/ClashDisplay-Bold.woff2'))";
  const run = spawnSync("python3", ["-I", "-c", py, zip, file], { encoding: "utf8" });
  rmSync(zip, { force: true });
  if (run.status !== 0) throw new Error("Couldn't unpack Clash Display: " + run.stderr);
  return file;
}

async function saira() {
  const file = join(fonts, "SairaStencilOne.woff2");
  if (existsSync(file)) return file;
  const css = await (
    await get(
      "https://fonts.googleapis.com/css2?family=Saira+Stencil+One&display=block",
      "Saira Stencil One",
    )
  ).text();
  const url = css
    .match(/url\((https:[^)]+\.woff2)\)/g)
    ?.at(-1)
    ?.slice(4, -1); // the last face is the Latin one
  if (!url) throw new Error("Couldn't find Saira Stencil One's woff2 in Google Fonts' answer");
  writeFileSync(file, Buffer.from(await (await get(url, "Saira Stencil One")).arrayBuffer()));
  return file;
}

mkdirSync(fonts, { recursive: true });
mkdirSync(out, { recursive: true });
const b64 = (f) => readFileSync(f).toString("base64");
const embed =
  `@font-face{font-family:'Clash Display';src:url(data:font/woff2;base64,${b64(await clash())}) format('woff2');font-weight:700;font-display:swap}` +
  `@font-face{font-family:'Saira Stencil One';src:url(data:font/woff2;base64,${b64(await saira())}) format('woff2');font-display:block}`;

const parts = {
  __EMBED__: embed,
  __HAND__: hand("hi-i-m-tom"),
  __HAND_WALL__: `{${["tom", "ttdevs", "larsson", "tt"].map((w) => `"${w}": ${hand(w)}`).join(", ")}}`,
  __PAL__: readFileSync(join(root, "pitch/assets/epa_pal.json"), "utf8").trim(),
};
let page = readFileSync(join(root, "pitch/paint.src.html"), "utf8");
for (const [key, value] of Object.entries(parts)) {
  if (!page.includes(key))
    throw new Error(
      `pitch/paint.src.html has no ${key} any more: remove it from tools/pitch/build.mjs`,
    );
  page = page.replaceAll(key, () => value);
}
const left = page.match(/__[A-Z_]{3,}__/);
if (left)
  throw new Error(
    `pitch/paint.src.html asks for ${left[0]}, which tools/pitch/build.mjs doesn't fill`,
  );
writeFileSync(join(out, "paint.html"), page);

// Pictures: pitch/assets holds only what is free to publish (CC0, or from a public repo). Pictures from a project
// whose repo is private come from its live site, fetched once into .cache/pitch-media and never put in git.
const remote = { "rvf_photo.jpg": "https://raddavarfruberga.se/img/vardfruberga-entre.jpg" };
const media = join(root, ".cache/pitch-media");
mkdirSync(media, { recursive: true });
for (const [name, url] of Object.entries(remote)) {
  const file = join(media, name);
  if (!existsSync(file))
    writeFileSync(file, Buffer.from(await (await get(url, name)).arrayBuffer()));
}
const assets = join(out, "assets");
rmSync(assets, { force: true, recursive: true });
mkdirSync(assets);
for (const name of readdirSync(join(root, "pitch/assets")))
  symlinkSync(join(root, "pitch/assets", name), join(assets, name));
for (const name of Object.keys(remote)) symlinkSync(join(media, name), join(assets, name));
console.log("Built .cache/pitch/paint.html");

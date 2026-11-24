// Builds the paint pitch (pitch/paint.src.html) into .cache/pitch/paint.html: fonts and hand-written words go
// into the page, the pictures are linked from pitch/assets.
// --site also puts it into the built site (out/) as /next (behind its key, middleware.ts), pictures copied to
// /next/assets/: `npm run build` runs it after next build, so Vercel deploys the pitch at ttdevs.com/next.
// The fonts are fetched once into .cache/fonts and never go into git: Clash Display's licence (ITF FFL, section 02)
// does not allow the font file in a public repository; serving it on our own site is allowed.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { TAG_LIMITS } from "../../api/tags.ts";

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

// Two more free fonts (both SIL OFL): Sedgwick Ave Display, a marker hand taken from graffiti handwriting (raddavarfruberga's
// banner words); Inter, the clean text face of the neon labels and the form (one variable file, weights 400 to 700).
async function google(name, family, what) {
  const file = join(fonts, name);
  if (existsSync(file)) return file;
  const css = await (
    await get(`https://fonts.googleapis.com/css2?family=${family}&display=block`, what)
  ).text();
  const url = css
    .match(/url\((https:[^)]+\.woff2)\)/g)
    ?.at(-1)
    ?.slice(4, -1);
  if (!url) throw new Error(`Couldn't find ${what}'s woff2 in Google Fonts' answer`);
  writeFileSync(file, Buffer.from(await (await get(url, what)).arrayBuffer()));
  return file;
}

mkdirSync(fonts, { recursive: true });
mkdirSync(out, { recursive: true });
const b64 = (f) => readFileSync(f).toString("base64");
const embed =
  `@font-face{font-family:'Clash Display';src:url(data:font/woff2;base64,${b64(await clash())}) format('woff2');font-weight:700;font-display:swap}` +
  `@font-face{font-family:'Saira Stencil One';src:url(data:font/woff2;base64,${b64(await saira())}) format('woff2');font-display:block}` +
  `@font-face{font-family:'Sedgwick Ave Display';src:url(data:font/woff2;base64,${b64(await google("SedgwickAveDisplay.woff2", "Sedgwick+Ave+Display", "Sedgwick Ave Display"))}) format('woff2');font-display:block}` +
  `@font-face{font-family:'Inter';src:url(data:font/woff2;base64,${b64(await google("Inter.woff2", "Inter:wght@400..700", "Inter"))}) format('woff2');font-weight:400 700;font-display:block}` +
  // the front's code poster (Tom 11-24): the name in Archivo Expanded, he is drawn in JetBrains Mono (both SIL OFL)
  `@font-face{font-family:'Archivo';src:url(data:font/woff2;base64,${b64(await google("ArchivoExpandedBlack.woff2", "Archivo:wdth,wght@125,900", "Archivo"))}) format('woff2');font-weight:900;font-stretch:125%;font-display:block}` +
  `@font-face{font-family:'JetBrains Mono';src:url(data:font/woff2;base64,${b64(await google("JetBrainsMono.woff2", "JetBrains+Mono:wght@500..800", "JetBrains Mono"))}) format('woff2');font-weight:500 800;font-display:block}`;

const parts = {
  __EMBED__: embed,
  __TOKENS__: readFileSync(join(root, "src/design/tokens.css"), "utf8"), // the site's own colours, sizes and speeds: one source
  __HAND__: hand("hi-i-m-tom"),
  __HAND_WALL__: `{${["tom", "ttdevs", "larsson", "tt"].map((w) => `"${w}": ${hand(w)}`).join(", ")}}`,
  __TAG_LIMITS__: JSON.stringify(TAG_LIMITS), // what one tag may hold: the store's own numbers (api/tags.ts)
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
// The page's own script rule, on top of the site's header (vercel.json): only its inline scripts, by their hash, and
// three from jsDelivr at the pinned version run here. Hashed last, after every change to the page's text.
function withScriptRule(html) {
  // every script is either inline with no attributes (hashed here) or loaded by src: anything else would be blocked
  const odd = [...html.matchAll(/<script(\s[^>]*)?>/g)].find(
    (m) => m[1] && !/^\s+src="[^"]+"$/.test(m[1]),
  );
  if (odd)
    throw new Error(`pitch/paint.src.html has ${odd[0]}: give it no attributes, or load it by src`);
  const hashes = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(
    (m) => `'sha256-${createHash("sha256").update(m[1], "utf8").digest("base64")}'`,
  );
  const rule = [
    `script-src ${hashes.join(" ")} https://cdn.jsdelivr.net/npm/three@0.147.0/`,
    "worker-src blob:",
    "object-src 'none'",
    "base-uri 'none'",
  ].join("; ");
  const at = '<meta charset="utf-8">\n';
  if (!html.includes(at))
    throw new Error('pitch/paint.src.html lost its <meta charset="utf-8"> line');
  return html.replace(at, `${at}<meta http-equiv="Content-Security-Policy" content="${rule}">\n`);
}
// the stencil's frames (media/, below) exist only on a PC that has them; elsewhere the page asks for none
const noMedia = (p) => {
  if (!p.includes("const HAS_MEDIA = true;"))
    throw new Error("Couldn't find HAS_MEDIA in pitch/paint.src.html");
  return p.replace("const HAS_MEDIA = true;", "const HAS_MEDIA = false;");
};
const hasMedia = existsSync(join(root, ".cache/pitch-media/stencil"));
writeFileSync(join(out, "paint.html"), withScriptRule(hasMedia ? page : noMedia(page)));

// The front page (pitch, 11-20, landonorris.com's techniques): the same fonts and tokens, no 3D. /next/front on the
// site. GSAP (ScrollTrigger) and Lenis go into the page from node_modules as inline scripts, so the script rule
// hashes them like the page's own; the signature is pitch/sign-d.json (a traced "Tom": its shape and the centre
// lines it draws along).
const lib = (f) =>
  readFileSync(join(root, "node_modules", f), "utf8").replaceAll("</script", "<\\/script");
const libs = ["gsap/dist/gsap.min.js", "gsap/dist/ScrollTrigger.min.js", "lenis/dist/lenis.min.js"]
  .map((f) => `<script>${lib(f)}</script>`)
  .join("\n");
let front = readFileSync(join(root, "pitch/front.src.html"), "utf8")
  .replaceAll("__EMBED__", () => embed)
  .replaceAll("__TOKENS__", () => parts.__TOKENS__)
  .replaceAll("__LIBS__", () => libs)
  .replaceAll("__SIGN__", () => readFileSync(join(root, "pitch/sign-d.json"), "utf8").trim());
if (/__[A-Z_]{3,}__/.test(front))
  throw new Error("pitch/front.src.html asks for a part the build doesn't fill");
writeFileSync(join(out, "front.html"), withScriptRule(front)); // the site copy below is changed first, then hashed
// its product screens: /projects/ on the site (public/projects); the same path in the local pitch folder
rmSync(join(out, "projects"), { force: true, recursive: true });
symlinkSync(join(root, "public/projects"), join(out, "projects"));

// Pictures: pitch/assets holds only what is free to publish (CC0, or from a public repo).
const assets = join(out, "assets");
rmSync(assets, { force: true, recursive: true });
mkdirSync(assets);
for (const name of readdirSync(join(root, "pitch/assets")))
  symlinkSync(join(root, "pitch/assets", name), join(assets, name));
// Tom's own photos and what is made from them (the stencil of his head turn) stay out of git and off the site until
// he says otherwise: they live in .cache/pitch-media and show only in the local pitch, as media/. The page draws
// nothing where one is missing, so /next simply has no stencil.
const media = join(out, "media");
rmSync(media, { force: true, recursive: true });
if (existsSync(join(root, ".cache/pitch-media")))
  symlinkSync(join(root, ".cache/pitch-media"), media);
console.log("Built .cache/pitch/paint.html");

if (process.argv.includes("--site")) {
  const site = join(root, "out");
  if (!existsSync(join(site, "index.html")))
    throw new Error("Couldn't find the built site in out/. Run: npm run build");
  // the page is /next (no trailing slash), so its relative "assets/…" would point at /assets/: make them /next/assets/
  const nextPage = noMedia(page).replace(/(["'`])assets\//g, "$1/next/assets/"); // media/ never goes to the site
  // an unquoted CSS url(assets/…) is not rewritten and 404s on /next (the flyer's cover, 11-23): quote the path
  const unquoted = nextPage.match(/url\(\s*assets\/[^)]*\)/g);
  if (unquoted)
    throw new Error(
      `Unquoted picture path on /next: ${unquoted.join(", ")}. Write url("assets/…") so the build can point it at /next/assets/.`,
    );
  writeFileSync(join(site, "next.html"), withScriptRule(nextPage));
  const siteAssets = join(site, "next/assets");
  rmSync(siteAssets, { force: true, recursive: true });
  mkdirSync(siteAssets, { recursive: true });
  // the whole folder, sub-folders too (the portrait's turn/ frames); links are copied as the files they point at
  cpSync(assets, siteAssets, { recursive: true, dereference: true });
  mkdirSync(join(site, "next"), { recursive: true });
  // the front is /next/front: its relative paths would point under /next/. Paths are changed BEFORE the script rule
  // hashes the page: a change after it would no longer match the hash, and the browser would block the page's scripts
  writeFileSync(
    join(site, "next/front.html"),
    withScriptRule(
      front
        .replace(/(["'`])assets\//g, "$1/next/assets/")
        .replace(/(["'`])projects\//g, "$1/projects/")
        .replace(/(["'`])paint\.html/g, "$1/next"),
    ),
  );
  console.log("Put the pitch into out/next.html (/next)");
}

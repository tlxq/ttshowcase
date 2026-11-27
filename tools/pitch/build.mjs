// Builds the paint pitch (pitch/paint.src.html, its style and script in the parts of pitch/paint/) into .cache/pitch/paint.html: fonts and hand-written words go
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
import * as nodeModule from "node:module";
import { join, resolve } from "node:path";
import { fontProblems } from "./fonts-used.mjs";
import { nodeProblem } from "./need-node.mjs";
import { fillParts, readParts } from "./paint-parts.mjs";

// before anything that needs a new Node, so an old one gets this sentence and not a cryptic load error
const nodeSays = nodeProblem(
  process.versions.node,
  typeof nodeModule.stripTypeScriptTypes === "function",
);
if (nodeSays) {
  console.error(nodeSays);
  process.exit(1);
}
const { TAG_LIMITS } = await import("../../api/tags.ts");

const root = resolve(import.meta.dirname, "../..");
const fonts = join(root, ".cache/fonts");
// PITCH_OUT: tools/pitch/watch.mjs builds into a folder beside it and swaps it in only when the build worked
const out = process.env.PITCH_OUT
  ? resolve(root, process.env.PITCH_OUT)
  : join(root, ".cache/pitch");
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

// Google Fonts' answer lists one face per alphabet; the Latin one is marked /* latin */. Its link doesn't always end in
// .woff2 (sometimes it is .../l/font?kit=...), so the face is found by its format('woff2') label, not the link's ending.
function latinWoff2(css) {
  const faces = [
    ...css.matchAll(
      /(?:\/\*\s*([\w-]+)\s*\*\/\s*)?@font-face\s*\{[^}]*?url\((https:[^)]+)\)\s*format\(['"]woff2['"]\)/g,
    ),
  ];
  return (faces.find((f) => f[1] === "latin") ?? faces.at(-1))?.[2];
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
  const url = latinWoff2(css);
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
  const url = latinWoff2(css);
  if (!url) throw new Error(`Couldn't find ${what}'s woff2 in Google Fonts' answer`);
  writeFileSync(file, Buffer.from(await (await get(url, what)).arrayBuffer()));
  return file;
}

mkdirSync(fonts, { recursive: true });
mkdirSync(out, { recursive: true });
const b64 = (f) => readFileSync(f).toString("base64");
const face = {
  clash: `@font-face{font-family:'Clash Display';src:url(data:font/woff2;base64,${b64(await clash())}) format('woff2');font-weight:700;font-display:swap}`,
  saira: `@font-face{font-family:'Saira Stencil One';src:url(data:font/woff2;base64,${b64(await saira())}) format('woff2');font-display:block}`,
  sedgwick: `@font-face{font-family:'Sedgwick Ave Display';src:url(data:font/woff2;base64,${b64(await google("SedgwickAveDisplay.woff2", "Sedgwick+Ave+Display", "Sedgwick Ave Display"))}) format('woff2');font-display:block}`,
  inter: `@font-face{font-family:'Inter';src:url(data:font/woff2;base64,${b64(await google("Inter.woff2", "Inter:wght@400..700", "Inter"))}) format('woff2');font-weight:400 700;font-display:block}`,
  // the front's code poster (Tom 11-24): the name in Archivo Expanded, he is drawn in JetBrains Mono (both SIL OFL); the walk's start says the name in them too
  archivo: `@font-face{font-family:'Archivo';src:url(data:font/woff2;base64,${b64(await google("ArchivoExpandedBlack.woff2", "Archivo:wdth,wght@125,900", "Archivo"))}) format('woff2');font-weight:900;font-stretch:125%;font-display:block}`,
  mono: `@font-face{font-family:'JetBrains Mono';src:url(data:font/woff2;base64,${b64(await google("JetBrainsMono.woff2", "JetBrains+Mono:wght@500..800", "JetBrains Mono"))}) format('woff2');font-weight:500 800;font-display:block}`,
};
// each page embeds only the fonts it uses (audit N-30: base64 does not compress, so an unused font is bytes before first paint);
// fontProblems (tools/pitch/fonts-used.mjs) checks both built pages against this, canvas font strings included
const walkFonts = face.clash + face.saira + face.inter + face.archivo + face.mono;
const frontFontsEmbedded = face.sedgwick + face.inter + face.archivo + face.mono;
function fontsOk(html, page) {
  const problems = fontProblems(html, page);
  if (problems.length) throw new Error(problems.join("\n"));
}

// the contact form's send (src/content/sendContact.ts): the same function the site's form imports, as plain JavaScript for the pages' inline scripts
function mailSend() {
  const ts = readFileSync(join(root, "src/content/sendContact.ts"), "utf8");
  const at = ts.indexOf("export async function sendContact(");
  if (at < 0 || ts.indexOf("export ", at + 1) >= 0 || /^import /m.test(ts))
    throw new Error("src/content/sendContact.ts must hold one exported function and no imports");
  const js = nodeModule
    .stripTypeScriptTypes(ts)
    .slice(at)
    .replace("export ", "")
    .replace(/[ \t]+$/gm, "");
  return `(${js.trimEnd()})`;
}
// the front's frame pacing (pitch/pace.js, S-2): plain JavaScript with one exported function, put into the page as that function
function pace() {
  const js = readFileSync(join(root, "pitch/pace.js"), "utf8");
  if (
    !js.includes("export function makePace(") ||
    js.indexOf("export ") !== js.lastIndexOf("export ")
  )
    throw new Error("pitch/pace.js must hold one exported function, makePace");
  if (/^import /m.test(js)) throw new Error("pitch/pace.js must have no imports");
  return `(${js.slice(js.indexOf("export function makePace(") + 7).trimEnd()})`;
}
const parts = {
  __EMBED__: walkFonts,
  __TOKENS__: readFileSync(join(root, "src/design/tokens.css"), "utf8"), // the site's own colours, sizes and speeds: one source
  __HAND__: hand("hi-i-m-tom"),
  __HAND_WALL__: `{${["tom", "ttdevs", "larsson", "tt"].map((w) => `"${w}": ${hand(w)}`).join(", ")}}`,
  __MAIL_WORDS__: JSON.stringify(
    JSON.parse(readFileSync(join(root, "src/content/mailWords.json"), "utf8")),
  ), // the contact form's words: the site's own file (src/look/MailForm.tsx reads it too)
  __MAIL_SEND__: mailSend(), // the contact form's send: the site's own file (src/look/MailForm.tsx imports it too)
  __TAG_LIMITS__: JSON.stringify(TAG_LIMITS), // what one tag may hold: the store's own numbers (api/tags.ts)
};
// the page's style and script come first, from their parts (pitch/paint/): they hold the __HAND__ etc. filled below
let page = fillParts(
  readFileSync(join(root, "pitch/paint.src.html"), "utf8"),
  readParts(join(root, "pitch/paint")),
);
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
// Vercel BotID (Tom 11-25): its browser part marks the tag and mail sends as a person's, and api/tags.ts and
// api/contact.ts refuse the rest. Inlined from node_modules like the libs below, so the script rule hashes it; its
// checker script comes from this site (vercel.json's rewrites), so the rule also allows 'self'.
const PROTECT = [
  { path: "/api/tags", method: "POST" },
  { path: "/api/contact", method: "POST" },
];
function withBotId(html) {
  let core = readFileSync(join(root, "node_modules/botid/dist/client/core/index.mjs"), "utf8");
  const dev = 'process.env.NODE_ENV!=="development"',
    out = "export{I as initBotId,M as validateProtectedRoutes};";
  if (!core.includes(dev) || (!core.endsWith(out + "\n") && !core.endsWith(out)))
    throw new Error("botid's client changed shape: check tools/pitch/build.mjs withBotId");
  // functions, not strings, as replacements: botid's code holds "$&", which a string replacement expands (11-25)
  core = core
    .replace(dev, () => "true")
    .replace(out, () => `I(${JSON.stringify({ protect: PROTECT })});`);
  const at = '<meta charset="utf-8">\n'; // the script rule's meta goes in right after this line, so it is above this script
  if (!html.includes(at)) throw new Error('a pitch page lost its <meta charset="utf-8"> line');
  const tag = `<script>(()=>{${core.replaceAll("</script", "<\\/script")}})()</script>\n`,
    done = html.replace(at, () => at + tag);
  if (!done.includes(tag)) throw new Error("botid's script changed on its way into the page");
  return done;
}
function withScriptRule(html) {
  // every script is either inline with no attributes (hashed here) or loaded by src: anything else would be blocked.
  // Structured data (type="application/ld+json") is never run, so the rule doesn't need it.
  const odd = [...html.matchAll(/<script(\s[^>]*)?>/g)].find(
    (m) => m[1] && !/^\s+src="[^"]+"$/.test(m[1]) && m[1] !== ' type="application/ld+json"',
  );
  if (odd)
    throw new Error(`pitch/paint.src.html has ${odd[0]}: give it no attributes, or load it by src`);
  const hashes = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(
    (m) => `'sha256-${createHash("sha256").update(m[1], "utf8").digest("base64")}'`,
  );
  const rule = [
    `script-src ${hashes.join(" ")} 'self' https://cdn.jsdelivr.net/npm/three@0.147.0/`,
    "worker-src blob:",
    "object-src 'none'",
    "base-uri 'none'",
  ].join("; ");
  const at = '<meta charset="utf-8">\n';
  if (!html.includes(at))
    throw new Error('pitch/paint.src.html lost its <meta charset="utf-8"> line');
  return html.replace(at, `${at}<meta http-equiv="Content-Security-Policy" content="${rule}">\n`);
}
fontsOk(page, "the walk");
writeFileSync(join(out, "paint.html"), withScriptRule(withBotId(page)));

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
  .replaceAll("__EMBED__", () => frontFontsEmbedded)
  .replaceAll("__TOKENS__", () => parts.__TOKENS__)
  .replaceAll("__MAIL_WORDS__", () => parts.__MAIL_WORDS__)
  .replaceAll("__MAIL_SEND__", () => parts.__MAIL_SEND__)
  // where a form sent without JavaScript posts to (api/contact.ts answers it with a plain page): the words file's `action`
  .replaceAll("__MAIL_ACTION__", () => JSON.parse(parts.__MAIL_WORDS__).action)
  .replaceAll("__PACE__", () => pace())
  .replaceAll("__LIBS__", () => libs)
  .replaceAll("__SIGN__", () => readFileSync(join(root, "pitch/sign-d.json"), "utf8").trim());
if (/__[A-Z_]{3,}__/.test(front))
  throw new Error("pitch/front.src.html asks for a part the build doesn't fill");
fontsOk(front, "the front");
writeFileSync(join(out, "front.html"), withScriptRule(withBotId(front))); // the site copy below is changed first, then hashed
// its product screens: /projects/ on the site (public/projects); the same path in the local pitch folder
rmSync(join(out, "projects"), { force: true, recursive: true });
symlinkSync(join(root, "public/projects"), join(out, "projects"));
// the pages' icon: /icon.svg on the site (app/icon.svg); the same path in the local pitch folder
rmSync(join(out, "icon.svg"), { force: true });
symlinkSync(join(root, "app/icon.svg"), join(out, "icon.svg"));

// Pictures: pitch/assets holds only what is free to publish (CC0, or from a public repo).
const assets = join(out, "assets");
rmSync(assets, { force: true, recursive: true });
mkdirSync(assets);
for (const name of readdirSync(join(root, "pitch/assets")))
  symlinkSync(join(root, "pitch/assets", name), join(assets, name));
// Tom's own photos stay out of git and off the site until he says otherwise: they live in .cache/pitch-media and
// show only in the local pitch, as media/. (The stencil of his head turn left it 11-24: Tom said publish, assets/stencil.)
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
  const nextPage = page.replace(/(["'`])assets\//g, "$1/next/assets/"); // media/ never goes to the site
  // an unquoted CSS url(assets/…) is not rewritten and 404s on /next (the flyer's cover, 11-23): quote the path
  const unquoted = nextPage.match(/url\(\s*assets\/[^)]*\)/g);
  if (unquoted)
    throw new Error(
      `Unquoted picture path on /next: ${unquoted.join(", ")}. Write url("assets/…") so the build can point it at /next/assets/.`,
    );
  writeFileSync(join(site, "next.html"), withScriptRule(withBotId(nextPage)));
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
      withBotId(
        front
          .replace(/(["'`])assets\//g, "$1/next/assets/")
          .replace(/(["'`])projects\//g, "$1/projects/")
          .replace(/(["'`])paint\.html/g, "$1/next"),
      ),
    ),
  );
  console.log("Put the pitch into out/next.html (/next)");
}

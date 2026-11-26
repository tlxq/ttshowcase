// The site's Content-Security-Policy, one per page. Next's static pages carry their bootstrap and data as inline
// scripts, so a header can only drop 'unsafe-inline' if it names each script by its hash. This reads every page in
// out/, hashes its inline scripts and writes out/csp-manifest.json: { "/privacy": "<whole policy>", ... }.
// middleware.ts (Vercel) and tools/serve.py (this PC) send the entry for the page's path; "default" (the 404 page's)
// goes to any path without a page. This is the only place the policy is written. Run by `npm run build`, last.
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SCRIPTS = "https://cdn.jsdelivr.net/npm/three@0.147.0/";

/** The policy for a page whose inline scripts have these hashes. */
export function policy(hashes) {
  const scripts = ["'self'", ...hashes.map((h) => `'${h}'`), SCRIPTS].join(" ");
  return [
    "default-src 'self'",
    `script-src ${scripts}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "worker-src 'self' blob:",
    "frame-src https://www.eparadar.se https://raddavarfruberga.se",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

// a script the browser runs: no type, or a JavaScript one. Data blocks (json, ld+json) are never blocked by a CSP.
const RUNS = /^(|module|(text|application)\/(x-)?javascript)$/i;

/** The hashes of a page's inline scripts (the ones with no src). */
export function inlineHashes(html) {
  const found = new Set();
  for (const [, attrs, body] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (/\ssrc\s*=/i.test(attrs)) continue;
    const type = /\stype\s*=\s*["']?([^"'\s>]*)/i.exec(attrs)?.[1] ?? "";
    if (!RUNS.test(type)) continue;
    found.add("sha256-" + createHash("sha256").update(body, "utf8").digest("base64"));
  }
  return [...found].sort();
}

/** "/privacy" for out/privacy.html, "/next/front" for out/next/front.html, "/" for out/index.html. */
export function pathOf(file) {
  const p = "/" + file.replace(/\\/g, "/").replace(/\.html$/, "");
  return p === "/index" ? "/" : p.replace(/\/index$/, "");
}

function pages(dir, rel = "") {
  return readdirSync(join(dir, rel), { withFileTypes: true }).flatMap((e) => {
    const r = rel ? `${rel}/${e.name}` : e.name;
    return e.isDirectory() ? pages(dir, r) : e.name.endsWith(".html") ? [r] : [];
  });
}

export function build(dir) {
  const manifest = {};
  for (const file of pages(dir)) {
    manifest[pathOf(file)] = policy(inlineHashes(readFileSync(join(dir, file), "utf8")));
  }
  if (!manifest["/404"]) throw new Error("csp manifest: no out/404.html");
  manifest.default = manifest["/404"];
  return manifest;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const out = join(fileURLToPath(new URL("../..", import.meta.url)), "out");
  const manifest = build(out);
  writeFileSync(join(out, "csp-manifest.json"), JSON.stringify(manifest));
  const longest = Math.max(...Object.values(manifest).map((v) => v.length));
  console.log(
    `CSP manifest: ${Object.keys(manifest).length - 1} pages, longest policy ${longest} bytes`,
  );
}

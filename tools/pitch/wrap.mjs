// Wraps one pitch check (or sheet script) for playwright-cli run-code so it needs no network (S-flake, 11-27: tour-phone and
// tagsfull-phone failed on ERR_NETWORK_CHANGED because three.js came from jsDelivr).
//  - the page's pinned three.js files (pitch/paint.src.html) are answered from tools/pitch/vendor/three-0.147.0/, byte for byte what jsDelivr serves;
//  - any other request that leaves this PC is stopped and fails the run: "a check made an outside request: <urls>".
// The live site and the page itself are unchanged: the page still asks jsDelivr; only the checks' browser answers for it.
// Usage: node tools/pitch/wrap.mjs <script.js> > wrapped.js   (the script is an `async page => {...}` function that returns a JSON string)
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const VENDOR = join(dirname(fileURLToPath(import.meta.url)), "vendor", "three-0.147.0");
export const CDN = "https://cdn.jsdelivr.net/npm/three@0.147.0/";

export function wrap(script, vendor = VENDOR) {
  return `async page => {
  const outside = [];
  const CDN = ${JSON.stringify(CDN)}, VENDOR = ${JSON.stringify(vendor)}, FILES = ${JSON.stringify(readdirSync(vendor))};
  await page.context().route(u => !/^(about|data|blob):/.test(u.href) && !['127.0.0.1', 'localhost'].includes(u.hostname), route => {
    const url = route.request().url(), name = url.split('/').pop().split('?')[0];
    if (url.startsWith(CDN) && FILES.includes(name)) return route.fulfill({ path: VENDOR + '/' + name, contentType: 'text/javascript' }); // a pinned file with no copy here is an outside request like any other
    outside.push(url); return route.abort('blockedbyclient');
  });
  let out, thrown;
  try { out = await (
${script}
  )(page); } catch (e) { thrown = e; }
  const said = outside.length ? 'a check made an outside request: ' + [...new Set(outside)].join(' ') : '';
  if (thrown) { if (!said) throw thrown; return JSON.stringify({ errs: [said, 'the check stopped with: ' + String(thrown && thrown.message || thrown).slice(0, 300)] }); }
  if (!said) return out;
  let res; try { res = JSON.parse(out); } catch {}
  if (res && Array.isArray(res.errs)) { res.errs.push(said); return JSON.stringify(res); }
  return JSON.stringify({ errs: [said, 'the check returned something that is not a result: ' + String(out).slice(0, 200)] });
}
`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const file = process.argv[2];
  if (!file) {
    console.error("Usage: node tools/pitch/wrap.mjs <script.js>");
    process.exit(2);
  }
  process.stdout.write(wrap(readFileSync(file, "utf8")));
}

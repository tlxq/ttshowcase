// Every form in the page sources sends with method="post": without it, a Send that runs before the script has loaded (or after it
// failed) is a GET and puts name, email and message in the address bar, the browser's history and the request log (audit N-41).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
// Every place a page's HTML can come from: the site (src, app), the functions that write HTML (api), the pitch pages and their
// parts, and the public folder. tools/ is not shipped (its local editor, tools/write, is never served).
const SCANNED = ["src", "app", "api", "pitch", "public"];
const files = [];
function walk(dir) {
  for (const e of readdirSync(join(root, dir), { withFileTypes: true })) {
    const rel = dir + "/" + e.name;
    if (e.isDirectory()) walk(rel);
    else if (/\.(tsx?|jsx?|mjs|html)$/.test(e.name) && !/\.test\./.test(e.name)) files.push(rel);
  }
}
for (const d of SCANNED) walk(d);

test("every form in the page sources says method=post", () => {
  let seen = 0;
  for (const f of files) {
    const text = readFileSync(join(root, f), "utf8");
    for (const m of text.matchAll(/<form\b[^>]*>/g)) {
      seen++;
      assert.match(
        m[0],
        /\smethod=["']post["']/i,
        `${f}: ${m[0].slice(0, 80)} has no method="post"`,
      );
    }
  }
  assert.ok(seen >= 5, `expected the site's forms, found ${seen}`);
});

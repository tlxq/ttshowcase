// Every form in the page sources sends with method="post": without it, a Send that runs before the script has loaded (or after it
// failed) is a GET and puts name, email and message in the address bar, the browser's history and the request log (audit N-41).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const files = [
  "pitch/front.src.html",
  "pitch/paint.src.html",
  ...readdirSync(join(root, "pitch/paint"))
    .filter((f) => f.endsWith(".js"))
    .map((f) => "pitch/paint/" + f),
  ...readdirSync(join(root, "src/look"))
    .filter((f) => f.endsWith(".tsx"))
    .map((f) => "src/look/" + f),
];

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
  assert.ok(seen >= 4, `expected the site's forms, found ${seen}`);
});

// A mail form sent without JavaScript must post to the server's answer page (api/contact.ts), not to the page it sits on
// (a static page answers a post with 405 and the visitor loses the text).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

test("the front's mail form posts to /api/contact", () => {
  const html = readFileSync(join(root, "pitch/front.src.html"), "utf8");
  const form = /<form\b[^>]*id="mail"[^>]*>/.exec(html)?.[0] ?? "";
  // the address itself is written once, in the words file (the build fills it in)
  assert.match(form, /\saction=["']__MAIL_ACTION__["']/);
  const words = JSON.parse(readFileSync(join(root, "src/content/mailWords.json"), "utf8"));
  assert.equal(words.action, "/api/contact");
  assert.match(form, /\smethod=["']post["']/i);
});

test("the site's and the walk's mail forms post there too", () => {
  const site = readFileSync(join(root, "src/look/MailForm.tsx"), "utf8");
  assert.match(/<form\b[^>]*>/.exec(site)?.[0] ?? "", /\saction=\{mail\.action\}/);
  const walk = readFileSync(join(root, "pitch/paint/50-end.js"), "utf8");
  assert.match(
    /<form\b[^>]*id="mail"[^>]*>/.exec(walk)?.[0] ?? "",
    /\saction="\$\{MAIL\.action\}"/,
  );
});

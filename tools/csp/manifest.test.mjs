import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { inlineHashes, pathOf, policy } from "./manifest.mjs";

const h = (s) => "sha256-" + createHash("sha256").update(s).digest("base64");

test("hashes every script the browser runs, once, and nothing else", () => {
  const html = [
    "<script>a()</script>",
    "<script>a()</script>",
    '<script id="_R_">b()</script>',
    '<script type="module">c()</script>',
    '<script src="/x.js"></script>',
    '<script type="application/ld+json">{"a":1}</script>',
    '<script type="application/json">{}</script>',
  ].join("");
  assert.deepEqual(inlineHashes(html), [h("a()"), h("b()"), h("c()")].sort());
});

test("the policy names the hashes and never allows any inline script", () => {
  const p = policy([h("a()")]);
  assert.match(p, new RegExp(`script-src 'self' '${h("a()")}'`));
  assert.doesNotMatch(p, /script-src[^;]*'unsafe-(inline|eval)'/);
  assert.match(p, /frame-ancestors 'none'/);
});

test("file names become the addresses Vercel serves", () => {
  assert.equal(pathOf("index.html"), "/");
  assert.equal(pathOf("privacy.html"), "/privacy");
  assert.equal(pathOf("next/front.html"), "/next/front");
  assert.equal(pathOf("a/index.html"), "/a");
});

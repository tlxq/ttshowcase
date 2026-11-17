import { test } from "node:test";
import assert from "node:assert/strict";
import { gate, cookieValue, sameKey, cleanPath, config } from "../../middleware.ts";

const K = "s3cret-key";
const u = (p: string) => new URL("https://ttdevs.com" + p);

test("pages outside /next are never touched", () => {
  assert.deepEqual(gate(u("/"), null, K), { kind: "pass" });
  assert.deepEqual(gate(u("/nextish"), null, K), { kind: "pass" });
  assert.deepEqual(gate(u("/?key=wrong"), null, K), { kind: "pass" });
});

test("/next without key or cookie is the normal 404", () => {
  assert.equal(gate(u("/next.html"), null, K).kind, "not-found");
  assert.equal(gate(u("/next.txt"), null, K).kind, "not-found");
  assert.equal(gate(u("/next"), null, K).kind, "not-found");
  assert.equal(gate(u("/next/work"), "other=1", K).kind, "not-found");
});

test("a wrong key or cookie is a 404", () => {
  assert.equal(gate(u("/next?key=nope"), null, K).kind, "not-found");
  assert.equal(gate(u("/next"), "next_key=nope", K).kind, "not-found");
});

test("no PREVIEW_KEY set: /next is closed, even with an empty key", () => {
  assert.equal(gate(u("/next?key="), null, "").kind, "not-found");
  assert.equal(gate(u("/next"), "next_key=", undefined).kind, "not-found");
});

test("the right key sets the cookie and drops the key from the address", () => {
  const g = gate(u("/next/work?key=" + K + "&x=1"), null, K);
  assert.equal(g.kind, "redirect");
  if (g.kind !== "redirect") return;
  assert.equal(g.location, "/next/work?x=1");
  assert.match(
    g.setCookie,
    /^next_key=s3cret-key; Path=\/next; Max-Age=\d+; HttpOnly; SameSite=Lax; Secure$/,
  );
});

test("on plain http (the Tailscale dev server) the cookie isn't Secure, or the phone would drop it", () => {
  const g = gate(new URL("http://100.64.0.1:3000/next?key=" + K), null, K);
  assert.equal(g.kind, "redirect");
  if (g.kind === "redirect") assert.doesNotMatch(g.setCookie, /Secure/);
});

test("the right cookie lets the device in", () => {
  assert.deepEqual(gate(u("/next/work"), "a=1; next_key=" + K, K), { kind: "pass" });
});

test("helpers", () => {
  assert.equal(cookieValue("a=1; b=x%20y", "b"), "x y");
  assert.equal(cookieValue(null, "b"), null);
  assert.ok(sameKey("abc", "abc"));
  assert.ok(!sameKey("abc", "abd"));
  assert.ok(!sameKey("abc", "abcd"));
});

test("a key with symbols (Pass makes them) works through the link and the cookie", () => {
  const k = "a+b/c?d&e=f#g%h!";
  const g = gate(u("/next?key=" + encodeURIComponent(k)), null, k);
  assert.equal(g.kind, "redirect");
  if (g.kind !== "redirect") return;
  assert.deepEqual(gate(u("/next"), g.setCookie.split(";")[0] ?? null, k), { kind: "pass" });
});

test("a broken cookie is no cookie, not a crash", () => {
  assert.equal(cookieValue("next_key=%E0%A4%A", "next_key"), null);
  assert.equal(gate(u("/next"), "next_key=%E0%A4%A", K).kind, "not-found");
});

test("encoded or dotted addresses for /next are /next (Vercel serves files by the decoded path)", () => {
  for (const p of [
    "/%6Eext",
    "/%6eext",
    "/n%65xt.txt",
    "/%6E%65%78%74/",
    "/%256Eext",
    "/a/../next",
    "/%2e/next.html",
    "/next%2Ehtml",
  ]) {
    assert.equal(gate(u(p), null, K).kind, "not-found", p);
  }
  assert.equal(cleanPath("/%6Eext"), "/next");
  assert.equal(gate(u("/%6Eext"), "next_key=" + K, K).kind, "pass");
  assert.equal(gate(u("/%E0%A4%A"), null, K).kind, "pass");
});

test("the matcher sends every page and page-data request through the gate, but not plain assets", () => {
  const re = new RegExp("^" + config.matcher[0]!.replace("/(", "/(") + "$");
  for (const p of [
    "/",
    "/next",
    "/%6Eext",
    "/next.txt",
    "/n%65xt.txt",
    "/next.html",
    "/next/__next._tree.txt",
  ]) {
    assert.ok(re.test(p), p);
  }
  for (const p of ["/_next/static/chunks/a.js", "/share.jpg", "/icon.svg", "/fonts/a.woff2"]) {
    assert.ok(!re.test(p), p);
  }
});

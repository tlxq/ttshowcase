import { test } from "node:test";
import assert from "node:assert/strict";
import { gate, cookieValue, sameKey } from "../../middleware.ts";

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

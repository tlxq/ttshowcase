import { test } from "node:test";
import assert from "node:assert/strict";
import { cookieValue as fromMiddleware, sameKey as sameInMiddleware } from "../../middleware.ts";
import { cookieValue as fromAdmin, sameKey as sameInAdmin } from "../tags/admin.ts";

// middleware.ts has no imports on purpose, so it carries its own copy of these two helpers (audit N-23).
// Both copies answer the same cases, so one cannot drift from the other unseen.
const HEADERS: (string | null)[] = [
  null,
  "",
  "a=1",
  "a=1; b=xy",
  "  a = 1 ;b=2",
  "=nokey; b=2",
  "b",
  "b=",
  "a=1; a=2",
  "x=a=b",
  "a=1;;b=2",
];

test("cookieValue: the middleware's copy and the admin's copy read every header the same way", () => {
  for (const h of HEADERS) {
    for (const name of ["a", "b", "x", "missing", ""]) {
      assert.equal(fromMiddleware(h, name), fromAdmin(h, name), JSON.stringify([h, name]));
    }
  }
});

test("sameKey: both copies say yes and no for the same pairs", () => {
  const pairs: [string, string][] = [
    ["abc", "abc"],
    ["abc", "abd"],
    ["", ""],
    ["abc", ""],
    ["a".repeat(40), "a".repeat(40)],
    ["a".repeat(40), "a".repeat(41)],
    ["é", "é"],
  ];
  for (const [a, b] of pairs) {
    assert.equal(sameInMiddleware(a, b), sameInAdmin(a, b), JSON.stringify([a, b]));
  }
});

// The one known difference: the middleware's copy decodes %-escapes (it reads the preview key's cookie, which the
// site writes encoded); the admin's copy returns the text as it is (its cookie is base64url and has none).
// If this changes on purpose, change it in both files and in this test.
test("cookieValue: the one known difference is %-escapes", () => {
  assert.equal(fromMiddleware("b=x%20y", "b"), "x y");
  assert.equal(fromAdmin("b=x%20y", "b"), "x%20y");
});

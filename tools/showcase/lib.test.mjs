import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  colorOn,
  complete,
  misePins,
  painter,
  parseArgs,
  pitchNames,
  suggest,
  tick,
  took,
  versionIn,
  walkNames,
} from "./lib.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

test("reads the command, its words and the shared flags", () => {
  const f = parseArgs(["check", "walk", "route-phone", "--force", "--no-color"]);
  assert.equal(f.command, "check");
  assert.deepEqual(f.words, ["walk", "route-phone"]);
  assert.equal(f.force, true);
  assert.equal(f.color, false);
  assert.equal(parseArgs(["--wat"]).unknown, "--wat");
});

test("a typo gets the nearest command, nonsense gets none", () => {
  assert.equal(suggest("chek"), "check");
  assert.equal(suggest("stauts"), "status");
  assert.equal(suggest("zzzzzz"), null);
});

test("colour is off for NO_COLOR, --no-color, dumb terminals and pipes", () => {
  const on = parseArgs([]);
  assert.equal(colorOn(on, {}, true), true);
  assert.equal(colorOn(on, { NO_COLOR: "" }, true), false);
  assert.equal(colorOn(on, { TERM: "dumb" }, true), false);
  assert.equal(colorOn(on, {}, false), false);
  assert.equal(colorOn(parseArgs(["--no-color"]), {}, true), false);
  assert.equal(painter(false).ok("x"), "x");
});

test("times and ticks read the same everywhere", () => {
  assert.equal(took(4100), "4.1 s");
  assert.equal(took(42000), "42 s");
  assert.equal(took(102000), "1m 42s");
  assert.equal(tick(painter(false), "ok", "dev", "ready"), "✓ dev             ready");
});

test("completion offers commands, parts and the real walk and check names", () => {
  assert.deepEqual(complete(["st"], root), ["status", "stop"]);
  assert.deepEqual(complete(["check", ""], root), ["code", "walk", "pitch", "--quick", "--force"]);
  assert.ok(complete(["check", "walk", "route"], root).includes("route-phone"));
  assert.ok(complete(["check", "pitch", "contrast-"], root).includes("contrast-phone"));
  assert.deepEqual(complete(["stop", ""], root), ["dev", "pitch"]);
  assert.ok(walkNames(root).length > 5);
  assert.ok(pitchNames(root).includes("tour-desktop"));
});

test("reads the mise pins and the versions tools print", () => {
  const pins = misePins('[tools]\nnode = "26.7.0"\n"npm:vercel" = "58.4.4"\n\n[env]\nX = "1"\n');
  assert.deepEqual(pins, { node: "26.7.0", "npm:vercel": "58.4.4" });
  assert.equal(versionIn("v26.7.0"), "26.7.0");
  assert.equal(versionIn("Vercel CLI 58.4.4"), "58.4.4");
  assert.equal(versionIn("nothing"), null);
});

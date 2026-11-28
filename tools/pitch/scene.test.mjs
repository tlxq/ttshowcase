// The scene list (batch 9): tools/pitch/scene.json is what the inventory check compares the walk's lights and named objects with, and
// pitch:pair's arguments are read before any browser starts.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(import.meta.url), "../../..");
const scene = JSON.parse(readFileSync(join(root, "tools", "pitch", "scene.json"), "utf8"));

test("scene.json lists lights and named objects for a laptop and a phone", () => {
  assert.deepEqual(Object.keys(scene).sort(), ["laptop", "phone"]);
  for (const screen of Object.values(scene)) {
    assert.deepEqual(Object.keys(screen).sort(), ["lights", "named"]);
    for (const list of Object.values(screen)) {
      assert.ok(Array.isArray(list) && list.every((n) => typeof n === "string" && n !== ""));
    }
    // the back door's lamp sat inside a comment for five rounds of the building site: it is named, so it is listed by name
    assert.ok(screen.lights.includes("back-door-lamp"));
    assert.ok(screen.named.includes("building-site"));
  }
});

test("the list keeps characters the check's sed and quoting can carry", () => {
  const compact = JSON.stringify(scene);
  assert.doesNotMatch(compact, /[#&\\'`$]/);
});

test("the inventory check is in the pitch's list of checks, and its file is there", () => {
  const run = readFileSync(join(root, "tools", "pitch", "run.sh"), "utf8");
  assert.match(run, /^names="[^"]* inventory[ "]/m);
  assert.match(run, /__SCENE__/);
  const check = readFileSync(join(root, "tools", "pitch", "checks", "inventory.js"), "utf8");
  assert.match(check, /__SCENE__/);
  assert.match(check, /window\.sceneInventory\(\)/);
  const page = readFileSync(join(root, "pitch", "paint", "40-moments.js"), "utf8");
  assert.match(page, /window\.sceneInventory = /);
  assert.match(page, /exitL\.name = "back-door-lamp"; scene\.add\(exitL\)/);
});

test("pitch:pair says what is wrong before it starts a browser", () => {
  const pair = join(root, "tools", "pitch", "pair.sh");
  for (const args of [
    [],
    ["840", "x"],
    ["840", "--nope"],
    ["840", "--approved", "/no/such/folder"],
  ]) {
    const r = spawnSync("bash", [pair, ...args], { encoding: "utf8" });
    assert.equal(r.status, 2, `${args.join(" ")}: ${r.stderr}`);
    assert.notEqual(r.stderr, "");
  }
});

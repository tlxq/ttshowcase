import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { ensurePackages, FAILED_WORDS } from "./ensure-packages.mjs";
import { lockHash } from "./lib.mjs";

function repo() {
  const dir = mkdtempSync(join(tmpdir(), "ensure-"));
  writeFileSync(join(dir, "package-lock.json"), '{"lock":1}');
  return dir;
}
// a stand-in for npm ci: makes node_modules and counts the runs
function fakeNpm() {
  const run = (dir) => {
    run.runs++;
    mkdirSync(join(dir, "node_modules"), { recursive: true });
    return 0;
  };
  run.runs = 0;
  return run;
}
const quiet = () => {};

test("a fresh worktree (no node_modules) installs, and the next call finds them current", () => {
  const dir = repo();
  const npm = fakeNpm();
  assert.equal(ensurePackages(dir, npm, quiet), "installed");
  assert.equal(ensurePackages(dir, npm, quiet), "current");
  assert.equal(npm.runs, 1);
  rmSync(dir, { recursive: true });
});

test("node_modules from an older lock is installed again", () => {
  const dir = repo();
  mkdirSync(join(dir, "node_modules"));
  writeFileSync(join(dir, "node_modules/.showcase-lock"), "an-old-hash\n");
  const npm = fakeNpm();
  assert.equal(ensurePackages(dir, npm, quiet), "installed");
  assert.equal(
    readFileSync(join(dir, "node_modules/.showcase-lock"), "utf8").trim(),
    lockHash(dir),
  );
  rmSync(dir, { recursive: true });
});

test("a node_modules link is removed, never what it points at, and real packages are installed", () => {
  const dir = repo();
  const other = mkdtempSync(join(tmpdir(), "other-"));
  writeFileSync(join(other, "keep.txt"), "x");
  symlinkSync(other, join(dir, "node_modules"));
  const npm = fakeNpm();
  assert.equal(ensurePackages(dir, npm, quiet), "installed");
  assert.equal(existsSync(join(other, "keep.txt")), true);
  assert.equal(existsSync(join(other, ".showcase-lock")), false);
  rmSync(dir, { recursive: true });
  rmSync(other, { recursive: true });
});

test("a failed install says so: no packages in this folder, and what to run", () => {
  const dir = repo();
  const said = [];
  assert.equal(
    ensurePackages(
      dir,
      () => 1,
      quiet,
      (t) => said.push(t),
    ),
    "failed",
  );
  assert.deepEqual(said, [FAILED_WORDS]);
  assert.match(FAILED_WORDS, /no packages/);
  assert.match(FAILED_WORDS, /mise run install/);
  rmSync(dir, { recursive: true });
});

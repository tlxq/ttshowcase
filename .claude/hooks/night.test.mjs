import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { nightLine } from "./night.mjs";

const red = { when: "2026-11-26T01:42:00+01:00", commit: "98e34e2abcdef", result: "red", failed: ["walk speed-look", "pitch:check contrast-phone"], log: "/x.log" };

test("red says which checks failed, on which commit", () => {
  assert.equal(nightLine(JSON.stringify(red)), "Night walk red on 98e34e2: walk speed-look, pitch:check contrast-phone. Fix this first.");
});

test("red without check names points at the log", () => {
  assert.equal(nightLine(JSON.stringify({ ...red, failed: [] })), "Night walk red on 98e34e2: see the log. Fix this first.");
});

test("green, skipped, no file or a broken file say nothing", () => {
  assert.equal(nightLine(JSON.stringify({ ...red, result: "green", failed: [] })), "");
  assert.equal(nightLine(JSON.stringify({ ...red, result: "skipped", failed: [] })), "");
  assert.equal(nightLine(""), "");
  assert.equal(nightLine("{not json"), "");
});

const redSkip = { ...red, commit: "abc1234ffff", result: "skipped", failed: [], note: "not walked", red_commit: "98e34e2abcdef" };

test("skipped because the fallback commit was already red says the tip was not walked", () => {
  assert.equal(nightLine(JSON.stringify(redSkip)), "Night walk did not run on abc1234: the older commit 98e34e2 was already red. Fix that first.");
  assert.equal(nightLine(JSON.stringify({ ...redSkip, commit: "" })), "Night walk did not run: the older commit 98e34e2 was already red. Fix that first.");
  assert.equal(nightLine(JSON.stringify({ ...redSkip, red_commit: "" })), "", "no red_commit: the plain skip, nothing to say");
});

test("the hook prints the line from the state file when red or skipped on a red commit", () => {
  const dir = mkdtempSync(join(tmpdir(), "night-hook-"));
  try {
    mkdirSync(join(dir, "ttshowcase"));
    const run = () => spawnSync(process.execPath, [join(import.meta.dirname, "night.mjs")], { env: { ...process.env, XDG_STATE_HOME: dir }, encoding: "utf8" });
    assert.equal(run().stdout, "");
    writeFileSync(join(dir, "ttshowcase", "night.json"), JSON.stringify({ ...red, result: "green", failed: [] }));
    assert.equal(run().stdout, "");
    writeFileSync(join(dir, "ttshowcase", "night.json"), JSON.stringify(red));
    assert.equal(run().stdout, "Night walk red on 98e34e2: walk speed-look, pitch:check contrast-phone. Fix this first.\n");
    writeFileSync(join(dir, "ttshowcase", "night.json"), JSON.stringify(redSkip));
    assert.equal(run().stdout, "Night walk did not run on abc1234: the older commit 98e34e2 was already red. Fix that first.\n");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// Whole walks and pitch checks queue in the desk's test lane (~/.1dot testlane, workflow-audit step 4, 11-26) from
// before the saved-pass lookup, so the build and the check hold the slot together. Runs build-first.sh in a throwaway
// copy with testlane and passes.sh stubbed.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

function setup() {
  const dir = mkdtempSync(join(tmpdir(), "lane-"));
  const repo = join(dir, "repo");
  const bin = join(dir, "bin");
  mkdirSync(join(repo, "tools", "passes"), { recursive: true });
  mkdirSync(bin);
  copyFileSync(
    join(import.meta.dirname, "build-first.sh"),
    join(repo, "tools", "passes", "build-first.sh"),
  );
  const stub = (path, body) => {
    writeFileSync(path, `#!/bin/sh\n${body}\n`);
    chmodSync(path, 0o755);
  };
  stub(join(bin, "testlane"), `printf '%s|' "$@" > "${dir}/lane.log"`); // notes how it was called
  stub(join(repo, "tools", "passes", "passes.sh"), `echo "$@" >> "${dir}/passes.log"; exit 1`); // never skips
  stub(join(bin, "mise"), "exit 0");
  stub(join(repo, "check.sh"), `echo "check $*" >> "${dir}/passes.log"`);
  const env = { ...process.env, PATH: `${bin}:${process.env.PATH}` };
  delete env.TESTLANE_HELD;
  const run = (args, extra = {}) =>
    spawnSync(
      "bash",
      [join(repo, "tools", "passes", "build-first.sh"), "walk", "build", "./check.sh", ...args],
      {
        env: { ...env, ...extra },
        encoding: "utf8",
      },
    );
  const read = (f) => (existsSync(join(dir, f)) ? readFileSync(join(dir, f), "utf8") : "");
  return { dir, repo, run, read };
}

test("a whole run hands itself to testlane before the pass lookup", () => {
  const t = setup();
  try {
    t.run(["--force"]);
    assert.equal(
      t.read("lane.log"),
      `run|--name|ttshowcase walk|--|${t.repo}/tools/passes/build-first.sh|walk|build|./check.sh|--force|`,
    );
    assert.equal(t.read("passes.log"), "");
  } finally {
    rmSync(t.dir, { recursive: true, force: true });
  }
});

test("inside a held slot it looks up the pass, builds and runs, without asking testlane again", () => {
  const t = setup();
  try {
    const r = t.run([], { TESTLANE_HELD: "1" });
    assert.equal(r.status, 0);
    assert.equal(t.read("lane.log"), "");
    assert.equal(t.read("passes.log"), "skip walk\ncheck \n");
  } finally {
    rmSync(t.dir, { recursive: true, force: true });
  }
});

test("a named single check doesn't queue (the quick loop)", () => {
  const t = setup();
  try {
    t.run(["contrast-phone"]);
    assert.equal(t.read("lane.log"), "");
    assert.equal(t.read("passes.log"), "check contrast-phone\n");
  } finally {
    rmSync(t.dir, { recursive: true, force: true });
  }
});

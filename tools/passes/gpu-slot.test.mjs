// The graphics card's short slot (batch 9, tools/passes/gpu-slot.sh): what needs the card alone (the frame-speed checks, speed-look, pictures)
// takes the lane's first slot only, so those take turns; inside a held lane slot or without testlane the command just runs. Runs gpu-slot.sh
// with testlane stubbed, and checks the two scripts that use it still name it.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(import.meta.url), "../../..");
const script = join(root, "tools", "passes", "gpu-slot.sh");

function run(withLane, extraEnv = {}) {
  const dir = mkdtempSync(join(tmpdir(), "gpu-slot-"));
  const bin = join(dir, "bin");
  mkdirSync(bin);
  if (withLane) {
    writeFileSync(
      join(bin, "testlane"),
      `#!/bin/sh\nprintf 'slots=%s|' "$TESTLANE_SLOTS" > "${dir}/lane.log"\nprintf '%s|' "$@" >> "${dir}/lane.log"\n`,
    );
    chmodSync(join(bin, "testlane"), 0o755);
  }
  const env = { ...process.env, ...extraEnv };
  // without the stub the real testlane (if this PC has one) must not be found either
  env.PATH = `${bin}:/usr/bin:/bin`;
  delete env.TESTLANE_HELD;
  Object.assign(env, extraEnv);
  const r = spawnSync("bash", [script, "pitch startbytes-desktop", "echo", "ran"], {
    env,
    encoding: "utf8",
  });
  let lane = "";
  try {
    lane = readFileSync(join(dir, "lane.log"), "utf8");
  } catch {
    /* no lane call */
  }
  rmSync(dir, { recursive: true, force: true });
  return { r, lane };
}

test("it takes the lane's first slot only, named for what it holds", () => {
  const { r, lane } = run(true);
  assert.equal(r.status, 0);
  assert.equal(lane, "slots=1|run|--name|ttshowcase pitch startbytes-desktop|--|echo|ran|");
});

test("inside a held lane slot it just runs, so a whole run never waits on itself", () => {
  const { r, lane } = run(true, { TESTLANE_HELD: "1" });
  assert.equal(r.stdout, "ran\n");
  assert.equal(lane, "");
});

test("without testlane it just runs", () => {
  const { r } = run(false);
  assert.equal(r.stdout, "ran\n");
});

test("the frame-speed checks and speed-look take the slot, the other checks do not", () => {
  const pitch = readFileSync(join(root, "tools", "pitch", "run.sh"), "utf8");
  assert.match(pitch, /FRAME_CHECKS=.*\n/);
  assert.match(pitch, /lead=\(tools\/passes\/gpu-slot\.sh "pitch \$1-\$2"\)/);
  assert.match(pitch, /case "\$FRAME_CHECKS" in \*" \$1 "\*\) lead=/);
  const walk = readFileSync(join(root, "tools", "walk", "run.sh"), "utf8");
  assert.match(
    walk,
    /\[ "\$1" = speed-look \] && lead=\(tools\/passes\/gpu-slot\.sh "walk \$1" tools\/walk\/quiet\.sh\)/,
  );
  const pair = readFileSync(join(root, "tools", "pitch", "pair.sh"), "utf8");
  assert.doesNotMatch(pair, /gpu-slot|testlane/, "pitch:pair is not a speed check: no slot");
});

// The graphics card's short slot (batch 9, tools/passes/gpu-slot.sh): what needs the card alone takes the card's lock (the one the night run
// and picture generation use), so those take turns; a holder that asks again does not wait on itself. quiet.sh (the walk's speed-look) says
// plainly when the desk stays busy.
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(import.meta.url), "../../..");
const slot = join(root, "tools", "passes", "gpu-slot.sh");
const quiet = join(root, "tools", "walk", "quiet.sh");

function tmp() {
  const dir = mkdtempSync(join(tmpdir(), "gpu-slot-"));
  const env = { ...process.env, SD_GEN_LOCK: join(dir, "gpu.lock") };
  delete env.GPU_LOCK_HELD;
  return { dir, env };
}

test("it holds the card's lock while the command runs, and says so to what it starts", () => {
  const { dir, env } = tmp();
  try {
    const r = spawnSync(
      "bash",
      [
        slot,
        "a check",
        "bash",
        "-c",
        `flock -n "${env.SD_GEN_LOCK}" true && echo free || echo held; echo "$GPU_LOCK_HELD"`,
      ],
      { env, encoding: "utf8" },
    );
    assert.equal(r.stdout, "held\n1\n");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a second user waits for the first, then runs", async () => {
  const { dir, env } = tmp();
  try {
    const first = spawn("bash", [slot, "first", "sleep", "1.5"], { env });
    await new Promise((r) => setTimeout(r, 400));
    const t0 = Date.now();
    const second = spawnSync("bash", [slot, "second", "echo", "ran"], { env, encoding: "utf8" });
    assert.equal(second.stdout, "ran\n");
    assert.match(second.stderr, /Waiting for the graphics card \(second\)/);
    assert.ok(Date.now() - t0 > 600, "it waited for the first");
    first.kill();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a holder that asks again does not wait on itself (the night run, a slot inside a slot)", () => {
  const { dir, env } = tmp();
  try {
    const r = spawnSync("bash", [slot, "outer", "bash", slot, "inner", "echo", "inner ran"], {
      env,
      encoding: "utf8",
      timeout: 5000,
    });
    assert.equal(r.stdout, "inner ran\n");
    const night = spawnSync("bash", [slot, "x", "echo", "ran"], {
      env: { ...env, GPU_LOCK_HELD: "1" },
      encoding: "utf8",
      timeout: 5000,
    });
    assert.equal(night.stdout, "ran\n");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the frame-speed checks, speed-look and the pair take the slot; the other checks do not", () => {
  const pitch = readFileSync(join(root, "tools", "pitch", "run.sh"), "utf8");
  assert.match(pitch, /case "\$FRAME_CHECKS" in \*" \$1 "\*\) lead=\(tools\/passes\/gpu-slot\.sh/);
  const walk = readFileSync(join(root, "tools", "walk", "run.sh"), "utf8");
  assert.match(
    walk,
    /speed-look \] && lead=\(tools\/passes\/gpu-slot\.sh "walk \$1" tools\/walk\/quiet\.sh\)/,
  );
  const pair = readFileSync(join(root, "tools", "pitch", "pair.sh"), "utf8");
  assert.match(pair, /exec tools\/passes\/gpu-slot\.sh "pair \$at" tools\/pitch\/sheet\.sh/);
  const night = readFileSync(join(root, "tools", "night.sh"), "utf8");
  assert.match(night, /export GPU_LOCK_HELD=1/);
});

test("quiet.sh: a desk that stays busy says so and exits 1 without running the command", () => {
  const { dir, env } = tmp();
  try {
    writeFileSync(join(dir, "load"), "99.00 99.00 99.00 1/1 1\n");
    const r = spawnSync("bash", [quiet, "echo", "ran"], {
      env: { ...env, QUIET_LOADAVG: join(dir, "load"), QUIET_TRIES: "2", QUIET_SLEEP: "0" },
      encoding: "utf8",
    });
    assert.equal(r.status, 1);
    assert.match(
      r.stdout,
      /^the desk is busy \(load 99\.00 on \d+ cores\), so paint times would be wrong\./,
    );
    assert.doesNotMatch(r.stdout, /ran/);
    writeFileSync(join(dir, "load"), "0.10 0.10 0.10 1/1 1\n");
    const ok = spawnSync("bash", [quiet, "echo", "ran"], {
      env: { ...env, QUIET_LOADAVG: join(dir, "load") },
      encoding: "utf8",
    });
    assert.equal(ok.stdout, "ran\n");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// tools/night.sh and the desk's GPU lock (11-26: a picture helper's waiter had sd-cli in its arguments, the walk's
// `pgrep -f sd-cli` counted it, waited 60 min and then ran on a busy desk). The walk now holds the same flock as
// every picture job for the whole run. Runs night.sh in a throwaway clone with mise and npm stubbed.
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import {
  chmodSync,
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

const script = join(import.meta.dirname, "night.sh");

function setup() {
  const dir = mkdtempSync(join(tmpdir(), "night-sh-"));
  const repo = join(dir, "repo");
  const home = join(dir, "home");
  const bin = join(dir, "bin");
  for (const d of [join(repo, "tools"), join(repo, "node_modules"), home, bin])
    mkdirSync(d, { recursive: true });
  copyFileSync(script, join(repo, "tools", "night.sh"));
  writeFileSync(join(repo, "package-lock.json"), "{}\n");
  // mise stub: says whether the GPU lock is held while the check runs
  writeFileSync(
    join(bin, "mise"),
    `#!/usr/bin/env bash\nif flock -n "$HOME/.cache/ttshowcase-gpu.lock" true; then echo "$2 lock=free" >> "$HOME/mise.log"; else echo "$2 lock=held" >> "$HOME/mise.log"; fi\n`,
  );
  writeFileSync(join(bin, "npm"), "#!/usr/bin/env bash\nexit 0\n");
  for (const f of ["mise", "npm"]) chmodSync(join(bin, f), 0o755);
  // no GIT_* from a hook may point the temp repo at the real one
  const env = Object.fromEntries(
    Object.entries(process.env).filter(([k]) => !k.startsWith("GIT_")),
  );
  Object.assign(env, {
    HOME: home,
    XDG_STATE_HOME: join(home, "state"),
    PATH: `${bin}:${process.env.PATH}`,
  });
  const git = (...args) =>
    spawnSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", ...args], { cwd: repo, env });
  git("init", "-q");
  git("add", "-A");
  git("commit", "-qm", "night");
  const run = (extra) =>
    spawnSync("bash", [join(repo, "tools", "night.sh")], {
      env: { ...env, ...extra },
      encoding: "utf8",
      timeout: 60_000,
    });
  const lock = join(home, ".cache", "ttshowcase-gpu.lock");
  const night = () =>
    JSON.parse(readFileSync(join(home, "state", "ttshowcase", "night.json"), "utf8"));
  const miseLog = () => readFileSync(join(home, "mise.log"), "utf8");
  return {
    dir,
    home,
    lock,
    run,
    night,
    miseLog,
    env,
    done: () => rmSync(dir, { recursive: true, force: true }),
  };
}

test("both checks run while the walk holds the GPU lock", () => {
  const t = setup();
  try {
    const r = t.run({ NIGHT_WAIT_SEC: "0" });
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.equal(t.miseLog(), "pitch:check lock=held\nwalk lock=held\n");
    assert.equal(t.night().result, "green");
  } finally {
    t.done();
  }
});

test("a waiter with sd-cli in its arguments doesn't hold the walk", async (ctx) => {
  if (spawnSync("pgrep", ["-x", "sd-cli"]).status === 0)
    return ctx.skip("real picture generation is running on this machine");
  const t = setup();
  // a process named bash whose command line says sd-cli, like the 11-26 helper's waiter
  const waiter = spawn("bash", ["-c", "sleep 30; : sd-cli --model x"], { stdio: "ignore" });
  try {
    await new Promise((ok) => setTimeout(ok, 200));
    const r = t.run({ NIGHT_WAIT_SEC: "0" });
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.doesNotMatch(t.night().note, /sd-cli|picture/i);
  } finally {
    waiter.kill();
    t.done();
  }
});

test("picture generation holding the lock past the limit: the walk runs anyway and says so", async () => {
  const t = setup();
  mkdirSync(join(t.home, ".cache"), { recursive: true });
  const holder = spawn("flock", [t.lock, "sleep", "30"], { stdio: "ignore", env: t.env });
  try {
    await new Promise((ok) => setTimeout(ok, 300));
    const r = t.run({ NIGHT_WAIT_SEC: "1" });
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(t.night().note, /Picture generation held the graphics card/);
    assert.equal(t.miseLog(), "pitch:check lock=held\nwalk lock=held\n");
  } finally {
    holder.kill();
    t.done();
  }
});

// `showcase`: run, check and ship the tlxq site. Calls the scripts in tools/ (one home per job); the pure parts are in lib.mjs.
// Servers it starts run in the background with a record in .cache/run/<name>.json; `stop` stops only those.
import { spawn, spawnSync, execFile } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { emitKeypressEvents } from "node:readline";
import {
  BASH_COMPLETION,
  COMMANDS,
  HELP,
  LOOK_PREFIX,
  NAMES,
  SERVERS,
  colorOn,
  complete,
  freePort,
  lookItems,
  lookName,
  lookRow,
  misePins,
  painter,
  parseArgs,
  parseBranchInfo,
  parsePrs,
  parseWorktrees,
  pickLook,
  worktreeFolder,
  lockHash,
  packagesCurrent,
  suggest,
  tick,
  took,
  versionIn,
  cutLine,
} from "./lib.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const runDir = join(root, ".cache/run");
const tty = Boolean(process.stdout.isTTY);
let c = painter(false);

class Usage extends Error {}
const say = (s = "") => process.stdout.write(s + "\n");
const next = (s) => say(c.dim(`→ next: ${s}`));

// ---------- running things ----------
function sh(cmd, args = [], opts = {}) {
  const r = spawnSync(cmd, args, {
    cwd: root,
    encoding: "utf8",
    timeout: opts.timeout ?? 20000,
    env: opts.env ?? process.env,
  });
  return {
    code: r.error ? 127 : (r.status ?? 1),
    out: `${r.stdout ?? ""}${r.stderr ?? ""}`.trim(),
    stdout: (r.stdout ?? "").trim(),
  };
}
function shAsync(cmd, args, timeout = 6000) {
  return new Promise((res) =>
    execFile(cmd, args, { cwd: root, timeout, encoding: "utf8" }, (err, stdout) =>
      res(err ? null : stdout.trim()),
    ),
  );
}
const has = (cmd) => sh("bash", ["-c", `command -v ${cmd}`]).code === 0;

// A step with a live "… name  12 s" line on a terminal; output goes to a log, its tail is shown when it fails.
function step(name, cmd, args, { log, env, cwd } = {}) {
  return new Promise((res) => {
    mkdirSync(runDir, { recursive: true });
    const logPath = join(runDir, `${log ?? name}.log`);
    const fd = openSync(logPath, "w");
    const t0 = Date.now();
    const child = spawn(cmd, args, {
      cwd: cwd ?? root,
      stdio: ["ignore", fd, fd],
      env: env ?? process.env,
    });
    const timer = tty
      ? setInterval(
          () =>
            process.stdout.write(`\r\x1b[2K${tick(c, "run", name, c.dim(took(Date.now() - t0)))}`),
          500,
        )
      : null;
    const done = (code) => {
      if (timer) {
        clearInterval(timer);
        process.stdout.write("\r\x1b[2K");
      }
      res({ code, ms: Date.now() - t0, log: logPath, out: readFileSync(logPath, "utf8") });
    };
    child.on("error", () => done(127));
    child.on("exit", (code) => done(code ?? 1));
  });
}
function showFailure(r) {
  const tail = r.out.trim().split("\n").slice(-20);
  for (const l of tail) say(c.dim("  " + cutLine(l)));
  say(c.dim(`  Full log: ${r.log}`));
}

// ---------- background servers ----------
// Look servers (one branch's pitch, served from its worktree) keep their records in the main checkout, so
// `showcase stop` finds them from any worktree.
let sharedRun = null;
function dirFor(name) {
  if (!name.startsWith(LOOK_PREFIX)) return runDir;
  sharedRun ??= join(
    dirname(sh("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"]).stdout),
    ".cache/run",
  );
  return sharedRun;
}
const recordPath = (name) => join(dirFor(name), `${name}.json`);
// Every server showcase may have started: dev, pitch, and one per looked-at branch.
function allServers() {
  let looks = [];
  try {
    looks = readdirSync(dirFor(LOOK_PREFIX))
      .filter((f) => f.startsWith(LOOK_PREFIX) && f.endsWith(".json"))
      .map((f) => f.slice(0, -5));
  } catch {}
  return [...Object.keys(SERVERS), ...looks];
}
// Process start time (field 22 of /proc/<pid>/stat): a pid the system reused for something else won't match.
function startTime(pid) {
  try {
    const s = readFileSync(`/proc/${pid}/stat`, "utf8");
    return s.slice(s.lastIndexOf(")") + 2).split(" ")[19];
  } catch {
    return null;
  }
}
function running(name) {
  let r;
  try {
    r = JSON.parse(readFileSync(recordPath(name), "utf8"));
  } catch {
    return null;
  }
  if (startTime(r.pid) === r.start) return r;
  rmSync(recordPath(name), { force: true }); // stale: the server ended on its own
  return null;
}
// Who listens on a port (pid + name), or null.
function listener(port) {
  const r = sh("ss", ["-ltnpH", `sport = :${port}`]);
  if (!r.stdout) return null;
  const m = r.stdout.match(/\("([^"]+)",pid=(\d+)/);
  return m ? { name: m[1], pid: Number(m[2]) } : { name: "another program", pid: null };
}
function tailscale() {
  const ip = sh("tailscale", ["ip", "-4"]).stdout.split("\n")[0] || null;
  let name = null;
  try {
    name = JSON.parse(sh("tailscale", ["status", "--json"]).stdout).Self.DNSName.replace(/\.$/, "");
  } catch {}
  return { ip, name };
}
function qr(url) {
  if (!has("qrencode")) return say(c.dim("No QR code: install qrencode to get one"));
  say(sh("qrencode", ["-t", "ansiutf8", url]).stdout);
}
async function waitFor(url, pid, name, limitMs) {
  const t0 = Date.now();
  while (Date.now() - t0 < limitMs) {
    if (startTime(pid) === null) return { ok: false, ms: Date.now() - t0 };
    try {
      await fetch(url, { signal: AbortSignal.timeout(2000) });
      return { ok: true, ms: Date.now() - t0 };
    } catch {}
    if (tty) process.stdout.write(`\r\x1b[2K${tick(c, "run", name, c.dim(took(Date.now() - t0)))}`);
    await new Promise((r) => setTimeout(r, 500));
  }
  return { ok: false, ms: Date.now() - t0, slow: true };
}

// dir: another worktree. Packages are installed again whenever package-lock.json changed since the last install (packagesCurrent).
async function install(dir = root) {
  const stamp = join(dir, "node_modules/.showcase-lock");
  if (packagesCurrent(dir)) return say(tick(c, "ok", "packages", "already installed"));
  const r = await step("packages", "npm", ["ci"], { cwd: dir });
  if (r.code !== 0) {
    say(tick(c, "bad", "packages", "Couldn't install them. See the log"));
    showFailure(r);
    return false;
  }
  writeFileSync(stamp, lockHash(dir) + "\n");
  say(tick(c, "ok", "packages", `installed in ${took(r.ms)}`));
}

async function startServer(
  name,
  { cmd, args = [], env, page = "", limitMs, cwd = root, port: wanted },
) {
  const port = wanted ?? Number(process.env.PORT || SERVERS[name]);
  const ts = tailscale();
  const link = `http://${ts.name ?? ts.ip}:${port}/${page}`;
  const have = running(name);
  if (have) {
    say(tick(c, "ok", name, `already running ${c.dim(`(pid ${have.pid})`)}`));
    return linksOut(name, have.url);
  }
  if (!ts.ip) {
    say(tick(c, "bad", "Tailscale", "Couldn't find this PC's address"));
    say(c.dim("  Fix: start Tailscale (sudo tailscale up), then try again"));
    return 1;
  }
  const who = listener(port);
  if (who) {
    say(
      tick(
        c,
        "bad",
        `port ${port}`,
        `used by ${who.name}${who.pid ? ` (pid ${who.pid})` : ""}, which showcase didn't start`,
      ),
    );
    say(
      c.dim(
        `  Fix: stop it in its own terminal, or use another port: PORT=${port + 1} showcase ${name}`,
      ),
    );
    return 1;
  }
  mkdirSync(dirFor(name), { recursive: true });
  const logPath = join(dirFor(name), `${name}.log`);
  const fd = openSync(logPath, "w");
  // its own process group, so stop ends the server and everything it started, and nothing else
  const child = spawn(cmd, args, {
    cwd,
    detached: true,
    stdio: ["ignore", fd, fd],
    env: { ...process.env, ...env, PORT: String(port) },
  });
  child.unref();
  const failed = await new Promise((res) => {
    child.once("error", (e) => res(e));
    child.once("spawn", () => res(null));
  });
  if (failed) {
    say(tick(c, "bad", name, `Couldn't start ${cmd}: ${failed.code ?? failed.message}`));
    return 1;
  }
  const rec = {
    pid: child.pid,
    start: startTime(child.pid),
    port,
    url: link,
    started: new Date().toISOString(),
  };
  writeFileSync(recordPath(name), JSON.stringify(rec) + "\n");
  const w = await waitFor(`http://${ts.ip}:${port}/${page}`, child.pid, name, limitMs);
  if (tty) process.stdout.write("\r\x1b[2K");
  if (!w.ok) {
    say(
      tick(
        c,
        "bad",
        name,
        w.slow
          ? `Couldn't start: no answer after ${took(w.ms)}. See the log`
          : "Couldn't start: it stopped. See the log",
      ),
    );
    showFailure({ out: readFileSync(logPath, "utf8"), log: logPath });
    if (w.slow) await stopOne(name, true);
    rmSync(recordPath(name), { force: true });
    return 1;
  }
  say(tick(c, "ok", name, `ready in ${took(w.ms)}`));
  return linksOut(name, link);
}
function linksOut(name, link) {
  say("");
  say(`  link   ${link}`);
  say(c.dim("  (this PC, the T14s and the S23 over Tailscale)"));
  qr(link);
  say(c.dim(`Runs in the background. Log: .cache/run/${name}.log · Stop: showcase stop ${name}`));
  if (name === "dev") next("showcase next dev --print   (opens /next on the phone)");
  return 0;
}

async function stopOne(name, quiet = false) {
  const r = running(name);
  if (!r) {
    if (quiet) return 0;
    say(tick(c, "skip", name, "wasn't running"));
    const who = SERVERS[name] && listener(SERVERS[name]);
    if (who) {
      say(
        tick(
          c,
          "warn",
          `port ${SERVERS[name]}`,
          `used by ${who.name}${who.pid ? ` (pid ${who.pid})` : ""}, which showcase didn't start. Left running.`,
        ),
      );
      if (who.pid) say(c.dim(`  Fix: stop it in its own terminal, or: kill ${who.pid}`));
    }
    return 0;
  }
  // The leader matched the record, so the group is ours. It lives on while any child does (pitch = bash + python +
  // the node tag store), and its id can't be reused until the last one is gone: wait for the whole group.
  const gone = () => {
    try {
      process.kill(-r.pid, 0);
      return false;
    } catch {
      return true;
    }
  };
  try {
    process.kill(-r.pid, "SIGTERM");
  } catch {}
  for (let i = 0; i < 50 && !gone(); i++) await new Promise((res) => setTimeout(res, 100));
  if (!gone())
    try {
      process.kill(-r.pid, "SIGKILL");
    } catch {}
  rmSync(recordPath(name), { force: true });
  if (!quiet) say(tick(c, "ok", name, `stopped ${c.dim(`(pid ${r.pid}, port ${r.port} free)`)}`));
  return 0;
}

// ---------- status ----------
// which checks have a saved pass for the files as they are now (tools/passes/passes.sh, keyed by the tree since 11-26)
function savedPasses() {
  const names = { check: "check", walk: "walk", pitch: "pitch:check" };
  const ok = [],
    not = [];
  for (const [check, label] of Object.entries(names))
    (sh("tools/passes/passes.sh", ["has", check]).code === 0 ? ok : not).push(label);
  return { ok, not };
}

async function gatherStatus() {
  const [pr, live] = await Promise.all([
    shAsync("gh", ["pr", "view", "--json", "number,title,statusCheckRollup,url"]),
    shAsync("gh", [
      "api",
      "repos/{owner}/{repo}/commits/master/status",
      "--jq",
      '[.sha[0:7], ([.statuses[] | select(.context == "Vercel")][0].state // "none")] | @tsv',
    ]),
  ]);
  return { pr: pr ? JSON.parse(pr) : null, live: live ? live.split("\t") : null };
}

async function status({ header = false } = {}) {
  const gh = gatherStatus();
  const branch = sh("git", ["rev-parse", "--abbrev-ref", "HEAD"]).stdout;
  const dirty = sh("git", ["status", "--porcelain"]).stdout.split("\n").filter(Boolean).length;
  const ab = sh("git", ["rev-list", "--left-right", "--count", "@{u}...HEAD"]);
  let sync = "not on GitHub yet";
  if (ab.code === 0) {
    const [behind, ahead] = ab.stdout.split(/\s+/).map(Number);
    sync =
      behind || ahead
        ? [ahead && `${ahead} to push`, behind && `${behind} to pull`].filter(Boolean).join(", ")
        : "up to date with GitHub";
  }
  const release =
    sh("git", ["describe", "--tags", "--abbrev=0", "--match", "v[0-9]*", "origin/master"]).stdout ||
    "no release yet";
  const since = release.startsWith("v")
    ? sh("git", ["rev-list", "--count", "--first-parent", `${release}..origin/master`]).stdout
    : "";
  const servers = allServers()
    .map((n) => [n, running(n)])
    .filter(([, r]) => r);
  const passes = savedPasses();
  const { pr, live } = await gh;

  const lab = (s) => c.dim(s.padEnd(8));
  if (header) say(`${c.bold("showcase")} ${c.dim("·")} tlxq site`);
  let liveLine = c.dim("couldn't reach GitHub");
  if (live) {
    const [sha, state] = live;
    const word =
      {
        success: c.ok("Deployed"),
        pending: c.warn("Deploying"),
        failure: c.bad("Deploy failed"),
        error: c.bad("Deploy failed"),
      }[state] ?? c.dim("Deploy state unknown");
    liveLine = `ttdevs.com ${c.dim("·")} master ${sha} ${c.dim("·")} ${word} ${c.dim(`· ${release}${since && since !== "0" ? ` + ${since} merged since` : ""}`)}`;
  }
  say(`  ${lab("site")} ${liveLine}`);
  say(
    `  ${lab("branch")} ${branch} ${c.dim("·")} ${dirty ? c.warn(`${dirty} changed`) : "clean"} ${c.dim("·")} ${sync}`,
  );
  if (!servers.length) say(`  ${lab("running")} ${c.dim("nothing from showcase")}`);
  servers.forEach(([n, r], i) => {
    const t = new Date(r.started).toLocaleTimeString("sv-SE", {
      hour: "2-digit",
      minute: "2-digit",
    });
    say(
      `  ${lab(i ? "" : "running")} ${n} ${c.dim("·")} :${r.port} ${c.dim("·")} ${r.url} ${c.dim(`· since ${t}`)}`,
    );
  });
  const p = [
    ...passes.ok.map((n) => `${c.ok("✓")} ${n}`),
    passes.not.length ? c.dim(`not yet: ${passes.not.join(", ")}`) : "",
  ]
    .filter(Boolean)
    .join("  ");
  say(`  ${lab("passes")} ${c.dim("for these files")}  ${p}`);
  if (pr) {
    const runs = pr.statusCheckRollup ?? [];
    const st = runs.some((r) => ["FAILURE", "ERROR"].includes(r.conclusion ?? r.state))
      ? c.bad("Checks failed")
      : runs.some((r) => (r.status && r.status !== "COMPLETED") || r.state === "PENDING")
        ? c.warn("Checks running")
        : runs.length
          ? c.ok("Checks OK")
          : c.dim("No checks yet");
    say(
      `  ${lab("PR")} #${pr.number} ${pr.title.length > 60 ? pr.title.slice(0, 59) + "…" : pr.title} ${c.dim("·")} ${st}`,
    );
  } else say(`  ${lab("PR")} ${c.dim("none for this branch")}`);
  return 0;
}

// ---------- doctor ----------
// "ANGLE (NVIDIA, Vulkan 1.4 (NVIDIA NVIDIA GeForce RTX 2070 SUPER (0x1E84)), NVIDIA)" -> "NVIDIA GeForce RTX 2070 SUPER"
function cardName(s) {
  const m = s.match(/((?:NVIDIA|Intel|AMD|Radeon|Mesa)[^,()]*?)\s*\(0x[0-9a-f]+\)/i);
  return m ? m[1].replace(/^(\w+) \1 /, "$1 ") : s;
}
async function doctor() {
  let problems = 0;
  const row = (state, name, what, fix) => {
    say(tick(c, state, name, what));
    if (fix) say(c.dim(`${" ".repeat(18)}Fix: ${fix}`));
    if (state === "bad") problems++;
  };
  say(c.dim(sh("hostname").stdout || "this PC"));
  const pins = misePins(readFileSync(join(root, "mise.toml"), "utf8"));
  const tools = [
    ["node", "node", ["-v"]],
    ["npm:@playwright/cli", "playwright-cli", ["--version"]],
    ["npm:vercel", "vercel", ["--version"]],
    ["aqua:google/osv-scanner", "osv-scanner", ["--version"]],
  ];
  for (const [pin, cmd, args] of tools) {
    const want = pins[pin];
    const got = versionIn(sh(cmd, args).out);
    if (!got) row("bad", cmd, "not found", "mise install, then open a new terminal in the repo");
    else if (want && got !== want)
      row(
        "bad",
        cmd,
        `${got} on PATH, the repo wants ${want}`,
        "mise install, then open a new terminal in the repo",
      );
    else row("ok", cmd, got);
  }
  const g = sh("bash", ["-c", ". tools/walk/graphics.sh"], { timeout: 60000 });
  const gpu = (g.out.match(/graphics: (.*)/) ?? [])[1] ?? "";
  if (g.code === 0)
    row("ok", "graphics card", `${cardName(gpu)} ${c.dim("(browser checks draw on it)")}`);
  else
    row(
      "bad",
      "graphics card",
      `the browser draws in software${gpu ? ` (${gpu})` : ""}`,
      "check the GPU flags in ~/.claude/playwright-cli.config.json",
    );
  const ts = tailscale();
  ts.ip
    ? row("ok", "Tailscale", `${ts.ip}${ts.name ? c.dim(` · ${ts.name}`) : ""}`)
    : row("bad", "Tailscale", "Couldn't find this PC's address", "sudo tailscale up");
  const keys = {
    "/next key": "ttshowcase-next.key",
    "admin key": "ttshowcase-admin.key",
    "tag store": "ttshowcase-tags-db.url",
    "Vercel bypass": "ttshowcase-vercel-bypass.key",
  };
  const missing = Object.entries(keys)
    .filter(([, f]) => !existsSync(join(homedir(), ".config/ttdevs", f)))
    .map(([k]) => k);
  missing.length
    ? row("bad", "keys from Pass", `missing: ${missing.join(", ")}`, "ttpass sync")
    : row("ok", "keys from Pass", `${Object.keys(keys).join(", ")} ${c.dim("(4 of 4)")}`);
  const who = await shAsync("gh", ["api", "user", "--jq", ".login"]);
  who
    ? row("ok", "GitHub", `signed in as ${who}`)
    : row("bad", "GitHub", "not signed in, or offline", "gh auth login");
  has("qrencode")
    ? row("ok", "qrencode", "for phone links")
    : row("bad", "qrencode", "missing (no QR for the phone)", "sudo pacman -S qrencode");
  const free = [];
  for (const port of [3000, 8123, 8124]) {
    const w = listener(port);
    const mine = Object.entries(SERVERS).find(([n, p]) => p === port && running(n));
    if (!w) free.push(port);
    else if (mine)
      row(
        "warn",
        `port ${port}`,
        `used by showcase ${mine[0]} ${c.dim(`(pid ${running(mine[0]).pid})`)}`,
      );
    else
      row(
        "warn",
        `port ${port}`,
        `used by ${w.name}${w.pid ? ` (pid ${w.pid})` : ""}, which showcase didn't start`,
      );
  }
  if (free.length) row("ok", `port${free.length > 1 ? "s" : ""} ${free.join(" ")}`, "free");
  say("");
  say(problems ? c.bad(`Needs you: ${problems}`) : c.ok("OK"));
  if (problems) next("showcase doctor again after the fix");
  return problems ? 1 : 0;
}

// ---------- check ----------
async function check(f) {
  const force = f.force ? ["--force"] : [];
  let [part, name] = f.words;
  if (part && !["code", "walk", "pitch"].includes(part))
    throw new Usage(`Unknown part ${part}. Parts: code, walk, pitch`);
  if (f.quick) part = "code";
  const parts = part ? [part] : ["code", "walk", "pitch"];
  say(
    c.dim(
      passKey()
        .split("\n")
        .slice(0, 3)
        .join(" · ")
        .replace(/^(\w{7})\w+/, "commit $1"),
    ),
  );
  if ((await install()) === false) return 1;
  const label = { code: "check", walk: "walk", pitch: "pitch:check" };
  const saved = { code: "check", walk: "walk", pitch: "pitch" };
  const t0 = Date.now();
  let built = false,
    green = 0;
  for (const p of parts) {
    // a whole part that passed on these files is skipped before anything is built
    if (
      !name &&
      sh("tools/passes/passes.sh", ["skip", saved[p]], {
        env: { ...process.env, FORCE: f.force ? "1" : "" },
      }).code === 0
    ) {
      say(
        tick(
          c,
          "ok",
          label[p],
          c.dim(`already passed on these files, skipped (--force runs it again)`),
          12,
        ),
      );
      green++;
      continue;
    }
    if (p === "walk" && !built) {
      const b = await step("build", "npm", ["run", "build"], { log: "check-build" });
      if (b.code !== 0) {
        say(tick(c, "bad", "build", "Failed. See the log", 12));
        showFailure(b);
        return 1;
      }
    }
    if (p === "pitch") {
      const b = await step("pitch build", "node", ["tools/pitch/build.mjs"], {
        log: "check-pitch-build",
      });
      if (b.code !== 0) {
        say(tick(c, "bad", "pitch build", "Failed. See the log", 12));
        showFailure(b);
        return 1;
      }
    }
    const cmd = {
      code: ["tools/check.sh", force],
      walk: ["tools/walk/run.sh", [...(name ? [name] : []), ...force]],
      pitch: ["tools/pitch/run.sh", [...(name ? [name] : []), ...force]],
    }[p];
    const r = await step(label[p], cmd[0], cmd[1], { log: `check-${p}` });
    const lines = r.out
      .split("\n")
      .filter((l) => /^[\w-]+: /.test(l) && !l.startsWith("graphics:"));
    const failed = lines.filter((l) => / FAILED /.test(l)).length;
    const what =
      p === "code"
        ? "typecheck, lint, unit, build, /next closed, headers, functions, packages"
        : name
          ? name
          : `${lines.length - failed} of ${lines.length}`;
    if (r.code !== 0) {
      say(tick(c, "bad", label[p], `${what} ${c.dim(took(r.ms))}`, 12));
      showFailure(r);
      return r.code === 2 ? 2 : 1;
    }
    if (p === "code") built = true;
    say(tick(c, "ok", label[p], `${what}  ${c.dim(took(r.ms))}`, 12));
    green++;
  }
  if (parts.length > 1) {
    say("");
    say(`${c.ok(`${green} of ${parts.length} green`)} in ${took(Date.now() - t0)}.`);
    const pr = await shAsync("gh", ["pr", "view", "--json", "number", "--jq", ".number"]);
    next(
      pr
        ? `showcase next preview ${pr}   (judge it on the phone while GitHub runs its check)`
        : "/ship opens the PR",
    );
  }
  return 0;
}

// ---------- release ----------
async function release(f) {
  const want = f.words[0];
  if (!want) throw new Usage("Name the release: showcase release major|minor|patch|vX.Y.Z");
  const dry = sh("tools/release.sh", [want, "--dry-run"], { timeout: 30000 });
  say(dry.out);
  if (dry.code !== 0) return dry.code;
  if (f.dryRun) return 0;
  const version = dry.out.split(" ")[0];
  if (!f.yes) {
    if (!process.stdin.isTTY) throw new Usage("Add --yes to release without asking");
    const yes = await ask(
      `${c.cyan("?")} Release ${version} (tag + GitHub Release)? ${c.dim("(y/N)")} `,
    );
    if (!yes) return (say(c.dim("Nothing made.")), 0);
  }
  const r = sh("tools/release.sh", [want], { timeout: 60000 });
  if (r.code !== 0) {
    say(tick(c, "bad", "release", r.out));
    return 1;
  }
  say(
    tick(
      c,
      "ok",
      "released",
      r.out
        .split("\n")
        .pop()
        .replace(/^Released \S+: /, ""),
      12,
    ),
  );
  return 0;
}
function ask(q) {
  return new Promise((res) => {
    process.stdout.write(q);
    process.stdin.setRawMode?.(false);
    process.stdin.resume();
    process.stdin.once("end", () => res(false));
    process.stdin.once("data", (d) => {
      process.stdin.pause();
      res(/^y(es)?$/i.test(String(d).trim()));
    });
  });
}

// ---------- menu ----------
function menu(items) {
  return new Promise((res) => {
    let i = 0;
    const width = Math.max(...items.map((x) => x.name.length)) + 3;
    const draw = (first) => {
      if (!first) process.stdout.write(`\x1b[${items.length}A`);
      items.forEach((x, k) => {
        const line = `${k === i ? c.cyan("❯") : " "} ${k === i ? c.bold(x.name.padEnd(width)) : x.name.padEnd(width)}${c.dim(x.about)}`;
        process.stdout.write(`\r\x1b[2K${line}\n`);
      });
    };
    emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdout.write("\x1b[?25l");
    draw(true);
    const end = (v) => {
      process.stdin.off("keypress", key);
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdout.write("\x1b[?25h");
      res(v);
    };
    const key = (_, k = {}) => {
      if (k.name === "up" || k.name === "k") i = (i + items.length - 1) % items.length;
      else if (k.name === "down" || k.name === "j" || k.name === "tab") i = (i + 1) % items.length;
      else if (k.name === "return") return end(items[i]);
      else if (k.name === "q" || k.name === "escape" || (k.ctrl && k.name === "c"))
        return end(null);
      draw(false);
    };
    process.stdin.on("keypress", key);
  });
}

async function home() {
  await status({ header: true });
  say("");
  say(`${c.cyan("?")} What next ${c.dim("(↑↓ to move, Enter to run, q to quit)")}`);
  const pick = await menu(COMMANDS.filter((x) => x.menu));
  if (!pick) return 0;
  say("");
  const words = [];
  if (pick.name === "release") {
    say(`${c.cyan("?")} Which release`);
    const k = await menu([
      { name: "patch", about: "fixes only" },
      { name: "minor", about: "something new" },
      { name: "major", about: "a new site (going live = v2.0.0)" },
    ]);
    if (!k) return 0;
    words.push(k.name);
    say("");
  }
  return run(pick.name, { ...parseArgs([]), command: pick.name, words });
}

// ---------- look ----------
function gatherLook({ prsOnly = false } = {}) {
  const g = sh(
    "gh",
    ["pr", "list", "--limit", "50", "--json", "number,title,headRefName,isDraft,updatedAt"],
    {
      timeout: 30000,
    },
  );
  if (g.code !== 0)
    say(tick(c, "warn", "GitHub", "Couldn't list the open PRs. Not signed in, or offline"));
  const prs = parsePrs(g.code === 0 ? g.stdout : "[]");
  if (prsOnly) return prs;
  sh("git", ["fetch", "-q", "origin", "master"], { timeout: 20000 });
  const worktrees = parseWorktrees(sh("git", ["worktree", "list", "--porcelain"]).stdout);
  const info = {};
  for (const w of worktrees) {
    const n = sh("git", ["rev-list", "--count", `origin/master..${w.branch}`]).stdout;
    const log = sh("git", ["log", "-1", "--format=%ct%x09%s", w.branch]).stdout;
    info[w.branch] = parseBranchInfo(`${n}\t${log}`);
  }
  return lookItems({ prs, worktrees, info });
}

function openBrowser(url) {
  if (!has("xdg-open"))
    return say(c.dim("Couldn't open the browser: xdg-open is missing. Open the link above"));
  spawn("xdg-open", [url], { detached: true, stdio: "ignore" }).unref();
}

// The picker (or --list, or one word). Every pick is served here, from its own folder, with live reload.
// vercel: for `next preview` with no PR named: a pick list of the open PRs that opens the Vercel preview instead.
async function look(f, { vercel = false } = {}) {
  const items = gatherLook({ prsOnly: vercel });
  const cols = process.stdout.columns || 100;
  const rows = items.map((it) => ({ ...lookRow(it, Date.now(), cols), it }));
  const open = (it) => (vercel ? openPreview(it) : openLook(it));
  if (f.words[0]) {
    const it = pickLook(items, f.words[0]);
    if (!it)
      throw new Usage(
        `Couldn't find ${f.words[0]} in the work in progress. See: showcase look --list`,
      );
    return open(it);
  }
  if (!items.length) {
    say(
      tick(
        c,
        "skip",
        "look",
        vercel ? "No open PRs" : "Nothing in progress: no open PRs, no branch ahead of master",
      ),
    );
    return 0;
  }
  if (f.list || !(tty && process.stdin.isTTY)) {
    rows.forEach((r) => say(`${r.name}  ${c.dim(r.about)}`));
    return 0;
  }
  say(`${c.cyan("?")} Which one ${c.dim("(↑↓ to move, Enter to open, q to quit)")}`);
  const pick = await menu(rows);
  if (!pick) return 0;
  say("");
  return open(pick.it);
}

// The Vercel preview: next.sh prints the link (it holds the /next key) and the QR; the link is opened here, never written to a file.
function openPreview(it) {
  const r = sh("tools/next.sh", ["preview", String(it.number)], { timeout: 90000 });
  say(r.out);
  if (r.code !== 0) return r.code;
  const url = r.stdout.split("\n").find((l) => l.startsWith("https://"));
  if (url) openBrowser(url);
  return 0;
}

// The folder a PR's branch is worked in: the worktree it already has, or a new one under .claude/worktrees.
function worktreeFor(it) {
  if (it.path) return it.path;
  const main = dirname(dirname(dirFor(LOOK_PREFIX)));
  const path = join(main, ".claude/worktrees", worktreeFolder(it.branch));
  const f = sh("git", ["fetch", "-q", "origin", it.branch], { timeout: 60000 });
  if (f.code !== 0) throw new Usage(`Couldn't fetch ${it.branch} from GitHub. ${f.out}`);
  const add = sh(
    "git",
    ["worktree", "add", "--track", "-b", it.branch, path, `origin/${it.branch}`],
    {
      timeout: 120000,
    },
  );
  if (add.code !== 0) throw new Usage(`Couldn't make a folder for ${it.branch}. ${add.out}`);
  say(tick(c, "ok", "folder", `${path} ${c.dim(`(new, from origin/${it.branch})`)}`));
  return path;
}

const PITCH_ENV = {
  SERVE_DIR: ".cache/pitch",
  SERVE_PAGE: "paint.html",
  SERVE_BUILD: "pitch:build",
  SERVE_TAGS: "1",
  SERVE_WATCH: "1", // tools/pitch/watch.mjs: a saved file rebuilds, and the open pages reload
};

async function openLook(it) {
  const wt = worktreeFor(it);
  if ((await install(wt)) === false) return 1;
  const b = await step("pitch build", "node", ["tools/pitch/build.mjs"], {
    log: `${lookName(it.branch)}-build`,
    cwd: wt,
  });
  if (b.code !== 0) {
    say(tick(c, "bad", "pitch build", "Failed. See the log"));
    showFailure(b);
    return 1;
  }
  say(tick(c, "ok", "pitch build", `${wt}/.cache/pitch ${c.dim(took(b.ms))}`));
  const name = lookName(it.branch);
  const taken = allServers()
    .filter((n) => n.startsWith(LOOK_PREFIX) && running(n))
    .map((n) => running(n).port);
  let port = freePort(taken);
  while (listener(port)) port = freePort([...taken, port]);
  const code = await startServer(name, {
    cmd: join(root, "tools/serve.sh"), // this checkout's tools: the branch may be older and have no live reload
    args: ["tailscale"],
    env: { ...PITCH_ENV, SERVE_ROOT: wt },
    page: "paint.html",
    limitMs: 30000,
    cwd: wt,
    port,
  });
  if (code === 0) {
    say(
      c.dim(
        "Saving a file in pitch/ rebuilds it and reloads the open pages. A failed build keeps the last page; the log says why",
      ),
    );
    openBrowser(running(name).url);
  }
  return code;
}

// ---------- help ----------
function help(cmd) {
  if (cmd && HELP[cmd]) {
    const [about, ...ex] = HELP[cmd];
    say(
      `${c.bold("Usage")}  showcase ${cmd} ${{ look: "[--list | PR# | branch]", next: "[live|dev|preview [PR#]] [--print]", check: "[code|walk|pitch] [name] [--quick] [--force]", stop: "[dev|pitch]", release: "major|minor|patch|vX.Y.Z [--dry-run] [--yes]" }[cmd] ?? ""}`.trimEnd(),
    );
    say("");
    say(about);
    say("");
    say(c.bold("Examples"));
    ex.forEach((e) => say(`  ${e}`));
    return 0;
  }
  say("showcase: run, check and ship the tlxq site");
  say("");
  say(`${c.bold("Usage")}  showcase [command] [options]`);
  say("");
  say(c.bold("Commands"));
  COMMANDS.forEach((x) => say(`  ${x.name.padEnd(9)} ${x.about}`));
  say("");
  say(`${c.bold("Options")}  -h, --help   --no-color ${c.dim("(NO_COLOR works too)")}   --version`);
  say("");
  say(c.bold("Examples"));
  say(`  showcase                        status, then the menu`);
  say(`  showcase check --quick          only the code check, no browser walks`);
  say(`  showcase next preview 45        the PR's preview link + QR for the S23`);
  say("");
  say(c.dim("Exit: 0 all good · 1 something failed · 2 typed wrong"));
  return 0;
}

// ---------- dispatch ----------
async function run(cmd, f) {
  switch (cmd) {
    case "status":
      return status();
    case "doctor":
      return doctor();
    case "dev":
      if ((await install()) === false) return 1;
      return startServer("dev", { cmd: "tools/dev.sh", limitMs: 120000 });
    case "look":
      return look(f);
    case "pitch": {
      if ((await install()) === false) return 1;
      const b = await step("pitch build", "node", ["tools/pitch/build.mjs"], {
        log: "pitch-build",
      });
      if (b.code !== 0) {
        say(tick(c, "bad", "pitch build", "Failed. See the log"));
        showFailure(b);
        return 1;
      }
      say(tick(c, "ok", "pitch build", `.cache/pitch ${c.dim(took(b.ms))}`));
      const env = PITCH_ENV;
      const code = await startServer("pitch", {
        cmd: "tools/serve.sh",
        args: ["tailscale"],
        env,
        page: "paint.html",
        limitMs: 30000,
      });
      if (code === 0)
        say(
          c.dim(
            "Tags you leave here stay on this PC and are gone on stop. Saving a file in pitch/ rebuilds the page and reloads it. The live store: showcase next",
          ),
        );
      return code;
    }
    case "next": {
      const words = f.words.length ? [...f.words] : ["live"];
      if (!["live", "dev", "preview"].includes(words[0]))
        throw new Usage(`Unknown place ${words[0]}. Use live, dev or preview [PR#]`);
      if (f.print && words[0] !== "preview") words.push("--print");
      // no PR named and none on this branch (e.g. on master): pick one from the open PRs
      if (
        words[0] === "preview" &&
        !words[1] &&
        sh("gh", ["pr", "view", "--json", "number"]).code !== 0
      )
        return look({ ...f, words: [] }, { vercel: true });
      return spawnSync("tools/next.sh", words, { cwd: root, stdio: "inherit" }).status ?? 1;
    }
    case "check":
      return check(f);
    case "stop": {
      const looks = allServers().filter((n) => n.startsWith(LOOK_PREFIX));
      const names = f.words.length
        ? f.words.flatMap((n) => (n === "look" ? looks : [n]))
        : allServers();
      for (const n of names)
        if (!(n in SERVERS) && !looks.includes(n))
          throw new Usage(
            `Unknown server ${n}. Use ${[...Object.keys(SERVERS), "look"].join(", ")}`,
          );
      for (const n of names) await stopOne(n);
      return 0;
    }
    case "release":
      return release(f);
  }
}

export async function main(argv) {
  // `showcase status | head -1`: the reader left, so stop quietly
  process.stdout.on("error", (e) => process.exit(e.code === "EPIPE" ? 0 : 1));
  process.on("exit", () => {
    if (process.stdin.isTTY) process.stdin.setRawMode?.(false);
    if (tty) process.stdout.write("\x1b[?25h");
  });
  if (argv[0] === "__complete") return (say(complete(argv.slice(1), root).join("\n")), 0);
  if (argv[0] === "completion") {
    if (argv[1] !== "bash") return (console.error("Usage: showcase completion bash"), 2);
    process.stdout.write(BASH_COMPLETION);
    return 0;
  }
  const f = parseArgs(argv);
  c = painter(colorOn(f, process.env, tty));
  try {
    if (f.unknown)
      throw new Usage(
        `Unknown option ${f.unknown}. See: showcase ${f.command ? f.command + " " : ""}--help`,
      );
    if (f.version) return (say(sh("git", ["describe", "--tags", "--always"]).stdout), 0);
    if (f.command && !NAMES.includes(f.command)) {
      const s = suggest(f.command);
      throw new Usage(
        `Unknown command ${f.command}.${s ? ` Did you mean ${c.bold(s)}?` : " See: showcase --help"}`,
      );
    }
    if (f.help) return help(f.command);
    if (!f.command) return tty && process.stdin.isTTY ? home() : help();
    return await run(f.command, f);
  } catch (e) {
    if (e instanceof Usage) {
      console.error(e.message);
      return 2;
    }
    throw e;
  }
}

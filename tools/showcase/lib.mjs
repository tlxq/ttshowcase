// The parts of `showcase` that only compute: command list, argument reading, typo hints, colours, completion.
// Everything that runs something lives in cli.mjs. Tests: lib.test.mjs.
import { readFileSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";

// One line each: the menu, --help and the completion all read this list.
export const COMMANDS = [
  {
    name: "look",
    about: "the work in progress: open PRs and branches in worktrees, open one",
    menu: true,
  },
  { name: "dev", about: "live editing on Tailscale, link + QR", menu: true },
  { name: "pitch", about: "the paint walk with your own local tag wall", menu: true },
  { name: "next", about: "open /next: live, dev, or preview [PR]", menu: true },
  { name: "check", about: "the whole check, or one part: check walk look-phone", menu: true },
  { name: "doctor", about: "is this PC ready", menu: true },
  { name: "status", about: "branch, what runs, what's live, saved passes", menu: false },
  { name: "stop", about: "stop what showcase started: stop [dev|pitch]", menu: true },
  { name: "release", about: "name what's live: major|minor|patch|vX.Y.Z, --dry-run", menu: true },
];
export const NAMES = COMMANDS.map((c) => c.name);

// The servers showcase starts in the background, and the ports they use.
export const SERVERS = { dev: 3000, pitch: 8124 };

// A look server is one branch's pitch, served from its worktree: its own record name and port range.
export const LOOK_PREFIX = "look-";
export const LOOK_PORT_FROM = 8130;

// --help per command: what it does, then real examples.
export const HELP = {
  look: [
    "Lists the work in progress, newest first: open PRs (draft marked) and branches in a worktree that are ahead of master and have no PR. Pick one to serve its pitch from its own folder on Tailscale (a PR's branch gets a folder under .claude/worktrees if it has none) and open it in the browser. Saving a file in pitch/ rebuilds it and reloads the open pages, on the phone too.",
    "showcase look",
    "showcase look --list",
    "showcase look 95",
    "showcase look feat/epa-painted",
  ],
  dev: [
    "Starts the dev server in the background on this PC's Tailscale address and prints the link and a QR.",
    "showcase dev",
    "PORT=3001 showcase dev",
  ],
  pitch: [
    "Builds the paint walk and serves it in the background with a local tag store (tags stay on this PC). Saving a file in pitch/ rebuilds it and reloads the open pages, on the phone too.",
    "showcase pitch",
  ],
  next: [
    "Opens /next behind its key: live (ttdevs.com), dev (this PC's dev server) or a PR's preview with a QR.",
    "showcase next",
    "showcase next dev --print",
    "showcase next preview 45",
  ],
  check: [
    "The whole check before a PR: code, then the walks, then the pitch checks. A part that passed on these files is skipped.",
    "showcase check",
    "showcase check --quick",
    "showcase check walk look-phone",
    "showcase check pitch contrast-phone",
  ],
  doctor: [
    "Checks this PC: tool versions, graphics card, Tailscale, keys from Pass, GitHub, ports.",
    "showcase doctor",
  ],
  status: [
    "Branch, what showcase runs, what's live, the open PR and the saved passes.",
    "showcase status",
  ],
  stop: [
    "Stops what showcase started (never anything else).",
    "showcase stop",
    "showcase stop pitch",
  ],
  release: [
    "Tags master and makes a GitHub Release from the PR titles since the last one. Asks first.",
    "showcase release minor",
    "showcase release patch --dry-run",
  ],
};

// Reads argv: the command, its words, and the flags every command shares.
export function parseArgs(argv) {
  const out = {
    command: "",
    words: [],
    help: false,
    color: true,
    version: false,
    force: false,
    quick: false,
    yes: false,
    print: false,
    dryRun: false,
    list: false,
  };
  for (const a of argv) {
    if (a === "-h" || a === "--help") out.help = true;
    else if (a === "--no-color") out.color = false;
    else if (a === "--version") out.version = true;
    else if (a === "--force") out.force = true;
    else if (a === "--quick") out.quick = true;
    else if (a === "--yes" || a === "-y") out.yes = true;
    else if (a === "--print") out.print = true;
    else if (a === "--list") out.list = true;
    else if (a === "--dry-run") out.dryRun = true;
    else if (a.startsWith("-")) out.unknown = a;
    else if (!out.command) out.command = a;
    else out.words.push(a);
  }
  return out;
}

// Edit distance, for "Did you mean check?"
function distance(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
  return d[a.length][b.length];
}

export function suggest(word, names = NAMES) {
  let best = null;
  for (const n of names) {
    const k = distance(word, n);
    if (k <= 2 && (!best || k < best.k)) best = { n, k };
  }
  return best ? best.n : null;
}

// Colour only for state; off with NO_COLOR, --no-color, or when the output is not a terminal.
export function painter(on) {
  const w = (code) => (s) => (on ? `\x1b[${code}m${s}\x1b[0m` : String(s));
  return { ok: w(32), bad: w(31), warn: w(33), dim: w(2), bold: w(1), cyan: w(36) };
}
export function colorOn(flags, env, isTTY) {
  return flags.color && !("NO_COLOR" in env) && env.TERM !== "dumb" && Boolean(isTTY);
}

// "1m 42s", "4.1 s"
export function took(ms) {
  if (ms < 10000) return `${(ms / 1000).toFixed(1)} s`;
  const s = Math.round(ms / 1000);
  return s < 60 ? `${s} s` : `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s`;
}

// One line per step: mark, name padded, what.
export function tick(c, state, name, what = "", width = 15) {
  const mark = {
    ok: c.ok("✓"),
    bad: c.bad("✗"),
    warn: c.warn("!"),
    run: c.cyan("…"),
    skip: c.dim("·"),
  }[state];
  return `${mark} ${name.padEnd(width)} ${what}`.trimEnd();
}

// The names a walk or pitch check can have, read from the scripts so a new one is completed without a change here.
export function walkNames(root) {
  const text = readFileSync(`${root}/tools/walk/run.sh`, "utf8");
  return ["recordings", ...[...text.matchAll(/^walk (\S+) /gm)].map((m) => m[1])];
}
export function pitchNames(root) {
  const m = readFileSync(`${root}/tools/pitch/run.sh`, "utf8").match(/^names="([^"]+)"/m);
  const base = m ? m[1].trim().split(/\s+/) : [];
  return base.flatMap((n) => [n, `${n}-desktop`, `${n}-phone`]);
}

// What Tab offers after the words typed so far (the last one is the one being typed).
export function complete(words, root) {
  const [cmd, ...rest] = words;
  const cur = words.length ? words[words.length - 1] : "";
  const pick = (list) => list.filter((x) => x.startsWith(cur));
  if (words.length <= 1) return pick([...NAMES, "--help"]);
  const before = rest.slice(0, -1);
  switch (cmd) {
    case "check":
      if (before.length === 0) return pick(["code", "walk", "pitch", "--quick", "--force"]);
      if (before[0] === "walk" && before.length === 1) return pick(walkNames(root));
      if (before[0] === "pitch" && before.length === 1) return pick(pitchNames(root));
      return pick(["--force"]);
    case "next":
      return before.length === 0 ? pick(["live", "dev", "preview", "--print"]) : pick(["--print"]);
    case "look":
      return before.length === 0 ? pick(["--list"]) : [];
    case "stop":
      return before.length === 0 ? pick([...Object.keys(SERVERS), "look"]) : [];
    case "release":
      return before.length === 0
        ? pick(["major", "minor", "patch", "--dry-run"])
        : pick(["--dry-run", "--yes"]);
    default:
      return [];
  }
}

// Installed as ~/.local/share/bash-completion/completions/showcase (loaded on the first Tab).
export const BASH_COMPLETION = `# showcase (ttshowcase repo): asks showcase itself what fits, so it follows the repo's commands.
_showcase() {
  local IFS=$'\\n'
  COMPREPLY=($(showcase __complete "\${COMP_WORDS[@]:1:COMP_CWORD}" 2>/dev/null))
}
complete -F _showcase showcase
`;

// Reads the [tools] pins from mise.toml: { node: "26.7.0", "npm:@playwright/cli": "0.1.22", ... }
export function misePins(text) {
  const pins = {};
  const block = text.split(/^\[tools\]\s*$/m)[1]?.split(/^\[/m)[0] ?? "";
  for (const m of block.matchAll(/^"?([^"=\s]+)"?\s*=\s*"([^"]+)"/gm)) pins[m[1]] = m[2];
  return pins;
}

// The first x.y.z in a version line ("v26.7.0", "Vercel CLI 58.4.4", "osv-scanner version: 2.7.1").
export function versionIn(text) {
  const m = String(text).match(/(\d+\.\d+\.\d+)/);
  return m ? m[1] : null;
}

// A failed log line can be megabytes (inlined font data): print at most `max` characters, with a visible marker.
export function cutLine(line, max = 300) {
  return line.length > max ? line.slice(0, max) + "…" : line;
}

// ---------- look: the work in progress ----------
// `git worktree list --porcelain` -> [{ path, branch }]; detached, bare and master worktrees are left out.
export function parseWorktrees(text) {
  const out = [];
  for (const block of String(text).split(/\n\s*\n/)) {
    let path = null,
      branch = null,
      bare = false;
    for (const l of block.split("\n")) {
      if (l.startsWith("worktree ")) path = l.slice(9);
      else if (l.startsWith("branch ")) branch = l.slice(7).replace(/^refs\/heads\//, "");
      else if (l === "bare") bare = true;
    }
    if (path && branch && !bare && branch !== "master") out.push({ path, branch });
  }
  return out;
}

// `gh pr list --json number,title,headRefName,isDraft,updatedAt` -> items
export function parsePrs(json) {
  let rows;
  try {
    rows = JSON.parse(json);
  } catch {
    return [];
  }
  return rows.map((r) => ({
    kind: "pr",
    number: r.number,
    title: r.title,
    branch: r.headRefName,
    draft: Boolean(r.isDraft),
    time: Date.parse(r.updatedAt) || 0,
  }));
}

// One line "<ahead>\t<unix seconds>\t<subject>" per branch (cli.mjs builds it from git) -> { ahead, time, subject }
export function parseBranchInfo(line) {
  const [ahead, secs, ...subject] = String(line).trim().split("\t");
  return {
    ahead: Number(ahead) || 0,
    time: (Number(secs) || 0) * 1000,
    subject: subject.join("\t"),
  };
}

// PRs, then the worktree branches that are ahead of master and have no open PR; newest first.
// info: { [branch]: { ahead, time, subject } }
export function lookItems({ prs, worktrees, info }) {
  const withPr = new Set(prs.map((p) => p.branch));
  const branches = worktrees
    .filter((w) => !withPr.has(w.branch) && info[w.branch]?.ahead > 0)
    .map((w) => ({ kind: "branch", branch: w.branch, path: w.path, ...info[w.branch] }));
  // a PR whose branch is checked out in a worktree knows where (the one it is served from)
  const withPath = prs.map((p) => ({
    ...p,
    path: worktrees.find((w) => w.branch === p.branch)?.path ?? null,
  }));
  return [...withPath, ...branches].sort((a, b) => b.time - a.time);
}

// "just now", "12 min ago" (the last hour), then "3 h ago", "2 days ago"
export function ago(ms, now = Date.now()) {
  const min = Math.floor((now - ms) / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  if (min < 1440) return `${Math.floor(min / 60)} h ago`;
  const d = Math.floor(min / 1440);
  return `${d} ${d === 1 ? "day" : "days"} ago`;
}

// The menu row for one item: what it is leads (PR title, last commit subject); number, branch and time are dim after it.
export function lookRow(it, now = Date.now(), cols = 100) {
  const cut = (t, n) => (t.length > n ? t.slice(0, n - 1) + "…" : t);
  const name = cut(
    it.kind === "pr" ? it.title : it.subject || it.branch,
    Math.max(24, Math.floor(cols * 0.5)),
  );
  const about = [
    it.kind === "pr" ? `#${it.number}${it.draft ? " draft" : ""}` : "no PR",
    it.branch,
    ago(it.time, now),
  ].join(" · ");
  return { name, about };
}

// `showcase look <word>`: "95" or "#95" is a PR, anything else a branch or its worktree folder. null when none fits.
export function pickLook(items, word) {
  const num = /^#?(\d+)$/.exec(word);
  if (num) return items.find((x) => x.kind === "pr" && x.number === Number(num[1])) ?? null;
  return (
    items.find((x) => x.branch === word) ??
    items.find((x) => x.kind === "branch" && x.path.split("/").pop() === word) ??
    null
  );
}

// The server's record name for a branch: "feat/epa-painted" -> "look-feat-epa-painted"
export function lookName(branch) {
  return (
    LOOK_PREFIX +
    branch
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
  );
}

// Where a branch's folder goes: .claude/worktrees/<branch, slashes as dashes>
export function worktreeFolder(branch) {
  return branch.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
}

// The first port from `from` that is not in `taken`.
export function freePort(taken, from = LOOK_PORT_FROM) {
  let p = from;
  while (taken.includes(p)) p++;
  return p;
}

/** The hash of dir's package-lock.json: what the last `npm ci` there was made from. */
export function lockHash(dir) {
  return createHash("sha256")
    .update(readFileSync(join(dir, "package-lock.json")))
    .digest("hex");
}

/**
 * Whether dir's installed packages match its package-lock.json (F-look-1: after a pull with a changed lock the
 * main checkout said "already installed", then failed with ERR_MODULE_NOT_FOUND). The stamp node_modules/.showcase-lock
 * holds the lock's hash from the last install; with no stamp yet, npm's own copy of the lock must be newer than the lock.
 */
export function packagesCurrent(dir) {
  try {
    statSync(join(dir, "node_modules"));
  } catch {
    return false;
  }
  try {
    return readFileSync(join(dir, "node_modules/.showcase-lock"), "utf8").trim() === lockHash(dir);
  } catch {
    try {
      return (
        statSync(join(dir, "node_modules/.package-lock.json")).mtimeMs >=
        statSync(join(dir, "package-lock.json")).mtimeMs
      );
    } catch {
      return false;
    }
  }
}

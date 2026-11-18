// The parts of `showcase` that only compute: command list, argument reading, typo hints, colours, completion.
// Everything that runs something lives in cli.mjs. Tests: lib.test.mjs.
import { readFileSync } from "node:fs";

// One line each: the menu, --help and the completion all read this list.
export const COMMANDS = [
  { name: "dev", about: "live editing on Tailscale, link + QR", menu: true },
  { name: "pitch", about: "the paint walk with your own local tag wall", menu: true },
  { name: "next", about: "open /next: live, dev, or preview [PR]", menu: true },
  { name: "check", about: "the whole check, or one part: check walk route-phone", menu: true },
  { name: "doctor", about: "is this PC ready", menu: true },
  { name: "status", about: "branch, what runs, what's live, saved passes", menu: false },
  { name: "stop", about: "stop what showcase started: stop [dev|pitch]", menu: true },
  { name: "release", about: "name what's live: major|minor|patch|vX.Y.Z, --dry-run", menu: true },
];
export const NAMES = COMMANDS.map((c) => c.name);

// The servers showcase starts in the background, and the ports they use.
export const SERVERS = { dev: 3000, pitch: 8124 };

// --help per command: what it does, then real examples.
export const HELP = {
  dev: [
    "Starts the dev server in the background on this PC's Tailscale address and prints the link and a QR.",
    "showcase dev",
    "PORT=3001 showcase dev",
  ],
  pitch: [
    "Builds the paint walk and serves it in the background with a local tag store (tags stay on this PC).",
    "showcase pitch",
  ],
  next: [
    "Opens /next behind its key: live (ttdevs.com), dev (this PC's dev server) or a PR's preview with a QR.",
    "showcase next",
    "showcase next dev --print",
    "showcase next preview 45",
  ],
  check: [
    "The whole check before a PR: code, then the walks, then the pitch checks. A part that passed on this commit is skipped.",
    "showcase check",
    "showcase check --quick",
    "showcase check walk route-phone",
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
  };
  for (const a of argv) {
    if (a === "-h" || a === "--help") out.help = true;
    else if (a === "--no-color") out.color = false;
    else if (a === "--version") out.version = true;
    else if (a === "--force") out.force = true;
    else if (a === "--quick") out.quick = true;
    else if (a === "--yes" || a === "-y") out.yes = true;
    else if (a === "--print") out.print = true;
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
  const m = readFileSync(`${root}/tools/walk/run.sh`, "utf8").match(/Names: ([^"]+)"/);
  return m ? m[1].trim().split(/\s+/) : [];
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
    case "stop":
      return before.length === 0 ? pick(Object.keys(SERVERS)) : [];
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

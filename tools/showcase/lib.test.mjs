import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  ago,
  colorOn,
  freePort,
  lookItems,
  lookName,
  lookRow,
  parseBranchInfo,
  parsePrs,
  parseWorktrees,
  pickLook,
  cutLine,
  complete,
  misePins,
  painter,
  parseArgs,
  pitchNames,
  suggest,
  tick,
  took,
  versionIn,
  lockHash,
  packagesCurrent,
  walkNames,
  worktreeFolder,
} from "./lib.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

test("reads the command, its words and the shared flags", () => {
  const f = parseArgs(["check", "walk", "look-phone", "--force", "--no-color"]);
  assert.equal(f.command, "check");
  assert.deepEqual(f.words, ["walk", "look-phone"]);
  assert.equal(f.force, true);
  assert.equal(f.color, false);
  assert.equal(parseArgs(["--wat"]).unknown, "--wat");
});

test("a typo gets the nearest command, nonsense gets none", () => {
  assert.equal(suggest("chek"), "check");
  assert.equal(suggest("stauts"), "status");
  assert.equal(suggest("zzzzzz"), null);
});

test("colour is off for NO_COLOR, --no-color, dumb terminals and pipes", () => {
  const on = parseArgs([]);
  assert.equal(colorOn(on, {}, true), true);
  assert.equal(colorOn(on, { NO_COLOR: "" }, true), false);
  assert.equal(colorOn(on, { TERM: "dumb" }, true), false);
  assert.equal(colorOn(on, {}, false), false);
  assert.equal(colorOn(parseArgs(["--no-color"]), {}, true), false);
  assert.equal(painter(false).ok("x"), "x");
});

test("times and ticks read the same everywhere", () => {
  assert.equal(took(4100), "4.1 s");
  assert.equal(took(42000), "42 s");
  assert.equal(took(102000), "1m 42s");
  assert.equal(tick(painter(false), "ok", "dev", "ready"), "✓ dev             ready");
});

test("completion offers commands, parts and the real walk and check names", () => {
  assert.deepEqual(complete(["st"], root), ["status", "stop"]);
  assert.deepEqual(complete(["check", ""], root), ["code", "walk", "pitch", "--quick", "--force"]);
  assert.ok(complete(["check", "walk", "look"], root).includes("look-phone"));
  assert.ok(complete(["check", "pitch", "contrast-"], root).includes("contrast-phone"));
  assert.deepEqual(complete(["stop", ""], root), ["dev", "pitch", "look"]);
  assert.deepEqual(walkNames(root).slice(0, 3), ["recordings", "look-desktop", "look-phone"]);
  assert.ok(pitchNames(root).includes("tour-desktop"));
});

test("reads the mise pins and the versions tools print", () => {
  const pins = misePins('[tools]\nnode = "26.7.0"\n"npm:vercel" = "58.4.4"\n\n[env]\nX = "1"\n');
  assert.deepEqual(pins, { node: "26.7.0", "npm:vercel": "58.4.4" });
  assert.equal(versionIn("v26.7.0"), "26.7.0");
  assert.equal(versionIn("Vercel CLI 58.4.4"), "58.4.4");
  assert.equal(versionIn("nothing"), null);
});

test("cutLine cuts a huge line with a marker and leaves short ones", () => {
  assert.equal(cutLine("short"), "short");
  const cut = cutLine("x".repeat(1_600_000));
  assert.equal(cut.length, 301);
  assert.ok(cut.endsWith("…"));
});

const WT = `worktree /r
HEAD aaa
branch refs/heads/master

worktree /r/.claude/worktrees/audits
HEAD bbb
detached

worktree /r/.claude/worktrees/epa-painted
HEAD ccc
branch refs/heads/feat/epa-painted

worktree /r/.claude/worktrees/walk-phone
HEAD ddd
branch refs/heads/feat/walk-phone

worktree /r/.claude/worktrees/merged
HEAD eee
branch refs/heads/feat/merged
`;
const PRS = JSON.stringify([
  {
    number: 96,
    title: "pitch: poster",
    headRefName: "pitch/start-poster",
    isDraft: true,
    updatedAt: "2026-11-25T07:00:00Z",
  },
  {
    number: 95,
    title: "feat: stencil",
    headRefName: "feat/walk-phone",
    isDraft: false,
    updatedAt: "2026-11-25T21:00:00Z",
  },
]);

test("worktrees: master and detached ones are left out", () => {
  assert.deepEqual(
    parseWorktrees(WT).map((w) => w.branch),
    ["feat/epa-painted", "feat/walk-phone", "feat/merged"],
  );
});

test("look lists PRs and PR-less branches ahead of master, newest first", () => {
  const info = {
    "feat/epa-painted": parseBranchInfo(
      `2\t${Date.parse("2026-11-25T12:00:00Z") / 1000}\tpainted epa`,
    ),
    "feat/walk-phone": parseBranchInfo(
      `3\t${Date.parse("2026-11-25T22:00:00Z") / 1000}\tsame as PR 95`,
    ),
    "feat/merged": parseBranchInfo(`0\t1\told`),
  };
  const items = lookItems({ prs: parsePrs(PRS), worktrees: parseWorktrees(WT), info });
  assert.deepEqual(
    items.map((x) => (x.kind === "pr" ? `#${x.number}` : x.branch)),
    ["#95", "feat/epa-painted", "#96"],
  );
  assert.equal(items[2].draft, true);
  assert.equal(items[0].path, "/r/.claude/worktrees/walk-phone"); // PR 95's branch is checked out
  assert.equal(items[2].path, null); // PR 96's is not: look makes the folder when it is picked
  assert.deepEqual(parsePrs("not json"), []);
});

test("look rows, times and picking by number, branch or folder", () => {
  const now = Date.parse("2026-11-25T22:00:00Z");
  assert.equal(ago(now - 30000, now), "just now");
  assert.equal(ago(now - 12 * 60000, now), "12 min ago");
  assert.equal(ago(now - 3 * 3600000, now), "3 h ago");
  assert.equal(ago(now - 2 * 86400000, now), "2 days ago");
  const items = lookItems({
    prs: parsePrs(PRS),
    worktrees: parseWorktrees(WT),
    info: { "feat/epa-painted": { ahead: 1, time: now - 60000, subject: "painted" } },
  });
  const r96 = lookRow(
    items.find((x) => x.number === 96),
    now,
  );
  assert.equal(r96.name, "pitch: poster");
  assert.equal(r96.about, "#96 draft · pitch/start-poster · 15 h ago");
  const rb = lookRow(
    items.find((x) => x.branch === "feat/epa-painted"),
    now,
  );
  assert.deepEqual(rb, { name: "painted", about: "no PR · feat/epa-painted · 1 min ago" });
  assert.ok(
    lookRow(
      { ...items.find((x) => x.number === 95), title: "x".repeat(200) },
      now,
      80,
    ).name.endsWith("…"),
  );
  assert.equal(pickLook(items, "#95").number, 95);
  assert.equal(pickLook(items, "96").number, 96);
  assert.equal(pickLook(items, "feat/epa-painted").branch, "feat/epa-painted");
  assert.equal(pickLook(items, "epa-painted").branch, "feat/epa-painted");
  assert.equal(pickLook(items, "nope"), null);
});

test("a branch gets its own server name and a port that is free", () => {
  assert.equal(lookName("feat/Epa_painted"), "look-feat-epa-painted");
  assert.equal(freePort([8130, 8131]), 8132);
  assert.equal(freePort([]), 8130);
  assert.equal(worktreeFolder("pitch/start-poster"), "pitch-start-poster");
});

test("packages are current only while they match package-lock.json, in the main checkout too (F-look-1)", () => {
  const dir = mkdtempSync(join(tmpdir(), "showcase-lock-"));
  try {
    writeFileSync(join(dir, "package-lock.json"), "one");
    assert.equal(packagesCurrent(dir), false, "no node_modules yet");
    mkdirSync(join(dir, "node_modules"));
    writeFileSync(join(dir, "node_modules/.showcase-lock"), lockHash(dir) + "\n");
    assert.equal(packagesCurrent(dir), true);
    writeFileSync(join(dir, "package-lock.json"), "two"); // a pull changed the lock
    assert.equal(packagesCurrent(dir), false);
    rmSync(join(dir, "node_modules/.showcase-lock")); // no stamp: npm's own copy of the lock is the record
    writeFileSync(join(dir, "node_modules/.package-lock.json"), "{}");
    utimesSync(join(dir, "package-lock.json"), 2000, 2000);
    utimesSync(join(dir, "node_modules/.package-lock.json"), 3000, 3000);
    assert.equal(packagesCurrent(dir), true);
    utimesSync(join(dir, "package-lock.json"), 4000, 4000);
    assert.equal(packagesCurrent(dir), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

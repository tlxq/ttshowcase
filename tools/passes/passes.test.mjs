// tools/passes/passes.sh: a saved pass stays tied to its own tree, so going back to a tree that already passed skips
// the check again (F-87-2, 11-24: one file per check meant each new pass wiped the last one). Since the workflow
// audit (11-26) a dirty tree saves and skips too, and worktrees share their passes.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
// a temp repo must not see the outer repo's git settings (a hook's GIT_DIR would point it at the real repo)
const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith("GIT_")));
Object.assign(env, {
  GIT_AUTHOR_NAME: "t",
  GIT_AUTHOR_EMAIL: "t@example.com",
  GIT_COMMITTER_NAME: "t",
  GIT_COMMITTER_EMAIL: "t@example.com",
});

test("a pass on one commit survives a pass on another", () => {
  const repo = mkdtempSync(join(tmpdir(), "passes-"));
  try {
    const git = (...a) => execFileSync("git", ["-C", repo, ...a], { env, encoding: "utf8" }).trim();
    mkdirSync(join(repo, "tools/passes"), { recursive: true });
    cpSync(join(here, "passes.sh"), join(repo, "tools/passes/passes.sh"));
    writeFileSync(join(repo, ".gitignore"), ".cache/\n");
    writeFileSync(join(repo, "package-lock.json"), "{}\n");
    git("init", "-q");
    git("add", "-A");
    git("commit", "-qm", "a");
    const a = git("rev-parse", "HEAD");
    const passes = (...a) =>
      spawnSync("bash", [join(repo, "tools/passes/passes.sh"), ...a], { env, encoding: "utf8" });
    passes("save", "walk");
    writeFileSync(join(repo, "b.txt"), "b\n");
    git("add", "-A");
    git("commit", "-qm", "b");
    passes("save", "walk");
    assert.equal(passes("skip", "walk").status, 0, "b's own pass");
    git("checkout", "-q", a);
    assert.equal(passes("skip", "walk").status, 0, "a's pass is still saved after b's");
    writeFileSync(join(repo, "dirty.txt"), "x\n");
    assert.notEqual(
      passes("skip", "walk").status,
      0,
      "a changed tree that never passed doesn't skip",
    );
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

// one temp repo with passes.sh committed, for the tests below
function repoWithPasses() {
  const repo = mkdtempSync(join(tmpdir(), "passes-"));
  const git = (...a) => execFileSync("git", ["-C", repo, ...a], { env, encoding: "utf8" }).trim();
  mkdirSync(join(repo, "tools/passes"), { recursive: true });
  cpSync(join(here, "passes.sh"), join(repo, "tools/passes/passes.sh"));
  writeFileSync(join(repo, ".gitignore"), ".cache/\n.claude/\n");
  writeFileSync(join(repo, "package-lock.json"), "{}\n");
  git("init", "-q");
  git("add", "-A");
  git("commit", "-qm", "a");
  const passes = (cwd, ...a) =>
    spawnSync("bash", [join(cwd, "tools/passes/passes.sh"), ...a], { env, encoding: "utf8" });
  return { repo, git, passes };
}

test("a dirty tree that passed skips on the same content, not after another edit (workflow audit 11-26)", () => {
  const { repo, git, passes } = repoWithPasses();
  try {
    writeFileSync(join(repo, "wip.txt"), "1\n");
    const before = git("status", "--porcelain");
    assert.equal(passes(repo, "save", "walk").status, 0);
    assert.equal(git("status", "--porcelain"), before, "the real index is untouched");
    const skip = passes(repo, "skip", "walk");
    assert.equal(skip.status, 0, "same dirty tree skips");
    assert.match(skip.stdout, /walk: already passed on these files, skipped/);
    writeFileSync(join(repo, "wip.txt"), "2\n");
    assert.notEqual(passes(repo, "skip", "walk").status, 0, "an edit after the pass runs it again");
    assert.notEqual(passes(repo, "skip", "pitch").status, 0, "another check's pass doesn't count");
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test("a pass made in a worktree skips in the main checkout on the same tree", () => {
  const { repo, git, passes } = repoWithPasses();
  try {
    const wt = join(repo, ".claude/worktrees/x");
    git("worktree", "add", "-q", "--detach", wt);
    writeFileSync(join(wt, "c.txt"), "c\n");
    assert.equal(passes(wt, "save", "walk").status, 0);
    assert.notEqual(passes(repo, "skip", "walk").status, 0, "the main checkout is on another tree");
    writeFileSync(join(repo, "c.txt"), "c\n");
    assert.equal(passes(repo, "skip", "walk").status, 0, "same tree in the main checkout: skipped");
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test("files edited during a run don't get its pass: the tree is the one at the start (reviewer 11-26)", () => {
  const { repo, passes } = repoWithPasses();
  try {
    writeFileSync(join(repo, "a.txt"), "start\n");
    assert.notEqual(passes(repo, "skip", "walk").status, 0, "never passed: runs");
    writeFileSync(join(repo, "a.txt"), "edited mid-run\n");
    passes(repo, "save", "walk");
    assert.notEqual(passes(repo, "skip", "walk").status, 0, "the edited files were never checked");
    assert.notEqual(passes(repo, "has", "walk").status, 0);
    writeFileSync(join(repo, "a.txt"), "start\n");
    assert.equal(
      passes(repo, "has", "walk").status,
      0,
      "the files the run started on have the pass",
    );
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

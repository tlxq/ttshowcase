// tools/passes/passes.sh: a saved pass stays tied to its own commit, so going back to a commit that already passed
// skips the check again (F-87-2, 11-24: one file per check meant each new pass wiped the last one).
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
    assert.notEqual(passes("skip", "walk").status, 0, "a dirty tree never skips");
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

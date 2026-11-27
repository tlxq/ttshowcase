// The install task's first step (mise.toml): the npm packages are there and match package-lock.json, or `npm ci` puts them there.
// A fresh worktree has none (the old `[ -d node_modules ] || npm ci` was enough), but a worktree whose node_modules is a link to
// another checkout's (the Next build fails on one) or was left from an older lock also said "installed", then failed in the build.
// A link is removed (the link only, never what it points at) and the packages installed for real. Stamp as `showcase` writes it.
import { spawnSync } from "node:child_process";
import { lstatSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { lockHash, packagesCurrent } from "./lib.mjs";

/** What a failed install leaves: no packages in this folder (an offline npm ci stops after the old ones are gone). */
export const FAILED_WORDS =
  "The install failed (offline?): this folder has no packages now, so build, check and walk will not run here. Get online and run: mise run install";

/** Returns what it did: "current", "installed" or "failed". `run` installs (npm ci) in dir and returns its exit code. */
export function ensurePackages(dir, run, say = console.log, warn = console.error) {
  const modules = join(dir, "node_modules");
  let isLink = false;
  try {
    isLink = lstatSync(modules).isSymbolicLink();
  } catch {
    // none yet
  }
  if (!isLink && packagesCurrent(dir)) return "current";
  if (isLink) {
    say(
      "node_modules here is a link to another folder; removing the link and installing the packages for this folder",
    );
    unlinkSync(modules);
  } else {
    say("The packages are missing or older than package-lock.json; installing them");
  }
  if (run(dir) !== 0) {
    warn(FAILED_WORDS);
    return "failed";
  }
  writeFileSync(join(modules, ".showcase-lock"), lockHash(dir) + "\n");
  return "installed";
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const npmCi = (dir) => spawnSync("npm", ["ci"], { cwd: dir, stdio: "inherit" }).status ?? 1;
  const result = ensurePackages(process.cwd(), npmCi);
  if (result === "failed") process.exit(1); // ensurePackages has said why
}

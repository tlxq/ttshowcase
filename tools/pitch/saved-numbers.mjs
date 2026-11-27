// The last known numbers for the street wall's notes and the Toolbox's counts (Tom 11-27): when the live /api/github answer is missing or
// lacks a number, the page draws the number its build saw instead of leaving the lobe empty. Absent in both = not drawn, as before.
// Each build asks GitHub with the same code the site's /api/github uses (api/github.ts, with GITHUB_TOKEN for raddavarfruberga's if the
// build has one), keeps what it got in .cache/numbers.saved.json, falls back per number to that file (an earlier build on this machine),
// and puts the result into the page as plain text (__SAVED_NUMBERS__). It never fails the build. So "last known" is only what this build
// got from GitHub, else what an earlier build on the same machine saved, else nothing: on Vercel a number is at most one deploy old
// (there is no file from before), and a double failure leaves the lobe empty, never an old number. No committed copy of numbers exists.
// PITCH_NUMBERS=off (the checks and the sheet) puts in none at all: no GitHub ask, no file read, so they are the same on every run.
// Only names and positive whole numbers are ever saved: the token goes to GitHub and nowhere else. Tests: tools/pitch/saved-numbers.test.mjs.
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

// the only numbers there are: wall -> its keys (api/github.ts's answer)
export const KNOWN = {
  dot: ["commits", "tests"],
  ttoolbox: ["commits", "skills"],
  tthermal: ["commits", "merged"],
  epa: ["commits", "merged", "tests", "migrations"],
  rvf: ["commits", "merged"],
};

/** Anything in, only known names with positive whole numbers out (a wall with none is left out). */
export function cleanNumbers(x) {
  const out = {};
  for (const [wall, keys] of Object.entries(KNOWN)) {
    for (const key of keys) {
      const n = x?.[wall]?.[key];
      if (Number.isSafeInteger(n) && n > 0) (out[wall] ??= {})[key] = n;
    }
  }
  return out;
}

/** Each number: the live one if it came, else the older one, else none. */
export function mergeNumbers(live, older) {
  const a = cleanNumbers(live),
    b = cleanNumbers(older),
    out = {};
  for (const [wall, keys] of Object.entries(KNOWN))
    for (const key of keys) {
      const n = a[wall]?.[key] ?? b[wall]?.[key];
      if (n != null) (out[wall] ??= {})[key] = n;
    }
  return out;
}

const readJson = (file) => {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return {};
  }
};

/**
 * The numbers to put into the page, as one line of JSON. `ask` is api/github.ts's numbers(get, token); a build that can't
 * reach GitHub (or has `skip`) keeps the saved file's numbers, then none; `skip` puts in none and reads nothing.
 */
export async function savedNumbers({
  cache,
  ask,
  token,
  skip = false,
  maxAgeMs = 6 * 3600e3,
  log = () => {},
}) {
  if (skip) return "{}";
  const older = mergeNumbers(readJson(cache), {});
  let fresh = {};
  let age = Infinity;
  try {
    age = Date.now() - statSync(cache).mtimeMs;
  } catch {}
  if (age > maxAgeMs) {
    try {
      const signal = AbortSignal.timeout(15000);
      fresh = cleanNumbers(await ask((url, init) => fetch(url, { ...init, signal }), token));
    } catch (e) {
      log(
        `Couldn't ask GitHub for the saved numbers (${e instanceof Error ? e.message : e}): keeping the last ones`,
      );
    }
  }
  const merged = mergeNumbers(fresh, older);
  if (Object.keys(fresh).length) {
    try {
      mkdirSync(dirname(cache), { recursive: true });
      writeFileSync(cache, JSON.stringify(merged) + "\n");
    } catch (e) {
      log(`Couldn't save ${cache}: ${e instanceof Error ? e.message : e}`);
    }
  }
  return JSON.stringify(merged);
}

export const paths = (root) => ({
  cache: join(root, ".cache/numbers.saved.json"),
});

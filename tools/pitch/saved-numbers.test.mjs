// tools/pitch/saved-numbers.mjs and the page's rule for it: a number the live answer lacks is the build's last known one; the build never fails for it;
// only names and numbers are ever saved.
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { cleanNumbers, mergeNumbers, savedNumbers } from "./saved-numbers.mjs";

const root = join(import.meta.dirname, "..", "..");

// the page's rule, cut out of pitch/paint/30-walls.js and run on its own
const walls = readFileSync(join(root, "pitch/paint/30-walls.js"), "utf8");
const pickNum = eval(
  `(${/const pickNum = (\(d, saved, wall, key\) => \{.*?\});\n/s.exec(walls)?.[1]})`,
);
const saved = { epa: { commits: 346, tests: 73 } };

test("the page draws the live number, else the saved one, else nothing", () => {
  assert.equal(pickNum({ epa: { commits: 400 } }, saved, "epa", "commits"), 400);
  assert.equal(pickNum({}, saved, "epa", "commits"), 346);
  assert.equal(pickNum({ epa: { commits: null, tests: 0 } }, saved, "epa", "commits"), 346);
  assert.equal(
    pickNum({ epa: { commits: null, tests: 0 } }, saved, "epa", "tests"),
    73,
    "a live 0 is no number",
  );
  assert.throws(() => pickNum({}, saved, "epa", "merged"));
  assert.throws(() => pickNum({}, {}, "epa", "commits"));
  assert.throws(() => pickNum({}, undefined, "rvf", "commits"));
});

test("the page has the saved numbers put in by the build, in the one place that uses them", () => {
  assert.equal(walls.match(/__SAVED_NUMBERS__/g)?.length, 1);
  assert.match(
    walls,
    /numOf = \(wall, key\) => NUMS\.then\(d => pickNum\(d, SAVED_NUMBERS, wall, key\)\)/,
  );
});

test("clean keeps only known names with positive whole numbers", () => {
  assert.deepEqual(
    cleanNumbers({
      epa: { commits: 5, tests: "7", merged: 0, extra: 3, migrations: 1.5 },
      secret: { token: 1 },
      rvf: { commits: -1 },
      token: "ghp_x",
    }),
    { epa: { commits: 5 } },
  );
  assert.deepEqual(cleanNumbers(null), {});
});

test("merge takes each number from the live answer, else the older one", () => {
  assert.deepEqual(
    mergeNumbers(
      { epa: { commits: 10, merged: null } },
      { epa: { commits: 5, merged: 3 }, rvf: { commits: 9 } },
    ),
    { epa: { commits: 10, merged: 3 }, rvf: { commits: 9 } },
  );
});

function setup(files = {}) {
  const dir = mkdtempSync(join(tmpdir(), "saved-numbers-"));
  const cache = join(dir, "cache.json"),
    seed = join(dir, "seed.json");
  if (files.cache) writeFileSync(cache, JSON.stringify(files.cache));
  if (files.seed) writeFileSync(seed, JSON.stringify(files.seed));
  return { dir, cache, seed, done: () => rmSync(dir, { recursive: true, force: true }) };
}

test("GitHub unreachable: the build keeps the saved file's numbers, then the seed, and does not throw", async () => {
  const t = setup({ cache: { epa: { commits: 400 } }, seed: { epa: { commits: 300, tests: 70 } } });
  try {
    const logs = [];
    const out = await savedNumbers({
      ...t,
      ask: async () => {
        throw new Error("fetch failed");
      },
      log: (m) => logs.push(m),
      maxAgeMs: -1,
    });
    assert.deepEqual(JSON.parse(out), { epa: { commits: 400, tests: 70 } });
    assert.match(logs[0], /Couldn't ask GitHub/);
    assert.equal(
      JSON.parse(readFileSync(t.cache, "utf8")).epa.commits,
      400,
      "the saved file is left as it was",
    );
  } finally {
    t.done();
  }
});

test("no saved file, no seed, no GitHub: no numbers, no error", async () => {
  const t = setup();
  try {
    assert.equal(
      await savedNumbers({
        ...t,
        ask: async () => {
          throw new Error("offline");
        },
      }),
      "{}",
    );
    assert.equal(existsSync(t.cache), false);
  } finally {
    t.done();
  }
});

test("a live answer is saved, a missing number in it falls back, and no token or unknown name is ever written", async () => {
  const t = setup({ seed: { epa: { commits: 300, migrations: 5 } } });
  try {
    let seenToken;
    const ask = async (_get, token) => {
      seenToken = token;
      return {
        epa: { commits: 346, migrations: null },
        rvf: { commits: 406, merged: 26 },
        token: "ghp_SECRET",
        note: { token: 9 },
      };
    };
    const out = await savedNumbers({ ...t, ask, token: "ghp_SECRET" });
    assert.equal(seenToken, "ghp_SECRET", "the token goes to GitHub");
    assert.deepEqual(JSON.parse(out), {
      epa: { commits: 346, migrations: 5 },
      rvf: { commits: 406, merged: 26 },
    });
    const file = readFileSync(t.cache, "utf8");
    assert.equal(file.trim(), out);
    assert.doesNotMatch(out + file, /ghp_|token|SECRET/);
  } finally {
    t.done();
  }
});

test("a fresh saved file is not asked again; skip never asks", async () => {
  const t = setup({ cache: { epa: { commits: 1 } } });
  try {
    let asked = 0;
    const ask = async () => (asked++, { epa: { commits: 2 } });
    assert.deepEqual(JSON.parse(await savedNumbers({ ...t, ask })), { epa: { commits: 1 } });
    assert.equal(asked, 0);
    const old = new Date(Date.now() - 7 * 3600e3);
    utimesSync(t.cache, old, old);
    assert.equal(JSON.parse(await savedNumbers({ ...t, ask, skip: true })).epa.commits, 1);
    assert.equal(asked, 0);
    assert.equal(JSON.parse(await savedNumbers({ ...t, ask })).epa.commits, 2);
    assert.equal(asked, 1);
  } finally {
    t.done();
  }
});

test("the committed seed holds only known names and numbers", () => {
  const seed = JSON.parse(readFileSync(join(root, "pitch/numbers.seed.json"), "utf8"));
  assert.deepEqual(cleanNumbers(seed), seed);
  assert.ok(Object.keys(seed).length > 0);
});

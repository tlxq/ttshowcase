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
  const cache = join(dir, "cache.json");
  if (files.cache) writeFileSync(cache, JSON.stringify(files.cache));
  return { dir, cache, done: () => rmSync(dir, { recursive: true, force: true }) };
}
const offline = async () => {
  throw new Error("fetch failed");
};

test("GitHub unreachable: the build keeps what an earlier build saved on this machine, and does not throw", async () => {
  const t = setup({ cache: { epa: { commits: 400 } } });
  try {
    const logs = [];
    const out = await savedNumbers({ ...t, ask: offline, log: (m) => logs.push(m), maxAgeMs: -1 });
    assert.deepEqual(JSON.parse(out), { epa: { commits: 400 } });
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

test("no saved file and no GitHub (a first build, or a double failure): no numbers, no error, and nothing else is read", async () => {
  const t = setup();
  try {
    assert.equal(await savedNumbers({ ...t, ask: offline }), "{}");
    assert.equal(existsSync(t.cache), false);
  } finally {
    t.done();
  }
  assert.equal(
    existsSync(join(root, "pitch/numbers.seed.json")),
    false,
    "a committed copy of numbers could be weeks old and look live",
  );
});

test("a live answer is saved, a number missing from it falls back to the saved file, and no token or unknown name is ever written", async () => {
  const t = setup({ cache: { epa: { commits: 300, migrations: 5 } } });
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
    const out = await savedNumbers({ ...t, ask, token: "ghp_SECRET", maxAgeMs: -1 });
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

test("a fresh saved file is not asked again", async () => {
  const t = setup({ cache: { epa: { commits: 1 } } });
  try {
    let asked = 0;
    const ask = async () => (asked++, { epa: { commits: 2 } });
    assert.deepEqual(JSON.parse(await savedNumbers({ ...t, ask })), { epa: { commits: 1 } });
    assert.equal(asked, 0);
    const old = new Date(Date.now() - 7 * 3600e3);
    utimesSync(t.cache, old, old);
    assert.equal(JSON.parse(await savedNumbers({ ...t, ask })).epa.commits, 2);
    assert.equal(asked, 1);
  } finally {
    t.done();
  }
});

test("skip (PITCH_NUMBERS=off) puts in no numbers: no GitHub ask, no file read", async () => {
  const t = setup({ cache: { epa: { commits: 1 } } });
  try {
    let asked = 0;
    const ask = async () => (asked++, { epa: { commits: 2 } });
    const old = new Date(Date.now() - 7 * 3600e3);
    utimesSync(t.cache, old, old);
    assert.equal(await savedNumbers({ ...t, ask, skip: true }), "{}");
    assert.equal(asked, 0);
    assert.equal(
      JSON.parse(readFileSync(t.cache, "utf8")).epa.commits,
      1,
      "the file is not touched either",
    );
  } finally {
    t.done();
  }
});

test("the checks and the sheet build their pages with no saved numbers", () => {
  const sheet = readFileSync(join(root, "tools/pitch/sheet.sh"), "utf8");
  assert.equal(
    sheet.match(/node (\S*)tools\/pitch\/build\.mjs/g)?.length,
    2,
    "both of the sheet's builds",
  );
  for (const line of sheet.split("\n").filter((l) => /node \S*tools\/pitch\/build\.mjs/.test(l)))
    assert.match(line, /PITCH_NUMBERS=off/, `the sheet builds with saved numbers: ${line.trim()}`);
  assert.match(
    readFileSync(join(root, "mise.toml"), "utf8"),
    /\[tasks\."pitch:check"\][^[]*env = \{ PITCH_NUMBERS = "off" \}/,
    "mise run pitch:check builds with saved numbers",
  );
  const run = readFileSync(join(root, "tools/pitch/run.sh"), "utf8");
  assert.match(
    run,
    /const SAVED_NUMBERS = \{\};/,
    "run.sh no longer checks that the build it walks has no saved numbers",
  );
});

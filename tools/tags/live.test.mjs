// tools/tags/live.sh and the address it sends to. An address that came out empty (a failed look-up) once fell back to
// ttdevs.com and sent a tag to the live site (11-28). Here the home folder is empty, so the script stops at the
// missing secret before anything is sent.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const script = join(import.meta.dirname, "live.sh");
function run(...args) {
  const home = mkdtempSync(join(tmpdir(), "tags-live-"));
  try {
    return spawnSync("bash", [script, ...args], {
      env: { PATH: process.env.PATH, HOME: home },
      encoding: "utf8",
    });
  } finally {
    rmSync(home, { recursive: true });
  }
}

test("tags:live refuses an empty address instead of using the live site", () => {
  for (const empty of ["", "  "]) {
    const r = run(empty);
    assert.equal(r.status, 2);
    assert.match(r.stderr, /^Couldn't start the tag round\. The address is empty\./);
  }
});

test("tags:live without an address still goes on to the live site's round", () => {
  const r = run();
  assert.equal(r.status, 1);
  assert.match(r.stderr, /^Couldn't find the tag review secret/);
});

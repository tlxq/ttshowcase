// tools/next.sh: by default it opens the browser (Tom's use); --print or NEXT_PRINT=1 only prints the link (scripts, the phone).
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const script = join(fileURLToPath(import.meta.url), "../../next.sh");

// a home with a key and an xdg-open that only leaves a mark; returns what the script printed and whether it "opened" anything
function run(args, env = {}) {
  const home = mkdtempSync(join(tmpdir(), "next-test-"));
  try {
    mkdirSync(join(home, ".config/ttdevs"), { recursive: true });
    writeFileSync(join(home, ".config/ttdevs/ttshowcase-next.key"), "k e/y\n");
    mkdirSync(join(home, "bin"));
    const mark = join(home, "opened");
    writeFileSync(join(home, "bin/xdg-open"), `#!/bin/sh\necho "$1" > "${mark}"\n`);
    chmodSync(join(home, "bin/xdg-open"), 0o755);
    const r = spawnSync("bash", [script, ...args], {
      encoding: "utf8",
      env: { PATH: `${join(home, "bin")}:${process.env.PATH}`, HOME: home, ...env },
    });
    // the opener runs in the background: give it a moment before looking
    spawnSync("sleep", ["0.3"]);
    return { out: r.stdout, code: r.status, opened: existsSync(mark) };
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
}

test("by default it opens the browser", () => {
  const r = run(["live"]);
  assert.equal(r.code, 0);
  assert.equal(r.opened, true);
});

test("--print prints the link and opens nothing, in either place", () => {
  for (const args of [["live", "--print"], ["--print", "live"], ["--print"]]) {
    const r = run(args);
    assert.equal(r.code, 0, args.join(" "));
    assert.equal(r.opened, false, args.join(" "));
    assert.match(r.out, /^https:\/\/ttdevs\.com\/next\?key=k%20e%2Fy$/m, args.join(" "));
  }
});

test("NEXT_PRINT=1 prints the link and opens nothing", () => {
  const r = run(["live"], { NEXT_PRINT: "1" });
  assert.equal(r.opened, false);
  assert.match(r.out, /\/next\?key=k%20e%2Fy/);
});

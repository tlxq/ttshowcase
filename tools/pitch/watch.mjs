// Live reload for the pitch on this PC: watches the pitch's sources, rebuilds into .cache/pitch-next, swaps it in as
// .cache/pitch only when the build worked, then writes a new version into SERVE_RELOAD_FILE, which tools/serve.py's
// /__reload waits on. A failed build keeps the last good page and prints why (serve.sh sends this output to the server's log).
// Started by tools/serve.sh when SERVE_WATCH is set. Nothing here goes into a build.
import { spawn } from "node:child_process";
import { existsSync, renameSync, rmSync, watch, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { debounced, errorTail, relevant } from "./watch-lib.mjs";

const root = process.env.SERVE_ROOT
  ? resolve(process.env.SERVE_ROOT)
  : resolve(import.meta.dirname, "../..");
const versionFile = process.env.SERVE_RELOAD_FILE;
if (!versionFile) throw new Error("watch.mjs needs SERVE_RELOAD_FILE (tools/serve.sh sets it)");
const live = join(root, ".cache/pitch");
const next = join(root, ".cache/pitch-next");
const old = join(root, ".cache/pitch-old");
const say = (s) => console.log(`[${new Date().toLocaleTimeString("sv-SE")}] ${s}`);

let building = false,
  again = false;
function rebuild() {
  if (building) return void (again = true);
  building = true;
  const t0 = Date.now();
  rmSync(next, { force: true, recursive: true });
  const child = spawn("node", ["tools/pitch/build.mjs"], {
    cwd: root,
    env: { ...process.env, PITCH_OUT: ".cache/pitch-next" },
  });
  let out = "";
  child.stdout.on("data", (d) => (out += d));
  child.stderr.on("data", (d) => (out += d));
  child.on("error", (e) => (out += String(e)));
  child.on("close", (code) => {
    building = false;
    if (code === 0) {
      // a branch from before PITCH_OUT builds in place: its page is already the new one
      if (existsSync(next)) {
        rmSync(old, { force: true, recursive: true });
        if (existsSync(live)) renameSync(live, old);
        renameSync(next, live);
        rmSync(old, { force: true, recursive: true });
      }
      writeFileSync(versionFile, String(Date.now()) + "\n");
      say(`Rebuilt in ${((Date.now() - t0) / 1000).toFixed(1)} s. The open pages reload`);
    } else {
      say("Couldn't rebuild the pitch. The last good page stays. Fix the file and save again:");
      console.log(errorTail(out));
      rmSync(next, { force: true, recursive: true });
    }
    if (again) {
      again = false;
      rebuild();
    }
  });
}

const schedule = debounced(rebuild, 300);
for (const dir of ["pitch", "tools/pitch", "src/design", "src/content/hand"]) {
  const base = join(root, dir);
  if (existsSync(base))
    watch(base, { recursive: true }, (_, file) => {
      if (relevant(file)) schedule();
    });
}
say("Watching pitch/, tools/pitch/, src/design/ and src/content/hand/ for changes");

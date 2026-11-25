// The pitch's live reload (tools/pitch/watch.mjs, tools/pitch/reload.js, tools/serve.py): the pure parts, the local
// server's behaviour, and that none of it can leak into anything that ships.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { debounced, errorTail, relevant } from "../pitch/watch-lib.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

test("only real source changes rebuild", () => {
  assert.equal(relevant("paint.src.html"), true);
  assert.equal(relevant("assets/wall/a.jpg"), true);
  assert.equal(relevant("paint/60-pick.js"), true); // the pitch's parts rebuild it too
  assert.equal(relevant("paint/style.css"), true);
  assert.equal(relevant(null), true);
  assert.equal(relevant(".paint.src.html.swp"), false);
  assert.equal(relevant("paint.src.html~"), false);
  assert.equal(relevant("4913"), false);
  assert.equal(relevant("checks/walk.js"), false);
});

test("a burst of saves is one rebuild, 300 ms after the last", () => {
  const fired = [];
  const timers = [];
  const fake = {
    set: (fn, ms) => (timers.push({ fn, ms }), timers.length),
    clear: (id) => (timers[id - 1].fn = null),
  };
  const go = debounced(() => fired.push(1), 300, fake);
  go();
  go();
  go();
  timers.forEach((t) => t.fn?.());
  assert.equal(fired.length, 1);
  assert.equal(timers.at(-1).ms, 300);
});

test("a failed build shows its last lines, long ones cut", () => {
  const tail = errorTail(
    Array.from({ length: 30 }, (_, i) => `line ${i}`).join("\n") + "\n" + "x".repeat(1000),
    3,
  );
  assert.equal(tail.split("\n").length, 3);
  assert.ok(tail.endsWith("…"));
});

const freePort = () =>
  new Promise((res) => {
    const s = createServer().listen(0, "127.0.0.1", () => {
      const { port } = s.address();
      s.close(() => res(port));
    });
  });

async function serve(env) {
  const dir = mkdtempSync(join(tmpdir(), "reload-"));
  writeFileSync(join(dir, "index.html"), "<html><body><p>hi</p></body></html>");
  writeFileSync(join(dir, "version"), "1\n");
  const port = await freePort();
  const child = spawn("python3", ["-I", join(root, "tools/serve.py"), "127.0.0.1", String(port)], {
    env: { ...process.env, SERVE_DIR: dir, ...env(dir) },
    stdio: "ignore",
  });
  for (let i = 0; i < 50; i++) {
    try {
      await fetch(`http://127.0.0.1:${port}/`);
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  return {
    dir,
    url: (p) => `http://127.0.0.1:${port}${p}`,
    stop: () => (child.kill(), rmSync(dir, { recursive: true, force: true })),
  };
}

test("the local server adds the reload script and answers when the version changes", async () => {
  const s = await serve((dir) => ({ SERVE_RELOAD_FILE: join(dir, "version") }));
  try {
    const page = await (await fetch(s.url("/"))).text();
    assert.match(page, /<script src="\/__reload\.js\?v=1"><\/script><\/body>/);
    assert.match(await (await fetch(s.url("/__reload.js"))).text(), /__reload\?v=/);
    // a page that is behind gets the new version at once; one that is current waits for it
    assert.equal((await (await fetch(s.url("/__reload?v=0"))).text()).trim(), "1");
    const waiting = fetch(s.url("/__reload?v=1")).then((r) => r.text());
    await new Promise((r) => setTimeout(r, 400));
    writeFileSync(join(s.dir, "version"), "2\n");
    assert.equal((await waiting).trim(), "2");
  } finally {
    s.stop();
  }
});

test("without the reload file the server adds nothing and has no /__reload", async () => {
  const s = await serve(() => ({}));
  try {
    assert.equal(await (await fetch(s.url("/"))).text(), "<html><body><p>hi</p></body></html>");
    assert.equal((await fetch(s.url("/__reload.js"))).status, 404);
    assert.equal((await fetch(s.url("/__reload"))).status, 404);
  } finally {
    s.stop();
  }
});

// Nothing that ships may know the reload: not the sources a build reads, not what a build wrote.
function* files(dir) {
  if (!existsSync(dir)) return;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name === ".next") continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* files(p);
    else if (
      e.isFile() &&
      [".html", ".js", ".mjs", ".ts", ".tsx", ".css", ".json"].includes(extname(p))
    )
      yield p;
  }
}
test("the reload's script and endpoint are in no source or build output that ships", () => {
  const places = [
    "pitch",
    "src",
    "app",
    "api",
    "public",
    "out",
    ".cache/pitch",
    ".cache/pitch-next",
  ];
  const found = [];
  for (const place of places)
    for (const f of files(join(root, place)))
      if (/__reload/.test(readFileSync(f, "utf8"))) found.push(f);
  assert.equal(/__reload/.test(readFileSync(join(root, "tools/pitch/build.mjs"), "utf8")), false);
  assert.deepEqual(found, []);
});

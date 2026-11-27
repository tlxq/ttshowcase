// tools/pitch/wrap.mjs: the checks need no network (S-flake, 11-27). Fails if a three.js file the page asks jsDelivr for has no
// local copy, if the wrapper stops answering them, lets another outside request through, or stops failing the check for it.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import { CDN, VENDOR, wrap } from "./wrap.mjs";

const root = join(import.meta.dirname, "..", "..");

test("every three.js file the pitch page loads has its copy in tools/pitch/vendor", () => {
  const html = readFileSync(join(root, "pitch/paint.src.html"), "utf8");
  const urls = [...html.matchAll(/<script src="(https:\/\/[^"]+)"/g)].map((m) => m[1]);
  assert.ok(urls.length >= 8, "the page's CDN scripts were not found");
  for (const u of urls) {
    assert.ok(
      u.startsWith(CDN),
      `${u} is not from the pinned three.js folder the checks answer for`,
    );
    assert.ok(existsSync(join(VENDOR, u.split("/").pop())), `no local copy of ${u}`);
  }
});

// a fake page: collects the context route, then lets the test send requests through it
function fake(script) {
  let match, handler;
  const page = { context: () => ({ route: async (m, h) => ((match = m), (handler = h)) }) };
  const request = async (url) => {
    const u = new URL(url);
    if (!match(u)) return { passed: true };
    const r = { url: () => url };
    return new Promise((resolve) =>
      handler({
        request: () => r,
        fulfill: (o) => resolve({ fulfilled: o }),
        abort: (why) => resolve({ aborted: why }),
      }),
    );
  };
  const run = async () => eval(wrap(script))(page);
  return { run, request };
}

test("the wrapper answers three.js from disk, stops any other outside request and fails the run for it", async () => {
  const f = fake("async page => { await globalThis.__go(); return JSON.stringify({ errs: [] }); }");
  let seen = {};
  globalThis.__go = async () => {
    seen.three = await f.request(CDN + "build/three.min.js");
    seen.bloom = await f.request(CDN + "examples/js/postprocessing/UnrealBloomPass.js?x=1");
    seen.local = await f.request("http://127.0.0.1:8000/paint.html");
    seen.data = await f.request("data:text/plain,hi");
    seen.other = await f.request("https://fonts.googleapis.com/css");
    seen.pin = await f.request("https://cdn.jsdelivr.net/npm/three@0.150.0/build/three.min.js");
  };
  const res = JSON.parse(await f.run());
  assert.equal(seen.three.fulfilled.path, join(VENDOR, "three.min.js"));
  assert.ok(existsSync(seen.three.fulfilled.path));
  assert.equal(seen.bloom.fulfilled.path, join(VENDOR, "UnrealBloomPass.js"));
  assert.ok(seen.local.passed && seen.data.passed, "this PC's own pages are left alone");
  assert.equal(seen.other.aborted, "blockedbyclient");
  assert.equal(seen.pin.aborted, "blockedbyclient", "another version is not the pinned one");
  assert.deepEqual(res.errs, [
    "a check made an outside request: https://fonts.googleapis.com/css https://cdn.jsdelivr.net/npm/three@0.150.0/build/three.min.js",
  ]);
});

test("a check that made no outside request keeps its own result", async () => {
  const f = fake("async page => JSON.stringify({ errs: ['its own'], n: 1 })");
  assert.equal(await f.run(), JSON.stringify({ errs: ["its own"], n: 1 }));
});

test("a script that ends in a // comment still wraps", async () => {
  const f = fake("async page => JSON.stringify({ errs: [] }) // the end");
  assert.equal(await f.run(), '{"errs":[]}');
});

test("the runners use the wrapper and the one set of stand-in numbers", () => {
  for (const f of ["tools/pitch/run.sh", "tools/pitch/sheet.sh"]) {
    const sh = readFileSync(join(root, f), "utf8");
    assert.match(sh, /node tools\/pitch\/wrap\.mjs/, `${f} no longer wraps its script`);
    assert.match(sh, /standin-numbers\.json/, `${f} has its own numbers`);
  }
  assert.doesNotMatch(
    readFileSync(join(root, "tools/pitch/sheet.sh"), "utf8"),
    /--body='\{\}'/,
    "the sheet routes an empty answer again",
  );
  const epa = readFileSync(join(root, "tools/pitch/checks/epanums.js"), "utf8");
  assert.match(epa, /const full = __STANDIN__/);
  const nums = JSON.parse(readFileSync(join(root, "tools/pitch/standin-numbers.json"), "utf8"));
  assert.deepEqual(Object.keys(nums.epa), ["commits", "merged", "tests", "migrations"]);
  assert.deepEqual(Object.keys(nums.rvf), ["commits", "merged"]);
});

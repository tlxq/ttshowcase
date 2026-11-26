// S-2: the front's poster draws at 30 per second on a slow device and at every frame on a fast one, and "slow" comes from
// measured frame gaps (pitch/pace.js), never from the user agent. The page gets the same file from tools/pitch/build.mjs.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { makePace } from "../../pitch/pace.js";

const root = join(fileURLToPath(import.meta.url), "../../..");

// plays frames `gap` ms apart from `from` for `ms`, drawing whenever the pace says so; returns the draws
function play(pace, from, ms, gap) {
  let drawn = -1e9,
    draws = 0;
  for (let t = from; t < from + ms; t += gap) {
    pace.tick(t);
    if (pace.due(t, drawn)) {
      drawn = t;
      draws++;
    }
  }
  return draws;
}

test("a fast device keeps every frame", () => {
  for (const gap of [1000 / 144, 1000 / 120, 1000 / 60]) {
    const pace = makePace();
    const draws = play(pace, 0, 10000, gap);
    assert.equal(pace.slow, false, `${gap.toFixed(1)} ms frames are not slow`);
    assert.ok(Math.abs(draws - 10000 / gap) <= 1, `every frame is drawn (${draws})`);
  }
});

test("a device that gives about 30 frames a second is slow, and then draws 30 a second", () => {
  const pace = makePace();
  play(pace, 0, 10000, 33.3);
  assert.equal(pace.slow, true);
  const near = (n, want, why) =>
    assert.ok(Math.abs(n - want) <= 1, `${why}: ${n} draws, wanted ${want}`);
  near(play(pace, 10000, 10000, 1000 / 60), 300, "on a 60 Hz screen: every other frame");
  near(play(pace, 20000, 10000, 1000 / 120), 300, "on a 120 Hz screen: every fourth");
  near(play(pace, 30000, 10000, 33.3), 300, "already at 30: every frame it gets");
});

test("how long it takes to know: about a second of frames, never inside the load", () => {
  const pace = makePace();
  play(pace, 0, 2500, 80); // the page loading: slow frames that say nothing
  assert.equal(pace.slow, false, "the first 2.5 s are not counted");
  play(pace, 2500, 1000, 40);
  assert.equal(pace.slow, false, "under 60 frames measured");
  play(pace, 3500, 2000, 40);
  assert.equal(pace.slow, true);
});

test("a few hiccups on a fast device do not make it slow", () => {
  const pace = makePace();
  for (let t = 3000, n = 0; t < 30000; n++) {
    pace.tick(t);
    t += n % 20 === 19 ? 120 : 16.7; // one 120 ms stall every 20 frames: the average stays near 22 ms
  }
  assert.equal(pace.slow, false);
});

test("a gap over a pause (a hidden tab, off screen) is not a frame gap", () => {
  const pace = makePace();
  play(pace, 3000, 500, 16.7);
  pace.rest();
  pace.tick(60000); // back after a minute
  play(pace, 60017, 3000, 16.7);
  assert.equal(pace.slow, false);
  // and a pause the loop never saw (a stall over 250 ms) restarts the count instead of counting as one slow frame
  play(pace, 70000, 500, 36);
  pace.tick(80000);
  assert.equal(pace.slow, false);
});

test("slow never goes back to fast inside a visit (halved frames would read as fast)", () => {
  const pace = makePace();
  play(pace, 0, 10000, 40);
  assert.equal(pace.slow, true);
  play(pace, 10000, 10000, 16.7);
  assert.equal(pace.slow, true);
});

test("the front page takes the pace from the one file and decides nothing from the browser's name", () => {
  const page = readFileSync(join(root, "pitch/front.src.html"), "utf8");
  assert.match(page, /const makePace = __PACE__;/);
  assert.match(page, /pace\.due\(/, "the poster's loop no longer asks the pace");
  assert.match(
    page,
    /IntersectionObserver\(\(\[e\]\) => \{ shown = e\.isIntersecting; if \(shown\) wake\(\); \}\)/,
  );
  assert.match(page, /visibilitychange/, "a hidden tab no longer stops the poster");
  assert.doesNotMatch(
    page,
    /userAgent|navigator\.hardwareConcurrency|deviceMemory/,
    "slow is measured, not guessed",
  );
  const build = readFileSync(join(root, "tools/pitch/build.mjs"), "utf8");
  assert.match(build, /replaceAll\("__PACE__"/, "front.html is not filled with the pace");
});

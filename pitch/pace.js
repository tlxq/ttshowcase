// How fast this device really draws the front's poster (S-2, Tom 11-26). The poster is a canvas of lettered cells, drawn
// every frame; a slow phone can't keep up. This decides from measured frame gaps, never from the user agent: while the
// poster draws every frame, the gaps between animation frames are averaged over the last `frames` frames, and once that
// average is over `slowGap` ms (under about 40 per second) the device is slow for the rest of the visit, and the poster
// is drawn at most every 30 ms (30 per second). A fast device never leaves 60. The first `warm` ms are not counted:
// the page is still loading then, and its jank says nothing about the device. One plain function, no imports:
// tools/pitch/build.mjs puts it into pitch/front.src.html (__PACE__), and tools/pitch/pace.test.mjs runs the same file.
export function makePace(frames = 60, slowGap = 25, warm = 2500) {
  const gaps = [];
  let last = 0,
    slow = false;
  return {
    get slow() {
      return slow;
    },
    // once per animation frame, while the poster is drawing every frame (t: the frame's time in ms)
    tick(t) {
      const gap = last ? t - last : 0;
      last = t;
      if (slow || !gap) return;
      if (t < warm || gap > 250) return void (gaps.length = 0); // loading, or a pause (a hidden tab) that is no frame gap
      gaps.push(gap);
      if (gaps.length > frames) gaps.shift();
      if (gaps.length === frames && gaps.reduce((a, b) => a + b, 0) / frames > slowGap) slow = true;
    },
    // the loop stopped (off screen, hidden tab): the gap to its next frame is not a frame gap
    rest() {
      last = 0;
      gaps.length = 0;
    },
    // may the poster be drawn at t, when it was last drawn at `drawn`?
    due(t, drawn) {
      return !slow || t - drawn >= 30;
    },
  };
}

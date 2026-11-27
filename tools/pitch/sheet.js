// A page function for playwright-cli run-code, like tools/pitch/checks/: no semicolon after it, so prettier leaves it alone (.prettierignore).
// The whole-walk sheet's pictures (tools/pitch/sheet.sh): one load, tap the bucket, then jump straight to each moment and take
// a picture: __OUT__<moment>.png. The moments are the walk's stops (tour.js) plus the scroll-up side. Returns the console errors.
async (page) => {
  const W = page.viewportSize().width,
    H = page.viewportSize().height,
    errs = [];
  page.on("console", (m) => {
    if (m.type() === "error") errs.push(m.text());
  });
  page.on("pageerror", (e) => errs.push(String(e)));
  // the same chance on both builds: the paint's runs and drips come from Math.random, so a seeded one makes
  // master and the branch draw the same ones, and only a real change shows as a difference
  await page.addInitScript(() => {
    let s = 7;
    window.__reseed = () => { s = 7; }; // the tap starts the same chance on both builds: how many frames each drew before it (a build that loads less drops fewer) must not shift the paint's runs
    Math.random = () => {
      s = (s + 0x6d2b79f5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  });
  // The camera's handheld drift is sin(seconds * .31) * .06 and sin(seconds * .43) * .04 metres, so a picture's frame depends on how
  // long the page has run (the pole's close-up moved 0.054 between two runs of the same code, over the 0.04 limit). Before each picture
  // the page's clock jumps forward to a time where both waves sit where they sat at 400 s (the search finds one within a few
  // hundredths of a radian), so every run, on both builds, takes its pictures at the same drift. The clock jump is the same for
  // performance.now() and the animation frames' time, so the pose rule (2.5 s since the pointer moved) still holds; the page ignores a
  // frame that long for its own speed measure (autoRes skips over 100 ms), and every fade is long over by the time of a picture.
  await page.addInitScript(() => {
    let shift = 0;
    const real = performance.now.bind(performance), raf = window.requestAnimationFrame.bind(window);
    performance.now = () => real() + shift;
    window.requestAnimationFrame = (cb) => raf((t) => cb(t + shift));
    const want = (ahead) => {
      const wave = (k, t) => Math.atan2(Math.sin(k * t), Math.cos(k * t));
      const t0 = (real() + shift + ahead) / 1000, T = 400;
      let best = 0, err = 1e9;
      for (let a = 0; a < 600; a += 0.005) {
        const d = Math.abs(wave(0.31, t0 + a - T)) + Math.abs(wave(0.43, t0 + a - T));
        if (d < err) { err = d; best = a; }
      }
      return best;
    };
    window.__phase = (ahead) => { shift += want(ahead) * 1000; };
  });
  await page.goto("__URL__");
  await page.waitForTimeout(3500);
  await page.evaluate(() => window.__reseed());
  await page.evaluate(() => window.bucketAt()).then(b => page.mouse.click(b.x, b.y)) /* the bucket, not the middle: only it tips (11-25) */;
  for (
    let i = 0;
    i < 40 && !(await page.evaluate(() => document.documentElement.style.overflow === ""));
    i++
  )
    await page.waitForTimeout(250);
  await page.waitForTimeout(5000); // the pour runs out before the first picture
  const shot = async (name, still) => { // still: the stencil's pose is set 650 ms ahead (the pointer rule), the drift is set for the same moment
    await page.evaluate((ms) => window.__phase(ms), still ? 650 : 150);
    if (still) await pose(); else await page.waitForTimeout(150);
    await page.screenshot({ path: "__OUT__" + name + ".png" });
  };
  // The stencil head (the page's top and the walk's end) turns by itself at 8 frames a second, so its pose at a picture
  // depended on the clock (0.066 between two runs of the same code, over the 0.04 limit). Its own rule: for 2.5 s after a
  // pointer move it shows the frame the pointer's side picks. So the pointer rests in the middle (frame 11) before the wait,
  // and moves there again 300 ms before the picture: the same pose every time, on both builds (audit S-pose).
  const pose = async () => { await page.mouse.move(W / 2, H / 2); await page.waitForTimeout(300); await page.mouse.move(W / 2 + 1, H / 2); await page.mouse.move(W / 2, H / 2); await page.waitForTimeout(300); };
  await shot("01-start");
  await page.evaluate(() => scrollTo(0, (window.visitY ? visitY() : 0) + (svY(0) - (window.visitY ? visitY() : 0)) * 0.55)); // master's page before #80 has no visitY: its top is the visitors' wall
  await page.waitForTimeout(2200);
  await shot("02-pole");
  await page.evaluate(() => scrollTo(0, window.visitY ? visitY() : 0));
  await page.waitForTimeout(2500);
  await shot("03-visitors");
  const stops = [
    [128, "04-epaRadar"],
    [432, "05-raddavarfruberga"],
    [585, "05b-the-garage-door"], // master: still the street, the manhole not yet in view
    [670, "06-the-way-in"], // master: down the manhole; here: just inside the garage door
    [700, "07-ttoolbox"],
    [770, "08-dot"],
    [840, "09-tthermal"],
    [925, "10-the-back-door"],
    [1045, "11-EDGE"],
    [1230, "12-end"], // the walk's last view, the same as the page's top (13)
  ];
  for (const [sv, name] of stops) {
    await page.evaluate((sv) => scrollTo(0, svY(sv)), sv);
    if (name === "12-end") await page.mouse.move(W / 2, H / 2);
    await page.waitForTimeout(sv >= 700 ? 3200 : 1800);
    await shot(name, name === "12-end");
  }
  await page.evaluate(() => scrollTo(0, 10)); // the page's top: the far side of the seam
  await page.mouse.move(W / 2, H / 2);
  await page.waitForTimeout(2500);
  await shot("13-top", true);
  return JSON.stringify({ errs });
}

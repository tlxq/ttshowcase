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
    Math.random = () => {
      s = (s + 0x6d2b79f5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  });
  await page.goto("__URL__");
  await page.waitForTimeout(3500);
  await page.mouse.click(W / 2, H / 2);
  for (
    let i = 0;
    i < 40 && !(await page.evaluate(() => document.documentElement.style.overflow === ""));
    i++
  )
    await page.waitForTimeout(250);
  await page.waitForTimeout(5000); // the pour runs out before the first picture
  const shot = (name) => page.screenshot({ path: "__OUT__" + name + ".png" });
  await shot("01-start");
  await page.evaluate(() => scrollTo(0, svY(0) * 0.55));
  await page.waitForTimeout(2200);
  await shot("02-pole");
  await page.evaluate(() => scrollTo(0, 0));
  await page.waitForTimeout(2500);
  await shot("03-visitors");
  const stops = [
    [128, "04-epaRadar"],
    [432, "05-raddavarfruberga"],
    [590, "06-manhole"],
    [700, "07-Self-hosted"],
    [770, "08-ttoolbox"],
    [840, "09-dot"],
    [910, "10-tthermal"],
    [1045, "11-EDGE"],
    [1180, "12-end"],
  ];
  for (const [sv, name] of stops) {
    await page.evaluate((sv) => scrollTo(0, svY(sv)), sv);
    await page.waitForTimeout(sv >= 700 ? 3200 : 1800);
    await shot(name);
  }
  return JSON.stringify({ errs });
}

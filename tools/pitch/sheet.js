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
    [432, "05-epaRadar-count"],
    [615, "06-raddavarfruberga"],
    [770, "07-workshop"],
    [910, "08-workshop-2"],
    [1045, "09-EDGE"],
    [1180, "10-end"],
  ];
  for (const [sv, name] of stops) {
    await page.evaluate((sv) => scrollTo(0, svY(sv)), sv);
    await page.waitForTimeout(sv >= 700 ? 3200 : 1800);
    await shot(name);
  }
  return JSON.stringify({ errs });
};

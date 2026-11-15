async (page) => {
  const errs = [],
    names = [];
  // One picture per part of the page at rest (reduced motion, so nothing is mid-move), and the 404.
  page.on("pageerror", (e) => errs.push("page error: " + e.message));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("__URL__/");
  await page.waitForTimeout(2500);
  await page.evaluate(() => document.fonts.ready);
  const shot = async (name, target) => {
    await target.scrollIntoViewIfNeeded().catch(() => {});
    await page.waitForTimeout(700);
    await target.screenshot({
      path: "__OUT__/" + name + ".png",
      animations: "disabled",
      scale: "css",
    });
    names.push(name);
  };
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
  await page.screenshot({ path: "__OUT__/1-hero.png", animations: "disabled", scale: "css" });
  names.push("1-hero");
  await shot("2-letters", page.locator("#lk-parts"));
  await shot("3-tom", page.locator("#tom"));
  await shot("4-live", page.locator("#live"));
  await shot("5-experiments", page.locator("#experiments"));
  await shot("6-questions", page.locator("#questions"));
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "__OUT__/7-end.png", animations: "disabled", scale: "css" });
  names.push("7-end");
  await page.goto("__URL__/404.html");
  await page.waitForTimeout(2000);
  await page.screenshot({ path: "__OUT__/8-404.png", animations: "disabled", scale: "css" });
  names.push("8-404");
  return JSON.stringify({ errs, names });
};

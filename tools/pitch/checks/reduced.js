// Reduced motion: no pour to wait for, every wall finished on arrival, links at once, no errors.
async page => { const W = page.viewportSize().width, H = page.viewportSize().height, errs = [], res = { errs };
  page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('__URL__'); await page.waitForTimeout(3500);
  const t0 = await page.evaluate(() => performance.now()); await page.waitForFunction(() => { const b = window.bucketAt && window.bucketAt(); return b && (b.x > 0 ? b : matchMedia("(prefers-reduced-motion: reduce)").matches && getComputedStyle(document.querySelector(".start")).display === "none" && b); /* reduced motion: no start screen, nothing to tip */ }, null, { timeout: 20000 }).then(h => h.jsonValue()).then(b => page.mouse.click(b.x, b.y)) /* the bucket, not the middle: only it tips (11-25) */;
  for (let i = 0; i < 40 && !(await page.evaluate(() => document.documentElement.style.overflow === '')); i++) await page.waitForTimeout(100);
  res.scrollFree = +(((await page.evaluate(() => performance.now())) - t0) / 1000).toFixed(1);
  if (res.scrollFree > 1.5) errs.push('scroll held ' + res.scrollFree + ' s after the tap');
  const H2 = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight), END = await page.evaluate(() => +document.documentElement.dataset.svEnd);
  for (const [name, sv, ids] of [['epaRadar', 128, [0, 1]], ['raddavarfruberga', 432, [3]]]) {
    await page.evaluate(y => scrollTo(0, y), await page.evaluate(sv => Math.round(svY(sv)), sv)); await page.waitForTimeout(1200);
    if (!(await page.evaluate(ids => ids.every(i => document.getElementById('hot' + i).style.display === 'block'), ids))) errs.push(name + ': links not shown 1.2 s after arriving');
    await page.screenshot({ path: '__SHOTS__pitch-reduced-' + W + '-' + sv + '.png' }); }
  return JSON.stringify(res); }

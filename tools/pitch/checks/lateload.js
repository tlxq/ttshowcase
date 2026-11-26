// What loads after the tip (Track B): the workshop's and EDGE's paintings and the stencil frames are not asked for until the bucket has tipped, and no place shows before its
// pictures are in. On a slow line a visitor who tips and scrolls at once reaches each painting before its picture; the painting waits and comes up when it arrives
// (dataset.pops counts frames that drew a painting without its picture: 0). Everything late arrives (dataset.lateDone), the stencil among it.
async page => { const errs = [], res = { errs }; page.on('pageerror', e => errs.push(String(e)));
  const LATE = '(self|ttoolbox|dot|tthermal|edge)_wall\\.webp|edge_banner\\.webp|stencil/s\\d+\\.webp';
  await page.goto('__URL__');
  for (let i = 0; i < 400 && !(await page.evaluate(() => document.documentElement.dataset.readyAt)); i++) await page.waitForTimeout(50);
  res.early = await page.evaluate(re => performance.getEntriesByType('resource').filter(r => new RegExp(re).test(r.name)).length, LATE);
  if (res.early) errs.push(res.early + ' late pictures were asked for before the bucket was ready');
  const cdp = await page.context().newCDPSession(page); await cdp.send('Network.enable'); await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 120000, uploadThroughput: 100000 });
  const b = await page.evaluate(() => window.bucketAt()); await page.mouse.click(b.x, b.y);
  for (let i = 0; i < 40 && !(await page.evaluate(() => document.documentElement.style.overflow === '')); i++) await page.waitForTimeout(250);
  const go = sv => page.evaluate(sv => scrollTo(0, svY(sv)), sv);
  for (const sv of [1050, 900, 700]) { await go(sv); await page.waitForTimeout(1500); } // straight down to EDGE and back up the walk, before the late pictures can be in
  res.before = await page.evaluate(() => ({ late: document.documentElement.dataset.lateDone || null, pops: +document.documentElement.dataset.pops || 0 }));
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  for (let i = 0; i < 160 && !(await page.evaluate(() => document.documentElement.dataset.lateDone)); i++) await page.waitForTimeout(250);
  for (const sv of [700, 800, 900, 960, 1050]) { await go(sv); await page.waitForTimeout(1500); }
  res.after = await page.evaluate(re => ({ late: document.documentElement.dataset.lateDone || null, pops: +document.documentElement.dataset.pops || 0, started: +document.documentElement.dataset.started || 0, asked: performance.getEntriesByType('resource').filter(r => new RegExp(re).test(r.name)).length }), LATE);
  if (!res.after.late) errs.push('the late pictures never all arrived');
  if (res.after.pops) errs.push('a painting was drawn before its picture, ' + res.after.pops + ' frames');
  if (res.after.started < 4) errs.push('only ' + res.after.started + ' of the 4 late paintings came up');
  if (res.after.asked < 26) errs.push('only ' + res.after.asked + ' of the 26 late pictures were asked for');
  return JSON.stringify(res); }

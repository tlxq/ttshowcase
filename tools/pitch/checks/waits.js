// Every wait a visitor who just watches has, in seconds: scroll free after the tap; at epaRadar and raddavarfruberga,
// arrival until the label and each link show. Fails when one never shows within 20 s.
async page => { const W = page.viewportSize().width, H = page.viewportSize().height, errs = [], res = { errs };
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto('__URL__'); await page.waitForTimeout(3500);
  await page.evaluate(() => { const T = window.__T = {}, c = window.__c = performance.now(), op = id => { const e = document.getElementById(id); return e && getComputedStyle(e).opacity > .5; },
    sh = id => { const e = document.getElementById(id); return e && e.style.display === 'block'; };
    (function f() { const n = performance.now() - c;
      if (!T.free && document.documentElement.style.overflow === '') T.free = n;
      [['hot0', sh], ['hot1', sh], ['hot3', sh], ['tagFacts', op], ['tagRvf', op]].forEach(([id, fn]) => { if (!T[id] && fn(id)) T[id] = n; });
      requestAnimationFrame(f); })(); });
  await page.waitForFunction(() => { const b = window.bucketAt && window.bucketAt(); return b && b.x > 0 && b; }, null, { timeout: 20000 }).then(h => h.jsonValue()).then(b => page.mouse.click(b.x, b.y)) /* the bucket, not the middle: only it tips (11-25) */;
  for (let i = 0; i < 40 && !(await page.evaluate(() => window.__T.free)); i++) await page.waitForTimeout(250);
  const H2 = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight), END = await page.evaluate(() => +document.documentElement.dataset.svEnd);
  const a2 = await page.evaluate(y => { scrollTo(0, y); return performance.now(); }, await page.evaluate(sv => Math.round(svY(sv)), 128));
  for (let i = 0; i < 80 && !(await page.evaluate(() => window.__T.hot1 && window.__T.tagFacts)); i++) await page.waitForTimeout(250);
  const a3 = await page.evaluate(y => { scrollTo(0, y); return performance.now(); }, await page.evaluate(sv => Math.round(svY(sv)), 432));
  for (let i = 0; i < 80 && !(await page.evaluate(() => window.__T.hot3 && window.__T.tagRvf)); i++) await page.waitForTimeout(250);
  const r = await page.evaluate(([a2, a3]) => { const T = window.__T, c = window.__c, s = (v, from) => v ? +((v - from) / 1000).toFixed(1) : null;
    return { scrollFree: s(T.free, 0), epaLabel: s(T.tagFacts, a2 - c), epaLink1: s(T.hot0, a2 - c), epaLink2: s(T.hot1, a2 - c), rvfLink: s(T.hot3, a3 - c), rvfLabel: s(T.tagRvf, a3 - c) }; }, [a2, a3]);
  Object.assign(res, r);
  for (const [k, v] of Object.entries(r)) if (v === null) errs.push(k + ' never showed');
  return JSON.stringify(res); }

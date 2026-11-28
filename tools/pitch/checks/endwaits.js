// The lower stops: seconds from arriving until the label and links show; then back and forth, where everything
// must show at once (each wall paints once per visit). Fails when one never shows within 6 s or the first takes over 4.5 s.
async page => { const W = page.viewportSize().width, H = page.viewportSize().height, errs = [], res = { errs };
  page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto('__URL__'); await page.waitForTimeout(3500); await page.waitForFunction(() => { const b = window.bucketAt && window.bucketAt(); return b && (b.x > 0 ? b : matchMedia("(prefers-reduced-motion: reduce)").matches && getComputedStyle(document.querySelector(".start")).display === "none" && b); /* reduced motion: no start screen, nothing to tip */ }, null, { timeout: 20000 }).then(h => h.jsonValue()).then(b => page.mouse.click(b.x, b.y)) /* the bucket, not the middle: only it tips (11-25) */;
  for (let i = 0; i < 40 && !(await page.evaluate(() => document.documentElement.style.overflow === '')); i++) await page.waitForTimeout(250);
  const go = sv => page.evaluate(sv => { scrollTo(0, svY(sv)); return performance.now(); }, sv);
  const state = n => page.evaluate(n => ({ plates: [...document.querySelectorAll('.tag.facts')].filter(e => getComputedStyle(e).opacity > .5 && e.textContent.startsWith(n)).length, hots: [...document.querySelectorAll('a.hot')].filter(a => a.style.display === 'block' && ({ ttoolbox: /^Code for ttoolbox$/, dot: /^Code for dot$/, tthermal: /^Code for tthermal$/, edgeflow: /^(edgeflow\.se|app-utveckling\.se|mjukvaruutvecklare\.com)$/, 'Self-hosted platform': /^$/ })[n].test(a.getAttribute('aria-label'))).length }), n);
  res.fromArrival = {};
  for (const [name, sv, want] of [['ttoolbox', 700, { plates: 1, hots: 1 }], ['dot', 770, { plates: 1, hots: 1 }], ['tthermal', 840, { plates: 1, hots: 1 }], ['edgeflow', 1045, { plates: 1, hots: 3 }]]) { // no morning stop any more (Tom 11-23: no landing)
    const t0 = await go(sv); let t = -1;
    for (let i = 0; i < 60; i++) { const s = await state(name); if (s.plates >= want.plates && s.hots >= want.hots) { t = await page.evaluate(() => performance.now()); break; } await page.waitForTimeout(100); }
    res.fromArrival[name] = t < 0 ? null : +((t - t0) / 1000).toFixed(1); if (t < 0) errs.push(name + ': label or links never showed'); else if (res.fromArrival[name] > 4.5) errs.push(name + ': label took ' + res.fromArrival[name] + ' s'); /* 4.5 s: measured 3.3 s with the pictures ahead of the stencil's 22 frames, 5.5 to 6.1 s behind them (11-28); a limit between the two */
    await page.waitForTimeout(600); }
  await go(770); await page.waitForTimeout(400); await go(700); await page.waitForTimeout(700);
  const again = await state('ttoolbox'); if (again.plates < 1 || again.hots < 1) errs.push('back at ttoolbox the label and links did not show at once: ' + JSON.stringify(again));
  return JSON.stringify(res); }

// The lower stops: seconds from arriving until the label and links show; then back and forth, where everything
// must show at once (each wall paints once per visit). Fails when one never shows within 6 s.
async page => { const W = page.viewportSize().width, H = page.viewportSize().height, errs = [], res = { errs };
  page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto('__URL__'); await page.waitForTimeout(3500); await page.mouse.click(W / 2, H / 2);
  for (let i = 0; i < 40 && !(await page.evaluate(() => document.documentElement.style.overflow === '')); i++) await page.waitForTimeout(250);
  const go = sv => page.evaluate(sv => { scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * sv / 930); return performance.now(); }, sv);
  const state = n => page.evaluate(n => ({ plates: [...document.querySelectorAll('.tag.facts')].filter(e => getComputedStyle(e).opacity > .5 && e.textContent.startsWith(n)).length, hots: [...document.querySelectorAll('a.hot')].filter(a => a.style.display === 'block' && ({ exit: /^(Write to me|GitHub|LinkedIn)$/, ttoolbox: /^Code for (ttoolbox|dot)$/, 'app-utveckling': /^(app-utveckling\.se|mjukvaruutvecklare\.com)$/, 'Self-hosted platform': /^$/ })[n].test(a.getAttribute('aria-label'))).length }), n);
  res.fromArrival = {};
  for (const [name, sv, want] of [['Self-hosted platform', 640, { plates: 1, hots: 0 }], ['ttoolbox', 715, { plates: 1, hots: 2 }], ['app-utveckling', 790, { plates: 1, hots: 2 }], ['exit', 880, { plates: 0, hots: 3 }]]) {
    const t0 = await go(sv); let t = -1;
    for (let i = 0; i < 60; i++) { const s = await state(name); if (s.plates >= want.plates && s.hots >= want.hots) { t = await page.evaluate(() => performance.now()); break; } await page.waitForTimeout(100); }
    res.fromArrival[name] = t < 0 ? null : +((t - t0) / 1000).toFixed(1); if (t < 0) errs.push(name + ': label or links never showed');
    await page.waitForTimeout(600); }
  await go(640); await page.waitForTimeout(400); await go(715); await page.waitForTimeout(700);
  const again = await state('ttoolbox'); if (again.plates < 1 || again.hots < 2) errs.push('back at ttoolbox the label and links did not show at once: ' + JSON.stringify(again));
  return JSON.stringify(res); }

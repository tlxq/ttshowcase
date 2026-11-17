// The whole walk: tap the bucket, then each stop down to the end; a picture at each stop (__SHOTS__pitch-<width>-<stop>.png).
// Fails on a console or page error, or when the morning's form (Write to me, GitHub, LinkedIn) doesn't show at the end.
async page => { const W = page.viewportSize().width, H = page.viewportSize().height, errs = [], res = { errs };
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); page.on('pageerror', e => errs.push(String(e)));
  await page.goto('__URL__'); await page.waitForTimeout(3500);
  await page.mouse.click(W / 2, H / 2);
  for (let i = 0; i < 40 && !(await page.evaluate(() => document.documentElement.style.overflow === '')); i++) await page.waitForTimeout(250);
  const go = sv => page.evaluate(sv => scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * sv / +document.documentElement.dataset.svEnd), sv);
  for (const sv of [128, 432, 540, 590, 615, 700, 770, 840, 910, 960, 995, 1045, 1110, 1180]) { await go(sv); await page.waitForTimeout(sv >= 700 ? 3200 : 1500);
    await page.screenshot({ path: '__SHOTS__pitch-' + W + '-' + sv + '.png' }); }
  res.end = await page.evaluate(() => { const f = document.getElementById('mail'); return { form: !!f && f.classList.contains('on') && !f.inert && getComputedStyle(f).opacity > .9, links: [...f.querySelectorAll('nav a')].map(a => a.textContent.replace(/\W+$/, '').trim()) }; });
  if (!res.end.form) errs.push('the end shows no form');
  for (const want of ['GitHub', 'LinkedIn']) if (!res.end.links.includes(want)) errs.push('the end shows no "' + want + '" link');
  return JSON.stringify(res); }

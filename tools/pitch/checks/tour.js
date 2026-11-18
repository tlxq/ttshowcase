// The whole walk: tap the bucket, then each stop down to the end; a picture at each stop (__SHOTS__pitch-<width>-<stop>.png).
// Fails on a console or page error, or when the morning's form (Write to me, GitHub, LinkedIn) doesn't show at the end.
async page => { const W = page.viewportSize().width, H = page.viewportSize().height, errs = [], res = { errs };
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); page.on('pageerror', e => errs.push(String(e)));
  await page.goto('__URL__'); await page.waitForTimeout(3500);
  await page.mouse.click(W / 2, H / 2);
  for (let i = 0; i < 40 && !(await page.evaluate(() => document.documentElement.style.overflow === '')); i++) await page.waitForTimeout(250);
  const go = sv => page.evaluate(sv => scrollTo(0, svY(sv)), sv);
  for (const sv of [128, 432, 540, 590, 615, 700, 770, 840, 910, 960, 995, 1045, 1110, 1180]) { await go(sv); await page.waitForTimeout(sv >= 700 ? 3200 : 1500);
    await page.screenshot({ path: '__SHOTS__pitch-' + W + '-' + sv + '.png' }); }
  res.end = await page.evaluate(() => { const f = document.getElementById('mail'); return { form: !!f && f.classList.contains('on') && !f.inert && getComputedStyle(f).opacity > .9, links: [...f.querySelectorAll('nav a')].map(a => a.textContent.replace(/\W+$/, '').trim()) }; });
  res.form = await page.evaluate(() => { const f = document.getElementById('mail'), nav = [...f.querySelectorAll('nav > *')].map(e => e.getBoundingClientRect()), lab = [...f.querySelectorAll('label:not(.trap)')].map(l => getComputedStyle(l)), soft = getComputedStyle(document.documentElement).getPropertyValue('--look-soft').trim();
    const px = Math.min(...lab.map(l => parseFloat(l.fontSize))), rows = [...new Set(nav.map(r => Math.round(r.top)))], row = k => nav.filter(r => Math.round(r.top) === rows[k]).length, tops = [...new Set(nav.map(r => Math.round(r.left)))].length;
    return { labelPx: px, softLabels: lab.every(l => l.color === 'rgb(207, 202, 191)'), links: nav.length, rows: rows.length, perRow: rows.map((_, k) => row(k)), cols: tops, minH: Math.round(Math.min(...nav.map(r => r.height))), oneLine: [...f.querySelectorAll('nav > *')].every(e => e.getBoundingClientRect().height < 80), inside: nav.every(r => r.right <= f.getBoundingClientRect().right) }; });
  { const min = W < 600 ? 14 : 13; if (res.form.labelPx < min || !res.form.softLabels) errs.push('the form labels are under ' + min + ' px or not soft: ' + JSON.stringify(res.form));
    if (res.form.links !== 4 || res.form.rows !== 2 || res.form.perRow.join() !== '2,2' || res.form.cols !== 2 || res.form.minH < 48 || !res.form.oneLine || !res.form.inside) errs.push('the four links are not two even rows of two, 48 px, one line each: ' + JSON.stringify(res.form)); }
  if (!res.end.form) errs.push('the end shows no form');
  for (const want of ['GitHub', 'LinkedIn']) if (!res.end.links.includes(want)) errs.push('the end shows no "' + want + '" link');
  return JSON.stringify(res); }

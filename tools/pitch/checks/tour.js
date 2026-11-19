// The whole walk: tap the bucket, then each stop down to the end; a picture at each stop (__SHOTS__pitch-<width>-<stop>.png).
// Fails on a console or page error, a three.js warning (THREE.…), or when the morning's form doesn't show at the end, or its four painted marks have no 48 px tap area of their own.
async page => { const W = page.viewportSize().width, H = page.viewportSize().height, errs = [], res = { errs };
  page.on('console', m => { if (m.type() === 'error' || (m.type() === 'warning' && m.text().startsWith('THREE.'))) errs.push(m.text()); }); page.on('pageerror', e => errs.push(String(e)));
  await page.goto('__URL__'); await page.waitForTimeout(3500);
  await page.mouse.click(W / 2, H / 2);
  for (let i = 0; i < 40 && !(await page.evaluate(() => document.documentElement.style.overflow === '')); i++) await page.waitForTimeout(250);
  const go = sv => page.evaluate(sv => scrollTo(0, svY(sv)), sv);
  for (const sv of [128, 432, 540, 590, 615, 700, 770, 840, 910, 960, 995, 1045, 1110, 1180]) { await go(sv); await page.waitForTimeout(sv >= 700 ? 3200 : 1500);
    await page.screenshot({ path: '__SHOTS__pitch-' + W + '-' + sv + '.png' }); }
  res.end = await page.evaluate(() => { const f = document.getElementById('mail'); return { form: !!f && f.classList.contains('on') && !f.inert && getComputedStyle(f).opacity > .9 }; });
  // the end wall (Tom 11-19): the form sits in the painted frame; Leave your tag, GitHub, LinkedIn and Back to the start are painted marks with tap areas over them
  // (a phone sees the form or the marks: the button at the bottom moves between them)
  if (W < 600) { if ((await page.textContent('#endPan')).includes('Links')) await page.click('#endPan'); await page.waitForTimeout(2200); }
  res.marks = await page.evaluate(() => ['leave', 'endGit', 'endLi', 'again'].map(id => { const e = document.getElementById(id), b = e.getBoundingClientRect(); return { id, shown: e.style.display === 'block', l: b.left, t: b.top, r: b.right, b: b.bottom, w: b.width, h: b.height, label: e.getAttribute('aria-label') }; }));
  res.cursor = await page.evaluate(() => getComputedStyle(document.getElementById('endGit')).cursor.slice(0, 30));
  for (const m of res.marks) { if (!m.shown) errs.push('the painted mark "' + m.label + '" has no tap area'); else if (m.w < 47.5 || m.h < 47.5) errs.push('the tap area of "' + m.label + '" is under 48 px: ' + Math.round(m.w) + ' x ' + Math.round(m.h)); }
  for (let a = 0; a < 4; a++) for (let b = a + 1; b < 4; b++) { const A = res.marks[a], B = res.marks[b]; if (A.shown && B.shown && Math.min(A.r, B.r) - Math.max(A.l, B.l) > 1 && Math.min(A.b, B.b) - Math.max(A.t, B.t) > 1) errs.push('the tap areas of "' + A.label + '" and "' + B.label + '" overlap'); }
  if (!/data:image\/svg/.test(res.cursor)) errs.push('the painted marks have no spray-can cursor');
  if (W >= 600) { const r = res.marks[0]; await page.mouse.move((r.l + r.r) / 2, (r.t + r.b) / 2); await page.waitForTimeout(500);
    res.hover = await page.evaluate(() => { const l = document.querySelector('.hl'); return { text: l.textContent, op: +getComputedStyle(l).opacity }; }); if (res.hover.text !== 'Leave your tag' || res.hover.op < .9) errs.push('hovering the can shows no label: ' + JSON.stringify(res.hover)); await page.mouse.move(2, 2); }
  if (!res.end.form) errs.push('the end shows no form');
  return JSON.stringify(res); }

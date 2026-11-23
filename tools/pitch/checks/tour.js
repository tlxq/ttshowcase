// The whole walk: tap the bucket, then each stop down to the end; a picture at each stop (__SHOTS__pitch-<width>-<stop>.png).
// Fails on a console or page error, a three.js warning (THREE.…), or when the morning's form doesn't show at the end, or its five painted marks have no 48 px tap area of their own, or the email tab doesn't tear off when tapped, or a phone turned at the end breaks the form.
async page => { const W = page.viewportSize().width, H = page.viewportSize().height, errs = [], res = { errs };
  page.on('console', m => { if (m.type() === 'error' || (m.type() === 'warning' && m.text().startsWith('THREE.'))) errs.push(m.text()); }); page.on('pageerror', e => errs.push(String(e)));
  await page.goto('__URL__'); await page.waitForTimeout(3500);
  await page.mouse.click(W / 2, H / 2);
  for (let i = 0; i < 40 && !(await page.evaluate(() => document.documentElement.style.overflow === '')); i++) await page.waitForTimeout(250);
  const go = sv => page.evaluate(sv => scrollTo(0, svY(sv)), sv);
  for (const sv of [128, 432, 540, 590, 615, 700, 770, 840, 910, 960, 995, 1045, 1110, 1180]) { await go(sv); await page.waitForTimeout(sv >= 700 ? 3200 : 1500);
    await page.screenshot({ path: '__SHOTS__pitch-' + W + '-' + sv + '.png' }); }
  res.end = await page.evaluate(() => { const f = document.getElementById('mail'); return { form: !!f && f.classList.contains('on') && !f.inert && getComputedStyle(f).opacity > .9 }; });
  // the end wall (Tom 11-19): the form sits in the painted frame; the email, GitHub and LinkedIn tabs are painted marks and Leave your tag is the can with tap areas over them
  // (a phone sees the links side or the form side: the button at the bottom moves between them; the three tabs sit under the form)
  const measure = ids => page.evaluate(ids => ids.map(id => { const e = document.getElementById(id), b = e.getBoundingClientRect(); return { id, shown: e.style.display === 'block', l: b.left, t: b.top, r: b.right, b: b.bottom, w: b.width, h: b.height, label: e.getAttribute('aria-label') }; }), ids);
  const TABS = ['endMail', 'endGit', 'endLi'];
  if (W < 600) { res.first = (await page.textContent('#endPan')).trim(); if (!res.first.includes('Leave your tag')) errs.push('a phone should land on the flyer, its button saying Leave your tag: ' + res.first); await page.screenshot({ path: '__SHOTS__pitch-' + W + '-flyer.png' });
    await page.click('#endPan'); await page.waitForTimeout(2200); res.marks = await measure(['leave']); await page.click('#endPan'); await page.waitForTimeout(2200); res.tabs = await measure(TABS); await page.screenshot({ path: '__SHOTS__pitch-' + W + '-form.png' }); }
  else { res.marks = await measure(['leave']); res.tabs = await measure(TABS); }
  res.cursor = await page.evaluate(() => getComputedStyle(document.getElementById('endGit')).cursor.slice(0, 30));
  for (const m of [...res.marks, ...res.tabs]) { if (!m.shown) errs.push('the painted mark "' + m.label + '" has no tap area'); else if (m.w < 47.5 || m.h < 47.5) errs.push('the tap area of "' + m.label + '" is under 48 px: ' + Math.round(m.w) + ' x ' + Math.round(m.h)); }
  const all = W < 600 ? [res.marks, res.tabs] : [[...res.marks, ...res.tabs]]; for (const ms of all) for (let a = 0; a < ms.length; a++) for (let b = a + 1; b < ms.length; b++) { const A = ms[a], B = ms[b]; if (A.shown && B.shown && Math.min(A.r, B.r) - Math.max(A.l, B.l) > 1 && Math.min(A.b, B.b) - Math.max(A.t, B.t) > 1) errs.push('the tap areas of "' + A.label + '" and "' + B.label + '" overlap'); }
  if (!/data:image\/svg/.test(res.cursor)) errs.push('the painted marks have no spray-can cursor');
  if (W >= 600) { const r = res.marks[0]; await page.mouse.move((r.l + r.r) / 2, (r.t + r.b) / 2); await page.waitForTimeout(500);
    res.hover = await page.evaluate(() => { const l = document.querySelector('.hl'); return { text: l.textContent, op: +getComputedStyle(l).opacity }; }); if (res.hover.text !== 'Leave your tag' || res.hover.op < .9) errs.push('hovering the can shows no label: ' + JSON.stringify(res.hover)); await page.mouse.move(2, 2); }
  // a tap on the email tab tears it off: it lands on the street in front of the wall (the mail app opening is the browser's)
  { const m = res.tabs[0]; await page.mouse.click((m.l + m.r) / 2, (m.t + m.b) / 2); await page.waitForTimeout(1500); await page.screenshot({ path: '__SHOTS__pitch-' + W + '-torn.png' });
    res.torn = await page.evaluate(() => endTorn()); if (!res.torn.length || !res.torn[0].landed || !res.torn[0].shown) errs.push('the email tab did not tear off and land: ' + JSON.stringify(res.torn)); }
  // a phone turned on its side at the end: the end wall follows its new shape (the laptop's: the form printed on the flyer, no button)
  if (W < 600) { await page.setViewportSize({ width: H, height: W }); await page.waitForTimeout(2500); await page.screenshot({ path: '__SHOTS__pitch-' + W + '-turned.png' });
    res.turned = await page.evaluate(() => { const r = s => { const b = document.querySelector(s).getBoundingClientRect(); return [b.left, b.top, b.right, b.bottom]; };
      return { name: r('#mail .f-name span'), email: r('#mail .f-email span'), send: r('#mail button'), pan: getComputedStyle(document.getElementById('endPan')).display, scaled: /scale/.test(document.getElementById('mail').style.transform), vw: innerWidth, vh: innerHeight }; });
    const t = res.turned, overlap = (a, b) => Math.min(a[2], b[2]) > Math.max(a[0], b[0]) && Math.min(a[3], b[3]) > Math.max(a[1], b[1]);
    if (overlap(t.name, t.email) || !t.scaled || t.pan !== 'none' || t.send[2] > t.vw || t.send[3] > t.vh || t.send[0] < 0) errs.push('a phone turned at the end breaks the form: ' + JSON.stringify(t)); }
  if (!res.end.form) errs.push('the end shows no form');
  return JSON.stringify(res); }

// The whole walk: tap the bucket, then each stop down to the end; a picture at each stop (__SHOTS__pitch-<width>-<stop>.png).
// Fails on a console or page error, a three.js warning (THREE.…), when the visitors' wall's Leave your tag has no 48 px tap area, or Write to me (the sticker on the pole, passed
// on the way up, and the sticker in the screen's corner) doesn't open the flyer with a working form and three 48 px tabs, or a phone turned with the flyer open breaks it.
async page => { const W = page.viewportSize().width, H = page.viewportSize().height, errs = [], res = { errs };
  page.on('console', m => { if (m.type() === 'error' || (m.type() === 'warning' && m.text().startsWith('THREE.'))) errs.push(m.text()); }); page.on('pageerror', e => errs.push(String(e)));
  await page.goto('__URL__'); await page.waitForTimeout(3500);
  await page.waitForFunction(() => { const b = window.bucketAt && window.bucketAt(); return b && (b.x > 0 ? b : matchMedia("(prefers-reduced-motion: reduce)").matches && getComputedStyle(document.querySelector(".start")).display === "none" && b); /* reduced motion: no start screen, nothing to tip */ }, null, { timeout: 20000 }).then(h => h.jsonValue()).then(b => page.mouse.click(b.x, b.y)) /* the bucket, not the middle: only it tips (11-25) */;
  for (let i = 0; i < 40 && !(await page.evaluate(() => document.documentElement.style.overflow === '')); i++) await page.waitForTimeout(250);
  const go = sv => page.evaluate(sv => scrollTo(0, svY(sv)), sv);
  for (const sv of [128, 432, 540, 590, 615, 700, 770, 840, 910, 960, 995, 1045, 1110, 1180]) { await go(sv); await page.waitForTimeout(sv >= 700 ? 3200 : 1500);
    await page.screenshot({ path: '__SHOTS__pitch-' + W + '-' + sv + '.png' }); }
  // Leave your tag (Tom 11-23: no end landing): the words and the can on the visitors' wall. The form lives on the flyer the Write to me sticker opens.
  await page.evaluate(() => scrollTo(0, visitY())); await page.waitForTimeout(2500);
  for (let i = 0; i < 60 && (await page.evaluate(() => document.getElementById('leaveUp').style.display)) !== 'block'; i++) await page.waitForTimeout(200);
  const box = sel => page.evaluate(sel => { const e = document.querySelector(sel); if (!e) return null; const b = e.getBoundingClientRect(), cs = getComputedStyle(e); return { shown: cs.display !== 'none' && +cs.opacity > .5 && b.width > 0, l: b.left, t: b.top, r: b.right, b: b.bottom, w: b.width, h: b.height, label: e.getAttribute('aria-label') }; }, sel);
  const big = (m, what) => { if (!m || !m.shown) errs.push(what + ' has no tap area'); else if (m.w < 47.5 || m.h < 47.5) errs.push('the tap area of ' + what + ' is under 48 px: ' + Math.round(m.w) + ' x ' + Math.round(m.h)); };
  res.leave = await box('#leaveUp'); big(res.leave, 'Leave your tag (the visitors\' wall)');
  res.cursor = await page.evaluate(() => getComputedStyle(document.getElementById('leaveUp')).cursor.slice(0, 30)); if (!/data:image\/svg/.test(res.cursor)) errs.push('Leave your tag has no spray-can cursor');
  if (W >= 600) { const r = res.leave; await page.mouse.move((r.l + r.r) / 2, (r.t + r.b) / 2); await page.waitForTimeout(500);
    res.hover = await page.evaluate(() => { const l = document.querySelector('.hl'); return { text: l.textContent, op: +getComputedStyle(l).opacity }; }); if (res.hover.op > .1) errs.push('hovering Leave your tag shows a label over the painted words (Tom 11-24: said once, the glow is enough): ' + JSON.stringify(res.hover)); await page.mouse.move(2, 2); }
  // the flyer, open: the form shows and takes typing, the three tabs are links with 48 px areas, nothing overlaps, it fits the screen; Esc folds it back
  const flyer = async (from, shot) => { await page.waitForTimeout(1200); await page.screenshot({ path: '__SHOTS__pitch-' + W + '-' + shot + '.png' });
    const f = await page.evaluate(() => { const m = document.getElementById('mail'), r = s => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return [b.left, b.top, b.right, b.bottom]; };
      return { coarse: matchMedia('(pointer: coarse)').matches, focused: document.activeElement && document.activeElement.tagName, typing: document.activeElement && /INPUT|TEXTAREA/.test(document.activeElement.tagName) && matchMedia('(pointer: coarse)').matches, sent: !!m.querySelector('[role="status"]'), open: document.getElementById('sheet').classList.contains('open'), inSheet: !!m.closest('#sheet'), inert: m.inert, op: +getComputedStyle(m).opacity, name: r('#mail .f-name span'), email: r('#mail .f-email span'), send: r('#mail button'), vw: innerWidth, vh: innerHeight,
        tabs: [...document.querySelectorAll('#sheet .tab')].map(a => { const b = a.getBoundingClientRect(); return { href: a.href, w: b.width, h: b.height, b: b.bottom }; }) }; });
    const overlap = (a, b) => Math.min(a[2], b[2]) > Math.max(a[0], b[0]) && Math.min(a[3], b[3]) > Math.max(a[1], b[1]);
    if (f.typing) errs.push(from + ': on a touch screen the flyer opened with a field focused, so the keyboard covers it');
    if (!f.open || !f.inSheet || f.inert || f.op < .9) errs.push(from + ': the flyer did not open with the form: ' + JSON.stringify(f));
    if (f.name && (overlap(f.name, f.email) || f.send[2] > f.vw || f.send[3] > f.vh || f.send[0] < 0)) errs.push(from + ': the form does not fit: ' + JSON.stringify(f));
    if (f.tabs.length !== 3 || f.tabs.some(t => !t.href || t.w < 47.5 || t.h < 47.5 || t.b > f.vh + 1)) errs.push(from + ': the tabs are not three 48 px links on screen: ' + JSON.stringify(f.tabs));
    return f; };
  const shut = async from => { await page.keyboard.press('Escape'); await page.waitForTimeout(1000); const c = await page.evaluate(() => ({ open: document.getElementById('sheet').classList.contains('on'), home: !document.getElementById('mail').closest('#sheet'), inert: document.getElementById('mail').inert }));
    if (c.open || !c.home || !c.inert) errs.push(from + ': Esc did not fold the flyer back: ' + JSON.stringify(c)); };
  const ticked = () => page.evaluate(() => document.getElementById('corner').classList.contains('sent'));
  res.corner = await box('#corner'); big(res.corner, 'Write to me (the corner sticker)');
  await page.click('#corner'); res.fromCorner = await flyer('the corner sticker', 'flyer');
  // a phone turned with the flyer open: it follows the new shape
  if (W < 600) { await page.setViewportSize({ width: H, height: W }); res.turned = await flyer('a turned phone', 'turned'); await page.setViewportSize({ width: W, height: H }); await page.waitForTimeout(800); }
  // Send (the mail service stood in for): the flyer says it was sent; folded back, both stickers wear a tick
  await page.route('**/api/contact', r => r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }));
  await page.fill('#mail input[name="name"]', 'Check'); await page.fill('#mail input[name="email"]', 'check@example.com'); await page.fill('#mail textarea', 'A test from the tour check.');
  await page.click('#mail button'); await page.waitForTimeout(800);
  res.sent = await page.evaluate(() => (document.querySelector('#mail [role="status"]') || {}).textContent || ''); if (!/^Sent\./.test(res.sent)) errs.push('Send did not say it was sent: ' + JSON.stringify(res.sent));
  await page.unroute('**/api/contact');
  await shut('the corner sticker');
  if (!(await ticked())) errs.push('after Send the corner sticker has no tick');
  // on the way up to the visitors' wall the camera goes round the pole: its Write to me sticker is big enough to tap, and opens the same flyer
  await page.evaluate(() => scrollTo(0, Math.round(visitY() + (svY(0) - visitY()) * .7))); await page.waitForTimeout(2500); await page.screenshot({ path: '__SHOTS__pitch-' + W + '-pole.png' });
  res.pole = await box('#bombHot'); big(res.pole, 'Write to me (the sticker on the pole)');
  if (res.pole && res.pole.shown) { await page.click('#bombHot'); await flyer('the pole sticker', 'pole-flyer'); await shut('the pole sticker'); }
  // the loop (Tom 11-23): scrolled on past the end the page is at its top, which shows the start's view; on down: the visitors' wall, the pole, the start
  await page.evaluate(() => scrollTo(0, svY(1180))); await page.waitForTimeout(1500); await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight)); await page.waitForTimeout(1500);
  res.loop = await page.evaluate(() => Math.round(scrollY)); if (res.loop > 12) errs.push('past the end the page did not come round to its top: ' + res.loop);
  return JSON.stringify(res); }

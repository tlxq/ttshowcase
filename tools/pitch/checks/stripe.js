// The progress stripe (Tom 11-26, pick B): a sprayed stripe along the top that fills as you walk, with the area's name under it. At epaRadar it says
// "Side projects", at ttoolbox "Toolbox", out of the garage's back door and at EDGE "Client work" (shown, and heard: the bar's value text); the start wall and the end wall show no name
// (Tom 11-27) and a screen reader hears "Start" and "End" there; the paint reaches as far as the walk has gone and
// the dark band shows past it; the old 3px line is gone; the name is the token's size (22 px on a laptop, 17 on a phone) and still under reduced motion it
// does not fade. Run at 1440 x 900 and on a phone.
async page => { const W = page.viewportSize().width, errs = [], res = { errs, stops: [] };
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); page.on('pageerror', e => errs.push(String(e)));
  await page.goto('__URL__'); await page.waitForTimeout(3500);
  await page.waitForFunction(() => { const b = window.bucketAt && window.bucketAt(); return b && (b.x > 0 ? b : matchMedia("(prefers-reduced-motion: reduce)").matches && getComputedStyle(document.querySelector(".start")).display === "none" && b); /* reduced motion: no start screen, nothing to tip */ }, null, { timeout: 20000 }).then(h => h.jsonValue()).then(b => page.mouse.click(b.x, b.y)) /* the bucket, not the middle: only it tips (11-25) */;
  for (let i = 0; i < 40 && !(await page.evaluate(() => document.documentElement.style.overflow === '')); i++) await page.waitForTimeout(250);
  if (await page.evaluate(() => !!document.querySelector('.prog'))) errs.push('the old progress line (.prog) is still on the page');
  const look = () => page.evaluate(() => { const n = document.querySelector('.stripe'); if (!n) return null; const c = n.querySelector('canvas'), dpr = c.width / innerWidth, g = c.getContext('2d'), t = window.stripeTest(), x = t.f * innerWidth;
    const px = xx => { const d = g.getImageData(Math.max(0, Math.min(c.width - 1, Math.round(xx * dpr))), Math.round(3 * dpr), 1, 1).data; return [d[0], d[1], d[2], d[3]]; }, on = [...n.querySelectorAll('span.on')];
    return { role: n.getAttribute('role'), now: +n.getAttribute('aria-valuenow'), text: n.getAttribute('aria-valuetext'), shown: on.map(s => s.textContent), f: t.f, size: on[0] ? getComputedStyle(on[0]).fontSize : null, painted: x > 40 ? px(x - 30) : null, bare: x < innerWidth - 40 ? px(x + 30) : null }; });
  let last = -1; const sprayed = c => c && c[2] > 200 && c[0] < 120, dark = c => c && c[2] < 80;
  for (const [sv, name, said] of [[0, '', 'Start'], [30, '', 'Start'], [128, 'Side projects'], [700, 'Toolbox'], [770, 'Toolbox'], [840, 'Toolbox'], [905, 'Client work'], [965, 'Client work'], [1045, 'Client work'], [1180, '', 'End']]) {
    await page.evaluate(sv => scrollTo(0, svY(sv)), sv); await page.waitForTimeout(sv >= 700 ? 3200 : 1500);
    const s = await look(); res.stops.push({ sv, ...s }); if (!s) { errs.push('no stripe at ' + sv); continue; }
    if (s.role !== 'progressbar') errs.push('the stripe is no progress bar for a screen reader (role ' + s.role + ')');
    if (s.text !== (said || name)) errs.push('at ' + sv + ' a screen reader hears "' + s.text + '", not "' + (said || name) + '"');
    if (s.shown.join() !== name) errs.push('at ' + sv + ' the stripe shows "' + s.shown.join() + '", not "' + name + '"');
    if (!(s.f > last)) errs.push('the stripe did not fill further at ' + sv + ' (' + last + ' to ' + s.f + ')'); last = s.f;
    if (Math.abs(s.now - Math.round(s.f * 100)) > 1) errs.push('aria-valuenow ' + s.now + ' is not the fill ' + Math.round(s.f * 100));
    if (s.painted && !sprayed(s.painted)) errs.push('at ' + sv + ' there is no spray in the stripe behind the edge: ' + JSON.stringify(s.painted));
    if (s.bare && !dark(s.bare)) errs.push('at ' + sv + ' the stripe is painted past the walk\'s end: ' + JSON.stringify(s.bare));
    const want = W < 600 ? '17px' : '22px'; if (name && s.size !== want) errs.push('the name is ' + s.size + ', not ' + want); }
  if (last < .9) errs.push('the stripe is not nearly full at the end (' + last + ')');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const tr = await page.evaluate(() => getComputedStyle(document.querySelector('.stripe span')).transitionDuration); res.reduced = tr; if (/[1-9]/.test(tr.replace(/0(\.0*)?m?s/g, ''))) errs.push('the names still fade under reduced motion (' + tr + ')');
  await page.screenshot({ path: '__SHOTS__pitch-' + W + '-stripe.png' });
  return JSON.stringify(res); }

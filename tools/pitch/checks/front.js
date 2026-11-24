// The front page (front.html), walked top to bottom in steps: no script errors, no blocked script (the page's own
// script rule), no missing file, no sideways scroll at any step; at the bottom the signature count has reached its
// number and every handwritten note has written itself.
async page => { const W = page.viewportSize().width, errs = [], res = { errs, steps: 0 };
  page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('response', r => { if (r.status() >= 400) errs.push(r.status() + ' ' + r.url()); });
  page.on('requestfailed', r => { const f = r.failure()?.errorText || ''; if (!/ERR_ABORTED/.test(f)) errs.push('failed ' + r.url() + ' ' + f); });
  await page.route('https://api.github.com/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' })); // GitHub allows 60 asks an hour: no number is drawn, as when it fails
  await page.addInitScript(() => document.addEventListener('securitypolicyviolation', e => console.error('blocked by the script rule: ' + e.blockedURI + ' ' + e.violatedDirective)));
  await page.goto('__URL__'); await page.waitForTimeout(2500);
  const H = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  for (let y = 0; ; y = Math.min(H, y + Math.round(page.viewportSize().height * 0.6))) {
    await page.evaluate(y => scrollTo(0, y), y); await page.waitForTimeout(700); res.steps++;
    const wide = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    if (wide > 1) errs.push('sideways scroll of ' + wide + ' px at ' + y);
    if (y >= H) break; }
  await page.waitForTimeout(1800);
  res.count = await page.evaluate(() => [document.querySelector('.count .n')?.textContent, document.querySelector('.count .sr')?.textContent]);
  if (!res.count[0] || res.count[0] !== res.count[1]) errs.push('the signature count ended at ' + res.count[0] + ', not ' + res.count[1]);
  res.notes = await page.evaluate(() => [...document.querySelectorAll('.note')].map(n => n.classList.contains('on') || !n.classList.contains('wait')));
  if (res.notes.includes(false)) errs.push('a handwritten note never wrote itself: ' + JSON.stringify(res.notes));
  await page.screenshot({ path: '__SHOTS__front-' + W + '-end.png' });
  // every link, button and field is a 48 px tap (signum K4), and no two links read the same to a screen reader (Tom 11-24, audit 4b)
  res.taps = await page.evaluate(() => [...document.querySelectorAll('a, button, input:not([tabindex="-1"]), textarea')].filter(e => e.getClientRects().length).map(e => ({ n: (e.getAttribute('aria-label') || e.textContent || e.name).trim().slice(0, 30), h: Math.round(e.getBoundingClientRect().height), href: e.getAttribute('href') })));
  const small = res.taps.filter(t => t.h < 48); if (small.length) errs.push('taps under 48 px: ' + JSON.stringify(small));
  const names = {}; res.taps.filter(t => t.href).forEach(t => (names[t.n] ??= new Set()).add(t.href)); const same = Object.entries(names).filter(([, h]) => h.size > 1).map(([n]) => n);
  if (same.length) errs.push('links with the same name go to different places: ' + same.join(', '));
  delete res.taps;
  // a film pauses on a tap and plays on the next (WCAG 2.2.2, Tom 11-24): the mark says what a tap does next
  res.film = await page.evaluate(async () => { const v = document.querySelector('.film video'), b = document.querySelector('.film .vp'), seen = () => { const r = v.getBoundingClientRect(), x = (r.left + r.right) / 2, y = (r.top + r.bottom) / 2; return x > 0 && x < innerWidth && y > innerHeight * .25 && y < innerHeight * .75; };
    for (let y = 0; y < document.documentElement.scrollHeight && !seen(); y += innerHeight / 4) { scrollTo(0, y); await new Promise(r => setTimeout(r, 120)); } // the projects slide sideways on a laptop
    await new Promise(r => setTimeout(r, 1500)); const a = [v.paused, b.getAttribute('aria-label')]; v.click(); await new Promise(r => setTimeout(r, 300));
    const c = [v.paused, b.getAttribute('aria-label')]; b.click(); await new Promise(r => setTimeout(r, 600)); return [a, c, [v.paused, b.getAttribute('aria-label')]]; });
  const still = await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  const wantFilm = still ? [[true, 'Play the video'], [false, 'Pause the video'], [true, 'Play the video']] : [[false, 'Pause the video'], [true, 'Play the video'], [false, 'Pause the video']];
  if (JSON.stringify(res.film) !== JSON.stringify(wantFilm)) errs.push('a tap does not pause and play the film: ' + JSON.stringify(res.film));
  return JSON.stringify(res); }

// The front page (front.html), walked top to bottom in steps: no script errors, no blocked script (the page's own
// script rule), no missing file, no sideways scroll at any step; at the bottom the signature count has reached its
// number and every handwritten note has written itself.
async page => { const W = page.viewportSize().width, errs = [], res = { errs, steps: 0 };
  page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error' && !/status of (429|403)\b/.test(m.text())) errs.push(m.text()); });
  page.on('response', r => { if (r.status() >= 400 && !/\/api\/contact$/.test(r.url())) errs.push(r.status() + ' ' + r.url()); });
  page.on('requestfailed', r => { const f = r.failure()?.errorText || ''; if (!/ERR_ABORTED/.test(f)) errs.push('failed ' + r.url() + ' ' + f); });
  await page.route('**/api/github', r => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' })); // GitHub allows 60 asks an hour: no number is drawn, as when it fails
  await page.addInitScript(() => document.addEventListener('securitypolicyviolation', e => console.error('blocked by the script rule: ' + e.blockedURI + ' ' + e.violatedDirective)));
  await page.goto('__URL__'); await page.waitForTimeout(2500);
  // the page names its icon (audit 4a, 11-25): without one a browser asks for /favicon.ico, which is a 404 and a console error
  res.icon = await page.evaluate(async () => { const l = document.querySelector('link[rel~="icon"]'); return l ? (await fetch(l.href)).status : 0; });
  if (res.icon !== 200) errs.push('the page names no icon that loads (a browser then asks for /favicon.ico, a 404): ' + res.icon);
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
  // a send past the day's limit says so (it said "The mail service didn't answer." before 11-24), and keeps the message
  await page.route('**/api/contact', r => r.fulfill({ status: 429, contentType: 'application/json', body: '{"error":"too-many"}' }));
  await page.fill('#mail input[name="name"]', 'Check'); await page.fill('#mail input[name="email"]', 'check@example.com'); await page.fill('#mail textarea', 'A test from the front check.');
  await page.click('#mail button'); await page.waitForTimeout(800);
  res.limit = await page.evaluate(() => ({ err: document.getElementById('mailErr').textContent, kept: document.querySelector('#mail textarea').value }));
  if (!/all its messages for today/.test(res.limit.err) || res.limit.kept !== 'A test from the front check.') errs.push('a send past the limit does not say so or loses the message: ' + JSON.stringify(res.limit));
  // BotID refusing the send (403 robot) says so, not that the mail service didn't answer (F-102-1, 11-26)
  await page.route('**/api/contact', r => r.fulfill({ status: 403, contentType: 'application/json', body: '{"error":"robot"}' }));
  await page.click('#mail button'); await page.waitForTimeout(800);
  res.robot = await page.evaluate(() => document.getElementById('mailErr').textContent);
  if (!/browser check didn't pass/.test(res.robot) || /mail service/.test(res.robot)) errs.push('a send BotID refuses does not say so: ' + res.robot);
  await page.unroute('**/api/contact');
  // every link, button and field is a 48 px tap (signum K4), and no two links read the same to a screen reader (Tom 11-24, audit 4b)
  res.taps = await page.evaluate(() => [...document.querySelectorAll('a, button, input:not([tabindex="-1"]), textarea')].filter(e => e.getClientRects().length).map(e => ({ n: (e.getAttribute('aria-label') || e.textContent || e.name).trim().slice(0, 30), h: Math.round(e.getBoundingClientRect().height), href: e.getAttribute('href') })));
  const small = res.taps.filter(t => t.h < 48); if (small.length) errs.push('taps under 48 px: ' + JSON.stringify(small));
  const names = {}; res.taps.filter(t => t.href).forEach(t => (names[t.n] ??= new Set()).add(t.href)); const same = Object.entries(names).filter(([, h]) => h.size > 1).map(([n]) => n);
  if (same.length) errs.push('links with the same name go to different places: ' + same.join(', '));
  delete res.taps;
  // two films, two buttons: each has its own name, so a screen reader's list of buttons tells them apart (audit N-68)
  const marks = await page.evaluate(() => [...document.querySelectorAll('.vp')].map(b => b.getAttribute('aria-label')));
  if (marks.length < 2 || new Set(marks).size !== marks.length) errs.push('the film buttons share a name: ' + JSON.stringify(marks));
  // a film pauses on a tap and plays on the next (WCAG 2.2.2, Tom 11-24): the mark says what a tap does next
  res.film = await page.evaluate(async () => { const v = document.querySelector('.film video'), b = document.querySelector('.film .vp'), seen = () => { const r = v.getBoundingClientRect(), x = (r.left + r.right) / 2, y = (r.top + r.bottom) / 2; return x > 0 && x < innerWidth && y > innerHeight * .25 && y < innerHeight * .75; };
    for (let y = 0; y < document.documentElement.scrollHeight && !seen(); y += innerHeight / 4) { scrollTo(0, y); await new Promise(r => setTimeout(r, 120)); } // the projects slide sideways on a laptop
    await new Promise(r => setTimeout(r, 1500)); const a = [v.paused, b.getAttribute('aria-label')]; v.click(); await new Promise(r => setTimeout(r, 300));
    const c = [v.paused, b.getAttribute('aria-label')]; b.click(); await new Promise(r => setTimeout(r, 600)); return [a, c, [v.paused, b.getAttribute('aria-label')]]; });
  const still = await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  const wantFilm = still ? [[true, 'Play the epaRadar video'], [false, 'Pause the epaRadar video'], [true, 'Play the epaRadar video']] : [[false, 'Pause the epaRadar video'], [true, 'Play the epaRadar video'], [false, 'Pause the epaRadar video']];
  if (JSON.stringify(res.film) !== JSON.stringify(wantFilm)) errs.push('a tap does not pause and play the film: ' + JSON.stringify(res.film));
  return JSON.stringify(res); }

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
  return JSON.stringify(res); }

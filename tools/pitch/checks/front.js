// The front page (front.html), walked top to bottom in steps: no script errors, no blocked script (the page's own
// script rule), no missing file, no sideways scroll at any step; at the bottom the signature count has reached its
// number and every handwritten note has written itself.
async page => { const W = page.viewportSize().width, errs = [], res = { errs, steps: 0 };
  page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error' && !/status of 429\b/.test(m.text())) errs.push(m.text()); });
  page.on('response', r => { if (r.status() >= 400 && !/\/api\/contact$/.test(r.url())) errs.push(r.status() + ' ' + r.url()); });
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
  // a send past the day's limit says so (it said "The mail service didn't answer." before 11-24), and keeps the message
  await page.route('**/api/contact', r => r.fulfill({ status: 429, contentType: 'application/json', body: '{"error":"too-many"}' }));
  await page.fill('#mail input[name="name"]', 'Check'); await page.fill('#mail input[name="email"]', 'check@example.com'); await page.fill('#mail textarea', 'A test from the front check.');
  await page.click('#mail button'); await page.waitForTimeout(800);
  res.limit = await page.evaluate(() => ({ err: document.getElementById('mailErr').textContent, kept: document.querySelector('#mail textarea').value }));
  if (!/all its messages for today/.test(res.limit.err) || res.limit.kept !== 'A test from the front check.') errs.push('a send past the limit does not say so or loses the message: ' + JSON.stringify(res.limit));
  await page.unroute('**/api/contact');
  return JSON.stringify(res); }

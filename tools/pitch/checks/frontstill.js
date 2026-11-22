// The front page with reduced motion: no errors, nothing waiting to draw (every note and blue word there at once),
// the signature count already at its number, and no sideways scroll.
async page => { const W = page.viewportSize().width, errs = [], res = { errs };
  page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('response', r => { if (r.status() >= 400) errs.push(r.status() + ' ' + r.url()); });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('__URL__'); await page.waitForTimeout(2500);
  res.waiting = await page.evaluate(() => document.querySelectorAll('.wait').length);
  if (res.waiting) errs.push(res.waiting + ' things wait to draw with reduced motion');
  res.count = await page.evaluate(() => [document.querySelector('.count .n')?.textContent, document.querySelector('.count .sr')?.textContent]);
  if (res.count[0] !== res.count[1]) errs.push('the signature count shows ' + res.count[0] + ', not ' + res.count[1]);
  const wide = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  if (wide > 1) errs.push('sideways scroll of ' + wide + ' px');
  return JSON.stringify(res); }

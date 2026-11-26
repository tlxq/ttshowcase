// The front page with reduced motion: no errors, nothing waiting to draw (every note and blue word there at once),
// the signature count already at its number, the poster drawn once and then left alone, and no sideways scroll.
async page => { const W = page.viewportSize().width, errs = [], res = { errs };
  page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('response', r => { if (r.status() >= 400) errs.push(r.status() + ' ' + r.url()); });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => { window.__drawn = 0; const clear = CanvasRenderingContext2D.prototype.clearRect; // the poster clears its whole canvas once per drawing
    CanvasRenderingContext2D.prototype.clearRect = function (x, y, w, h) { if (x === 0 && y === 0 && this.canvas.classList.contains('code')) window.__drawn++; return clear.call(this, x, y, w, h); }; });
  await page.goto('__URL__'); await page.waitForTimeout(2500);
  res.waiting = await page.evaluate(() => document.querySelectorAll('.wait').length);
  if (res.waiting) errs.push(res.waiting + ' things wait to draw with reduced motion');
  res.count = await page.evaluate(() => [document.querySelector('.count .n')?.textContent, document.querySelector('.count .sr')?.textContent]);
  if (res.count[0] !== res.count[1]) errs.push('the signature count shows ' + res.count[0] + ', not ' + res.count[1]);
  const d0 = await page.evaluate(() => window.__drawn); await page.waitForTimeout(1000); res.redrawn = (await page.evaluate(() => window.__drawn)) - d0; // (11-26) the poster's loop woke for reduced motion too
  if (res.redrawn) errs.push('the poster drew ' + res.redrawn + ' more times in a second with reduced motion');
  const wide = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  if (wide > 1) errs.push('sideways scroll of ' + wide + ' px');
  return JSON.stringify(res); }

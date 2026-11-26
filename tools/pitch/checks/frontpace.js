// S-2: the front's poster (the canvas of lettered cells) draws every frame on a fast device, nothing while it is off screen,
// and 30 a second on a slow one. "Slow" is measured (pitch/pace.js), so the slow case is made here with the browser's own CPU
// slowdown (6x), not by a flag. Draws are counted as the canvas's full clear, which the poster does once per drawing.
// The unit side (when a device counts as slow, how often a slow one draws) is tools/pitch/pace.test.mjs.
async page => { const errs = [], res = { errs };
  page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.addInitScript(() => { window.__drawn = 0; const clear = CanvasRenderingContext2D.prototype.clearRect;
    CanvasRenderingContext2D.prototype.clearRect = function (x, y, w, h) { if (x === 0 && y === 0 && this.canvas.classList.contains('code')) window.__drawn++; return clear.call(this, x, y, w, h); }; });
  const rate = async ms => { const a = await page.evaluate(() => window.__drawn); await page.waitForTimeout(ms); return Math.round(((await page.evaluate(() => window.__drawn)) - a) / (ms / 1000)); };
  const slow = () => page.evaluate(() => document.documentElement.dataset.posterSlow === '1');
  await page.goto('__URL__'); await page.waitForTimeout(4000); // past the load: the first 2.5 s are not counted as the device's speed
  res.fast = await rate(2000); res.fastFlag = await slow();
  if (res.fast < 40) errs.push('the poster draws ' + res.fast + ' a second on a fast device, not about 60');
  if (res.fastFlag) errs.push('a fast device was taken for a slow one');
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight)); await page.waitForTimeout(800);
  res.off = await rate(1500);
  if (res.off > 0) errs.push('the poster drew ' + res.off + ' a second with the hero off screen');
  await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(800);
  res.back = await rate(1000);
  if (res.back < 40) errs.push('the poster did not start again when it came back (' + res.back + ' a second)');
  const cdp = await page.context().newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 });
  await page.waitForTimeout(6000); // enough frames to know
  res.slowFlag = await slow(); res.slow = await rate(2000);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  if (!res.slowFlag) errs.push('a device with 6x slower CPU was not taken for slow');
  if (res.slow > 33) errs.push('the poster draws ' + res.slow + ' a second on a slow device, over 30');
  if (res.slow < 5) errs.push('the poster hardly draws on a slow device (' + res.slow + ' a second)');
  return JSON.stringify(res); }

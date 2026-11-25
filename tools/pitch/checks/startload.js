// The start on a slow load (Tom 11-25: the photo and the name showed unplaced, then jumped; the number counted down once):
// with a slow phone and network, the start layer never shows before it is placed round the bucket, never in the other screen's layout
// (11-25: the first frame measured the default camera and showed the phone's layout on a laptop), and its number only counts up.
async page => { const errs = [], res = { errs }; page.on('pageerror', e => errs.push(String(e)));
  const cdp = await page.context().newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 });
  await cdp.send('Network.enable'); await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 400000, uploadThroughput: 100000 });
  page.goto('__URL__').catch(() => {});
  let last = -1, unplaced = 0, wrong = 0, down = [], seen = 0;
  for (let i = 0; i < 120; i++) { await page.waitForTimeout(100);
    const s = await page.evaluate(() => { const st = document.querySelector('.start'); if (!st) return null; const im = st.querySelector('img'), n = st.querySelector('.num');
      return { vis: getComputedStyle(st).visibility === 'visible' && getComputedStyle(st).display !== 'none', placed: !!im.style.height, side: st.querySelector('h2').style.textAlign === 'right', wide: innerWidth / innerHeight > 1, num: +n.textContent, ready: !!document.documentElement.dataset.readyAt }; }).catch(() => null);
    if (!s) continue; if (s.vis) { seen++; if (!s.placed) unplaced++; if (s.side !== s.wide) wrong++; if (s.num < last) down.push(last + '->' + s.num); last = Math.max(last, s.num); } if (s.ready) break; }
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 }); await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  res.seen = seen; res.last = last;
  if (!seen) errs.push('the start never showed');
  if (unplaced) errs.push('the start showed before it was placed, ' + unplaced + ' times');
  if (wrong) errs.push('the start showed in the other screen\'s layout, ' + wrong + ' times');
  if (down.length) errs.push('the number counted down: ' + down.join(', '));
  return JSON.stringify(res); }

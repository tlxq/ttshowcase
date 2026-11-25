// The tag tool's speed test (PR1): the wall as it is, then with the visitor wall full (?tags=full), then full again with the tap
// the moment the bucket is ready, while wall stretches may still be on their way. For each: when the bucket is ready to tip,
// when the last wall stretch is on the graphics card, and the slowest frame from the tap through the whole walk.
// It tests what the tags add, against today's wall in the same run: fails when the full wall makes the bucket wait 0.3 s longer,
// has more frames over 50 ms or a slower worst frame (by more than one refresh at 60 Hz) than today's wall, or a time or the frames never show.
// The same for the visitors' wall (PR7): 40 approved stroke tags in the local store (tools/tags/local.mjs), painted from the store's answer, against today's empty wall.
// A hard 50 ms limit after the tap waits on the pour fix (plan F-pr1-3): the pour alone has slow frames, tags or not.
// On a laptop no load or event handler may hold one frame longer than 30 ms after the tap (Chrome's long-animation-frame record names it): a glow built in one go
// (11-25) held 51-66 ms at its wall on every load, yet showed as a slow frame only now and then, so the frame comparison passed or failed by chance.
// A phone's limits are proven on the S23.
async page => { const W = page.viewportSize().width, H = page.viewportSize().height, errs = [], res = { errs };
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); page.on('pageerror', e => errs.push(String(e)));
  const at = () => page.evaluate(() => ({ ready: +document.documentElement.dataset.readyAt || null, wall: +document.documentElement.dataset.wallAt || null }));
  const run = async (q, early, store) => {
    await page.goto('__URL__' + q);
    for (let i = 0; i < 60 && !(await page.evaluate(([early, store]) => document.documentElement.dataset.readyAt && (early || document.documentElement.dataset.wallAt && (!store || document.documentElement.dataset.storeAt)), [early, store])); i++) await page.waitForTimeout(early ? 20 : 250);
    const before = await at();
    await page.evaluate(() => { const F = window.__F = [], L = window.__L = []; new PerformanceObserver(l => { for (const e of l.getEntries()) { for (const x of e.scripts) if (x.invokerType !== 'user-callback' && x.duration > 30) L.push(Math.round(x.duration) + ' ms (' + x.invoker + ')'); } }).observe({ type: 'long-animation-frame' }); let last = 0; (function f(now) { if (last) F.push(now - last); last = now; requestAnimationFrame(f); })(); });
    await page.evaluate(() => window.bucketAt()).then(b => page.mouse.click(b.x, b.y)) /* the bucket, not the middle: only it tips (11-25) */;
    for (let i = 0; i < 40 && !(await page.evaluate(() => document.documentElement.style.overflow === '')); i++) await page.waitForTimeout(250);
    await page.waitForTimeout(1500);
    const go = sv => page.evaluate(sv => scrollTo(0, svY(sv)), sv);
    for (const sv of [60, 128, 300, 432, 540, 700, 910, 1180]) { await go(sv); await page.waitForTimeout(900); }
    const F = await page.evaluate(() => window.__F.slice(1)), L = await page.evaluate(() => window.__L), after = await at();
    const r = { ready: after.ready, wall: after.wall, frames: F.length, worst: Math.round(Math.max(...F)), over50: F.filter(v => v > 50).length, held: L };
    if (early) r.pendingAtTap = !before.wall;
    if (store) r.storeAt = +(await page.evaluate(() => document.documentElement.dataset.storeAt)) || null;
    return r;
  };
  await page.goto('__URL__'); await page.evaluate(() => fetch('/api/tags-local/reset', { method: 'POST' })); // each run starts with an empty store
  res.now = await run('');
  res.full = await run('&tags=full');
  res.fullEarlyTap = await run('&tags=full', true);
  await page.evaluate(() => fetch('/api/tags-local/seed?n=40', { method: 'POST' }));
  res.store = await run('', false, true);
  res.storeEarlyTap = await run('', true, true);
  for (const [k, r] of Object.entries({ now: res.now, full: res.full, fullEarlyTap: res.fullEarlyTap, store: res.store, storeEarlyTap: res.storeEarlyTap })) {
    if (!r.ready) errs.push(k + ': the bucket was never ready');
    if (!r.wall) errs.push(k + ': a wall stretch never arrived');
    if (k.startsWith('store') && !r.storeAt && !r.pendingAtTap) errs.push(k + ': the visitors\' tags never reached the wall');
    if (!r.frames) { errs.push(k + ': no frames recorded'); continue; }
    if (W >= 900 && r.held.length) errs.push(k + ': a script held one frame ' + r.held.join('; '));
    if (k !== 'now' && res.now.frames && r.over50 > res.now.over50) errs.push(k + ': ' + r.over50 + ' frames over 50 ms after the tap, today\'s wall ' + res.now.over50);
    if (k !== 'now' && res.now.frames && r.worst > res.now.worst + 17) errs.push(k + ': slowest frame ' + r.worst + ' ms, today\'s wall ' + res.now.worst + ' ms');
  }
  if (res.now.ready && res.full.ready && res.full.ready - res.now.ready >= 300) errs.push('the full visitor wall makes the bucket wait ' + (res.full.ready - res.now.ready) + ' ms longer');
  await page.evaluate(() => fetch('/api/tags-local/reset', { method: 'POST' }));
  return JSON.stringify(res); }

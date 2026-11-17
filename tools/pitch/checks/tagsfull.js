// The tag tool's speed test (PR1): the wall as it is, then with the visitor wall full (?tags=full), then full again with the tap
// the moment the bucket is ready, while wall stretches may still be on their way. For each: when the bucket is ready to tip,
// when the last wall stretch is on the graphics card, and the slowest frame from the tap through the whole walk.
// It tests what the tags add, against today's wall in the same run: fails when the full wall makes the bucket wait 0.3 s longer,
// has more frames over 50 ms or a slower worst frame (by more than one refresh at 60 Hz) than today's wall, or a time or the frames never show.
// A hard 50 ms limit after the tap waits on the pour fix (plan F-pr1-3): the pour alone has slow frames, tags or not.
async page => { const W = page.viewportSize().width, H = page.viewportSize().height, errs = [], res = { errs };
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); page.on('pageerror', e => errs.push(String(e)));
  const at = () => page.evaluate(() => ({ ready: +document.documentElement.dataset.readyAt || null, wall: +document.documentElement.dataset.wallAt || null }));
  const run = async (q, early) => {
    await page.goto('__URL__' + q);
    for (let i = 0; i < 60 && !(await page.evaluate(early => document.documentElement.dataset.readyAt && (early || document.documentElement.dataset.wallAt), early)); i++) await page.waitForTimeout(early ? 20 : 250);
    const before = await at();
    await page.evaluate(() => { const F = window.__F = []; let last = 0; (function f(now) { if (last) F.push(now - last); last = now; requestAnimationFrame(f); })(); });
    await page.mouse.click(W / 2, H / 2);
    for (let i = 0; i < 40 && !(await page.evaluate(() => document.documentElement.style.overflow === '')); i++) await page.waitForTimeout(250);
    await page.waitForTimeout(1500);
    const go = sv => page.evaluate(sv => scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * sv / +document.documentElement.dataset.svEnd), sv);
    for (const sv of [60, 128, 300, 432, 540, 700, 910, 1180]) { await go(sv); await page.waitForTimeout(900); }
    const F = await page.evaluate(() => window.__F.slice(1)), after = await at();
    const r = { ready: after.ready, wall: after.wall, frames: F.length, worst: Math.round(Math.max(...F)), over50: F.filter(v => v > 50).length };
    if (early) r.pendingAtTap = !before.wall;
    return r;
  };
  res.now = await run('');
  res.full = await run('?tags=full');
  res.fullEarlyTap = await run('?tags=full', true);
  for (const [k, r] of Object.entries({ now: res.now, full: res.full, fullEarlyTap: res.fullEarlyTap })) {
    if (!r.ready) errs.push(k + ': the bucket was never ready');
    if (!r.wall) errs.push(k + ': a wall stretch never arrived');
    if (!r.frames) { errs.push(k + ': no frames recorded'); continue; }
    if (k !== 'now' && res.now.frames && r.over50 > res.now.over50) errs.push(k + ': ' + r.over50 + ' frames over 50 ms after the tap, today\'s wall ' + res.now.over50);
    if (k !== 'now' && res.now.frames && r.worst > res.now.worst + 17) errs.push(k + ': slowest frame ' + r.worst + ' ms, today\'s wall ' + res.now.worst + ' ms');
  }
  if (res.now.ready && res.full.ready && res.full.ready - res.now.ready >= 300) errs.push('the full visitor wall makes the bucket wait ' + (res.full.ready - res.now.ready) + ' ms longer');
  return JSON.stringify(res); }

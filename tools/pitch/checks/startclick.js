// Only the bucket tips (Tom 11-25): once it is full, a click on the photo, the name or the empty dark does nothing, the bucket
// shows a hand when hovered, and a click on it opens the walk. Before, a click anywhere on the start tipped it.
async page => { const errs = [], res = { errs }; page.on('pageerror', e => errs.push(String(e)));
  await page.goto('__URL__');
  for (let i = 0; i < 80 && !(await page.evaluate(() => document.documentElement.dataset.readyAt)); i++) await page.waitForTimeout(250);
  const open = () => page.evaluate(() => document.documentElement.style.overflow === '');
  const spots = await page.evaluate(() => { const c = e => { const b = document.querySelector(e).getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; }; return { photo: c('.start img'), name: c('.start h2'), dark: { x: 8, y: innerHeight - 8 }, bucket: window.bucketAt() }; });
  for (const k of ['photo', 'name', 'dark']) { await page.mouse.move(spots[k].x, spots[k].y); const cur = await page.evaluate(() => document.body.style.cursor);
    if (cur === 'pointer') errs.push('a hand shows over the ' + k);
    await page.mouse.click(spots[k].x, spots[k].y); await page.waitForTimeout(1200); if (await open()) { errs.push('a click on the ' + k + ' tipped the bucket'); return JSON.stringify(res); } }
  await page.mouse.move(spots.bucket.x, spots.bucket.y); res.hand = await page.evaluate(() => document.body.style.cursor);
  if (res.hand !== 'pointer') errs.push('no hand over the bucket: ' + res.hand);
  await page.mouse.click(spots.bucket.x, spots.bucket.y);
  let ok = false; for (let i = 0; i < 60 && !(ok = await open()); i++) await page.waitForTimeout(250);
  if (!ok) errs.push('a click on the bucket did not open the walk');
  res.spots = spots; return JSON.stringify(res); }

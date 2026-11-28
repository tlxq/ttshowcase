// The tag area grows (Tom 11-27): no visitor tags over another's tag, so when every spot of the area is taken the area grows along the wall, to the left, a step at a time, until the wall's own end.
// Proves, on the page's own rules (pickTest.grow puts tags' boxes on the wall as the store would): an empty wall keeps today's area; with today's area full the area is longer and the first spot
// offered lies in the new part, free; with the whole wall full to its end the area stops there and no spot is offered (nothing is ever covered).
async page => { const errs = [], res = { errs }; page.on('pageerror', e => errs.push(String(e)));
  await page.goto('__URL__');
  for (let i = 0; i < 80 && !(await page.evaluate(() => document.documentElement.dataset.readyAt)); i++) await page.waitForTimeout(250);
  const b = await page.evaluate(() => window.bucketAt()); await page.mouse.click(b.x, b.y);
  await page.waitForFunction(() => !!window.pickTest && document.documentElement.style.overflow === '', null, { timeout: 40000 });
  const F = await page.evaluate(() => window.pickTest.space().frame);
  const empty = await page.evaluate(() => window.pickTest.grow([])); res.empty = empty;
  if (empty.x0 !== empty.base) errs.push('with no tags on the wall the area already starts at ' + empty.x0 + ' m, not at ' + empty.base);
  if (!empty.offered) errs.push('with no tags on the wall no spot is offered');
  const full = await page.evaluate(() => { const e = window.pickTest.grow([]); return window.pickTest.grow([[e.base, e.y0, e.x1, e.y1]]); }); res.full = full;
  if (!(full.x0 < full.base)) errs.push('today\'s area is full and the area did not grow: it still starts at ' + full.x0 + ' m');
  if (!full.offered) errs.push('today\'s area is full and no spot is offered further along');
  else { if (!(full.offered[0] + F.w / 2 <= full.base + 1e-6)) errs.push('the spot offered (' + full.offered.join(', ') + ' m) is not past the full area, which ends at ' + full.base + ' m');
    if (full.offered[0] - F.w / 2 < full.end - 1e-6) errs.push('the spot offered (' + full.offered.join(', ') + ' m) runs past the wall\'s end at ' + full.end + ' m');
    if (full.why) errs.push('the spot offered is not free: ' + full.why); }
  const all = await page.evaluate(() => { const e = window.pickTest.grow([]); return window.pickTest.grow([[e.end - 1, e.y0, e.x1, e.y1]]); }); res.wallFull = all;
  if (all.x0 !== all.end) errs.push('with the whole wall full the area starts at ' + all.x0 + ' m, not at the wall\'s end ' + all.end);
  if (all.offered) errs.push('with the whole wall full a spot is still offered, over a tag: ' + all.offered.join(', '));
  res.steps = +((full.base - all.end) / (F.w + .5)).toFixed(2);
  // the grown part lies past the lamps: the hint must not call it lit (signum L1)
  await page.evaluate(() => document.getElementById('leave').click()); await page.waitForTimeout(2500); res.hint = await page.evaluate(() => document.getElementById('pickHint').textContent);
  if (/\blit\b/.test(res.hint) || !/free part of the wall/.test(res.hint)) errs.push('with the area grown the hint still says lit: ' + res.hint);
  return JSON.stringify(res); }

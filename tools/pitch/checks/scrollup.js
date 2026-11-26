// The loop's left turn (PR3): after the pour the page parks a little way down, with no label (Tom 11-23: the progress stripe alone says where you are);
// up at the visitors' wall the camera faces it (x -17..-7); on up past it, at the page's top, the bare wall by the lamp post, and the page lands near its end, which shows
// the same view (the seam, R3 11-24); the tag tool works at the visitors' wall, and at the seam, where the words are out of view, its tap area is gone;
// pulling past the top can't reload (overscroll-behavior); a resize while parked stays parked.
async page => { const W = page.viewportSize().width, H = page.viewportSize().height, errs = [], res = { errs };
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); page.on('pageerror', e => errs.push(String(e)));
  await page.goto('__URL__?tags=full'); await page.waitForTimeout(3500);
  await page.waitForFunction(() => { const b = window.bucketAt && window.bucketAt(); return b && (b.x > 0 ? b : matchMedia("(prefers-reduced-motion: reduce)").matches && getComputedStyle(document.querySelector(".start")).display === "none" && b); /* reduced motion: no start screen, nothing to tip */ }, null, { timeout: 20000 }).then(h => h.jsonValue()).then(b => page.mouse.click(b.x, b.y)) /* the bucket, not the middle: only it tips (11-25) */;
  for (let i = 0; i < 40 && !(await page.evaluate(() => document.documentElement.style.overflow === '')); i++) await page.waitForTimeout(250);
  await page.waitForTimeout(1500);
  const at = () => page.evaluate(() => ({ y: Math.round(scrollY), park: Math.round(svY(0)), label: document.getElementById('tagUp') ? 1 : 0, over: getComputedStyle(document.documentElement).overscrollBehaviorY })); // label: what the page sets
  res.park = await at();
  if (res.park.park < 50 || Math.abs(res.park.y - res.park.park) > 2) errs.push('the page did not park below the top after the pour: ' + JSON.stringify(res.park));
  if (res.park.label) errs.push('the "Scroll up" label is back: the progress stripe alone says where you are');
  if (res.park.over !== 'none') errs.push('pulling past the top could reload the page on a phone (overscroll-behavior-y is ' + res.park.over + ')');
  await page.screenshot({ path: '__SHOTS__pitch-' + W + '-park.png' });
  await page.setViewportSize({ width: W, height: H + 120 }); await page.waitForTimeout(1500); // a taller window (or a turned phone) while parked
  res.resized = await at(); if (Math.abs(res.resized.y - res.resized.park) > 2 ) errs.push('a resize while parked left the camera half turned: ' + JSON.stringify(res.resized));
  await page.setViewportSize({ width: W, height: H }); await page.waitForTimeout(1500);
  await page.evaluate(() => scrollTo(0, visitY())); await page.waitForTimeout(2500);
  res.top = await at();
  await page.screenshot({ path: '__SHOTS__pitch-' + W + '-visitors.png' });
  await page.evaluate(() => scrollTo(0, svY(0))); await page.waitForTimeout(2000);
  // the loop both ways (Tom 11-23): on up past the visitors' wall the page lands at its end, as a finger swiping up would get there
  await page.evaluate(() => scrollTo(0, visitY())); await page.waitForTimeout(1500);
  for (let i = 0; i < 30 && (await page.evaluate(() => scrollY)) < 2 * (await page.evaluate(() => visitY())) && (await page.evaluate(() => scrollY)) > 0; i++) { await page.evaluate(() => scrollBy(0, -40)); await page.waitForTimeout(120); }
  await page.waitForTimeout(800);
  res.round = await page.evaluate(() => ({ y: Math.round(scrollY), end: Math.round(svY(+document.documentElement.dataset.svEnd + 52)) })); // the jump lands 8 vh short of the page's end
  if (Math.abs(res.round.y - res.round.end) > 4) errs.push('scrolling up past the visitors\' wall did not land near the end: ' + JSON.stringify(res.round));
  await page.screenshot({ path: '__SHOTS__pitch-' + W + '-round.png' });
  // at the seam (both sides) the visitors' words are out of view: no tap area on screen and nothing to tab to
  for (const [side, y] of [['the end side', res.round.end], ['the top side', 10]]) {
    await page.evaluate(y => scrollTo(0, y), y); await page.waitForTimeout(2500);
    const h = await page.evaluate(() => { const e = document.getElementById('leaveUp'); return { shown: e.style.display === 'block', tab: e.tabIndex }; });
    if (h.shown || h.tab >= 0) errs.push('Leave your tag has a tap area at ' + side + ', where its words are out of view: ' + JSON.stringify(h)); }
  // signing the wall at the visitors' wall (Tom 11-23): Leave your tag shows, the tool opens with the scroll held and no jump, Cancel gives the
  // same place back with the scroll free
  for (const [side, y] of [['the visitors\' wall', await page.evaluate(() => Math.round(visitY()))]]) {
    await page.evaluate(y => scrollTo(0, y), y); await page.waitForTimeout(2500);
    const at0 = await page.evaluate(() => Math.round(scrollY)), shown = await page.evaluate(() => document.getElementById('leaveUp').style.display === 'block');
    if (!shown) { errs.push('Leave your tag is not on the visitors\' wall at ' + side); continue; }
    await page.click('#leaveUp'); await page.waitForTimeout(2200);
    const open = await page.evaluate(() => ({ y: Math.round(scrollY), held: document.documentElement.style.overflow === 'hidden', mode: document.getElementById('pick').dataset.mode }));
    if (!open.held || open.mode !== '1' || Math.abs(open.y - at0) > 4) errs.push('the tag tool did not open in place at ' + side + ': ' + JSON.stringify(open));
    await page.click('#pickCancel'); await page.waitForTimeout(2200);
    const back = await page.evaluate(() => ({ y: Math.round(scrollY), free: document.documentElement.style.overflow === '', leave: document.getElementById('leaveUp').style.display === 'block' }));
    res['sign ' + side] = { at0, open, back };
    if (!back.free || !back.leave || Math.abs(back.y - at0) > 4) errs.push('after Cancel at ' + side + ' the wall did not come back with the scroll free: ' + JSON.stringify(back)); }
  return JSON.stringify(res); }

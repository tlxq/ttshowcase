// The loop's left turn (PR3): after the pour the page parks a little way down, with no label (Tom 11-23: the progress line alone says where you are);
// up at the visitors' wall the camera faces it (x -17..-7); on up past it the page lands near its end, where the start's view shows again;
// pulling past the top can't reload (overscroll-behavior); a resize while parked stays parked; the progress line's marker never jumps at either seam.
async page => { const W = page.viewportSize().width, H = page.viewportSize().height, errs = [], res = { errs };
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); page.on('pageerror', e => errs.push(String(e)));
  await page.goto('__URL__?tags=full'); await page.waitForTimeout(3500);
  await page.mouse.click(W / 2, H / 2);
  for (let i = 0; i < 40 && !(await page.evaluate(() => document.documentElement.style.overflow === '')); i++) await page.waitForTimeout(250);
  await page.waitForTimeout(1500);
  const at = () => page.evaluate(() => ({ y: Math.round(scrollY), park: Math.round(svY(0)), label: document.getElementById('tagUp') ? 1 : 0, over: getComputedStyle(document.documentElement).overscrollBehaviorY })); // label: what the page sets
  res.park = await at();
  if (res.park.park < 50 || Math.abs(res.park.y - res.park.park) > 2) errs.push('the page did not park below the top after the pour: ' + JSON.stringify(res.park));
  if (res.park.label) errs.push('the "Scroll up" label is back: the progress line alone says where you are');
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
  // the marker: where it is on screen just before and just after each jump (the same place, give or take a few px)
  const mark = () => page.evaluate(() => [...document.querySelectorAll('.prog b')].map(b => { const r = b.getBoundingClientRect(); return r.width > 0 ? Math.round(r.left + r.width / 2) : null; }));
  const seam = async (before, after, name) => { await page.evaluate(y => scrollTo(0, y), before); await page.waitForTimeout(300); const a = await mark(); await page.evaluate(y => scrollTo(0, y), after); await page.waitForTimeout(300); const b = await mark();
    res[name] = [a, b]; const near = (p, q) => p.some((v, i) => v !== null && q[i] !== null && Math.abs(v - q[i]) <= 8); if (!near(a, b)) errs.push('the progress marker jumps at ' + name + ': ' + JSON.stringify([a, b])); };
  const [pre, past] = await page.evaluate(() => [Math.round(svY(+document.documentElement.dataset.svEnd + 54)), Math.round(svY(+document.documentElement.dataset.svEnd + 60))]);
  await seam(10, 2, 'the top'); await seam(pre, past, 'the end');
  await page.screenshot({ path: '__SHOTS__pitch-' + W + '-round.png' });
  return JSON.stringify(res); }

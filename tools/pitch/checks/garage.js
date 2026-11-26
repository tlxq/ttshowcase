// The garage workshop (Tom 11-26): after raddavarfruberga a garage door in the street wall rolls up and the visitor walks into a workshop where the four Toolbox walls hang.
// Fails when the door is not shut before the workshop (street), does not roll up, the camera does not walk in through it, a piece of the production (ttoolbox, dot, tthermal) is not
// painted in front of its stop, "Toolbox" is not stencilled on the wall, the camera is not inside at each stop, or the way out at the far end leaves it inside. Page errors and three.js warnings fail it too.
async page => { const W = page.viewportSize().width, errs = [], res = { errs, stops: {} };
  page.on('console', m => { if (m.type() === 'error' || (m.type() === 'warning' && m.text().startsWith('THREE.'))) errs.push(m.text()); }); page.on('pageerror', e => errs.push(String(e)));
  await page.goto('__URL__'); await page.waitForTimeout(3500);
  await page.waitForFunction(() => { const b = window.bucketAt && window.bucketAt(); return b && (b.x > 0 ? b : matchMedia("(prefers-reduced-motion: reduce)").matches && getComputedStyle(document.querySelector(".start")).display === "none" && b); /* reduced motion: no start screen, nothing to tip */ }, null, { timeout: 20000 }).then(h => h.jsonValue()).then(b => page.mouse.click(b.x, b.y)) /* the bucket, not the middle: only it tips (11-25) */;
  for (let i = 0; i < 40 && !(await page.evaluate(() => document.documentElement.style.overflow === '')); i++) await page.waitForTimeout(250);
  if (!(await page.evaluate(() => typeof window.garageTest === 'function'))) { errs.push('there is no garage workshop in the walk (window.garageTest is missing)'); return JSON.stringify(res); }
  const at = async sv => { await page.evaluate(sv => scrollTo(0, svY(sv)), sv); await page.waitForTimeout(sv >= 700 ? 3200 : 2200); const g = await page.evaluate(() => garageTest()); res.stops[sv] = g;
    await page.screenshot({ path: '__SHOTS__pitch-garage-' + W + '-' + sv + '.png' }); return g; };
  let g = await at(540); if (g.open > .05 || g.inside > .05) errs.push('before the workshop the garage door should be shut and the camera in the street: ' + JSON.stringify(g));
  g = await at(590); if (g.open <= .05 || g.open >= .95) errs.push('the door should be rolling up at 590: ' + JSON.stringify(g));
  g = await at(625); if (g.open < .95) errs.push('the garage door did not roll up: ' + JSON.stringify(g));
  g = await at(660); if (g.inside < .5 || g.cam[2] >= 0) errs.push('the camera did not walk in through the door by 660: ' + JSON.stringify(g));
  for (const [sv, i] of [[700, 0], [770, 1], [840, 2]]) { g = await at(sv); const p = g.paintings[i];
    if (!p.shown) errs.push(p.name + ' is not painted at its stop: ' + JSON.stringify(g)); if (g.inside < .95) errs.push('at ' + p.name + ' the camera is not inside the workshop: ' + JSON.stringify(g));
    if (Math.abs(g.cam[0] - p.x) > 1) errs.push('at ' + p.name + ' the camera is not in front of it: ' + JSON.stringify(g));
  }
  g = await at(905); if (g.cam[0] < 62 || g.cam[2] < -1.6) errs.push('the back door out is not reached by 905: ' + JSON.stringify(g));
  g = await at(1045); if (g.inside > .05 || g.cam[2] <= 0) errs.push('the way out at the far end did not lead back to the street at EDGE: ' + JSON.stringify(g));
  return JSON.stringify(res); }

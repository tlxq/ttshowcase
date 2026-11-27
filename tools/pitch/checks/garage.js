// The garage workshop (Tom 11-26): after raddavarfruberga a garage door in the street wall rolls up and the visitor walks into a workshop where the four Toolbox walls hang.
// Fails when the door is not shut before the workshop (street), does not roll up, the camera does not walk in through it, a piece of the production (ttoolbox, dot, tthermal) is not
// painted in front of its stop, "Toolbox" is not stencilled on the wall, the camera is not inside at each stop, or the way out at the far end leaves it inside. Page errors and three.js warnings fail it too.
// The live numbers (Tom 11-26): the site's /api/github answers with fixed counts here; each piece's two numbers must be painted (painted digits, with paint on them) at its stop,
// and ttoolbox's must still be on the wall between ttoolbox and dot (they stay while the piece is in view, not only at its stop).
// In through the door (Tom 11-26, cause D: "the camera dips to the floor going in"): from raddavarfruberga's stop (540) to ttoolbox's (700) the camera moves as ONE glide.
// Read every 4 sv: it speeds up once and slows down once, with no stop on the way (it used to stop just outside the door and just inside), its height over the floor stays between the two stops'
// heights and its look up or down between the two stops' (a little slack for the hand's drift): no dip to the floor, no bob.
// Out through the back door (cause: the camera looked at the pavement, swung round and looked out over the street): the same read from tthermal's stop (840) to EDGE's (965), the same three rules,
// and the camera is never within 0.6 m of a door jamb, never turns its head more than 2 degrees an sv, and never faces more than 100 degrees from the back wall (the street side has no sky or city: the dark background showed there).
// The production comes up as a whole as the camera clears the door (sv 660: all three pieces painted, not each only just before its own stop).
// No Toolbox painting may carry the street concrete's bump map (Tom 11-26: its joint drew a dark line across them at waist height; the block wall has none).
async page => { const W = page.viewportSize().width, errs = [], res = { errs, stops: {} };
  page.on('console', m => { if (m.type() === 'error' || (m.type() === 'warning' && m.text().startsWith('THREE.'))) errs.push(m.text()); }); page.on('pageerror', e => errs.push(String(e)));
  const NUMS = { ttoolbox: [9, 10], dot: [5, 92], tthermal: [8, 7] };
  await page.route('**/api/github', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ttoolbox: { commits: 9, skills: 10 }, dot: { commits: 5, tests: 92 }, tthermal: { commits: 8, merged: 7 } }) }));
  const nums = async (key, want) => { let n = null; for (let i = 0; i < 20; i++) { n = await page.evaluate(k => window.numsTest ? numsTest()[k] : null, key); if (n && n.every((p, j) => p.shown === want[j] && p.ink > 200 && p.op > .9)) return null; await page.waitForTimeout(250); }
    return key + "'s numbers are not painted on (want " + want.join(', ') + '): ' + JSON.stringify(n); };
  await page.goto('__URL__'); await page.waitForTimeout(3500);
  await page.waitForFunction(() => { const b = window.bucketAt && window.bucketAt(); return b && (b.x > 0 ? b : matchMedia("(prefers-reduced-motion: reduce)").matches && getComputedStyle(document.querySelector(".start")).display === "none" && b); /* reduced motion: no start screen, nothing to tip */ }, null, { timeout: 20000 }).then(h => h.jsonValue()).then(b => page.mouse.click(b.x, b.y)) /* the bucket, not the middle: only it tips (11-25) */;
  for (let i = 0; i < 40 && !(await page.evaluate(() => document.documentElement.style.overflow === '')); i++) await page.waitForTimeout(250);
  if (!(await page.evaluate(() => typeof window.garageTest === 'function'))) { errs.push('there is no garage workshop in the walk (window.garageTest is missing)'); return JSON.stringify(res); }
  const at = async (sv, till) => { await page.evaluate(sv => scrollTo(0, svY(sv)), sv); if (till) await page.waitForFunction(till, null, { timeout: 8000 }).catch(() => {}); /* waits on the state it names, not a fixed time (a slow runner needs longer than the 1.15 s fade): a miss shows in the checks below */ else await page.waitForTimeout(sv >= 700 ? 3200 : 2200); const g = await page.evaluate(() => garageTest()); res.stops[sv] = g;
    await page.screenshot({ path: '__SHOTS__pitch-garage-' + W + '-' + sv + '.png' }); return g; };
  const oneMove = async (name, sv0, sv1) => { const way = []; for (let sv = sv0; sv <= sv1; sv += 4) { await page.evaluate(sv => scrollTo(0, svY(sv)), sv); await page.waitForTimeout(120); way.push([sv, await page.evaluate(() => { const g = garageTest(); return [g.cam, g.eye, g.pitch, g.face]; })]); }
    res['way ' + name] = way.map(([sv, [c, e, p]]) => sv + ':' + e + '/' + p); const [e0, p0] = way[0][1].slice(1), [e1, p1] = way[way.length - 1][1].slice(1);
    for (let i = 1; i < way.length; i++) { const [sv, [, e, p]] = way[i];
      if (e < Math.min(e0, e1) - .08 || e > Math.max(e0, e1) + .08) errs.push(name + ', the camera drops or rises out of line at sv ' + sv + ': ' + e + ' m over the floor (the stops: ' + e0 + ', ' + e1 + ')');
      if (p < Math.min(p0, p1) - 1.5 || p > Math.max(p0, p1) + 1.5) errs.push(name + ', the camera tips at sv ' + sv + ': looks ' + p + ' degrees (the stops: ' + p0 + ', ' + p1 + ')');
    }
    const all = way.slice(1).map(([, [c]], i) => Math.hypot(c[0] - way[i][1][0][0], c[2] - way[i][1][0][2])), top = Math.max(...all), on = all.map(d => d > .05 * top), from = on.indexOf(true), to = on.lastIndexOf(true);
    { const mean = all.reduce((a, d) => a + d, 0) / all.length, i = all.findIndex(d => d < .2 * mean); // (Tom 11-26: "so we don't get stuck") between its two stops the camera never stands still while the visitor scrolls
      if (i >= 0) errs.push(name + ', the scroll moves the camera almost not at all at sv ' + way[i][0] + '-' + way[i + 1][0] + ': ' + all[i].toFixed(2) + ' m in 4 sv (the mean is ' + mean.toFixed(2) + '): it feels stuck'); }
    const step = all.slice(from, to + 1); // metres walked each 4 sv, from where it sets off to where it comes to rest (the stops before and after are held still): one move speeds up once and slows down once
    for (let i = 1; i < step.length - 1; i++) { const before = Math.max(...step.slice(0, i)), after = Math.max(...step.slice(i + 1));
      if (step[i] < .6 * Math.min(before, after)) { errs.push(name + ', the camera slows almost to a stop at sv ' + way[from + i + 1][0] + ' and sets off again: not one move (' + step.map(d => d.toFixed(2)).join(' ') + ')'); break; } }
    for (let i = 1; i < way.length; i++) { const d = Math.abs(way[i][1][3] - way[i - 1][1][3]); // (Tom 11-26) the head never swings fast: on a phone's narrow view more than 2 degrees an sv turns the jamb and the street wall into a flash
      if (d > 8) { errs.push(name + ', the head swings ' + d.toFixed(1) + ' degrees in 4 sv at sv ' + way[i][0] + ': a flash of jamb and wall, not a readable move'); break; } }
    for (const [sv, [[x, , z], , , face]] of way) { // a doorway's jamb: never closer than 0.6 m; and never turned out over the street (nothing is built there: just the dark background)
      for (const jx of [62.7, 67.1]) if (name === 'going out' && Math.hypot(x - jx, Math.max(0, Math.max(-.3 - z, z))) < .6) errs.push(name + ', the camera is within 0.6 m of a door jamb at sv ' + sv + ': ' + x + ', ' + z);
      if (name === 'going out' && Math.abs(face) > 100) errs.push(name + ', the camera turns out over the street at sv ' + sv + ': faces ' + face + ' degrees (0 = the back wall, 90 = along the street, 180 = out over it)'); } };
  await oneMove('going in', 540, 700);
  let g = await at(540); if (g.open > .05 || g.inside > .05) errs.push('before the workshop the garage door should be shut and the camera in the street: ' + JSON.stringify(g));
  g = await at(590); if (g.open <= .05 || g.open >= .95) errs.push('the door should be rolling up at 590: ' + JSON.stringify(g));
  g = await at(625); if (g.open < .95) errs.push('the garage door did not roll up: ' + JSON.stringify(g));
  g = await at(660, () => { const g = garageTest(); return g.inside >= .5 && g.paintings.every(p => p.shown); }); if (g.inside < .5 || g.cam[2] >= 0) errs.push('the camera did not walk in through the door by 660: ' + JSON.stringify(g));
  { const bare = g.paintings.filter(p => !p.shown).map(p => p.name); if (bare.length) errs.push('the production is not on the wall as the camera clears the door (sv 660), the stretch between two stops is bare: ' + bare.join(', ') + ' not painted yet: ' + JSON.stringify(g.paintings)); } // (Tom 11-26) all three pieces and the title tile come up together as it comes in, so no wall between two stops is bare
  for (const [sv, i] of [[700, 0], [770, 1], [840, 2]]) { g = await at(sv); const p = g.paintings[i];
    if (!p.shown) errs.push(p.name + ' is not painted at its stop: ' + JSON.stringify(g));
    if (p.bump) errs.push(p.name + " has the street concrete's bumps on the block wall (its joint draws a dark line across the painting)"); if (g.inside < .95) errs.push('at ' + p.name + ' the camera is not inside the workshop: ' + JSON.stringify(g));
    if (Math.abs(g.cam[0] - p.x) > 1) errs.push('at ' + p.name + ' the camera is not in front of it: ' + JSON.stringify(g));
    const bad = await nums(p.name, NUMS[p.name]); if (bad) errs.push(bad);
    if (sv === 700) { await at(735); const off = await nums('ttoolbox', NUMS.ttoolbox); if (off) errs.push('between ttoolbox and dot: ' + off); }
  }
  await oneMove('going out', 840, 965); // out through the back door (Tom 11-26: it looked down at the pavement and out over the street, half the screen black): the same one glide, from tthermal's stop to EDGE's
  g = await at(905); if (g.cam[0] < 62 || g.cam[2] < -1.6) errs.push('the back door out is not reached by 905: ' + JSON.stringify(g));
  { const on = ([x, y, ok]) => ok && x > -40 && x < W + 40 && y > -40 && y < page.viewportSize().height + 40, site = () => page.evaluate(() => siteTest()); // (Tom 11-26) the stop at EDGE shows no lamp head floating in a corner, the last stop (the bare wall) no stump of the fence
    await at(1045); let st = await site(); if (st.heads.some(on)) errs.push('a site lamp head is in the frame at EDGE (a lit pale box in its top corner): ' + JSON.stringify(st.heads));
    await at(1180); st = await site(); if (on(st.fenceEnd)) errs.push("the site fence's end sticks into the last stop's frame (an orange stub at the bottom left): " + JSON.stringify(st.fenceEnd)); }
  g = await at(1045); if (g.inside > .05 || g.cam[2] <= 0) errs.push('the way out at the far end did not lead back to the street at EDGE: ' + JSON.stringify(g));
  return JSON.stringify(res); }

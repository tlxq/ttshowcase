// The garage workshop (Tom 11-26): after raddavarfruberga a garage door in the street wall rolls up and the visitor walks into a workshop where the four Toolbox walls hang.
// Fails when the door is not shut before the workshop (street), does not roll up, the camera does not walk in through it, a piece of the production (ttoolbox, dot, tthermal) is not
// painted in front of its stop, "Toolbox" is not stencilled on the wall, the camera is not inside at each stop, or the way out at the far end leaves it inside. Page errors and three.js warnings fail it too.
// The live numbers (Tom 11-26): the site's /api/github answers with fixed counts here; each piece's two numbers must be painted (painted digits, with paint on them) at its stop,
// and ttoolbox's must still be on the wall between ttoolbox and dot (they stay while the piece is in view, not only at its stop).
// In through the door (Tom 11-26, cause D: "the camera dips to the floor going in"): from raddavarfruberga's stop (540) to ttoolbox's (700) the camera moves as ONE glide.
// Read every 4 sv: it speeds up once and slows down once, with no stop on the way (it used to stop just outside the door and just inside), its height over the floor stays between the two stops'
// heights and its look up or down between the two stops' (a little slack for the hand's drift): no dip to the floor, no bob.
// Out through the back door (cause: the camera looked at the pavement, swung round and looked out over the street): the same read from tthermal's stop (840) to the building site's (965), the same three rules,
// and the camera is never within 0.6 m of a door jamb and never turns its head more than 2 degrees an sv (the street across the door is built now, with its sky: the head turns on to face it, Tom 11-27).
// The production comes up as a whole as the camera clears the door (sv 660: all three pieces painted, not each only just before its own stop).
// No Toolbox painting may carry the street concrete's bump map (Tom 11-26: its joint drew a dark line across them at waist height; the block wall has none).
async page => { const W = page.viewportSize().width, errs = [], res = { errs, stops: {} };
  page.on('console', m => { if (m.type() === 'error' || (m.type() === 'warning' && m.text().startsWith('THREE.'))) errs.push(m.text()); }); page.on('pageerror', e => errs.push(String(e)));
  const LIGHT_FLOOR = { desktop: 17, phone: 13 }; // half of the dimmer lit end of the way (measured 35.2 and 79.7 on a laptop, 26.9 and 72.5 on a phone, night); the lamps and pools of the way are at 25 and 17 at their darkest
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
  const oneMove = async (name, sv0, sv1) => { const way = []; for (let sv = sv0; sv <= sv1; sv += 4) { await page.evaluate(sv => scrollTo(0, svY(sv)), sv); await page.waitForTimeout(120); way.push([sv, await page.evaluate(() => { const g = garageTest(); return [g.cam, g.eye, g.pitch, g.face, window.svNow]; })]); }
    res['way ' + name] = way.map(([sv, [c, e, p, f, r]]) => sv + ':' + e + '/' + p + '/' + f + '/' + r.toFixed(2)); const [e0, p0] = way[0][1].slice(1), [e1, p1] = way[way.length - 1][1].slice(1);
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
    for (let i = 1; i < way.length; i++) { const ds = way[i][1][4] - way[i - 1][1][4], d = Math.abs(((way[i][1][3] - way[i - 1][1][3]) % 360 + 540) % 360 - 180) * (ds > 1 ? 4 / Math.min(ds, 4.5) : 1); /* per 4 sv as the camera READ them (svNow): the page snaps the scroll to whole pixels (about 6 px an sv here), so two reads 4 sv apart are 3.9 to 4.1 sv apart and the head's 6 degrees an sv moved the reading by a degree with nothing in the walk changed (11-28: 24.1 became 25.1 when #143 shortened the page) */ /* wrapped: facing the street is 180 degrees, either side of it */ // (Tom 11-26) the head never swings fast: on a phone's narrow view more than 2 degrees an sv turns the jamb and the street wall into a flash (on the way out one turn of 180 degrees in the room faces the building site across the door, so the door frames the piece; it measures 24.1 degrees in 4 sv at most on a laptop and 19.9 on a phone, at the door; the limit is just above that, and the room is lit by the back door's lamp, so no frame in the turn is dark)
      if (d > 25) { errs.push(name + ', the head swings ' + d.toFixed(1) + ' degrees in 4 sv at sv ' + way[i][0] + ': a flash of jamb and wall, not a readable move'); break; } }
    for (const [sv, [[x, , z], , , face]] of way) { // a doorway's jamb: never closer than 0.6 m; and never turned out over the street (nothing is built there: just the dark background)
      for (const jx of [62.7, 67.1]) if (name === 'going out' && Math.hypot(x - jx, Math.max(0, Math.max(-.3 - z, z))) < .6) errs.push(name + ', the camera is within 0.6 m of a door jamb at sv ' + sv + ': ' + x + ', ' + z);
    } };
  await oneMove('going in', 540, 700);
  // The way down to epaRadar (Tom 11-27: one flight of steps and a ramp, then the street's wall): from the start wall (sv 8, past its own slow start) to epaRadar's stop (60) the camera never stands still while the visitor scrolls (the same rule as
  // the garage's), never goes under 1.1 m or over 4.5 m above the street it stands on, and only goes down (no dip and climb over the steps or the ramp), by at most 0.8 m in 4 sv.
  { const way = []; for (let sv = 8; sv <= 56; sv += 4) { await page.evaluate(sv => scrollTo(0, svY(sv)), sv); await page.waitForTimeout(150); way.push([sv, await page.evaluate(() => { const g = garageTest(); return [g.cam, g.ground]; })]); }
    res.arrival = way.map(([sv, [c, gr]]) => sv + ':' + (c[1] - gr).toFixed(2));
    for (let i = 0; i < way.length; i++) { const [sv, [c, gr]] = way[i], eye = c[1] - gr; if (eye < 1.1 || eye > 4.5) errs.push('on the way to epaRadar the camera is ' + eye.toFixed(2) + ' m over the street at sv ' + sv + ' (between 1.1 and 4.5)');
      if (i && c[1] - way[i - 1][1][0][1] > .03) errs.push('on the way to epaRadar the camera rises ' + (c[1] - way[i - 1][1][0][1]).toFixed(2) + ' m between sv ' + way[i - 1][0] + ' and ' + sv + ': the way only goes down, so a rise is a dip and a climb');
      if (i && Math.abs(c[1] - way[i - 1][1][0][1]) > .8) errs.push('on the way to epaRadar the camera jumps ' + Math.abs(c[1] - way[i - 1][1][0][1]).toFixed(2) + ' m in height between sv ' + way[i - 1][0] + ' and ' + sv); }
    // at night no frame of the way is a black one (Tom 11-27: the dark stretch at sv 25 to 40): the mean brightness (0 to 255, the mean of the three colours over a 64 x 40 picture of the screenshot) of each stop of the way stays above
    // LIGHT_FLOOR, which is half of the dimmest of the two lit ends (the start wall at sv 8, epaRadar's wall at sv 56)
    { const lum = []; for (let sv = 8; sv <= 56; sv += 4) { await page.evaluate(sv => scrollTo(0, svY(sv)), sv); await page.waitForTimeout(500);
        const b64 = (await page.screenshot({ type: 'jpeg', quality: 40 })).toString('base64'); lum.push([sv, await page.evaluate(async b64 => { const im = new Image(); im.src = 'data:image/jpeg;base64,' + b64; await im.decode(); const c = document.createElement('canvas'); c.width = 64; c.height = 40; const g = c.getContext('2d'); g.drawImage(im, 0, 0, 64, 40); const d = g.getImageData(0, 0, 64, 40).data; let t = 0; for (let i = 0; i < d.length; i += 4) t += d[i] + d[i + 1] + d[i + 2]; return +(t / (d.length / 4) / 3).toFixed(1); }, b64)]); }
      res.light = lum.map(([sv, v]) => sv + ':' + v); const floor = LIGHT_FLOOR[page.viewportSize().width < 600 ? 'phone' : 'desktop'];
      for (const [sv, v] of lum) if (v < floor) errs.push('on the way to epaRadar the screen is nearly black at sv ' + sv + ': mean brightness ' + v + ' of 255, under ' + floor); }
    const all = way.slice(1).map(([, [c]], i) => Math.hypot(c[0] - way[i][1][0][0], c[2] - way[i][1][0][2])), mean = all.reduce((a, d) => a + d, 0) / all.length, k = all.findIndex(d => d < .2 * mean);
    if (k >= 0) errs.push('on the way to epaRadar the scroll moves the camera almost not at all at sv ' + way[k][0] + '-' + way[k + 1][0] + ': ' + all[k].toFixed(2) + ' m in 4 sv (the mean is ' + mean.toFixed(2) + '): it feels stuck'); }
  let g = await at(540); if (g.open > .05 || g.inside > .05) errs.push('before the workshop the garage door should be shut and the camera in the street: ' + JSON.stringify(g));
  g = await at(590); if (g.open <= .05 || g.open >= .95) errs.push('the door should be rolling up at 590: ' + JSON.stringify(g));
  g = await at(625); if (g.open < .95) errs.push('the garage door did not roll up: ' + JSON.stringify(g));
  g = await at(660, () => { const g = garageTest(); return g.inside >= .5 && g.paintings.every(p => p.shown); }); if (g.inside < .5 || g.cam[2] >= 0) errs.push('the camera did not walk in through the door by 660: ' + JSON.stringify(g));
  { const bare = g.paintings.filter(p => !p.shown).map(p => p.name); if (bare.length) errs.push('the production is not on the wall as the camera clears the door (sv 660), the stretch between two stops is bare: ' + bare.join(', ') + ' not painted yet: ' + JSON.stringify(g.paintings)); } // (Tom 11-26) all three pieces and the title tile come up together as it comes in, so no wall between two stops is bare
  { let r = null; for (let i = 0; i < 20 && !(r = await page.evaluate(() => window.roundTest ? roundTest() : null)); i++) await page.waitForTimeout(250); // (Tom 11-27) the stack of tyres' shadows are round: the same darkness on a ring along the axes and along the diagonals
    if (!r) errs.push('the tyres have no shadow to measure (window.roundTest is missing)'); else { res.tyreShadow = r; for (const [k, a] of Object.entries(r)) if (Math.max(...a) < 20 || Math.max(...a) - Math.min(...a) > 40) errs.push("the tyres' " + k + ' shadow is not round: its darkness round the ring is ' + a.join(', ') + ' (along the two axes, then the two diagonals)'); } }
  for (const [sv, i] of [[700, 0], [770, 1], [840, 2]]) { g = await at(sv); const p = g.paintings[i];
    if (!p.shown) errs.push(p.name + ' is not painted at its stop: ' + JSON.stringify(g));
    if (p.bump) errs.push(p.name + " has the street concrete's bumps on the block wall (its joint draws a dark line across the painting)"); if (g.inside < .95) errs.push('at ' + p.name + ' the camera is not inside the workshop: ' + JSON.stringify(g));
    if (Math.abs(g.cam[0] - p.x) > 1) errs.push('at ' + p.name + ' the camera is not in front of it: ' + JSON.stringify(g));
    const bad = await nums(p.name, NUMS[p.name]); if (bad) errs.push(bad);
    if (sv === 700) { await at(735); const off = await nums('ttoolbox', NUMS.ttoolbox); if (off) errs.push('between ttoolbox and dot: ' + off); }
  }
  if (W < 600) { // (Tom 11-27) phone: the stops are closer (the back wall is at z -9.5: a stop 8.2 m from it was z -1.3, now no more than 8 m) and the scroll pans across, one move from ttoolbox's stop to tthermal's, never standing still
    for (const sv of [700, 770, 840]) if (res.stops[sv].cam[2] > -1.5) errs.push('on a phone the camera at sv ' + sv + ' is ' + (res.stops[sv].cam[2] + 9.5).toFixed(1) + ' m from the back wall, over 8 m: the stop is not close enough');
    await oneMove('panning', 700, 840); }
  await oneMove('going out', 840, 965); // out through the back door (Tom 11-26: it looked down at the pavement and out over the street, half the screen black): the same one glide, from tthermal's stop to EDGE's
  g = await at(940); if (g.cam[0] < 62 || g.cam[2] < -1.6) errs.push('the back door out is not reached by 940: ' + JSON.stringify(g));
  g = await at(1045); if (g.inside > .05 || g.cam[2] <= 0) errs.push('the way out at the far end did not lead back to the street at EDGE: ' + JSON.stringify(g));
  return JSON.stringify(res); }

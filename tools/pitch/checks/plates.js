// No plate over a picture (Tom 11-18): at every stop of the walk, no label plate (.tag), the form (.mail), the Write to me sticker in the corner (#corner) or a name on the progress stripe (.stripe span) that shows covers a picture or the
// mural's words. The pictures are the page's own list (window.plateTest, from PROT in pitch/paint.src.html): the street's two pieces with their notes, the mural,
// the seven paintings; on the start wall the piece and the tlxq signature, which its own plate (Product engineer) keeps off. The painted part only, never the bare concrete round it. A plate may touch a picture's edge by up to 6 px. Run at 1440 x 900 and on a phone.
async page => { const W = page.viewportSize().width, H = page.viewportSize().height, errs = [], res = { errs, stops: 0, plates: 0, pictures: 0 };
  page.on('pageerror', e => errs.push(String(e)));
  const look = (where, stripe) => page.evaluate(([where, stripe]) => {
    const shows = e => { for (let n = e; n && n !== document.documentElement; n = n.parentElement) { const s = getComputedStyle(n); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity < .5) return false; }
      const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth; };
    const pics = window.plateTest.pictures(), plates = [...document.querySelectorAll('.tag, .mail, #corner' + (stripe ? ', .stripe span' : ''))].filter(shows), bad = [];
    for (const e of plates) { const r = e.getBoundingClientRect(), name = (e.id ? '#' + e.id : '.' + String(e.className).split(' ').join('.')) + ' "' + e.textContent.trim().slice(0, 24) + '"';
      for (const p of pics) { if (p.only && !e.matches(p.only)) continue; const w = Math.min(r.right, p.r) - Math.max(r.left, p.l), h = Math.min(r.bottom, p.b) - Math.max(r.top, p.t);
        if (w > 6 && h > 6) bad.push(name + ' covers ' + p.name + ' by ' + Math.round(w) + ' x ' + Math.round(h) + ' px (' + where + ')'); } }
    return { plates: plates.length, pictures: pics.length, bad }; }, [where, stripe]);
  await page.goto('__URL__'); await page.waitForTimeout(3500); await page.waitForFunction(() => { const b = window.bucketAt && window.bucketAt(); return b && (b.x > 0 ? b : matchMedia("(prefers-reduced-motion: reduce)").matches && getComputedStyle(document.querySelector(".start")).display === "none" && b); /* reduced motion: no start screen, nothing to tip */ }, null, { timeout: 20000 }).then(h => h.jsonValue()).then(b => page.mouse.click(b.x, b.y)) /* the bucket, not the middle: only it tips (11-25) */;
  for (let i = 0; i < 40 && !(await page.evaluate(() => document.documentElement.style.overflow === '')); i++) await page.waitForTimeout(250);
  { let on = false; for (let i = 0; i < 120 && !(on = await page.evaluate(() => +document.getElementById('tagRole').style.opacity === 1)); i++) await page.waitForTimeout(250); // the start wall: its plate shows with the whole name, while the pour's last runs still fall
    await page.waitForTimeout(900); const r = await look('the start wall', false); res.plates += r.plates; res.pictures += r.pictures; res.stops++; res.startPlate = on && await page.evaluate(() => { const b = document.getElementById('tagRole').getBoundingClientRect(); return [b.left, b.top, b.right, b.bottom].map(Math.round); });
    if (!on) errs.push('the start wall\'s plate never showed'); errs.push(...r.bad);
    // never blue over words: no run of the pour comes down behind the plate, and none crosses the tlxq's box (Tom 11-28). Every run's own x, from the page, against the plate's place on the wall and the tlxq's: the runs are
    // laid out before the pour starts, so this holds while it is still going too
    const runs = on ? await page.evaluate(() => window.plateTest.runsBehind(document.getElementById('tagRole').getBoundingClientRect())) : []; res.runsBehindPlate = runs; if (runs.length) errs.push('a blue run comes down behind the start wall\'s plate at x ' + runs.join(', ') + ' m');
    const over = await page.evaluate(() => window.plateTest.runsOverSign()); res.runsOverTlxq = over; if (over.length) errs.push('a blue run crosses the tlxq at x ' + over.join(', ') + ' m'); }
  const bad = new Set(), REST = [128, 432, 700, 770, 840, 910, 1045, 1180]; // where the camera rests: the stripe's names are held to the pictures there (on the way between, the wall slides under them)
  for (const sv of [100, 128, 200, 300, 432, 500, 540, 600, 700, 770, 840, 910, 1045, 1180]) {
    await page.evaluate(y => scrollTo(0, y), await page.evaluate(sv => Math.round(svY(sv)), sv)); await page.waitForTimeout(sv === 128 || sv === 432 ? 9000 : 4000);
    for (let k = 0; k < 3; k++) { const r = await look('stop ' + sv, REST.includes(sv)); res.plates += r.plates; res.pictures += r.pictures; r.bad.forEach(b => bad.add(b)); await page.waitForTimeout(700); }
    res.stops++; }
  errs.push(...bad);
  return JSON.stringify(res); }

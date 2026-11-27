// Every wall framed (Tom 11-23: "the camera focus is strange"): at each wall's stop its painting is whole on the screen, at the window shapes people use,
// not only the one the stop was set for. Laptop run: 1440 x 900, Tom's 862 x 960 and 1000 x 1100; phone run: its own size and a taller phone, 360 x 800.
// The pictures are the page's own list (window.plateTest, from PROT in pitch/paint.src.html); at a stop the one nearest the screen's middle is that wall's.
// It may run past an edge by up to 4 px. On a phone the street's wall is a pan, not two stops: there its pieces are whole in height only (the pan itself is the epanums check's: every note comes up on the way).
async page => { const W0 = page.viewportSize().width, H0 = page.viewportSize().height, errs = [], res = { errs, sizes: [] };
  page.on('pageerror', e => errs.push(String(e)));
  const sizes = W0 > 600 ? [[1440, 900], [862, 960], [1000, 1100]] : [[W0, H0], [360, 800]];
  await page.goto('__URL__'); await page.waitForTimeout(3500); await page.waitForFunction(() => { const b = window.bucketAt && window.bucketAt(); return b && (b.x > 0 ? b : matchMedia("(prefers-reduced-motion: reduce)").matches && getComputedStyle(document.querySelector(".start")).display === "none" && b); /* reduced motion: no start screen, nothing to tip */ }, null, { timeout: 20000 }).then(h => h.jsonValue()).then(b => page.mouse.click(b.x, b.y)) /* the bucket, not the middle: only it tips (11-25) */;
  for (let i = 0; i < 40 && !(await page.evaluate(() => document.documentElement.style.overflow === '')); i++) await page.waitForTimeout(250);
  for (const [w, h] of sizes) { await page.setViewportSize({ width: w, height: h }); await page.waitForTimeout(800); const seen = [];
    for (const sv of [128, 432, 700, 770, 840, 965, 1045]) {
      await page.evaluate(y => scrollTo(0, y), await page.evaluate(sv => Math.round(svY(sv)), sv)); await page.waitForTimeout(sv === 128 || sv === 432 ? 9000 : 4000);
      const r = await page.evaluate(sv => { const W = innerWidth, H = innerHeight, d = p => Math.hypot((p.l + p.r) / 2 - W / 2, (p.t + p.b) / 2 - H / 2);
        const p = window.plateTest.pictures().filter(p => !p.only && !/^the mural/.test(p.name)).sort((a, b) => d(a) - d(b))[0];
        const pan = W < 600 && (sv === 128 || sv === 432) ; /* a phone pans along the street's wall (Tom 11-27): 5 m of it across the screen, so the piece is whole in height, not in width */ return p && { name: p.name, out: Math.round(Math.max(-p.t, p.b - H, pan ? -1e9 : Math.max(-p.l, p.r - W))) }; }, sv);
      if (!r) errs.push('no painting in view at stop ' + sv + ' (' + w + ' x ' + h + ')');
      else { seen.push(r.name.split(' ')[0] + ' ' + r.out); if (r.out > 4) errs.push(r.name + ' runs ' + r.out + ' px past the screen at stop ' + sv + ' (' + w + ' x ' + h + ')'); } }
    res.sizes.push(w + 'x' + h + ': ' + seen.join(', ')); }
  // A phone pans along the street's wall (Tom 11-27): every box on it (each piece, its name, car and house, each number note) is whole across the screen at some sv from 60 (where the pan starts) to 486,
  // or, when it is wider than the screen (the two names and the two pieces), both its ends come into the screen along the pan.
  if (W0 < 600) { await page.setViewportSize({ width: W0, height: H0 }); await page.waitForTimeout(800); const best = {};
    for (let sv = 60; sv <= 486; sv += 22) { await page.evaluate(y => scrollTo(0, y), await page.evaluate(sv => Math.round(svY(sv)), sv)); await page.waitForTimeout(500);
      for (const p of await page.evaluate(() => window.plateTest.pictures().filter(p => /^(epaRadar|raddavarfruberga)'s /.test(p.name)).map(p => ({ name: p.name, l: p.l, r: p.r, w: innerWidth })))) { const b = best[p.name] ||= { fit: false, left: false, right: false };
        if (p.l >= -4 && p.r <= p.w + 4) b.fit = true; if (p.l >= -4 && p.l <= p.w) b.left = true; if (p.r >= 0 && p.r <= p.w + 4) b.right = true; } }
    res.pan = Object.fromEntries(Object.entries(best).map(([k, b]) => [k, b.fit ? 'whole' : b.left && b.right ? 'both ends' : 'no']));
    if (Object.keys(best).length < 12) errs.push('the street has ' + Object.keys(best).length + ' boxes on the pan, not 12 (4 parts, 2 pieces, 6 notes)');
    for (const [k, b] of Object.entries(best)) if (!b.fit && !(b.left && b.right)) errs.push(k + ' is never whole across the screen, nor both its ends, on the phone\'s pan (sv 128 to 486)'); }
  return JSON.stringify(res); }

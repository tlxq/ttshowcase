// Every wall framed (Tom 11-23: "the camera focus is strange"): at each wall's stop its painting is whole on the screen, at the window shapes people use,
// not only the one the stop was set for. Laptop run: 1440 x 900, Tom's 862 x 960 and 1000 x 1100; phone run: its own size and a taller phone, 360 x 800.
// The pictures are the page's own list (window.plateTest, from PROT in pitch/paint.src.html); at a stop the one nearest the screen's middle is that wall's.
// It may run past an edge by up to 4 px.
async page => { const W0 = page.viewportSize().width, H0 = page.viewportSize().height, errs = [], res = { errs, sizes: [] };
  page.on('pageerror', e => errs.push(String(e)));
  const sizes = W0 > 600 ? [[1440, 900], [862, 960], [1000, 1100]] : [[W0, H0], [360, 800]];
  await page.goto('__URL__'); await page.waitForTimeout(3500); await page.evaluate(() => window.bucketAt()).then(b => page.mouse.click(b.x, b.y)) /* the bucket, not the middle: only it tips (11-25) */;
  for (let i = 0; i < 40 && !(await page.evaluate(() => document.documentElement.style.overflow === '')); i++) await page.waitForTimeout(250);
  for (const [w, h] of sizes) { await page.setViewportSize({ width: w, height: h }); await page.waitForTimeout(800); const seen = [];
    for (const sv of [128, 432, 700, 770, 840, 910, 1045]) {
      await page.evaluate(y => scrollTo(0, y), await page.evaluate(sv => Math.round(svY(sv)), sv)); await page.waitForTimeout(sv === 128 || sv === 432 ? 9000 : 4000);
      const r = await page.evaluate(() => { const W = innerWidth, H = innerHeight, d = p => Math.hypot((p.l + p.r) / 2 - W / 2, (p.t + p.b) / 2 - H / 2);
        const p = window.plateTest.pictures().filter(p => !p.only && !/^the mural/.test(p.name)).sort((a, b) => d(a) - d(b))[0];
        return p && { name: p.name, out: Math.round(Math.max(-p.l, -p.t, p.r - W, p.b - H)) }; });
      if (!r) errs.push('no painting in view at stop ' + sv + ' (' + w + ' x ' + h + ')');
      else { seen.push(r.name.split(' ')[0] + ' ' + r.out); if (r.out > 4) errs.push(r.name + ' runs ' + r.out + ' px past the screen at stop ' + sv + ' (' + w + ' x ' + h + ')'); } }
    res.sizes.push(w + 'x' + h + ': ' + seen.join(', ')); }
  return JSON.stringify(res); }

// WCAG 1.4.3 text contrast at every stop: each piece of HTML text that shows, against the plate behind it.
// 4.5:1, or 3:1 for large text (24 px, or 18.66 px bold). Text with no plate (straight on the 3D picture) fails:
// its contrast changes with the scene, so it can't be promised. Words painted into the 3D scene are not HTML and
// are judged by eye. Lists the smallest text size too. The start's hand line (cream, sprayed under the piece) is measured on the picture, ink against wall, by day and by night.
async page => { const W = page.viewportSize().width, H = page.viewportSize().height, errs = [], res = { errs, checked: 0, smallest: null };
  page.on('pageerror', e => errs.push(String(e)));
  const look = where => page.evaluate(where => {
    const rgb = s => { const m = s.match(/[\d.]+/g); return m ? m.map(Number).concat(m.length < 4 ? [1] : []).slice(0, 4) : [0, 0, 0, 0]; };
    const lum = c => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(c[0]) + .7152 * f(c[1]) + .0722 * f(c[2]); };
    const over = (top, under) => { const a = top[3]; return [0, 1, 2].map(i => top[i] * a + under[i] * (1 - a)).concat([1]); };
    const shows = e => { for (let n = e; n && n !== document.documentElement; n = n.parentElement) { const s = getComputedStyle(n); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity < .5) return false; }
      const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth; };
    const out = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const seen = new Set();
    for (let t; (t = walker.nextNode());) { const e = t.parentElement; if (!t.textContent.trim() || seen.has(e) || !shows(e) || e.closest('svg,script,style,noscript')) continue; seen.add(e);
      const s = getComputedStyle(e); let fg = rgb(s.color), bg = null; const layers = [];
      const form = e.closest('#mail'); let paper = false;
      for (let n = e; n; n = n.parentElement) { const c = rgb(getComputedStyle(n).backgroundColor); if (c[3] > 0) { layers.push(c); if (c[3] >= .99) { bg = c; break; } }
        if (n === form) { const probe = document.createElement('i'); probe.style.color = getComputedStyle(form).getPropertyValue('--panel'); form.append(probe); bg = rgb(getComputedStyle(probe).color); probe.remove(); paper = true; break; } } // the end form is printed on the flyer: the paper (--panel, any CSS colour, read back as rgb) is what is behind it, not the page
      const name = (e.id ? '#' + e.id : e.className ? '.' + String(e.className).split(' ').join('.') : e.tagName.toLowerCase()) + ' "' + t.textContent.trim().slice(0, 30) + '"';
      const size = parseFloat(s.fontSize), bold = +s.fontWeight >= 700;
      let from = layers.length - 2;
      if (paper) from = layers.length - 1;
      if (!bg) { out.push({ name, size, ratio: null, where }); continue; }
      for (let i = from; i >= 0; i--) bg = over(layers[i], bg);
      fg = over(fg, bg); const a = lum(fg), b = lum(bg), ratio = (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
      out.push({ name, size, ratio: +ratio.toFixed(2), large: size >= 24 || (bold && size >= 18.66), where }); }
    return out; }, where);
  const all = [];
  for (const [hour, at] of [['23', ', night'], ['12', ', noon']]) { // the clock light: the start wall and the end at night and by day
    await page.goto('__URL__'.replace('hour=23', 'hour=' + hour)); await page.waitForTimeout(3500); all.push(...await look('loading' + at));
    await page.waitForFunction(() => { const b = window.bucketAt && window.bucketAt(); return b && (b.x > 0 ? b : matchMedia("(prefers-reduced-motion: reduce)").matches && getComputedStyle(document.querySelector(".start")).display === "none" && b); /* reduced motion: no start screen, nothing to tip */ }, null, { timeout: 20000 }).then(h => h.jsonValue()).then(b => page.mouse.click(b.x, b.y)) /* the bucket, not the middle: only it tips (11-25) */;
    for (let i = 0; i < 40 && !(await page.evaluate(() => document.documentElement.style.overflow === '')); i++) await page.waitForTimeout(250);
    all.push(...await look('opening' + at));
    // the start's painted line (Tom 11-26): it is paint on the wall, not HTML, so it is measured on the picture: the paint's pixels (blue ones) against the wall's (the rest), in a clip of the walk's first
    // view. By day the paint must be the darker one and 1.5:1 or more (on master it is the lighter one: pale blue on the beige, 1.76:1). The target is 4.5:1, which the dark blue token alone cannot reach on a wall the day renders mid-grey; the night's is reported, not judged (night is unchanged: lit by the lamp, the pale blue is what Tom picked).
    await page.waitForTimeout(2500); { const png = (await page.screenshot({ clip: { x: Math.round(W * .06), y: Math.round(H * .14), width: Math.round(W * .88), height: Math.round(H * .66) } })).toString('base64');
      const shot = await page.context().newPage(); await shot.setContent('<canvas id=c></canvas>');
      const r = await shot.evaluate(async b64 => { const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode(); const c = document.getElementById('c'); c.width = img.width; c.height = img.height; const g = c.getContext('2d'); g.drawImage(img, 0, 0);
        const d = g.getImageData(0, 0, c.width, c.height).data, f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }, L = (r, g, b) => .2126 * f(r) + .7152 * f(g) + .0722 * f(b), paint = [], wall = [];
        for (let i = 0; i < d.length; i += 16) { const [r, g, b] = [d[i], d[i + 1], d[i + 2]]; if (b - r > 45 && b > g) paint.push(L(r, g, b)); else if (b - r <= 25) wall.push(L(r, g, b)); }
        const med = a => a.sort((x, y) => x - y)[a.length >> 1]; return { paint: paint.length, wall: wall.length, p: paint.length ? med(paint) : null, w: wall.length ? med(wall) : null }; }, png);
      await shot.close(); const ratio = r.p === null || r.w === null ? 0 : +((Math.max(r.p, r.w) + .05) / (Math.min(r.p, r.w) + .05)).toFixed(2); (res.startLine ||= {})[hour === '12' ? 'noon' : 'night'] = { ratio, paintPixels: r.paint, wallPixels: r.wall, paintLum: r.p === null ? null : +r.p.toFixed(3), wallLum: r.w === null ? null : +r.w.toFixed(3) };
      }
    // the start's hand line (Tom 11-28): the cream line under the piece is the text a visitor reads on the start wall, so it is what is judged: its ink (the brightest tenth of its box) against the wall behind it (the box's
    // median), on the picture, at night and at noon. The gates are floors a little under what was measured when the piece was built (HAND_GATE); 4.5:1 is the target, which cream on the day's wall (lum about 0.33) cannot reach.
    // The blue number above (every blue pixel against the wall) is kept as information: with the piece it is a mix of faces, outline and runs and is no longer judged.
    { const HAND_GATE = { night: { laptop: 4.5, phone: 4.5 }, noon: { laptop: 1.7, phone: 1.65 } /* measured 11-28: night 5.7 and 5.45, noon 1.82 and 1.75 */ }, when = hour === '12' ? 'noon' : 'night', scr = W < 600 ? 'phone' : 'laptop';
      let box = null; for (let i = 0; i < 120 && !(box = await page.evaluate(() => window.handAt ? window.handAt() : null)); i++) await page.waitForTimeout(250);
      if (!box) errs.push('the hand line never finished, nothing to measure' + at); else { await page.waitForTimeout(600);
        const png = (await page.screenshot({ clip: { x: Math.max(0, Math.round(box.x)), y: Math.max(0, Math.round(box.y)), width: Math.round(Math.min(box.w, W - box.x)), height: Math.round(box.h) } })).toString('base64');
        const shot = await page.context().newPage(); await shot.setContent('<canvas id=c></canvas>');
        const h = await shot.evaluate(async b64 => { const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode(); const c = document.getElementById('c'); c.width = img.width; c.height = img.height; const g = c.getContext('2d'); g.drawImage(img, 0, 0);
          const d = g.getImageData(0, 0, c.width, c.height).data, f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }, all = [];
          for (let i = 0; i < d.length; i += 4) all.push(.2126 * f(d[i]) + .7152 * f(d[i + 1]) + .0722 * f(d[i + 2]));
          all.sort((x, y) => x - y); const wall = all[all.length >> 1], ink = all[Math.floor(all.length * .95)]; return { wall, ink, inkShare: all.filter(v => (v + .05) / (wall + .05) >= 1.5).length / all.length }; }, png);
        await shot.close(); const hr = +((h.ink + .05) / (h.wall + .05)).toFixed(2), gate = HAND_GATE[when][scr];
        (res.handLine ||= {})[when] = { ratio: hr, gate, inkLum: +h.ink.toFixed(3), wallLum: +h.wall.toFixed(3), inkShare: +h.inkShare.toFixed(3) };
        if (h.inkShare < .03) errs.push('the hand line is not on the wall to measure (' + (h.inkShare * 100).toFixed(1) + ' % of its box is ink' + at + ')');
        else if (hr < gate) errs.push('the hand line on the wall is ' + hr + ':1' + at + ' on a ' + scr + ', under its floor of ' + gate + ':1'); } }
    const H2 = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight), END = await page.evaluate(() => +document.documentElement.dataset.svEnd);
    for (const sv of [128, 432, 540, 700, 770, 840, 910, 1045, 1180]) { await page.evaluate(y => scrollTo(0, y), await page.evaluate(sv => Math.round(svY(sv)), sv)); await page.waitForTimeout(sv === 128 || sv === 432 ? 9000 : 4000); if (sv === 1180) {
        await page.click('#corner'); await page.waitForTimeout(1300); all.push(...await look('the flyer (Write to me)' + at)); await page.keyboard.press('Escape'); await page.waitForTimeout(1000); }
      if (hour === '12' && sv === 540) { const l = await page.evaluate(() => window.lampTest ? lampTest().rvf : -1); res.rvfLampNoon = l; if (l !== 0) errs.push('by day the street lamp at the right is on at the garage way in (sv 540): intensity ' + l + ', it must be 0 (the wall lit up for a stretch while the camera stood still)'); }
      all.push(...await look('stop ' + sv + at)); }
  }
  const bad = new Map();
  for (const t of all) { res.checked++; res.smallest = res.smallest === null ? t.size : Math.min(res.smallest, t.size);
    const need = t.large ? 3 : 4.5;
    const why = t.ratio === null ? 'no plate, straight on the picture' : t.ratio < need ? t.ratio + ':1, needs ' + need + ':1' : null;
    if (why && !bad.has(t.name)) bad.set(t.name, t.name + ' (' + t.size + ' px, ' + t.where + '): ' + why); }
  errs.push(...bad.values());
  return JSON.stringify(res); }

// WCAG 1.4.3 text contrast at every stop: each piece of HTML text that shows, against the plate behind it.
// 4.5:1, or 3:1 for large text (24 px, or 18.66 px bold). Text with no plate (straight on the 3D picture) fails:
// its contrast changes with the scene, so it can't be promised. Words painted into the 3D scene are not HTML and
// are judged by eye. Lists the smallest text size too.
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
      for (let n = e; n; n = n.parentElement) { const c = rgb(getComputedStyle(n).backgroundColor); if (c[3] > 0) { layers.push(c); if (c[3] >= .99) { bg = c; break; } } }
      const name = (e.id ? '#' + e.id : e.className ? '.' + String(e.className).split(' ').join('.') : e.tagName.toLowerCase()) + ' "' + t.textContent.trim().slice(0, 30) + '"';
      const size = parseFloat(s.fontSize), bold = +s.fontWeight >= 700;
      if (!bg) { out.push({ name, size, ratio: null, where }); continue; }
      for (let i = layers.length - 2; i >= 0; i--) bg = over(layers[i], bg);
      fg = over(fg, bg); const a = lum(fg), b = lum(bg), ratio = (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
      out.push({ name, size, ratio: +ratio.toFixed(2), large: size >= 24 || (bold && size >= 18.66), where }); }
    return out; }, where);
  const all = [];
  await page.goto('__URL__'); await page.waitForTimeout(3500); all.push(...await look('loading'));
  await page.mouse.click(W / 2, H / 2);
  for (let i = 0; i < 40 && !(await page.evaluate(() => document.documentElement.style.overflow === '')); i++) await page.waitForTimeout(250);
  all.push(...await look('opening'));
  const H2 = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  for (const sv of [128, 432, 540, 640, 715, 790, 880, 930]) { await page.evaluate(y => scrollTo(0, y), Math.round(H2 * sv / 930)); await page.waitForTimeout(sv === 128 || sv === 432 ? 9000 : 4000); all.push(...await look('stop ' + sv)); }
  const bad = new Map();
  for (const t of all) { res.checked++; res.smallest = res.smallest === null ? t.size : Math.min(res.smallest, t.size);
    const need = t.large ? 3 : 4.5;
    const why = t.ratio === null ? 'no plate, straight on the picture' : t.ratio < need ? t.ratio + ':1, needs ' + need + ':1' : null;
    if (why && !bad.has(t.name)) bad.set(t.name, t.name + ' (' + t.size + ' px, ' + t.where + '): ' + why); }
  errs.push(...bad.values());
  return JSON.stringify(res); }

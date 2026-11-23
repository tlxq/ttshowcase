// Room to tag (Tom 11-23): every spot the tag tool offers keeps clear of the wall's own parts (the mural, the flyer,
// the visitors' words and their can) in BOTH layouts and at BOTH times of day. A tag is saved in metres and shown to
// everyone, so a spot that is free on a phone but under the laptop's wider mural, or free at night but where the
// morning's flyer hangs, is a broken spot. Also: at least 20 frame spots stay free everywhere.
// Exact maths on the page's own numbers (pickTest.space), the same each run; draws a wall map: pitch-space.png.
async page => { const errs = [], res = { errs };
  page.on('pageerror', e => errs.push(String(e)));
  const MIN_FREE = 20, STEP = .25, CALM = { flyer: .6, mural: .3, words: .3, can: .3 }, reads = [];
  for (const [w, h, layout] of [[1440, 900, 'laptop'], [412, 915, 'phone']]) {
    await page.setViewportSize({ width: w, height: h }); await page.goto('__URL__'); await page.waitForTimeout(3500); await page.mouse.click(w / 2, h / 2);
    for (let i = 0; i < 40 && !(await page.evaluate(() => document.documentElement.style.overflow === '')); i++) await page.waitForTimeout(250);
    await page.waitForFunction(() => !!window.pickTest, null, { timeout: 30000 }); // under a full parallel run the page can be slower than the waits above
    reads.push({ layout, when: 'night', ...(await page.evaluate(() => window.pickTest.space())) });
    for (const sv of [432, 700, 1045, 1180]) { await page.evaluate(sv => scrollTo(0, svY(sv)), sv); await page.waitForTimeout(2500); }
    let on = false; for (let i = 0; i < 60 && !on; i++) { on = await page.evaluate(() => document.getElementById('mail').classList.contains('on')); if (!on) await page.waitForTimeout(200); }
    if (!on) errs.push(layout + ': the morning form never showed');
    reads.push({ layout, when: 'morning', ...(await page.evaluate(() => window.pickTest.space())) });
  }
  // every part, from both layouts and both times, with its calm zone
  const parts = [];
  for (const r of reads) for (const [k, b] of Object.entries(r.things)) { const m = CALM[k]; parts.push({ what: k + ' (' + r.layout + ')', b: [b[0] - m, b[1] - m, b[2] + m, b[3] + m] }); }
  const { area: A, frame: F } = reads[0], hit = (x, y, b) => x + F.w / 2 > b[0] && x - F.w / 2 < b[2] && y + F.h / 2 > b[1] && y - F.h / 2 < b[3];
  res.bad = {}; let freeAll = 0; const dots = [];
  for (let y = A.y0 + F.h / 2; y <= A.y1 - F.h / 2 + 1e-6; y += STEP) for (let x = A.x0 + F.w / 2; x <= A.x1 - F.w / 2 + 1e-6; x += STEP) {
    let free = true;
    for (const r of reads) { if (r.clear.some(b => hit(x, y, b))) { free = false; continue; } // the tool says no here: fine
      const p = parts.find(p => hit(x, y, p.b)); if (!p) continue;
      free = false; const key = r.layout + ' ' + r.when + ' offers a spot over the ' + p.what; (res.bad[key] = res.bad[key] || { n: 0, at: [+x.toFixed(2), +y.toFixed(2)] }).n++; }
    if (free && !parts.some(p => hit(x, y, p.b))) { freeAll++; if (Math.round(x / STEP) % 4 === 0 && Math.round(y / STEP) % 4 === 0) dots.push([x, y]); } }
  for (const [k, v] of Object.entries(res.bad)) errs.push(k + ': ' + v.n + ' spots, e.g. centre ' + v.at.join(', ') + ' m');
  res.freeSpots = freeAll; // grid positions (0.25 m apart) where a frame fits clear of everything
  res.room = Math.round(freeAll * STEP * STEP / (F.w * F.h)); // about how many tags fit side by side
  if (res.room < MIN_FREE) errs.push('room for only ' + res.room + ' tags side by side, fewer than ' + MIN_FREE);
  // the wall map: grey = the wall a visitor may tag, outlines = the parts (blue laptop, orange phone), dots = free frame centres
  const k = 40, X = x => (x - A.x0 + 1) * k, Y = y => (A.y1 + 1 - y) * k, rect = (b, c, dash) => `<rect x="${X(b[0])}" y="${Y(b[3])}" width="${(b[2] - b[0]) * k}" height="${(b[3] - b[1]) * k}" fill="none" stroke="${c}" stroke-width="3" ${dash ? 'stroke-dasharray="8 6"' : ''}/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${(A.x1 - A.x0 + 2) * k}" height="${(A.y1 - A.y0 + 2) * k}" style="background:#111;font:16px sans-serif">
    <rect x="${X(A.x0)}" y="${Y(A.y1)}" width="${(A.x1 - A.x0) * k}" height="${(A.y1 - A.y0) * k}" fill="#333"/>
    ${dots.map(([x, y]) => `<circle cx="${X(x)}" cy="${Y(y)}" r="4" fill="#7c7"/>`).join('')}
    ${reads.filter(r => r.when === 'morning').map(r => Object.values(r.things).map(b => rect(b, r.layout === 'laptop' ? '#4af' : '#f93')).join('')).join('')}
    ${reads.flatMap(r => r.clear.map(b => rect(b, '#fff', true))).join('')}
    <text x="10" y="22" fill="#fff">room ${res.room} tags · blue laptop parts · orange phone parts · dashed white kept clear (all reads) · green free</text></svg>`;
  await page.setViewportSize({ width: Math.ceil((A.x1 - A.x0 + 2) * k), height: Math.ceil((A.y1 - A.y0 + 2) * k) });
  await page.goto('about:blank'); await page.setContent(`<body style="margin:0;background:#111">${svg}</body>`); await page.screenshot({ path: '__SHOTS__pitch-space.png' });
  return JSON.stringify(res); }

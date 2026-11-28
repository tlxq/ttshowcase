// Room to tag (Tom 11-23): every spot the tag tool offers keeps clear of the wall's own parts (the piece, its hand line, the three old words, the flyer,
// the visitors' words and their can) in BOTH layouts and at BOTH times of day. A tag is saved in metres and shown to
// everyone, so a spot that is free on a phone but under the laptop's wider mural, or free at night but where the
// end's parts stand, is a broken spot. Also: room for at least 20 tags side by side, counted over the wall as far as the tag area can grow (it grows when it is full, Tom 11-27; the grow check proves that),
// AND at least 15 in today's area before it grows (roomToday). The old gate was 20 on today's area alone (master had 21): the painted piece, its hand line, the three old words and the bucket's landing
// spot, each in both layouts, now keep that room clear, and today's area holds 15. That floor stops it sliding further; more room is Tom's call (a longer wall, or fewer kept-clear parts).
// In view (Tom 11-23, the loop): how many free spots the start view and the visitors' wall (scrolled up past the pole) show whole,
// per layout (measured, reported). The end walks in to the start's own view, so it has none of its own.
// Exact maths on the page's own numbers (pickTest.space, pickTest.onScreen), the same each run; draws a wall map: pitch-space.png.
async page => { const errs = [], res = { errs };
  page.on('pageerror', e => errs.push(String(e)));
  const MIN_FREE = 20, MIN_TODAY = 15, STEP = .25, CALM = { flyer: .6, mural: .3, hand: .3, 'old portfolio': .3, 'old showcase': .3, 'old tlxq': .3, words: .3, can: .3 }, reads = [], views = {};
  let G = null; // the grid of frame centres, made from the first read
  const look = async (name, wide) => { await page.waitForTimeout(1500); views[name] = await page.evaluate(([g, w]) => window.pickTest.onScreen(g, w), [G, !!wide]); };
  for (const [w, h, layout] of [[1440, 900, 'laptop'], [412, 915, 'phone']]) {
    await page.setViewportSize({ width: w, height: h }); await page.goto('__URL__'); await page.waitForTimeout(3500); await page.waitForFunction(() => { const b = window.bucketAt && window.bucketAt(); return b && (b.x > 0 ? b : matchMedia("(prefers-reduced-motion: reduce)").matches && getComputedStyle(document.querySelector(".start")).display === "none" && b); /* reduced motion: no start screen, nothing to tip */ }, null, { timeout: 20000 }).then(h => h.jsonValue()).then(b => page.mouse.click(b.x, b.y)) /* the bucket, not the middle: only it tips (11-25) */;
    for (let i = 0; i < 40 && !(await page.evaluate(() => document.documentElement.style.overflow === '')); i++) await page.waitForTimeout(250);
    await page.waitForFunction(() => !!window.pickTest, null, { timeout: 30000 }); // under a full parallel run the page can be slower than the waits above
    reads.push({ layout, when: 'night', ...(await page.evaluate(() => window.pickTest.space())) });
    if (!G) { const { area: A, frame: F } = reads[0]; G = [];
      for (let y = A.y0 + F.h / 2; y <= A.y1 - F.h / 2 + 1e-6; y += STEP) for (let x = A.x0 + F.w / 2; x <= A.x1 - F.w / 2 + 1e-6; x += STEP) G.push([x, y]); }
    await look(layout + ' start');
    await page.evaluate(() => scrollTo(0, visitY())); await page.waitForTimeout(1000); await look(layout + ' visitors'); // up round the pole, at the visitors' wall
    await page.evaluate(() => scrollTo(0, svY(0))); await page.waitForTimeout(1500);
    for (const sv of [432, 700, 1045, 1180]) { await page.evaluate(sv => scrollTo(0, svY(sv)), sv); await page.waitForTimeout(2500); }
    reads.push({ layout, when: 'end', ...(await page.evaluate(() => window.pickTest.space())) }); // the end walks in to the start's own view (Tom 11-23: no landing): no view of its own to count
  }
  // every part, from both layouts and both times, with its calm zone
  const parts = [];
  for (const r of reads) for (const [k, b] of Object.entries(r.things)) { const m = CALM[k]; parts.push({ what: k + ' (' + r.layout + ')', b: [b[0] - m, b[1] - m, b[2] + m, b[3] + m] }); }
  const { area: A, frame: F } = reads[0], hit = (x, y, b) => x + F.w / 2 > b[0] && x - F.w / 2 < b[2] && y + F.h / 2 > b[1] && y - F.h / 2 < b[3];
  res.bad = {}; const freeAt = [];
  G.forEach(([x, y], i) => {
    let free = true;
    for (const r of reads) { if (r.clear.some(b => hit(x, y, b))) { free = false; continue; } // the tool says no here: fine
      const p = parts.find(p => hit(x, y, p.b)); if (!p) continue;
      free = false; const key = r.layout + ' ' + r.when + ' offers a spot over the ' + p.what; (res.bad[key] = res.bad[key] || { n: 0, at: [+x.toFixed(2), +y.toFixed(2)] }).n++; }
    if (free && !parts.some(p => hit(x, y, p.b))) freeAt.push(i); });
  for (const [k, v] of Object.entries(res.bad)) errs.push(k + ': ' + v.n + ' spots, e.g. centre ' + v.at.join(', ') + ' m');
  const tags = n => Math.round(n * STEP * STEP / (F.w * F.h)); // grid positions (0.25 m apart) -> about how many tags fit side by side
  res.freeSpots = freeAt.length; res.room = tags(freeAt.length); res.roomToday = tags(freeAt.filter(i => G[i][0] - F.w / 2 >= reads[0].base - 1e-6).length); // room: the wall as far as the tag area can grow (pickTest.space's area); roomToday: the area before it has grown
  if (res.room < MIN_FREE) errs.push('room for only ' + res.room + ' tags side by side, fewer than ' + MIN_FREE);
  if (res.roomToday < MIN_TODAY) errs.push('today\'s tag area has room for only ' + res.roomToday + ' tags side by side, fewer than ' + MIN_TODAY);
  res.inView = {}; for (const [name, v] of Object.entries(views)) res.inView[name] = tags(freeAt.filter(i => v[i]).length);
  const seen = i => Object.values(views).some(v => v[i]); res.inView['any view'] = tags(freeAt.filter(seen).length);
  // the wall map: grey = the wall a visitor may tag, outlines = the parts (blue laptop, orange phone), dots = free frame centres (big = in some view)
  const k = 40, X = x => (x - A.x0 + 1) * k, Y = y => (A.y1 + 1 - y) * k, rect = (b, c, dash) => `<rect x="${X(b[0])}" y="${Y(b[3])}" width="${(b[2] - b[0]) * k}" height="${(b[3] - b[1]) * k}" fill="none" stroke="${c}" stroke-width="3" ${dash ? 'stroke-dasharray="8 6"' : ''}/>`;
  const dots = freeAt.filter(i => { const [x, y] = G[i]; return Math.round(x / STEP) % 4 === 0 && Math.round(y / STEP) % 4 === 0; });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${(A.x1 - A.x0 + 2) * k}" height="${(A.y1 - A.y0 + 2) * k}" style="background:#111;font:16px sans-serif">
    <rect x="${X(A.x0)}" y="${Y(A.y1)}" width="${(A.x1 - A.x0) * k}" height="${(A.y1 - A.y0) * k}" fill="#333"/>
    ${dots.map(i => `<circle cx="${X(G[i][0])}" cy="${Y(G[i][1])}" r="${seen(i) ? 6 : 3}" fill="${seen(i) ? '#7f7' : '#575'}"/>`).join('')}
    ${reads.filter(r => r.when === 'end').map(r => Object.values(r.things).map(b => rect(b, r.layout === 'laptop' ? '#4af' : '#f93')).join('')).join('')}
    ${reads.flatMap(r => r.clear.map(b => rect(b, '#fff', true))).join('')}
    <text x="10" y="22" fill="#fff">room ${res.room} tags, ${res.inView['any view']} in the start or the visitors' view · blue laptop parts · orange phone · dashed white kept clear · big green = free and in view</text></svg>`;
  await page.setViewportSize({ width: Math.ceil((A.x1 - A.x0 + 2) * k), height: Math.ceil((A.y1 - A.y0 + 2) * k) });
  await page.goto('about:blank'); await page.setContent(`<body style="margin:0;background:#111">${svg}</body>`); await page.screenshot({ path: '__SHOTS__pitch-space.png' });
  return JSON.stringify(res); }

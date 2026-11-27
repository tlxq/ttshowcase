// The building site (Tom 11-27): across the street from the garage's back door stands one off-white site container with the Edge piece painted on it, two lamps on tripods at its front corners
// (on at night, off by day), and the three link tags that are its links: edgeflow.se, app-utveckling.se, mjukvaruutvecklare.com. At its stop (sv 990), at night:
// the painting is on, the lamps and the work lights behind the fence are lit, each link has a tap area of at least 48 x 48 px (laptop and phone), the three are in a row on a laptop and stacked on a phone,
// none overlaps another, and on a laptop the hover chip says "Opens <the site>" in the one place for all three. By day the lamps are off, and the view out of the back door (sv 936 and 940, the camera still in its mouth) is not a dark
// frame: the mean brightness (0 to 255) of its top part, the sky, stays above DOOR_FLOOR (Tom 11-27: the street across the door was black by day, the workshop's night kept the whole scene's sky).
async page => { const W = page.viewportSize().width, phone = W < 600, errs = [], res = { errs };
  const DOOR_FLOOR = 100;
  page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  const open = async url => { await page.goto(url); await page.waitForTimeout(3500); await page.waitForFunction(() => { const b = window.bucketAt && window.bucketAt(); return b && (b.x > 0 ? b : matchMedia("(prefers-reduced-motion: reduce)").matches && getComputedStyle(document.querySelector(".start")).display === "none" && b); /* reduced motion: no start screen, nothing to tip */ }, null, { timeout: 20000 }).then(h => h.jsonValue()).then(b => page.mouse.click(b.x, b.y)) /* the bucket, not the middle: only it tips (11-25) */;
    for (let i = 0; i < 40 && !(await page.evaluate(() => document.documentElement.style.overflow === '')); i++) await page.waitForTimeout(250); };
  const go = sv => page.evaluate(sv => scrollTo(0, svY(sv)), sv);
  const state = async till => { let s = null; for (let i = 0; i < 60; i++) { s = await page.evaluate(() => siteTest()); if (till(s)) return s; await page.waitForTimeout(250); } return s; };
  const LINKS = [['edgeflow.se', 'https://edgeflow.se/'], ['app-utveckling.se', 'https://app-utveckling.se/'], ['mjukvaruutvecklare.com', 'https://mjukvaruutvecklare.com/']];
  // ---- night
  await open('__URL__'); await go(990);
  let s = await state(s => s.shown && s.hots.every(h => h.shown));
  res.night = s;
  if (!s.shown) errs.push('the Edge piece is not painted on the container at its stop');
  if (!s.lamps.length || s.lamps.some(v => !(v > 0)) || !(s.face > 0)) errs.push('the two site lamps are not lit at night: ' + JSON.stringify([s.lamps, s.face]));
  if (!(s.work > 0)) errs.push('the work lights on the building frame behind the fence are not lit at night');
  if (s.hots.length !== 3) errs.push('the building site has ' + s.hots.length + ' links, not 3');
  s.hots.forEach((h, i) => { const [label, href] = LINKS[i] || [];
    if (h.label !== label || h.href !== href) errs.push('link ' + (i + 1) + ' is ' + h.label + ' ' + h.href + ', not ' + label + ' ' + href);
    if (!h.shown) errs.push(label + ' has no tap area at its stop');
    if (h.w < 47.5 || h.h < 47.5) errs.push(label + "'s tap area is " + Math.round(h.w) + ' x ' + Math.round(h.h) + ' px, under 48 x 48'); });
  for (let i = 1; i < s.hots.length; i++) { const a = s.hots[i - 1], b = s.hots[i];
    if (phone) { if (!(b.t >= a.t + a.h - 1)) errs.push('on a phone the links are not stacked: ' + LINKS[i][0] + ' starts at ' + Math.round(b.t) + ', the one above ends at ' + Math.round(a.t + a.h)); }
    else if (!(b.l >= a.l + a.w - 1)) errs.push('on a laptop the links are not in a row: ' + LINKS[i][0] + ' starts at ' + Math.round(b.l) + ', the one before ends at ' + Math.round(a.l + a.w)); }
  if (!phone) { const chips = []; // the hover chip: the one fixed place (the same height, the same middle), "Opens <site>"
    for (const [i, h] of s.hots.entries()) { await page.mouse.move(h.l + h.w / 2, h.t + h.h / 2); await page.waitForTimeout(500);
      const c = await page.evaluate(() => { const e = document.querySelector('.hl'); if (!e) return null; const r = e.getBoundingClientRect(); return { on: e.classList.contains('on'), text: e.textContent, l: Math.round(r.left + r.width / 2), t: Math.round(r.top) }; }); // l: the chip's middle
      chips.push(c); if (!c || !c.on || c.text !== 'Opens ' + LINKS[i][0]) errs.push('hovering ' + LINKS[i][0] + ' shows ' + JSON.stringify(c) + ', not "Opens ' + LINKS[i][0] + '"'); }
    res.chips = chips; if (chips.every(Boolean) && chips.some(c => Math.abs(c.l - chips[0].l) > 2 || Math.abs(c.t - chips[0].t) > 2)) errs.push('the hover chip is not in one place for the three links: ' + JSON.stringify(chips)); }
  await page.screenshot({ path: '__SHOTS__pitch-site-' + W + '-night.png' });
  // ---- the door view: while the camera is still inside the workshop (z under 0), the open back door frames the painting: its middle is on the screen, in the middle half across (both lights, both devices)
  const doorView = async tag => { const seen = []; for (let sv = 905; sv <= 940; sv += 5) { await go(sv); await page.waitForTimeout(900); const m = (await page.evaluate(() => siteTest())).mid; seen.push(sv + ':' + [m.x, m.y, m.inside, m.z].join('/'));
      if (m.ok && m.inside > .5 && m.z < -.5 && m.x > W * .25 && m.x < W * .75 && m.y > 0 && m.y < page.viewportSize().height) { res['door ' + tag] = seen; return; } }
    res['door ' + tag] = seen; errs.push('the open back door does not frame the painting while the camera is inside (' + tag + ', sv 905 to 940: x/y/inside/z ' + seen.join(' ') + ')'); };
  await doorView('night');
  // ---- day
  await open('__URL__'.replace('hour=23', 'hour=13')); await go(990);
  s = await state(s => s.shown); res.day = { lamps: s.lamps, face: s.face, work: s.work };
  if (s.lamps.some(v => v > 0) || s.face > 0 || s.work > 0) errs.push('by day the site lamps or the work lights are on: ' + JSON.stringify(res.day));
  await doorView('day');
  res.sky = []; for (const sv of [936, 940]) { await go(sv); await page.waitForTimeout(3500); // the sky and the street across the door: the top 40 % of the frame
    const b64 = (await page.screenshot({ type: 'jpeg', quality: 40 })).toString('base64');
    res.sky.push(await page.evaluate(async b64 => { const im = new Image(); im.src = 'data:image/jpeg;base64,' + b64; await im.decode(); const c = document.createElement('canvas'); c.width = 64; c.height = 40; const g = c.getContext('2d'); g.drawImage(im, 0, 0, 64, 40); const d = g.getImageData(0, 0, 64, 16).data; let t = 0; for (let i = 0; i < d.length; i += 4) t += (d[i] + d[i + 1] + d[i + 2]) / 3; return Math.round(t / (d.length / 4)); }, b64)); }
  if (Math.min(...res.sky) < DOOR_FLOOR) errs.push('the view out of the back door by day is a dark frame: the sky and the street show a mean brightness of ' + Math.min(...res.sky) + ' of 255 (sv 936, 940: ' + res.sky.join(', ') + '), under ' + DOOR_FLOOR);
  await page.screenshot({ path: '__SHOTS__pitch-site-' + W + '-door-day.png' });
  // ---- the narrowest phone, 320 x 568 (the link rows are 0.41 m apart: a stop too far back shows them 43 px apart): each tap area 48 px or more, none over another
  if (phone) { await page.setViewportSize({ width: 320, height: 568 }); await open('__URL__'); await go(990); const n = await state(s => s.shown && s.hots.every(h => h.shown)); res.narrow = n.hots.map(h => [Math.round(h.t), Math.round(h.w), Math.round(h.h)]);
    n.hots.forEach((h, i) => { if (h.w < 47.5 || h.h < 47.5) errs.push('at 320 x 568 ' + LINKS[i][0] + "'s tap area is " + Math.round(h.w) + ' x ' + Math.round(h.h) + ' px, under 48 x 48'); if (i && h.t < n.hots[i - 1].t + n.hots[i - 1].h - 1) errs.push('at 320 x 568 the tap areas of ' + LINKS[i - 1][0] + ' and ' + LINKS[i][0] + ' overlap'); }); }
  return JSON.stringify(res); }

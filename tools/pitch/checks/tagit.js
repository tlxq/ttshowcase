// Tag it (PR6, Tom 11-17): a tap on a lit part of the wall flies in and opens the drawing bar; strokes paint inside the frame with the tool and colour picked from the menus;
// a tap outside the frame makes no stroke; a fat cap held still drips; Undo takes the last stroke; Done replays the tag once, then the name and Put it on the wall; the camera steps back to the form,
// the wet paint dries and the tag goes to the store without a word, Leave your tag is gone, and after a reload the visitor's own tag is still on the wall; a saved tag with a broken spot or drip is ignored.
async page => { const W = page.viewportSize().width, H = page.viewportSize().height, errs = [], res = { errs };
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); page.on('pageerror', e => errs.push(String(e)));
  const toForm = async () => {
    await page.waitForTimeout(3500); await page.waitForFunction(() => { const b = window.bucketAt && window.bucketAt(); return b && (b.x > 0 ? b : matchMedia("(prefers-reduced-motion: reduce)").matches && getComputedStyle(document.querySelector(".start")).display === "none" && b); /* reduced motion: no start screen, nothing to tip */ }, null, { timeout: 20000 }).then(h => h.jsonValue()).then(b => page.mouse.click(b.x, b.y)) /* the bucket, not the middle: only it tips (11-25) */;
    for (let i = 0; i < 40 && !(await page.evaluate(() => document.documentElement.style.overflow === '')); i++) await page.waitForTimeout(250);
    await page.evaluate(() => scrollTo(0, visitY())); await page.waitForTimeout(2500); // Leave your tag lives on the visitors' wall (Tom 11-23: no end landing)
    let on = false; for (let i = 0; i < 60 && !on; i++) { on = await page.evaluate(() => document.getElementById('leaveUp').style.display === 'block'); if (!on) await page.waitForTimeout(200); }
    return on; };
  const st = () => page.evaluate(() => ({ ...window.tagTest.state(), bar: !document.getElementById('tagBar').hidden, send: !document.getElementById('tagSend').hidden,
    form: document.getElementById('leaveUp').style.display === 'block', held: document.documentElement.style.overflow === 'hidden', hint: document.getElementById('pickHint').textContent }));
  await page.goto('__URL__'); await page.evaluate(() => { try { localStorage.clear(); } catch (_) {} return fetch('/api/tags-local/reset', { method: 'POST' }); });
  await page.goto('__URL__');
  if (!(await toForm())) { errs.push('the morning form never showed, so Tag it was not tested'); return JSON.stringify(res); }
  const toLeft = async () => {}; // one view of the visitors' wall on every screen
  await toLeft(); await page.click('#leaveUp'); await page.waitForTimeout(1700);
  // the pick step (pointing at a lit part of the wall) is a full-screen flow too: the stripe is already away before the first tap (PR #127 review)
  res.stripePick = await page.evaluate(() => { const cs = getComputedStyle(document.querySelector('.stripe')); return { visibility: cs.visibility, opacity: cs.opacity, flow: document.documentElement.classList.contains('flow') }; });
  if (res.stripePick.visibility !== 'hidden' || +res.stripePick.opacity > 0) errs.push('the stripe stays on screen while the pick step is open: ' + JSON.stringify(res.stripePick));
  const spot = await page.evaluate(() => window.pickTest.freeOnScreen()); await page.mouse.click(spot.x, spot.y); await page.waitForTimeout(1500);
  res.locked = await st();
  if (res.locked.stage !== 'draw' || !res.locked.bar || !res.locked.shown) errs.push('a tap on the wall did not open the drawing bar: ' + JSON.stringify(res.locked));
  // Tom 11-26 (S23): the progress stripe's area name was drawn over the tag bar's words. While the flow is open nothing of the stripe shows,
  // and no visible stripe name's box meets the bar's top row (the words and Cancel).
  res.stripeIn = await page.evaluate(() => { const n = document.querySelector('.stripe'), top = document.querySelector('.pick .top').getBoundingClientRect(), cs = getComputedStyle(n);
    const hit = [...n.querySelectorAll('span')].filter(s => getComputedStyle(s).opacity > 0).map(s => s.getBoundingClientRect()).filter(r => r.left < top.right && r.right > top.left && r.top < top.bottom && r.bottom > top.top);
    return { visibility: cs.visibility, opacity: cs.opacity, overlaps: hit.length }; });
  if (res.stripeIn.overlaps && res.stripeIn.visibility !== 'hidden') errs.push('the stripe name is drawn over the tag bar\'s words: ' + JSON.stringify(res.stripeIn));
  if (res.stripeIn.visibility !== 'hidden' && +res.stripeIn.opacity > 0) errs.push('the stripe stays on screen while the tag flow is open: ' + JSON.stringify(res.stripeIn));
  const b = await page.evaluate(() => window.tagTest.frameBox());
  const line = async pts => { await page.mouse.move(b.x + b.w * pts[0][0], b.y + b.h * pts[0][1]); await page.mouse.down();
    for (const [x, y] of pts.slice(1)) await page.mouse.move(b.x + b.w * x, b.y + b.h * y, { steps: 12 }); await page.mouse.up(); };
  await page.mouse.click(Math.max(4, b.x - 40), b.y + b.h / 2); await page.waitForTimeout(100); // outside the frame: nothing to see, so no stroke
  res.outside = await page.evaluate(() => ({ strokes: window.tagTest.state().strokes, done: !document.getElementById('tagDone').disabled }));
  if (res.outside.strokes || res.outside.done) errs.push('a tap outside the frame made a stroke: ' + JSON.stringify(res.outside));
  await line([[.15, .35], [.3, .7], [.45, .35], [.6, .7]]); // fat cap, orange: the default
  // moved, then held still, a fat cap pools and a drip starts and runs down below where it was held; the runs end
  await page.mouse.move(b.x + b.w * .78, b.y + b.h * .3); await page.mouse.down(); await page.mouse.move(b.x + b.w * .85, b.y + b.h * .3, { steps: 8 });
  await page.waitForTimeout(1300); await page.mouse.up(); await page.waitForTimeout(4000);
  res.drip = await page.evaluate(() => { const [w, fh] = window.tagTest.size; return { drips: window.tagTest.drips(), running: window.tagTest.running(), below: (() => { const m = w / 2.4, y = Math.round(fh * .3 + .08 * m); let n = 0; for (let x = Math.round(w * .85 - .06 * m); x <= w * .85 + .06 * m; x++) n += window.tagTest.paintAt(x, y) > 40; return n; })() }; }); // paint 8 cm under the pool: every run is 10 cm or longer
  if (!res.drip.drips || !res.drip.below || res.drip.running) errs.push('holding a fat cap still made no drip that ran down and stopped: ' + JSON.stringify(res.drip));
  await page.click('#tagTool');
  res.toolMenu = await page.evaluate(() => { const bar = [...document.querySelectorAll('#tagBar button')].map(b => Math.round(b.getBoundingClientRect().height)), nm = document.querySelector('#tagTool .nm'), ch = parseFloat(getComputedStyle(document.querySelector('#tagTool .chev')).fontSize);
    return { names: [...document.querySelectorAll('#tagTools button')].map(b => b.querySelector('span:last-child').firstChild.textContent), rows: [...document.querySelectorAll('#tagTools button')].map(b => Math.round(b.getBoundingClientRect().height)), bar, cut: nm.scrollWidth > nm.clientWidth, chev: ch }; });
  if (res.toolMenu.names.join() !== 'Skinny,Fat,Mop,Chisel,Pen') errs.push('the tools are not Skinny, Fat, Mop, Chisel, Pen: ' + res.toolMenu.names);
  if (res.toolMenu.cut || res.toolMenu.chev < 16 || Math.min(...res.toolMenu.bar, ...res.toolMenu.rows) < 48) errs.push('the tag bar cuts a name, has a small arrow or a button under 48 px: ' + JSON.stringify(res.toolMenu));
  await page.click('#tagTools [data-t="pen"]'); await page.click('#tagCol');
  res.colMenu = await page.evaluate(() => { const bs = [...document.querySelectorAll('#tagCols button')], rs = bs.map(b => b.getBoundingClientRect()), dot = b => getComputedStyle(b.querySelector('.dot')).borderTopColor;
    return { names: bs.map(b => b.textContent.trim()), cols: new Set(rs.map(r => Math.round(r.left))).size, rows: new Set(rs.map(r => Math.round(r.top))).size, minH: Math.round(Math.min(...rs.map(r => r.height))), black: dot(bs[0]) !== dot(bs[1]) && bs[0].querySelector('.dot').hasAttribute('data-ring'), inside: rs.every(r => r.left >= 0 && r.right <= innerWidth), oneLine: bs.every(b => b.scrollWidth <= b.clientWidth && b.getBoundingClientRect().height < 80) }; });
  if (res.colMenu.names.length !== 12 || res.colMenu.names.some(n => !n) || res.colMenu.cols !== 4 || res.colMenu.rows !== 3 || res.colMenu.minH < 48 || !res.colMenu.black || !res.colMenu.inside || !res.colMenu.oneLine) errs.push('the colour menu is not 12 named buttons in 4 x 3, 48 px, Black ringed: ' + JSON.stringify(res.colMenu));
 await page.click('#tagCols [data-c="#2fa35a"]');
  await line([[.2, .2], [.8, .25]]);
  await line([[.7, .4], [.75, 1.6]]); // runs far below the frame: the paint must stop at its edge
  res.drawn = await st();
  if (res.drawn.strokes !== 4) errs.push('four strokes drawn, ' + res.drawn.strokes + ' kept');
  const px = await page.evaluate(() => { const [w, fh, h] = window.tagTest.size; return { inside: window.tagTest.paintAt(Math.round(w * .3), Math.round(fh * .7)), tool: document.querySelector('#tagTool .nm').textContent }; });
  if (!px.inside) errs.push('no paint where the first stroke went');
  if (px.tool !== 'Pen') errs.push('the tool menu did not change the tool: ' + px.tool);
  await page.screenshot({ path: '__SHOTS__pitch-' + W + '-tagit-draw.png' });
  await page.click('#tagUndo'); await page.waitForTimeout(100); res.undone = (await st()).strokes;
  if (res.undone !== 3) errs.push('Undo left ' + res.undone + ' strokes, not 3');
  await page.click('#tagDone'); await page.waitForTimeout(200); res.done = await st();
  if (res.done.stage !== 'send' || !res.done.playing || res.done.send) errs.push('Done did not start the replay: ' + JSON.stringify(res.done));
  for (let i = 0; i < 75; i++) { await page.waitForTimeout(200); res.played = await st(); if (!res.played.playing && res.played.send) break; } // the replay's own end, not a fixed 4.8 s: a busy GPU replays slower (11-25)
  if (res.played.playing || !res.played.send) errs.push('after the replay the name and Put it on the wall did not show: ' + JSON.stringify(res.played));
  await page.screenshot({ path: '__SHOTS__pitch-' + W + '-tagit-send.png' });
  await page.fill('#tagName', 'Walker'); await page.click('#tagPut'); await page.waitForTimeout(2200);
  res.put = await st();
  // ...and it is back when the flow ends, still a progress bar with its value text for a screen reader
  res.stripeOut = await page.evaluate(() => { const n = document.querySelector('.stripe'), cs = getComputedStyle(n); return { visibility: cs.visibility, opacity: cs.opacity, role: n.getAttribute('role'), text: n.getAttribute('aria-valuetext'), now: n.getAttribute('aria-valuenow'), hiddenAttr: n.closest('[aria-hidden="true"],[hidden],[inert]') ? 1 : 0 }; });
  if (res.stripeOut.visibility !== 'visible' || +res.stripeOut.opacity < 1 || res.stripeOut.role !== 'progressbar' || !res.stripeOut.text || res.stripeOut.hiddenAttr) errs.push('after the tag flow the stripe is not back as a progress bar: ' + JSON.stringify(res.stripeOut));
  if (res.put.stage || !res.put.saved || res.put.leave || !res.put.shown || res.put.held) errs.push('Put it on the wall did not keep the tag and step back to the walk: ' + JSON.stringify(res.put));
  if (!(res.put.wet > 0 && res.put.wet < 1)) errs.push('the paint is not drying as you step back: wet ' + res.put.wet);
  await page.screenshot({ path: '__SHOTS__pitch-' + W + '-tagit-put.png' });
  res.sentTo = await page.evaluate(async () => ({ rows: (await (await fetch('/api/tags-local/rows')).json()).map(r => ({ name: r.name, strokes: r.strokes.map(s => s.tool + ' ' + s.col), device: r.device })), saved: window.tagTest.state() }));
  if (res.sentTo.rows.length !== 1 || res.sentTo.rows[0].name !== 'Walker' || res.sentTo.rows[0].strokes.join() !== 'fat #ff4f1a,fat #ff4f1a,pen #2fa35a' || res.sentTo.saved.sent !== 'yes' || !res.sentTo.saved.id) errs.push('Put it on the wall did not send the tag with each stroke\'s own tool and colour, or the page did not keep the answer: ' + JSON.stringify(res.sentTo));
  await page.reload(); await page.waitForFunction(() => window.tagTest, null, { timeout: 20000 }); await page.waitForTimeout(2500); /* the page's script first: a fixed wait alone sometimes ran before it (11-25) */ res.again = { ...(await st()), drips: await page.evaluate(() => window.tagTest.drips()) };
  if (!res.again.shown || res.again.leave || res.again.name !== 'Walker' || res.again.strokes !== 3 || !res.again.drips) errs.push('after a reload the own tag is not on the wall, or Leave your tag is back: ' + JSON.stringify(res.again));
  for (const [k, bad] of [['x', o => { o.x = 'a'; }], ['drip', o => { o.strokes[0].dr = [[0, '3', null]]; }]]) {
    await page.evaluate(k => { const o = JSON.parse(localStorage.getItem('ttshowcase.tag.good') || localStorage.getItem('ttshowcase.tag')); localStorage.setItem('ttshowcase.tag.good', JSON.stringify(o)); }, k);
    await page.evaluate(f => { const o = JSON.parse(localStorage.getItem('ttshowcase.tag.good')); (0, eval)('(' + f + ')')(o); localStorage.setItem('ttshowcase.tag', JSON.stringify(o)); }, bad.toString());
    await page.reload(); await page.waitForFunction(() => window.tagTest, null, { timeout: 20000 }); await page.waitForTimeout(2500); /* the page's script first: a fixed wait alone sometimes ran before it (11-25) */ res['bad_' + k] = await st();
    if (res['bad_' + k].shown || !res['bad_' + k].leave) errs.push('a saved tag with a broken ' + k + ' was shown, or Leave your tag stayed away: ' + JSON.stringify(res['bad_' + k])); }
  return JSON.stringify(res); }

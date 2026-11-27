// Tom's wall (PR7b, Tom 11-18). A browser without Tom's cookie sees no admin bar, no extra pictures, and the store answers it exactly as before; a wrong key and a call without the header are refused.
// Signed in (the local /api/admin, test key), the wall draws every tag, waiting ones in a thin yellow frame with Approve and Remove (a laptop shows them beside the tag; a phone has them in the bar of a picked tag).
// A tag is picked with a tap, then moved, sized and turned, and the change is still there after a reload; Remove takes it off and Undo puts it back; Tom's own tag goes up at once with no mail.
// Runs against the pitch's local store (tools/tags/local.mjs, through tools/serve.py); each run starts it empty.
async page => { const W = page.viewportSize().width, H = page.viewportSize().height, errs = [], res = { errs };
  const KEY = 'local-pitch-admin-key-0123456789abcdef', wide = W > 700;
  page.on('console', m => { if (m.type() === 'error' && !/status of (400|401|403|404|409|429)\b/.test(m.text())) errs.push(m.text()); }); page.on('pageerror', e => errs.push(String(e)));
  const api = (path, method, body, extra) => page.evaluate(async ([p, m, b, x]) => { const r = await fetch(p, { method: m || 'GET', headers: { 'Content-Type': 'application/json', ...(x || {}) }, body: b ? JSON.stringify(b) : undefined, credentials: x && x.omit ? 'omit' : 'same-origin' }); const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch (_) {} return { status: r.status, text: t, j, cc: r.headers.get('cache-control') }; }, [path, method, body, extra]);
  const rows = async () => (await api('/api/tags-local/rows')).j;
  const state = () => page.evaluate(() => window.admTest.state());
  const settle = async (want, n) => { for (let i = 0; i < (n || 60); i++) { const s = await state(); if (want(s)) return s; await page.waitForTimeout(150); } return state(); };
  const start = async () => { await page.goto('__URL__'); await page.waitForTimeout(3500); await page.waitForFunction(() => { const b = window.bucketAt && window.bucketAt(); return b && (b.x > 0 ? b : matchMedia("(prefers-reduced-motion: reduce)").matches && getComputedStyle(document.querySelector(".start")).display === "none" && b); /* reduced motion: no start screen, nothing to tip */ }, null, { timeout: 20000 }).then(h => h.jsonValue()).then(b => page.mouse.click(b.x, b.y)) /* the bucket, not the middle: only it tips (11-25) */;
    for (let i = 0; i < 40 && !(await page.evaluate(() => document.documentElement.style.overflow === '')); i++) await page.waitForTimeout(250); await page.waitForTimeout(600); };
  const ours = { 'X-Admin': '1' }; // Origin is added by the browser
  const stroke = { tool: 'fat', col: '#ff4f1a', seed: 5, pts: [60, 80, 0, .5, 300, 200, 50, .5, 600, 120, 100, .5], dr: [] };
  const post = (x, y) => api('/api/tags', 'POST', { name: 'Visitor', device: 'visitor-device-' + Math.random().toString(16).slice(2), spot: { x, y, w: 2.4, h: 1.35, turn: 0 }, strokes: [stroke] });

  // ---- 1. a browser that is not Tom
  await page.goto('__URL__'); await page.evaluate(() => { try { localStorage.clear(); } catch (_) {} return fetch('/api/tags-local/reset', { method: 'POST' }); }); await page.goto('__URL__');
  await api('/api/tags-local/seed?n=1', 'POST'); const seeded = (await rows())[0];
  const wx = seeded.x < -11 ? -8 : -14.5, wy = 3.4;
  const sent = await post(wx, wy); if (sent.status !== 200) { errs.push('the waiting tag was not taken: ' + sent.status); return JSON.stringify(res); }
  const mailsBefore = (await api('/api/tags-local/mails')).j.length;
  const pub = await api('/api/tags'), asked = await api('/api/tags?admin=1');
  res.public = { keys: Object.keys(pub.j), cc: pub.cc };
  if (JSON.stringify(Object.keys(pub.j)) !== '["tags","held"]' || pub.j.tags.length !== 1 || pub.j.held.length !== 1 || asked.text !== pub.text) errs.push('without the cookie the store did not answer as before: ' + pub.text.slice(0, 200) + ' | ' + asked.text.slice(0, 200));
  if (!/public/.test(pub.cc || '')) errs.push('the public answer lost its cache header: ' + pub.cc);
  const wrong = await api('/api/admin', 'POST', { key: 'not-the-key' }, ours), plain = await api('/api/admin', 'POST', { key: KEY }), cold = await api('/api/tags?admin=1', 'POST', { do: 'approve', id: seeded.id }, ours);
  res.refused = [wrong.status, plain.status, cold.status];
  if (wrong.status !== 401 || wrong.j.error !== 'key' || plain.status !== 403 || cold.status !== 404) errs.push('a wrong key, a call without the header, or an admin call without the cookie was not refused: ' + JSON.stringify(res.refused));
  if (await page.evaluate(() => document.cookie.includes('admin'))) errs.push('a cookie came with the wrong key');
  await start(); res.visitor = await state();
  if (res.visitor.on || res.visitor.chip || res.visitor.tags.length || await page.evaluate(() => !document.getElementById('adm').hidden)) errs.push('a visitor\'s wall shows something of the admin side: ' + JSON.stringify(res.visitor));

  // ---- 2. Tom signs in: the right key sets the cookie (the page can't read it) and the wall asks for his view
  const ok = await api('/api/admin', 'POST', { key: KEY }, ours); res.signin = ok.status;
  if (ok.status !== 200 || await page.evaluate(() => document.cookie.includes('admin'))) errs.push('signing in failed, or the cookie can be read by the page: ' + ok.status);
  const mine = await api('/api/tags?admin=1'); res.list = mine.j && mine.j.tags && mine.j.tags.map(t => t.status).join();
  if (!mine.j || mine.j.admin !== true || mine.j.tags.length !== 2 || !/no-store/.test(mine.cc || '') || mine.text.includes('"device"')) errs.push('Tom\'s list is wrong: ' + mine.text.slice(0, 200));
  await page.evaluate(() => localStorage.setItem('ttshowcase.admin', '1')); await start();
  res.on = await settle(s => s.on && s.tags.length === 2 && s.tags.every(t => t.drawn) && s.chip, 80);
  if (!res.on.on || res.on.tags.length !== 2 || !res.on.tags.every(t => t.drawn) || !res.on.chip) errs.push('the wall did not show Tom\'s view with both tags: ' + JSON.stringify(res.on));
  if (res.on.chipNote !== 'Admin · 1 waiting') errs.push('the admin bar did not count the waiting tag: ' + res.on.chipNote);
  // Tom 11-26 (S23): the bar ran under the Write to me sticker in the bottom-right corner. On a phone it ends before the sticker's left edge
  // (--look-sticker-left in from the right, as 80-admin.js keeps its own plates clear of it) at 360, 390 and 412 wide, and its button stays 48 px tall.
  res.chipBox = [];
  for (const w of wide ? [W] : [360, 390, 412]) {
    if (w !== W) { await page.setViewportSize({ width: w, height: H }); await page.waitForTimeout(500); }
    const r = await page.evaluate(() => { const a = document.getElementById('adm').getBoundingClientRect(), bs = [...document.querySelectorAll('#adm button')].map(b => Math.round(b.getBoundingClientRect().height)); return { sticker: parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--look-sticker-left')), w: innerWidth, left: Math.round(a.left), right: Math.round(a.right), bottom: Math.round(a.bottom), minBtn: Math.min(...bs) }; });
    res.chipBox.push(r);
    if (!Number.isFinite(r.sticker) || r.sticker < 104) errs.push('--look-sticker-left is missing or under 104 px (the sticker is 12 px in from the right and 92 px wide): ' + r.sticker); // a missing token is NaN, and every check against it passes
    if (!wide && r.right > r.w - r.sticker) errs.push('the admin bar runs under the Write to me sticker at ' + r.w + ' wide: ' + JSON.stringify(r));
    if (r.minBtn < 48) errs.push('the admin bar\'s button is under 48 px at ' + r.w + ' wide: ' + JSON.stringify(r)); }
  if (!wide && page.viewportSize().width !== W) { await page.setViewportSize({ width: W, height: H }); await page.waitForTimeout(500); }
  await page.screenshot({ path: '__SHOTS__pitch-' + W + '-admin-chip.png' });
  const waiting = res.on.tags.find(t => t.status === 'waiting'), approved = res.on.tags.find(t => t.status === 'up');
  if (!waiting || !waiting.framed || approved.framed) errs.push('only the waiting tag should have a yellow frame: ' + JSON.stringify(res.on.tags));

  // ---- 3. the wide shot: frames, Approve
  await page.click('#admOpen'); res.view = await settle(s => s.view && s.mode === 1 && s.ui, 40); await page.waitForTimeout(400);
  if (!res.view.view || !res.view.ui || res.view.cancel !== 'Close' || res.view.sel || res.view.bar || !/Tap a tag/.test(res.view.hint)) errs.push('Edit the wall did not open the wide shot: ' + JSON.stringify(res.view));
  await page.screenshot({ path: '__SHOTS__pitch-' + W + '-admin-view.png' });
  const pose = async id => { await page.evaluate(id => window.admTest.look(id), id); await page.waitForTimeout(250); return page.evaluate(id => window.admTest.at(id), id); };
  const pick = async id => { const p = await pose(id); await page.mouse.click(p.x, p.y); return settle(s => s.sel === id, 15); };
  const drag = async (from, to) => { await page.mouse.move(from.x, from.y); await page.mouse.down(); await page.mouse.move(to.x, to.y, { steps: 14 }); await page.mouse.up(); await page.waitForTimeout(700); };
  res.picked = await pick(waiting.id);
  if (res.picked.sel !== waiting.id || !res.picked.bar || !res.picked.handles || !res.picked.buttons.includes('Approve') || !res.picked.buttons.includes('Remove') || !/Waiting for you/.test(res.picked.hint)) errs.push('a tap on the waiting tag did not pick it with Approve and Remove: ' + JSON.stringify(res.picked));
  await page.screenshot({ path: '__SHOTS__pitch-' + W + '-admin-picked.png' });

  // move, size, turn: each is kept by the store and is still there after a reload
  const c = await pose(waiting.id); await drag(c, { x: c.x + (wide ? 90 : 20), y: c.y + (wide ? -40 : -12) });
  let r0 = (await rows()).find(r => r.id === waiting.id); res.moved = [r0.x, r0.y];
  if (Math.abs(r0.x - wx) < .05 && Math.abs(r0.y - wy) < .05) errs.push('dragging the tag did not move it in the store: ' + JSON.stringify(res.moved));
  const hs = await page.evaluate(() => window.admTest.handle('size')); await drag(hs, { x: hs.x + (wide ? 70 : 18), y: hs.y + (wide ? 40 : 10) });
  r0 = (await rows()).find(r => r.id === waiting.id); res.sized = [r0.w, r0.h];
  if (Math.abs(r0.w - 2.4) < .05 || Math.abs(r0.w / r0.h - 2.4 / 1.35) > .03) errs.push('pulling the corner did not size the tag in its own shape: ' + JSON.stringify(res.sized));
  const ht = await page.evaluate(() => window.admTest.handle('turn')); await drag(ht, { x: ht.x + (wide ? 120 : 30), y: ht.y + (wide ? 30 : 8) });
  r0 = (await rows()).find(r => r.id === waiting.id); res.turned = r0.turn;
  if (Math.abs(r0.turn) < 1 || Math.abs(r0.turn) > 45) errs.push('the turn dot did not turn the tag: ' + r0.turn);
  const kept = { x: r0.x, y: r0.y, w: r0.w, turn: r0.turn };
  await page.screenshot({ path: '__SHOTS__pitch-' + W + '-admin-changed.png' });
  await start(); res.again = await settle(s => s.on && s.tags.length === 2 && s.tags.every(t => t.drawn), 80); const back = res.again.tags.find(t => t.id === waiting.id);
  if (!back || Math.abs(back.x - kept.x) > .01 || Math.abs(back.w - kept.w) > .01 || Math.abs(back.turn - kept.turn) > .2) errs.push('the moved, sized and turned tag is not as it was left after a reload: ' + JSON.stringify([back, kept]));
  await page.click('#admOpen'); await settle(s => s.view && s.ui, 40); await page.waitForTimeout(400);

  // Approve: a laptop has it beside the tag; a phone in the bar of the picked tag
  if (wide) { await pose(waiting.id); await page.click('#admFrames .wrap[data-id="' + waiting.id + '"] [data-do="approve"]'); }
  else { await pick(waiting.id); await page.click('#admApprove'); }
  res.approved = await settle(s => s.tags.find(t => t.id === waiting.id).status === 'up', 30); const ar = (await rows()).find(r => r.id === waiting.id);
  if (ar.status !== 'up' || res.approved.frames !== 0) errs.push('Approve did not put the tag up and take its yellow frame away: ' + JSON.stringify([ar.status, res.approved.frames]));
  const waitingNow = await api('/api/tags', 'GET', null, { omit: 1 }); if (waitingNow.j.tags.length !== 2) errs.push('after Approve a visitor does not see both tags: ' + waitingNow.text.slice(0, 100));

  // Remove, then Undo
  const rowBefore = (await rows()).find(r => r.id === waiting.id); await pick(waiting.id); await page.click('#admRemove'); res.removed = await settle(s => !s.tags.some(t => t.id === waiting.id) && s.buttons.includes('Undo'), 30);
  if ((await rows()).some(r => r.id === waiting.id) || !res.removed.buttons.includes('Undo') || res.removed.sel) errs.push('Remove did not take the tag off the store, or Undo is not offered: ' + JSON.stringify(res.removed));
  await page.screenshot({ path: '__SHOTS__pitch-' + W + '-admin-removed.png' });
  await page.click('#admUndo'); res.undone = await settle(s => s.tags.length === 2 && s.sel, 40);
  const ur = (await rows()).find(r => r.name === 'Visitor'); if (!ur || ur.id !== rowBefore.id || ur.created_at !== rowBefore.created_at || ur.device !== rowBefore.device || ur.status !== rowBefore.status) errs.push('Undo did not put the very same row back: ' + JSON.stringify([rowBefore, ur]));
  if (!ur || res.undone.tags.length !== 2 || Math.abs(ur.w - kept.w) > .01) errs.push('Undo did not put the tag back as it was: ' + JSON.stringify([ur && ur.w, res.undone.tags.length]));
  await page.click('#admDone'); res.done = await state(); if (res.done.sel || res.done.bar) errs.push('Done left a tag picked');

  // ---- 4. Tom's own tag: a tap on a bare wall, the tag tool, Put it on the wall; it is up at once, no mail
  const bare = await page.evaluate(() => window.admTest.bare()); if (!bare) { errs.push('no bare part of the wall on screen'); return JSON.stringify(res); }
  await page.mouse.click(bare.x, bare.y); res.make = await settle(s => s.make && s.mode === 2 && s.ui, 40); await page.waitForTimeout(500);
  if (!res.make.make || res.make.mode !== 2) errs.push('a tap on a bare part did not start Tom\'s tag: ' + JSON.stringify(res.make));
  const b = await page.evaluate(() => window.tagTest.frameBox());
  await page.mouse.move(b.x + b.w * .2, b.y + b.h * .4); await page.mouse.down(); await page.mouse.move(b.x + b.w * .5, b.y + b.h * .7, { steps: 10 }); await page.mouse.move(b.x + b.w * .8, b.y + b.h * .4, { steps: 10 }); await page.mouse.up();
  await page.click('#tagDone'); await page.waitForTimeout(5000); await page.fill('#tagName', 'Tom'); await page.click('#tagPut');
  res.put = await settle(s => s.view && s.tags.length === 3 && s.sel && s.mode === 1, 60);
  const all = await rows(), mine2 = all.find(r => r.name === 'Tom');
  if (!mine2 || !mine2.device.startsWith('tom:') || mine2.status !== 'up' || res.put.tags.length !== 3 || !res.put.sel) errs.push('Tom\'s own tag did not go up at once and come back picked: ' + JSON.stringify([mine2 && [mine2.device, mine2.status], res.put.tags.length, res.put.sel]));
  if ((await api('/api/tags-local/mails')).j.length !== mailsBefore) errs.push('Tom\'s own tag sent a mail');
  await page.waitForTimeout(800); await page.screenshot({ path: '__SHOTS__pitch-' + W + '-admin-own.png' });
  const seen = await api('/api/tags', 'GET', null, { omit: 1 }); if (seen.j.tags.length !== 3) errs.push('visitors do not see Tom\'s own tag at once: ' + seen.j.tags.length);

  // ---- 5. Close walks back; signing out ends it all
  await page.click('#pickCancel'); await settle(s => !s.view && s.mode === 0, 40); await page.waitForTimeout(1600);
  res.closed = await state(); if (res.closed.view || res.closed.cancel !== 'Cancel') errs.push('Close did not leave the wide shot: ' + JSON.stringify(res.closed));
  const out = await api('/api/admin', 'POST', { signout: true }, ours); const after = await api('/api/tags?admin=1');
  if (out.status !== 200 || after.j.admin || JSON.stringify(Object.keys(after.j)) !== '["tags","held"]') errs.push('after Sign out the store still answers Tom\'s way: ' + after.text.slice(0, 100));
  await page.evaluate(() => localStorage.setItem('ttshowcase.admin', '1')); await start(); res.out = await state();
  if (res.out.on || res.out.chip) errs.push('after Sign out the wall still shows the admin bar: ' + JSON.stringify(res.out));
  if (await page.evaluate(() => localStorage.getItem('ttshowcase.admin'))) errs.push('a stale note was not put right');
  return JSON.stringify(res); }

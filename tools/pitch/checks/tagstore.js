// The tag store (PR7, Tom 11-18): a tag the visitor puts on the wall is also sent to the store, with nothing on screen about it.
// A send that fails (the store refuses once with 502) stays unsent and goes again on the next load; 429, 409 and 400 are never sent again.
// The store keeps every stroke with its own tool and colour. Another visitor (fresh storage) sees the tag on the wall only after it is approved
// (through its review link), and the visitor who made it never sees it twice. A waiting tag's spot turns the frame yellow, with its own words.
// Runs against the pitch's local store (tools/tags/local.mjs, through tools/serve.py); each run starts it empty.
async page => { const W = page.viewportSize().width, H = page.viewportSize().height, errs = [], res = { errs };
  page.on('console', m => { if (m.type() === 'error' && !/status of (400|409|429|502)\b/.test(m.text())) errs.push(m.text()); }); page.on('pageerror', e => errs.push(String(e)));
  const api = (path, method) => page.evaluate(([p, m]) => fetch(p, { method: m || 'GET' }).then(r => r.json()), [path, method]);
  const state = () => page.evaluate(() => window.tagTest.state());
  const settle = async (want, ms) => { for (let i = 0; i < (ms || 50); i++) { const s = await state(); if (want(s)) return s; await page.waitForTimeout(100); } return state(); };
  const fresh = async () => { await page.evaluate(() => { try { localStorage.clear(); } catch (_) {} }); };
  const seedTag = (x, y) => page.evaluate(([x, y]) => localStorage.setItem('ttshowcase.tag', JSON.stringify({ v: 1, x, y, w: 2.4, h: 1.35, turn: 0, name: 'Kit', strokes: [
    { tool: 'skinny', col: '#2fa35a', seed: 11, pts: [100, 100, 0, .5, 200, 150, 40, .5, 300, 100, 80, .5], dr: [] },
    { tool: 'chisel', col: '#d42a2a', seed: 22, pts: [100, 300, 300, .5, 400, 300, 340, .5], dr: [[4, 200, 0]] }] })), [x, y]);
  const load = async () => { await page.reload(); await page.waitForTimeout(600); };
  const posts = async () => (await api('/api/tags-local/stats')).posts;
  await page.goto('__URL__'); await fresh(); await api('/api/tags-local/reset', 'POST'); await page.goto('__URL__');

  // 1. the first send fails (502): nothing shows, it stays unsent; the next load sends it again
  await seedTag(-12, 3); await api('/api/tags-local/fail?times=1&status=502', 'POST'); await load();
  res.failed = await settle(s => s.sent === 'x', 15); res.failedPosts = await posts(); res.failedRows = (await api('/api/tags-local/rows')).length;
  if (res.failed.sent || res.failedPosts !== 1 || res.failedRows) errs.push('a refused send was marked sent or stored: ' + JSON.stringify([res.failed.sent, res.failedPosts, res.failedRows]));
  if (!res.failed.shown || res.failed.leave) errs.push('while unsent the own tag must show as always, with no Leave your tag: ' + JSON.stringify(res.failed));
  await load(); res.sent = await settle(s => s.sent === 'yes', 50); const rows = await api('/api/tags-local/rows'); res.rows = rows.length;
  if (res.sent.sent !== 'yes' || rows.length !== 1 || res.sent.id !== rows[0].id) errs.push('the retry on the next load did not store the tag, or the id was not kept: ' + JSON.stringify([res.sent.sent, res.sent.id, rows.length]));
  res.tools = rows[0] && rows[0].strokes.map(s => s.tool + ' ' + s.col);
  if (JSON.stringify(res.tools) !== JSON.stringify(['skinny #2fa35a', 'chisel #d42a2a'])) errs.push('the store did not keep each stroke\'s own tool and colour: ' + JSON.stringify(res.tools));
  if (rows[0] && (rows[0].strokes[1].dr.length !== 1 || 'pen' in rows[0] || 'color' in rows[0])) errs.push('drips missing, or a tag-level pen or colour is stored');
  const mine = await page.evaluate(() => localStorage.getItem('ttshowcase.tag')), myDevice = await page.evaluate(() => localStorage.getItem('ttshowcase.device'));
  if (!/^[\w-]{16,64}$/.test(myDevice || '')) errs.push('the device id is missing or has the wrong shape: ' + myDevice);
  const before = await posts(); await load(); await page.waitForTimeout(800);
  if ((await posts()) !== before) errs.push('a tag that is in was sent again');

  // 2. 429, 409 and 400 are not tried again
  res.stop = {}; let spotX = -9;
  for (const code of [429, 409, 400]) { await fresh(); await seedTag(spotX += 1.5, 5); await api('/api/tags-local/fail?times=1&status=' + code, 'POST'); await load();
    const s = await settle(s => s.sent === 'stop', 30), n = await posts(); await load(); await page.waitForTimeout(800); const n2 = await posts(); res.stop[code] = [s.sent, n2 - n];
    if (s.sent !== 'stop' || n2 !== n) errs.push(code + ' was not final: ' + JSON.stringify([s.sent, n, n2])); }

  // 3. another visitor (fresh storage): the waiting tag is not on their wall, only after its review link is pressed; the maker never sees it twice
  await fresh(); await load(); await page.waitForTimeout(2500); res.waitingSeen = await page.evaluate(() => window.tagTest.store());
  if (res.waitingSeen) errs.push('a waiting tag was painted on another visitor\'s wall: ' + res.waitingSeen);
  const mails = await api('/api/tags-local/mails'), link = mails[0] && new URL(mails[0].link);
  if (!link) { errs.push('no review mail for the tag'); return JSON.stringify(res); }
  const approved = await page.evaluate(p => fetch(p + '&do=approve', { method: 'POST' }).then(r => r.status), link.pathname + link.search); res.approved = approved;
  await load(); for (let i = 0; i < 150 && !(await page.evaluate(() => document.documentElement.dataset.storeAt)); i++) await page.waitForTimeout(200);
  res.layer = await page.evaluate(() => ({ tags: window.tagTest.store(), layer: window.tagTest.layer(), at: document.documentElement.dataset.storeAt }));
  if (approved !== 200 || res.layer.tags !== '1' || !res.layer.at || !res.layer.layer || !res.layer.layer.shown) errs.push('the approved tag did not come up on another visitor\'s wall: ' + JSON.stringify([approved, res.layer]));
  await page.screenshot({ path: '__SHOTS__pitch-' + W + '-tagstore-other.png' });
  await page.evaluate(([t, d]) => { localStorage.setItem('ttshowcase.tag', t); localStorage.setItem('ttshowcase.device', d); }, [mine, myDevice]); await load(); await page.waitForTimeout(6000);
  res.own = await page.evaluate(() => ({ tags: window.tagTest.store(), shown: window.tagTest.state().shown, at: document.documentElement.dataset.storeAt || null }));
  if (res.own.tags || res.own.at || !res.own.shown) errs.push('the maker sees the tag twice (once from the store), or not from their own browser: ' + JSON.stringify(res.own));

  // 4. a waiting tag's spot: the frame turns yellow with its own words
  await fresh(); await page.goto('__URL__');
  await page.waitForTimeout(3500); await page.evaluate(() => window.bucketAt()).then(b => page.mouse.click(b.x, b.y)) /* the bucket, not the middle: only it tips (11-25) */;
  for (let i = 0; i < 40 && !(await page.evaluate(() => document.documentElement.style.overflow === '')); i++) await page.waitForTimeout(250);
  await page.evaluate(() => scrollTo(0, visitY())); await page.waitForTimeout(2500); // Leave your tag lives on the visitors' wall (Tom 11-23: no end landing)
  let on = false; for (let i = 0; i < 60 && !on; i++) { on = await page.evaluate(() => document.getElementById('leaveUp').style.display === 'block'); if (!on) await page.waitForTimeout(200); }
  if (!on) { errs.push('the morning form never showed, so the held spot was not tested'); return JSON.stringify(res); }
  const frame = () => page.evaluate(() => { const f = document.getElementById('pickFrame'); return { taken: f.classList.contains('taken'), mode: document.getElementById('pick').dataset.mode, hint: document.getElementById('pickHint').textContent, held: window.tagTest.held() }; });
  const toLeft = async () => {}; // one view of the visitors' wall on every screen
  await toLeft(); await page.click('#leaveUp'); await page.waitForTimeout(2200);
  const free = await page.evaluate(() => window.pickTest.freeOnScreen()); if (!free) { errs.push('no free part of the wall on screen'); return JSON.stringify(res); }
  const at = await page.evaluate(([x, y]) => window.pickTest.worldAt(x, y), [free.x, free.y]);
  res.other = await page.evaluate(async ([x, y]) => (await fetch('/api/tags', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: '', device: 'other-device-' + Math.random().toString(16).slice(2), spot: { x: x + .13, y: y + .07, w: 2.4, h: 1.35, turn: 0 }, // off the page's 0.4 m grid: a free spot that touches its edge exactly is a coin toss
    strokes: [{ tool: 'fat', col: '#ff4f1a', seed: 5, pts: [100, 100, 0, .5, 300, 200, 50, .5], dr: [] }] }) })).status, at);
  if (res.other !== 200) errs.push('the other visitor\'s tag was not taken: ' + res.other);
  await page.click('#pickCancel'); await page.waitForTimeout(2000); await toLeft(); await page.click('#leaveUp'); await page.waitForTimeout(2600);
  const held = await page.evaluate(() => window.pickTest.heldOnScreen()); if (!held) { errs.push('the waiting tag\'s spot was not told to the page'); return JSON.stringify(res); }
  await page.mouse.click(held.x, held.y); await page.waitForTimeout(500); res.held = await frame();
  if (res.held.mode !== '1' || !res.held.taken || res.held.hint !== 'Someone\'s tagging here. Pick another spot.') errs.push('a tap on a waiting tag\'s spot did not stay in the wide shot with a yellow frame and its words: ' + JSON.stringify(res.held));
  await page.screenshot({ path: '__SHOTS__pitch-' + W + '-tagstore-held.png' });
  const title = await page.evaluate(() => window.pickTest.clearOnScreen()); await page.mouse.click(title.x, title.y); await page.waitForTimeout(400); res.clear = await frame();
  if (!res.clear.taken || !/stays clear/.test(res.clear.hint)) errs.push('a kept-clear part lost its own words: ' + JSON.stringify(res.clear));
  const spot = await page.evaluate(() => window.pickTest.freeOnScreen()); res.freeTap = spot; await page.mouse.click(spot.x, spot.y); await page.waitForTimeout(1500); res.free = { ...(await state()), ...(await frame()) };
  if (res.free.stage !== 'draw') errs.push('a free part could not be tagged any more: ' + JSON.stringify(res.free));
  return JSON.stringify(res); }

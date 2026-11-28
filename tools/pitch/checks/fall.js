// The bucket falls (Tom 11-27): after the pour has ended it waits (--front-fall-wait), gives its hint, falls off the ledge once, lands on the ground and lies there for the rest of the visit.
// Proves: the phases only go forward (ledge 0, hint 1, slide 2, over the edge 3, fall 4, settle 5, rest 6) and end at rest; it rests on the ground inside the spot the tags keep clear; it is still there, unmoved,
// after the visitor walks away and comes back and after another full wait (it never falls twice); the visit remembers it (sessionStorage); a visitor who scrolled on before it fell does not miss it: it stays on the ledge while
// they are away and falls, with its hint, when they are back at the start wall (Tom 11-28); with reduced motion the still page shows it lying there from the start.
async page => { const errs = [], res = { errs }; page.on('pageerror', e => errs.push(String(e)));
  const state = () => page.evaluate(() => { const f = window.__bucketFall; return f ? { ph: f.ph, x: +f.p.x.toFixed(3), y: +f.p.y.toFixed(3), z: +f.p.z.toFixed(3), spot: f.spot } : null; });
  await page.goto('__URL__');
  for (let i = 0; i < 80 && !(await page.evaluate(() => document.documentElement.dataset.readyAt)); i++) await page.waitForTimeout(250);
  const b = await page.evaluate(() => window.bucketAt()); await page.mouse.click(b.x, b.y);
  const seen = []; let s = null;
  for (let i = 0; i < 700; i++) { s = await state(); if (!s) break; if (seen[seen.length - 1] !== s.ph) seen.push(s.ph); if (s.ph === 6) break; await page.waitForTimeout(100); }
  res.phases = seen; res.rest = s;
  if (!s) { errs.push('the page has no bucket state to read (window.__bucketFall)'); return JSON.stringify(res); }
  if (s.ph !== 6) errs.push('the bucket never came to rest: phases ' + seen.join(' '));
  if (seen.some((p, i) => i && p < seen[i - 1])) errs.push('the phases went backwards: ' + seen.join(' '));
  if (!seen.includes(1)) errs.push('no hint before the fall: phases ' + seen.join(' '));
  if (!seen.some(p => p >= 2 && p <= 5)) errs.push('the bucket was at rest without a fall being seen: phases ' + seen.join(' '));
  const G = s.spot;
  if (!(s.y > G.ground && s.y < G.ground + .5)) errs.push('the bucket does not lie on the ground: its middle is at y ' + s.y + ' m, the ground at ' + G.ground);
  if (!(s.x > G.x0 && s.x < G.x1)) errs.push('the bucket lies at x ' + s.x + ' m, outside the spot kept for it (' + G.x0.toFixed(2) + ' to ' + G.x1.toFixed(2) + ')');
  await page.waitForFunction(() => !!window.pickTest, null, { timeout: 30000 });
  res.keptClear = await page.evaluate(([x, y]) => window.pickTest.space().clear.some(c => x > c[0] && x < c[2] && y > c[1] && y < c[3]), [s.x, s.y]);
  if (!res.keptClear) errs.push('a tag may be put where the bucket lies (' + s.x + ', ' + s.y + ' m): no kept-clear box covers it');
  res.remembered = await page.evaluate(() => { try { return sessionStorage.getItem('bkfell'); } catch (e) { return null; } });
  if (res.remembered !== '1') errs.push('the visit does not remember the fall (sessionStorage bkfell is ' + res.remembered + ')');
  // away and back, then longer than a whole wait and hint: it lies where it lay
  await page.evaluate(() => scrollTo(0, svY(128))); await page.waitForTimeout(2500); await page.evaluate(() => scrollTo(0, svY(0))); await page.waitForTimeout(9500);
  const later = await state(); res.later = later;
  if (later.ph !== 6 || Math.abs(later.x - s.x) > .01 || Math.abs(later.y - s.y) > .01 || Math.abs(later.z - s.z) > .01) errs.push('the bucket moved or fell again after the visitor came back: ' + JSON.stringify(later));
  // scrolled on before the fall (a short wait from the link, n=2): on the ledge while away, however long; back at the start it gives its hint and falls, once
  await page.evaluate(() => { try { sessionStorage.clear(); } catch (e) {} }); await page.goto('__URL__&n=2');
  for (let i = 0; i < 80 && !(await page.evaluate(() => document.documentElement.dataset.readyAt)); i++) await page.waitForTimeout(250);
  { const b = await page.evaluate(() => window.bucketAt()); await page.mouse.click(b.x, b.y); }
  for (let i = 0; i < 80 && !(await page.evaluate(() => document.documentElement.style.overflow === '')); i++) await page.waitForTimeout(100);
  await page.evaluate(() => scrollTo(0, svY(128))); const awayPh = []; for (let i = 0; i < 24; i++) { await page.waitForTimeout(500); awayPh.push((await state()).ph); } // 12 s: the pour's end and the wait are long past
  res.away = [...new Set(awayPh)]; if (awayPh.some(p => p !== 0)) errs.push('the bucket fell while the visitor was away from the start: phases ' + res.away.join(' '));
  await page.evaluate(() => scrollTo(0, svY(0))); const backPh = []; let bs = null;
  for (let i = 0; i < 300; i++) { bs = await state(); if (backPh[backPh.length - 1] !== bs.ph) backPh.push(bs.ph); if (bs.ph === 6) break; await page.waitForTimeout(100); }
  res.back = backPh; if (bs.ph !== 6 || !backPh.includes(1) || !backPh.some(p => p >= 2 && p <= 5)) errs.push('back at the start the bucket did not give its hint, fall and come to rest: phases ' + backPh.join(' '));
  // reduced motion: the still page has it lying there
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.evaluate(() => { try { sessionStorage.clear(); } catch (e) {} }); await page.goto('__URL__'); await page.waitForTimeout(6000);
  const still = await state(); res.reduced = still;
  if (!still || still.ph !== 6 || !(still.y > G.ground && still.y < G.ground + .5)) errs.push('with reduced motion the bucket is not lying on the ground: ' + JSON.stringify(still));
  await page.emulateMedia({ reducedMotion: null });
  return JSON.stringify(res); }

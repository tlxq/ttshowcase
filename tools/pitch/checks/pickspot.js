// Leave your tag, pick the spot (PR5, Tom 11-17; tap = your spot, Tom 11-18): from the morning form the camera steps back to a wide shot of the
// whole wall a visitor may tag (the visitor stretch and the opening wall), lit where a tag may go. A tap on a kept-clear part (the title) turns
// the frame yellow and says so; a tap on a lit part flies in close and the drawing starts at once, the frame filling most of the screen.
// Move it goes back to the wide shot; Esc there flies back to the same spot; Esc while drawing goes to the wide shot; Enter on the frame in
// the wide shot flies in; Cancel (always at the top) walks back and the form shows again with the scroll free.
async page => { const W = page.viewportSize().width, H = page.viewportSize().height, errs = [], res = { errs };
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); page.on('pageerror', e => errs.push(String(e)));
  await page.goto('__URL__'); await page.waitForTimeout(3500); await page.mouse.click(W / 2, H / 2);
  for (let i = 0; i < 40 && !(await page.evaluate(() => document.documentElement.style.overflow === '')); i++) await page.waitForTimeout(250);
  await page.evaluate(() => scrollTo(0, visitY())); await page.waitForTimeout(2500); // Leave your tag lives on the visitors' wall (Tom 11-23: no end landing)
  let on = false; for (let i = 0; i < 60 && !on; i++) { on = await page.evaluate(() => document.getElementById('leaveUp').style.display === 'block'); if (!on) await page.waitForTimeout(200); }
  if (!on) { errs.push('the morning form never showed, so Leave your tag was not tested'); return JSON.stringify(res); }
  const state = () => page.evaluate(() => { const f = document.getElementById('pickFrame'), r = f.getBoundingClientRect(), p = document.getElementById('pick');
    return { mode: p.dataset.mode, on: p.classList.contains('on'), x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height), vw: innerWidth, vh: innerHeight,
      taken: f.classList.contains('taken'), stage: window.tagTest.state().stage, focus: document.activeElement === f, held: document.documentElement.style.overflow === 'hidden',
      form: document.getElementById('leaveUp').style.display === 'block', hint: document.getElementById('pickHint').textContent }; });
  const toLeft = async () => {}; // one view of the visitors' wall on every screen
  await toLeft(); await page.click('#leaveUp'); await page.waitForTimeout(500);
  res.going = await state();
  if (!res.going.held) errs.push('the scroll was not held on the way to the wide shot');
  if (res.going.form) errs.push('the form still showed on the way to the wide shot');
  await page.waitForTimeout(1600);
  res.wide = await state();
  if (!res.wide.on || res.wide.mode !== '1') errs.push('the wide shot never showed: ' + JSON.stringify(res.wide));
  if (!res.wide.focus) errs.push('in the wide shot the frame did not get the keyboard focus');
  await page.screenshot({ path: '__SHOTS__pitch-' + W + '-pickwide.png' });
  // a tap on the title (kept clear): no fly-in, the frame turns yellow and the words say why
  const title = await page.evaluate(() => window.pickTest.clearOnScreen()); await page.mouse.click(title.x, title.y); await page.waitForTimeout(400);
  res.clear = await state();
  if (res.clear.mode !== '1' || !res.clear.taken || !/stays clear/.test(res.clear.hint)) errs.push('a tap on the title did not stay in the wide shot with a yellow frame and words: ' + JSON.stringify(res.clear));
  await page.screenshot({ path: '__SHOTS__pitch-' + W + '-pickspot-taken.png' });
  // a tap on a lit part: fly in close, drawing at once
  const spot = await page.evaluate(() => window.pickTest.freeOnScreen()); if (!spot) { errs.push('no free part of the wall on screen to tap'); return JSON.stringify(res); }
  await page.mouse.click(spot.x, spot.y); await page.waitForTimeout(1500);
  res.close = await state(); const a = res.close;
  if (!a.on || a.mode !== '2' || a.stage !== 'draw' || a.taken) errs.push('a tap on a lit part did not fly in and start the drawing: ' + JSON.stringify(a));
  if (a.w < a.vw * (W < 600 ? .85 : .7) || a.x < 0 || a.x + a.w > a.vw || a.y < 0 || a.y + a.h > a.vh) errs.push('close in, the frame does not fill most of the screen, or is off it: ' + JSON.stringify(a));
  await page.screenshot({ path: '__SHOTS__pitch-' + W + '-pickspot.png' });
  await page.click('#tagMoveB'); await page.waitForTimeout(1300); res.move = await state();
  if (res.move.mode !== '1' || res.move.stage !== 'move') errs.push('Move it did not go back to the wide shot: ' + JSON.stringify(res.move));
  await page.keyboard.press('Escape'); await page.waitForTimeout(1500); res.escBack = await state();
  if (res.escBack.mode !== '2' || res.escBack.stage !== 'draw') errs.push('Esc while moving did not fly back to the spot: ' + JSON.stringify(res.escBack));
  await page.keyboard.press('Escape'); await page.waitForTimeout(1300); res.esc = await state();
  if (res.esc.mode !== '1' || !res.esc.on) errs.push('Esc while drawing did not go to the wide shot: ' + JSON.stringify(res.esc));
  await page.focus('#pickFrame'); await page.keyboard.press('Enter'); await page.waitForTimeout(1500); res.enter = await state();
  if (res.enter.mode !== '2' || res.enter.stage !== 'draw') errs.push('Enter on the frame in the wide shot did not fly in: ' + JSON.stringify(res.enter));
  await page.click('#pickCancel'); await page.waitForTimeout(2000);
  res.gone = await state(); res.gone.restored = await page.evaluate(() => window.pickTest.restored()); res.gone.leaveFocus = await page.evaluate(() => document.activeElement?.id === 'leave');
  if (!res.gone.leaveFocus) errs.push('after Cancel the keyboard focus is not on Leave your tag');
  if (res.gone.held || !res.gone.form || res.gone.on || !res.gone.restored || res.gone.stage) errs.push('Cancel did not walk back to the form with the scroll free: ' + JSON.stringify(res.gone));
  return JSON.stringify(res); }

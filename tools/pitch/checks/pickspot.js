// Leave your tag, pick the spot (PR5, Tom 11-17): from the morning form the camera steps back to a wide shot of the whole wall a visitor may tag
// (the visitor stretch and the opening wall), lit where a tag may go. A tap on a lit part flies in close: the wall dims round the frame.
// Dragging it onto a kept-clear part (the title) turns it yellow and turns Lock spot off; a tap on a free part moves it there; Lock spot locks it;
// Move the spot unlocks it; See the whole wall and Esc go back to the wide shot; Cancel (always at the top) walks back and the form shows again with the scroll free.
async page => { const W = page.viewportSize().width, H = page.viewportSize().height, errs = [], res = { errs };
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); page.on('pageerror', e => errs.push(String(e)));
  await page.goto('__URL__'); await page.waitForTimeout(3500); await page.mouse.click(W / 2, H / 2);
  for (let i = 0; i < 40 && !(await page.evaluate(() => document.documentElement.style.overflow === '')); i++) await page.waitForTimeout(250);
  for (const sv of [432, 700, 1045, 1180]) { await page.evaluate(sv => scrollTo(0, svY(sv)), sv); await page.waitForTimeout(2500); }
  let on = false; for (let i = 0; i < 60 && !on; i++) { on = await page.evaluate(() => document.getElementById('mail').classList.contains('on')); if (!on) await page.waitForTimeout(200); }
  if (!on) { errs.push('the morning form never showed, so Leave your tag was not tested'); return JSON.stringify(res); }
  const state = () => page.evaluate(() => { const f = document.getElementById('pickFrame'), r = f.getBoundingClientRect(), p = document.getElementById('pick'), b = document.getElementById('pickLock');
    return { mode: p.dataset.mode, on: p.classList.contains('on'), x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height), vw: innerWidth, vh: innerHeight,
      taken: f.classList.contains('taken'), lock: !b.hidden && !b.disabled, focus: document.activeElement === f, held: document.documentElement.style.overflow === 'hidden', form: document.getElementById('mail').classList.contains('on') }; });
  await page.click('#leave'); await page.waitForTimeout(500);
  res.going = await state();
  if (!res.going.held) errs.push('the scroll was not held on the way to the wide shot');
  if (res.going.form) errs.push('the form still showed on the way to the wide shot');
  await page.waitForTimeout(1600);
  res.wide = await state();
  if (!res.wide.on || res.wide.mode !== '1') errs.push('the wide shot never showed: ' + JSON.stringify(res.wide));
  if (!res.wide.focus) errs.push('in the wide shot the frame did not get the keyboard focus');
  await page.screenshot({ path: '__SHOTS__pitch-' + W + '-pickwide.png' });
  // a tap on the offered spot flies in close
  const spot = await page.evaluate(() => window.pickTest.spotOnScreen()); await page.mouse.click(spot.x, spot.y); await page.waitForTimeout(1400);
  res.close = await state(); const a = res.close;
  if (!a.on || a.mode !== '2') errs.push('a tap in the wide shot did not fly in close: ' + JSON.stringify(a));
  if (a.taken || !a.lock) errs.push('the offered spot is not free: ' + JSON.stringify(a));
  if (a.w < a.vw * .25 || a.x < 0 || a.x + a.w > a.vw || a.y < 0 || a.y + a.h > a.vh) errs.push('close in, the frame is too small or off screen: ' + JSON.stringify(a));
  await page.screenshot({ path: '__SHOTS__pitch-' + W + '-pickspot.png' });
  // drag it onto the title (kept clear)
  const from = { x: a.x + a.w / 2, y: a.y + a.h / 2 }, to = await page.evaluate(() => window.pickTest.clearOnScreen());
  await page.mouse.move(from.x, from.y); await page.mouse.down(); await page.mouse.move(to.x, to.y, { steps: 10 }); await page.mouse.up(); await page.waitForTimeout(300);
  res.clear = await state();
  if (!res.clear.taken || res.clear.lock) errs.push('on the title the frame did not turn yellow or Lock spot stayed on: ' + JSON.stringify(res.clear));
  await page.screenshot({ path: '__SHOTS__pitch-' + W + '-pickspot-taken.png' });
  await page.waitForTimeout(1500); // the camera catches up with the frame
  const free = await page.evaluate(() => window.pickTest.freeOnScreen());
  if (!free) { errs.push('no free part of the wall on screen to tap'); return JSON.stringify(res); }
  await page.mouse.click(free.x, free.y); await page.waitForTimeout(1500); res.tapped = await state();
  if (res.tapped.taken || !res.tapped.lock) { errs.push('a tap on a free part did not free the frame: ' + JSON.stringify({ ...res.tapped, free })); return JSON.stringify(res); }
  await page.click('#pickWide'); await page.waitForTimeout(1300); res.back = await state();
  if (res.back.mode !== '1' || !res.back.on) errs.push('See the whole wall did not go back to the wide shot: ' + JSON.stringify(res.back));
  await page.keyboard.press('Enter'); await page.waitForTimeout(1300); res.enter = await state();
  if (res.enter.mode !== '2') errs.push('Enter on the frame in the wide shot did not fly in close: ' + JSON.stringify(res.enter));
  await page.click('#pickLock'); await page.waitForTimeout(300);
  res.locked = await page.evaluate(() => document.getElementById('pickFrame').classList.contains('locked'));
  if (!res.locked) errs.push('Lock spot did not lock the frame');
  await page.screenshot({ path: '__SHOTS__pitch-' + W + '-pickspot-locked.png' });
  await page.click('#pickMove'); await page.waitForTimeout(200); res.moved = await state();
  if (await page.evaluate(() => document.getElementById('pickFrame').classList.contains('locked')) || !res.moved.lock) errs.push('Move the spot did not unlock the frame: ' + JSON.stringify(res.moved));
  await page.keyboard.press('Escape'); await page.waitForTimeout(1300); res.esc = await state();
  if (res.esc.mode !== '1' || !res.esc.on) errs.push('Esc close in did not go back to the wide shot: ' + JSON.stringify(res.esc));
  await page.keyboard.press('Enter'); await page.waitForTimeout(1300);
  await page.click('#pickCancel'); await page.waitForTimeout(2000);
  res.gone = await state(); res.gone.restored = await page.evaluate(() => window.pickTest.restored()); res.gone.leaveFocus = await page.evaluate(() => document.activeElement?.id === 'leave');
  if (!res.gone.leaveFocus) errs.push('after Cancel the keyboard focus is not on Leave your tag');
  if (res.gone.held || !res.gone.form || res.gone.on || !res.gone.restored) errs.push('Cancel did not walk back to the form with the scroll free: ' + JSON.stringify(res.gone));
  return JSON.stringify(res); }

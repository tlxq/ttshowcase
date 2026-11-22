// The loop (PR4): at the end, "Back to the start" turns the morning into night on the same wall, then the page sits at the park
// (as after the pour) with the form gone, the scroll free again and the "Scroll up" label showing.
async page => { const W = page.viewportSize().width, H = page.viewportSize().height, errs = [], res = { errs };
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); page.on('pageerror', e => errs.push(String(e)));
  await page.goto('__URL__'); await page.waitForTimeout(3500); await page.mouse.click(W / 2, H / 2);
  for (let i = 0; i < 40 && !(await page.evaluate(() => document.documentElement.style.overflow === '')); i++) await page.waitForTimeout(250);
  for (const sv of [432, 700, 1045, 1180]) { await page.evaluate(sv => scrollTo(0, svY(sv)), sv); await page.waitForTimeout(2500); }
  let on = false; for (let i = 0; i < 60 && !on; i++) { on = await page.evaluate(() => document.getElementById('mail').classList.contains('on')); if (!on) await page.waitForTimeout(200); }
  if (!on) { errs.push('the morning form never showed, so the loop was not tested'); return JSON.stringify(res); }
  const toLeft = async () => { if (await page.isVisible('#endPan') && (await page.textContent('#endPan')).includes('Leave your tag')) { await page.click('#endPan'); await page.waitForTimeout(2200); } }; // a phone lands on the flyer; Leave your tag and Back to the start are on the left side
  await toLeft(); await page.click('#again'); await page.waitForTimeout(800);
  res.during = await page.evaluate(() => ({ held: document.documentElement.style.overflow === 'hidden', form: document.getElementById('mail').classList.contains('on') }));
  if (!res.during.held) errs.push('the scroll was not held during the dusk');
  if (res.during.form) errs.push('the form still showed during the dusk');
  await page.waitForTimeout(3000);
  res.after = await page.evaluate(() => ({ y: Math.round(scrollY), park: Math.round(svY(0)), free: document.documentElement.style.overflow === '', form: document.getElementById('mail').classList.contains('on'), label: +getComputedStyle(document.getElementById('tagUp')).opacity }));
  if (Math.abs(res.after.y - res.after.park) > 2) errs.push('after the loop the page is not at the park: ' + JSON.stringify(res.after));
  if (!res.after.free) errs.push('after the loop the scroll is still held');
  if (res.after.form) errs.push('after the loop the form still shows');
  if (res.after.label < .9) errs.push('after the loop the "Scroll up" label does not show');
  await page.screenshot({ path: '__SHOTS__pitch-' + W + '-looped.png' });
  // a second pass with the keyboard: down to the end again, the form shows at once, Enter on the button starts the dusk; Space types in the message
  await page.evaluate(() => scrollTo(0, svY(1180))); on = false; for (let i = 0; i < 40 && !on; i++) { on = await page.evaluate(() => document.getElementById('mail').classList.contains('on')); if (!on) await page.waitForTimeout(200); }
  if (!on) errs.push('on a second pass the form did not show');
  await page.focus('#mail textarea'); await page.keyboard.type('a b'); res.typed = await page.evaluate(() => document.querySelector('#mail textarea').value);
  if (res.typed !== 'a b') errs.push('Space could not be typed in the message: ' + JSON.stringify(res.typed));
  await toLeft(); await page.focus('#again'); await page.keyboard.press('Enter'); await page.waitForTimeout(500);
  if (await page.evaluate(() => document.documentElement.style.overflow !== 'hidden')) errs.push('Enter on "Back to the start" did not start the dusk');
  await page.waitForTimeout(3300);
  res.again = await page.evaluate(() => ({ y: Math.round(scrollY), park: Math.round(svY(0)), inert: document.getElementById('mail').inert }));
  if (Math.abs(res.again.y - res.again.park) > 2 || !res.again.inert) errs.push('the second loop did not end at the park with the form shut: ' + JSON.stringify(res.again));
  return JSON.stringify(res); }

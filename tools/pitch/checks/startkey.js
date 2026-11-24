// The start by keyboard (audit 4b, B-4): once the bucket is full, Tab reaches it as a button named "Tip the bucket to enter"
// with a focus ring, and Enter tips it: the walk opens. Before 11-24 Tab found nothing on the start screen.
async page => { const errs = [], res = { errs }; page.on('pageerror', e => errs.push(String(e)));
  await page.goto('__URL__');
  for (let i = 0; i < 80 && !(await page.evaluate(() => document.documentElement.dataset.readyAt)); i++) await page.waitForTimeout(250);
  await page.keyboard.press('Tab'); await page.waitForTimeout(200);
  res.focus = await page.evaluate(() => { const e = document.activeElement, cs = getComputedStyle(e); return { id: e.id, role: e.getAttribute('role'), name: e.getAttribute('aria-label'), ring: cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 2 }; });
  if (res.focus.id !== 'tagBucket' || res.focus.role !== 'button' || res.focus.name !== 'Tip the bucket to enter' || !res.focus.ring) errs.push('Tab does not reach the start as a named button with a focus ring: ' + JSON.stringify(res.focus));
  await page.keyboard.press('Enter');
  let open = false; for (let i = 0; i < 60 && !(open = await page.evaluate(() => document.documentElement.style.overflow === '')); i++) await page.waitForTimeout(250);
  if (!open) errs.push('Enter on the start did not open the walk');
  res.after = await page.evaluate(() => ({ tab: document.getElementById('tagBucket').tabIndex, role: document.getElementById('tagBucket').getAttribute('role') }));
  if (res.after.tab !== -1 || res.after.role) errs.push('the start stays a button after the walk opened: ' + JSON.stringify(res.after));
  return JSON.stringify(res); }

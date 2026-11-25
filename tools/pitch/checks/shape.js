// A new window shape (Tom 11-25: a tiled window made full screen showed the phone's street through a laptop's window): the street is laid out once,
// for a phone or a laptop, so when the window crosses that line the walk reloads in the new shape, at the same place, without the bucket again.
async page => { const errs = [], res = { errs }; page.on('pageerror', e => errs.push(String(e)));
  const vp = page.viewportSize(), wide = vp.width / vp.height >= .8;
  await page.goto('__URL__');
  for (let i = 0; i < 80 && !(await page.evaluate(() => document.documentElement.dataset.readyAt)); i++) await page.waitForTimeout(250);
  await page.mouse.click(vp.width / 2, vp.height / 2);
  const open = async () => { for (let i = 0; i < 60; i++) { if (await page.evaluate(() => document.documentElement.style.overflow === '')) return true; await page.waitForTimeout(250); } return false; };
  if (!(await open())) errs.push('the walk did not open after the tip');
  const frac = () => page.evaluate(() => { const room = document.documentElement.scrollHeight - innerHeight; return scrollY / room; });
  await page.evaluate(() => scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * .4)); await page.waitForTimeout(600);
  res.before = { narrow: await page.evaluate(() => document.documentElement.dataset.narrow), at: +(await frac()).toFixed(3) };
  await page.setViewportSize(wide ? { width: 700, height: 1000 } : { width: 1000, height: 560 });
  let changed = false; for (let i = 0; i < 60 && !changed; i++) { await page.waitForTimeout(250); changed = await page.evaluate(n => document.documentElement.dataset.narrow !== n, res.before.narrow).catch(() => false); }
  if (!changed) errs.push('the street kept its old shape after the window changed shape');
  else { if (!(await open())) errs.push('the walk did not reopen by itself after the new shape'); await page.waitForTimeout(500);
    res.after = { narrow: await page.evaluate(() => document.documentElement.dataset.narrow), at: +(await frac()).toFixed(3) };
    if (Math.abs(res.after.at - res.before.at) > .06) errs.push('the walk reopened at another place: ' + res.before.at + ' -> ' + res.after.at); }
  await page.setViewportSize(vp);
  return JSON.stringify(res); }

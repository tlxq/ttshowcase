// Each wall paints once per visit: going back and forth shows the finished wall and its links at once.
async page => { const errs = [], res = { errs, walls: ["epaRadar", "raddavarfruberga"] };
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto('__URL__'); await page.waitForTimeout(3500); await page.keyboard.press('Enter'); await page.waitForTimeout(8000);
  const H2 = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight), END = await page.evaluate(() => +document.documentElement.dataset.svEnd), epa = Math.round(H2 * 128 / END), rvf = Math.round(H2 * 540 / END);
  const shown = ids => page.evaluate(ids => ids.every(i => document.getElementById('hot' + i).style.display === 'block'), ids);
  await page.evaluate(y => scrollTo(0, y), epa); await page.waitForTimeout(13500);
  if (!(await shown([0, 1]))) errs.push('epaRadar: links not shown 13.5 s after arriving');
  await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(1500); await page.evaluate(y => scrollTo(0, y), epa); await page.waitForTimeout(800);
  if (!(await shown([0, 1]))) errs.push('epaRadar: back again, links not shown within 0.8 s (painted twice?)');
  await page.evaluate(y => scrollTo(0, y), rvf); await page.waitForTimeout(14000);
  if (!(await shown([3]))) errs.push('raddavarfruberga: link not shown 14 s after arriving');
  await page.evaluate(y => scrollTo(0, y), epa); await page.waitForTimeout(1500); await page.evaluate(y => scrollTo(0, y), rvf); await page.waitForTimeout(800);
  if (!(await shown([3]))) errs.push('raddavarfruberga: back again, link not shown within 0.8 s (painted twice?)');
  return JSON.stringify(res); }

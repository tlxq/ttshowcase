// epaRadar's live numbers in painted digits (Tom 11-25): the site's /api/github answers with fixed counts (commits 346,
// merged pull requests 14), and both painted sprays must show exactly that number with paint on them. Then a load where
// the commits number is missing: that spray shows nothing (no number, no paint) and the other still shows its number. Run at 1440 x 900 and on a phone.
async page => { const errs = [], res = { errs };
  page.on('pageerror', e => errs.push(String(e)));
  let failCommits = false;
  // the site's own /api/github answers with the fixed counts; a failed number is null there (what api/github.ts sends when GitHub refuses)
  await page.route('**/api/github', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ epa: { commits: failCommits ? null : 346, merged: 14 } }) }));
  const sprays = async () => { for (let i = 0; i < 60; i++) { const s = await page.evaluate(() => window.sprayTest ? window.sprayTest() : null); if (s && s.every(p => p.shown != null || !failCommits) && (failCommits ? s[1].shown != null : s.every(p => p.shown != null))) return s; await page.waitForTimeout(250); }
    return page.evaluate(() => window.sprayTest ? window.sprayTest() : null); };
  await page.goto('__URL__'); res.both = await sprays();
  if (!res.both) errs.push('no window.sprayTest');
  else { const [c, m] = res.both;
    if (c.shown !== 346) errs.push(`commits spray shows ${c.shown}, not 346`); if (!(c.ink > 200)) errs.push(`commits spray has no paint (${c.ink} px)`);
    if (m.shown !== 14) errs.push(`merged spray shows ${m.shown}, not 14`); if (!(m.ink > 200)) errs.push(`merged spray has no paint (${m.ink} px)`); }
  failCommits = true; await page.goto('__URL__'); await page.waitForTimeout(1500); res.failed = await sprays();
  if (res.failed) { const [c, m] = res.failed;
    if (c.shown != null || c.ink > 0) errs.push(`commits fetch failed, yet its spray shows ${c.shown} with ${c.ink} px of paint`);
    if (m.shown !== 14) errs.push(`merged spray shows ${m.shown} when only commits failed`); }
  return JSON.stringify(res); }

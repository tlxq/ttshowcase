// epaRadar's live numbers in painted digits (Tom 11-25): GitHub answers with fixed counts (commits: the Link header's last page 346,
// merged pull requests: total_count 14), and both painted sprays must show exactly that number with paint on them. Then a load where
// the commits fetch fails: that spray shows nothing (no number, no paint) and the other still shows its number. Run at 1440 x 900 and on a phone.
async page => { const errs = [], res = { errs };
  page.on('pageerror', e => errs.push(String(e)));
  let failCommits = false;
  await page.route('https://api.github.com/**', route => { const u = route.request().url();
    if (/repos\/tlxq\/eparadar\/commits\?/.test(u)) return failCommits ? route.fulfill({ status: 500, body: '' })
      : route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', 'access-control-expose-headers': 'Link', link: '<https://api.github.com/repositories/1/commits?per_page=1&page=2>; rel="next", <https://api.github.com/repositories/1/commits?per_page=1&page=346>; rel="last"' }, body: '[{}]' });
    if (/search\/issues\?.*eparadar/.test(decodeURIComponent(u))) return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ total_count: 14, incomplete_results: false, items: [] }) });
    return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '[]' }); });
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

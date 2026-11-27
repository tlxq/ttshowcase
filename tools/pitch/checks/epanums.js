// The street's six live numbers in painted digits (Tom 11-27): epaRadar's commits, merged pull requests, tests and migrations, and raddavarfruberga's commits and merged pull requests,
// written on the street's one production from the site's /api/github (window.sprayTest: key, the number shown, the glyphs used, paint, how far it has faded in).
// Four loads, each after the bucket has tipped (the hand sheet comes after the tip), at 1440 x 900 and on a phone:
//  1 every number there: each note shows exactly its number with paint on it; none is drawn before the camera is at the wall, none of raddavarfruberga's at epaRadar's stop, each sprays in when it is on the screen on the way along the wall (sv 128 to 486);
//  2 epaRadar's commits null and the whole of rvf missing (no token): that one note and both rvf notes show nothing (no number, no paint, no lone word), the other epaRadar notes still show theirs;
//  3 migrations null, tests 0, merged pull requests 1, commits 4488: no "0", no "1 merged", no lone word; the digit that comes twice is its second form the second time (4, 4b, 8, 8b);
//  4 the answer fails (500): no note at all.
async page => { const errs = [], res = { errs }; page.on('pageerror', e => errs.push(String(e)));
  let answer = null; // null: the answer fails
  await page.route('**/api/github', route => answer ? route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(answer) }) : route.fulfill({ status: 500, body: 'no' }));
  const open = async () => { await page.goto('__URL__'); await page.waitForTimeout(3500);
    const b = await page.evaluate(() => window.bucketAt && window.bucketAt()); if (b && b.x > 0) await page.mouse.click(b.x, b.y);
    for (let i = 0; i < 40 && !(await page.evaluate(() => document.documentElement.style.overflow === '')); i++) await page.waitForTimeout(250); };
  const read = () => page.evaluate(() => window.sprayTest ? window.sprayTest() : null);
  const settle = async want => { let s = null; for (let i = 0; i < 80; i++) { s = await read(); if (s && s.length === 6 && want(s)) return s; await page.waitForTimeout(250); } return s; }; // the hand sheet and the answer arrive after the tip
  const by = s => Object.fromEntries((s || []).map(p => [p.key, p]));
  const full = { epa: { commits: 346, merged: 14, tests: 73, migrations: 6 }, rvf: { commits: 406, merged: 26 } };
  const want = (n, label, p, errs) => { if (!p) return errs.push(label + ': no such note'); if (p.shown !== n) errs.push(`${label} shows ${p.shown}, not ${n}`); if (!(p.ink > 200)) errs.push(`${label} has no paint (${p.ink} px)`); };
  const blank = (label, p, errs) => { if (!p) return errs.push(label + ': no such note'); if (p.shown != null || p.ink > 0 || p.used.length) errs.push(`${label} should show nothing, yet shows ${p.shown} with ${p.ink} px of paint and ${p.used.join(' ')}`); };
  // 1
  answer = full; await open(); let s = by(await settle(a => a.every(p => p.shown != null))); res.all = s;
  if (!Object.keys(s).length) errs.push('no window.sprayTest');
  else { for (const [k, n] of [['epa.commits', 346], ['epa.merged', 14], ['epa.tests', 73], ['epa.migrations', 6], ['rvf.commits', 406], ['rvf.merged', 26]]) want(n, k, s[k], errs);
    const early = Object.values(s).filter(p => p.op > 0.01).map(p => p.key); if (early.length) errs.push('written before its stop: ' + early.join(', '));
    const top = {}; for (const sv of [128, 240, 330, 400, 486]) { await page.evaluate(sv => scrollTo(0, svY(sv)), sv); await page.waitForTimeout(sv === 128 ? 6000 : 3500); const t = await read();
      for (const p of t) top[p.key] = Math.max(top[p.key] || 0, p.op); if (sv === 128) for (const p of t) if (p.key.startsWith('rvf.') && p.op > .01) errs.push(`${p.key} shows at epaRadar's stop`); }
    for (const k of Object.keys(s)) if (!(top[k] >= .99)) errs.push(`${k} never sprayed in on the way along the wall (most ${top[k]})`); res.sprayedMost = top; } // each note comes up when it is in the screen, on a laptop's two stops and on a phone's pan
  // 2
  answer = { epa: { commits: null, merged: 14, tests: 73, migrations: 6 } }; await open(); await page.waitForTimeout(1500); s = by(await settle(a => a.filter(p => p.shown != null).length === 3)); res.noCommitsNoRvf = s;
  blank('epa.commits (null)', s['epa.commits'], errs); for (const [k, n] of [['epa.merged', 14], ['epa.tests', 73], ['epa.migrations', 6]]) want(n, k + ' when only commits failed', s[k], errs); blank('rvf.commits (no rvf)', s['rvf.commits'], errs); blank('rvf.merged (no rvf)', s['rvf.merged'], errs);
  // 3
  answer = { epa: { commits: 4488, merged: 1, tests: 0, migrations: null }, rvf: { commits: 406, merged: 26 } }; await open(); await page.waitForTimeout(1500); s = by(await settle(a => a.filter(p => p.shown != null).length === 3)); res.edges = s;
  blank('epa.merged (1)', s['epa.merged'], errs); blank('epa.tests (0)', s['epa.tests'], errs); blank('epa.migrations (null)', s['epa.migrations'], errs);
  want(4488, 'epa.commits', s['epa.commits'], errs); if (s['epa.commits'] && s['epa.commits'].used.join(' ') !== '4 4b 8 8b commits') errs.push('4488 is drawn with ' + s['epa.commits'].used.join(' ') + ', not 4 4b 8 8b commits (a digit twice must not look the same)');
  // 4
  answer = null; await open(); await page.waitForTimeout(2500); s = by(await read()); res.failed = s;
  if (Object.keys(s).length !== 6) errs.push('no six notes to look at'); for (const k of Object.keys(s)) blank(k + ' (the answer failed)', s[k], errs);
  return JSON.stringify(res); }

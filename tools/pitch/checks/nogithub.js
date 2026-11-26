// No page asks GitHub itself (Tom 11-26). GitHub lets one visitor address make 60 anonymous asks an hour; past that the browser
// logged 403 errors in the console. The numbers come from this site's /api/github (api/github.ts), so no request may go to
// api.github.com or raw.githubusercontent.com from the paint page or the front, and the console stays free of errors.
async page => { const errs = [], res = { errs, github: [] };
  page.on('pageerror', e => errs.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('request', r => { if (/^https:\/\/(api\.github\.com|raw\.githubusercontent\.com)\//.test(r.url())) res.github.push(r.url()); });
  // the site's own route answers what GitHub would: the page gets its numbers without asking GitHub
  await page.route('**/api/github', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ epa: { commits: 346, merged: 14 }, dot: { commits: 9, tests: 3 } }) }));
  const paint = '__URL__', front = new URL('/front.html', paint).href;
  for (const url of [paint, front]) { await page.goto(url); await page.waitForTimeout(3000); }
  if (res.github.length) errs.push('the page asked GitHub itself: ' + res.github.slice(0, 3).join(', '));
  return JSON.stringify(res); }

// No 3D (Tom 11-24, audit 4d): a browser with WebGL turned off gets plain words and ways on, never a dead end (signum L1):
// the front (the same work without 3D), mail, GitHub and LinkedIn, each a 48 px tap, and no page error.
async page => { const W = page.viewportSize().width, errs = [], res = { errs };
  page.on('pageerror', e => errs.push(String(e)));
  await page.addInitScript(() => { const g = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (t, ...a) { return /webgl/i.test(t) ? null : g.call(this, t, ...a); }; });
  await page.goto('__URL__'); await page.waitForTimeout(2500);
  // the page names its icon (audit 4a, 11-25): without one a browser asks for /favicon.ico, which is a 404 and a console error
  res.icon = await page.evaluate(async () => { const l = document.querySelector('link[rel~="icon"]'); return l ? (await fetch(l.href)).status : 0; });
  if (res.icon !== 200) errs.push('the page names no icon that loads (a browser then asks for /favicon.ico, a 404): ' + res.icon);
  await page.screenshot({ path: '__SHOTS__pitch-' + W + '-nogl.png' });
  res.ways = await page.evaluate(() => [...document.querySelectorAll('.nogl a')].map(a => { const b = a.getBoundingClientRect(), top = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2);
    return { text: a.textContent, href: a.getAttribute('href'), h: Math.round(b.height), onTop: !!top && a.contains(top) }; }));
  const want = ['See the work without 3D', 'hello@ttdevs.com', 'GitHub ↗', 'LinkedIn ↗'];
  if (res.ways.map(w => w.text).join() !== want.join()) errs.push('without WebGL the walk does not offer the front, mail, GitHub and LinkedIn: ' + JSON.stringify(res.ways));
  if (res.ways.some(w => w.h < 48 || !w.onTop)) errs.push('a way on without WebGL is under 48 px or covered: ' + JSON.stringify(res.ways));
  return JSON.stringify(res); }

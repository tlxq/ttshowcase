// The walk's page info (Tom 11-25: "missing parts in titles, descriptions, favicon"): the same title, description and shared-link
// picture as the front (app/page.tsx), and its icons, so the walk can take the front's place at release.
async page => { const errs = [], res = { errs }; page.on('pageerror', e => errs.push(String(e)));
  await page.goto('__URL__'); await page.waitForTimeout(500);
  res.info = await page.evaluate(() => { const m = s => document.querySelector(s)?.getAttribute('content') || document.querySelector(s)?.getAttribute('href') || null;
    return { title: document.title, description: m('meta[name="description"]'), ogTitle: m('meta[property="og:title"]'), ogImage: m('meta[property="og:image"]'), card: m('meta[name="twitter:card"]'), icon: m('link[rel="icon"]'), apple: m('link[rel="apple-touch-icon"]') }; });
  const i = res.info;
  if (i.title !== 'Tom Larsson, product engineer') errs.push('the title is "' + i.title + '", not the front\'s');
  if (!i.description || i.description.length < 100) errs.push('no description of 100 characters or more (LinkedIn wants it): ' + i.description);
  if (i.ogTitle !== i.title) errs.push('the shared-link title differs from the title');
  if (!/^https:\/\/ttdevs\.com\/share\.jpg$/.test(i.ogImage || '')) errs.push('no shared-link picture: ' + i.ogImage);
  if (i.card !== 'summary_large_image') errs.push('no large link card');
  if (!i.icon || !i.apple) errs.push('an icon is missing: ' + JSON.stringify([i.icon, i.apple]));
  return JSON.stringify(res); }

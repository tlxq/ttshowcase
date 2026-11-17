// The opening wall's tags stay clear of the poured line and the labels (storyboard 1): at the first screen and once
// the line is poured, no tag's painted box may cross the line's clear box (WALL_TAGS.clear) or a showing label or link;
// the next morning (same wall) none may cross the tlxq tag or the form.
async page => { const W = page.viewportSize().width, H = page.viewportSize().height, errs = [], res = { errs };
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); page.on('pageerror', e => errs.push(String(e)));
  const look = where => page.evaluate(where => {
    const { tags, clear, tlxq } = wallTagsOnScreen(), out = [];
    const box = q => { const xs = q.map(p => p[0]), ys = q.map(p => p[1]); return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]; };
    const cross = (a, b) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
    const onScreen = b => b[2] > 0 && b[0] < innerWidth && b[3] > 0 && b[1] < innerHeight;
    const shows = e => +getComputedStyle(e).opacity > .05 && e.getBoundingClientRect().width > 0;
    const plates = [...document.querySelectorAll('.hud .tag, .hud a, .mail')].filter(shows).map(e => { const r = e.getBoundingClientRect(); return { name: e.id || e.textContent.trim().slice(0, 24), b: [r.left, r.top, r.right, r.bottom] }; });
    const line = box(clear);
    tags.forEach((q, i) => { const b = box(q); if (!onScreen(b)) return;
      if (where !== 'first' && cross(b, line)) out.push(where + ': tag ' + i + ' touches the poured line');
      if (where === 'morning' && cross(b, box(tlxq))) out.push(where + ': tag ' + i + ' touches the tlxq tag');
      plates.forEach(p => { if (cross(b, p.b)) out.push(where + ': tag ' + i + ' touches the label "' + p.name + '"'); }); });
    return { out, seen: tags.map(box).filter(onScreen).length, plates: plates.length }; }, where);
  await page.goto('__URL__'); await page.waitForTimeout(3500);
  let r = await look('first'); errs.push(...r.out); res.first = r.seen;
  await page.mouse.click(W / 2, H / 2);
  for (let i = 0; i < 40 && !(await page.evaluate(() => document.documentElement.style.overflow === '')); i++) await page.waitForTimeout(250);
  await page.waitForTimeout(6000);
  r = await look('poured'); errs.push(...r.out); res.poured = r.seen; if (!r.plates) errs.push('poured: no label showed, so none was tested');
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  for (let i = 0; i < 40 && !(await page.evaluate(() => document.getElementById('mail').classList.contains('on'))); i++) await page.waitForTimeout(250);
  await page.waitForTimeout(800);
  r = await look('morning'); errs.push(...r.out); res.morning = r.seen; if (!r.plates) errs.push('morning: the form did not show, so it was not tested');
  if (!res.first) errs.push('no tag shows on the first screen');
  if (res.poured < 4) errs.push('only ' + res.poured + ' tags show once the line is poured');
  await page.screenshot({ path: '__SHOTS__pitch-' + W + '-walltags.png' });
  return JSON.stringify(res); }

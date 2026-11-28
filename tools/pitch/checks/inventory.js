// What is in the scene (batch 9): the walk lists its lights and its named objects (window.sceneInventory, pitch/paint/40-moments.js) and the list is compared with the committed one (tools/pitch/scene.json), for a laptop and for a phone.
// A light or a named object that is gone fails (the back door's lamp sat inside a comment for five rounds of the building site and nobody saw it), and so does a new one, until scene.json is updated in the same PR, so the change is seen and reviewed.
// To update: copy the "now" list from this check's output into tools/pitch/scene.json under "laptop" or "phone".
async page => { const W = page.viewportSize().width, screen = W < 600 ? 'phone' : 'laptop', errs = [], res = { errs };
  const WANT = __SCENE__[screen]; res.screen = screen;
  page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto('__URL__'); await page.waitForTimeout(3500);
  const now = await page.evaluate(() => window.sceneInventory());
  if (!WANT) errs.push('tools/pitch/scene.json has no list for ' + screen);
  else for (const kind of ['lights', 'named']) {
    const left = [...now[kind]], gone = [];
    for (const w of WANT[kind] || []) { const i = left.indexOf(w); if (i < 0) gone.push(w); else left.splice(i, 1); }
    if (gone.length) errs.push(screen + ': gone from the scene (' + kind + '): ' + gone.join(', ') + '. If it left on purpose, take it out of tools/pitch/scene.json in this PR');
    if (left.length) errs.push(screen + ': new in the scene (' + kind + '): ' + left.join(', ') + '. Add it to tools/pitch/scene.json in this PR, so the new light is seen');
  }
  if (errs.length) res.now = now; // for the update of scene.json
  return JSON.stringify(res) }

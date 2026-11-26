// What the bucket waits for (plan zesty-squishing-hippo, Track B): the bytes the page has fetched, and the ms it took, when the bucket is full and can be
// tipped (dataset.readyAt). Only the start set counts: the start wall, the street, epaRadar, raddavarfruberga. Everything else loads after the tip.
// The limits are tools/walk/budget.json's "pitchStart" (desktop or phone), put in by run.sh. Bytes are as served by the plain server (no compression).
async page => { const errs = [], res = { errs }, B = __BUDGET__; page.on('pageerror', e => errs.push(String(e)));
  await page.goto('__URL__');
  let ready = 0; for (let i = 0; i < 400 && !(ready = await page.evaluate(() => +document.documentElement.dataset.readyAt || 0)); i++) await page.waitForTimeout(50);
  const m = await page.evaluate(() => { const rs = performance.getEntriesByType('resource'); let bytes = 0; const big = [];
    for (const r of rs) { const b = r.encodedBodySize || r.transferSize || 0; bytes += b; big.push([b, r.name.replace(/^.*\/(assets\/)?/, '')]); }
    big.sort((a, b) => b[0] - a[0]); return { bytes, requests: rs.length, top: big.slice(0, 6).map(x => x[1] + ' ' + x[0]) }; });
  res.bytes = m.bytes; res.requests = m.requests; res.readyMs = ready; res.top = m.top;
  const L = B[innerWidthKind(await page.evaluate(() => innerWidth))];
  if (!ready) errs.push('the bucket was never ready');
  if (L && m.bytes > L.bytes) errs.push('the bucket waited for ' + m.bytes + ' bytes, over the budget of ' + L.bytes);
  if (L && ready > L.ms) errs.push('the bucket was ready after ' + ready + ' ms, over the budget of ' + L.ms);
  return JSON.stringify(res);
  function innerWidthKind(w) { return w < 800 ? 'phone' : 'desktop'; } }

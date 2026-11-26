// What the bucket waits for (plan zesty-squishing-hippo, Track B): the bytes the page has fetched, and the ms it took, when the bucket is full and can be
// tipped (dataset.readyAt). Only the start set counts: the start wall, the street, epaRadar, raddavarfruberga. Everything else loads after the tip.
// Two loads: on a fast line (bytes and ms), and on a phone's line (1 MB/s, 100 ms away, a CPU six times slower, nothing cached; slowMs). The fast line's ms is mostly the
// bucket's own filling (about 2.2 s); the phone's line is where the bytes show. The limits are tools/walk/budget.json's "pitchStart" (desktop or phone), put in by run.sh.
// Bytes are as served by the plain server (no compression).
async page => { const errs = [], res = { errs }, B = __BUDGET__; page.on('pageerror', e => errs.push(String(e)));
  const measure = async () => { let ready = 0; for (let i = 0; i < 600 && !(ready = await page.evaluate(() => +document.documentElement.dataset.readyAt || 0)); i++) await page.waitForTimeout(50);
    const m = await page.evaluate(() => { const rs = performance.getEntriesByType('resource'); let bytes = 0; const big = [];
      for (const r of rs) { const b = r.encodedBodySize || r.transferSize || 0; bytes += b; big.push([b, r.name.replace(/^.*\/(assets\/)?/, '')]); }
      big.sort((a, b) => b[0] - a[0]); return { bytes, requests: rs.length, top: big.slice(0, 12).map(x => x[1] + ' ' + x[0]) }; });
    return { ready, ...m }; };
  await page.goto('__URL__');
  const fast = await measure(); res.bytes = fast.bytes; res.requests = fast.requests; res.readyMs = fast.ready; res.top = fast.top;
  const cdp = await page.context().newCDPSession(page); await cdp.send('Network.enable'); await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 100, downloadThroughput: 1000000, uploadThroughput: 250000 }); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 });
  await page.goto('__URL__'); const slow = await measure(); res.slowMs = slow.ready; res.slowBytes = slow.bytes;
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 }); await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  const L = B[page.viewportSize().width < 800 ? 'phone' : 'desktop'];
  if (!fast.ready || !slow.ready) errs.push('the bucket was never ready');
  if (L && fast.bytes > L.bytes) errs.push('the bucket waited for ' + fast.bytes + ' bytes, over the budget of ' + L.bytes);
  if (L && fast.ready > L.ms) errs.push('the bucket was ready after ' + fast.ready + ' ms, over the budget of ' + L.ms);
  if (L && slow.ready > L.slowMs) errs.push('on a phone\'s line the bucket was ready after ' + slow.ready + ' ms, over the budget of ' + L.slowMs);
  return JSON.stringify(res); }

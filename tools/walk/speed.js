async page=>{ const errs=[], res={errs};
 // Speed budget for /look: bytes by kind, requests, largest contentful paint and blocking time, each against tools/walk/budget.json.
 // Weight is exact. The timings come from a browser with no graphics card, so they prove weight and script cost, never smoothness.
 // The limits are in tools/walk/budget.json (run.sh puts them in here); without limits the walk only prints the numbers.
 await page.addInitScript(()=>{ window.__lcp=0; window.__long=[]; window.__fcp=0;
  new PerformanceObserver(l=>{for(const e of l.getEntries()) window.__lcp=e.startTime}).observe({type:'largest-contentful-paint',buffered:true});
  new PerformanceObserver(l=>{for(const e of l.getEntries()) window.__long.push([e.startTime,e.duration])}).observe({type:'longtask',buffered:true});
  new PerformanceObserver(l=>{for(const e of l.getEntries()) if(e.name==='first-contentful-paint') window.__fcp=e.startTime}).observe({type:'paint',buffered:true}); });
 // Paint and blocking time are the page's load, as browsers count them (they stop at the first
 // scroll): taken before the walk down, so a longer page isn't counted as a slower one. Headless
 // timings jump between loads (paint 116-160 ms on the same build), so the page loads three times
 // and the middle value counts.
 const loads=[], cdp=await page.context().newCDPSession(page);
 for(let i=0;i<3;i++){
  await cdp.send('Network.clearBrowserCache'); // each load is a first visit
  await page.goto('__WALK_URL__/'); await page.waitForTimeout(4000);
  loads.push(await page.evaluate(()=>{ const fcp=window.__fcp;
   return {lcp:Math.round(window.__lcp),tbt:Math.round(window.__long.filter(([s])=>s>=fcp).reduce((a,[,d])=>a+Math.max(0,d-50),0))}}));
 }
 const mid=k=>loads.map(l=>l[k]).sort((a,b)=>a-b)[1];
 const load={lcp:mid('lcp'),tbt:mid('tbt')};
 // Down the whole page once, so pictures that load as they come near are counted too.
 const height=await page.evaluate(()=>document.documentElement.scrollHeight), vh=await page.evaluate(()=>innerHeight);
 for(let y=0;y<=height;y+=Math.round(vh*0.6)){ await page.evaluate(y=>window.scrollTo(0,y),y); await page.waitForTimeout(250); }
 await page.waitForTimeout(1500);
 const m=await page.evaluate(()=>{
  const kind=u=>{const p=new URL(u).pathname.toLowerCase();
   if(/\.(js|mjs)$/.test(p)) return 'js'; if(/\.css$/.test(p)) return 'css'; if(/\.(woff2?|ttf|otf)$/.test(p)) return 'font';
   if(/\.(png|jpe?g|webp|avif|gif|svg|ico)$/.test(p)) return 'image'; if(/\.(mp4|webm)$/.test(p)) return 'film'; return 'other'};
  const nav=performance.getEntriesByType('navigation')[0];
  const all=[{name:nav.name,transferSize:nav.transferSize,encodedBodySize:nav.encodedBodySize},...performance.getEntriesByType('resource')];
  const bytes={js:0,css:0,font:0,image:0,film:0,html:0,other:0}; let n=0;
  for(const e of all){ const b=e.transferSize||e.encodedBodySize||0; n++;
   const k=e===all[0]?'html':kind(e.name); bytes[k]+=b; }
  return {bytes,total:Object.values(bytes).reduce((a,b)=>a+b,0),requests:n}});
 res.now={...m.bytes,total:m.total,requests:m.requests,lcpMs:load.lcp,tbtMs:load.tbt};
 const budget=__BUDGET__;
 if(!budget.limits) { res.note='no budget yet: these are the numbers to record'; return JSON.stringify(res); }
 res.limits=budget.limits;
 const names={js:'script bytes',css:'style bytes',font:'font bytes',image:'image bytes',film:'film bytes',html:'html bytes',other:'other bytes',total:'total bytes',requests:'requests',lcpMs:'largest contentful paint ms',tbtMs:'blocking time ms'};
 for(const k of Object.keys(res.now)) if(budget.limits[k]!=null && res.now[k]>budget.limits[k]) errs.push(names[k]+' '+res.now[k]+' is over the budget '+budget.limits[k]);
 return JSON.stringify(res); }

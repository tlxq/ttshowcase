async page=>{ const errs=[], res={errs};
 // Accessibility: axe-core on the built front page and /wall (at this width), then again with reduced motion.
 // Serious and critical findings fail the walk; lesser ones are only listed.
 res.found={};
 // The 404 page (a static host serves it at /404.html) has a tab title of its own, not the bare address.
 await page.goto('__WALK_URL__/404.html'); await page.waitForTimeout(800);
 res.notFoundTitle=await page.title();
 if(res.notFoundTitle!=='Page not found · Tom Larsson') errs.push('the 404 page title is "'+res.notFoundTitle+'"');
 if(!(await page.evaluate(()=>/Nothing painted here/.test(document.body.innerText)))) errs.push('/404.html is not the 404 page');
 res.notFound=await page.evaluate(()=>{ const ways=[...document.querySelectorAll('main a')], a=ways[0], r=a&&a.getBoundingClientRect(), p=document.querySelector('.lk-missing-path span'), s=p&&getComputedStyle(p);
  return {ways:ways.map(w=>w.textContent.trim()), tapH:r&&Math.round(r.height), labelPx:a&&parseFloat(getComputedStyle(a).fontSize), struck:!!s&&s.textDecorationLine==='line-through', addressPx:s&&parseFloat(s.fontSize), sayPx:parseFloat(getComputedStyle(document.querySelector('.lk-missing-say')).fontSize), noBar:!p||getComputedStyle(p,'::after').content==='none', hasTag:!!document.querySelector('.lk-missing-tag svg, .lk-missing-tag canvas, .lk-missing-tag img, .lk-missing-tag [data-hand]')}; });
 if(res.notFound.ways.join()!=='Back to the start'||res.notFound.tapH<48||res.notFound.labelPx<13||!res.notFound.struck||res.notFound.addressPx<13||res.notFound.sayPx<13) errs.push('the 404 page has not one "Back to the start" of 48 px, a struck address and 13 px text: '+JSON.stringify(res.notFound));
 if(!res.notFound.noBar) errs.push('the 404 address still has a bar over its letters');
 const run=async(label)=>{
  for(const p of ['/','/wall.html','/404.html']){
   await page.goto('__WALK_URL__'+p); await page.waitForTimeout(2500);
   // axe goes in by evaluate, not as a script tag: the page's CSP (no inline scripts) blocks a tag but not the test runner
   await page.evaluate(__AXE_SOURCE__);
   const r=await page.evaluate(async()=>{const o=await axe.run(document,{resultTypes:['violations','passes']});
    window.__passes=o.passes.length;
    return o.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.length,first:v.nodes[0].target.join(' ').slice(0,80)}))});
   const passes=await page.evaluate(()=>window.__passes); res.checked=(res.checked||[]); res.checked.push(label+' '+p+' w'+(await page.evaluate(()=>innerWidth))+' passes '+passes);
   if(!(passes>20)) errs.push(label+' '+p+': axe checked too little ('+passes+' rules passed)');
   res.found[label+' '+p]=r.map(v=>v.impact+' '+v.id+' x'+v.nodes+' ('+v.first+')');
   for(const v of r.filter(v=>v.impact==='serious'||v.impact==='critical')) errs.push(label+' '+p+': '+v.id+' ('+v.impact+', '+v.nodes+' places, first '+v.first+')');
  }
 };
 await run('motion');
 await page.emulateMedia({reducedMotion:'reduce'});
 await run('reduced');
 return JSON.stringify(res); }

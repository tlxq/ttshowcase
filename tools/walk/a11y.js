async page=>{ const errs=[], res={errs};
 // Accessibility: axe-core on the built front page and /wall (at this width), then again with reduced motion.
 // Serious and critical findings fail the walk; lesser ones are only listed.
 res.found={};
 // The 404 page (a static host serves it at /404.html) has a tab title of its own, not the bare address.
 await page.goto('__WALK_URL__/404.html'); await page.waitForTimeout(800);
 res.notFoundTitle=await page.title();
 if(res.notFoundTitle!=='Page not found, Tom Larsson') errs.push('the 404 page title is "'+res.notFoundTitle+'"');
 if(!(await page.evaluate(()=>/Nothing painted here/.test(document.body.innerText)))) errs.push('/404.html is not the 404 page');
 const run=async(label)=>{
  for(const p of ['/','/wall.html','/404.html']){
   await page.goto('__WALK_URL__'+p); await page.waitForTimeout(2500);
   await page.addScriptTag({path:'__AXE__'});
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

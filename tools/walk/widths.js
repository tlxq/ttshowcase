async page=>{ const errs=[], res={errs};
 // The in-between widths (F-c8-13): a tablet standing up (768 x 1024) and lying down (1024 x 768), and a phone (390 x 844).
 // At each: nothing makes the page scroll sideways, the first screen's lead and cue do not sit on each other,
 // the Tom and Live words stay inside the screen and their own boxes, and every project name fits inside the cut
 // that crops it (its width, so it holds while the name is still tipped back). Proves layout only, never how it feels.
 page.on('pageerror',e=>errs.push('page error: '+e.message));
 res.sizes={};
 for(const [w,h] of [[768,1024],[1024,768],[390,844]]){
  const key=w+'x'+h, bad=[]; res.sizes[key]=bad;
  await page.setViewportSize({width:w,height:h}); await page.goto('__WALK_URL__/'); await page.waitForTimeout(1500);
  const total=await page.evaluate(()=>document.documentElement.scrollHeight);
  for(let y=0;y<=total;y+=Math.round(h*0.6)){
   await page.evaluate(y=>window.scrollTo(0,y),y); await page.waitForTimeout(300);
   const left=await page.evaluate(()=>{const s=document.scrollingElement;s.scrollLeft=60;const l=s.scrollLeft;s.scrollLeft=0;return l});
   if(left>0){ bad.push('scrolls sideways at '+y); break; }
  }
  const hit=await page.evaluate(()=>{
   const out=[], W=innerWidth, box=e=>e.getBoundingClientRect();
   const lead=document.querySelector('.lk-lead'), cue=document.querySelector('.lk-cue');
   if(lead&&cue&&getComputedStyle(cue).display!=='none'){const a=box(lead),b=box(cue);
    // the lead's text, not its wide box: measure the lines it really fills
    const r=document.createRange();r.selectNodeContents(lead);const t=r.getBoundingClientRect();
    if(t.left<b.right&&t.right>b.left&&t.top<b.bottom&&t.bottom>b.top) out.push('the lead sits on "'+cue.textContent.trim().slice(0,20)+'"');}
   // Words that run past their own box or past the screen's edge
   for(const e of document.querySelectorAll('.lk-hero h1,.lk-tom h2,.lk-run-words,.lk-tom-about,.lk-tom-stack li')){
    const b=box(e), label=e.className||e.tagName;
    if(!e.matches('h1,h2')&&e.scrollWidth>e.clientWidth+6) out.push(label+' runs past its box ('+e.scrollWidth+' > '+e.clientWidth+')');
    if(b.right>W+1||b.left<-1) out.push(label+' is outside the screen ('+Math.round(b.left)+'..'+Math.round(b.right)+')');
    const r=document.createRange();r.selectNodeContents(e);const t=r.getBoundingClientRect();
    if(t.width&&(t.right>W+1||t.left<-1)) out.push(label+' text is outside the screen ('+Math.round(t.left)+'..'+Math.round(t.right)+')');
   }
   // A project name wider than the cut that crops it loses its last letter
   for(const c of document.querySelectorAll('.lk-run-cut')){const w=c.querySelector('.lk-run-word');
    if(w&&w.scrollWidth>c.clientWidth+1) out.push('the name '+(c.querySelector('.lk-run-paint')||c).textContent.trim()+' is cut ('+w.scrollWidth+' > '+c.clientWidth+')');}
   return [...new Set(out)];
  });
  bad.push(...hit);
  if(bad.length) errs.push(key+': '+bad.join('; '));
 }
 await page.setViewportSize({width:1440,height:900});
 return JSON.stringify(res); }

async page=>{ const errs=[], res={errs};
 // The line keeps clear (look rule: 16 px from words): at five sizes, with everything at rest, the
 // one line's ink stays at least 16 px from every word, picture, screen, note, field and button on
 // the page. Only where the line starts (the tag) and ends (the signature) may it touch.
 // At rest = reduced motion: every part has risen, the handwriting is written and the line is drawn
 // whole, so the whole page is measured in one go. Proves where things rest, never how they move.
 // Known spots, found when the walk was made (11-15) and waiting for their own fix: shown in the
 // result, never a failure. One that is clear now fails too, so it leaves this list once fixed.
 const KNOWN=[
  {what:'"my daily tools"', sizes:['1440x900','1280x800','1024x768','768x1024','390x844'], id:'F-cl-1 the line runs through the hand note'},
  {what:'"Screens,"', sizes:['1024x768','390x844'], id:'F-cl-2 the comma close to the line'},
 ];
 page.on('pageerror',e=>errs.push('page error: '+e.message));
 await page.emulateMedia({reducedMotion:'reduce'});
 res.closest={}; res.known=[];
 for(const [w,h] of [[1440,900],[1280,800],[1024,768],[768,1024],[390,844]]){
  const key=w+'x'+h;
  await page.setViewportSize({width:w,height:h}); await page.goto('__WALK_URL__/'); await page.waitForTimeout(1500);
  const found=await page.evaluate(()=>{
   const CLEAR=16, path=document.querySelector('.lk-path');
   if(!path) return {bad:['the line is not on the page'],min:null};
   const half=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--look-line'))/2||0;
   // The line's points on the page, every 4 px along it
   const m=path.getScreenCTM(), L=path.getTotalLength(), pts=[];
   for(let a=0;a<=L;a+=4){const p=path.getPointAtLength(a);
    pts.push([m.a*p.x+m.c*p.y+m.e+scrollX, m.b*p.x+m.d*p.y+m.f+scrollY]);}
   // Everything the line must keep clear of, as page boxes: lines of text, pictures, screens, notes, fields, buttons
   const skip=e=>e.closest('.lk-line,.lk-tag,[data-line-end],.lk-ask-who')||
    !e.checkVisibility({opacityProperty:true,visibilityProperty:true})||
    (()=>{for(let a=e;a;a=a.parentElement){const p=getComputedStyle(a).position;if(p==='fixed'||p==='sticky')return true;}return false})();
   const label=e=>{const el=e.nodeType===3?e.parentElement:e;
    const t=(e.textContent||'').trim().replace(/\s+/g,' ').slice(0,24);
    const c=String(el.getAttribute('class')||'').split(' ').filter(Boolean).slice(0,2).join('.');
    const where=el.closest('[aria-label],section[id]');
    return (c?'.'+c:el.tagName.toLowerCase())+(t?' "'+t+'"':el.getAttribute('aria-label')?' "'+el.getAttribute('aria-label')+'"':'')+(where?.id?' in #'+where.id:'');};
   const boxes=[];
   const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
   for(let n=walker.nextNode();n;n=walker.nextNode()){
    if(!n.textContent.trim()||skip(n.parentElement)||n.parentElement.closest('svg')) continue;
    const r=document.createRange(); r.selectNodeContents(n);
    for(const b of r.getClientRects()) if(b.width&&b.height) boxes.push([b,n]);
   }
   for(const e of document.querySelectorAll('img,video,iframe,input,textarea,button,a,svg,.lk-case-stage')){
    if(skip(e)||(e.matches('svg')&&e.parentElement.closest('svg'))) continue;
    // A drawing (a hand note, an icon) by its strokes, not its box: a tilted note's box is mostly empty
    const parts=e.matches('svg')?[...e.querySelectorAll('path,text,circle,rect,line,polyline,polygon,ellipse')]:[];
    if(parts.length){ for(const s of parts){const b=s.getBoundingClientRect(); if(b.width||b.height) boxes.push([b,e]);} continue; }
    const b=e.getBoundingClientRect(); if(b.width&&b.height) boxes.push([b,e]);
   }
   const worst=new Map(); let min=Infinity;
   for(const [b,e] of boxes){
    const l=b.left+scrollX, r=b.right+scrollX, t=b.top+scrollY, d=b.bottom+scrollY;
    let near=Infinity, at=null;
    for(const [x,y] of pts){
     const dx=Math.max(l-x,0,x-r), dy=Math.max(t-y,0,y-d), g=Math.hypot(dx,dy);
     if(g<near){near=g;at=[x,y];}
    }
    const gap=near-half; min=Math.min(min,gap);
    // Each thing once, at its closest
    if(gap<CLEAR&&!(worst.get(e)?.gap<=gap)) worst.set(e,{gap,at});
   }
   const bad=[...worst].map(([e,{gap,at}])=>label(e)+' '+gap.toFixed(0)+' px from the line at '+Math.round(at[0])+','+Math.round(at[1]));
   return {bad,min:Math.round(min)};
  });
  const known=k=>KNOWN.find(n=>n.sizes.includes(key)&&k.includes(n.what));
  const fresh=found.bad.filter(b=>!known(b));
  for(const b of found.bad) if(known(b)) res.known.push(key+' '+known(b).id+': '+b);
  for(const n of KNOWN) if(n.sizes.includes(key)&&!found.bad.some(b=>b.includes(n.what)))
   errs.push(key+': '+n.id+' is clear now, take it off the known list in clearance.js');
  res.closest[key]=found.min;
  if(fresh.length) errs.push(key+': '+fresh.join('; '));
 }
 await page.emulateMedia({reducedMotion:null});
 await page.setViewportSize({width:1440,height:900});
 return JSON.stringify(res); }

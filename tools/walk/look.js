async page=>{ const errs=[], res={errs};
 // The new look (/look): every part there, nothing sideways, every hand piece written once passed,
 // the names open onto their pictures, and the one line ends in Tom's signature. Then the same page
 // with reduced motion shows everything at once.
 page.on('pageerror',e=>errs.push('page error: '+e.message));
 let standIn=false; // the mail form's stood-in server answers 502 on purpose once
 page.on('console',m=>{ if(m.type()==='error'&&!(standIn&&/502/.test(m.text()))) errs.push('console: '+m.text()); });
 const go=async()=>{ await page.goto('__WALK_URL__/'); await page.waitForTimeout(1500); };
 await go();
 // A shared link shows the share card: the page names it, and it is there.
 res.card=await page.evaluate(async()=>{const m=document.querySelector('meta[property="og:image"]');if(!m) return null;
  const r=await fetch(new URL(m.content).pathname);return {status:r.status,type:r.headers.get('content-type')}});
 if(!res.card) errs.push('no share card named'); else if(res.card.status!==200) errs.push('the share card is missing ('+res.card.status+')');
 // Away from the tab, the icon drips (its picture is swapped through the build's frames) and the title stays;
 // back, the clean icon is back.
 const away=async hidden=>{await page.evaluate(h=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>h});document.dispatchEvent(new Event('visibilitychange'))},hidden)};
 const icon=()=>page.evaluate(()=>document.querySelector('link[rel~="icon"][type="image/svg+xml"]')?.getAttribute('href'));
 res.drip={title:await page.title(),clean:await icon()}; await away(true); await page.waitForTimeout(300);
 res.drip.first=await icon(); await page.waitForTimeout(3600); res.drip.last=await icon(); res.drip.titleAway=await page.title();
 await away(false); res.drip.back=await icon();
 if(res.drip.first===res.drip.clean||!/icon-drip\/\d+\.svg/.test(res.drip.first||'')) errs.push('the icon did not start to drip when away: '+res.drip.first);
 if(res.drip.last!=='/icon-drip/8.svg') errs.push('the drip did not run to its end and hold: '+res.drip.last);
 if(res.drip.back!==res.drip.clean) errs.push('the clean icon did not come back: '+res.drip.back);
 if(res.drip.titleAway!==res.drip.title) errs.push('the title changed when away');
 res.drip.frames=await page.evaluate(async()=>Promise.all([1,8].map(n=>fetch('/icon-drip/'+n+'.svg').then(r=>r.status))));
 if(res.drip.frames.some(s=>s!==200)) errs.push('a drip picture is missing');
 res.parts=await page.evaluate(()=>['tom','live','experiments','questions'].filter(id=>!document.getElementById(id)));
 if(res.parts.length) errs.push('parts missing: '+res.parts.join(', '));


 // Writing to Tom: the header's Email me goes to the mail form, the only way to write (Tom 11-15).
 // The form is sent with the server stood in for: a failure keeps what was written, then it sends.
 res.mail=await page.evaluate(()=>({pill:document.querySelector('.lk-head a.lk-pill')?.getAttribute('href'),mailto:document.querySelectorAll('a[href^="mailto:"]').length,rows:document.querySelectorAll('#write .lk-mail-row').length}));
 if(res.mail.pill!=='#write'||res.mail.mailto||res.mail.rows!==3) errs.push('the way to write is wrong: '+JSON.stringify(res.mail));
 let answer={status:502,body:'{"error":"mail-service"}'};standIn=true;
 await page.route('**/api/contact',r=>r.fulfill({status:answer.status,contentType:'application/json',body:answer.body}));
 await page.fill('#write input[name=name]','Walk');await page.fill('#write input[name=email]','walk@example.com');await page.fill('#write textarea[name=message]','A message from the walk.');
 await page.click('#write .lk-mail-send');await page.waitForSelector('#write .lk-mail-error',{timeout:5000}).catch(()=>{});
 res.mail.failed=await page.evaluate(()=>({error:!!document.querySelector('#write .lk-mail-error'),kept:document.querySelector('#write textarea')?.value,button:document.querySelector('#write .lk-mail-send')?.textContent}));
 if(!res.mail.failed.error||res.mail.failed.kept!=='A message from the walk.'||!/try again/.test(res.mail.failed.button||'')) errs.push('a failed send does not say so or loses the message: '+JSON.stringify(res.mail.failed));
 const before=await page.evaluate(()=>document.querySelector('#write').offsetHeight);
 answer={status:200,body:'{"sent":true}'};standIn=false;
 await page.click('#write .lk-mail-send');await page.waitForSelector('#write .lk-mail-sent',{timeout:5000}).catch(()=>{});
 res.mail.sent=await page.evaluate(()=>({text:document.querySelector('#write .lk-mail-sent p')?.textContent,height:document.querySelector('#write').offsetHeight}));
 if(!/write back to walk@example\.com/.test(res.mail.sent.text||'')) errs.push('the sent note is missing: '+res.mail.sent.text);
 if(res.mail.sent.height<before) errs.push('the page jumps when the form is sent: '+before+' -> '+res.mail.sent.height);
 await page.unroute('**/api/contact');
 res.codeLinks=await page.evaluate(()=>['tlxq/eparadar','tlxq/tthermal'].filter(r=>!document.querySelector('a[href="https://github.com/'+r+'"]')));
 if(res.codeLinks.length) errs.push('no code link for: '+res.codeLinks.join(', '));
 res.deadLinks=await page.evaluate(()=>[...document.querySelectorAll('a[href^="#"]')].map(a=>a.getAttribute('href')).filter(h=>h.length>1&&!document.querySelector(h)));
 if(res.deadLinks.length) errs.push('links to nothing: '+res.deadLinks.join(', '));
 // Down the page in screen-high steps, as a visitor scrolls, checking for sideways room on the way.
 const height=await page.evaluate(()=>document.documentElement.scrollHeight), vh=await page.evaluate(()=>innerHeight);
 res.sideways=[];
 for(let y=0;y<=height;y+=Math.round(vh*0.6)){
  await page.evaluate(y=>window.scrollTo(0,y),y); await page.waitForTimeout(450);
  const left=await page.evaluate(()=>{const s=document.scrollingElement;s.scrollLeft=60;const l=s.scrollLeft;s.scrollLeft=0;return l});
  if(left>0) res.sideways.push(y);
 }
 if(res.sideways.length) errs.push('scrolls sideways at '+res.sideways.slice(0,5).join(', '));
 await page.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight)); await page.waitForTimeout(6000);
 // Every hand piece written in scroll mode has reached its own end (its --t is its data-write ms).
 res.unwritten=await page.evaluate(()=>[...document.querySelectorAll('svg[data-write]')].filter(s=>parseFloat(s.style.getPropertyValue('--t'))<Number(s.dataset.write)-5).map(s=>s.getAttribute('aria-label')||s.getAttribute('class')));
 if(res.unwritten.length) errs.push('not written after scrolling past: '+res.unwritten.join(', '));
 res.names=await page.evaluate(()=>[...document.querySelectorAll('.lk-run-photo')].map(e=>Number(getComputedStyle(e).opacity)));
 if(res.names.some(o=>o<0.99)) errs.push('a name did not open onto its picture: '+res.names.join(' '));
 // The line is drawn to its end, and its end is where the signature starts.
 res.line=await page.evaluate(()=>{const p=document.querySelector('.lk-ink');const s=document.querySelector('[data-line-end]');if(!p||!s) return null;
  const end=p.getPointAtLength(p.getTotalLength());const host=p.ownerSVGElement.getBoundingClientRect();const b=s.getBoundingClientRect();
  const sx=b.left+Number(s.dataset.startX)*b.width-host.left, sy=b.top+Number(s.dataset.startY)*b.height-host.top;
  return {offset:Number(p.style.strokeDashoffset||1),gap:Math.round(Math.hypot(end.x-sx,end.y-sy))}});
 if(!res.line) errs.push('no line or no signature');
 else { if(res.line.offset>0.01) errs.push('the line is not drawn to its end ('+res.line.offset+')'); if(res.line.gap>3) errs.push('the line ends '+res.line.gap+' px from the signature'); }
 await page.screenshot({path:'__SHOTS__look-end.png'});
 // Reduced motion: everything is there at once, nothing waits on the scroll.
 await page.emulateMedia({reducedMotion:'reduce'}); await go(); await page.waitForTimeout(800);
 res.still=await page.evaluate(()=>({rise:[...document.querySelectorAll('[data-rise]')].filter(e=>Number(e.style.getPropertyValue('--rise'))<0.99).length,
  line:Number(document.querySelector('.lk-ink')?.style.strokeDashoffset||1)}));
 if(res.still.rise) errs.push(res.still.rise+' pieces still hidden with reduced motion');
 if(res.still.line>0.01) errs.push('the line is not whole with reduced motion');
 // With reduced motion the drip is one still picture, at once.
 await away(true); await page.waitForTimeout(300); res.drip.still=await icon(); await page.waitForTimeout(800); res.drip.stillLater=await icon(); await away(false);
 if(res.drip.still!=='/icon-drip/8.svg'||res.drip.stillLater!==res.drip.still) errs.push('reduced motion did not give one still drop: '+res.drip.still);
 // Selecting words paints a chisel stroke under them, and it goes when the selection does.
 res.select=await page.evaluate(async()=>{const p=document.querySelector('.lk-tom-about p');const t=[...p.childNodes].find(n=>n.nodeType===3);
  const r=document.createRange();r.setStart(t,2);r.setEnd(t,60);getSelection().removeAllRanges();getSelection().addRange(r);
  await new Promise(f=>setTimeout(f,300));const marks=p.querySelectorAll('.lk-sel-mark').length;
  getSelection().removeAllRanges();await new Promise(f=>setTimeout(f,300));return {marks,left:document.querySelectorAll('.lk-sel').length}});
 if(!res.select.marks) errs.push('selected words got no paint');
 if(res.select.left) errs.push('the paint stayed after the selection went');
 return JSON.stringify(res); }

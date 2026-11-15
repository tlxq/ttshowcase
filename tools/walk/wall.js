async page=>{ const errs=[], res={errs};
 // The wall (/wall): it opens on the poster of the page just left, pulls back onto the street, the
 // visitor walks along it (wheel on a laptop, swipe on a phone), lamps come on and Tom's pieces write
 // themselves as they come into view. With reduced motion it is already on the street, written.
 page.on('pageerror',e=>errs.push('page error: '+e.message));
 page.on('console',m=>{ if(m.type()==='error') errs.push('console: '+m.text()); });
 const data=()=>page.evaluate(()=>({...document.querySelector('.wall').dataset}));
 const phone=await page.evaluate(()=>matchMedia('(pointer: coarse)').matches);
 await page.goto('__WALK_URL__/wall.html');
 await page.waitForTimeout(500);
 res.start=await data();
 if(!('ready' in res.start)) errs.push('the street did not start');
 if('walking' in res.start) errs.push('walking before the pull-back');
 res.close=await page.evaluate(()=>document.querySelector('.wall-close')?.getAttribute('href'));
 if(res.close!=='/#questions') errs.push('Close does not lead back to the questions: '+res.close);
 await page.waitForTimeout(4200);
 res.pulled=await data();
 if(!('walking' in res.pulled)) errs.push('the pull-back did not end');
 res.hint=await page.evaluate(()=>document.querySelector('.wall-hint')?.textContent||null);
 if(!res.hint) errs.push('no hint how to walk');
 const walk=async(n)=>{
  if(phone){ const cdp=await page.context().newCDPSession(page);
   for(let k=0;k<n;k++){ await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:180,y:600}]});
    for(let i=1;i<=10;i++) await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:180,y:600-i*40}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]}); await page.waitForTimeout(300); } }
  else { await page.mouse.move(600,400); for(let k=0;k<n;k++){ await page.mouse.wheel(0,240); await page.waitForTimeout(150); } }
 };
 for(let leg=0;leg<6;leg++){ await walk(3); await page.waitForTimeout(3500); }
 res.walked=await data();
 if(!(Number(res.walked.at)>12)) errs.push('did not walk along the wall: at '+res.walked.at);
 if(res.walked.written!=='2/2') errs.push("Tom's pieces not all written on the way: "+res.walked.written);
 if(!(Number(res.walked.lit)>=3)) errs.push('lamps did not come on: '+res.walked.lit);
 if(await page.evaluate(()=>!!document.querySelector('.wall-hint'))) errs.push('the hint stayed after walking');
 res.sideways=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
 if(res.sideways) errs.push('the page is wider than the screen');
 await page.screenshot({path:'__SHOTS__wall-'+(phone?'phone':'desktop')+'.png'});
 // Keys walk too, and End goes to the end of the street.
 await page.focus('canvas'); await page.keyboard.press('End'); await page.waitForTimeout(3000);
 res.end=Number((await data()).at);
 if(res.end<29) errs.push('End did not reach the end of the street: '+res.end);
 // Reduced motion: straight onto the street, everything written, no flight.
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto('__WALK_URL__/wall.html'); await page.waitForTimeout(900);
 res.still=await data();
 if(!('walking' in res.still)) errs.push('reduced motion still waits for the pull-back');
 if(res.still.written!=='2/2') errs.push('reduced motion: pieces not written at once: '+res.still.written);
 await page.emulateMedia({reducedMotion:null});
 return JSON.stringify(res);
}

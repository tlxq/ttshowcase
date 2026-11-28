  // the visitor wall (VISITOR_WALL x -17..-7, y .6..6.6), seen from the street, low enough for the can at its foot; phone: closer, the middle of it
  // the rail (Tom 11-24, B2; prototype R1): the visitors' wall, the start and epaRadar on one smooth line, the head always on the wall.
  // Scroll is the place along the line; at each painting the camera slows to RAIL_SLOW of its speed but never stands still.
  const RAIL = [BARE, VISIT, CAM.A, CAM.C], RAIL_POS = new THREE.CatmullRomCurve3(RAIL.map(r => r[0])), RAIL_LOOK = new THREE.CatmullRomCurve3(RAIL.map(r => r[1])), RAIL_SV = 60, RAIL_SLOW = .2;
  function railAt(r, cp, look) { // r: 0 on the bare stretch (the page's top), 1 at the visitors' wall, 2 at the start, 3 at epaRadar
    const i = Math.min(2, Math.floor(r)), f = r - i, e = f - (1 - RAIL_SLOW) * Math.sin(2 * Math.PI * f) / (2 * Math.PI), u = (i + e) / 3;
    cp.copy(RAIL_POS.getPoint(u)); look.copy(RAIL_LOOK.getPoint(u)); }
  let stencilAt = 0;
  const PH_END = 486, PH_V0 = paceOf(60, 0, 1), PH_V1 = paceOf(PH_END, 0, 1), PH_X0 = WX_(134) + 2.5 + .15, PH_X1 = WX_(4000) - 2.5 - .2; // the phone pans between these camera x, over sv 60 to 486
  let mx = 0, my = 0; addEventListener("pointermove", e => { mx = e.clientX / innerWidth * 2 - 1; my = e.clientY / innerHeight * 2 - 1; });
  // render size follows the machine: weak graphics (T14s, Intel UHD: 46-57 ms a frame at full size, 12 ms at half, 11-16) draw fewer pixels
  // until frames are smooth; strong ones keep full sharpness. Median of the last 30 frames, so one slow frame (a shader, a texture) changes nothing.
  const PR_MAX = Math.min(devicePixelRatio, 2), PR_MIN = Math.min(PR_MAX, .5); let pr = PR_MAX, prCap = PR_MAX, prWin = [], prFast = 0; // prCap: a size that was too slow is not tried again for a while
  function autoRes(ms) { if (!readyAt || ms > 100 || document.hidden) return; prWin.push(ms); if (prWin.length < 30) return;
    const med = prWin.slice().sort((a, b) => a - b)[15]; prWin = [];
    let next = pr; if (med > 21 && pr > PR_MIN) { prCap = Math.min(prCap, pr * .92); next = Math.max(PR_MIN, pr * (med > 40 ? .6 : .8)); prFast = 0; } // keeping up with the screen (60 Hz frames can't measure under 16.7 ms): try a little sharper after 2 s
    else if (med < 18.5) { prCap = Math.min(PR_MAX, prCap * 1.02); if (pr < prCap && (prCap >= PR_MAX || prCap - pr > PR_MAX * .25) && ++prFast >= 6) { next = prCap; prFast = 0; } } else prFast = 0; // the ceiling comes back slowly; the size climbs in one step to it (each change costs a frame on a phone)
    if (next !== pr) { pr = next; renderer.setPixelRatio(pr); composer.setPixelRatio(pr); fit(); } }
  let svKeep = -1, svKeepH = 0; // the walk's place, kept across resizes
  const START = 1600, t0 = performance.now(); let last = t0, si = 0, cmx = 0, cmy = 0;
  if (!WL.want) document.documentElement.dataset.wallAt = 1; // no tags on the wall: nothing to wait for (the checks read 0 as never)
  const SUN_START = 1.2; // how much stronger the sun lights the start wall by day (a share of its own strength)
  const PARK = V(EX - EW / 2 - 1, G3, 1.9), canPos = PARK.clone(), canAim = V();
  renderer.setAnimationLoop(now => {
    const raw = now - last, dt = Math.min(.05, raw / 1000); last = now; const t = now - t0 - START;
    autoRes(raw);
    if (introOver && svKeep >= 0 && svKeepH !== document.documentElement.scrollHeight) { scrollTo(0, svY(svKeep)); svKeepH = document.documentElement.scrollHeight; } // a resize or a turned phone: the walk stays where it was (the page goes on past the end now, so a pixel scroll would land in the dusk)
    if (introOver && up0 && upPx() !== up0 && Math.abs(scrollY - up0) < 2) scrollTo(0, upPx()); // a resize or a turned phone while parked: stay parked, not half turned
    const up = up0 = upPx(), H2 = document.documentElement.scrollHeight - innerHeight - up, sv = H2 > 0 ? paceOf(cl((scrollY - up) / H2) * WALK, 1, 0) : 0,
      tp = topPx(), lft = introOver && up > tp ? cl(1 - (scrollY - tp) / (up - tp)) : 0, // how far up the page, past the visitors' wall
      pAll = cl(sv / 540), p = cl(sv / 320); // sv: the walk's own count below the park (PACE turns the page's scroll into it); the first three scenes keep the scroll they had
    if (introOver && svKeepH === document.documentElement.scrollHeight) svKeep = sv; else if (svKeep < 0) { svKeep = sv; svKeepH = document.documentElement.scrollHeight; }
    const walk3 = sm(cl((pAll - .63) / .14)), end3 = sm(cl((pAll - .9) / .08));
    // scroll moves the camera only: step back (0-.12), walk right to the second wall (.18-.38), step back to look (.75-.95).
    const back = sm(cl(p / .12)), pan = sm(cl(sv / RAIL_SV)), end = sm(cl((p - .75) / .2));
    const gv = scrollY / track.offsetHeight * PAGE, railR = !introOver ? 2 : gv < TOP ? cl((gv - 2) / (TOP - 2)) : gv < TOP + UP ? 1 + cl((gv - TOP) / UP) : 2 + cl(sv / RAIL_SV);
    if (introOver && pan > .5 && !stencilAt) stencilAt = now; // the wall is reached: its label and links come a beat later
    const stencilOn = pan > .5;
    head.style.opacity = 1 - pan;
    // the light comes on, then the paint pours
    const ic = intro(now, dt);
    if (pourReady) { uTnow = ic < 0 ? -1 : Math.min(TMAX * .99, ic); pourU.uT.value = uTnow;
      if (ic < 30) { for (const g of grounds) if (uTnow > g.land && uTnow < g.feed) splashGround(V(g.x, GROUND + .01, 0), uTnow < g.land + .25 ? 4 : 1);
        let lit_ = 0; for (const s of streams) if (uTnow > s.land && uTnow < s.end) { splash(V(s.x, s.y, 0), 2); if (!lit_++) { bounce.position.set(s.x, s.y, .4); bounce.intensity = 1.2; } } } }
    if (creep) { const ct = ic - creep.at; creepU.uFront.value = ct < 0 ? -1 : REDUCED ? creep.L : Math.min(creep.L, .2 + .26 * ct + .045 * Math.sin(ct * 2.3)); }
    const on2 = sm(cl((sv - 8) / 16)); lamp2.intensity = 6.2 * on2 * (on2 > 0 && on2 < 1 && Math.random() < .35 ? .15 : 1);
    // paint everything the pen reached since the last frame
    const done0 = si >= samples.length;
    let pen = null, pressing = false;
    while (si < samples.length && samples[si].t <= t) {
      const s = samples[si], prev = si > 0 && !s.first ? samples[si - 1] : null;
      if (prev) { const d = Math.hypot(s.x - prev.x, s.y - prev.y), n = Math.max(1, Math.ceil(d / 2.5)), slow = cl(1 - d / Math.max(1, (s.t - prev.t)) / 2.2, .25, 1);
        for (let k = 1; k <= n; k++) { const f = k / n; spray(prev.x + (s.x - prev.x) * f, prev.y + (s.y - prev.y) * f, prev.p + (s.p - prev.p) * f, .6 + slow * .6); }
        if (dripsLeft > 0 && s.p > .55 && slow > .8 && Math.random() < .09) { dripsLeft--; drips.push({ x: s.x + gauss() * 3, y: s.y + 4, v: 34 + Math.random() * 30, w: 1.6 + s.p * 2.2 }); }
      } else spray(s.x, s.y, s.p, .9);
      si++;
    }
    if (si > 0 && si < samples.length) { const a = samples[si - 1], b = samples[si], f = cl((t - a.t) / Math.max(1, b.t - a.t)); pressing = !b.first; pen = toWorld(a.x + (b.x - a.x) * f, a.y + (b.y - a.y) * f); }
    // drips run down and slow as they dry
    for (const d of drips) { if (d.v < 2) continue; if (d.wait > 0) { d.wait -= dt; continue; } const ny = d.y + d.v * dt; g.fillStyle = `rgba(${SPRAY},.9)`; g.beginPath(); g.ellipse(d.x, (d.y + ny) / 2, d.w, (ny - d.y) / 2 + d.w, 0, 0, 6.283); g.fill(); d.y = ny; d.v *= .988; if (d.v < 2) { g.beginPath(); g.arc(d.x, d.y + 1, d.w * 1.5, 0, 6.283); g.fill(); } }
    if (si > 0 && !done0 || drips.some(d => d.v >= 2)) paintTex.needsUpdate = true;
    // the can follows the pen, nozzle a hand's width from the wall; after the last stroke it steps back
    const done = si >= samples.length;
    if (stencilOn) canAim.set(EX - EW / 2 - (NARROW ? .5 : .8), G3, 1.6); // set down on the floor left of the painting
    if (stencilOn) {}
    else if (pen) { canAim.copy(pen).add(V(0, 0, REACH)).sub(NOZZLE); }
    else if (done) canAim.copy(PARK);
    else if (t < 0) canAim.set(3.6, -1.4, 2.2);
    canPos.lerp(canAim, Math.min(1, (pen && !stencilOn ? 21 : 2.4) * dt)); // per second, so the can moves the same on 60 and 120 Hz screens
    const rest = stencilOn || done, moving = !stencilOn && !!pen;
    if (storeW) for (const m of storeW.meshes) if (m && m.material.map !== wallEmpty) { const mt = m.material; if (mt.emissiveMap !== mt.map) { mt.emissiveMap = mt.map; mt.emissive.setScalar(1); mt.needsUpdate = true; } mt.emissiveIntensity = endS.show ? 0 : .12; } // visitors' tags glow faintly at night, like reflective paint (Tom 11-23)
    can.visible = false; can.position.copy(canPos); // Tom 11-24: the can that hung in the air goes; Leave your tag's own can stays // by day the night's can is gone: the only can is Leave your tag's
    can.rotation.set(rest ? 0 : -.08 + (moving ? .05 : 0), rest ? -.5 : -.12, moving ? (canAim.x - canPos.x) * -.6 : rest ? 0 : .06);
    capMat.emissive.setRGB(pressing && !stencilOn ? .25 : 0, pressing && !stencilOn ? .05 : 0, 0);
    if (pen && pressing && !stencilOn) { emit(can.localToWorld(NOZZLE.clone()), pen.clone().add(V(0, 0, .01)), 26); bounce.position.copy(pen).add(V(0, 0, .3)); bounce.intensity = 1.6; } else bounce.intensity *= .9;
    for (let i = 0; i < MN; i++) { if (ml[i] <= 0) continue; mp[i * 3] += mv[i * 3] * dt; mp[i * 3 + 1] += mv[i * 3 + 1] * dt; mp[i * 3 + 2] += mv[i * 3 + 2] * dt; if (mp[i * 3 + 2] < .02) { mp[i * 3 + 2] = .02; mv[i * 3] *= .1; mv[i * 3 + 1] = -.05 + gauss() * .05; mv[i * 3 + 2] = .1 + Math.random() * .2; } mv[i * 3 + 1] -= .2 * dt; ml[i] -= dt * (mp[i * 3 + 2] < .05 ? 1.6 : .9); }
    mg.attributes.position.needsUpdate = true; mg.attributes.life.needsUpdate = true; mg.attributes.col.needsUpdate = true;
    // camera: a slow handheld drift, the pointer leans it, scrolling steps back to show the place
    cmx += (mx - cmx) * .04; cmy += (my - cmy) * .04;
    const drift = now / 1000;
    const cp = lerpV(lerpV(lerpV(lerpV(lerpV(CAM.A[0], CAM.B[0], back), CAM.C[0], pan), CAM.D[0], end), CAM.E[0], walk3), CAM.F[0], end3), cl_ = lerpV(lerpV(lerpV(lerpV(lerpV(CAM.A[1], CAM.B[1], back), CAM.C[1], pan), CAM.D[1], end), CAM.E[1], walk3), CAM.F[1], end3);
    endK = cl((sv - 548) / 30); lamp2At(sv); washAt(sv, lft); endCam(sv, cp, cl_); streetAt(now); rvfAt(now, walk3, end3); stairsAt(cp.x); endAt(now, sv, cp, cl_); morning(now, sv, cp, cl_);
    sun.intensity *= 1 + SUN_START * (sv >= CUT ? 0 : 1 - sm(cl((sv - 12) / 36))) * (1 - sm(cl(lft * 5))); // (Tom 11-27) by day the start wall is lit brighter: it rendered mid-grey and the dark blue paint on it reached only 2:1. The sun is SUN_START stronger there (the same as before by sv 48, and at the visitors' wall at the top, whose pale words need the dimmer wall)
    if (railR < 3) railAt(railR, cp, cl_);
    else if (NARROW && sv < PH_END) { const u = cl((paceOf(sv, 0, 1) - PH_V0) / (PH_V1 - PH_V0)), x = PH_X0 + (PH_X1 - PH_X0) * cl((u - .03) / .94); cl_.x += x - cp.x; cp.x = x; } // (Tom 11-27) a phone: one slow pan along the wall, even in the scroll, from the left end to the right end
    // the seam (Tom 11-23): above the pole the camera rests on the visitors' wall (TOP); at the very top the page jumps to its end, which shows
    // the same wall, and scrolling on up walks back through the glare to EDGE. Never while the tag tool or the flyer is open.
    if (scrollY <= 4 && introOver && !pick.mode && !sheetOpen) scrollTo(0, svY(SV_MAX - 8));
    // past the pole (Tom 11-23: look closer at the stickers as we pass by): on the way up to the visitors' wall the camera steps in to the pole and
    // walks round it at arm's length, right to left, so each sticker comes past; the page's longer park (UP) gives the pass its own stretch of scroll
    const poleK = lft > 0 ? sm(cl((lft - .06) / .16)) * (1 - sm(cl((lft - .58) / .16))) : 0; // the pole's stickers (Tom 11-24: keep it on the rail)
    if (poleK > 0) { const th = .9 - 1.8 * cl((lft - .12) / .5), r = NARROW ? 1.9 : 1.7, y = GROUND + 1.55; cp.lerp(V(POST.x + r * Math.sin(th), y + .05, POST.z + r * Math.cos(th)), poleK); cl_.lerp(V(POST.x, y, POST.z), poleK); }
    pickCam(now, dt, cp, cl_); stencilTick(now, cp);
    // the opening's street light swings round to graze the visitor wall from the right (no extra light: every light costs a frame on the T14s),
    // aimed at the middle of the view (step 5): the words, the can and the tags all stand in it, on a laptop and a phone
    if (!introOver) { const k = ic < 0 || !CAM_IN[1] ? 0 : sm(cl((ic - CAM_IN[0]) / (CAM_IN[1] - CAM_IN[0]))); cp.lerpVectors(INTRO[0], cp, k); cl_.lerpVectors(INTRO[1], cl_, k); }
    const hand = (1 - pick.k) * (1 - poleK); /* close to the wall the frame must sit still under the finger */ camera.position.set(cp.x + hand * (cmx * .5 + Math.sin(drift * .31) * .06), cp.y + EARTH.dy - hand * cmy * .3 + Math.sin(drift * .43) * .04, cp.z);
    stripePlace(); camera.lookAt(cl_.x, cl_.y + EARTH.dy, cl_.z); startTick(now, ic); /* the start is placed from this frame's camera: before it, the first frame saw the default camera */ pickPlace(); if (adm.on) admPlace(); tagTick(now); visitPlace(Math.max(lft, endVisit)); endPlace(now); bombPlace();
    lens.uniforms.uFocus.value = camera.position.distanceTo(cl_); lens.uniforms.uTime.value = drift; lens.uniforms.tDepth.value = composer.readBuffer.depthTexture;
    // shadow from the can's bottom to its top, as the light throws it on the wall
    const LL = can.position.x > 6 ? lamp2 : lamp, sa = onWall(can.localToWorld(V(0, .1, 0)), LL.position), sb = onWall(can.localToWorld(V(0, 1.25, 0)), LL.position), sl = sa.distanceTo(sb);
    shadow.position.set((sa.x + sb.x) / 2, (sa.y + sb.y) / 2, .006); shadow.rotation.z = Math.atan2(sb.y - sa.y, sb.x - sa.x); shadow.scale.set(sl * 1.25, .7 * (1 + can.position.z * .25), 1);
    shadow.material.opacity = .62 * cl(LL.intensity / 5) * cl(1.6 - can.position.z * .4);
    // labels
    const showCan = t > -600 && !done && !stencilOn, showHand = !!muralPin && uTnow > pourDone && pan < .3 && lft < .1;
    tagCan.style.opacity = showCan ? 1 : 0; tagHand.style.opacity = showHand ? 1 : 0;
    // the label and the links on the painted marks, a beat after the wall is reached
    const sec = stencilAt ? (now - stencilAt) / 1000 : -1;
    const factsOn = sec > .8 && pan > .5 && end < .5 ? 1 : 0; [tagFacts, l6, c6].forEach(e => e.style.opacity = factsOn);
    pin(tagFacts, l6, c6, NARROW ? V(camera.position.x - .6, G3 + .1, 0) : V(EX - EW * .3, EY - EH / 2 + .1, 0), NARROW ? 18 : 24, 60); // phone: under the wall on the floor, the plate and its line follow the camera along it
    placeHots(hots, EPA_MARKS, EPAB, ST[0].k >= 1 && sec >= .3 && pan > .5 && endK < .5); // at this wall, each mark that is in view
    const c1 = svg.querySelector("#c1"), l1 = svg.querySelector("#l1"), c2 = svg.querySelector("#c2"), l2 = svg.querySelector("#l2");
    [c1, l1].forEach(e => e.style.opacity = showCan ? 1 : 0); [c2, l2].forEach(e => e.style.opacity = showHand ? 1 : 0);
    pin(tagCan, l1, c1, can.localToWorld(V(NARROW ? -.3 : .3, .9, 0)), NARROW ? -30 : 70, NARROW ? 90 : -40);
    if (muralPin) pin(tagHand, l2, c2, muralPin, NARROW ? 30 : 50, NARROW ? -70 : -60);
    composer.render();
  });
})();

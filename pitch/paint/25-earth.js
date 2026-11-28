  // ---- INTRO PROTOTYPE 2 (pitch/intro-earth, Tom's "through the earth"): one calm downward glide. The film plays and the view tilts down the pour to the soil, on through a real photo of
  // soil that the blue soaks into, to the earth's edge on a lit concrete wall; the blue comes out of a crack there, runs down the wall and falls into the real bucket, which fills as the
  // (faked) load ends. The 3D camera rides down with the earth's edge, so earth and wall are one move. ?load=slow|fast sets the fake load; ?intro=old shows master's start; ?seek=<s> holds a moment; a tap skips.
  // Its pictures (pitch/assets/intro/: the clip, soil photos graded to it) are not in git.
  const EARTH = (() => {
    const E = { on: false, streamOn: false, bucketSeen: false, wall: 0, dy: 0 }, Q = new URLSearchParams(location.search), box = document.getElementById("earth"), loadEl = document.getElementById("eLoad");
    if (!box || REDUCED || Q.get("intro") === "old") { if (box) box.remove(); if (loadEl) loadEl.remove(); return E; } // reduced motion: the start as it is, no journey
    const world = document.getElementById("eWorld"), vid = document.getElementById("eVid"), strip = document.getElementById("eStrip"), veinCv = document.getElementById("eCv"), dropEl = document.getElementById("eDrop"),
      loadT = document.getElementById("eLoadT"), skipEl = document.getElementById("eSkip"), vc = veinCv.getContext("2d");
    const SEEK = Q.get("seek") === null ? null : +Q.get("seek"), SLOW = Q.get("load") === "slow";
    // the prototype's own numbers (listed in the report)
    const FILM_W = 1080, FILM_H = 1920, STRIP_Y = 1560, IMPACT = [447, 1548], CRACK_DY = 44, // film pixels (the film frame is 1080 x 1920)
      SPEED = NARROW ? 320 : 700, TR = .9, J0 = .4, // the glide: screen px per second, ramp seconds at both ends, seconds the film plays before it starts
      FRONT_LEAD = .55, GAP_UP = .27, GAP_MIN = .2, GAP_MAX = .4, // the blue's front rides at .55 of the screen; the earth's edge ends .27 H above the bucket
      COUNT_JOURNEY = .6, FILL_FAST = 2.2, DROP_PERIOD = 1.05, LEAVE_AT = .4, LEAVE_D = 1;
    let stripH = 2360, started = false, et = 0, lt = 0, rate = 1, skipping = false, Tj = 0, shapeKey = "", veinX = -1, veins = null, vdraw = -2, outS = null, streamT = -1, lastRip = -9, tx = "", dyV = 0;
    const boot = performance.now(), clamp = cl, ease = sm, rgb = a => `rgba(${SPRAY},${a})`, hash = (i, j) => { const v = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return v - Math.floor(v); };
    const trap = (t, T, tr) => { if (t <= 0) return 0; if (t >= T) return 1; const v = 1 / (T - tr); return t < tr ? v * t * t / (2 * tr) : t > T - tr ? 1 - v * (T - t) * (T - t) / (2 * tr) : v * (tr / 2 + t - tr); }; // 0..1 with a ramp at each end
    const sizeVeins = () => { veinCv.width = FILM_W / 2; veinCv.height = Math.ceil((stripH + 360) / 2); veinCv.style.top = (STRIP_Y - 60) + "px"; veinCv.style.height = (stripH + 360) + "px"; };
    strip.addEventListener("load", () => { if (strip.naturalWidth) { stripH = strip.naturalHeight * FILM_W / strip.naturalWidth; sizeVeins(); veinX = -1; } });
    const fail = () => { E.on = false; box.remove(); if (loadEl) loadEl.remove(); document.documentElement.classList.remove("earth-on"); };
    vid.addEventListener("error", fail); strip.addEventListener("error", fail);
    E.on = true; document.documentElement.classList.add("earth-on"); sizeVeins();
    // ---- the lit wall above the ledge: the concrete face the earth sits on, set back behind the ledge, with its own soft light and a blue spill from the crack
    const upMat = new THREE.MeshStandardMaterial({ map: tex("assets/wall4_diff.jpg", true, 14 / TILE, 14 / TILE, .3, .2), normalMap: tex("assets/wall4_nor_gl.jpg", false, 14 / TILE, 14 / TILE, .3, .2), roughnessMap: tex("assets/wall4_rough.jpg", false, 14 / TILE, 14 / TILE, .3, .2), color: 0x6e7278, envMapIntensity: .2, normalScale: new THREE.Vector2(.8, .8) });
    const upWall = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), upMat); upWall.position.set(LEDGE.x, WALL_TOP + 7, -.52); upWall.visible = false; scene.add(upWall);
    const wallLight = new THREE.SpotLight(0xdfe8ff, 0, 40, .75, .9, 1.3); wallLight.position.set(LEDGE.x - 2.2, WALL_TOP + 7.5, 5.5); wallLight.target.position.set(LEDGE.x + .3, WALL_TOP + 2.2, -.52); scene.add(wallLight, wallLight.target);
    const spill = new THREE.PointLight(PAINT, 0, 3.2, 1.6); scene.add(spill);
    // ---- the 3D thread: paint's own colour, a wobble, thicker at the crack and thinner as it speeds up; beads run down it
    const TS = 10, TQ = 26, thGeo = new THREE.CylinderGeometry(1, 1, 1, TS, TQ, true), thPos = thGeo.attributes.position;
    const thMat = new THREE.MeshPhysicalMaterial({ color: PAINT.clone().multiplyScalar(.55), roughness: .32, clearcoat: .35, clearcoatRoughness: .25, envMapIntensity: .12, side: THREE.DoubleSide });
    const thread = new THREE.Mesh(thGeo, thMat); thread.visible = false; thread.frustumCulled = false; scene.add(thread);
    const beads = [0, 1, 2].map(() => { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), thMat); m.visible = false; m.frustumCulled = false; scene.add(m); return m; });
    // ---- where the blue leaves the earth, and the real bucket's column from there (pose-corrected: the camera rides up by E.dy while the journey runs)
    const solve = yScreen => { bucket.updateWorldMatrix(true, false); camera.updateMatrixWorld(); const A = bucket.localToWorld(V(.1, 0, .06)), P = y => { const v = V(A.x, y + E.dy, A.z).project(camera); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; };
      let y1 = A.y + .5, y2 = A.y + 6; for (let k = 0; k < 3; k++) { const f1 = P(y1)[1] - yScreen, f2 = P(y2)[1] - yScreen; if (Math.abs(f2 - f1) < 1e-6) break; const y3 = y2 - f2 * (y2 - y1) / (f2 - f1); y1 = y2; y2 = y3; }
      return { x: P(y2)[0], O: V(A.x, y2, A.z) }; };
    // ---- the seep: blobs of wet paint down a seeded walk, a dark wet rim round them, pools where it slows; it follows the camera down
    function buildVeins(xOut) { const yEnd = STRIP_Y + stripH + CRACK_DY - 10, N = 150, main = [], x0 = IMPACT[0], y0 = IMPACT[1] + 10;
      for (let i = 0; i <= N; i++) { const q = i / N, env = Math.sin(Math.PI * q) ** .6; main.push([x0 + (xOut - x0) * ease(q) + env * (62 * Math.sin(q * 8 + 1) + 30 * Math.sin(q * 21 + 2) + 12 * Math.sin(q * 57)), y0 + (yEnd - y0) * q]); }
      const mk = (pts, wS, seed) => pts.map(([x, y], i) => ({ x: x + (hash(i, seed) - .5) * 9, y: y + (hash(i, seed + 3) - .5) * 9, r: (6 + 7 * hash(i, seed + 1) + (i % 41 === 0 ? 12 : 0)) * wS, g: hash(i, seed + 2) }));
      const br = []; for (let b = 0; b < 10; b++) { const at = .06 + .86 * hash(b, 3), sx = main[Math.round(at * N)][0], sy = main[Math.round(at * N)][1], dir = (b % 2 ? 1 : -1) * (.35 + .8 * hash(b, 5)), len = 140 + 330 * hash(b, 7), pts = [];
        for (let i = 0; i <= 34; i++) { const q = i / 34; pts.push([sx + Math.sin(dir) * len * q + 20 * Math.sin(q * 10 + b), sy + Math.cos(dir) * len * q * .85 + 6 * Math.sin(q * 17 + b)]); }
        br.push({ at, blobs: mk(pts, .5 * (1 - .4 * hash(b, 9)), 40 + b).map((o, i, a) => ({ ...o, r: o.r * (1 - .6 * i / a.length) })) }); }
      return { main: mk(main, 1, 1), N, br, x: xOut, yEnd }; }
    function blobs(list, f, a) { const n = Math.floor(list.length * f); if (n < 2) return; const line = (w, col) => { vc.beginPath(); for (let i = 0; i < n; i++) { const b = list[i]; i ? vc.lineTo(b.x / 2, (b.y - OY) / 2) : vc.moveTo(b.x / 2, (b.y - OY) / 2); } vc.strokeStyle = col; vc.lineWidth = w / 2; vc.stroke(); };
      vc.lineCap = "round"; vc.lineJoin = "round"; line(list[0].r * 3.4, "rgba(8,20,46,.16)"); line(list[0].r * 1.9, rgb(.5 * a));
      for (let i = 0; i < n; i++) { const b = list[i]; if (b.r > 16 || b.g > .93) { vc.fillStyle = "rgba(8,20,46,.2)"; vc.beginPath(); vc.arc(b.x / 2, (b.y - OY) / 2, b.r * 1.7 / 2, 0, 6.283); vc.fill(); vc.fillStyle = rgb(.4 * a); vc.beginPath(); vc.arc(b.x / 2, (b.y - OY) / 2, b.r / 2, 0, 6.283); vc.fill(); }
        if (b.g > .86) { vc.fillStyle = "rgba(205,228,255,.28)"; vc.beginPath(); vc.arc((b.x - b.r * .3) / 2, (b.y - OY - b.r * .3) / 2, b.r * .2 / 2, 0, 6.283); vc.fill(); } } }
    const OY = STRIP_Y - 60;
    function drawVeins(pv, bloom, fill, runL) { vc.clearRect(0, 0, veinCv.width, veinCv.height); if (!veins) return; const E_ = STRIP_Y + stripH, x = veins.x, ev = E_ + CRACK_DY;
      // the water's landing: the soil goes dark and blue round the foot of the stream
      if (bloom > 0) { const r = 26 + 80 * bloom; const g = vc.createRadialGradient(IMPACT[0] / 2, (IMPACT[1] + 6 - OY) / 2, 0, IMPACT[0] / 2, (IMPACT[1] + 6 - OY) / 2, r / 2); g.addColorStop(0, rgb(.55 * Math.min(1, bloom * 2))); g.addColorStop(.55, "rgba(8,20,46,.4)"); g.addColorStop(1, "rgba(8,20,46,0)"); vc.fillStyle = g; vc.save(); vc.translate(IMPACT[0] / 2, (IMPACT[1] + 6 - OY) / 2); vc.scale(1.5, .8); vc.translate(-IMPACT[0] / 2, -(IMPACT[1] + 6 - OY) / 2); vc.beginPath(); vc.arc(IMPACT[0] / 2, (IMPACT[1] + 6 - OY) / 2, r / 2, 0, 6.283); vc.fill(); vc.restore(); }
      if (pv > 0) { blobs(veins.main, pv, 1); for (const b of veins.br) blobs(b.blobs, clamp((pv - b.at) * 2.6), .85); }
      vc.save(); vc.scale(.5, .5); vc.translate(0, -OY);
      // the earth's edge casts a soft dark line on the wall
      let g = vc.createLinearGradient(0, E_ - 6, 0, E_ + 90); g.addColorStop(0, "rgba(0,0,0,.6)"); g.addColorStop(1, "rgba(0,0,0,0)"); vc.fillStyle = g; vc.fillRect(0, E_ - 6, FILM_W, 96);
      // the crack in the concrete where the earth meets the wall: jagged, a lighter lip under it, the paint in it, a bead point at its lowest end
      const pts = []; for (let i = 0; i <= 14; i++) { const q = i / 14; pts.push([x - 78 + 156 * q + 3 * Math.sin(i * 2.7), ev - 10 + 20 * q ** 1.6 + 6 * (hash(i, 77) - .5)]); }
      const path = (dy) => { vc.beginPath(); pts.forEach(([a, b], i) => i ? vc.lineTo(a, b + dy) : vc.moveTo(a, b + dy)); };
      vc.lineCap = "round"; vc.lineJoin = "round"; path(3); vc.strokeStyle = "rgba(150,155,160,.35)"; vc.lineWidth = 3; vc.stroke(); path(0); vc.strokeStyle = "#050505"; vc.lineWidth = 9; vc.stroke(); vc.strokeStyle = "rgba(0,0,0,.35)"; vc.lineWidth = 20; vc.stroke();
      if (fill > 0) { const n = Math.ceil(pts.length * fill); vc.beginPath(); pts.slice(0, n).forEach(([a, b], i) => i ? vc.lineTo(a, b) : vc.moveTo(a, b)); vc.strokeStyle = rgb(.8); vc.lineWidth = 3.6; vc.stroke(); vc.strokeStyle = "rgba(205,228,255,.35)"; vc.lineWidth = 1.2; vc.stroke(); }
      // wet stain round the crack and above it (the paint came down through the soil), and the runnel below
      if (fill > 0) { g = vc.createRadialGradient(x, ev - 20, 4, x, ev - 20, 120); g.addColorStop(0, rgb(.3 * fill)); g.addColorStop(1, rgb(0)); vc.fillStyle = g; vc.save(); vc.translate(x, ev - 20); vc.scale(1.4, .8); vc.translate(-x, -(ev - 20)); vc.beginPath(); vc.arc(x, ev - 20, 120, 0, 6.283); vc.fill(); vc.restore(); }
      if (runL > 0) { const lx = pts[pts.length - 1][0], ly = pts[pts.length - 1][1]; for (let i = 0; i < runL / 6; i++) { const yy = ly + i * 6, wob = 5 * Math.sin(i * .5), r = 5 + 2 * hash(i, 5) - i * .02; vc.fillStyle = "rgba(8,20,46,.2)"; vc.beginPath(); vc.arc(lx + wob, yy, r * 2.2, 0, 6.283); vc.fill(); vc.fillStyle = rgb(.42 * (1 - i * 6 / (runL + 40))); vc.beginPath(); vc.arc(lx + wob, yy, Math.max(2, r), 0, 6.283); vc.fill(); } }
      vc.restore(); }
    const ripple = (x, y, k) => { const r = document.createElement("i"); r.className = "eRip"; r.style.left = x.toFixed(0) + "px"; r.style.top = y.toFixed(0) + "px"; box.appendChild(r);
      r.animate([{ transform: `translate(-50%, -50%) scale(${.2 * k})`, opacity: .9 }, { transform: `translate(-50%, -50%) scale(${1.5 * k})`, opacity: 0 }], { duration: 700, easing: "ease-out" }).onfinish = () => r.remove(); };
    E.skip = () => { if (started && !E.streamOn && !skipping) { skipping = true; rate = 5; if (!SEEK && SEEK !== 0) vid.playbackRate = 5; } };
    addEventListener("pointerdown", E.skip); addEventListener("keydown", E.skip);
    // the load counter: 0 at the first frame, 60 % at the end of the glide, the rest as the bucket fills; the slow line holds it back (its own clock, a skip does not speed it)
    let cNow = 0;
    const counter = () => { const jp = clamp((et - J0) / Math.max(.1, Tj)), fa = J0 + Tj + 1.1, ideal = et < fa ? COUNT_JOURNEY * trap(et - J0, Tj, TR) + .02 * clamp(et / 1) : COUNT_JOURNEY + (1 - COUNT_JOURNEY) * (1 - (1 - clamp((et - fa) / FILL_FAST)) ** 2);
      const slow = SLOW ? .62 * ease(clamp(lt / 11)) + .38 * ease(clamp((lt - 14) / 8)) : 1; return Math.min(ideal, slow, jp * 0 + 1); };
    E.target = () => E.streamOn ? clamp((cNow - COUNT_JOURNEY) / (1 - COUNT_JOURNEY)) : 0;
    E.column = (column, mesh, top, r) => { if (!outS || !E.streamOn) return; mesh.visible = false; const O = outS.O, t = et, fp = ease(clamp((et - streamT) / .5)), F = V(top.x, Math.max(top.y, O.y - (O.y - top.y) * fp), top.z), R = Math.max(.006, r * .62);
      for (let i = 0; i <= TQ; i++) { const q = i / TQ, wob = .012 * q * Math.sin(q * 9 + t * 6), wz = .008 * q * Math.sin(q * 7 - t * 5), cx = O.x + (F.x - O.x) * q + wob, cy = O.y + (F.y - O.y) * q, cz = O.z + wz;
        let rad = R * (1.7 - .95 * q ** .7) * (1 + .08 * Math.sin(q * 20 - t * 10)); if (fp < 1 && q > .88) rad *= Math.max(.15, 1 - ((q - .88) / .12) ** 2);
        for (let j = 0; j <= TS; j++) { const a = j / TS * 6.2832, k = i * (TS + 1) + j; thPos.setXYZ(k, cx + Math.sin(a) * rad, cy, cz + Math.cos(a) * rad * .8); } }
      thPos.needsUpdate = true; thGeo.computeVertexNormals(); thread.visible = true;
      beads.forEach((b, i) => { const ph = (t * 1.15 + i / 3) % 1, on = fp >= 1 && ph > .05; b.visible = on; if (on) { const k = ph ** 1.7; b.position.set(O.x + .03 * (i - 1), O.y + (top.y - O.y) * k, O.z + .01); b.scale.set(.026, .04 * (1 + k), .026); } }); };
    E.tick = (now, dt) => { if (!E.on) return;
      if (!started && (vid.readyState >= 3 || now - boot > 1800)) { started = true; vid.play().catch(() => {}); }
      if (SEEK !== null) { started = true; if (et !== SEEK) { et = lt = SEEK; vid.pause(); vid.currentTime = clamp(et - J0, 0, 5.9); } } else if (started) { et += dt * rate; lt += dt; }
      if (skipping && et >= J0 + Tj + 1.1) { skipping = false; rate = 1; vid.playbackRate = 1; }
      const W = innerWidth, H = innerHeight, s = Math.max(W / FILM_W, H / FILM_H), xOff = (W - FILM_W * s) / 2, bucketTop = stBox[1] > 0 ? stBox[1] : H * .55;
      const gap = clamp(bucketTop - GAP_UP * H, GAP_MIN * H, GAP_MAX * H), Ew = STRIP_Y + stripH, cam1 = Ew - gap / s, key = W + "x" + H; if (key !== shapeKey) { shapeKey = key; Tj = cam1 * s / SPEED + TR; }
      const camJ = cam1 * trap(et - J0, Tj, TR), rt = readyAt ? (now - readyAt) / 1000 - LEAVE_AT : -1, lv = ease(clamp(rt / LEAVE_D)), cam = camJ + lv * (gap + 140) / s;
      const tf = `translate3d(${xOff.toFixed(1)}px, ${(-cam * s).toFixed(1)}px, 0) scale(${s.toFixed(4)})`; if (tf !== tx) { tx = tf; world.style.transform = tf; }
      cNow = counter(); const fa = J0 + Tj + 1.1;
      if (!E.streamOn && et >= fa && cNow >= COUNT_JOURNEY - .001) { E.streamOn = true; streamT = SEEK !== null ? fa : et; }
      outS = solve(gap + CRACK_DY * s + 8 * s); const wx = (outS.x - xOff) / s; if (Math.abs(wx - veinX) > 3) { veinX = wx; veins = buildVeins(clamp(wx, 90, 990)); vdraw = -2; }
      const pv = clamp((camJ + FRONT_LEAD * H / s - IMPACT[1]) / (veins.yEnd - IMPACT[1])), bloom = clamp((et - .8) / 3), fill = ease(clamp((pv - .94) / .06)), runL = E.streamOn ? Math.min(230, 40 + 60 * (et - streamT + 1)) : et > fa ? 40 : 0;
      const sig = [pv.toFixed(3), bloom.toFixed(2), fill.toFixed(2), Math.round(runL / 4), veinX | 0].join(); if (sig !== vdraw) { vdraw = sig; drawVeins(pv, bloom, fill, runL); }
      // the 3D camera rides down with the earth's edge: the crack's height is kept at the earth's edge on the screen, so wall, ledge and bucket rise into view as the earth leaves the top
      { const Pc = y => { const v = V(outS.O.x, y, outS.O.z).project(camera); return (1 - v.y) / 2 * H; }, y0 = Pc(outS.O.y), ppm = y0 - Pc(outS.O.y + 1), want = clamp((Ew + CRACK_DY + 8 - camJ) * s, 0, H * 1.7);
        if (ppm > 1) dyV = clamp(dyV + (want - y0) / ppm, 0, 12); if (goAt) dyV = 0; E.dy = dyV; }
      if (readyAt || goAt) { thread.visible = false; beads.forEach(b => b.visible = false); }
      const edgeNow = (Ew - cam) * s; E.bucketSeen = edgeNow < bucketTop - 10; const wk = clamp((H * 1.05 - edgeNow) / (H * .5)); E.wall += (.22 * wk - E.wall) * Math.min(1, dt * 3);
      upWall.visible = !goAt; wallLight.intensity = 3.2 * wk * (goAt ? 0 : 1); spill.intensity = E.streamOn && !readyAt ? .45 : 0; spill.position.set(outS.O.x, outS.O.y - .25, .5);
      // the drip before the thread: a bead swells at the crack, necks, lets go and falls into the bucket's mouth; again and again until the thread starts
      const dr = H * .017, lipY = (Ew + CRACK_DY + 8 - cam) * s, mouth = proj(bucket.localToWorld(V(.1, BK.h - .02, .06))), dt0 = et - fa + DROP_PERIOD * 0, ph = ((et - (J0 + Tj)) % DROP_PERIOD + DROP_PERIOD) % DROP_PERIOD, growT = .5, fallT = .42;
      const live = et > J0 + Tj && !E.streamOn && lv === 0 && ph < growT + fallT; if (live !== !!dropEl._on) { dropEl._on = live; dropEl.style.opacity = live ? 1 : 0; }
      if (live) { const grow = clamp(ph / growT), fall = ph > growT ? (ph - growT) / fallT : 0, D = Math.max(40, mouth[1] - lipY), sc = (.3 + .7 * ease(grow)) * dr / 10, y = lipY + ease(grow) * dr * .5 + D * fall * fall, st = fall > 0 ? 1 + 1.4 * fall : 1 + .45 * grow;
        dropEl.style.transform = `translate(${(outS.x - 5).toFixed(1)}px, ${y.toFixed(1)}px) scale(${(sc * (fall > 0 ? .85 : 1)).toFixed(3)}, ${(sc * st).toFixed(3)})`; if (fall > .96 && !dropEl._hit) { dropEl._hit = 1; ripple(mouth[0], mouth[1], .7); } if (fall === 0) dropEl._hit = 0; }
      if (E.streamOn && !readyAt && et - lastRip > .42) { lastRip = et; const A = proj(bucket.localToWorld(V(.1, Math.max(.02, level * FULL), .06))); ripple(A[0], A[1], 1); }
      // the quiet line: the load from the first frame; "Tap to skip" after a second until the thread starts
      const txt = readyAt ? "Tip the bucket to enter" : `Loading the wall · ${Math.min(99, Math.round(cNow * 100))} %`; if (txt !== loadT.textContent) loadT.textContent = txt;
      loadEl.style.opacity = goAt ? 0 : 1; skipEl.style.opacity = lt > 1 && !E.streamOn && !skipping ? .7 : 0;
      if (lv >= 1 && box.style.display !== "none") box.style.display = "none"; E.leaving = lv > 0;
      if (lv >= .9 && !E.done) { E.done = true; document.documentElement.classList.add("earth-done"); }
      if (goAt) { if (!E.gone) E.gone = performance.now(); else if (performance.now() - E.gone > 1500) { box.remove(); loadEl.remove(); upWall.visible = false; wallLight.intensity = 0; spill.intensity = 0; thread.visible = false; beads.forEach(b => b.visible = false); E.on = false; E.dy = 0; document.documentElement.classList.remove("earth-on"); } }
    };
    return E;
  })();

  // ---- INTRO PROTOTYPE 3 (pitch/intro-earth, Tom's "through the earth"): one calm downward glide. The film plays (a hold on the can first) and the view tilts down the pour to the soil, on through a real photo of
  // soil that the blue soaks into (blended into the photo, not drawn on it), to the earth's ragged edge on a lit concrete wall; the blue wells out of a dark crack there, runs down the wall and falls into the real bucket,
  // which fills as the (faked) load ends. The 3D camera rides down with the earth's edge, so earth and wall are one move; when the bucket is full the earth lifts away and Tom's photo and name ride up in the same motion.
  // ?load=slow|fast sets the fake load; ?intro=old shows master's start; ?seek=<s> holds a moment; a tap skips the glide. Its pictures (pitch/assets/intro/) are not in git.
  const EARTH = (() => {
    const E = { on: false, streamOn: false, bucketSeen: false, wall: 0, dy: 0 }, Q = new URLSearchParams(location.search), box = document.getElementById("earth"), loadEl = document.getElementById("eLoad");
    if (!box || REDUCED || Q.get("intro") === "old") { if (box) box.remove(); if (loadEl) loadEl.remove(); return E; } // reduced motion: the start as it is, no journey
    const world = document.getElementById("eWorld"), vid = document.getElementById("eVid"), strip = document.getElementById("eStrip"), cvM = document.getElementById("eCv"), cvS = document.getElementById("eCv2"), cvK = document.getElementById("eCk"),
      dropEl = document.getElementById("eDrop"), loadT = document.getElementById("eLoadT"), skipEl = document.getElementById("eSkip"), cM = cvM.getContext("2d"), cS = cvS.getContext("2d"), cK = cvK.getContext("2d");
    const SEEK = Q.get("seek") === null ? null : +Q.get("seek"), SLOW = Q.get("load") === "slow";
    // the prototype's own numbers (listed in the report)
    const FILM_W = 1080, FILM_H = 1920, STRIP_Y = 1560, IMPACT = [447, 1548], CRACK_DY = 10, EDGE_UP = 95, // film pixels (the film frame is 1080 x 1920); the crack sits CRACK_DY below the strip's bottom, the soil edge about EDGE_UP above it
      SPEED = NARROW ? 320 : 700, TR = .9, J0 = 2.3, J0_OLD = .4, SOIL_FROM = 1500, // the glide: screen px per second, ramp seconds, the hold on the can before it starts (was .4)
      FRONT_LEAD = .55, GAP_UP = NARROW ? .27 : .33, GAP_MIN = .2, GAP_MAX = .42, // the blue's front rides at .55 of the screen; the earth's edge ends .27 (.33 on a laptop) H above the bucket
      COUNT_JOURNEY = .6, FILL_FAST = 2.2, DROP_PERIOD = 1.05, LEAVE_AT = .25, LEAVE_D = 1.1, CAN_SHIFT = .8; // the phone's window leans to the film's right so the can is whole
    let stripH = 2360, started = false, et = 0, lt = 0, rate = 1, skipping = false, Tj = 0, shapeKey = "", glide = null, veinX = -1, veins = null, drawn = null, outS = null, streamT = -1, lastRip = -9, tx = "", dyV = 0, ksig = "";
    const boot = performance.now(), clamp = cl, ease = sm, hash = (i, j) => { const v = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return v - Math.floor(v); };
    const BLUE = SPRAY.split(",").map(Number), col = (k, a) => `rgba(${BLUE.map(v => Math.round(v * k))},${a})`; // ONE blue for the soaking, the crack, the bead, the thread and the bucket (the 3D paint uses the same colour)
    const smooth = (x, seed) => { const i = Math.floor(x), f = ease(x - i); return hash(i, seed) * (1 - f) + hash(i + 1, seed) * f; };
    const sizeCv = () => { const h = Math.ceil((stripH + 360) / 2); for (const c of [cvM, cvS, cvK]) { c.width = FILM_W / 2; c.height = h; c.style.top = (STRIP_Y - 60) + "px"; c.style.height = (stripH + 360) + "px"; } };
    strip.addEventListener("load", () => { if (strip.naturalWidth) { stripH = strip.naturalHeight * FILM_W / strip.naturalWidth; sizeCv(); veinX = -1; } });
    const fail = () => { E.on = false; box.remove(); if (loadEl) loadEl.remove(); document.documentElement.classList.remove("earth-on"); };
    vid.addEventListener("error", fail); strip.addEventListener("error", fail);
    E.on = true; document.documentElement.classList.add("earth-on"); sizeCv();
    const OY = STRIP_Y - 60;
    // ---- soft round sprites in the paint's blue: one for darkening the soil (multiplied in), one for lifting it (screened in); grain and roots show through both
    const sprite = (r, g, b) => { const c = document.createElement("canvas"); c.width = c.height = 64; const x = c.getContext("2d"), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, `rgba(${r},${g},${b},1)`); gr.addColorStop(.5, `rgba(${r},${g},${b},.5)`); gr.addColorStop(1, `rgba(${r},${g},${b},0)`); x.fillStyle = gr; x.fillRect(0, 0, 64, 64); return c; };
    const spM = sprite(...BLUE.map(v => Math.round(v * .5))), spS = sprite(...BLUE.map(v => Math.round(v * .8)));
    const stamp = (c, sp, x, y, D, a) => { c.globalAlpha = a; c.drawImage(sp, (x - D / 2) / 2, (y - D / 2 - OY) / 2, D / 2, D / 2); }; // D: the sprite's width in film pixels
    // ---- the lit wall above the ledge: the concrete face the earth sits on, set back behind the ledge, with its own soft light
    const upMat = new THREE.MeshStandardMaterial({ map: tex("assets/wall4_diff.jpg", true, 14 / TILE, 14 / TILE, .3, .2), normalMap: tex("assets/wall4_nor_gl.jpg", false, 14 / TILE, 14 / TILE, .3, .2), roughnessMap: tex("assets/wall4_rough.jpg", false, 14 / TILE, 14 / TILE, .3, .2), color: 0x777b81, envMapIntensity: .2, normalScale: new THREE.Vector2(.9, .9) });
    const upWall = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), upMat); upWall.position.set(LEDGE.x, WALL_TOP + 7, -.52); upWall.visible = false; scene.add(upWall);
    const wallLight = new THREE.SpotLight(0xdfe8ff, 0, 40, 1.0, .95, 1.3); wallLight.position.set(LEDGE.x - 3, WALL_TOP + 7.5, 5.5); wallLight.target.position.set(LEDGE.x - .6, WALL_TOP + 1.6, -.52); scene.add(wallLight, wallLight.target);
    const spill = new THREE.PointLight(PAINT, 0, 3.2, 1.6); scene.add(spill);
    // ---- the 3D thread: the bucket's own paint material, a wobble, thicker at the crack and thinner as it speeds up; beads run down it
    const TS = 10, TQ = 26, thGeo = new THREE.CylinderGeometry(1, 1, 1, TS, TQ, true), thPos = thGeo.attributes.position;
    const thMat = paintIn.clone(); thMat.side = THREE.DoubleSide;
    const thread = new THREE.Mesh(thGeo, thMat); thread.visible = false; thread.frustumCulled = false; scene.add(thread);
    const beads = [0, 1, 2].map(() => { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), thMat); m.visible = false; m.frustumCulled = false; scene.add(m); return m; });
    // ---- where the blue leaves the earth, and the real bucket's column from there (pose-corrected: the camera rides up by E.dy while the journey runs)
    const solve = yScreen => { bucket.updateWorldMatrix(true, false); camera.updateMatrixWorld(); const A = bucket.localToWorld(V(.1, 0, .06)), P = y => { const v = V(A.x, y + E.dy, A.z).project(camera); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; };
      let y1 = A.y + .5, y2 = A.y + 6; for (let k = 0; k < 3; k++) { const f1 = P(y1)[1] - yScreen, f2 = P(y2)[1] - yScreen; if (Math.abs(f2 - f1) < 1e-6) break; const y3 = y2 - f2 * (y2 - y1) / (f2 - f1); y1 = y2; y2 = y3; }
      return { x: P(y2)[0], O: V(A.x, y2, A.z) }; };
    const topNow0 = () => { bucket.updateWorldMatrix(true, false); camera.updateMatrixWorld(); const v = bucket.localToWorld(V(0, BK.h + .12, 0)); v.y += E.dy; v.project(camera); return (1 - v.y) / 2 * innerHeight - 10; }; // the bucket's top as the final pose puts it (stable while the camera rides)
    // ---- the glide: a table of camera positions over time, steady speed, a ramp at both ends, a little quicker through the plain soil so the total stays what it was while the can gets its hold
    function buildGlide(cam1, s) { const target = cam1 * s / SPEED + TR - (J0 - J0_OLD), D0 = SPEED * TR / 2;
      const run = ft => { const tab = [0], dt = 1 / 120; let c = 0, t = 0; while (c < cam1 - .05 && t < 40) { const rem = (cam1 - c) * s, m = Math.max(.05, Math.min(ease(clamp(t / TR)), Math.sqrt(rem / D0))), f = 1 + (ft - 1) * ease(clamp((c - SOIL_FROM) / 500)); c += SPEED * m * f / s * dt; t += dt; tab.push(Math.min(c, cam1)); } return tab; };
      let lo = 1, hi = 3, tab = run(1); for (let i = 0; i < 12; i++) { const mid = (lo + hi) / 2; tab = run(mid); if (tab.length / 120 > target) lo = mid; else hi = mid; } return { tab, T: tab.length / 120, cam1 }; }
    const camAt = t => { if (t <= 0) return 0; const i = t * 120, k = Math.floor(i); return k >= glide.tab.length - 1 ? glide.cam1 : glide.tab[k] + (glide.tab[k + 1] - glide.tab[k]) * (i - k); };
    // ---- the seep: sprites along a seeded walk, uneven in width, pooling where it slows, following gaps; they only grow, so each frame draws just the new part
    function resamp(ctrl, step) { const out = []; let carry = 0; for (let i = 1; i < ctrl.length; i++) { const [x0, y0] = ctrl[i - 1], [x1, y1] = ctrl[i], L = Math.hypot(x1 - x0, y1 - y0); for (let d = carry; d < L; d += step) out.push([x0 + (x1 - x0) * d / L, y0 + (y1 - y0) * d / L]); carry = ((carry - L) % step + step) % step; } return out; }
    function buildVeins(xOut) { const yEnd = STRIP_Y + stripH - EDGE_UP - 18, N = 120, x0 = IMPACT[0], y0 = IMPACT[1] + 10, ctrl = [];
      for (let i = 0; i <= N; i++) { const q = i / N, env = Math.sin(Math.PI * q) ** .6; ctrl.push([x0 + (xOut - x0) * ease(q) + env * (58 * Math.sin(q * 8 + 1) + 28 * Math.sin(q * 21 + 2)) + 16 * (smooth(q * 70, 3) - .5), y0 + (yEnd - y0) * q + 8 * smooth(q * 50, 4)]); }
      const pools = [0, 1, 2, 3, 4, 5].map(k => .1 + .8 * hash(k, 11)), mk = (pts, wS, seed) => pts.map(([x, y], i, a) => { const q = i / a.length; let r = (.6 + .85 * smooth(i * .045, seed)) * wS; for (const p of pools) r += 1.1 * wS * Math.exp(-(((q - p) / .02) ** 2)) * (seed === 8 ? 1 : 0); return { x, y, r }; });
      const main = mk(resamp(ctrl, 4), 1, 8), br = []; for (let b = 0; b < 11; b++) { const at = .05 + .87 * hash(b, 3), p = main[Math.min(main.length - 1, Math.round(at * main.length))], dir = (b % 2 ? 1 : -1) * (.3 + .8 * hash(b, 5)), len = 130 + 330 * hash(b, 7), bc = [];
        for (let i = 0; i <= 30; i++) { const q = i / 30; bc.push([p.x + Math.sin(dir) * len * q + 18 * Math.sin(q * 10 + b) + 10 * (smooth(q * 30, 20 + b) - .5), p.y + Math.cos(dir) * len * q * .85 + 6 * Math.sin(q * 17 + b)]); }
        br.push({ at, pts: mk(resamp(bc, 4), .55 * (1 - .3 * hash(b, 9)), 40 + b).map((o, i, a) => ({ ...o, r: o.r * (1 - .7 * i / a.length) })) }); }
      return { main, br, x: xOut, yEnd }; }
    function drawSeg(list, i0, i1, k) { for (let i = i0; i < i1; i++) { const b = list[i], R = b.r * 24 * k, fresh = i > list.length - 10 ? .6 : 1;
        stamp(cM, spM, b.x, b.y, R * 2.4, .3 * fresh); stamp(cM, spM, b.x, b.y, R * 1.4, .42 * fresh); stamp(cS, spS, b.x, b.y, R * .9, .3 * fresh); } }
    function growVeins(pv) { if (!veins) return; if (!drawn) { drawn = { main: 0, br: veins.br.map(() => 0), bloom: 0 }; for (const c of [cM, cS]) { c.clearRect(0, 0, cvM.width, cvM.height); c.globalCompositeOperation = "source-over"; } }
      const n = Math.floor(veins.main.length * pv); if (n > drawn.main) { drawSeg(veins.main, drawn.main, n, 1); drawn.main = n; }
      veins.br.forEach((b, i) => { const m = Math.floor(b.pts.length * clamp((pv - b.at) * 2.6)); if (m > drawn.br[i]) { drawSeg(b.pts, drawn.br[i], m, 1); drawn.br[i] = m; } }); }
    function growBloom(r) { if (!drawn || r < drawn.bloom + 3) return; for (let k = 0; k < 7; k++) { const a = hash(k, drawn.bloom | 0) * 6.283, d = r * .45 * hash(k, 91), x = IMPACT[0] + Math.cos(a) * d * 1.5, y = IMPACT[1] + 8 + Math.sin(a) * d * .6; stamp(cM, spM, x, y, r * 1.5, .26); stamp(cS, spS, x, y, r * .7, .16); } drawn.bloom = r; }
    // ---- the crack in the wall under the soil's edge: dark and real, its lowest point where the paint wells and the thread starts; a wet stain round it and one short runnel under it
    function drawCrack(fill, runL) { cK.clearRect(0, 0, cvK.width, cvK.height); if (!veins) return; const x = veins.x, ev = STRIP_Y + stripH + CRACK_DY; cK.save(); cK.scale(.5, .5); cK.translate(0, -OY); cK.lineCap = "round"; cK.lineJoin = "round";
      const pts = []; for (let i = 0; i <= 18; i++) { const q = i / 18, d = q < .55 ? -140 + 140 * (q / .55) : (q - .55) / .45 * 105; pts.push([x + d + 4 * Math.sin(i * 2.9), ev - 16 + (q < .55 ? 14 * (q / .55) ** 1.5 : 14 - 18 * ((q - .55) / .45) ** 1.3) + 6 * (hash(i, 77) - .5)]); }
      const path = (arr, dy) => { cK.beginPath(); arr.forEach(([a, b], i) => i ? cK.lineTo(a, b + dy) : cK.moveTo(a, b + dy)); };
      let g = cK.createRadialGradient(x, ev - 6, 4, x, ev - 6, 130); g.addColorStop(0, `rgba(4,8,14,${.42 * (.4 + .6 * fill)})`); g.addColorStop(1, "rgba(4,8,14,0)"); cK.fillStyle = g; cK.save(); cK.translate(x, ev - 6); cK.scale(1.5, .8); cK.translate(-x, -(ev - 6)); cK.beginPath(); cK.arc(x, ev - 6, 130, 0, 6.283); cK.fill(); cK.restore();
      path(pts, 4); cK.strokeStyle = "rgba(165,170,176,.3)"; cK.lineWidth = 2.4; cK.stroke(); path(pts, 0); cK.strokeStyle = "rgba(0,0,0,.4)"; cK.lineWidth = 13; cK.stroke(); cK.strokeStyle = "#030303"; cK.lineWidth = 4.5; cK.stroke();
      if (fill > 0) { const n = Math.ceil(pts.length * clamp(.35 + .35 * fill)), a = Math.max(0, Math.floor((pts.length - n) / 2)); cK.beginPath(); pts.slice(a, a + n).forEach(([p, q], i) => i ? cK.lineTo(p, q) : cK.moveTo(p, q)); cK.strokeStyle = col(.75, .92 * fill); cK.lineWidth = 3.6; cK.stroke();
        const w = 6 + 12 * fill; g = cK.createRadialGradient(x, ev + 4, 0, x, ev + 4, w); g.addColorStop(0, col(1, .95 * fill)); g.addColorStop(.7, col(.8, .7 * fill)); g.addColorStop(1, col(.6, 0)); cK.fillStyle = g; cK.beginPath(); cK.ellipse(x, ev + 4, w * 1.6, w * .6, 0, 0, 6.283); cK.fill();
        const y0 = STRIP_Y + stripH - EDGE_UP + 6; cK.beginPath(); cK.moveTo(x + 2, y0); cK.bezierCurveTo(x + 6, y0 + (ev - y0) * .4, x - 4, y0 + (ev - y0) * .7, x, ev - 2); cK.strokeStyle = "rgba(6,12,24,.38)"; cK.lineWidth = 7; cK.stroke(); cK.strokeStyle = col(.7, .45 * fill); cK.lineWidth = 2; cK.stroke(); }
      if (runL > 0) { const wob = i => 2.2 * Math.sin(i * .35); cK.beginPath(); for (let i = 0; i <= runL / 5; i++) { const px = x + wob(i), py = ev + 8 + i * 5; i ? cK.lineTo(px, py) : cK.moveTo(px, py); } const gr = cK.createLinearGradient(0, ev, 0, ev + runL); gr.addColorStop(0, "rgba(6,12,24,.5)"); gr.addColorStop(1, "rgba(6,12,24,0)"); cK.strokeStyle = gr; cK.lineWidth = 11; cK.stroke();
        cK.beginPath(); for (let i = 0; i <= runL / 5; i++) { const px = x + wob(i), py = ev + 8 + i * 5; i ? cK.lineTo(px, py) : cK.moveTo(px, py); } const g2 = cK.createLinearGradient(0, ev, 0, ev + runL); g2.addColorStop(0, col(.8, .75)); g2.addColorStop(1, col(.8, 0)); cK.strokeStyle = g2; cK.lineWidth = 4; cK.stroke(); }
      cK.restore(); }
    const ripple = (x, y, k) => { const r = document.createElement("i"); r.className = "eRip"; r.style.left = x.toFixed(0) + "px"; r.style.top = y.toFixed(0) + "px"; box.appendChild(r);
      r.animate([{ transform: `translate(-50%, -50%) scale(${.2 * k})`, opacity: .8 }, { transform: `translate(-50%, -50%) scale(${1.5 * k})`, opacity: 0 }], { duration: 800, easing: "ease-out" }).onfinish = () => r.remove(); };
    E.skip = () => { if (started && !E.streamOn && !skipping && et > .3) { skipping = true; rate = 5; if (SEEK === null) vid.playbackRate = 5; } };
    addEventListener("pointerdown", E.skip); addEventListener("keydown", E.skip);
    dropEl.style.background = `radial-gradient(circle at 35% 30%, rgba(225,240,255,.9), ${col(1, 1)} 45%, ${col(.55, 1)})`;
    // the load counter: 0 at the first frame, 60 % at the end of the glide and still creeping while the bead waits, the rest as the bucket fills; the slow line holds it back (its own clock)
    let cNow = 0;
    const counter = () => { const fa = J0 + Tj + 1.1, jp = glide ? camAt(et - J0) / glide.cam1 : 0, ideal = et < fa ? COUNT_JOURNEY * jp + .03 * clamp((et - J0 - Tj) / 1.1) + .02 * clamp(et) : COUNT_JOURNEY + .03 + (1 - COUNT_JOURNEY - .03) * (1 - (1 - clamp((et - fa) / FILL_FAST)) ** 2);
      const slow = SLOW ? .6 * ease(clamp(lt / 11)) + .06 * clamp((lt - 11) / 4) + .34 * ease(clamp((lt - 15) / 7)) : 1; return Math.min(ideal, slow); };
    E.target = () => E.streamOn ? clamp((cNow - COUNT_JOURNEY) / (1 - COUNT_JOURNEY)) : 0;
    E.column = (column, mesh, top, r) => { if (!outS || !E.streamOn) return; mesh.visible = false; thMat.color.copy(paintIn.color); const O = outS.O, t = et, fp = ease(clamp((et - streamT) / .5)), F = V(top.x, Math.max(top.y, O.y - (O.y - top.y) * fp), top.z), R = Math.max(.004, r * .5 * (.45 + .55 * clamp((et - streamT) / .9)));
      for (let i = 0; i <= TQ; i++) { const q = i / TQ, wob = .012 * q * Math.sin(q * 9 + t * 6), wz = .008 * q * Math.sin(q * 7 - t * 5), cx = O.x + (F.x - O.x) * q + wob, cy = O.y + (F.y - O.y) * q, cz = O.z + wz;
        let rad = R * (1.7 - .95 * q ** .7) * (1 + .08 * Math.sin(q * 20 - t * 10)); if (fp < 1 && q > .88) rad *= Math.max(.15, 1 - ((q - .88) / .12) ** 2);
        for (let j = 0; j <= TS; j++) { const a = j / TS * 6.2832, k = i * (TS + 1) + j; thPos.setXYZ(k, cx + Math.sin(a) * rad, cy, cz + Math.cos(a) * rad * .8); } }
      thPos.needsUpdate = true; thGeo.computeVertexNormals(); thread.visible = true;
      beads.forEach((b, i) => { const ph = (t * 1.15 + i / 3) % 1, on = fp >= 1 && ph > .05; b.visible = on; if (on) { const k = ph ** 1.7; b.position.set(O.x + .02 * (i - 1), O.y + (top.y - O.y) * k, O.z + .01); b.scale.set(.02, .032 * (1 + k), .02); } }); };
    E.tick = (now, dt) => { if (!E.on) return;
      if (!started && (vid.readyState >= 3 || now - boot > 1800)) { started = true; vid.play().catch(() => {}); }
      if (SEEK !== null) { started = true; if (et !== SEEK) { et = lt = SEEK; vid.pause(); vid.currentTime = clamp(et, 0, 5.9); } } else if (started) { et += dt * rate; lt += dt; }
      const W = innerWidth, H = innerHeight, s = Math.max(W / FILM_W, H / FILM_H), xOff = (W - FILM_W * s) * (NARROW ? CAN_SHIFT : .5), bucketTop = topNow0();
      const gap = clamp(bucketTop - GAP_UP * H, GAP_MIN * H, GAP_MAX * H), Ew = STRIP_Y + stripH, cam1 = Ew - gap / s, key = W + "x" + H;
      if (key !== shapeKey) { shapeKey = key; glide = buildGlide(cam1, s); Tj = glide.T; }
      if (skipping && et >= J0 + Tj + 1.1) { skipping = false; rate = 1; vid.playbackRate = 1; }
      const camJ = glide.cam1 * 0 + camAt(et - J0), rt = readyAt ? (now - readyAt) / 1000 - LEAVE_AT : -1, lv = ease(clamp(rt / LEAVE_D)), cam = camJ + lv * (gap + 140) / s;
      const tf = `translate3d(${xOff.toFixed(1)}px, ${(-cam * s).toFixed(1)}px, 0) scale(${s.toFixed(4)})`; if (tf !== tx) { tx = tf; world.style.transform = tf; }
      const fa = J0 + Tj + 1.1; cNow = counter();
      if (!E.streamOn && et >= fa && cNow >= COUNT_JOURNEY - .001) { E.streamOn = true; streamT = SEEK !== null ? fa : et; }
      outS = solve(gap + CRACK_DY * s + 8 * s); const wx = (outS.x - xOff) / s; if (Math.abs(wx - veinX) > 3) { veinX = wx; veins = buildVeins(clamp(wx, 90, 990)); drawn = null; ksig = ""; }
      const pv = clamp((camJ + FRONT_LEAD * H / s - IMPACT[1]) / (veins.yEnd - IMPACT[1])), fill = ease(clamp((pv - .94) / .06)), runL = E.streamOn ? Math.min(150, 30 + 50 * (et - streamT + 1)) : 0;
      growVeins(pv); growBloom(et > 1 ? 24 + 60 * clamp((et - 1) / 5) : 0); const sig = Math.round(fill * 20) + "," + Math.round(runL / 6) + "," + (veinX | 0); if (sig !== ksig) { ksig = sig; drawCrack(fill, runL); }
      // the 3D camera rides down with the earth's edge: the crack's height is kept at the earth's edge on the screen, so wall, ledge and bucket rise into view as the earth leaves the top
      { const Pc = y => { const v = V(outS.O.x, y, outS.O.z).project(camera); return (1 - v.y) / 2 * H; }, y0 = Pc(outS.O.y), ppm = y0 - Pc(outS.O.y + 1), want = clamp((Ew + CRACK_DY + 8 - camJ) * s, 0, H * 1.7);
        if (ppm > 1) dyV = clamp(dyV + (want - y0) / ppm, 0, 12); if (goAt) dyV = 0; E.dy = dyV; }
      if (readyAt || goAt) { thread.visible = false; beads.forEach(b => b.visible = false); }
      const edgeNow = (Ew - cam) * s; E.bucketSeen = edgeNow < stBox[1] - 10; const wk = clamp((H * 1.05 - edgeNow) / (H * .5)); E.wall += (.3 * wk - E.wall) * Math.min(1, dt * 3);
      upWall.visible = !goAt; wallLight.intensity = 3.4 * wk * (goAt ? 0 : 1); spill.intensity = E.streamOn && !readyAt ? .35 : 0; spill.position.set(outS.O.x, outS.O.y - .25, .5);
      // the drip before the thread: a bead swells at the crack, necks, lets go and falls into the bucket's mouth; again and again until the thread starts
      const dr = H * .016, lipY = (Ew + CRACK_DY + 8 - cam) * s, mouth = proj(bucket.localToWorld(V(.1, BK.h - .02, .06))), ph = ((et - (J0 + Tj)) % DROP_PERIOD + DROP_PERIOD) % DROP_PERIOD, growT = .55, fallT = .42;
      const live = et > J0 + Tj && !E.streamOn && lv === 0 && ph < growT + fallT; if (live !== !!dropEl._on) { dropEl._on = live; dropEl.style.opacity = live ? 1 : 0; }
      if (live) { const grow = clamp(ph / growT), fall = ph > growT ? (ph - growT) / fallT : 0, D = Math.max(40, mouth[1] - lipY), sc = (.3 + .7 * ease(grow)) * dr / 10, y = lipY + ease(grow) * dr * .5 + D * fall * fall, st = fall > 0 ? 1 + 1.4 * fall : 1 + .6 * grow ** 2;
        dropEl.style.transform = `translate(${(outS.x - 5).toFixed(1)}px, ${y.toFixed(1)}px) scale(${(sc * (fall > 0 ? .85 : 1)).toFixed(3)}, ${(sc * st).toFixed(3)})`; if (fall > .96 && !dropEl._hit) { dropEl._hit = 1; ripple(mouth[0], mouth[1], .7); } if (fall === 0) dropEl._hit = 0; }
      if (E.streamOn && !readyAt && et - lastRip > .42) { lastRip = et; const A = proj(bucket.localToWorld(V(.1, Math.max(.02, level * FULL), .06))); ripple(A[0], A[1], 1); }
      // Tom's photo and name ride the same motion as the earth: the whole start layer is carried up by the earth's own lift (same distance, same easing, same moment) and settles as the last line appears
      startEl.style.transform = lv >= 1 ? "" : `translateY(${((1 - lv) * (gap + 140)).toFixed(1)}px)`; startEl.style.setProperty("--kin", clamp((lv - .05) / .45).toFixed(3));
      // the quiet line: the load from the first frame; "Tap to skip" after a second until the thread starts (not on the slow line, where a tap cannot skip the load)
      const txt = readyAt && lv >= .9 ? "Tip the bucket to enter" : `Loading the wall · ${Math.min(readyAt ? 100 : 99, Math.round(cNow * 100))} %`; if (txt !== loadT.textContent) loadT.textContent = txt;
      loadEl.style.opacity = goAt ? 0 : 1; skipEl.style.opacity = !SLOW && lt > 1 && !E.streamOn && !skipping ? .8 : 0;
      if (lv >= 1 && box.style.display !== "none") box.style.display = "none";
      if (goAt) { if (!E.gone) E.gone = performance.now(); else if (performance.now() - E.gone > 1500) { box.remove(); loadEl.remove(); upWall.visible = false; wallLight.intensity = 0; spill.intensity = 0; thread.visible = false; beads.forEach(b => b.visible = false); startEl.style.transform = ""; E.on = false; E.dy = 0; document.documentElement.classList.remove("earth-on"); } }
    };
    return E;
  })();

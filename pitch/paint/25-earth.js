  // ---- INTRO PROTOTYPE 4 (pitch/intro-earth, Tom's "through the earth"): one calm downward glide. The film plays (a hold on the can first), its water blue, and the view tilts down the pour to the mound, where the film's stake
  // goes on underground as the root of the storyboard's cross-section; the blue soaks down along it (a soft powdery layer revealed with the camera) and on through soil to the earth's ragged edge. The wall holds the earth back: the paint
  // comes out of a real drain outlet in the wall face (a permanent 3D part of the scene: collar, worn spout, dark mouth, stains), runs down as one thread and falls into the real bucket, which fills as the (faked) load ends.
  // The 3D camera rides down with the earth's edge, so earth and wall are one move, and the glide ends with the edge above the frame: the earth leaves by the camera's own move, nothing slides away afterwards.
  // ?load=slow|fast sets the fake load; ?intro=old shows master's start; ?seek=<s> holds a moment; a tap skips the glide. Its pictures (pitch/assets/intro/) are not in git.
  const EARTH = (() => {
    const E = { on: false, streamOn: false, bucketSeen: false, wall: 0, dy: 0 }, Q = new URLSearchParams(location.search), box = document.getElementById("earth"), loadEl = document.getElementById("eLoad");
    if (!box || REDUCED || Q.get("intro") === "old") { if (box) box.remove(); if (loadEl) loadEl.remove(); return E; } // reduced motion: the start as it is, no journey
    const world = document.getElementById("eWorld"), vid = document.getElementById("eVid"), strip = document.getElementById("eStrip"), soakEl = document.getElementById("eSoak"), cvM = document.getElementById("eCv"), cvS = document.getElementById("eCv2"),
      loadT = document.getElementById("eLoadT"), skipEl = document.getElementById("eSkip"), cM = cvM.getContext("2d"), cS = cvS.getContext("2d");
    const SEEK = Q.get("seek") === null ? null : +Q.get("seek"), SLOW = Q.get("load") === "slow";
    // the prototype's own numbers (listed in the report)
    const FILM_W = 1080, FILM_H = 1920, STRIP_Y = 1560, SOAK_END = [541, STRIP_Y + 1570], POUR_AT = [440, 1548], EDGE_UP = 95, EDGE_M = 1.15, // film pixels; where the baked soak of the root picture ends; the soil edge's height above the outlet in metres
      SPEED = NARROW ? 320 : 700, TR = .9, J0 = 2.3, J0_OLD = .4, SOIL_FROM = 1500, FRONT_LEAD = .55, GAP_UP = NARROW ? .27 : .33, GAP_MIN = .2, GAP_MAX = .42, OUT_UP = NARROW ? .14 : .12, // the outlet sits OUT_UP H above the bucket's top
      COUNT_JOURNEY = .6, FILL_FAST = 2.2, DROP_PERIOD = 1.05, LEAVE_AT = .25, LEAVE_D = 1.1, CAN_SHIFT = .8, PIPE_DZ = .09; // the phone's window leans to the film's right so the can is whole; the outlet's mouth stands PIPE_DZ proud of the wall
    let stripH = 2370, started = false, et = 0, lt = 0, rate = 1, skipping = false, Tj = 0, shapeKey = "", glide = null, veinX = -1, veins = null, drawn = null, outS = null, streamT = -1, lastRip = -9, tx = "", dyV = 0, O = null, yEdge3 = 0, cam1 = 0, stainK = 0, mouthK = 0;
    const boot = performance.now(), clamp = cl, ease = sm, hash = (i, j) => { const v = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return v - Math.floor(v); };
    const BLUE = SPRAY.split(",").map(Number), col = (k, a) => `rgba(${BLUE.map(v => Math.round(v * k))},${a})`; // ONE blue (the site's spray colour) for the film's water, the soak, the stains, the thread and the bead
    const smooth = (x, seed) => { const i = Math.floor(x), f = ease(x - i); return hash(i, seed) * (1 - f) + hash(i + 1, seed) * f; };
    const sizeCv = () => { const h = Math.ceil((stripH + 360) / 2); for (const c of [cvM, cvS]) { c.width = FILM_W / 2; c.height = h; c.style.top = (STRIP_Y - 60) + "px"; c.style.height = (stripH + 360) + "px"; } };
    strip.addEventListener("load", () => { if (strip.naturalWidth) { stripH = strip.naturalHeight * FILM_W / strip.naturalWidth; sizeCv(); veinX = -1; } });
    const fail = () => { E.on = false; box.remove(); if (loadEl) loadEl.remove(); document.documentElement.classList.remove("earth-on"); };
    vid.addEventListener("error", fail); strip.addEventListener("error", fail);
    E.on = true; document.documentElement.classList.add("earth-on"); sizeCv();
    const OY = STRIP_Y - 60;
    // ---- soft round sprites in the paint's blue (the last stretch of the soak, below the root picture): one darkens the soil (multiplied in), one lifts it (screened in)
    const sprite = (r, g, b) => { const c = document.createElement("canvas"); c.width = c.height = 64; const x = c.getContext("2d"), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, `rgba(${r},${g},${b},1)`); gr.addColorStop(.5, `rgba(${r},${g},${b},.5)`); gr.addColorStop(1, `rgba(${r},${g},${b},0)`); x.fillStyle = gr; x.fillRect(0, 0, 64, 64); return c; };
    const spM = sprite(...BLUE.map(v => Math.round(v * .5))), spS = sprite(...BLUE.map(v => Math.round(v * .8)));
    const stamp = (c, sp, x, y, D, a) => { c.globalAlpha = a; c.drawImage(sp, (x - D / 2) / 2, (y - D / 2 - OY) / 2, D / 2, D / 2); };
    // ---- the lit wall face above the ledge, set back behind the ledge, with its own soft light
    const upMat = new THREE.MeshStandardMaterial({ map: tex("assets/wall4_diff.jpg", true, 14 / TILE, 14 / TILE, .3, .2), normalMap: tex("assets/wall4_nor_gl.jpg", false, 14 / TILE, 14 / TILE, .3, .2), roughnessMap: tex("assets/wall4_rough.jpg", false, 14 / TILE, 14 / TILE, .3, .2), color: 0x777b81, envMapIntensity: .2, normalScale: new THREE.Vector2(.9, .9) });
    const upWall = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), upMat); upWall.name = "wallAboveLedge"; upWall.position.set(LEDGE.x, WALL_TOP + 7, -.52); scene.add(upWall);
    const wallLight = new THREE.SpotLight(0xdfe8ff, 0, 40, 1.0, .95, 1.3); wallLight.position.set(LEDGE.x - 3, WALL_TOP + 7.5, 5.5); wallLight.target.position.set(LEDGE.x - .6, WALL_TOP + 1.6, -.52); scene.add(wallLight, wallLight.target);
    // ---- the drain outlet: a real part of the scene (named "drainOutlet"), made when the layout is known; it stays on the wall afterwards, with its stains
    const SOILBLUE = new THREE.Color(0x0b77c3); // the soil's blue as measured on screen (#0b77c3): the thread, the drops, the lip and the bucket's paint are this, thick and opaque
    const paintMat = () => new THREE.MeshStandardMaterial({ color: SOILBLUE.clone().multiplyScalar(.15), emissive: SOILBLUE.clone().multiplyScalar(1), roughness: .6, metalness: 0, envMapIntensity: 0, side: THREE.DoubleSide });
    const tex2 = (w, h, draw) => { const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h); const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t; };
    const decalMat = (t, em) => new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: new THREE.Color(0xffffff), emissiveIntensity: em, transparent: true, depthWrite: false, roughness: 1, metalness: 0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    const rustTex = tex2(96, 256, (g, w, h) => { for (let y = 0; y < h; y++) { const q = y / h, cx = w / 2 + 1.5 * Math.sin(y * .05) + 1 * hash(y, 3), ww = (13 + 7 * smooth(y * .05, 2)) * (1 - .5 * q), a = (1 - q) ** 1.1; const gr = g.createLinearGradient(cx - ww, 0, cx + ww, 0); gr.addColorStop(0, "rgba(200,200,190,0)"); gr.addColorStop(.25, `rgba(225,225,212,${.4 * a})`); gr.addColorStop(.55, `rgba(140,88,48,${.85 * a})`); gr.addColorStop(1, "rgba(70,44,28,0)"); g.fillStyle = gr; g.fillRect(cx - ww, y, ww * 2, 1); } });
    const stainTex = tex2(96, 256, (g, w, h) => { for (let y = 0; y < h; y++) { const q = y / h, cx = w / 2 + 1.2 * Math.sin(y * .045) + 1 * hash(y, 9), ww = (15 + 6 * smooth(y * .05, 4) + 16 * Math.exp(-q * 12)) * (1 - .4 * q), a = (1 - q) ** .9; const gr = g.createLinearGradient(cx - ww * 1.7, 0, cx + ww * 1.7, 0); gr.addColorStop(0, "rgba(6,12,24,0)"); gr.addColorStop(.22, `rgba(5,16,40,${.6 * a})`); gr.addColorStop(.5, `rgba(11,119,195,${1 * a})`); gr.addColorStop(.78, `rgba(5,16,40,${.6 * a})`); gr.addColorStop(1, "rgba(6,12,24,0)"); g.fillStyle = gr; g.fillRect(cx - ww * 1.7, y, ww * 3.4, 1); } });
    const shadowTex = tex2(64, 64, (g, w, h) => { const gr = g.createRadialGradient(32, 26, 4, 32, 32, 32); gr.addColorStop(0, "rgba(0,0,0,.95)"); gr.addColorStop(.55, "rgba(0,0,0,.5)"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x3a372f, metalness: .5, roughness: .75, side: THREE.DoubleSide }), clayMat = new THREE.MeshStandardMaterial({ color: 0x33312f, roughness: .98, metalness: 0 });
    const outlet = new THREE.Group(); outlet.name = "drainOutlet"; scene.add(outlet);
    const mk = (geo, mat, x, y, z, rx = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.x = rx; outlet.add(m); return m; };
    const shadowD = mk(new THREE.PlaneGeometry(1, 1), decalMat(shadowTex, 0), 0, -.1, .002); const rustD = mk(new THREE.PlaneGeometry(.3, .9), decalMat(rustTex, .35), -.1, -.5, .003); const stainD = mk(new THREE.PlaneGeometry(.3, 1.0), decalMat(stainTex, .6), .02, -.6, .004); stainD.material.opacity = 0;
    mk(new THREE.CylinderGeometry(.14, .155, .035, 36), clayMat, 0, 0, .0175, Math.PI / 2); // the collar set into the concrete
    mk(new THREE.CylinderGeometry(.108, .118, .07, 30, 1, true), metalMat, 0, 0, .055, Math.PI / 2); // the worn spout
    mk(new THREE.CylinderGeometry(.1, .1, .068, 30, 1, true), new THREE.MeshStandardMaterial({ color: 0x1a1b1d, roughness: .9, metalness: .2, side: THREE.BackSide }), 0, 0, .054, Math.PI / 2); // the drain's inner wall
    mk(new THREE.CircleGeometry(.1, 30), new THREE.MeshBasicMaterial({ color: 0x010102 }), 0, 0, .02); // the dark depth
    mk(new THREE.TorusGeometry(.112, .011, 10, 36), new THREE.MeshStandardMaterial({ color: 0x4a463f, metalness: .5, roughness: .6 }), 0, 0, PIPE_DZ); // the rim
    const lowerLip = mk(new THREE.TorusGeometry(.104, .009, 8, 20, Math.PI), new THREE.MeshStandardMaterial({ color: 0x8d877b, metalness: .4, roughness: .5 }), 0, 0, PIPE_DZ - .004); lowerLip.rotation.z = Math.PI; // catches the light on the lower lip
    const lipBlob = mk(new THREE.SphereGeometry(1, 20, 12), paintMat(), 0, -.1, PIPE_DZ - .002); lipBlob.scale.set(.001, .001, .001); // the wet paint spilling over the lower edge
    outlet.visible = false;
    const dropM = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), paintMat()); dropM.visible = false; dropM.frustumCulled = false; scene.add(dropM);
    // ---- the bucket: rougher metal with dents, paint drips on the rim and side, a contact shadow on the ledge
    { const dent = tex2(256, 128, (g, w, h) => { g.fillStyle = "#808080"; g.fillRect(0, 0, w, h); for (let i = 0; i < 46; i++) { const x = hash(i, 51) * w, y = hash(i, 52) * h, r = 5 + 20 * hash(i, 53), gr = g.createRadialGradient(x, y, 0, x, y, r); const d = hash(i, 54) > .5; gr.addColorStop(0, d ? "rgba(30,30,30,.55)" : "rgba(230,230,230,.4)"); gr.addColorStop(1, "rgba(128,128,128,0)"); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }  }); dent.encoding = THREE.LinearEncoding;
      metal.color.setHex(0x7b8086); metal.roughness = .52; metal.metalness = .82; metal.envMapIntensity = .45; metal.bumpMap = dent; metal.bumpScale = .1; metal.clearcoat = .1; metal.needsUpdate = true;
      const rr = y => BK.r0 + (BK.r1 - BK.r0) * y / BK.h, pm = paintMat();
      for (const [ph, len, w] of [[-.55, .13, .0085], [.1, .09, .007], [.52, .17, .009], [.9, .06, .006], [-1.1, .07, .006]]) { const y0 = BK.h - .02, r = rr(y0) + .004, x = Math.sin(ph) * r, z = Math.cos(ph) * r; const d = new THREE.Mesh(new THREE.CylinderGeometry(w, w * .9, len, 8), pm); d.position.set(x, y0 - len / 2, z); const b = new THREE.Mesh(new THREE.SphereGeometry(w * 1.45, 10, 8), pm); b.position.set(x, y0 - len, z); bucket.add(d, b); }
      const band = new THREE.Mesh(new THREE.CylinderGeometry(BK.r1 + .003, BK.r1 + .001, .045, 24, 1, true, -1.3, 1.9), pm); band.position.y = BK.h - .02; bucket.add(band); // a paint-stained stretch of the rim
      const sh = new THREE.Mesh(new THREE.PlaneGeometry(.95, .7), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: .8, polygonOffset: true, polygonOffsetFactor: -3 })); sh.rotation.x = -Math.PI / 2; sh.position.set(bucketHome.position.x - .02, bucketHome.position.y + .004, bucketHome.position.z + .02); sh.name = "bucketShadow"; scene.add(sh); E.shadow = sh; }
    // ---- the 3D thread: thick opaque paint, a small wobble, thicker at the outlet and thinner as it speeds up; hangs plumb on the screen; beads run down it
    const TS = 10, TQ = 26, thGeo = new THREE.CylinderGeometry(1, 1, 1, TS, TQ, true), thPos = thGeo.attributes.position, thMat = paintMat();
    const thread = new THREE.Mesh(thGeo, thMat); thread.visible = false; thread.frustumCulled = false; scene.add(thread);
    const beads = [0, 1, 2].map(() => { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), thMat); m.visible = false; m.frustumCulled = false; scene.add(m); return m; });
    // ---- projections with the riding camera taken out (pose 0 = the start's own camera)
    const proj0 = (x, y, z) => { const v = V(x, y + E.dy, z).project(camera); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; };
    const topNow0 = () => { bucket.updateWorldMatrix(true, false); camera.updateMatrixWorld(); const v = bucket.localToWorld(V(0, BK.h + .12, 0)); return proj0(v.x, v.y, v.z)[1] - 10; };
    function placeOutlet(gapP) { bucket.updateWorldMatrix(true, false); camera.updateMatrixWorld(); const A = bucket.localToWorld(V(.1, 0, .06)); let y1 = A.y + .5, y2 = A.y + 6;
      for (let k = 0; k < 3; k++) { const f1 = proj0(A.x, y1, -.52)[1] - gapP, f2 = proj0(A.x, y2, -.52)[1] - gapP; if (Math.abs(f2 - f1) < 1e-6) break; const y3 = y2 - f2 * (y2 - y1) / (f2 - f1); y1 = y2; y2 = y3; }
      O = V(A.x, y2, -.52 + PIPE_DZ - .01); yEdge3 = y2 + EDGE_M; outlet.position.set(O.x, O.y + .125, -.52); outlet.visible = true; const rim = bucket.localToWorld(V(.1, BK.h - .02, .06)); O.rimY = rim.y; }
    // ---- the glide: a table of camera positions over time, steady speed, a ramp at both ends, quicker through the plain soil so the total stays what it was while the can gets its hold
    function buildGlide(camEnd, s, target) { const D0 = SPEED * TR / 2;
      const run = ft => { const tab = [0], dt = 1 / 120; let c = 0, t = 0; while (c < camEnd - .05 && t < 40) { const rem = (camEnd - c) * s, m = Math.max(.05, Math.min(ease(clamp(t / TR)), Math.sqrt(rem / D0))), f = 1 + (ft - 1) * ease(clamp((c - SOIL_FROM) / 500)); c += SPEED * m * f / s * dt; t += dt; tab.push(Math.min(c, camEnd)); } return tab; };
      let lo = 1, hi = 4, tab = run(1); for (let i = 0; i < 12; i++) { const mid = (lo + hi) / 2; tab = run(mid); if (tab.length / 120 > target) lo = mid; else hi = mid; } return { tab, T: tab.length / 120, cam1: camEnd }; }
    const camAt = t => { if (t <= 0) return 0; const i = t * 120, k = Math.floor(i); return k >= glide.tab.length - 1 ? glide.cam1 : glide.tab[k] + (glide.tab[k + 1] - glide.tab[k]) * (i - k); };
    // ---- the last stretch of the soak: sprites along a seeded walk from where the root picture's soak ends to above the outlet; they only grow, so each frame draws just the new part
    function resamp(ctrl, step) { const out = []; let carry = 0; for (let i = 1; i < ctrl.length; i++) { const [x0, y0] = ctrl[i - 1], [x1, y1] = ctrl[i], L = Math.hypot(x1 - x0, y1 - y0); for (let d = carry; d < L; d += step) out.push([x0 + (x1 - x0) * d / L, y0 + (y1 - y0) * d / L]); carry = ((carry - L) % step + step) % step; } return out; }
    function buildVeins(xOut) { const yEnd = STRIP_Y + stripH - EDGE_UP - 85, N = 70, [x0, y0] = SOAK_END, ctrl = [];
      for (let i = 0; i <= N; i++) { const q = i / N, env = Math.sin(Math.PI * q) ** .6; ctrl.push([x0 + (xOut - x0) * ease(q) + env * (26 * Math.sin(q * 7 + 1) + 12 * Math.sin(q * 19 + 2)) + 12 * (smooth(q * 50, 3) - .5), y0 + (yEnd - y0) * q + 6 * smooth(q * 40, 4)]); }
      const pools = [.2, .5, .78], mkp = (pts, wS, seed) => pts.map(([x, y], i, a) => { const q = i / a.length; let r = (.55 + .8 * smooth(i * .05, seed)) * wS; for (const p of pools) r += .9 * wS * Math.exp(-(((q - p) / .03) ** 2)) * (seed === 8 ? 1 : 0); return { x, y, r }; });
      const main = mkp(resamp(ctrl, 4), 1, 8), br = []; for (let b = 0; b < 4; b++) { const at = .1 + .7 * hash(b, 3), p = main[Math.min(main.length - 1, Math.round(at * main.length))], dir = (b % 2 ? 1 : -1) * (.3 + .7 * hash(b, 5)), len = 90 + 160 * hash(b, 7), bc = [];
        for (let i = 0; i <= 20; i++) { const q = i / 20; bc.push([p.x + Math.sin(dir) * len * q + 12 * Math.sin(q * 10 + b), p.y + Math.cos(dir) * len * q * .85 + 4 * Math.sin(q * 17 + b)]); }
        br.push({ at, pts: mkp(resamp(bc, 4), .5, 40 + b).map((o, i, a) => ({ ...o, r: o.r * (1 - .7 * i / a.length) })) }); }
      const preC = []; for (let i = 0; i <= 24; i++) { const q = i / 24; preC.push([POUR_AT[0] + (524 - POUR_AT[0]) * ease(q) + 8 * Math.sin(q * 9), POUR_AT[1] + (STRIP_Y + 300 - POUR_AT[1]) * q]); }
      return { main, br, pre: mkp(resamp(preC, 4), 1.25, 12), x: xOut, yEnd }; }
    // where the water soaks in at the stake's foot the soil turns blue: a clearly blue patch grows there, then the soak runs on down (the film itself stays natural)
    function growBloom(r) { if (!drawn || r < drawn.bloom + 3) return; for (let k = 0; k < 9; k++) { const a = hash(k, drawn.bloom | 0) * 6.283, d = r * .5 * hash(k, 91), x = POUR_AT[0] + Math.cos(a) * d * 1.6, y = POUR_AT[1] + 4 + Math.sin(a) * d * .55; stamp(cS, spS, x, y, r * 1.3, .17); stamp(cM, spM, x, y, r * 1.6, .08); stamp(cS, spS, x + (hash(k, 93) - .5) * r, y + (hash(k, 94) - .5) * r * .5, 6 + 10 * hash(k, 95), .4); } drawn.bloom = r; }
    function drawSeg(list, i0, i1) { for (let i = i0; i < i1; i++) { const b = list[i], R = b.r * 34, f = i > list.length - 10 ? .6 : 1; stamp(cS, spS, b.x, b.y, R * 2.4, .1 * f); stamp(cS, spS, b.x, b.y, R * 1.4, .14 * f); stamp(cM, spM, b.x, b.y, R * 2, .05 * f);
        for (let k = 0; k < 3; k++) { const a = hash(i, k + 70) * 6.283, d = R * (.2 + .9 * hash(i, k + 71)); stamp(cS, spS, b.x + Math.cos(a) * d, b.y + Math.sin(a) * d, 5 + 9 * hash(i, k + 72), .5 * f); } } }
    function growVeins(pv, pre) { if (!veins) return; if (!drawn) { drawn = { main: 0, pre: 0, bloom: 0, br: veins.br.map(() => 0) }; for (const c of [cM, cS]) { c.clearRect(0, 0, cvM.width, cvM.height); c.globalCompositeOperation = "source-over"; } }
      const np = Math.floor(veins.pre.length * pre); if (np > drawn.pre) { drawSeg(veins.pre, drawn.pre, np); drawn.pre = np; }
      const n = Math.floor(veins.main.length * pv); if (n > drawn.main) { drawSeg(veins.main, drawn.main, n); drawn.main = n; }
      veins.br.forEach((b, i) => { const m = Math.floor(b.pts.length * clamp((pv - b.at) * 2.6)); if (m > drawn.br[i]) { drawSeg(b.pts, drawn.br[i], m); drawn.br[i] = m; } }); }
    const ripple = (x, y, k) => { const r = document.createElement("i"); r.className = "eRip"; r.style.left = x.toFixed(0) + "px"; r.style.top = y.toFixed(0) + "px"; box.appendChild(r);
      r.animate([{ transform: `translate(-50%, -50%) scale(${.2 * k})`, opacity: .8 }, { transform: `translate(-50%, -50%) scale(${1.5 * k})`, opacity: 0 }], { duration: 800, easing: "ease-out" }).onfinish = () => r.remove(); };
    E.skip = () => { if (started && !E.streamOn && !skipping && et > .3) { skipping = true; rate = 5; if (SEEK === null) vid.playbackRate = 5; } };
    addEventListener("pointerdown", E.skip); addEventListener("keydown", E.skip);
    // the load counter: 0 at the first frame, 60 % at the end of the glide and still creeping while the bead waits, the rest as the bucket fills; the slow line holds it back (its own clock)
    let cNow = 0;
    const counter = () => { const fa = J0 + Tj + 1.1, jp = glide ? camAt(et - J0) / glide.cam1 : 0, ideal = et < fa ? COUNT_JOURNEY * jp + .03 * clamp((et - J0 - Tj) / 1.1) + .02 * clamp(et) : COUNT_JOURNEY + .03 + (1 - COUNT_JOURNEY - .03) * (1 - (1 - clamp((et - fa) / FILL_FAST)) ** 2);
      const slow = SLOW ? .6 * ease(clamp(lt / 11)) + .06 * clamp((lt - 11) / 4) + .34 * ease(clamp((lt - 15) / 7)) : 1; return Math.min(ideal, slow); };
    E.target = () => E.streamOn ? clamp((cNow - COUNT_JOURNEY) / (1 - COUNT_JOURNEY)) : 0;
    const plumb = cy => { const X0 = proj(O)[0], p0 = proj(V(O.x, cy, O.z))[0], p1 = proj(V(O.x + 1, cy, O.z))[0]; return O.x + (X0 - p0) / (p1 - p0); };
    E.column = (column, mesh, top, r) => { if (!O || !E.streamOn) return; mesh.visible = false; const t = et, fp = ease(clamp((et - streamT) / .5)), x = O.x, z = O.z, X0 = proj(O)[0], yTop = O.y, yBot = Math.max(top.y, yTop - (yTop - top.y) * fp), R = Math.max(.006, r * .8 * (.45 + .55 * clamp((et - streamT) / .9)));
      for (let i = 0; i <= TQ; i++) { const q = i / TQ, wob = .004 * q * Math.sin(q * 9 + t * 6), cy = yTop + (yBot - yTop) * q, px = plumb(cy);
        let rad = R * (1.7 - .95 * q ** .7) * (1 + .08 * Math.sin(q * 20 - t * 10)); if (fp < 1 && q > .88) rad *= Math.max(.15, 1 - ((q - .88) / .12) ** 2);
        for (let j = 0; j <= TS; j++) { const a = j / TS * 6.2832, k = i * (TS + 1) + j; thPos.setXYZ(k, px + wob + Math.sin(a) * rad, cy, z + Math.cos(a) * rad * .8); } }
      thPos.needsUpdate = true; thGeo.computeVertexNormals(); thread.visible = true;
      beads.forEach((b, i) => { const ph = (t * 1.15 + i / 3) % 1, on = fp >= 1 && ph > .05; b.visible = on; if (on) { const k = ph ** 1.7; const by = yTop + (top.y - yTop) * k; b.position.set(plumb(by) + .008 * (i - 1), by, z); b.scale.set(.016, .026 * (1 + k), .016); } }); };
    E.tick = (now, dt) => { if (!E.on) return;
      if (!glide && !(stBox[1] > 0)) return; // the start is placed from the camera of the first frame: the outlet is laid out from it, so wait for it
      if (!started && (vid.readyState >= 3 || now - boot > 1800)) { started = true; vid.play().catch(() => {}); }
      if (SEEK !== null) { started = true; if (et !== SEEK) { et = lt = SEEK; vid.pause(); vid.currentTime = clamp(et, 0, 5.9); } } else if (started) { et += dt * rate; lt += dt; }
      const W = innerWidth, H = innerHeight, s = Math.max(W / FILM_W, H / FILM_H), xOff = (W - FILM_W * s) * (NARROW ? CAN_SHIFT : .5), bucketTop = topNow0(), Ew = STRIP_Y + stripH, key = W + "x" + H;
      if (key !== shapeKey) { shapeKey = key; const gapOld = clamp(bucketTop - GAP_UP * H, GAP_MIN * H, GAP_MAX * H); placeOutlet(clamp(bucketTop - OUT_UP * H, .3 * H, .5 * H));
        const yRest = Math.min(proj0(O.x, yEdge3, -.52)[1], -.08 * H); cam1 = Ew - EDGE_UP - yRest / s; glide = buildGlide(cam1, s, (Ew - gapOld / s) * s / SPEED + TR - (J0 - J0_OLD)); Tj = glide.T; }
      if (skipping && et >= J0 + Tj + 1.1) { skipping = false; rate = 1; vid.playbackRate = 1; }
      const camJ = camAt(et - J0), cam = camJ, fa = J0 + Tj + 1.1, dripA = J0 + Tj - .4, rt = readyAt ? (now - readyAt) / 1000 - (NARROW ? .6 : LEAVE_AT) : -1, lv = ease(clamp(rt / LEAVE_D));
      const tf = `translate3d(${xOff.toFixed(1)}px, ${(-cam * s).toFixed(1)}px, 0) scale(${s.toFixed(4)})`; if (tf !== tx) { tx = tf; world.style.transform = tf; }
      cNow = counter(); if (!E.streamOn && et >= fa && cNow >= COUNT_JOURNEY - .001) { E.streamOn = true; streamT = SEEK !== null ? fa : et; }
      const wx = (outlet.position.x ? (proj0(O.x, O.y, -.52)[0] - xOff) / s : 540); if (Math.abs(wx - veinX) > 3) { veinX = wx; veins = buildVeins(clamp(wx, 90, 990)); drawn = null; }
      const frontW = camJ + FRONT_LEAD * H / s, pv = clamp((frontW - SOAK_END[1]) / (veins.yEnd - SOAK_END[1]));
      growVeins(pv, clamp((frontW - POUR_AT[1]) / (STRIP_Y + 300 - POUR_AT[1]))); growBloom(et > 1 ? 30 + 80 * clamp((et - 1) / 4) : 0); soakEl.style.setProperty("--f", Math.max(0, frontW - STRIP_Y).toFixed(0) + "px");
      // the 3D camera rides down with the earth's edge: the soil's edge (a height on the wall) is kept at the overlay's edge on the screen, so wall, outlet and bucket come into view as the earth leaves the top
      if (!readyAt) { const Pc = y => { const v = V(O.x, y, -.52).project(camera); return (1 - v.y) / 2 * H; }, y0 = Pc(yEdge3), ppm = y0 - Pc(yEdge3 + 1), want = clamp((Ew - EDGE_UP - camJ) * s, -2 * H, H * 1.7);
        if (ppm > 1) dyV = clamp(dyV + (want - y0) / ppm, 0, 14); } if (goAt) dyV = 0; E.dy = dyV;
      if (readyAt || goAt) { thread.visible = false; beads.forEach(b => b.visible = false); }
      const edgeNow = (Ew - EDGE_UP - cam) * s; E.bucketSeen = edgeNow < stBox[1] - 10; const wk = clamp((H * 1.05 - edgeNow) / (H * .5)); E.wall += (.3 * wk - E.wall) * Math.min(1, dt * 3);
      wallLight.intensity = (goAt ? 1.8 : 3.4 * wk); if (edgeNow < -200 && box.style.display !== "none") box.style.display = "none";
      // the outlet's life: paint wells in the mouth, a stain grows under it and stays; the bead swells at the lip, necks, lets go and falls into the bucket's mouth; again and again until the thread starts, and a rare late drop after the fill
      mouthK = Math.max(mouthK, clamp((et - dripA + .5) / 1.4)); { const lk = readyAt ? .72 : mouthK; lipBlob.scale.set(.1 * lk + .001, .03 * lk + .001, .055 * lk + .001); }
      paintCoat.color.copy(SOILBLUE).multiplyScalar(.15); paintCoat.emissive.copy(SOILBLUE).multiplyScalar(.95); paintCoat.envMapIntensity = 0; paintCoat.clearcoat = 0; paintIn.color.copy(SOILBLUE).multiplyScalar(.15); paintIn.emissive.copy(SOILBLUE).multiplyScalar(.95); paintIn.envMapIntensity = 0; filmMat.color.copy(SOILBLUE).multiplyScalar(.15); filmMat.emissive.copy(SOILBLUE).multiplyScalar(.9); if (E.shadow) E.shadow.visible = !goAt; if (readyAt) mouthK = Math.min(mouthK, .65);
      stainK = Math.max(stainK, clamp((et - dripA) / 6) * .95); stainD.material.opacity = Math.min(1, stainK);
      const growT = .55, fallT = .42; let ph = -1, kind = 0; if (!E.streamOn && et > dripA && !readyAt) ph = ((et - dripA) % DROP_PERIOD + DROP_PERIOD) % DROP_PERIOD; else if (readyAt && !goAt) { const q = (now - readyAt) / 1000 - 3; if (q > 0) { ph = q % 7.5; kind = 1; } }
      const live = ph >= 0 && ph < growT + fallT; dropM.visible = live;
      if (live) { const grow = clamp(ph / growT), fall = ph > growT ? (ph - growT) / fallT : 0, D = Math.max(.1, O.y - O.rimY), sz = (.007 + .024 * ease(grow)) * (kind ? .85 : 1), st = fall > 0 ? 1 + 1.6 * fall : 1 + .7 * grow ** 2; { const dyp = O.y - sz * st * .9 - D * fall * fall; dropM.position.set(plumb(dyp), dyp, O.z); } dropM.scale.set(sz, sz * st, sz);
        if (fall > .96 && !dropM._hit) { dropM._hit = 1; const m = proj(V(O.x, O.rimY, O.z)); ripple(m[0], m[1], .7); } if (fall === 0) dropM._hit = 0; }
      if (E.streamOn && !readyAt && et - lastRip > .42) { lastRip = et; const A = proj(V(O.x, bucket.localToWorld(V(.1, Math.max(.02, level * FULL), .06)).y, O.z)); ripple(A[0], A[1], 1); }
      // Tom's photo and name: on a laptop they sit under the earth and are UNCOVERED by its edge as the view moves; on a phone they would stand in the thread's way, so they come after the fill, uncovered by a rising edge (solid, no fade)
      if (NARROW) { const tY = lv >= 1 ? 0 : (1 - lv) * H * .98; startEl.style.transform = lv >= 1 ? "" : `translateY(${tY.toFixed(1)}px)`; startEl.style.setProperty("--kin", lv > .02 ? 1 : 0);
        startEl.style.clipPath = "none"; } else startEl.style.setProperty("--kin", 1);
      // the quiet line: the load from the first frame; "Tap to skip" after a second until the thread starts (not on the slow line, where a tap cannot skip the load); the plate steps aside while a phone's name comes up
      const ready2 = readyAt && (NARROW ? lv >= .9 : (now - readyAt) > 300), txt = ready2 ? "Tip the bucket to enter" : `Loading the wall · ${Math.min(readyAt ? 100 : 99, Math.round(cNow * 100))} %`; if (txt !== loadT.textContent) loadT.textContent = txt;
      loadEl.style.opacity = goAt || (NARROW && readyAt && lv < .9) ? 0 : 1; skipEl.style.opacity = !SLOW && lt > 1 && !E.streamOn && !skipping ? .8 : 0;
      if (goAt) { if (!E.gone) E.gone = performance.now(); else if (performance.now() - E.gone > 1500) { box.remove(); loadEl.remove(); thread.visible = false; beads.forEach(b => b.visible = false); dropM.visible = false; startEl.style.clipPath = ""; startEl.style.transform = ""; E.on = false; E.dy = 0; document.documentElement.classList.remove("earth-on"); } }
    };
    return E;
  })();

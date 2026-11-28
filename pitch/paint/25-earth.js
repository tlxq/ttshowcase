  // ---- INTRO PROTOTYPE 4 (pitch/intro-earth, Tom's "through the earth"): one calm downward glide. The film plays (a hold on the can first), its water blue, and the view tilts down the pour to the mound, where the film's stake
  // goes on underground as the root of the storyboard's cross-section; the blue soaks down along it (a soft powdery layer revealed with the camera) and on through soil to the earth's ragged edge. The wall holds the earth back: the paint
  // comes out of a real drain outlet in the wall face (a permanent 3D part of the scene: collar, worn spout, dark mouth, stains), runs down as one thread and falls into the real bucket, which fills as the (faked) load ends.
  // The 3D camera rides down with the earth's edge, so earth and wall are one move, and the glide ends with the edge above the frame: the earth leaves by the camera's own move, nothing slides away afterwards.
  // ?load=slow|fast sets the fake load; ?intro=old shows master's start; ?seek=<s> holds a moment; a tap skips the glide. Its pictures (pitch/assets/intro/) are not in git.
  const EARTH = (() => {
    const REST_M = 1.5, RX = -.3, RZ = .85, E = window.__earth = { on: false, streamOn: false, bucketSeen: false, wall: 0, dy: 0, rest: NARROW ? REST_M : 0, rx: NARROW ? RX : 0, rz: NARROW ? RZ : 0 }, Q = new URLSearchParams(location.search), box = document.getElementById("earth"), loadEl = document.getElementById("eLoad");
    if (!box || REDUCED || Q.get("intro") === "old") { if (box) box.remove(); if (loadEl) loadEl.remove(); return E; } // reduced motion: the start as it is, no journey
    const world = document.getElementById("eWorld"), vid = document.getElementById("eVid"), strip = document.getElementById("eStrip"), soakEl = document.getElementById("eSoak"), cvM = document.getElementById("eCv"), cvS = document.getElementById("eCv2"),
      loadT = document.getElementById("eLoadT"), skipEl = document.getElementById("eSkip"), cM = cvM.getContext("2d"), cS = cvS.getContext("2d");
    const SEEK = Q.get("seek") === null ? null : +Q.get("seek"), SLOW = Q.get("load") === "slow";
    // the prototype's own numbers (listed in the report)
    const FILM_W = 1080, FILM_H = 1920, STRIP_Y = 1560, SOAK_END = [541, STRIP_Y + 1570], POUR_AT = [440, 1548], EDGE_UP = 95, EDGE_M = NARROW ? 2.8 : 1.15, // film pixels; where the baked soak of the root picture ends; the soil edge's height above the outlet in metres
      SPEED = NARROW ? 320 : 700, TR = .9, J0 = 2.3, J0_OLD = .4, SOIL_FROM = 1500, FRONT_LEAD = .55, GAP_UP = NARROW ? .27 : .33, GAP_MIN = .2, GAP_MAX = .42, OUT_UP = NARROW ? .1 : .12, // the outlet sits OUT_UP H above the bucket's top
      COUNT_JOURNEY = .6, FILL_FAST = 2.2, DROP_PERIOD = 1.05, LATE_FIRST = Q.get("latedrop") ? .5 : 3, LATE_PERIOD = Q.get("latedrop") ? 2.2 : 7.5, LEAVE_AT = .25, LEAVE_D = 1.1, CAN_SHIFT = .8, PIPE_DZ = .09; // the phone's window leans to the film's right so the can is whole; the outlet's mouth stands PIPE_DZ proud of the wall
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
    const decalMat = t => new THREE.MeshStandardMaterial({ map: t, transparent: true, depthWrite: false, roughness: 1, metalness: 0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    // the stain: ON the wall, matte, darker than the wall, narrow with an uneven edge; its top is the wet blue film that left the lip
    const stainTex = tex2(64, 256, (g, w, h) => { for (let y = 0; y < h; y++) { const q = y / h, cx = w / 2 + 1.4 * Math.sin(y * .05) + 1.2 * (smooth(y * .11, 9) - .5), ww = (5.5 + 3.5 * smooth(y * .06, 4)) * (1 - .35 * q), a = q < .9 ? .9 : .9 * (1 - (q - .9) / .1), jl = 1.6 * hash(y, 21), jr = 1.6 * hash(y, 22), wet = y < 16 ? 1 - y / 16 : 0;
        g.fillStyle = `rgba(${Math.round(9 + 2 * wet)},${Math.round(24 + 95 * wet)},${Math.round(46 + 150 * wet)},${a})`; g.fillRect(cx - ww + jl, y, 2 * ww - jl - jr, 1); g.fillStyle = `rgba(6,14,28,${a * .5})`; g.fillRect(cx - ww - 1.4 + jl, y, 1.4, 1); g.fillRect(cx + ww - jr, y, 1.4, 1); } });
    const rustTex = tex2(16, 256, (g, w, h) => { for (let y = 0; y < h; y++) { const q = y / h, a = (1 - q) ** 1.2 * .85, cx = w / 2 + 1.5 * Math.sin(y * .04); g.fillStyle = `rgba(112,70,40,${a})`; g.fillRect(cx - 1.2, y, 2.4, 1); } });
    const shadowTex = tex2(64, 64, (g, w, h) => { const gr = g.createRadialGradient(32, 26, 4, 32, 32, 32); gr.addColorStop(0, "rgba(0,0,0,.95)"); gr.addColorStop(.55, "rgba(0,0,0,.5)"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
    const outlet = new THREE.Group(); outlet.name = "drainOutlet"; scene.add(outlet);
    const COLLAR_D = .085, HOLE = .108; // the collar's depth (the mouth stands this far off the wall) and the hole's radius, metres
    const shadowD = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), decalMat(shadowTex)); shadowD.position.set(0, -.19, .002); shadowD.scale.set(.6, .42, 1); outlet.add(shadowD); // the collar's cast shadow on the wall below it
    const stainD = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), decalMat(stainTex)); stainD.position.z = .003; outlet.add(stainD); stainD.material.opacity = 0;
    const rustD = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), decalMat(rustTex)); rustD.scale.set(.032, .6, 1); rustD.position.set(.092, -.11 - .3, .0035); rustD.rotation.z = .04; outlet.add(rustD);
    { const sh = new THREE.Shape(), N = 64; for (let i = 0; i <= N; i++) { const a = i / N * Math.PI * 2, r = .15 + .006 * Math.sin(a * 3 + 1) + .005 * (hash(i, 31) - .5) * 2 - (i % 23 < 2 ? .009 : 0); i ? sh.lineTo(Math.cos(a) * r, Math.sin(a) * r) : sh.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
      const hole = new THREE.Path(); hole.absarc(0, 0, HOLE, 0, Math.PI * 2, true); sh.holes.push(hole);
      const geo = new THREE.ExtrudeGeometry(sh, { depth: COLLAR_D, bevelEnabled: false, curveSegments: 24 });
      const face = new THREE.MeshStandardMaterial({ map: upMat.map, normalMap: upMat.normalMap, color: 0x9a9da2, roughness: .96, metalness: 0 }), bore = new THREE.MeshStandardMaterial({ color: 0x1b1c1e, roughness: .9, metalness: .1 });
      const collar = new THREE.Mesh(geo, [face, bore]); outlet.add(collar); } // ONE ring in the wall's own material, chipped; its sides (the bore) are dark: the lower inner wall catches the light, the upper half is in the collar's own shadow
    const backD = new THREE.Mesh(new THREE.CircleGeometry(HOLE + .004, 32), new THREE.MeshBasicMaterial({ color: 0x010102 })); backD.position.z = .004; outlet.add(backD); // the dark behind
    { const ct = tex2(128, 128, (g, w, h) => { const lg = g.createLinearGradient(0, h, 0, h * .38); lg.addColorStop(0, "rgba(168,170,176,.95)"); lg.addColorStop(.35, "rgba(70,72,78,.6)"); lg.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = lg; g.beginPath(); g.arc(w / 2, h / 2, w / 2, 0, 6.283); g.fill(); g.globalCompositeOperation = "destination-out"; g.beginPath(); g.arc(w / 2, h / 2 - h * .1, w * .46, 0, 6.283); g.fill(); });
      const crescent = new THREE.Mesh(new THREE.CircleGeometry(HOLE - .002, 40), new THREE.MeshBasicMaterial({ map: ct, transparent: true, depthWrite: false })); crescent.position.z = .012; outlet.add(crescent); } // the inner wall at the bottom, lit at the lip and falling to black
    const film = new THREE.Mesh(new THREE.CylinderGeometry(HOLE - .003, HOLE - .003, COLLAR_D - .01, 28, 1, true, -1.0, 2.0), paintMat()); film.rotation.x = Math.PI / 2; film.position.z = COLLAR_D / 2 + .003; film.scale.set(1, 1, 1); film.visible = false; outlet.add(film); // a thin wet film lying in the bore, along the bottom
    outlet.visible = false;
    const tear = []; for (let i = 0; i <= 14; i++) { const y = -1 + i * .2; tear.push(new THREE.Vector2(y <= 0 ? Math.sqrt(Math.max(0, 1 - y * y)) : Math.pow(Math.max(0, 1 - y / 2), 1.7), y)); }
    const dropM = new THREE.Mesh(new THREE.LatheGeometry(tear, 14), paintMat()); dropM.visible = false; dropM.frustumCulled = false; scene.add(dropM);
    // ---- the name on the wall (round 8): TOM / LARSSON painted on the wall face with the outlet ("nameOnWall"), sized FROM the outlet: the O in LARSSON is a ring round the pipe's mouth (its hole is the mouth, the collar is under
    // the letter paint with its edge still reading), the other letters take their cap height and weight from that ring, and the N ends near the frame's right edge at the rest view. A phone's pipe is as big as a letter, so there
    // it is three lines, right-aligned: TOM / LARS / SON. Lit by the scene, the wall's own normal map under the paint. Painted in line by line as the wall arrives, the O last, round the pipe (a sweep); then the blue runs over
    // the O's lower edge into the thread. "Showcase" is a small blue tag under it (stand-in type). On the tip it simply stays on the wall.
    const planeAt = (sx, sy, z) => { const d = V(sx / innerWidth * 2 - 1, 1 - sy / innerHeight * 2, .5).unproject(camera).sub(camera.position); return camera.position.clone().add(d.multiplyScalar((z - camera.position.z) / d.z)); };
    const NAME = NARROW ? { above: ["LARS", "TOM"], pre: "S", left: false, margin: 9, over: 1.08, tag: .4, tagDrop: .32 } : { above: ["TOM"], pre: "LARSS", left: true, margin: 22, over: 1.1, tag: .5, tagDrop: .2 }; // above: the lines over the O's line, nearest first; margin: px from the N to the frame's edge; over: the ring's outer radius against half the cap height
    const FACE = '"Archivo Wall", "Arial Black", sans-serif', TAGFACE = '"Sedgwick Ave Display", cursive', CREAM = tok("--look-cream") || "#efebe1", DARK = tok("--look-dark") || "#111111", NAME_IN = 1.5, LINES_D = 1.1, SWEEP_AT = .95, SWEEP_D = .55; // the painting starts NAME_IN s before the blue runs and ends as it starts
    const cvs = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
    // paint on the wall: the scene's light on it, the wall's normal map read by its own place (not the picture's), and how much of it is painted yet: "lines" = each line wiped in from the left, "sweep" = round the pipe from the top
    const wallPaint = (kind, glow) => { const u = { uNorT: { value: new THREE.Matrix3() }, uQ: { value: [0, 0, 0] }, uRect: { value: [0, 1, 2].map(() => new THREE.Vector4(0, 2, 0, 2)) }, uSoft: { value: .02 }, uSweep: { value: 0 } };
      const m = new THREE.MeshStandardMaterial({ color: 0xb4ae9f, roughness: .9, metalness: 0, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3, normalMap: upMat.normalMap, normalScale: new THREE.Vector2(.9, .9), emissive: new THREE.Color(0xffffff), emissiveIntensity: glow });
      m.onBeforeCompile = sh => { Object.assign(sh.uniforms, u);
        sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nuniform mat3 uNorT; uniform float uQ[3]; uniform vec4 uRect[3]; uniform float uSoft, uSweep;")
          .replace("#include <normal_fragment_maps>", THREE.ShaderChunk.normal_fragment_maps.replaceAll("texture2D( normalMap, vUv )", "texture2D( normalMap, ( uNorT * vec3( vUv, 1. ) ).xy )"))
          .replace("#include <map_fragment>", "#include <map_fragment>\n" + (kind === "lines" ? "for (int i = 0; i < 3; i++) { vec4 r = uRect[i]; float q = uQ[i]; if (vUv.y >= r.y && vUv.y < r.w) { float e = r.x + (r.z - r.x) * q; diffuseColor.a *= q >= 1. ? 1. : q <= 0. ? 0. : vUv.x < e ? 1. : vUv.x < e + uSoft ? .4 : 0.; } }"
            : kind === "sweep" ? "{ vec2 p = vUv - .5; diffuseColor.a *= uSweep >= 1. ? 1. : step(fract(atan(p.x, p.y) / 6.2831853 + 1.), uSweep); }" : "")); };
      m.customProgramCacheKey = () => "wallPaint-" + kind; m.userData.u = u; return m; };
    const onWallAt = (mesh, x0, y0, w, h, z) => { mesh.position.set(x0 + w / 2, y0 + h / 2, z); mesh.scale.set(w, h, 1); mesh.material.userData.u.uNorT.value.set(w / TILE, 0, (x0 - (LEDGE.x - 7)) / TILE + .3, 0, h / TILE, (y0 - WALL_TOP) / TILE + .2, 0, 0, 1); mesh.visible = true; };
    const setMap = (m, c) => { if (m.map) m.map.dispose(); const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = maxAniso; m.map = t; m.emissiveMap = t; m.needsUpdate = true; };
    const bare = (g, w, h, n, seed, r0, r1) => { g.save(); g.globalCompositeOperation = "destination-out"; for (let i = 0; i < n; i++) { g.globalAlpha = .35 + .5 * hash(i, seed); g.beginPath(); g.arc(hash(i, seed + 1) * w, hash(i, seed + 2) * h, r0 + (r1 - r0) * hash(i, seed + 3), 0, 6.283); g.fill(); } g.restore(); }; // the paint's unevenness: tiny bare spots
    const mkD = (mat, name, order) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat); m.name = name; m.visible = false; m.renderOrder = order; return m; };
    const nameD = mkD(wallPaint("lines", .06), "nameOnWall", 1), ringW = mkD(wallPaint("sweep", .06), "nameO", 2), ringC = mkD(wallPaint("sweep", .06), "nameOCollar", 6), tagD = mkD(wallPaint("", .3), "showcaseTag", 1); scene.add(nameD, ringW, tagD); outlet.add(ringC);
    tagD.geometry.translate(.5, -.5, 0); tagD.rotation.z = .05; tagD.material.opacity = 0; shadowD.renderOrder = 4; rustD.renderOrder = 4; // the collar's shadow and the rust run fall ON the paint
    // the collar's face inside the O: the same paint on the collar, short of its chipped edge so the edge still reads
    { const S = 256, R = .15, c = cvs(S, S), g = c.getContext("2d"), k = S / (2 * R); g.fillStyle = CREAM; g.beginPath(); g.arc(S / 2, S / 2, .139 * k, 0, 6.283); g.arc(S / 2, S / 2, (HOLE + .003) * k, 0, 6.283); g.fill("evenodd"); bare(g, S, S, 60, 411, .6, 2.2); setMap(ringC.material, c);
      ringC.position.z = COLLAR_D + .0015; ringC.visible = true; E.parts = { nameD, ringW, ringC, tagD }; ringC.scale.set(2 * R, 2 * R, 1); ringC.material.userData.u.uNorT.value.set(2 * R / TILE, 0, .37, 0, 2 * R / TILE, .61, 0, 0, 1); }
    // the blue over the O's lower edge: out of the mouth, down the collar's face, on down the letter to its lower edge, where the thread hangs and the stain goes on
    const lipMat = paintMat(); lipMat.polygonOffset = true; lipMat.polygonOffsetFactor = -8; lipMat.polygonOffsetUnits = -8;
    const LIP_W = .026, lipC = (() => { const sh = new THREE.Shape(), lw = HOLE * .55, a0 = Math.asin(lw / HOLE), y0 = -HOLE * Math.cos(a0), yb = -.158, ym = (y0 + yb) / 2; sh.moveTo(-lw, y0); sh.absarc(0, 0, HOLE, -Math.PI / 2 - a0, -Math.PI / 2 + a0, false); sh.quadraticCurveTo(lw * .8, ym, LIP_W, yb); sh.lineTo(-LIP_W, yb); sh.quadraticCurveTo(-lw * .8, ym, -lw, y0);
      const geo = new THREE.ShapeGeometry(sh, 16); geo.translate(0, HOLE, 0); const m = new THREE.Mesh(geo, lipMat); m.position.set(0, -HOLE, COLLAR_D + .004); m.visible = false; outlet.add(m); return m; })();
    const lipW = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).translate(0, -.5, 0), lipMat); lipW.position.set(0, -.11, .012); lipW.visible = false; outlet.add(lipW);
    let nameIn = false, pendingLayout = false, nameRO = .2, nameLines = 1;
    function placeName() { if (!O || !nameIn) { pendingLayout = true; return; } pendingLayout = false; camera.updateMatrixWorld();
      const W = innerWidth, cx = outlet.position.x, cy = outlet.position.y, zU = -.52, pr = cvs(8, 8).getContext("2d"); pr.font = `800 100px ${FACE}`;
      const adv = s => pr.measureText(s).width / 100, cap = pr.measureText("H").actualBoundingBoxAscent / 100, mO = pr.measureText("O"), sb = Math.max(0, (mO.width - mO.actualBoundingBoxLeft - mO.actualBoundingBoxRight) / 200), aN = adv("N"), aPre = adv(NAME.pre), aAb = NAME.above.map(adv);
      const row = proj0(cx, cy, zU)[1], wx = sx => planeAt(sx, row, zU).x; // the outlet's row on the screen at rest: where the frame's edges meet the wall on it
      const fsM = (wx(W - NAME.margin) - cx) / (cap * NAME.over / 2 + sb + aN), RO = cap * NAME.over / 2, base = -cap / 2, pitch = cap * 1.24, xl = -RO - sb, xr = RO + sb, left = xl - aPre, right = xr + aN, pad = .14, n = NAME.above.length; // metres per em; from here on in ems, the O's middle at 0, 0, up is up
      const X0 = Math.min(left, ...aAb.map(w => NAME.left ? left : right - w)) - pad, X1 = Math.max(right, ...aAb.map(w => NAME.left ? left + w : right)) + pad, Y0 = base - cap * .1 - pad, Y1 = base + pitch * n + cap * 1.1 + pad, P = Math.min(240, 2048 / (X1 - X0)), c = cvs(Math.ceil((X1 - X0) * P), Math.ceil((Y1 - Y0) * P)), g = c.getContext("2d"), px = x => (x - X0) * P, py = y => (Y1 - y) * P;
      g.font = `800 ${P}px ${FACE}`; g.textBaseline = "alphabetic"; g.fillStyle = CREAM; g.shadowColor = "rgba(17,17,17,.55)"; g.shadowBlur = P * .06; g.shadowOffsetY = P * .012;
      g.textAlign = "right"; g.fillText(NAME.pre, px(xl), py(base)); g.textAlign = "left"; g.fillText("N", px(xr), py(base));
      const rects = [[left - .1, base - cap * .1, right + .1, base + cap * 1.1]];
      NAME.above.forEach((txt, k) => { const b = base + pitch * (k + 1), x0 = NAME.left ? left : right - aAb[k]; g.fillText(txt, px(x0), py(b)); rects.unshift([x0 - .1, b - cap * .1, x0 + aAb[k] + .1, b + cap * 1.1]); }); // in the order they are painted: the top line first, the O's line last
      g.shadowColor = "transparent"; bare(g, c.width, c.height, 420, 421, P * .003, P * .011); setMap(nameD.material, c);
      const u = nameD.material.userData.u; rects.forEach((r, i) => u.uRect.value[i].set((r[0] - X0) / (X1 - X0), (r[1] - Y0) / (Y1 - Y0), (r[2] - X0) / (X1 - X0), (r[3] - Y0) / (Y1 - Y0))); u.uSoft.value = .25 / (X1 - X0); nameLines = rects.length;
      onWallAt(nameD, cx + X0 * fsM, cy + Y0 * fsM, (X1 - X0) * fsM, (Y1 - Y0) * fsM, zU + .006);
      // the O on the wall: a ring from the pipe's mouth out to the letter's edge, with the letters' soft dark edge
      { const S = 512, rc = cvs(S, S), q = rc.getContext("2d"), k = S * .44 / (RO * fsM); q.fillStyle = CREAM; q.shadowColor = "rgba(17,17,17,.55)"; q.shadowBlur = S * .44 / RO * .06; q.shadowOffsetY = S * .44 / RO * .012; q.beginPath(); q.arc(S / 2, S / 2, S * .44, 0, 6.283); q.arc(S / 2, S / 2, HOLE * k, 0, 6.283); q.fill("evenodd"); q.shadowColor = "transparent"; bare(q, S, S, 90, 431, .8, 2.6); setMap(ringW.material, rc);
        const side = 2 * RO * fsM / .88; onWallAt(ringW, cx - side / 2, cy - side / 2, side, side, zU + .007); nameRO = RO * fsM; lipW.scale.set(2 * LIP_W, 1e-4, 1); }
      // "Showcase", a tag under the name
      { const ts = 140, tp = cvs(8, 8).getContext("2d"); tp.font = `${ts}px ${TAGFACE}`; const tw = tp.measureText("Showcase").width, pd = ts * .25, tc = cvs(Math.ceil(tw + 2 * pd), Math.ceil(ts * 1.9)), t = tc.getContext("2d"); t.font = tp.font; t.textBaseline = "top"; t.lineJoin = "round";
        t.strokeStyle = DARK; t.lineWidth = ts * .16; t.strokeText("Showcase", pd, pd); t.fillStyle = `rgb(${SPRAY})`; t.fillText("Showcase", pd, pd); t.fillRect(pd + tw * .78, pd + ts * .82, ts * .04, ts * .55); bare(t, tc.width, tc.height, 80, 441, .8, 2.4); setMap(tagD.material, tc);
        const m = NAME.tag * fsM / ts, tx = NAME.left ? cx + (left + .15) * fsM : wx(W * .05), ty = cy + (base - cap * NAME.tagDrop) * fsM, w = tc.width * m, h = tc.height * m;
        tagD.position.set(tx - pd * m, ty + pd * m, zU + .0065); tagD.scale.set(w, h, 1); tagD.material.userData.u.uNorT.value.set(w / TILE, 0, (tx - (LEDGE.x - 7)) / TILE + .3, 0, h / TILE, (ty - h - WALL_TOP) / TILE + .2, 0, 0, 1); tagD.visible = true; }
      E.name = { fs: fsM, ro: RO * fsM, cap: cap * fsM, left: cx + left * fsM, right: cx + right * fsM, top: cy + (base + pitch * n + cap) * fsM, base: cy + base * fsM }; }
    // how much is painted at this moment of the journey (et), against the moment the blue starts to run (fa)
    function paintName(fa, done) { const t = et - (fa - NAME_IN), u = nameD.material.userData.u, span = LINES_D / nameLines; for (let k = 0; k < 3; k++) u.uQ.value[k] = done ? 1 : clamp((t - k * span) / span);
      tagD.material.opacity = done ? 1 : clamp((t - .8) / .4); const sw = done ? 1 : ease(clamp((t - SWEEP_AT) / SWEEP_D)); ringW.material.userData.u.uSweep.value = sw; ringC.material.userData.u.uSweep.value = sw;
      const lip = done ? 1 : E.streamOn ? clamp((et - streamT - .15) / .6) : 0, k1 = clamp(lip * 2.5), k2 = clamp((lip - .3) / .7); lipC.visible = k1 > 0; lipC.scale.y = Math.max(1e-3, k1); lipW.visible = k2 > 0; lipW.scale.y = Math.max(1e-4, (nameRO + .012 - .11) * k2); }
    Promise.all(['800 100px "Archivo Wall"', '100px "Sedgwick Ave Display"'].map(f => document.fonts.load(f).catch(() => {}))).then(() => { nameIn = true; if (pendingLayout) placeName(); });
    // ---- the bucket: rougher metal with dents, paint drips on the rim and side, a contact shadow on the ledge
    { const dent = tex2(256, 128, (g, w, h) => { g.fillStyle = "#808080"; g.fillRect(0, 0, w, h); for (let i = 0; i < 46; i++) { const x = hash(i, 51) * w, y = hash(i, 52) * h, r = 5 + 20 * hash(i, 53), gr = g.createRadialGradient(x, y, 0, x, y, r); const d = hash(i, 54) > .5; gr.addColorStop(0, d ? "rgba(30,30,30,.55)" : "rgba(230,230,230,.4)"); gr.addColorStop(1, "rgba(128,128,128,0)"); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }  }); dent.encoding = THREE.LinearEncoding;
      metal.color.setHex(0x7b8086); metal.roughness = .52; metal.metalness = .82; metal.envMapIntensity = .45; metal.bumpMap = dent; metal.bumpScale = .1; metal.clearcoat = .1; metal.needsUpdate = true;
      const rr = y => BK.r0 + (BK.r1 - BK.r0) * y / BK.h, pm = paintMat();
      for (const [ph, len, w] of [[-.55, .13, .0085], [.1, .09, .007], [.52, .17, .009], [.9, .06, .006], [-1.1, .07, .006]]) { const y0 = BK.h - .02, r = rr(y0) + .004, x = Math.sin(ph) * r, z = Math.cos(ph) * r; const d = new THREE.Mesh(new THREE.CylinderGeometry(w, w * .9, len, 8), pm); d.position.set(x, y0 - len / 2, z); const b = new THREE.Mesh(new THREE.SphereGeometry(w * 1.45, 10, 8), pm); b.position.set(x, y0 - len, z); bucket.add(d, b); (E.drips = E.drips || []).push(d, b); }
      const band = new THREE.Mesh(new THREE.CylinderGeometry(BK.r1 + .003, BK.r1 + .001, .045, 24, 1, true, -1.3, 1.9), pm); band.position.y = BK.h - .02; bucket.add(band); E.drips.push(band); // a paint-stained stretch of the rim
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
      O = V(A.x, y2, -.52 + COLLAR_D - .008); yEdge3 = y2 + EDGE_M; outlet.position.set(O.x, O.y + HOLE, -.52); outlet.visible = true; { const Hs = Math.max(.3, O.y - (WALL_TOP + .03)); stainD.scale.set(.2, Hs, 1); stainD.position.y = -HOLE - Hs / 2 + .012; } const rim = bucket.localToWorld(V(.1, BK.h - .02, .06)); O.rimY = rim.y; }
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
    function drawSeg(list, i0, i1) { for (let i = i0; i < i1; i++) { const b = list[i], R = b.r * 38 * (1 + .9 * i / list.length), f = i > list.length - 10 ? .6 : 1; stamp(cS, spS, b.x, b.y, R * 2.6, .08 * f); stamp(cS, spS, b.x, b.y, R * 1.5, .11 * f);
        for (let k = 0; k < 2; k++) { const a = hash(i, k + 70) * 6.283, d = R * (.3 + 1.1 * hash(i, k + 71)); stamp(cS, spS, b.x + Math.cos(a) * d, b.y + Math.sin(a) * d, 6 + 12 * hash(i, k + 72), .3 * f); } } }
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
      if (key !== shapeKey) { shapeKey = key; const gapOld = clamp(bucketTop - GAP_UP * H, GAP_MIN * H, GAP_MAX * H); placeOutlet(clamp(bucketTop - OUT_UP * H, .3 * H, (NARROW ? .62 : .5) * H)); placeName();
        const yRest = Math.min(proj0(O.x, yEdge3, -.52)[1], -.08 * H); cam1 = Ew - EDGE_UP - yRest / s; glide = buildGlide(cam1, s, (Ew - gapOld / s) * s / SPEED + TR - (J0 - J0_OLD)); Tj = glide.T; }
      if (skipping && et >= J0 + Tj + 1.1) { skipping = false; rate = 1; vid.playbackRate = 1; }
      const camJ = camAt(et - J0), cam = camJ, fa = J0 + Tj + 1.1, dripA = J0 + Tj - .4, rt = readyAt ? (now - readyAt) / 1000 - (NARROW ? .6 : LEAVE_AT) : -1, lv = ease(clamp(rt / LEAVE_D));
      const tf = `translate3d(${xOff.toFixed(1)}px, ${(-cam * s).toFixed(1)}px, 0) scale(${s.toFixed(4)})`; if (tf !== tx) { tx = tf; world.style.transform = tf; }
      cNow = counter(); if (!E.streamOn && et >= fa && cNow >= COUNT_JOURNEY - .001) { E.streamOn = true; streamT = SEEK !== null ? fa : et; }
      const wx = (outlet.position.x ? (proj0(O.x, O.y, -.52)[0] - xOff) / s : 540); if (Math.abs(wx - veinX) > 3) { veinX = wx; veins = buildVeins(clamp(wx, 90, 990)); drawn = null; }
      const frontW = camJ + FRONT_LEAD * H / s, pv = clamp((frontW - SOAK_END[1]) / (veins.yEnd - SOAK_END[1]));
      growVeins(pv, 0); soakEl.style.setProperty("--f", Math.max(0, frontW - STRIP_Y).toFixed(0) + "px");
      // the 3D camera rides down with the earth's edge: the soil's edge (a height on the wall) is kept at the overlay's edge on the screen, so wall, outlet and bucket come into view as the earth leaves the top
      if (!readyAt) { const Pc = y => { const v = V(O.x, y, -.52).project(camera); return (1 - v.y) / 2 * H; }, y0 = Pc(yEdge3), ppm = y0 - Pc(yEdge3 + 1), want = clamp((Ew - EDGE_UP - camJ) * s, -2 * H, H * 1.7);
        if (ppm > 1) dyV = clamp(dyV + (want - y0) / ppm, 0, 14); } if (goAt) dyV = 0; E.dy = dyV;
      if (readyAt || goAt) { thread.visible = false; beads.forEach(b => b.visible = false); }
      const edgeNow = (Ew - EDGE_UP - cam) * s; E.bucketSeen = edgeNow < stBox[1] - 10; const wk = clamp((H * 1.05 - edgeNow) / (H * .5)); E.wall += (.3 * wk - E.wall) * Math.min(1, dt * 3);
      wallLight.intensity = (goAt ? 1.8 : 3.4 * wk); if (edgeNow < -200 && box.style.display !== "none") box.style.display = "none";
      // the outlet's life: paint wells in the mouth, a stain grows under it and stays; the bead swells at the lip, necks, lets go and falls into the bucket's mouth; again and again until the thread starts, and a rare late drop after the fill
      mouthK = Math.max(mouthK, clamp((et - dripA + .5) / 1.4)); film.visible = mouthK > .05; film.material.opacity = 1; film.scale.set(1, 1, .6 + .4 * (readyAt ? .7 : mouthK));
      paintCoat.color.copy(SOILBLUE).multiplyScalar(.15); paintCoat.emissive.copy(SOILBLUE).multiplyScalar(.8); { const dv = readyAt || level > .8; for (const m of E.drips) m.visible = dv; } if (NARROW) { E.rest = goAt ? REST_M * (1 - ease(clamp((now - goAt) / 1500))) : REST_M; E.rx = goAt ? Math.min(0, E.rx + dt * .3) : RX; E.rz = goAt ? Math.max(0, E.rz - dt * .6) : RZ; } paintCoat.envMapIntensity = 0; paintCoat.clearcoat = 0; paintIn.color.copy(SOILBLUE).multiplyScalar(.15); paintIn.emissive.copy(SOILBLUE).multiplyScalar(.95); paintIn.envMapIntensity = 0; filmMat.color.copy(SOILBLUE).multiplyScalar(.15); filmMat.emissive.copy(SOILBLUE).multiplyScalar(.9); if (E.shadow) E.shadow.visible = !goAt; if (readyAt) mouthK = Math.min(mouthK, .65);
      stainK = Math.max(stainK, clamp((et - dripA) / 6) * .95); stainD.material.opacity = Math.min(1, stainK);
      const growT = .55, fallT = .42; let ph = -1, kind = 0; if (!E.streamOn && et > dripA && !readyAt) ph = ((et - dripA) % DROP_PERIOD + DROP_PERIOD) % DROP_PERIOD; else if (readyAt && !goAt) { const q = (now - readyAt) / 1000 - LATE_FIRST; if (q > 0) { ph = q % LATE_PERIOD; kind = 1; } }
      const live = ph >= 0 && ph < growT + fallT; dropM.visible = live;
      if (live) { const grow = clamp(ph / growT), fall = ph > growT ? (ph - growT) / fallT : 0, endY = kind ? bucket.localToWorld(V(.1, Math.max(.02, level * FULL), .06)).y : O.rimY, D = Math.max(.08, O.y - endY), sz = (.007 + .024 * ease(grow)) * (kind ? .85 : 1), st = fall > 0 ? 1 + 1.6 * fall : 1 + .7 * grow ** 2; { const dyp = O.y - sz * st * .9 - D * fall * fall; dropM.position.set(plumb(dyp), dyp, O.z); } dropM.scale.set(sz, sz * st, sz);
        if (fall > .96 && !dropM._hit) { dropM._hit = 1; const m = proj(V(O.x, endY, O.z)); ripple(m[0], m[1], kind ? .6 : .7); } if (fall === 0) dropM._hit = 0; }
      if (E.streamOn && !readyAt && et - lastRip > .42) { lastRip = et; const A = proj(V(O.x, bucket.localToWorld(V(.1, Math.max(.02, level * FULL), .06)).y, O.z)); ripple(A[0], A[1], 1); }
      // the name is painted in as the wall arrives, the O last, before the blue runs
      startEl.style.setProperty("--kin", 1); paintName(fa, !!(readyAt || goAt)); E.fa = fa;
      // the quiet line: the load from the first frame; "Tap to skip" after a second until the thread starts (not on the slow line, where a tap cannot skip the load); the plate steps aside while a phone's name comes up
      const ready2 = readyAt && (now - readyAt) > 300, txt = ready2 ? "Tip the bucket to enter" : `Loading the wall · ${Math.min(readyAt ? 100 : 99, Math.round(cNow * 100))} %`; if (txt !== loadT.textContent) loadT.textContent = txt;
      loadEl.style.opacity = goAt ? 0 : 1; skipEl.style.opacity = !SLOW && lt > 1 && !E.streamOn && !skipping ? .8 : 0;
      if (goAt) { if (!E.gone) E.gone = performance.now(); else if (performance.now() - E.gone > 1500) { box.remove(); loadEl.remove(); thread.visible = false; beads.forEach(b => b.visible = false); dropM.visible = false; startEl.style.clipPath = ""; startEl.style.transform = ""; E.on = false; E.dy = 0; E.rest = 0; E.rx = 0; E.rz = 0; document.documentElement.classList.remove("earth-on"); } }
    };
    return E;
  })();

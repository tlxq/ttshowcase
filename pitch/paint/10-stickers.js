  // ---- the sticker bomb (Tom 11-23): real stickers about Tom slapped on the street light's pole, each once, waist to head height; Write to me on top opens the flyer
  const tok = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const STK = { emblem: 1.075, hello: 1.414, writetome: 1.781, omarchy: 3.357, tom: .877, gosta: .521 }, BOMBMESH = []; let BOMB_WTM = null; // the last Write to me made: the one on top
  let bombSeed = 7; const brnd = () => (bombSeed = (bombSeed * 16807) % 2147483647) / 2147483647; // the same scuffs and curls every load
  // one sticker: a thin sheet of glossy vinyl bent onto a surface. put(a, b, layer) gives the point for a spot (a, b metres) of the sheet and its outward normal; one corner lifts a few mm
  function sticker(name, size, rot, curl, put, layer) {
    const asp = STK[name], w = asp >= 1 ? size : size * asp, h = asp >= 1 ? size / asp : size, N = 14, pos = new Float32Array((N + 1) * (N + 1) * 3), uv = [], idx = [], cs = Math.cos(rot), sn = Math.sin(rot), cu = brnd() < .5 ? 0 : 1, cv = brnd() < .5 ? 0 : 1;
    const bend = (c, R) => { let k = 0; for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) { const u = i / N, v = j / N, a0 = (u - .5) * w, b0 = (v - .5) * h; // R: how far from the lifted corner the sheet comes off (.5 = the corner only; past 1.4 = the whole sticker, a peel)
      const d = Math.hypot(u - cu, v - cv) / Math.SQRT2, lift = c * Math.pow(Math.max(0, R - d) / R, 2) + .0012 * Math.sin(Math.PI * u) * Math.sin(Math.PI * v);
      const [p, n] = put(a0 * cs - b0 * sn, a0 * sn + b0 * cs, layer); pos[k] = p.x + n.x * lift; pos[k + 1] = p.y + n.y * lift; pos[k + 2] = p.z + n.z * lift; k += 3; } };
    bend(curl, .5); for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) uv.push(i / N, j / N);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const a = j * (N + 1) + i, b = a + 1, c = a + N + 1, d = c + 1; idx.push(a, b, c, b, d, c); }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, new THREE.MeshPhysicalMaterial({ map: tex("assets/stickers/" + name + ".webp", true, 1, 1), alphaTest: .5, roughness: .32, metalness: 0, clearcoat: .7, clearcoatRoughness: .15, envMapIntensity: .8, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1 - layer, polygonOffsetUnits: -1 - layer }));
    m.userData = { curl, bend: (c, R) => { bend(c, R); g.attributes.position.needsUpdate = true; g.computeVertexNormals(); g.computeBoundingBox(); } }; // the Write to me sticker lifts on hover and peels on a tap
    if (name === "writetome") BOMB_WTM = m;
    scene.add(m); BOMBMESH.push(m); return m; }
  { // wrapped round the pole, overlapping a little; th: the angle round it (0 faces the street), y: the centre over the ground. The last one is on top
    const rad = y => .075 - .015 * (y - (GROUND + 3.3)) / 3.3, onPole = (th0, yc) => (a, b, L) => { const y = GROUND + yc + b, r = rad(y) + .0025 + L * .0009, th = th0 + a / rad(y); return [V(POST.x + r * Math.sin(th), y, POST.z + r * Math.cos(th)), V(Math.sin(th), 0, Math.cos(th))]; };
    [["gosta", .18, .95, 1.2, .1, .004], ["tom", .15, -1.0, 1.24, -.12, .005], ["emblem", .135, 1.25, 1.64, .2, .005], ["hello", .18, -.75, 1.72, -.1, .005], ["omarchy", .195, .5, 1.9, -.05, .004], ["writetome", .2, .05, 1.47, .03, .006]]
      .forEach(([n, size, th, y, rot, curl], i) => sticker(n, size, rot, curl, onPole(th, y), i)); }
  const BOMB_CLEAR = [[POST.x - .35, GROUND + .9, POST.x + .35, GROUND + 2.1]]; // the tag tool keeps clear of it (a tag is saved in metres: the cabinet's spot on both layouts)
  // the steps (edges blended over at least a pixel, fwidth: a hard 1 cm edge stair-stepped from a few metres away, design review 11-23): worn yellow paint on each edge, a handrail by the wall, a wall lamp over each flight; one light, moved to the flight in view
  { const prev = ground.material.onBeforeCompile; ground.material.onBeforeCompile = sh => { prev(sh);
    sh.fragmentShader = sh.fragmentShader.replace("#include <emissivemap_fragment>", `float nose = 0.;
          ${STAIRS.map(([a, b]) => `if (vWP.x > ${a.toFixed(3)} && vWP.x < ${(b + .001).toFixed(3)}) { float f = fract((vWP.x - ${a.toFixed(3)}) / ${((b - a) / NSTEP).toFixed(4)}), aa = fwidth(f) * 1.5; nose = max(nose, smoothstep(.8 - aa, .84 + aa, f) + (1. - smoothstep(.0, .02 + aa, f))); }`).join("\n")}
          nose *= smoothstep(.42, .62, gf(vWP.xz * 4.1 + 7.)) * (1. - gWet) * .8;
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.5, .39, .09) * (.6 + .4 * gn(vWP.xz * 40.)), clamp(nose, 0., 1.));
          #include <emissivemap_fragment>`); }; }
  const stairLamps = STAIRS.map(([a, b, h0, h1]) => { const m = new THREE.Group(), x = (a + b) / 2;
    const box = new THREE.Mesh(new THREE.BoxGeometry(.32, .18, .12), postM), lens = new THREE.Mesh(new THREE.BoxGeometry(.26, .04, .1), new THREE.MeshStandardMaterial({ color: 0, emissive: 0xffd9a8, emissiveIntensity: 2 }));
    lens.position.set(0, -.1, 0); m.add(box, lens); m.position.set(x, h1 + 2.5, .07); scene.add(m);
    const pts = [V(a - .4, h0 + .9, .3), V(a, h0 + .9, .3), V(b, h1 + .9, .3), V(b + .4, h1 + .9, .3)];
    for (let i = 0; i < 3; i++) { const d = pts[i + 1].clone().sub(pts[i]), r = new THREE.Mesh(new THREE.CylinderGeometry(.022, .022, d.length(), 8), postM);
      r.position.copy(pts[i]).addScaledVector(d, .5); r.quaternion.setFromUnitVectors(V(0, 1, 0), d.clone().normalize()); scene.add(r); }
    for (const [px, py] of [[a - .35, h0], [(a + b) / 2, groundAt((a + b) / 2)], [b + .35, h1]]) {
      const yTop = px <= a ? h0 + .9 : px >= b ? h1 + .9 : h0 + .9 + (h1 - h0) * (px - a) / (b - a), po = new THREE.Mesh(new THREE.CylinderGeometry(.025, .025, yTop - py, 8), postM); po.position.set(px, (yTop + py) / 2, .3); scene.add(po); }
    return { x, y: h1 + 2.4 }; });
  const stairLight = new THREE.SpotLight(0xffd9a8, 0, 7, .95, .8, 1.4); scene.add(stairLight, stairLight.target);
  // two more wall lamps over the ramp (the street's way down to the wall: the ramp has 8 m of dark wall to walk along). Each throws a warm pool on the wall, like the street's own lamps (a soft glow, not a light: every
  // light costs a frame on the T14s); the one real light follows the camera along the steps and the ramp, then hands over to the street light at the wall. At the start (camera x under 3) it is the flight's own
  // lamp as it always was, so the start's frame is the one it was; by day the lamps and pools are off.
  // (Tom 11-27, "soft blobs") a wall lamp's pool as a lamp throws it: a hot spot at the fixture, a cone of light widening down the wall and ending in a soft arc, a short cone up, and a faint lift
  // over the whole tall strip, so the wall above the fixture is not black. 256 x 256 px for a POOL_W x POOL_H m plane; the fixture sits POOL_F down from the top of it.
  const POOL_W = 5.6, POOL_H = 7.2, POOL_F = .3;
  let poolTex = null; const poolTexOf = () => poolTex ||= (() => { const N = 256, c = Object.assign(document.createElement("canvas"), { width: N, height: N }), g = c.getContext("2d"), img = g.createImageData(N, N), fy = POOL_F * N, ss = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const dx = (x - N / 2) / (N / 2), dn = (y - fy) / (N - fy), up = (fy - y) / fy;
      const w = y >= fy ? .16 + .7 * Math.pow(dn, .7) : .14 + .4 * up; // the cone's half width at this height: narrow at the lens, wider the further it goes; its edge is a Gaussian, so it is a soft arc, not a cut
      let b = Math.exp(-Math.pow(dx / w, 2) * 1.3) * (y >= fy ? Math.pow(1 - dn, 1.8) : .7 * Math.pow(1 - up, 2.2));
      b += .5 * Math.exp(-(dx * dx * 60 + ((y - fy - 6) / N) ** 2 * 300)) + .16 * Math.exp(-(dx * dx * 2.2)) * (1 - ss(.55, 1, Math.abs(y - N * .5) / (N * .5))); // the hot spot at the lens, and a faint lift
      const o = (y * N + x) * 4; img.data[o] = 255; img.data[o + 1] = 205; img.data[o + 2] = 140; img.data[o + 3] = Math.min(255, 255 * b); }
    g.putImageData(img, 0, 0); const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t; })(); // built the first time a pool shows (night, on the ramp), not at load
  const RAMP_POOLS = [11.6, 15].map(x => { const m = new THREE.Group(), box = new THREE.Mesh(new THREE.BoxGeometry(.32, .18, .12), postM), lens = new THREE.Mesh(new THREE.BoxGeometry(.26, .04, .1), new THREE.MeshStandardMaterial({ color: 0, emissive: 0xffd9a8, emissiveIntensity: 2 }));
    lens.position.set(0, -.1, 0); m.add(box, lens); m.position.set(x, groundAt(x) + 2.5, .07); scene.add(m);
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(POOL_W, POOL_H), new THREE.MeshBasicMaterial({ map: null, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0, fog: false, toneMapped: false }));
    pl.position.set(x, groundAt(x) + 2.5 - (.5 - POOL_F) * POOL_H, .03); pl.visible = false; scene.add(pl); return { x, pl }; });
  { const x = stairLamps[0].x, pl = RAMP_POOLS[0].pl.clone(); pl.material = RAMP_POOLS[0].pl.material.clone(); pl.position.set(x, stairLamps[0].y + .1 - (.5 - POOL_F) * POOL_H, .03); scene.add(pl); RAMP_POOLS.unshift({ x, pl }); } // the flight's own lamp gets its pool once the camera is past the start
  function stairsAt(cx) { const night = (1 - dayNow()) * (introOver ? 1 : 0), m = sm(cl((cx - 3) / 3)), w = 1 - sm(cl((cx - 17) / 3));
    const fx = cl(cx + 1.2, 6.6, 16), fy = groundAt(fx) + 2.4, s0 = stairLamps[0]; // follow mode, and the flight's own lamp at the start
    stairLight.position.set(s0.x + (fx - s0.x) * m, s0.y + (fy - s0.y) * m, .4); stairLight.target.position.set(s0.x + (fx + 1.5 - s0.x) * m, s0.y - 3 + (fy - 1.4 - s0.y + 3) * m, 1.6 * (1 - m));
    stairLight.angle = .95 + .15 * m; stairLight.distance = 7 + 2 * m; stairLight.intensity = (7 + 3 * m) * w * (introOver ? 1 : 0);
    for (const { x, pl } of RAMP_POOLS) { const k = night * sm(cl((cx - (x - 9)) / 3)) * (1 - sm(cl((cx - (x + 7)) / 3))) * m; pl.material.opacity = .55 * k; pl.visible = k > .01; if (pl.visible && !pl.material.map) { pl.material.map = poolTexOf(); pl.material.needsUpdate = true; } } }
  const pool = new THREE.SpotLight(0xffd2a0, 0, 14, .62, .85, 1.6); pool.position.set(POST.x, GROUND + 6.3, POST.z + 1.25); pool.target.position.set(POST.x + .3, GROUND, POST.z + 1.6); scene.add(pool, pool.target); // a curb stone at the pavement's edge; the darker band beyond is the road
  ground.receiveShadow = true; scene.add(ground);

  // one warm street light grazing the wall from the left, so every pit in the concrete shows; a cold sky fill
  const lamp = new THREE.SpotLight(0xfff3e6, 0, 30, .8, .85, 1.3); /* .8 rad, soft (Tom 11-23): the wall round the mural is dimly lit too, where the visitors' tags are; the mural stays the brightest */ lamp.position.set(-8.5, 4.2, 1.6); lamp.target.position.set(.5, .2, 0);
  scene.add(lamp, lamp.target);
  const sky = new THREE.HemisphereLight(0x4f6699, 0x0a0a0c, .35); scene.add(sky);
  const bounce = new THREE.PointLight(0xffffff, 0, 4, 2); scene.add(bounce); // coloured with the paint below, once it is read

  // the paint layer: a canvas painted at the pen's own pace, wet and glossy, following the concrete's bumps
  // the painted piece "Tom Larsson" (Tom 11-28): the pour's mould and its top layer (3D side, outline, shine, cloud, drips) come as pictures, laid on the wall in metres. On a laptop one line, on a phone "Tom" over "Larsson".
  // Sizes are the painter's pictures at their build size (mould and top 1536 x 388 / 1024 x 656); cx, cy: the piece's middle. One painting, one plate (Tom 11-28): the wall's typed plate says the role and his line, like every project wall's.
  // plate: dot: where its pointer's dot stands on the piece (wall metres); dx, dy: from the dot to the plate's corner in screen pixels, as pin() takes them: on the wall under the piece, on a phone left of the signature and above where
  // the fallen bucket lies; calm: the wall the plate stands on [x0, y0, x1, y1] (at 1440 x 900 and narrower, at 360 x 732 and wider), kept clear of tags (60-pick.js);
  // dry: no leftover run starts between these x, so no blue crosses the plate. A tag is saved in metres and shown on every screen, so tags are kept clear of both layouts' boxes.
  const MURALS = { wide: { w: 9.3, h: 9.3 * 388 / 1536, cx: 0, cy: 2.3 - 9.3 * 388 / 1536 / 2, mould: [1536, 388], plate: { dot: [-2.4, .2], dx: 24, dy: 60, calm: [-2.2, -1.2, .4, -.2], dry: [-2.6, .55] }, set: "laptop", row1: 1, ledge: 4.9 },
    narrow: { w: 6.78, h: 6.78 * 656 / 1024, cx: 0, cy: 4.43 - 6.78 * 656 / 1024 / 2, mould: [1024, 656], plate: { dot: [-2.56, .5], dx: 2, dy: 50, calm: [-2.6, -1.85, 1.9, -.1], dry: [-2.72, 1.9] }, set: "phone", row1: .45, ledge: 2.5 } };
  const MU = NARROW ? MURALS.narrow : MURALS.wide, PW = MU.w, PH = MU.h, PCX = MU.cx, PCY = MU.cy, PX = MU.mould[0] / PW; // PX: the mould's pixels to a metre
  const pc = document.createElement("canvas"); pc.width = MU.mould[0]; pc.height = MU.mould[1]; const g = pc.getContext("2d", { willReadFrequently: true });
  const paintTex = new THREE.CanvasTexture(pc); paintTex.encoding = THREE.sRGBEncoding; paintTex.anisotropy = maxAniso;
  const paintMat = wallBump(new THREE.MeshPhysicalMaterial({ map: paintTex, transparent: true, depthWrite: false, roughness: .2, clearcoat: .9, clearcoatRoughness: .12, envMapIntensity: .9,
    normalMap: tex("assets/wall4_nor_gl.jpg", false, PW / TILE, PH / TILE, (WW / 2 - WX - PW / 2 + PCX) / TILE, (PCY - PH / 2 - GROUND) / TILE), normalScale: new THREE.Vector2(.5, .5), polygonOffset: true, polygonOffsetFactor: -2 }));
  const paint = new THREE.Mesh(new THREE.PlaneGeometry(PW, PH), paintMat); paint.position.set(PCX, PCY, .002); paint.receiveShadow = true; scene.add(paint);

  // pen samples → canvas pixels, at Tom's timing
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; HAND.strokes.forEach(s => { for (let i = 0; i < s.length; i += 4) { x0 = Math.min(x0, s[i]); x1 = Math.max(x1, s[i]); y0 = Math.min(y0, s[i + 1]); y1 = Math.max(y1, s[i + 1]); } });
  const WRITE_W = (NARROW ? 3.9 : 6) * PX, sc = WRITE_W / (x1 - x0), ox = (pc.width - WRITE_W) / 2, oy = (pc.height - (y1 - y0) * sc) / 2 - 10;
  const samples = []; HAND.strokes.forEach((s, si) => { for (let i = 0; i < s.length; i += 4) samples.push({ x: ox + (s[i] - x0) * sc, y: oy + (s[i + 1] - y0) * sc, t: s[i + 2], p: s[i + 3], si, first: i === 0 }); });
  samples.length = 0; // the hand-written tag is out for now (Tom 11-16); the wall carries the title instead
  // the mural: Tom's line, poured. Streams fall from the top of the wall, land on each letter, flood it from the top down,
  // run on to the letter below and drip at the bottom. Every pixel's wet time is worked out once at load (a flood fill where
  // paint runs down fast, sideways slower and up only slowly); the GPU then only compares it with the clock.
  const WALL_TOP = GROUND + WH, YB = PCY - PH / 2, HT = WALL_TOP - GROUND, POUR = 1.4, TMAX = 14, NS = 40;
  const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
  // the sheet that comes over the top edge: depth per column, and how fast it slides down (it slows as it thins)
  const VSH = 3; let SB = .3;
  const sheetD = x => SB * (1 + .22 * Math.sin(x * 7.3 + 1) + .14 * Math.sin(x * 17.9 + 2) + .07 * Math.sin(x * 41.3));
  let grounds = [], pourRuns = [], pourReady = false, pourDone = 1e9, uTnow = -1, streams = [];
  const SPAN = PW / 2 + .2, BK = { r0: .24, r1: .3, h: .58 };
  // the bucket stands at the left end of the wall's top; the visitor tips it over on its side, the paint floods right along the top and spills down
  const TS = .8, left = ic => ic < .2 ? 1 : Math.exp(-(ic - .2) / .6); // left(): how much is still in the bucket; the flow follows it
  const LEDGE = { x: -MU.ledge - .55 /* where the bucket stands: its own number since the piece (the pour is wider than the old line was, the bucket stays in view on a phone) */, tip: .4, spread: NARROW ? 3 : 5, run: NARROW ? 3.6 : 4.2 };
  LEDGE.x0 = LEDGE.x + BK.r0 + BK.h;
  const ledgeArrive = x => LEDGE.tip + .05 + Math.max(0, x - LEDGE.x0) / LEDGE.spread;
  const pourNor = tex("assets/wall4_nor_gl.jpg", false, PW / TILE, HT / TILE, (WW / 2 - WX - PW / 2 + PCX) / TILE, 0);
  const tokHex = n => { const v = getComputedStyle(document.documentElement).getPropertyValue(n).trim(); if (!/^#[0-9a-f]{6}$/i.test(v)) throw new Error("Couldn't read " + n + " from tokens.css"); return v; };
  const INK_LIGHT = tokHex("--look-paint-light"), INK_BLUE = tokHex("--look-paint-blue"); // EDGE's words on the concrete
  const PAINT_HEX = getComputedStyle(document.documentElement).getPropertyValue("--front-spray").trim(), PAINT = new THREE.Color(PAINT_HEX); if (!/^#[0-9a-f]{6}$/i.test(PAINT_HEX)) throw new Error("--front-spray is missing from tokens.css"); bounce.color.copy(PAINT); // the paint (and the glow where it lands): the front's blue (Tom 11-22, one site), from tokens.css
  const PAINT_DAY_HEX = getComputedStyle(document.documentElement).getPropertyValue("--front-spray-day").trim(); if (!/^#[0-9a-f]{6}$/i.test(PAINT_DAY_HEX)) throw new Error("--front-spray-day is missing from tokens.css");
  const hexRGB = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)), PAINT_N = hexRGB(PAINT_HEX), PAINT_D = hexRGB(PAINT_DAY_HEX);
  const mistCol = [1, 3, 5].map(i => parseInt(PAINT_HEX.slice(i, i + 2), 16) / 255); // the mist and the splashes are the paint's own blue (its sRGB: their shader writes it straight out)
  const tokNum = n => { const v = parseFloat(tok(n)); if (!(v >= 0)) throw new Error("Couldn't read " + n + " from tokens.css"); return v; };
  const PIECE_TOK = { gain: [tokNum("--front-piece-gain"), tokNum("--front-piece-gain-day")], lift: [tokNum("--front-piece-lift"), tokNum("--front-piece-lift-day")], glow: [tokNum("--front-piece-glow"), tokNum("--front-piece-glow-day")], sat: tokNum("--front-piece-colour"), settle: tokNum("--front-piece-settle"), cloud: tokNum("--front-piece-cloud"), tag: tokNum("--front-old-paint") }; // the piece's lift (night, day) and speeds: tokens.css
  const pourU = { uPiece: { value: PAINT } /* the wet paint in the letters is the bucket's own paint, the day's blue by day: bare and lifted, the night blue went pale under the sky and the half-filled letters looked half-loaded (11-28). The settled faces are the top layer's own, night blue by day too */, uPieceE: { value: PIECE_TOK.glow[0] }, uOx: { value: PCX }, uT: { value: -1 }, uMask: { value: null }, uWet: { value: null }, uN: { value: 0 },
    uA: { value: Array.from({ length: NS }, () => new THREE.Vector4(0, -99, -99, 99)) }, uB: { value: Array.from({ length: NS }, () => new THREE.Vector4()) },
    uC: { value: PAINT }, uRep: { value: pourNor.repeat }, uOff: { value: pourNor.offset }, uDims: { value: new THREE.Vector4(PW, PH, HT, GROUND) }, uYB: { value: YB },
    uSh: { value: new THREE.Vector4(.3, VSH, WALL_TOP, 0) }, uL: { value: new THREE.Vector4(LEDGE.tip + .05, LEDGE.x0, LEDGE.spread, 0) } };
  const pourMat = new THREE.MeshPhysicalMaterial({ transparent: true, depthWrite: false, roughness: .22, clearcoat: .9, clearcoatRoughness: .1, envMapIntensity: .9, normalMap: pourNor, normalScale: new THREE.Vector2(.5, .5), polygonOffset: true, polygonOffsetFactor: -2 });
  pourMat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, pourU);
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", `#include <common>
      uniform sampler2D uMask, uWet; uniform vec3 uPiece; uniform float uPieceE, uOx; uniform float uT; uniform vec4 uA[${NS}], uB[${NS}]; uniform int uN; uniform vec3 uC; uniform vec2 uRep, uOff; uniform vec4 uDims, uSh, uL; uniform float uYB;
      float wetG;`)
      .replace("#include <map_fragment>", `
        vec2 uv0 = (vUv - uOff) / uRep;
        float wx = (uv0.x - .5) * uDims.x + uOx, wy = uDims.w + uv0.y * uDims.z, pa = 0.; wetG = 0.;
        vec2 cuv = vec2(uv0.x, (wy - uYB) / uDims.y);
        if (cuv.y > 0. && cuv.y < 1.) { float m = texture2D(uMask, cuv).r, T = texture2D(uWet, cuv).r * ${TMAX}.; float age = uT - T; pa = m * smoothstep(-.03, .06, age); wetG = pa * (1. - smoothstep(.3, 3., age)); }
        float pk = pa; // what the mould filled (the piece's letter faces): its own blue; the outline, side and shine come in the top layer
        float aa = fwidth(wx);
        // the sheet: comes over the edge where the ledge paint reaches it, slides down, slows, gathers a bead at its lower edge
        { float ft = uT - (uL.x + max(0., wx - uL.y) / uL.z); if (ft > 0.) {
          float D = uSh.x * (1. + .22 * sin(wx * 7.3 + 1.) + .14 * sin(wx * 17.9 + 2.) + .07 * sin(wx * 41.3));
          D = max(.001, D * smoothstep(uDims.x * .5 - .02, uDims.x * .5 - .7 - .25 * sin(wx * 9.1), abs(wx - uOx))); // the sheet thins out before the paint layer's sides: no straight cut
          float fr = D * (1. - exp(-ft * uSh.y * (1. + .15 * sin(wx * 5.1 + 3.)) / D));
          fr += .022 * pow(abs(sin(wx * 21. + 1.3)), 8.) * fr / D;   // small drops hanging from the bead
          float dep = uSh.z - wy, ay = fwidth(wy), sa = 1. - smoothstep(fr - ay, fr + ay, dep);
          pa = max(pa, sa); wetG = max(wetG, sa * mix(.55, 1., smoothstep(fr - .05, fr - .01, dep))); } }
        // runs: they wobble, swell and thin, carry a drop at the head; feeding runs drain to a thin trace, a few stay
        for (int i = 0; i < ${NS}; i++) { if (i >= uN) break; vec4 a = uA[i], b = uB[i];
          float tt = uT - a.w; if (tt <= 0. || wy > a.y + .01 || wy < a.z - .06) continue;
          float L = max(a.y - a.z, .01), fall = a.y - wy;
          float head = b.z < .5 ? min(b.y * tt, L) : L * (1. - exp(-tt * b.y / L));
          if (fall > head + b.x) continue;
          float tail = (b.z < .5 && tt > ${POUR.toFixed(1)}) ? b.y * (tt - ${POUR.toFixed(1)}) : -1.;
          float ph = a.x * 37.1, k = min(1., fall * 2.5);
          float wob = (.009 * sin(wy * 4.3 + ph) + .004 * sin(wy * 11.7 + ph * 1.7)) * k;
          float w = b.x * (1. + .32 * sin(wy * 8.3 + ph * 2.1) + .16 * sin(wy * 21. + ph)) * (1. + 1.3 * exp(-fall * 14.));
          float film = 1.;
          if (fall < tail) { w *= b.w > .5 ? .42 : .2; film = b.w > .5 ? 1. : .12; }
          float sa = (1. - smoothstep(w * .5 - aa, w * .5 + aa, abs(wx - a.x - wob))) * step(fall, head);
          float br = b.x * .8; vec2 bc = vec2(a.x + wob, a.y - head + br * .5);
          if (b.z > .5 || head < L - .001) sa = max(sa, 1. - smoothstep(br - aa, br + aa, length(vec2(wx, wy) - bc)));
          sa *= film; pa = max(pa, sa); wetG = max(wetG, sa * (fall < tail ? .3 : 1.)); }
        diffuseColor = vec4(mix(uC * (1. - .18 * wetG), uPiece * (1. - .1 * wetG), pk / max(pa, 1e-4)), pa);`)
      .replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\n totalEmissiveRadiance += uPiece * uPieceE * pk;")
      .replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\n roughnessFactor = mix(roughnessFactor, .04, wetG); roughnessFactor = mix(roughnessFactor, .6, pk * (1. - wetG)); // the settled piece is dry paint: no mirror (it dried greyer under the sky otherwise)")
      .replace("#include <lights_physical_fragment>", "#include <lights_physical_fragment>\n #ifdef USE_CLEARCOAT\n material.clearcoat *= 1. - pk * (1. - wetG) * .95;\n #endif");
  };
  const puddleU = { uT: pourU.uT, uC: pourU.uC, uP: { value: Array.from({ length: 12 }, () => new THREE.Vector4(0, 99, 0, 0)) }, uPN: { value: 0 } };
  const puddleMat = new THREE.MeshPhysicalMaterial({ transparent: true, depthWrite: false, roughness: .06, clearcoat: 1, clearcoatRoughness: .03, envMapIntensity: 1, polygonOffset: true, polygonOffsetFactor: -2 });
  puddleMat.defines = { USE_UV: "" };
  puddleMat.onBeforeCompile = sh => { Object.assign(sh.uniforms, puddleU);
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nuniform float uT; uniform vec3 uC; uniform vec4 uP[12]; uniform int uPN;")
      .replace("#include <map_fragment>", `
        float x = (vUv.x - .5) * ${(PW + 3).toFixed(2)}, z = (1. - vUv.y) * 1.6, f = 0.;
        for (int i = 0; i < 12; i++) { if (i >= uPN) break; vec4 p = uP[i]; float age = uT - p.y; if (age <= 0.) continue;
          float g = 1. - exp(-age / 1.3), rx = p.z * g + .03, rz = p.w * g + .02, dx = (x - p.x) / rx, dz = (z - rz * .35) / rz;
          f += 1. / (dx * dx + dz * dz + .001);
          for (int j = 0; j < 7; j++) { float fj = float(j) + float(i) * 7.; vec2 o = vec2(sin(fj * 12.9) * .6 + sin(fj * 3.1) * .25, .05 + abs(sin(fj * 7.7)) * .5) * (.7 + .5 * g);
            float rr = .016 + .02 * fract(sin(fj * 91.7) * 43.1); vec2 q = vec2(x - p.x - o.x * sign(sin(fj * 5.3)), z - o.y) / (rr * smoothstep(0., .15, age));
            f += .5 / (dot(q, q) + .001); } }
        float e = 1. + .18 * sin(x * 9. + z * 4.) * sin(z * 13. + x * 5.) + .08 * sin(x * 31. - z * 27.), v = f * e, aa = fwidth(v);
        float body = smoothstep(1. - aa, 1. + aa, v), rim = smoothstep(1., 1.25, v) * (1. - smoothstep(1.4, 2.6, v));
        vec3 col = uC * mix(.62, .9, smoothstep(1.2, 4., v));          // deeper where the paint is thick
        col = mix(col * .45, col, smoothstep(1., 1.1, v));                // the meniscus: a dark line right at the edge
        col += uC * .55 * rim;                                            // the rounded edge catching the light
        diffuseColor = vec4(col, body);`); };
  const creepU = { uFront: { value: -1 }, uLen: { value: 1 }, uGut: { value: 9 }, uC: pourU.uC }; let creep = null;
  const creepMat = new THREE.MeshPhysicalMaterial({ transparent: true, depthWrite: false, roughness: .06, clearcoat: 1, clearcoatRoughness: .03, polygonOffset: true, polygonOffsetFactor: -3 });
  creepMat.onBeforeCompile = sh => { Object.assign(sh.uniforms, creepU);
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nattribute vec2 aSD; varying vec2 vSD;").replace("#include <begin_vertex>", "#include <begin_vertex>\nvSD = aSD;");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nuniform float uFront, uLen, uGut; uniform vec3 uC; varying vec2 vSD;")
      .replace("#include <map_fragment>", `
        float sA = vSD.x, d = abs(vSD.y), ah = fwidth(d) + .002;
        float w = (.024 + .009 * sin(sA * 7.3) + .006 * sin(sA * 19.1 + 1.)) * mix(1., 1.9, smoothstep(uGut - .1, uGut + .3, sA)); // wider once it reaches the wet gutter
        w *= 1. + .45 * exp(-max(uFront - sA, 0.) * 9.);                                                             // the bead at the front
        float body = (1. - smoothstep(w - ah, w + ah, d)) * (1. - smoothstep(uFront - .002, uFront + .002, sA));
        float cap = 1. - smoothstep(w - ah, w + ah, length(vec2(d, max(sA - uFront, 0.))));                          // a round head
        float a = max(body, cap * step(uFront, sA)) * step(.0, uFront) * (1. - smoothstep(uLen - .06, uLen, sA));  // gone into the grate
        float r = d / w; vec3 col = uC * .82; col *= mix(1., .45, smoothstep(.72, 1., r)); col += uC * .4 * (1. - smoothstep(.2, .55, abs(r - .45)));
        diffuseColor = vec4(col, a);`); };
  function makeCreep() { // from the puddle nearest the gap, across the slabs, through the gap, along the gutter to the drain
    const src = grounds.slice(0, 12).filter(g => !g.big).reduce((b, g) => !b || Math.abs(g.x - GAP_X + .5) < Math.abs(b.x - GAP_X + .5) ? g : b, null); if (!src) return;
    const P = (x, z) => V(x, GROUND + .007, z), gz = CURB_Z + .5;
    const curve = new THREE.CatmullRomCurve3([P(src.x, .3), P(src.x + (GAP_X - src.x) * .25 + .08, 1.05), P(src.x + (GAP_X - src.x) * .7 - .06, 1.9), P(GAP_X - .02, 2.5), P(GAP_X, 2.88), P(GAP_X + .12, gz - .05), P(GAP_X + .45, gz), P(DRAIN_X - .3, gz + .01)], false, "centripetal", .4);
    const N = 360, HW = .07, pos = [], sd = [], idx = [], L = curve.getLength();
    for (let i = 0; i <= N; i++) { const u = i / N, c = curve.getPointAt(u), t = curve.getTangentAt(u), n = V(-t.z, 0, t.x).normalize(), sA = u * L, wob = .012 * Math.sin(sA * 11.);
      for (const sg of [-1, 1]) { pos.push(c.x + n.x * (sg * HW + wob), c.y, c.z + n.z * (sg * HW + wob)); sd.push(sA, sg * HW); }
      if (i < N) { const k = i * 2; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); } }
    const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute("aSD", new THREE.Float32BufferAttribute(sd, 2)); geo.setIndex(idx); geo.computeVertexNormals();
    if (geo.attributes.normal.getY(0) < 0) idx.reverse(), geo.setIndex(idx), geo.computeVertexNormals();
    // where the gutter begins along the path: the first point past the curb's road side
    let gut = L; for (let i = 0; i <= N; i++) if (curve.getPointAt(i / N).z > CURB_Z + .36) { gut = i / N * L; break; }
    creepU.uLen.value = L; creepU.uGut.value = gut;
    creep = { mesh: new THREE.Mesh(geo, creepMat), L, at: src.land + 1.8 }; scene.add(creep.mesh); }
  const puddle = new THREE.Mesh(new THREE.PlaneGeometry(PW + 3, 1.6), puddleMat); puddle.rotation.x = -Math.PI / 2; puddle.position.set(0, GROUND + .004, .8); scene.add(puddle);
  const pourMesh = new THREE.Mesh(new THREE.PlaneGeometry(PW, HT), pourMat); pourMesh.position.set(PCX, GROUND + HT / 2, .003); pourMesh.visible = false; scene.add(pourMesh);
  // the signature (Tom 11-28): "tlxq" as his hand tag, the wall's only other paint. There from the first frame, in the dark like the wall, a little faded once the light is on; the pour runs over it where it is in the way (it is drawn under the
  // paint, like the visitors' tags). [middle x, middle y, width, height] in wall metres, a laptop and a phone; tags are kept clear of it (60-pick.js). It keeps one of its own letter heights clear of the piece and the ground; on a phone it is small enough to leave the plate its room at 360 px wide.
  const SIGN = { wide: [3.87, -.81, 1.88, 1.24], narrow: [2.715, -1.6, 1.45, .95] }, SIGN_BOX = ([x, y, w, h]) => [x - w / 2, y - h / 2, x + w / 2, y + h / 2];
  const signMat = new THREE.MeshStandardMaterial({ map: tex("assets/start/tlxq-" + MU.set + ".webp", true, 1, 1), transparent: true, depthWrite: false, roughness: .92, metalness: 0, opacity: PIECE_TOK.tag, polygonOffset: true, polygonOffsetFactor: -1 });
  { const [x, y, w, h] = SIGN[NARROW ? "narrow" : "wide"], me = new THREE.Mesh(new THREE.PlaneGeometry(w, h), signMat); me.position.set(x, y, .0025); me.renderOrder = -1; scene.add(me); }
  // the top layer (Tom 11-28): outline, 3D side, shine, clouds and drips of the piece, one picture over the paint. Each pixel of it comes on a moment after the paint reached the nearest letter face (buildPour works the times out), so it
  // arrives letter by letter behind the front, the clouds growing out from the letters. Lit by the scene like the paint, and lifted a little (uLift) so the settled piece matches the painter's picture; the night blue stays by day.
  const PIECE_DIR = "assets/start/piece/";
  const topU = { uT: pourU.uT, uRv: { value: null }, uMk: { value: null }, uFill: { value: new THREE.Color(PAINT_HEX) }, uLift: { value: PIECE_TOK.lift[0] }, uGain: { value: PIECE_TOK.gain[0] }, uSat: { value: PIECE_TOK.sat } };
  const topMat = wallBump(new THREE.MeshPhysicalMaterial({ map: tex(PIECE_DIR + MU.set + "-top.webp", true, 1, 1), transparent: true, depthWrite: false, roughness: .5, clearcoat: .3, clearcoatRoughness: .3, envMapIntensity: .15,
    normalMap: tex("assets/wall4_nor_gl.jpg", false, PW / TILE, PH / TILE, (WW / 2 - WX - PW / 2 + PCX) / TILE, (PCY - PH / 2 - GROUND) / TILE), normalScale: new THREE.Vector2(.4, .4), polygonOffset: true, polygonOffsetFactor: -3 }));
  { const prev = topMat.onBeforeCompile; topMat.onBeforeCompile = sh => { prev(sh); Object.assign(sh.uniforms, topU);
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nuniform sampler2D uRv, uMk; uniform vec3 uFill; uniform float uT, uLift, uGain, uSat;")
      .replace("#include <map_fragment>", "#include <map_fragment>\n" + // the painter's piece is the top layer laid over a flat fill of the paint's blue IN SRGB, then lit: blending them in the light's own (linear) space makes every half-see-through shine pale, so it is flattened here first, on the letter faces too
      "float mk = texture2D(uMk, vUv).r, ta = diffuseColor.a, cov = ta + (1. - ta) * mk; vec3 tS = LinearTosRGB(vec4(diffuseColor.rgb, 1.)).rgb, fS = LinearTosRGB(vec4(uFill, 1.)).rgb, fl = (ta * tS + (1. - ta) * mk * fS) / max(cov, 1e-4);\n" +
      " diffuseColor.rgb = mix(pow(fl * .9478672986 + .0521327014, vec3(2.4)), fl * .0773993808, vec3(lessThanEqual(fl, vec3(.04045)))); diffuseColor.rgb = max(vec3(0.), mix(vec3(dot(diffuseColor.rgb, vec3(.2126, .7152, .0722))), diffuseColor.rgb, uSat)) * uGain; // the warm light and the film curve take colour out of a blue: put some back\n diffuseColor.a = cov * smoothstep(0., .7, uT - texture2D(uRv, vUv).r * " + TMAX + ".);")
      .replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\n totalEmissiveRadiance += diffuseColor.rgb * uLift;"); }; topMat.customProgramCacheKey = () => "pieceTop"; }
  const topMesh = new THREE.Mesh(new THREE.PlaneGeometry(PW, PH), topMat); topMesh.position.set(PCX, PCY, .0035); topMesh.renderOrder = 1; topMesh.visible = false; scene.add(topMesh);
  let plateAt = 1e9; // on the pour clock: the name is whole (the paint has reached the last of its letters), its plate shows with it (Tom 11-28: not after the settling)
  new THREE.ImageLoader().load("assets/start/piece/" + MU.set + "-mould.webp", buildPour); // the start set: it goes through the default loading manager, so the bucket waits for it like for the walls' pictures

  function buildPour(mould) {
    const W = pc.width, H = pc.height, mk = document.createElement("canvas"); mk.width = W; mk.height = H; const m = mk.getContext("2d", { willReadFrequently: true });
    m.fillStyle = "#000"; m.fillRect(0, 0, W, H); m.drawImage(mould, 0, 0, W, H); // the letter faces, white on black: the mask the paint fills
    { const x0 = PCX - PW / 2, x1 = PCX + PW / 2, y0 = PCY - PH / 2, y1 = PCY + PH / 2, sg = SIGN_BOX(SIGN[NARROW ? "narrow" : "wide"]);
      PROT.push(["the mural", V(x0, y0, 0), V(x1, y1, 0), ".tag"], ["the mural's first line", V(x0, y1 - PH * MU.row1, 0), V(x1, y1, 0), ".mail"],
        ["the signature", V(sg[0], sg[1], 0), V(sg[2], sg[3], 0), ".tag"]); } // the form on a phone covers the lower line, never the first; the plates keep off the piece and the signature
    // a half-size grid for the flow
    const full = m.getImageData(0, 0, W, H).data, w = W >> 1, h = H >> 1, N = w * h, PXH = PX / 2;
    const lit = new Uint8Array(N);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const a = (2 * y * W + 2 * x) * 4; lit[y * w + x] = Math.max(full[a], full[a + 4], full[a + W * 4], full[a + W * 4 + 4]); }
    // the letters as separate pieces, each with its top and bottom edge per column
    const lab = new Int32Array(N).fill(-1), comps = [], st = [];
    for (let i = 0; i < N; i++) {
      if (lit[i] < 128 || lab[i] >= 0) continue;
      const c = { id: comps.length, x0: 1e9, x1: -1, y0: 1e9, y1: -1 }; comps.push(c); lab[i] = c.id; st.push(i);
      while (st.length) { const j = st.pop(), x = j % w, y = j / w | 0; c.x0 = Math.min(c.x0, x); c.x1 = Math.max(c.x1, x); c.y0 = Math.min(c.y0, y); c.y1 = Math.max(c.y1, y);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue; const k = ny * w + nx; if (lit[k] >= 128 && lab[k] < 0) { lab[k] = c.id; st.push(k); } } }
    }
    comps.forEach(c => { c.top = new Int32Array(c.x1 - c.x0 + 1).fill(1e9); c.bot = new Int32Array(c.x1 - c.x0 + 1).fill(-1); });
    for (let i = 0; i < N; i++) { const L = lab[i]; if (L < 0) continue; const c = comps[L], x = i % w, y = i / w | 0, k = x - c.x0; if (y < c.top[k]) c.top[k] = y; if (y > c.bot[k]) c.bot[k] = y; }
    // the letters' own size (a line is as high as its letters are plus room), and which line each is on (the rows are told apart by the gap between their middles)
    const hts = comps.map(c => (c.y1 - c.y0 + 1) * 2).sort((a, b) => a - b), medH = hts[hts.length >> 1], lh = medH * 1.3, size = lh / .9;
    { let ln = 0, ref = null; for (const c of comps.slice().sort((a, b) => (a.y0 + a.y1) - (b.y0 + b.y1))) { const cy = c.y0 + c.y1; if (ref === null) ref = cy; else if (cy - ref > medH * .6) { ln++; ref = cy; } c.line = ln; } }
    const pass = new Uint8Array(N); for (let i = 0; i < N; i++) pass[i] = lit[i] >= 60 ? 1 : 0;
    const T = new Float64Array(N).fill(Infinity), seeds = [];
    // each piece is fed by the nearest piece above it (a thin run), or by its own stream from the top of the wall
    const gapMax = lh / 2 * 1.3, RUN = Math.max(2, size * .011);
    m.fillStyle = "#fff";
    for (const c of comps) {
      let best = null; const mid = c.top.length / 2;
      for (let k = 1; k < c.top.length - 1; k++) { const x = c.x0 + k, ty = c.top[k]; if (ty > 1e8) continue;
        for (let y = ty - 1; y >= Math.max(0, ty - gapMax); y--) { const L = lab[y * w + x]; if (L < 0) continue; if (comps[L].line >= c.line) break; // only a piece on a line above feeds this one
          const gap = ty - y; if (!best || gap < best.gap - 1 || (gap <= best.gap + 1 && Math.abs(k - mid) < Math.abs(best.x - c.x0 - mid))) best = { x, y, ty, gap }; break; } }
      if (best) { // a run from the piece above
        m.fillRect(2 * best.x + 1 - RUN / 2, 2 * best.y, RUN, 2 * (best.ty - best.y) + 2);
        const r = Math.max(0, Math.round(RUN / 4)); c.parent = lab[best.y * w + best.x]; c.feed = { x: best.x, y0: best.y, y1: best.ty, r }; for (let y = best.y; y <= best.ty; y++) for (let x = best.x - r; x <= best.x + r; x++) pass[y * w + x] = 1;
      } else { // a stream: the column at the piece's highest point
        const minT = Math.min(...c.top); const cols = []; c.top.forEach((v, k) => { if (v <= minT + 1) cols.push(k); });
        const hx = c.x0 + cols[cols.length >> 1], hy = c.top[hx - c.x0], p = toWorld(2 * hx + 1, 2 * hy);
        streams.push({ x: p.x, y: p.y, hx, c });
      }
    }
    // each run breaks off the sheet's bead, once the sheet has slid nearly all the way down
    SB = Math.min(.34, (WALL_TOP - Math.max(...comps.map(c => toWorld(0, 2 * c.y0).y))) * .38); pourU.uSh.value.x = SB;
    const startOf = x => { const D = sheetD(x); return [WALL_TOP - D * .9, ledgeArrive(x) + 2.3 * D / VSH]; };
    const speed = LEDGE.run;
    streams.forEach(s => { const [ys, t0] = startOf(s.x);
      Object.assign(s, { ys, t0: t0 + Math.random() * .06, w: (NARROW ? .042 : .036) * (.8 + Math.random() * .45), v: speed * (.9 + Math.random() * .2), kind: 0, keep: Math.random() < .2 ? 1 : 0 });
      s.land = s.t0 + (s.ys - s.y) / s.v; s.end = s.land + .5;
      for (let x = s.hx - 2; x <= s.hx + 2; x++) { const k = x - s.c.x0; if (k >= 0 && k < s.c.top.length && s.c.top[k] < 1e8) seeds.push([s.c.top[k] * w + x, s.land]); }
    });
    // short runs that never reach a letter: they slow down and stop in a drop
    const topY = Math.max(...comps.map(c => toWorld(0, 2 * c.y0).y)), shorts = [];
    for (let n = 0, tries = 0; n < (NARROW ? 3 : 5) && tries < 80; tries++) {
      const x = (Math.random() * 2 - 1) * SPAN, [ys, t0] = startOf(x), L = Math.min(.15 + Math.pow(Math.random(), 1.6) * 2.6, ys - topY - .1);
      if (L < .1) continue;
      shorts.push({ x, y: ys - L, ys, t0: t0 + .05 + Math.random() * .3, w: (NARROW ? .036 : .03) * (.7 + Math.random() * .5), v: 1.2 + Math.random(), kind: 1, keep: 1 }); n++;
    }
    const all = streams.concat(shorts).slice(0, NS);
    // flood: down fast, sideways slower, up slowly; a lumpy speed field so the front has fingers
    const CG = 10, cw = Math.ceil(w / CG) + 2, chh = Math.ceil(h / CG) + 2, cgrid = Float32Array.from({ length: cw * chh }, () => .55 + Math.random() * 1.05);
    const nz = new Float32Array(N);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const gx = x / CG, gy = y / CG, ix = gx | 0, iy = gy | 0, fx = gx - ix, fy = gy - iy, at = (a, b) => cgrid[b * cw + a];
      nz[y * w + x] = (at(ix, iy) * (1 - fx) + at(ix + 1, iy) * fx) * (1 - fy) + (at(ix, iy + 1) * (1 - fx) + at(ix + 1, iy + 1) * fx) * fy + Math.random() * .25; }
    const VD = 4.2, VS = 1.9, VU = .8, cv = dy => dy > 0 ? 1 / VD : dy < 0 ? 1 / VU : 1 / VS;
    const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]].map(([dx, dy]) => [dx, dy, (dx && dy ? Math.SQRT2 * (cv(0) + cv(dy)) / 2 : cv(dy)) / PXH]);
    const hi = [], hk = [];
    const push = (i, t) => { let n = hi.length; hi.push(i); hk.push(t); while (n > 0) { const p = (n - 1) >> 1; if (hk[p] <= t) break; hi[n] = hi[p]; hk[n] = hk[p]; n = p; } hi[n] = i; hk[n] = t; };
    const pop = () => { const i = hi[0], t = hk[0], li = hi.pop(), lk = hk.pop(), n = hi.length; if (n) { let j = 0; for (;;) { let c = 2 * j + 1; if (c >= n) break; if (c + 1 < n && hk[c + 1] < hk[c]) c++; if (hk[c] >= lk) break; hi[j] = hi[c]; hk[j] = hk[c]; j = c; } hi[j] = li; hk[j] = lk; } return [i, t]; };
    for (const [i, t] of seeds) if (t < T[i]) { T[i] = t; push(i, t); }
    while (hi.length) { const [i, t] = pop(); if (t > T[i]) continue; const x = i % w, y = i / w | 0;
      for (const [dx, dy, c] of DIRS) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue; const j = ny * w + nx; if (!pass[j]) continue; const nt = t + c * nz[j]; if (nt < T[j]) { T[j] = nt; push(j, nt); } } }
    // reading order: line by line, left to right. A piece waits its turn (the paint pools in the piece above, then runs on)
    { const lineOf = c => c.line, E = comps.map(() => Infinity), Mx = comps.map(() => -Infinity), S = new Float64Array(comps.length);
      for (let i = 0; i < N; i++) { const L = lab[i]; if (L < 0 || !(T[i] < 1e9)) continue; if (T[i] < E[L]) E[L] = T[i]; if (T[i] > Mx[L]) Mx[L] = T[i]; }
      const order = comps.filter(c => E[c.id] < 1e9).sort((a, b) => lineOf(a) - lineOf(b) || a.x0 - b.x0), done = new Uint8Array(comps.length);
      let cur = null, prevStart = -Infinity, lineEnd = -Infinity, curEnd = -Infinity;
      const visit = c => { if (done[c.id]) return; done[c.id] = 1; const k = lineOf(c);
        if (c.parent != null && c.parent >= 0 && !done[c.parent] && lineOf(comps[c.parent]) === k) visit(comps[c.parent]);
        if (k !== cur) { if (cur !== null) lineEnd = Math.max(lineEnd, curEnd); cur = k; prevStart = -Infinity; curEnd = -Infinity; }
        let need = Math.max(prevStart + .05, lineEnd - .45); if (c.parent != null && c.parent >= 0) need = Math.max(need, E[c.id] + S[c.parent]);
        S[c.id] = Math.max(0, need - E[c.id]); prevStart = E[c.id] + S[c.id]; curEnd = Math.max(curEnd, Mx[c.id] + S[c.id]); };
      order.forEach(visit);
      const own = Int32Array.from(lab);
      for (const c of comps) if (c.feed) { const f = c.feed; for (let y = f.y0; y <= f.y1; y++) for (let x = f.x - f.r; x <= f.x + f.r; x++) { const j = y * w + x; if (lab[j] < 0) own[j] = c.id; } }
      for (let i = 0; i < N; i++) { if (own[i] >= 0 || !(T[i] < 1e9)) continue; const x = i % w, y = i / w | 0; let b = -1;
        for (let dy = -2; dy <= 2 && b < 0; dy++) for (let dx = -2; dx <= 2; dx++) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue; const L = lab[ny * w + nx]; if (L >= 0) { b = L; break; } }
        own[i] = b; }
      for (let i = 0; i < N; i++) if (own[i] >= 0 && T[i] < 1e9) T[i] += S[own[i]];
      streams.forEach(st => { const d = S[st.c.id]; st.t0 += d; st.land += d; st.end += d; }); }
    pourDone = 0; for (let i = 0; i < N; i++) if (lab[i] >= 0 && T[i] < 1e9) pourDone = Math.max(pourDone, T[i]);
    plateAt = Math.min(pourDone, TMAX - 6); pourDone += .3; // the plate comes the moment the name is whole, while the top layer still settles and the leftover runs still fall
    // (the piece's own drips are in its top layer; the leftover runs below start clear of the plate and of the tlxq)
    const maxB = Math.max(...comps.map(c => c.y1)), lows = comps.filter(c => c.y1 >= maxB - lh / 2 * .35 && c.top.length > 8);
    // a few runs keep going past the letters to the foot of the wall; each makes a puddle where it lands
    for (let n = 0, tries = 0; n < (NARROW ? 4 : 6) && tries < 200 && lows.length && all.length < NS; tries++) {
      const c = lows[Math.random() * lows.length | 0], k = 3 + (Math.random() * (c.top.length - 6) | 0), hx = c.x0 + k, by = c.bot[k];
      if (by < 0 || !(T[by * w + hx] < 1e9) || lit[(by + 2) * w + hx] > 0 || grounds.some(g => Math.abs(g.hx - hx) < 12)) continue;
      { const x = PCX - PW / 2 + (2 * hx + 1) / PX, sg = SIGN_BOX(SIGN[NARROW ? "narrow" : "wide"]); if (x > MU.plate.dry[0] && x < MU.plate.dry[1]) continue; // never blue over words: no leftover run where the plate stands
        if (x > sg[0] - .08 && x < sg[2] + .08) continue; } /* .08 m: a run's own width past the box's edge */ // nor through the tlxq: no leftover run crosses the signature's box, a hard rule too (Tom 11-28); fewer runs rather than one through it
      const p = toWorld(2 * hx + 1, 2 * by + 2), t0 = T[by * w + hx] + .3 + Math.random() * .7, v = .9 + Math.random() * .6;
      const g = { hx, x: p.x, ys: p.y, y: GROUND, t0, v, w: (NARROW ? .04 : .034) * (.8 + Math.random() * .5), kind: 0, keep: Math.random() < .5 ? 1 : 0 };
      g.land = t0 + (p.y - GROUND) / v; g.feed = g.land + Math.max(.4, 1.4 - (p.y - GROUND) / v); grounds.push(g); all.push(g); n++;
    }
    grounds.unshift({ x: CUR.x, land: CUR.land, feed: CUR.tailLand, big: .62 }, ...LRUNS.map(r => ({ x: r.x, land: r.land, feed: r.land + .4, big: .2 })));
    grounds.slice(0, 12).forEach((g, i) => puddleU.uP.value[i].set(g.x, g.land, g.big ? g.big * (NARROW ? .8 : 1) : (.24 + Math.random() * .26) * (NARROW ? .8 : 1), g.big ? g.big * .7 : .3 + Math.random() * .16)); puddleU.uPN.value = Math.min(12, grounds.length); makeCreep();
    pourRuns = all; all.forEach((s, i) => { pourU.uA.value[i].set(s.x, s.ys, s.y, s.t0); pourU.uB.value[i].set(s.w, s.v, s.kind, s.keep); }); pourU.uN.value = all.length;
    // close the soft edges: every pixel the paint touches takes the time of its wet neighbour
    for (let pass2 = 0; pass2 < 3; pass2++) { const U = T.slice(); for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) { const i = y * w + x; if (U[i] < 1e9) continue;
      let b = Infinity; for (const [dx, dy] of DIRS) { const v = U[i + dy * w + dx]; if (v < b) b = v; } if (b < 1e9) T[i] = b + .02; } }
    // the top layer settles behind the paint: every pixel takes the wet time of the nearest letter face, plus a moment of settling and a little more the further out it is (the clouds grow out from the letters)
    const TT = new Float64Array(N).fill(Infinity), SETTLE = PIECE_TOK.settle, CLOUD_V = PIECE_TOK.cloud; hi.length = 0; hk.length = 0;
    for (let i = 0; i < N; i++) if (lab[i] >= 0 && T[i] < 1e9) { TT[i] = T[i]; push(i, T[i]); }
    while (hi.length) { const [i, t] = pop(); if (t > TT[i]) continue; const x = i % w, y = i / w | 0;
      for (const [dx, dy] of DIRS) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue; const j = ny * w + nx, nt = t + Math.hypot(dx, dy) / PXH / CLOUD_V; if (nt < TT[j]) { TT[j] = nt; push(j, nt); } } }
    const rv = new Uint8Array(N * 4);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const t = TT[y * w + x] + SETTLE; const v = t < 1e9 ? Math.min(254, Math.round(t / TMAX * 255)) : 255, r = ((h - 1 - y) * w + x) * 4; rv[r] = rv[r + 1] = rv[r + 2] = v; rv[r + 3] = 255; }
    const rvTex = new THREE.DataTexture(rv, w, h); rvTex.minFilter = rvTex.magFilter = THREE.LinearFilter; rvTex.generateMipmaps = false; rvTex.needsUpdate = true;
    topU.uRv.value = rvTex; { const mt = new THREE.Texture(mould); mt.needsUpdate = true; topU.uMk.value = mt; } topMesh.visible = true;
    const maskTex = new THREE.CanvasTexture(mk); maskTex.anisotropy = maxAniso;
    const data = new Uint8Array(N * 4);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const t = T[y * w + x], v = t < 1e9 ? Math.min(254, Math.round(t / TMAX * 255)) : 255, r = ((h - 1 - y) * w + x) * 4; data[r] = data[r + 1] = data[r + 2] = v; data[r + 3] = 255; }
    const wetTex = new THREE.DataTexture(data, w, h); wetTex.minFilter = wetTex.magFilter = THREE.LinearFilter; wetTex.generateMipmaps = false; wetTex.needsUpdate = true;
    pourU.uMask.value = maskTex; pourU.uWet.value = wetTex; pourMesh.visible = true; pourReady = true;
  }
  function splashGround(at, n) { for (let k = 0; k < n; k++) { const i = mi = (mi + 1) % MN; mc[i * 3] = mistCol[0]; mc[i * 3 + 1] = mistCol[1]; mc[i * 3 + 2] = mistCol[2]; mp[i * 3] = at.x + gauss() * .03; mp[i * 3 + 1] = at.y; mp[i * 3 + 2] = .05;
    mv[i * 3] = gauss() * .45; mv[i * 3 + 1] = .25 + Math.random() * .45; mv[i * 3 + 2] = .1 + Math.random() * .35; ml[i] = .45 + Math.random() * .15; } }
  function splash(at, n) { for (let k = 0; k < n; k++) { const i = mi = (mi + 1) % MN; mc[i * 3] = mistCol[0]; mc[i * 3 + 1] = mistCol[1]; mc[i * 3 + 2] = mistCol[2]; mp[i * 3] = at.x; mp[i * 3 + 1] = at.y; mp[i * 3 + 2] = .03;
    mv[i * 3] = gauss() * .9; mv[i * 3 + 1] = .1 + Math.random() * .7; mv[i * 3 + 2] = .2 + Math.random() * .6; ml[i] = .8 + Math.random() * .2; } }


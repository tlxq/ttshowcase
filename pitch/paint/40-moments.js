  // ---- moment 3: raddavarfruberga (Tom 11-19): one graffiti piece, soft pastel community mural: the name, the preschool sprayed in the name's style and
  // the parents' banner painted in. The banner's words are set by hand and sprayed on when you arrive; the banner is the link. No signers' names (never public).
  const RX = 31; // 4.5 m further on than the first version, so the sign beside it is clear of the underpass
  const RVP = paintOn("assets/rvf_wall.webp", NARROW ? 8 : 9.6, [1186, 905], [RX, G3]); // one painting (Tom 11-25): the piece at .8 inside its own dark backdrop, whose foot (row 905) stands on the street
  const RVM = ([u0, v0, u1, v1]) => [u0 * .8 + 154, v0 * .8 + 110, u1 * .8 + 154, v1 * .8 + 110]; // the piece's old picture boxes, in the new picture
  for (const [n, b] of [["raddavarfruberga's name", [20, 180, 1000, 480]], ["raddavarfruberga's preschool", [860, 230, 1535, 872]], ["raddavarfruberga's banner", [77, 520, 842, 775]]]) RVP.protect(n, RVM(b));
  let RVF_TAGS, RVF_PAINT; // the stack is painted into the picture now (Tom 11-25); the banner's words sprayed on (k: 0 to 1)
  const RVF_BOX = RVM([77, 520, 842, 775]), RVF_GLOW = () => makeGlow("assets/rvf_wall.webp", RVP, RVF_BOX, { cloth: true, colour: "#ffe9a8", fill: 0, hole: 1 }); // the banner: the link's tap area and its glow, round the cloth's own edge
  { // the banner's words, drawn once and sprayed on left to right; then the stack: each tool its own small tag round the piece, in its colours
    const BB = RVF_BOX, tl = RVP.at(BB[0] + 16, BB[1] + 18), br = RVP.at(BB[2] - 16, BB[3] - 10), TW = br.x - tl.x, TH = tl.y - br.y, CW = 1400, CH = Math.round(CW * TH / TW);
    const full = Object.assign(document.createElement("canvas"), { width: CW, height: CH }), show = Object.assign(document.createElement("canvas"), { width: CW, height: CH }), bt = new THREE.CanvasTexture(show);
    bt.encoding = THREE.sRGBEncoding; bt.anisotropy = maxAniso;
    const banWords = new Image(); // "Don't kick / our kids out" in the stack's street-tag hand (Tom 11-25), a mask painted red
    const words = () => { const g = full.getContext("2d"); g.clearRect(0, 0, CW, CH); g.globalAlpha = .93; g.drawImage(banWords, 0, 0, CW, CH); g.globalAlpha = 1;
      g.globalCompositeOperation = "source-in"; g.fillStyle = "#b0231c"; g.fillRect(0, 0, CW, CH); g.globalCompositeOperation = "source-over"; shown = -1; };
    let shown = -1; banWords.onload = words; banWords.src = "assets/rvf_banner.webp";
    const ban = new THREE.Mesh(new THREE.PlaneGeometry(TW, TH), new THREE.MeshStandardMaterial({ map: bt, transparent: true, depthWrite: false, roughness: .7, polygonOffset: true, polygonOffsetFactor: -3 }));
    ban.position.set(tl.x + TW / 2, br.y + TH / 2, .005); ban.renderOrder = 2; scene.add(ban); // after the painting: both are see-through layers on the wall
    RVF_PAINT = k => { k = Math.round(k * 60) / 60; if (k === shown) return; shown = k; const g = show.getContext("2d"); g.clearRect(0, 0, CW, CH); if (k <= 0) { bt.needsUpdate = true; return; }
      const x = k * CW * 1.1; g.drawImage(full, 0, 0); g.globalCompositeOperation = "destination-in"; const gr = g.createLinearGradient(x - CW * .1, 0, x, 0); gr.addColorStop(0, "#000"); gr.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = gr; g.fillRect(0, 0, CW, CH); g.globalCompositeOperation = "source-over"; bt.needsUpdate = true; }; // left to right, a soft front like a can moving along
    RVF_TAGS = []; // the stack is in the painting
  }
  const lamp3 = new THREE.SpotLight(0xfff3e6, 0, 30, .62, .75, 1.3); lamp3.position.set(RX - 9, 3.8 - 2 * DROP, 4.4); lamp3.target.position.set(RX - 1.6, .3 - 2 * DROP, 0); lamp3.castShadow = false; scene.add(lamp3, lamp3.target);
  document.querySelector(".hud").insertAdjacentHTML("beforeend", '<a class="hot" id="hot3" href="https://raddavarfruberga.se" target="_blank" rel="noopener" aria-label="Open the site" tabindex="-1"></a>'
    + '<div class="tag facts" id="tagRvf"><b>raddavarfruberga.se</b>A site to collect signatures so 20 children keep their preschool places.</div>');
  const hot3 = document.getElementById("hot3"), tagRvf = document.getElementById("tagRvf");
  svg.insertAdjacentHTML("beforeend", '<line id="l7"/><circle id="c7" r="4"/>'); const l7 = svg.querySelector("#l7"), c7 = svg.querySelector("#c7");
  let rvfStart = 0; const RVF_END = 1.1; // the label comes once the banner's words are on
  let endK = 0; // how far the camera has left raddavarfruberga for the garage door
  function rvfAt(now, walk3, end3) {
    lens.uniforms.uAper.value = 1 - .8 * walk3; const on = walk3 > .02; lamp3.intensity = 5 * sm(cl((walk3 - .1) / .3));
    if (introOver && walk3 > .3 && !rvfStart) rvfStart = now; // once per visit, while the camera is still coming in, so the cloth is never seen empty (Tom 11-25)
    const sec = rvfStart ? (REDUCED ? 99 : (now - rvfStart) / 1000) : -1;
    const showL = sec > RVF_END + .2 && walk3 > .5 && end3 < .5; [tagRvf, l7, c7].forEach(e => e.style.opacity = showL ? 1 : 0);
    if (on) pin(tagRvf, l7, c7, NARROW ? V(RX - .84, G3 + .1, .3) : RVP.at(1194, 905), NARROW ? 14 : 8, NARROW ? 70 : 34); // below the painting's foot, on the dark street, where the neon box has room
    RVF_PAINT(REDUCED ? 1 : sec < 0 ? 0 : cl(sec / .9)); RVF_TAGS.forEach((t, i) => t.fade(showL && sec > RVF_END + .2 + i * .3));
    placeHots([hot3], [RVF_BOX], RVP, sec >= .3 && walk3 > .5 && endK < .5); } // the banner is the link, once the camera is at the wall

  // ---- the ending (Tom 11-26): past raddavarfruberga a garage door in the street wall rolls up and the camera walks into a workshop: a workbench at the door end, a shelf and a
  // tool chest at the far end, fluorescent tubes. On its back wall the Toolbox production: ttoolbox, dot, tthermal. A second door at the far end is open: the way out to EDGE, on its own clean wall (client work, the next round); then on along the wall, in close
  // to its bare concrete, and out at the visitors' wall, where the walk began (Tom 11-23: no flash, no landing).
  // Words from src/content/look.ts and the repos' own descriptions. Signs are drawn once and shown by time (reveal).
  const conc = (w, h, x0, y0, col) => new THREE.MeshStandardMaterial({ map: tex("assets/wall4_diff.jpg", true, w / TILE, h / TILE, (x0 + 21) / TILE, (y0 - GROUND) / TILE),
    normalMap: tex("assets/wall4_nor_gl.jpg", false, w / TILE, h / TILE, (x0 + 21) / TILE, (y0 - GROUND) / TILE), color: col, roughness: .92, envMapIntensity: .2 });
  const slab = (x0, x1, y0, y1, z0, z1, m) => { const b = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), m); b.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); scene.add(b); return b; };
  // the room's material (Tom 11-26): a PAINTED BLOCK GARAGE. Concrete blocks painted off-white long ago, scuffed, a few small tags, the paint worn at knee height; a grey painted
  // floor with a few oil stains. Pale and painted inside, raw grey concrete outside. Drawn once on canvases (256 px a metre); wallMat/floorMat/ceilMat are the swap points.
  const rngOf = seed => { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; };
  const blockTex = () => { const PXM = 256, W = 1600, H = 1152, c = document.createElement("canvas"); c.width = W; c.height = H; const g = c.getContext("2d"), rnd = rngOf(11);
    g.fillStyle = "#d6d1c4"; g.fillRect(0, 0, W, H); const bw = .4 * PXM, bh = .2 * PXM;
    for (let r = 0; r * bh < H; r++) for (let x = -(r % 2) * bw / 2; x < W; x += bw) { const v = rnd(); g.fillStyle = `rgba(${v < .5 ? "255,250,235" : "90,80,60"},${.03 + rnd() * .05})`; g.fillRect(x, r * bh, bw, bh); }
    g.strokeStyle = "rgba(120,112,95,.55)"; g.lineWidth = 2.2; for (let r = 0; r * bh < H + bh; r++) { g.beginPath(); g.moveTo(0, r * bh); g.lineTo(W, r * bh); g.stroke(); for (let x = -(r % 2) * bw / 2; x < W; x += bw) { g.beginPath(); g.moveTo(x, r * bh); g.lineTo(x, (r + 1) * bh); g.stroke(); } }
    // worn at knee height (the floor is the bottom of the picture): grime, scrape streaks, chipped paint showing grey concrete
    const fl = y => H - y * PXM; let gr = g.createLinearGradient(0, fl(1), 0, fl(0)); gr.addColorStop(0, "rgba(90,80,62,0)"); gr.addColorStop(.5, "rgba(90,80,62,.2)"); gr.addColorStop(1, "rgba(60,52,40,.42)"); g.fillStyle = gr; g.fillRect(0, fl(1), W, fl(0) - fl(1));
    for (let i = 0; i < 140; i++) { const y = fl(.15 + rnd() * .75), x = rnd() * W, l = 20 + rnd() * 110; g.strokeStyle = `rgba(${rnd() < .5 ? "70,62,50" : "255,252,240"},${.08 + rnd() * .2})`; g.lineWidth = 1 + rnd() * 2.5; g.beginPath(); g.moveTo(x, y); g.lineTo(x + l, y + (rnd() - .5) * 6); g.stroke(); }
    for (let i = 0; i < 90; i++) { const y = fl(.1 + rnd() * rnd() * 1.6), x = rnd() * W; g.fillStyle = `rgba(112,114,112,${.35 + rnd() * .35})`; g.beginPath(); g.ellipse(x, y, 2 + rnd() * 7, 1.5 + rnd() * 4, rnd() * 3, 0, 6.3); g.fill(); }
    for (let i = 0; i < 9; i++) { const x = rnd() * W, w = 6 + rnd() * 14; g.fillStyle = `rgba(80,66,48,${.06 + rnd() * .08})`; g.fillRect(x, 0, w, H * (.4 + rnd() * .6)); } // old water runs
    // (no loose scribbles: Tom 11-26, they read as stray marks round the Toolbox production)
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.encoding = THREE.sRGBEncoding; t.anisotropy = maxAniso; return t; };
  // the floor (Tom 11-26, cause D: it read as a road): grey painted concrete, 6 m a tile. Soft mottling in the paint, worn patches where the bare concrete
  // shows through, fine grit and scuffs, one saw cut, and only two oil stains a tile, each a soft puddle with a darker heart. No tyre marks, no hard blocks.
  const floorTex = () => { const W = 1024, c = document.createElement("canvas"); c.width = c.height = W; const g = c.getContext("2d"), rnd = rngOf(5), PXM = W / 6;
    const blob = (x, y, r, col, a0, a1 = 0) => { for (const dx of [-W, 0, W]) for (const dy of [-W, 0, W]) { const X = x + dx, Y = y + dy; if (X + r < 0 || X - r > W || Y + r < 0 || Y - r > W) continue; // wraps, so the tiles meet without a seam
      const gd = g.createRadialGradient(X, Y, 0, X, Y, r); gd.addColorStop(0, `rgba(${col},${a0})`); gd.addColorStop(.55, `rgba(${col},${(a0 + a1) / 2})`); gd.addColorStop(1, `rgba(${col},${a1})`); g.fillStyle = gd; g.fillRect(X - r, Y - r, 2 * r, 2 * r); } };
    g.fillStyle = "#73787d"; g.fillRect(0, 0, W, W);
    for (let i = 0; i < 70; i++) blob(rnd() * W, rnd() * W, 60 + rnd() * 160, rnd() < .5 ? "255,255,255" : "18,20,24", .025 + rnd() * .035); // the paint's own unevenness
    for (let i = 0; i < 5; i++) { const x = rnd() * W, y = rnd() * W; for (let k = 0; k < 14; k++) blob(x + (rnd() - .5) * 180, y + (rnd() - .5) * 90, 14 + rnd() * 40, "150,145,134", .18 + rnd() * .14); } // paint worn through to the concrete
    for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(${rnd() < .5 ? "235,235,230" : "25,25,28"},${.05 + rnd() * .08})`; g.fillRect(rnd() * W, rnd() * W, 1 + rnd() * 1.5, 1 + rnd() * 1.5); } // grit
    g.lineCap = "round"; for (let i = 0; i < 40; i++) { const x = rnd() * W, y = rnd() * W, a = rnd() * 6.3, l = 10 + rnd() * 50; g.strokeStyle = `rgba(${rnd() < .6 ? "200,200,195" : "30,30,34"},${.06 + rnd() * .08})`; g.lineWidth = .8 + rnd();
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); } // scuffs
    g.strokeStyle = "rgba(40,42,46,.4)"; g.lineWidth = 1.5; g.beginPath(); g.moveTo(0, .5); g.lineTo(W, .5); g.stroke(); // one saw cut across, every 6 m
    for (let i = 0; i < 2; i++) { const x = (.2 + .6 * rnd()) * W, y = (.2 + .6 * rnd()) * W, r = (.25 + rnd() * .35) * PXM; // oil: a soft puddle of a few drops, a darker heart, a faint brown edge
      for (let k = 0; k < 7; k++) blob(x + (rnd() - .5) * r * 1.4, y + (rnd() - .5) * r * .5, r * (.25 + rnd() * .45), "30,26,20", .08 + rnd() * .08);
      blob(x, y, r * .3, "14,12,10", .14); blob(x + r * .3, y - r * .1, r * 1.3, "60,48,32", .04); }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.encoding = THREE.sRGBEncoding; t.anisotropy = maxAniso; return t; };
  const BLOCK_T = blockTex(), FLOOR_T = floorTex(), cloneT = (t, rx, ry) => { const q = t.clone(); q.needsUpdate = true; q.repeat.set(rx, ry); return q; };
  const wallMat = (w, h) => new THREE.MeshStandardMaterial({ map: cloneT(BLOCK_T, w / 6.25, h / 4.5), roughness: .9, envMapIntensity: .1 });
  const floorMat = (w, d) => new THREE.MeshStandardMaterial({ map: cloneT(FLOOR_T, w / 6, d / 6), roughness: .55, envMapIntensity: .35 });
  const ceilMat = new THREE.MeshStandardMaterial({ color: 0xb9b5ab, roughness: .95 });
  const plank = (w, h, horiz) => horiz ? floorMat(w, h) : wallMat(w, h); // (the old name: every caller says wall, or floor when horiz)
  const RW = CX1 - HX0, CEIL = G3 + RH, DOORS = [DOOR_A, DOOR_B], SHOP_WARM = 0xf3f1ff;
  const PK = NARROW ? .0022 : .00385, PX0 = NARROW ? 39.3 : 37.2, PC = [1767, 3144, 4398].map(c => PX0 + c * PK); // the production's strip: metres a pixel, where it starts, the x of each piece's middle
  const shop = { open: 0, lit: 0, ins: 0, panel: null }; // open: how far door A has rolled up (0..1); lit: the workshop's own light (0..1); ins: how far the camera is inside (0..1)
  const metalM = new THREE.MeshStandardMaterial({ color: 0x4d5156, metalness: .5, roughness: .6 });
  { // the room: floor, back wall, ceiling, the two end walls, and the street wall's inside with a thick frame round each door
    const wallM = plank(RW, RH);
    const back = new THREE.Mesh(new THREE.PlaneGeometry(RW, RH), wallM); back.position.set(HX0 + RW / 2, G3 + RH / 2, WZ); scene.add(back);
    for (const [x, ry] of [[HX0, Math.PI / 2], [CX1, -Math.PI / 2]]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(BD, RH), plank(BD, RH)); m.rotation.y = ry; m.position.set(x, G3 + RH / 2, WZ / 2); scene.add(m); }
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(RW, BD), ceilMat); ceil.rotation.x = Math.PI / 2; ceil.position.set(HX0 + RW / 2, CEIL, WZ / 2); scene.add(ceil);
    const floorM = plank(RW, BD, true); slab(HX0, CX1, G3 - .3, G3, WZ, 0, floorM);
    const edges = [HX0, DOOR_A[0], DOOR_A[1], DOOR_B[0], DOOR_B[1], CX1]; // the wall between the doors, and over each (the lintel)
    [[0, 1], [2, 3], [4, 5]].forEach(([a, b]) => slab(edges[a], edges[b], G3 - .01, CEIL, -.3, -.001, plank(edges[b] - edges[a], RH)));
    [[1, 2], [3, 4]].forEach(([a, b]) => slab(edges[a], edges[b], G3 + DOOR_H, CEIL, -.3, -.001, plank(edges[b] - edges[a], RH - DOOR_H)));
    const ribs = (() => { const c = document.createElement("canvas"); c.width = 16; c.height = 64; const g = c.getContext("2d"); g.fillStyle = "#8a8f94"; g.fillRect(0, 0, 16, 64); g.fillStyle = "#4b4f54"; g.fillRect(0, 0, 16, 7); g.fillStyle = "#a7acb1"; g.fillRect(0, 7, 16, 3);
      const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.encoding = THREE.sRGBEncoding; t.anisotropy = maxAniso; t.repeat.set(1, DOOR_H / .1); return t; })();
    const steel = new THREE.MeshStandardMaterial({ color: 0x7d8288, metalness: .7, roughness: .5, envMapIntensity: .6 });
    DOORS.forEach(([a, b], i) => { const w = b - a, xc = (a + b) / 2; // each door: its guide rails, the drum the shutter rolls into above it, and (door A) the shutter itself
      for (const x of [a - .05, b + .05]) slab(x - .06, x + .06, G3, G3 + DOOR_H + .1, .005, .1, metalM);
      const drum = new THREE.Mesh(new THREE.CylinderGeometry(.3, .3, w + .5, 28), steel); drum.rotation.z = Math.PI / 2; drum.position.set(xc, G3 + DOOR_H + .42, .36); scene.add(drum);
      for (const x of [a - .2, b + .2]) slab(x - .04, x + .04, G3 + DOOR_H + .1, G3 + DOOR_H + .75, .005, .36, metalM);
      if (i) return;
      const pm = new THREE.MeshStandardMaterial({ color: 0xc4c9ce, map: ribs, bumpMap: ribs, bumpScale: 1.4, metalness: .55, roughness: .5, envMapIntensity: .5 });
      shop.panel = new THREE.Mesh(new THREE.BoxGeometry(w + .04, DOOR_H, .05), pm); shop.panel.position.set(xc, G3 + DOOR_H / 2, -.12); scene.add(shop.panel);
      const handle = new THREE.Mesh(new THREE.BoxGeometry(.5, .06, .06), metalM); handle.position.set(0, -DOOR_H / 2 + .12, .05); shop.panel.add(handle); }); }
  // the lights: long fluorescent tubes in two rows under steel beams (one at the far end flickers), a conduit; the lamps' parts are shared
  const lampShade = new THREE.MeshStandardMaterial({ color: 0x35503f, metalness: .3, roughness: .55, side: THREE.DoubleSide }), shopBulb = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffdca8, emissiveIntensity: 0 });
  const beamM = new THREE.MeshStandardMaterial({ color: 0x9a9da1, metalness: .5, roughness: .6 });
  for (let x = HX0 + 1.3; x < CX1; x += 3.2) slab(x - .07, x + .07, CEIL - .3, CEIL, WZ, 0, beamM); // steel beams across
  const pipeM = new THREE.MeshStandardMaterial({ color: 0x6f7377, metalness: .7, roughness: .45 });
  const pipe = (a, b, r = .022) => { const d = b.clone().sub(a), m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, d.length(), 8), pipeM); m.position.copy(a).addScaledVector(d, .5); m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); scene.add(m); return m; };
  pipe(V(HX0 + .2, CEIL - .36, WZ + .12), V(CX1 - .2, CEIL - .36, WZ + .12));
  const fixM = new THREE.MeshStandardMaterial({ color: 0x3a3c3f, metalness: .5, roughness: .5 }), tubeM = new THREE.MeshStandardMaterial({ color: 0, emissive: 0xeef3ff, emissiveIntensity: 0 }), tubeBad = tubeM.clone();
  const TUBE_X = []; for (let x = HX0 + 2.4; x < CX1 - 1; x += 4.8) TUBE_X.push(x);
  for (const z of [WZ + 1.5, WZ + 5.2]) TUBE_X.forEach((x, i) => { const f = new THREE.Mesh(new THREE.BoxGeometry(1.4, .05, .16), fixM), t = new THREE.Mesh(new THREE.BoxGeometry(1.3, .026, .08), z > WZ + 3 && i === 8 ? tubeBad : tubeM); f.position.set(x, CEIL - .35, z); t.position.set(x, CEIL - .39, z); scene.add(f, t); });
  // garage things (Tom 11-26, cause C of his walk-through): only at the two ends, every one different, nothing between or in front of the paintings. At the door end
  // a worn workbench in the corner with a pegboard of real tools over it and a fire extinguisher on the side wall; at the far end a steel shelf, a stack of tyres
  // and a red tool chest on castors. Few things, each with depth: rounded edges, real sizes, one shared wear map (grime in the corners, scuffs, chips), a soft
  // contact shadow under and behind each, nothing floating. Built after the tip (LATE), and each canvas goes to the graphics card on its own turn.
  const steelM = new THREE.MeshStandardMaterial({ color: 0x8e949a, metalness: .6, roughness: .5 });
  const mat = c => new THREE.MeshStandardMaterial({ color: c, roughness: .7 }), box = (w, h, d, x, y, z, m) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); scene.add(b); return b; };
  LATE.run(() => { const lateT = [], canv = (w, h, draw, rep) => { const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h); const t = new THREE.CanvasTexture(c);
      t.encoding = THREE.sRGBEncoding; t.anisotropy = maxAniso; if (rep) t.wrapS = t.wrapT = THREE.RepeatWrapping; lateT.push(t); return t; };
    // a box with rounded edges (three's RoundedBoxGeometry, r147, without its UV tweak: each face keeps 0..1, so the wear map's grime sits in every face's corners)
    const rgeo = (w, h, d, r = .012) => { const s = 3, g = new THREE.BoxGeometry(1, 1, 1, s, s, s).toNonIndexed(), p = g.attributes.position.array, n = g.attributes.normal.array, hs = .5 / s;
      r = Math.min(r, w / 2, h / 2, d / 2); const b = V(w, h, d).divideScalar(2).subScalar(r), q = V(), k = V();
      for (let i = 0; i < p.length; i += 3) { q.fromArray(p, i); k.set(q.x - Math.sign(q.x) * hs, q.y - Math.sign(q.y) * hs, q.z - Math.sign(q.z) * hs).normalize();
        p[i] = b.x * Math.sign(q.x) + k.x * r; p[i + 1] = b.y * Math.sign(q.y) + k.y * r; p[i + 2] = b.z * Math.sign(q.z) + k.z * r; n[i] = k.x; n[i + 1] = k.y; n[i + 2] = k.z; }
      return g; };
    const put = (geo, m, x, y, z, ry = 0, rz = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.set(0, ry, rz); scene.add(o); return o; };
    const rb = (w, h, d, x, y, z, m, r, ry) => put(rgeo(w, h, d, r), m, x, y, z, ry); // x, z: the middle; y: the bottom (things stand on something)
    rb.at = (w, h, d, x, y, z, m, r, ry) => rb(w, h, d, x, y + h / 2, z, m, r, ry);
    const cyl = (r0, r1, h, x, y, z, m, seg = 20) => put(new THREE.CylinderGeometry(r0, r1, h, seg), m, x, y + h / 2, z);
    // the wear map, shared: light in the middle, grime towards each face's edges, scuffs, chips and a few rust spots; materials tint it with their own colour
    const WEAR = canv(256, 256, (g, W) => { const rnd = rngOf(23); g.fillStyle = "#f2f0ec"; g.fillRect(0, 0, W, W);
      for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${rnd() < .5 ? "255,255,255" : "60,52,44"},${.03 + rnd() * .06})`; g.fillRect(rnd() * W, rnd() * W, 2 + rnd() * 10, 1 + rnd() * 6); }
      for (const [x0, y0, x1, y1] of [[0, 0, 0, 1], [0, 0, 1, 0], [W, 0, W - 1, 0], [0, W, 0, W - 1]]) { const gr = g.createLinearGradient(x0, y0, x0 + (x1 - x0) * 34, y0 + (y1 - y0) * 34); gr.addColorStop(0, "rgba(40,34,28,.55)"); gr.addColorStop(1, "rgba(40,34,28,0)"); g.fillStyle = gr; g.fillRect(0, 0, W, W); }
      g.lineCap = "round"; for (let i = 0; i < 40; i++) { const x = rnd() * W, y = rnd() * W, l = 6 + rnd() * 40, a = rnd() * 3; g.strokeStyle = `rgba(${rnd() < .6 ? "70,64,58" : "255,255,250"},${.15 + rnd() * .25})`; g.lineWidth = .6 + rnd() * 1.4; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
      for (let i = 0; i < 26; i++) { const e = rnd() < .7, x = e ? (rnd() < .5 ? rnd() * 14 : W - rnd() * 14) : rnd() * W, y = rnd() * W; g.fillStyle = rnd() < .4 ? "rgba(120,74,40,.55)" : "rgba(70,70,72,.6)"; g.beginPath(); g.ellipse(x, y, 1.5 + rnd() * 5, 1 + rnd() * 3, rnd() * 3, 0, 6.3); g.fill(); } }, true);
    const worn = (c, metal = 0, rough = .65) => new THREE.MeshStandardMaterial({ color: c, map: WEAR, metalness: metal, roughness: rough, envMapIntensity: .3 });
    const kraft = new THREE.MeshStandardMaterial({ roughness: .9, map: canv(128, 128, (g, W) => { const rnd = rngOf(9); g.fillStyle = "#8f6d42"; g.fillRect(0, 0, W, W);
      for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(${rnd() < .5 ? "255,240,210" : "70,50,25"},${.04 + rnd() * .07})`; g.fillRect(rnd() * W, rnd() * W, 1 + rnd() * 4, 1 + rnd() * 4); }
      g.fillStyle = "rgba(205,180,130,.75)"; g.fillRect(W * .42, 0, W * .16, W); g.strokeStyle = "rgba(60,40,20,.35)"; g.lineWidth = 3; g.strokeRect(1.5, 1.5, W - 3, W - 3);
      g.fillStyle = "rgba(30,30,32,.55)"; g.fillRect(W * .12, W * .18, W * .22, 5); g.fillRect(W * .12, W * .26, W * .14, 5); }) }); // cardboard: tape down the middle, a marker scrawl
    const woodTop = new THREE.MeshStandardMaterial({ roughness: .8, map: canv(512, 128, (g, W, H) => { const rnd = rngOf(31); g.fillStyle = "#6a5038"; g.fillRect(0, 0, W, H);
      for (let i = 0; i < 70; i++) { const y = rnd() * H; g.strokeStyle = `rgba(${rnd() < .5 ? "40,28,18" : "150,120,85"},${.15 + rnd() * .2})`; g.lineWidth = .5 + rnd() * 1.5; g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(W * .3, y + (rnd() - .5) * 8, W * .7, y + (rnd() - .5) * 8, W, y + (rnd() - .5) * 6); g.stroke(); }
      for (let i = 0; i < 9; i++) { const x = rnd() * W, y = rnd() * H, r = 6 + rnd() * 22, gd = g.createRadialGradient(x, y, 1, x, y, r); gd.addColorStop(0, `rgba(18,12,8,${.25 + rnd() * .3})`); gd.addColorStop(1, "rgba(18,12,8,0)"); g.fillStyle = gd; g.fillRect(x - r, y - r, 2 * r, 2 * r); } // oil and coffee rings
      for (let i = 0; i < 40; i++) { const x = rnd() * W, y = rnd() * H; g.strokeStyle = "rgba(210,190,160,.3)"; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (rnd() - .5) * 40, y + (rnd() - .5) * 10); g.stroke(); } }) });
    // contact shadows: one soft dark rectangle, laid on the floor under a thing and on the wall behind it
    const SH = canv(128, 128, (g, W) => { const img = g.createImageData(W, W); for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) { const dx = Math.max(0, Math.abs(x - 63.5) - 30) / 34, dy = Math.max(0, Math.abs(y - 63.5) - 30) / 34, d = Math.min(1, Math.hypot(dx, dy));
      img.data[(y * W + x) * 4 + 3] = 255 * (1 - d) * (1 - d); } g.putImageData(img, 0, 0); });
    const shM = new THREE.MeshBasicMaterial({ map: SH, color: 0x000000, transparent: true, opacity: .7, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 }), shW = shM.clone(); shW.opacity = .32;
    const shadow = (w, d, x, z, o = 1) => { const m = put(new THREE.PlaneGeometry(w, d), o === 1 ? shM : Object.assign(shM.clone(), { opacity: .7 * o }), x, G3 + .004, z); m.rotation.x = -Math.PI / 2; };
    const wallShadow = (w, h, x, y) => put(new THREE.PlaneGeometry(w, h), shW, x, y, WZ + .004);
    const steelW = worn(0x9aa0a6, .55, .5), darkSteel = worn(0x3d4146, .6, .45), chrome = new THREE.MeshStandardMaterial({ color: 0xc9ccd0, metalness: .9, roughness: .3 }), rubber = new THREE.MeshStandardMaterial({ color: 0x1c1c1e, roughness: .85 });

    // ---- the door end: the workbench against the back wall, ending 45 cm short of the production (PX0): in the corner on a laptop, nearer the door on a phone, so it is in view there too
    const BX1 = PX0 - .45, BX0 = Math.max(HX0 + .12, BX1 - 2.13), BXC = (BX0 + BX1) / 2, BW = BX1 - BX0, BD_ = .68, BZ = WZ + BD_ / 2 + .02, TOP = G3 + .9;
    shadow(BW + .5, BD_ + .4, BXC, BZ + .02); wallShadow(BW + .3, 1.1, BXC, G3 + .55);
    rb(BW, .07, BD_, BXC, TOP - .035, BZ, woodTop, .01); // the top: thick worn boards
    for (const dx of [-BW / 2 + .06, BW / 2 - .06]) for (const dz of [-BD_ / 2 + .06, BD_ / 2 - .06]) rb.at(.05, .83, .05, BXC + dx, G3, BZ + dz, darkSteel, .006); // the legs: square steel tube
    rb.at(BW - .12, .03, .04, BXC, TOP - .14, BZ + BD_ / 2 - .06, darkSteel, .005); rb.at(BW - .1, .025, BD_ - .1, BXC, G3 + .16, BZ, woodTop, .006); // the rail under the top, the low shelf
    rb.at(.44, .3, .36, BXC - BW / 2 + .32, G3 + .185, BZ - .04, kraft, .01, .06); rb.at(.3, .2, .3, BXC - BW / 2 + .66, G3 + .185, BZ - .02, kraft, .01, -.1); // boxes on the low shelf
    cyl(.09, .09, .13, BXC + BW / 2 - .32, G3 + .185, BZ - .02, worn(0x7d8a6a, .4, .5)); cyl(.093, .093, .012, BXC + BW / 2 - .32, G3 + .315, BZ - .02, steelW); // a paint tin and its lid
    { const vx = BXC + BW / 2 - .22, vz = BZ + BD_ / 2 - .1, vm = worn(0x2f4f6f, .45, .5); // a vice on the front corner
      rb.at(.14, .05, .2, vx, TOP, vz - .02, vm, .01); rb.at(.12, .12, .07, vx, TOP + .05, vz - .08, vm, .012); rb.at(.12, .12, .07, vx, TOP + .05, vz + .02, vm, .012);
      rb.at(.12, .03, .012, vx, TOP + .14, vz - .04, darkSteel, .003); rb.at(.12, .03, .012, vx, TOP + .14, vz - .02, darkSteel, .003);
      const sc = put(new THREE.CylinderGeometry(.011, .011, .3, 10), chrome, vx, TOP + .1, vz + .12); sc.rotation.x = Math.PI / 2; }
    { const cm = worn(0xa3291f, .4, .45), x = BXC - .2, z = BZ - .08; rb.at(.5, .2, .24, x, TOP, z, cm, .015, .05); // a red tool case, its lid line and handle
      rb.at(.505, .012, .245, x, TOP + .15, z, darkSteel, .003, .05); rb.at(.2, .025, .03, x, TOP + .2, z, rubber, .01, .05); }
    for (const [dx, c] of [[.18, 0x23252a], [.27, 0xd8d4c8]]) { const x = BXC + dx, z = BZ + .12, can = worn(c, .5, .4); // two spray cans: a graffiti writer's garage
      cyl(.033, .033, .19, x, TOP, z, can, 18); cyl(.033, .02, .03, x, TOP + .19, z, can, 18); cyl(.022, .022, .04, x, TOP + .215, z, mat(c === 0x23252a ? 0xc8402a : 0x2f6fb3), 14); }
    { const x = BXC - BW / 2 + .3, z = BZ + .15, mug = new THREE.MeshStandardMaterial({ color: 0xe9e4d8, map: WEAR, roughness: .4 }); cyl(.042, .038, .1, x, TOP, z, mug, 20); // a mug
      put(new THREE.TorusGeometry(.028, .007, 8, 16, Math.PI), mug, x + .042, TOP + .05, z, 0, -Math.PI / 2);put(new THREE.CircleGeometry(.036, 20), mat(0x2a170c), x, TOP + .085, z).rotation.x = -Math.PI / 2; }
    { const rag = put(new THREE.PlaneGeometry(.26, .2, 6, 4), new THREE.MeshStandardMaterial({ color: 0x8c3a2c, map: WEAR, roughness: 1, side: THREE.DoubleSide }), BXC + .55, TOP + .006, BZ + .2); rag.rotation.set(-Math.PI / 2, 0, .4); // an oily rag, crumpled
      const p = rag.geometry.attributes.position, rnd = rngOf(4); for (let i = 0; i < p.count; i++) p.setZ(i, rnd() * .012); rag.geometry.computeVertexNormals(); }
    // the pegboard over it: brown hardboard on battens, a marker outline round each tool's place, and real tools hanging off pegs
    const PB = { x: BXC, y0: TOP + .16, w: BW - .1, h: 1.08 }, PZ = WZ + .035, py = PB.y0 + PB.h / 2;
    wallShadow(PB.w + .22, PB.h + .2, PB.x, py); for (const y of [PB.y0 + .08, PB.y0 + PB.h - .08]) rb(PB.w, .05, .03, PB.x, y, WZ + .015, woodTop, .005);
    const TOOLS = [ // x, y on the board (m from its left, bottom), kind
      [.16, .7, "hammer"], [.36, .74, "saw"], [.74, .8, "wr", .24], [.84, .8, "wr", .2], [.93, .8, "wr", .16], [.74, .38, "sd", 0xc8402a], [.81, .38, "sd", 0xd8a21a], [.88, .38, "sd", 0x26272a],
      [1.12, .66, "pliers"], [1.36, .7, "cable"], [1.12, .3, "tape"], [1.62, .74, "square"], [.38, .12, "level"]].filter(t => t[0] < PB.w - .12);
    const PXM = 220, peg = canv(Math.round(PB.w * PXM), Math.round(PB.h * PXM), (g, W, H) => { const rnd = rngOf(3); g.fillStyle = "#7d6146"; g.fillRect(0, 0, W, H);
      for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(${rnd() < .5 ? "255,235,200" : "40,26,14"},${.04 + rnd() * .06})`; g.fillRect(rnd() * W, rnd() * H, 4 + rnd() * 30, 2 + rnd() * 8); }
      for (let y = 11; y < H; y += 22) for (let x = 11; x < W; x += 22) { g.fillStyle = "rgba(22,14,8,.85)"; g.beginPath(); g.arc(x, y, 2.6, 0, 6.3); g.fill(); }
      g.strokeStyle = "rgba(235,235,225,.55)"; g.lineWidth = 2; g.lineJoin = "round"; for (const [tx, ty, k, a] of TOOLS) { const x = tx * PXM, y = H - ty * PXM, s = k === "wr" ? a * PXM : 0; // the outlines, a little bigger than the tool
        g.beginPath(); if (k === "hammer") { g.rect(x - 24, y - 6, 48, 22); g.rect(x - 6, y + 14, 12, 66); } else if (k === "saw") { g.moveTo(x - 10, y + 10); g.lineTo(x + 34, y + 10); g.lineTo(x + 26, y + 110); g.lineTo(x - 2, y + 110); g.closePath(); }
        else if (k === "wr") { g.rect(x - 7, y, 14, s + 4); } else if (k === "sd") { g.rect(x - 7, y - 4, 14, 52); } else if (k === "cable") { g.arc(x, y + 30, 32, 0, 6.3); } else if (k === "square") { g.moveTo(x - 4, y - 4); g.lineTo(x + 4, y - 4); g.lineTo(x + 4, y + 70); g.lineTo(x + 44, y + 70); g.lineTo(x + 44, y + 78); g.lineTo(x - 4, y + 78); g.closePath(); }
        else if (k === "level") { g.rect(x - 40, y - 8, 80, 16); } else g.rect(x - 14, y - 4, 28, 40); g.stroke();
        g.save(); g.filter = "blur(6px)"; g.fillStyle = "rgba(0,0,0,.35)"; g.fillRect(x - 10 + 6, y + 4, 20, k === "saw" ? 100 : k === "level" ? 10 : 50); g.restore(); } // the soft shadow each tool throws on the board
      const gr = g.createLinearGradient(0, H - 40, 0, H); gr.addColorStop(0, "rgba(30,20,10,0)"); gr.addColorStop(1, "rgba(30,20,10,.35)"); g.fillStyle = gr; g.fillRect(0, 0, W, H); });
    put(new THREE.PlaneGeometry(PB.w, PB.h), new THREE.MeshStandardMaterial({ map: peg, roughness: .85 }), PB.x, py, PZ);
    const handleW = worn(0x8a5a32, 0, .6), TZ = PZ + .03, bx = PB.x - PB.w / 2;
    for (const [tx, ty, k, a] of TOOLS) { const x = bx + tx, y = PB.y0 + ty; // y: the hook's height on the board
      cyl(.004, .004, .05, x, y + .01, PZ + .02, chrome, 6).rotation.x = Math.PI / 2 - .3; // the peg
      if (k === "hammer") { cyl(.013, .016, .3, x, y - .34, TZ, handleW, 12); rb(.11, .028, .032, x, y - .02, TZ, darkSteel, .006); }
      else if (k === "saw") { const s = new THREE.Shape(); s.moveTo(-.01, 0); s.lineTo(.03, 0); s.lineTo(.022, -.45); s.lineTo(-.008, -.45); s.closePath(); put(new THREE.ExtrudeGeometry(s, { depth: .003, bevelEnabled: false }), chrome, x, y - .02, TZ - .01);
        rb(.06, .1, .025, x + .01, y + .02, TZ, handleW, .01); }
      else if (k === "wr") { rb(.018, a, .006, x, y - a / 2 - .01, TZ, chrome, .003); for (const e of [0, 1]) put(new THREE.TorusGeometry(.016 + a * .03, .006, 6, 14), chrome, x, y - .01 - e * a, TZ); }
      else if (k === "sd") { cyl(.012, .014, .1, x, y - .1, TZ, mat(a), 10); cyl(.003, .003, .12, x, y - .22, TZ, chrome, 6); }
      else if (k === "pliers") { const pm = worn(0xb8341f, 0, .5); for (const s of [-1, 1]) { const arm = rb(.016, .16, .01, x + s * .012, y - .12, TZ, pm, .005); arm.rotation.z = s * .1; } rb(.03, .05, .012, x, y - .02, TZ, chrome, .004); }
      else if (k === "cable") { const c = put(new THREE.TorusGeometry(.13, .02, 8, 28), worn(0xd2602a, 0, .6), x, y - .13, TZ + .01); c.scale.set(1, 1.05, .6); }
      else if (k === "tape") { rb(.075, .075, .04, x, y - .05, TZ, worn(0xd8a21a, .2, .45), .015); }
      else if (k === "square") { rb(.018, .3, .006, x, y - .15, TZ, chrome, .002); rb(.2, .03, .012, x + .09, y - .29, TZ, handleW, .003); }
      else if (k === "level") { rb(.6, .05, .03, x, y, TZ, worn(0xd8a21a, .3, .45), .006); rb(.06, .02, .032, x, y, TZ, mat(0x6fbf6a), .004); } }
    { const ex = HX0 + .01, ez = WZ + 1.5, em = worn(0xb32016, .3, .35); // a fire extinguisher on the side wall by the bench, on its bracket
      rb.at(.03, .12, .1, ex + .015, G3 + 1.05, ez, darkSteel, .005); cyl(.075, .075, .44, ex + .1, G3 + .62, ez, em, 22); put(new THREE.SphereGeometry(.075, 22, 10, 0, 6.3, 0, Math.PI / 2), em, ex + .1, G3 + 1.06, ez);
      cyl(.02, .02, .07, ex + .1, G3 + 1.1, ez, darkSteel, 10); rb.at(.1, .02, .03, ex + .12, G3 + 1.17, ez, darkSteel, .006); const ho = put(new THREE.TorusGeometry(.1, .01, 6, 16, 3.6), rubber, ex + .17, G3 + .98, ez); ho.rotation.y = Math.PI / 2;
      shadow(.3, .3, ex + .1, ez, .6); }

    // ---- the far end: 90 cm past the production's end (on a phone too, where the production is shorter), a steel shelf, a stack of tyres and the tool chest by the back door
    const SX0 = PX0 + 5300 * PK + .9, SW = 2, SD = .5, SXC = SX0 + SW / 2, SZ = WZ + SD / 2 + .03, LV = [.12, .72, 1.32, 1.92], SH_ = 2.05;
    shadow(SW + .4, SD + .4, SXC, SZ); wallShadow(SW + .25, SH_ + .1, SXC, G3 + SH_ / 2);
    for (const dx of [-SW / 2, SW / 2]) for (const dz of [-SD / 2, SD / 2]) { rb.at(.045, SH_, .012, SXC + dx, G3, SZ + dz, steelW, .002); rb.at(.012, SH_, .045, SXC + dx, G3, SZ + dz, steelW, .002); } // angle posts
    const board = worn(0xb79a72, 0, .85); for (const y of LV) { for (const dz of [-SD / 2, SD / 2]) rb.at(SW, .05, .03, SXC, G3 + y - .05, SZ + dz, worn(0x3e6fa6, .4, .5), .004); rb.at(SW - .03, .018, SD, SXC, G3 + y, SZ, board, .003); }
    const on = (i, x, w, h, d, m, ry = 0, r = .012) => rb.at(w, h, d, SX0 + x, G3 + LV[i] + .018, SZ + (SD - d) / 2 - .04, m, r, ry);
    { const jc = (i, x, c) => { const m = worn(c, .3, .5); const b = on(i, x, .17, .36, .32, m, 0, .03); const y = G3 + LV[i] + .018 + .36; // jerry cans: the body, its three handles on top, the spout cap
        for (const dz of [-.08, 0, .08]) rb.at(.03, .05, .03, b.position.x, y, b.position.z + dz, m, .01); cyl(.025, .025, .04, b.position.x, y, b.position.z + .13, darkSteel, 10); };
      jc(0, .28, 0x9e2b1c); jc(0, .52, 0x3f5f2f); }
    on(0, 1.05, .34, .17, .34, rubber, .1, .02); // a car battery on the floor shelf
    on(0, 1.55, .5, .38, .4, kraft, -.04); on(1, .35, .55, .36, .42, kraft, .03); on(1, .35, .42, .14, .34, kraft, -.08).position.y += .36; on(1, 1.0, .46, .28, .42, worn(0x56606b, 0, .7), 0, .02);
    for (const [x, c] of [[1.45, 0x7d8a6a], [1.62, 0xd8d4c8], [1.79, 0x2f4f6f]]) { cyl(.085, .085, .19, SX0 + x, G3 + LV[1] + .018, SZ, worn(c, .45, .45)); cyl(.088, .088, .012, SX0 + x, G3 + LV[1] + .208, SZ, steelW); } // paint tins with lids
    on(2, .4, .6, .3, .4, worn(0x2c5d8f, 0, .6), 0, .025); on(2, 1.15, .5, .4, .42, kraft, .05);
    { const hose = put(new THREE.TorusGeometry(.19, .024, 8, 28), worn(0x2e6a3a, 0, .55), SX0 + 1.65, G3 + LV[2] + .042, SZ); hose.rotation.x = Math.PI / 2; const h2 = hose.clone(); h2.position.y += .045; h2.rotation.z = .5; h2.scale.setScalar(.92); scene.add(h2); } // a garden hose, coiled flat
    on(3, .3, .4, .26, .38, kraft, -.05); on(3, .85, .36, .2, .34, kraft, .1); on(3, 1.45, .55, .32, .42, worn(0x56606b, 0, .7), 0, .02);
    // a stack of worn tyres on the floor beside it, each a little off the one under it
    { const tx = SX0 + SW + .45, tz = WZ + .5, tm = new THREE.MeshStandardMaterial({ color: 0x18181a, map: WEAR, roughness: .9 }), rim = worn(0x7e8389, .7, .4); shadow(.95, .95, tx, tz, 1);
      [[0, 0, 0], [.03, -.02, .4], [-.02, .03, .9], [.02, .01, 1.3]].forEach(([dx, dz, r], i) => { const y = G3 + .1 + i * .2; const t = put(new THREE.TorusGeometry(.26, .1, 12, 30), tm, tx + dx, y, tz + dz); t.rotation.set(Math.PI / 2, 0, r); t.scale.set(1, 1, .95);
        if (i === 3) { const w = put(new THREE.CylinderGeometry(.19, .19, .16, 24, 1, true), rim, tx + dx, y, tz + dz); w.material.side = THREE.DoubleSide; } }); }
    // the tool chest on castors, in the far corner: a roll cabinet with a top chest on it, drawers with steel pulls
    { const cx = SX0 + SW + 1.3, cz = WZ + .32, CW = .74, CD = .48, red = worn(0xa3291f, .45, .42); shadow(CW + .35, CD + .35, cx, cz); wallShadow(CW + .25, 1.5, cx, G3 + .7);
      for (const dx of [-CW / 2 + .07, CW / 2 - .07]) for (const dz of [-CD / 2 + .07, CD / 2 - .07]) { rb.at(.06, .03, .06, cx + dx, G3 + .1, cz + dz, darkSteel, .005); const w = put(new THREE.CylinderGeometry(.045, .045, .035, 16), rubber, cx + dx, G3 + .045, cz + dz); w.rotation.x = Math.PI / 2; }
      const y0 = G3 + .13; rb.at(CW, .78, CD, cx, y0, cz, red, .02); rb.at(CW - .02, .3, CD - .04, cx, y0 + .8, cz - .01, red, .03); rb.at(CW, .018, CD + .005, cx, y0 + .78, cz, darkSteel, .004);
      const rows = [[.06, .1], [.18, .1], [.3, .1], [.42, .14], [.58, .18]]; for (const [y, h] of rows) { rb.at(CW - .06, h - .014, .012, cx, y0 + y, cz + CD / 2, red, .006); rb.at(CW * .55, .014, .02, cx, y0 + y + h - .04, cz + CD / 2 + .012, chrome, .006); }
      for (const [y, h] of [[.84, .08], [.95, .06]]) { rb.at(CW - .08, h - .012, .012, cx, y0 + y, cz + CD / 2 - .02, red, .006); rb.at(CW * .45, .012, .018, cx, y0 + y + h - .035, cz + CD / 2 - .01, chrome, .005); }
      for (const s of [-1, 1]) { const hd = put(new THREE.CylinderGeometry(.012, .012, .3, 10), chrome, cx + s * (CW / 2 + .05), y0 + .62, cz); hd.rotation.x = Math.PI / 2; rb.at(.05, .03, .02, cx + s * (CW / 2 + .025), y0 + .6, cz - .13, chrome, .005); rb.at(.05, .03, .02, cx + s * (CW / 2 + .025), y0 + .6, cz + .13, chrome, .005); }
      rb.at(.2, .1, .13, cx - .14, y0 + 1.1, cz, worn(0x26272a, .2, .5), .02); cyl(.04, .04, .14, cx + .2, y0 + 1.1, cz + .05, worn(0x2f6fb3, .3, .45), 16); } // on top: a socket case and a can of oil
    lateT.forEach(t => LATE.up(() => renderer.initTexture(t))); LATE.got(); });
  for (const [a, b] of DOORS) box(b - a, .02, .16, (a + b) / 2, G3 + .01, 0, steelM); // a flat steel threshold in each doorway
  // the back door out (Tom 11-26): a work lamp in a cage over it, outside, and a lit step
  { const xc = (DOOR_B[0] + DOOR_B[1]) / 2, arm = new THREE.Mesh(new THREE.CylinderGeometry(.025, .025, .6, 8), metalM); arm.rotation.x = Math.PI / 2; arm.position.set(xc, G3 + DOOR_H + 1.15, .3); scene.add(arm);
    const cage = new THREE.Mesh(new THREE.CylinderGeometry(.1, .17, .3, 14, 1, true), lampShade), bulb = new THREE.Mesh(new THREE.SphereGeometry(.09, 12, 8), shopBulb); cage.position.set(xc, G3 + DOOR_H + 1.02, .62); bulb.position.set(xc, G3 + DOOR_H + .98, .62); const stem = new THREE.Mesh(new THREE.CylinderGeometry(.02, .02, .2, 6), metalM); stem.position.set(xc, G3 + DOOR_H + 1.12, .62); const hood = new THREE.Mesh(new THREE.CylinderGeometry(.06, .2, .1, 14), metalM); hood.position.set(xc, G3 + DOOR_H + 1.2, .62); scene.add(cage, bulb, stem, hood); }
  // the lights that go with the camera: a warm spot on the wall it faces, a warm fill from the room's middle, and the light that spills out of the door onto the wet street
  const exitL = new THREE.PointLight(0xffd9a0, 0, 15, 1.4); scene.add(exitL); exitL.position.set((DOOR_B[0] + DOOR_B[1]) / 2, G3 + DOOR_H + .9, 1.1); // the work lamp over the back door
  const shopSpot = new THREE.SpotLight(SHOP_WARM, 0, 15, 1, 1, 1.3), shopFill = new THREE.PointLight(0xf1f2ff, 0, 13, 1.6), spill = new THREE.SpotLight(0xffd29a, 0, 14, .7, .85, 1.1); scene.add(shopSpot, shopSpot.target, shopFill, spill, spill.target);
  function shopAt(now, sv, cp) { // the door's roll, the lamps, where the light stands
    const tIn = sm(cl((sv - 578) / 50)); shop.open = tIn; shop.lit = tIn * (1 - sm(cl((sv - 940) / 50))); // (cause D) the door rolls up as the camera comes to it, open before it goes through (sv ~645)
    shop.panel.position.y = G3 + DOOR_H / 2 + tIn * (DOOR_H + .05); shop.panel.visible = tIn < .999;
    const inX = sm(cl((cp.x - HX0 + .2) / 1.4)) * (1 - sm(cl((cp.x - CX1 + 1.2) / 1.6))), inZ = sm(cl((.9 - cp.z) / 1.6)); shop.ins = inX * inZ;
    shopBulb.emissiveIntensity = 2.2 * shop.lit; tubeM.emissiveIntensity = 2.4 * shop.lit; tubeBad.emissiveIntensity = (Math.sin(now / 37) > .55 && Math.random() < .5 ? .15 : 2.4) * shop.lit;
    const cx = cl(cp.x, HX0 + 1.5, CX1 - 1.5);
    shopSpot.intensity = 2.2 * shop.lit; shopSpot.position.set(cx, CEIL - .3, WZ + 1.7); shopSpot.target.position.set(cx, G3 + 1.7, WZ);
    shopFill.intensity = 1.0 * shop.lit; shopFill.position.set(cx, G3 + 3.2, WZ + 6.3);
    const sx = sm(cl((cp.x - 50) / 8)), dx = DOOR_A[0] + (DOOR_A[1] - DOOR_A[0]) / 2, ex = DOOR_B[0] + (DOOR_B[1] - DOOR_B[0]) / 2; // the light out of the door follows you to the far one
    // (Tom 11-26, cause D) it shines from the door's own lintel out onto the street: from deep in the room it lit the floor inside the door white, a pool that filled the screen on the way in
    spill.position.set(dx + (ex - dx) * sx, G3 + DOOR_H - .15, -.35); spill.target.position.set(dx + (ex - dx) * sx + .4, G3, 6);
    spill.intensity = 9 * shop.lit * (1 - .6 * shop.ins); exitL.intensity = 15 * shop.lit * sm(cl((sv - 820) / 40));
}
  window.garageTest = () => ({ open: +shop.open.toFixed(3), lit: +shop.lit.toFixed(3), inside: +shop.ins.toFixed(3), cam: [+camera.position.x.toFixed(2), +camera.position.y.toFixed(2), +camera.position.z.toFixed(2)],
    eye: +(camera.position.y - G3).toFixed(2), pitch: +THREE.MathUtils.radToDeg(Math.asin(camera.getWorldDirection(V()).y)).toFixed(1), // the camera's height over the floor and how far it looks up (+) or down (-), in degrees
    // for the garage check: the door, the light, where the camera is
    paintings: U4.slice(0, 3).map(u => ({ name: u.name, x: u.x, shown: u.B.m.visible && u.B.m.material.opacity > .99, wall: u.zw, bump: !!u.B.m.material.normalMap })) }); // bump: the street concrete's joints drawn on it
  // the last wall past the climb out, lower, so the sky shows over it; the coping on top
  const XW0 = CX1 - .3, XW1 = END_X, XWT = G3 + WH;
  WALL_ADD(XW0, XW1, G3 - .6, XWT, SEAM_D); // R3: full height now, its concrete the bare stretch's by the visitors' wall, moved by SEAM_D
  // the sky over the last wall, the city's roofs against it; by day it is the day sky (the clock), so it never shows as a dark block over a wall
  const skyU = { uDay: { value: 0 }, uBg: { value: new THREE.Color() }, uVeil: { value: 0 } }; // uVeil: black until the start's paint shows the wall
  const skyMesh = new THREE.Mesh(new THREE.PlaneGeometry(220, 110), new THREE.ShaderMaterial({ uniforms: skyU, depthWrite: false, fog: false,
    vertexShader: "varying vec3 vP; void main(){ vP = (modelMatrix * vec4(position, 1.)).xyz; gl_Position = projectionMatrix * viewMatrix * vec4(vP, 1.); }",
    fragmentShader: `varying vec3 vP; uniform float uDay, uVeil; uniform vec3 uBg;
      void main(){ float h = clamp((vP.y - ${(G3 + 1).toFixed(2)}) / 36., 0., 1.);
        vec3 night = mix(vec3(.012, .015, .026), vec3(.003, .004, .009), h);
        gl_FragColor = vec4(mix(night, uBg, uDay) * uVeil, 1.); }` }));
  skyMesh.position.set(103, G3 + 30, -80); scene.add(skyMesh);
  // the city against the sky: a hazy far row and a dark near row of roofs, a few windows still lit
  const roofs = (col, hMin, hMax, lit) => { const c = document.createElement("canvas"); c.width = 2048; c.height = 410; const g = c.getContext("2d"); let x = 0;
    while (x < c.width) { const w = 14 + Math.random() * 62, h = hMin + Math.pow(Math.random(), 1.6) * (hMax - hMin), y = c.height - h; g.fillStyle = col; g.fillRect(x, y, w, h);
      if (Math.random() < .35) { const sw = w * (.3 + Math.random() * .4); g.fillRect(x + (w - sw) / 2, y - 8 - Math.random() * 18, sw, 30); } // a stepped top
      if (Math.random() < .18) g.fillRect(x + w * (.2 + Math.random() * .6), y - 30 - Math.random() * 30, 1.5, 60); // a mast
      for (let wy = y + 6; wy < c.height - 5; wy += 7) for (let wx = x + 3; wx < x + w - 4; wx += 5) if (Math.random() < lit) { g.fillStyle = Math.random() < .8 ? "#ffcf8a" : "#cfe2ff"; g.fillRect(wx, wy, 2, 3); g.fillStyle = col; }
      x += w + (Math.random() < .25 ? Math.random() * 20 : 0); }
    const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = maxAniso; return t; };
  const cityFar = new THREE.Mesh(new THREE.PlaneGeometry(170, 34), new THREE.MeshBasicMaterial({ map: roofs("#3a3044", 60, 230, .01), transparent: true, depthWrite: false, fog: false }));
  cityFar.position.set(103, G3 - 2 + 17, -70); scene.add(cityFar);
  const city = new THREE.Mesh(new THREE.PlaneGeometry(130, 26), new THREE.MeshBasicMaterial({ map: roofs("#0a0c11", 40, 300, .035), transparent: true, depthWrite: false, fog: false }));
  city.position.set(103, G3 - 2 + 13, -40); scene.add(city); city.visible = cityFar.visible = false; // R3: the wall past EDGE is full height, no roofs over it
  const washL = new THREE.SpotLight(0xfff0dc, 0, 22, .95, 1, 1.2); washL.position.set(80, G3 + 7, 9); washL.target.position.set(80.5, G3 + 1.6, 0); scene.add(washL, washL.target); // takes the old sunrise light's place: no light more than before
  cityFar.material.color.setScalar(.6); const FOG0 = scene.fog.color.clone(), SKY0 = sky.color.clone();
  // EDGE (Tom 11-16, storyboard 6): client work stands apart from my own. Up out of the workshop, in the open: a clean plastered wall, a lamp over it,
  // and one blockbuster painting on it (Tom 11-19; it replaced the printed sheet), "EDGE". Its two links are marks of its own story (Tom 11-19): two banners sprayed under
  // the letters in the piece's blue, their own picture over the painting. Spray, no pen tag.
  const EDGE_X = 75, EDGE_H = 4;
  // Tom 11-24: no lamp fixture over EDGE (a lamp on a bare wall made no sense); its light stays, from the street
  const edgeL = new THREE.SpotLight(0xffd9aa, 0, 14, 1.2, 1, 1.2); edgeL.position.set(EDGE_X, G3 + EDGE_H - .2, 1.15); edgeL.target.position.set(EDGE_X, G3 + 1.7, 0); scene.add(edgeL, edgeL.target);
  // the building site's plywood fence (Tom 11-26, simple): out of the back door, EDGE is painted on a lit plywood hoarding with orange site lamps; the site itself is the next round
  const siteM = new THREE.MeshStandardMaterial({ color: 0x201508, emissive: 0xffa040, emissiveIntensity: 0 });
  { const sheet = (() => { const c = document.createElement("canvas"); c.width = 512; c.height = 256; const g = c.getContext("2d"), rnd = rngOf(9); g.fillStyle = "#94704a"; g.fillRect(0, 0, 512, 256);
      for (let i = 0; i < 160; i++) { g.strokeStyle = `rgba(${rnd() < .5 ? "90,56,24" : "230,190,130"},${.04 + rnd() * .08})`; g.lineWidth = 1 + rnd() * 2; g.beginPath(); const y = rnd() * 256; g.moveTo(0, y); g.bezierCurveTo(150, y + (rnd() - .5) * 14, 350, y + (rnd() - .5) * 14, 512, y + (rnd() - .5) * 10); g.stroke(); }
      for (let i = 0; i < 6; i++) { g.fillStyle = "rgba(60,36,14,.3)"; g.beginPath(); g.ellipse(rnd() * 512, rnd() * 256, 10 + rnd() * 30, 6 + rnd() * 14, rnd() * 3, 0, 6.3); g.fill(); }
      g.strokeStyle = "rgba(40,24,8,.8)"; g.lineWidth = 3; g.strokeRect(1, 1, 510, 254); for (const [x, y] of [[14, 14], [498, 14], [14, 242], [498, 242], [256, 14], [256, 242]]) { g.fillStyle = "rgba(40,30,20,.8)"; g.beginPath(); g.arc(x, y, 3, 0, 6.3); g.fill(); }
      const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.encoding = THREE.sRGBEncoding; t.anisotropy = maxAniso; t.repeat.set(7, 1.5); return t; })();
    const FX0 = 68.4, FX1 = 86.4, FH = 3.6, fence = new THREE.Mesh(new THREE.PlaneGeometry(FX1 - FX0, FH), new THREE.MeshStandardMaterial({ map: sheet, roughness: .85, polygonOffset: true, polygonOffsetFactor: -1 })); fence.position.set((FX0 + FX1) / 2, G3 + FH / 2, .0012); scene.add(fence);
    const postM = new THREE.MeshStandardMaterial({ color: 0x5b4330, roughness: .8 }); for (const x of [68.4, 70.9, 79.2, 81.8, 84.4, 86.4]) { const po = new THREE.Mesh(new THREE.BoxGeometry(.12, FH + .1, .12), postM); po.position.set(x, G3 + FH / 2, .09); scene.add(po); }
    const rail = new THREE.Mesh(new THREE.BoxGeometry(FX1 - FX0, .1, .1), postM); rail.position.set((FX0 + FX1) / 2, G3 + FH + .05, .09); scene.add(rail);
    for (const x of [71.2, 79.6]) { const pole = new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, FH + .8, 8), metalM), head = new THREE.Mesh(new THREE.BoxGeometry(.5, .16, .22), siteM); pole.position.set(x, G3 + (FH + .8) / 2, .5); head.position.set(x, G3 + FH + .8, .6); head.rotation.x = .3; scene.add(pole, head); } }
  const GHUB = "https://github.com/tlxq/";
  // where each one stands (laptop / phone): four tools in the workshop, then EDGE. key: the scroll (vh) where the camera has arrived,
  // leave: where it starts to go on. The camera stops in front of each. Each has its painting (Tom 11-19, one artist per wall): art = [file, picture m wide on a
  // laptop, on a phone, the picture pixel that stands at the stop, its height over the floor, the painted areas (picture pixels: left, top, right, bottom)];
  // the link marks are picture pixels too.
  const N_ = NARROW;
  const EDGE_V = { ov: "assets/edge_banner.webp", marks: [[481, 739, 1059, 821], [411, 825, 1129, 907]], areas: [[411, 739, 1129, 907]] }; // the two banners (the links): the picture over the painting, the two tap areas and the painted area, in picture pixels (left, top, right, bottom)
  const tool = (x, key, name, link, plate, more) => Object.assign({ x, key, leave: key + 25, floor: WF, zw: WZ, name, links: link ? [{ t: "Code for " + link, href: GHUB + link }] : [], plate }, more);
  // the Toolbox production (Tom 11-26, A5): ONE see-through strip, 5300 x 960 px, painted on the desk's graphics card, cut into four webp tiles (the left end, then a tile for each piece).
  // The stack words are painted into it as small tags; the live numbers are sprayed in the bare wall above each piece. PK metres a pixel, PC where each piece's middle stands.
  // positions from toolbox-final.json (strip pixels): the camera stop of each piece, its painted box, link mark, the bare areas for the live numbers (11-26: 150 px tall, one each side of the letters' middle, as low as the paint under them lets them, 24 px clear of it, so they stay in a short laptop window) and the painted words (the tags: no label may cover them). No painted title (Tom 11-26: the stripe says Toolbox)
  // the tiles are cut at strip x 1130, 2450 and 3750 and overlap 48 px each way (they share the paint there, so no seam; a tile alone ends in overspray); each is laid at its own pixel size
  const STRIP_S = [0, 1082, 2402, 3702], TILE_TW = [1178, 1416, 1396, 1598], STOP = [[1767, 505], [3144, 620], [4398, 615]],
    prod = (n, key, link, plate, mark, painted, nums, text) => { const s0 = STRIP_S[n], sh = r => [r[0] - s0, r[1], r[2] - s0, r[3]]; return tool(PC[n - 1], key, ["", "ttoolbox", "dot", "tthermal"][n], link, plate,
      { tile: n, px: [TILE_TW[n], 960], nums: nums.map(sh), text: text.map(sh), art: [`assets/toolbox_${n}.webp`, TILE_TW[n] * .00385, TILE_TW[n] * .0022, [STOP[n - 1][0] - s0, STOP[n - 1][1]], 2.1 - (STOP[n - 1][1] - 480) * PK, [sh(painted)]], marks: [sh(mark)] }); };
  const U4 = [
    prod(1, 700, "ttoolbox", "<b>ttoolbox</b>Claude Code plugin with skills and agents to plan, build, review and prove work.", [1187, 315, 2347, 762], [1130, 323, 2470, 885], [[1120, 81, 1600, 231], [2107, 55, 2587, 205]], [[1341, 770, 1739, 860], [1879, 790, 2121, 880]]),
    prod(2, 770, "dot", "<b>dot</b>Keeps one GNU Stow dotfiles repo the same on every Linux PC.", [2547, 335, 3740, 790], [2430, 323, 3770, 885], [[2622, 92, 3102, 242], [3183, 45, 3663, 195]], [[2594, 775, 2746, 865], [2836, 795, 3025, 885], [3111, 775, 3439, 865], [3520, 799, 3715, 881]]),
    prod(3, 840, "tthermal", "<b>tthermal</b>Omarchy bar plugin that keeps an Intel laptop under a temperature you choose.", [3714, 333, 5083, 761], [3730, 323, 5070, 877], [[3875, 65, 4355, 215], [4438, 67, 4918, 217]], [[3938, 770, 4112, 860], [4340, 794, 4520, 877], [4656, 770, 4814, 860]]),
    { x: 75, key: 990, leave: 1045, floor: G3, name: "app-utveckling.se", links: [{ t: "app-utveckling.se", href: "https://app-utveckling.se" }, { t: "mjukvaruutvecklare.com", href: "https://mjukvaruutvecklare.com" }],
      art: ["assets/edge_wall.webp", 6.6, 3.5, [714, 518], 1.9, [[20, 200, 1409, 745], ...EDGE_V.areas]], ov: EDGE_V.ov, marks: EDGE_V.marks,
      plate: "<b>app-utveckling.se</b>Two landing pages for EDGE Associates, on one code base. Work project, built alone." } ];
  U4.forEach((u, i) => { const [file, wL, wP, c, y, areas, z = .002] = u.art; if (u.tile === 1) { u.X = paintOn("assets/toolbox_0.webp", TILE_TW[0] * PK, [0, 480], [PX0, G3 + 2.1], z, [TILE_TW[0], 960], WZ); u.X.m.visible = false; u.X.m.material.opacity = 0; } u.zw = u.zw || 0; u.B = paintOn(file, N_ ? wP : wL, c, [u.x, u.floor + (N_ && u.yP || y)], z, u.px, u.zw); if (u.ov) { u.O = paintOn(u.ov, N_ ? wP : wL, c, [u.x, u.floor + (N_ && u.yP || y)], z + .001, undefined, u.zw); u.O.m.renderOrder = 2; } areas.forEach((a, j) => u.B.protect(u.name + "'s painting" + (j ? " " + (j + 1) : ""), a));
    u.bb = [0, 1, 2, 3].map(n => Math[n < 2 ? "min" : "max"](...areas.map(a => a[n]))); u.start = 0; // the painted area as one box
    u.links.forEach((l, j) => l.box = u.marks[j]);
    { const [key, colour, stack0] = { ttoolbox: ["ttoolbox", "#c8402a", ["Claude Code", "Python", "Bash"]],
        dot: ["dot", "#25407a", ["Bash", "bats", "GNU Stow", "mise"]], tthermal: ["tthermal", "#d8435f", ["JavaScript", "QML", "Shell"]], "app-utveckling.se": ["edge", "#1f5fc4", ["Astro", "TypeScript"]] }[u.name];
      const stack = u.painted || u.tile ? [] : stack0, yb = u.B.at(0, u.bb[3]).y; // painted: the picture has its stack written in // beside the painting on a laptop; under it, above the floor, on a phone
      if (u.tile) { // (Tom 11-26) the production: the live numbers sprayed in the bare wall above the piece, clear of its clouds and words (the stack words are painted into the strip),
        // in painted digits and words (assets/epa_glyphs.webp, the tag hand epaRadar's numbers use), outlined and shadowed like the production's own tags
        const GW = { commits: [["commits"]], tests: [["tests"]], skills: [["skills"]], "merged pull requests": [["merged"], ["pull requests"]] };
        u.parts = (LIVE[key] || []).map((s, i) => makeSpray({ key, only: i, name: u.name + "'s number " + (i + 1), colour: "#f3ead8", piece: colour, glyphs: { words: GW[s.word[1]] }, stack: [], zw: u.zw, z: .004,
          rect: ((p, q, p1, q1) => [u.B.at(p, 0).x, u.B.at(0, q1).y, u.B.at(p1, 0).x, u.B.at(0, q).y])(...u.nums[i]) })); }
      else if (N_) { // (Tom 11-19) phone: under the painting, above the floor: the numbers big in the piece's style, then each tool its own tag, staggered
        const z = (u.art[6] || 0) + .004, zw = u.zw, top = yb - .04, bot = u.floor + .06, hg = top - bot, nums = (LIVE[key] || []).length, nh = nums ? hg * .58 : 0, long = (LIVE[key] || []).some(s => s.word[1].length > 12);
        const per = Math.ceil(stack.length / (stack.length > 4 ? 2 : 1)), rows = Math.ceil(stack.length / per), th = (hg - nh) / rows, tw = 2.8 / per;
        u.parts = [...[...Array(nums).keys()].map(i => makeSpray({ key, only: i, name: u.name + "'s number " + (i + 1), colour: "#f3ead8", piece: colour, font: '"Clash Display", sans-serif', weight: 700, stack: [], row: true, inline: true, z, zw,
            rect: long ? [u.x - 1.4, top - (i + 1) * nh / nums, u.x + 1.4, top - i * nh / nums] : [u.x - 1.4 + i * 2.8 / nums + .05, top - nh, u.x - 1.4 + (i + 1) * 2.8 / nums - .05, top] })), // a long word: each number its own line
          ...stack.map((t, i) => { const r = Math.floor(i / per), c = i % per, y = top - nh - (r + 1) * th + (c % 2 ? th * .12 : 0);
            return makeSpray({ key: key + "Tag" + i, name: u.name + "'s tag " + t, colour: key === "edge" ? (i % 2 ? INK_LIGHT : INK_BLUE) : i % 2 ? (key === "ttoolbox" ? "#f3ead8" : "#20232b") : colour, /* EDGE (Tom 11-24): on the concrete now, light paint so the words read; ttoolbox: its dark word sat on the dark strip (audit A10) */ stack: [t], row: true, fill: .8, z, zw, rect: [u.x - 1.4 + c * tw, y, u.x - 1.4 + (c + 1) * tw, y + th * .88] }); })]; }
      else { // (Tom 11-19) laptop: the numbers painted big in the piece's style on the right, one over the other; each tool its own tag on the sides, staggered
        const [b0, b1, b2, b3] = u.bb, bh = b3 - b1, R = ([p0, q0, p1, q1]) => [u.B.at(p0, 0).x, u.B.at(0, q1).y, u.B.at(p1, 0).x, u.B.at(0, q0).y], nums = (LIVE[key] || []).length;
        const NUM = i => u.nums ? makeSpray({ key, only: i, name: u.name + "'s number " + (i + 1), colour: "#f3ead8", piece: colour, font: '"Clash Display", sans-serif', weight: 700, stack: [], row: true, zw: u.zw, rect: R(u.nums[i]) }) : makeSpray({ key, only: i, name: u.name + "'s number " + (i + 1), colour: "#f3ead8", piece: colour, font: '"Clash Display", sans-serif', weight: 700, stack: [], row: true, rect: R([b2 + 30, b1 + i * bh / 2, b2 + 340, b1 + (i + 1) * bh / 2 - 30]) }); // inside what the camera sees beside a wide painting
        const wide = key === "ttoolbox", bw = b2 - b0; // the wide paintings fill the camera's view: their tags go in the strip above the letters
        const slots = key === "edge" ? [[b0 + 10, 800], [b2 - 255, 800]] /* EDGE: either side of the two links */ : wide ? stack.map((t, i) => [b0 + (i + .5) * bw / stack.length - 160, b1 - 175 + (i % 2) * 30]) : [[b0 - 310, b1], [b0 - 270, b1 + bh * .27], [b0 - 315, b1 + bh * .52], [b0 - 275, b1 + bh * .78], [b2 + 40, b1 + bh * .05], [b2 + 90, b1 + bh * .3], [b2 + 30, b1 + bh * .55], [b2 + 80, b1 + bh * .8]];
        const left = wide ? slots : nums ? slots.slice(0, 4) : slots, order = slots.length === 8 ? [0, 4, 1, 5, 2, 6, 3, 7] : [...slots.keys()]; // with numbers the right side is theirs
        u.parts = [...[...Array(nums).keys()].map(NUM), ...stack.map((t, i) => { const [p, q] = (nums ? left : order.map(k => slots[k]))[i % (nums ? left.length : order.length)];
          return makeSpray({ key: key + "Tag" + i, name: u.name + "'s tag " + t, colour: key === "edge" ? (i % 2 ? INK_LIGHT : INK_BLUE) : i % 2 ? "#20232b" : colour, /* EDGE (Tom 11-24): on the concrete now, light paint so the words read */ stack: [t], row: true, fill: .62, z: (u.art[6] || 0) + .004, zw: u.zw, rect: R([p, q, p + (key === "edge" ? 250 : 300), q + 95]) }); })]; } }
    u.hots = u.links.map((l, j) => { const a = document.createElement("a"); a.className = "hot"; a.href = l.href; a.target = "_blank"; a.rel = "noopener"; a.setAttribute("aria-label", l.t); a.tabIndex = -1; a.style.display = "none"; document.querySelector(".hud").append(a); return a; });
    if (u.plate) { const el = document.createElement("div"); el.className = "tag facts"; el.innerHTML = u.plate; document.querySelector(".hud").append(el); u.el = el; // fixed text: plates are the walk's own HTML strings (UNITS above), never a visitor's input. nosemgrep: insecure-innerhtml, insecure-document-method
      svg.insertAdjacentHTML("beforeend", `<line id="lu${i}"/><circle id="cu${i}" r="4"/>`); u.l = svg.querySelector("#lu" + i); u.c = svg.querySelector("#cu" + i); } });
  document.querySelector(".hud").insertAdjacentHTML("beforeend", '<p class="head">ttoolbox: a Claude Code plugin to plan, build, review and prove work. dot: keeps one dotfiles repo the same on every Linux PC. tthermal: an Omarchy bar plugin that keeps an Intel laptop under a temperature you choose. app-utveckling.se: two landing pages for EDGE Associates. Write to me: the form at the end, or GitHub and LinkedIn.</p>');

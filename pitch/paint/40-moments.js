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

  // ---- the ending (Tom 11-26): past raddavarfruberga a garage door in the street wall rolls up and the camera walks into a workshop: pegboards, a bench, the home
  // server and a coffee cup, warm lamps. On its back wall the four tools in a row, biggest first: the self-hosted platform, ttoolbox, dot, tthermal ("Toolbox"
  // stencilled on it). A second door at the far end is open: the way out to EDGE, on its own clean wall (client work, the next round); then on along the wall, in close
  // to its bare concrete, and out at the visitors' wall, where the walk began (Tom 11-23: no flash, no landing).
  // Words from src/content/look.ts and the repos' own descriptions. Signs are drawn once and shown by time (reveal).
  const conc = (w, h, x0, y0, col) => new THREE.MeshStandardMaterial({ map: tex("assets/wall4_diff.jpg", true, w / TILE, h / TILE, (x0 + 21) / TILE, (y0 - GROUND) / TILE),
    normalMap: tex("assets/wall4_nor_gl.jpg", false, w / TILE, h / TILE, (x0 + 21) / TILE, (y0 - GROUND) / TILE), color: col, roughness: .92, envMapIntensity: .2 });
  const slab = (x0, x1, y0, y1, z0, z1, m) => { const b = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), m); b.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); scene.add(b); return b; };
  // the room's material (Tom 11-26): a PAINTED BLOCK GARAGE. Concrete blocks painted off-white long ago, scuffed, a few small tags, the paint worn at knee height; a grey painted
  // floor with oil and tyre marks. Pale and painted inside, raw grey concrete outside. Drawn once on canvases (256 px a metre); wallMat/floorMat/ceilMat are the swap points.
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
    // a few small tags, hand-drawn scribbles at chest height
    for (const [tx, col] of [[300, "#c8402a"], [820, "#2f6fb3"], [1300, "#26272a"], [1000, "#d8a21a"]]) { const y = fl(1.15 + rnd() * .5); g.strokeStyle = col; g.lineWidth = 3.2; g.lineCap = g.lineJoin = "round"; g.beginPath(); g.moveTo(tx, y);
      for (let k = 0; k < 6; k++) g.bezierCurveTo(tx + k * 14 + rnd() * 10, y - 26 - rnd() * 22, tx + k * 14 + 12, y + 24 + rnd() * 16, tx + (k + 1) * 14 + rnd() * 6, y + (rnd() - .5) * 16); g.stroke(); g.globalAlpha = .4; g.lineWidth = 7; g.stroke(); g.globalAlpha = 1; }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.encoding = THREE.sRGBEncoding; t.anisotropy = maxAniso; return t; };
  const floorTex = () => { const W = 1024, c = document.createElement("canvas"); c.width = c.height = W; const g = c.getContext("2d"), rnd = rngOf(5);
    g.fillStyle = "#6c7074"; g.fillRect(0, 0, W, W); for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(${rnd() < .5 ? "255,255,255" : "20,20,24"},${.02 + rnd() * .04})`; g.fillRect(rnd() * W, rnd() * W, 20 + rnd() * 90, 8 + rnd() * 30); }
    g.strokeStyle = "rgba(30,32,36,.55)"; g.lineWidth = 2; g.strokeRect(0, 0, W, W); // saw cuts
    for (let i = 0; i < 14; i++) { const x = rnd() * W, y = rnd() * W, r = 10 + rnd() * rnd() * 90, gd = g.createRadialGradient(x, y, 1, x, y, r); gd.addColorStop(0, `rgba(14,12,10,${.25 + rnd() * .4})`); gd.addColorStop(.6, `rgba(20,18,14,${.1 + rnd() * .2})`); gd.addColorStop(1, "rgba(20,18,14,0)"); g.fillStyle = gd; g.beginPath(); g.ellipse(x, y, r, r * (.6 + rnd() * .3), rnd() * 3, 0, 6.3); g.fill(); } // oil
    g.lineCap = "round"; for (let i = 0; i < 3; i++) { const x0 = rnd() * W, y0 = rnd() * W; for (const o of [0, 26]) { g.strokeStyle = "rgba(25,25,28,.38)"; g.lineWidth = 11; g.beginPath(); g.moveTo(x0 + o, y0); g.bezierCurveTo(x0 + o + 120, y0 + 80, x0 + o + 260, y0 + 60, x0 + o + 420, y0 + 190); g.stroke(); } } // tyre marks
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.encoding = THREE.sRGBEncoding; t.anisotropy = maxAniso; return t; };
  const BLOCK_T = blockTex(), FLOOR_T = floorTex(), cloneT = (t, rx, ry) => { const q = t.clone(); q.needsUpdate = true; q.repeat.set(rx, ry); return q; };
  const wallMat = (w, h) => new THREE.MeshStandardMaterial({ map: cloneT(BLOCK_T, w / 6.25, h / 4.5), roughness: .9, envMapIntensity: .1 });
  const floorMat = (w, d) => new THREE.MeshStandardMaterial({ map: cloneT(FLOOR_T, w / 4, d / 4), roughness: .5, envMapIntensity: .35 });
  const ceilMat = new THREE.MeshStandardMaterial({ color: 0xb9b5ab, roughness: .95 });
  const plank = (w, h, horiz) => horiz ? floorMat(w, h) : wallMat(w, h); // (the old name: every caller says wall, or floor when horiz)
  const RW = CX1 - HX0, CEIL = G3 + RH, DOORS = [DOOR_A, DOOR_B], SHOP_WARM = 0xf3f1ff;
  const PK = NARROW ? .0024 : .00385, PX0 = NARROW ? 40.5 : 37.5, PC = [1800, 3100, 4400].map(c => PX0 + c * PK); // the production's strip: metres a pixel, where it starts, the x of each piece's middle
  const shop = { open: 0, lit: 0, ins: 0, panel: null, screen: null }; // open: how far door A has rolled up (0..1); lit: the workshop's own light (0..1); ins: how far the camera is inside (0..1)
  const woodM = new THREE.MeshStandardMaterial({ color: 0x5b4330, roughness: .8 }), metalM = new THREE.MeshStandardMaterial({ color: 0x4d5156, metalness: .5, roughness: .6 });
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
  // garage things, only at the ends and on the side walls (Tom 11-26), every one different: a workbench with a pegboard on the west wall, the home server, a laptop and a cup,
  // a stool; a steel shelf of boxes and cans by the door end; at the far end a tall steel shelf with jerry cans and a tyre, a red tool chest on wheels, an oil drum, a ladder.
  const steelM = new THREE.MeshStandardMaterial({ color: 0x8e949a, metalness: .6, roughness: .5 });
  const mat = c => new THREE.MeshStandardMaterial({ color: c, roughness: .7 }), box = (w, h, d, x, y, z, m) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); scene.add(b); return b; };
  const pegTex = (w, h) => { const PX = 200, c = document.createElement("canvas"); c.width = Math.round(w * PX); c.height = Math.round(h * PX); const g = c.getContext("2d"), rnd = rngOf(3); g.fillStyle = "#b9bdbf"; g.fillRect(0, 0, c.width, c.height);
    for (let y = 8; y < c.height; y += 16) for (let x = 8; x < c.width; x += 16) { g.fillStyle = "rgba(40,44,48,.6)"; g.beginPath(); g.arc(x, y, 2, 0, 6.3); g.fill(); }
    g.lineCap = "round"; const tool = (x, y, k, col, r) => { g.save(); g.translate(x, y); g.rotate(r); g.shadowColor = "rgba(0,0,0,.4)"; g.shadowBlur = 4; g.shadowOffsetX = 3; g.shadowOffsetY = 3; g.strokeStyle = col; g.fillStyle = col;
      if (k === 0) { g.lineWidth = 7; g.strokeStyle = "#7a4e2b"; g.beginPath(); g.moveTo(0, -26); g.lineTo(0, 34); g.stroke(); g.fillStyle = "#4c5055"; g.fillRect(-16, -34, 32, 14); }
      else if (k === 1) { g.lineWidth = 6; g.beginPath(); g.moveTo(0, -30); g.lineTo(0, 30); g.stroke(); g.lineWidth = 3.5; g.beginPath(); g.arc(0, -32, 9, 0, 6.3); g.stroke(); }
      else if (k === 2) { g.lineWidth = 3; g.strokeStyle = "#6c7075"; g.beginPath(); g.moveTo(0, -4); g.lineTo(0, 30); g.stroke(); g.fillStyle = col; g.fillRect(-5, -34, 10, 30); }
      else { g.lineWidth = 4; g.beginPath(); g.moveTo(-8, 30); g.lineTo(0, -4); g.lineTo(8, 30); g.stroke(); g.fillStyle = col; g.fillRect(-12, 26, 8, 14); g.fillRect(4, 26, 8, 14); }
      g.restore(); };
    const cols = ["#c8402a", "#d8a21a", "#2f6fb3", "#26272a"]; for (let y = 36; y < c.height - 40; y += 70) for (let x = 30; x < c.width - 20; x += 50 + rnd() * 24) tool(x, y + rnd() * 10, (rnd() * 4) | 0, cols[(rnd() * 4) | 0], (rnd() - .5) * .25);
    const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = maxAniso; return t; };
  { const w = 3.4, h = 1.6, m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: pegTex(w, h), roughness: .8, envMapIntensity: .2 })); m.rotation.y = Math.PI / 2; m.position.set(HX0 + .03, G3 + 1.95, WZ + 5.4); scene.add(m); } // the pegboard on the west wall
  box(.7, .06, 3.6, HX0 + .4, G3 + .9, WZ + 5.4, woodM); for (const dz of [-1.7, 1.7]) box(.6, .9, .08, HX0 + .4, G3 + .45, WZ + 5.4 + dz, metalM); box(.66, .04, 3.2, HX0 + .4, G3 + .3, WZ + 5.4, metalM); // the bench
  { const lx = HX0 + .55, lz = WZ + 4.6; const base = box(.25, .02, .36, lx, G3 + .94, lz, mat(0x2b2d30)), scr = box(.012, .23, .36, lx - .1, G3 + 1.06, lz, new THREE.MeshStandardMaterial({ color: 0x0a0c10, emissive: 0x6fc6d6, emissiveIntensity: 0 })); scr.rotation.z = .2; shop.screen = scr;
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(.04, .033, .095, 16), mat(0xe9e4d8)); cup.position.set(HX0 + .5, G3 + .98, WZ + 6.6); scene.add(cup); const cof = new THREE.Mesh(new THREE.CircleGeometry(.034, 16), mat(0x2a170c)); cof.rotation.x = -Math.PI / 2; cof.position.set(HX0 + .5, G3 + 1.03, WZ + 6.6); scene.add(cof); }
  { const w = .52, h = 1.3, d = .6, c = document.createElement("canvas"); c.width = 256; c.height = 640; const g = c.getContext("2d"); g.fillStyle = "#17191c"; g.fillRect(0, 0, 256, 640); // the home server
    for (let i = 0; i < 6; i++) { g.fillStyle = "#23262b"; g.fillRect(10, 14 + i * 104, 236, 92); g.fillStyle = "#0a0b0d"; for (let k = 0; k < 8; k++) g.fillRect(24 + k * 14, 28 + i * 104, 8, 40); for (let k = 0; k < 3; k++) { g.fillStyle = ["#46d37a", "#4aa8ff", "#e8b24a"][(i + k) % 3]; g.beginPath(); g.arc(200 + k * 14, 40 + i * 104, 3.6, 0, 6.3); g.fill(); } }
    const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = maxAniso; const side = mat(0x1b1d20), front = new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: 0xffffff, emissiveIntensity: .55, metalness: .4, roughness: .6 });
    const m = new THREE.Mesh(new THREE.BoxGeometry(d, h, w), [front, side, side, side, side, side]); m.position.set(HX0 + .5, G3 + h / 2 + .06, WZ + 8.4); scene.add(m); box(.7, .06, .7, HX0 + .5, G3 + .03, WZ + 8.4, metalM); }
  { const st = new THREE.Mesh(new THREE.CylinderGeometry(.19, .17, .06, 16), woodM); st.position.set(HX0 + 1.6, G3 + .5, WZ + 3.6); scene.add(st); const lg = new THREE.Mesh(new THREE.CylinderGeometry(.025, .025, .5, 6), metalM); lg.position.set(HX0 + 1.6, G3 + .25, WZ + 3.6); scene.add(lg); } // a stool
  const shelf = (x0, x1, ys, d = .5) => { for (const y of ys) box(x1 - x0, .04, d, (x0 + x1) / 2, G3 + y, WZ + d / 2 + .04, steelM); for (const x of [x0, x1]) box(.05, ys[ys.length - 1] + .1, d, x, G3 + (ys[ys.length - 1] + .1) / 2, WZ + d / 2 + .04, steelM); };
  { const cv = document.createElement("canvas"); cv.width = cv.height = 128; const g = cv.getContext("2d"); g.fillStyle = "#f2efe6"; g.beginPath(); g.arc(64, 64, 62, 0, 6.3); g.fill(); g.strokeStyle = "#222"; g.lineWidth = 4; g.stroke(); for (let k = 0; k < 12; k++) { g.save(); g.translate(64, 64); g.rotate(k * Math.PI / 6); g.fillRect(-1.5, -58, 3, k % 3 ? 7 : 12); g.restore(); }
    g.lineWidth = 5; g.lineCap = "round"; g.beginPath(); g.moveTo(64, 64); g.lineTo(64, 28); g.stroke(); g.lineWidth = 4; g.beginPath(); g.moveTo(64, 64); g.lineTo(88, 74); g.stroke();
    const t = new THREE.CanvasTexture(cv); t.encoding = THREE.sRGBEncoding; const clock = new THREE.Mesh(new THREE.CircleGeometry(.24, 28), new THREE.MeshStandardMaterial({ map: t, roughness: .6 })); clock.position.set(39.2, G3 + 3.1, WZ + .03); scene.add(clock);
    box(.5, .7, .14, 38.3, G3 + 1.9, WZ + .08, mat(0x9aa0a4)); box(.42, .6, .02, 38.3, G3 + 1.9, WZ + .16, mat(0x868c90)); box(.12, .12, .02, 38.3, G3 + 2.1, WZ + .18, mat(0xc89a1a));
    const sg = new THREE.Mesh(new THREE.PlaneGeometry(.5, .5), new THREE.MeshStandardMaterial({ color: 0xe0b520, roughness: .6 })); sg.rotation.z = Math.PI / 4; sg.position.set(37.7, G3 + 2.6, WZ + .03); scene.add(sg); }
  shelf(34.9, 37.2, [.4, 1.0, 1.6, 2.2]); // a steel shelf by the door end: boxes, tins of paint
  box(.6, .4, .4, 35.4, G3 + .62, WZ + .3, mat(0x9a7a4e)); box(.5, .3, .4, 36.2, G3 + .57, WZ + .3, mat(0x3a5a7a)); box(.5, .35, .4, 36.8, G3 + .6, WZ + .3, mat(0xa8a090)); for (const [x, y, c] of [[35.3, 1.1, 0xc8402a], [35.6, 1.1, 0xe8e2d0], [36.1, 1.1, 0x2f6fb3], [36.6, 1.1, 0x4a6b3a]]) { const tin = new THREE.Mesh(new THREE.CylinderGeometry(.11, .11, .2, 14), mat(c)); tin.position.set(x, G3 + y + .12, WZ + .3); scene.add(tin); }
  box(.8, .4, .4, 35.8, G3 + 1.2, WZ + .3, mat(0x6b5a48)); box(.5, .3, .4, 36.6, G3 + 1.75, WZ + .3, mat(0x8e5a3a)); box(.4, .3, .35, 35.3, G3 + 2.35, WZ + .3, mat(0x5a6a7a));
  shelf(59.2, 61.4, [.35, .95, 1.55, 2.15, 2.75], .55); // a tall steel shelf at the far end: jerry cans, a tyre, a coil of hose
  for (const [x, y, c] of [[59.7, .35, 0xb8341f], [60.3, .35, 0x3f5f2f], [60.9, .35, 0xc89a1a]]) box(.4, .46, .26, x, G3 + y + .25, WZ + .35, mat(c));
  { const ty = new THREE.Mesh(new THREE.TorusGeometry(.26, .1, 10, 22), mat(0x151515)); ty.position.set(60.2, G3 + 1.3, WZ + .35); scene.add(ty); const hose = new THREE.Mesh(new THREE.TorusGeometry(.2, .04, 8, 20), mat(0x1f5a9a)); hose.position.set(60.4, G3 + 1.92, WZ + .35); hose.rotation.x = .3; scene.add(hose); }
  { box(.8, .5, .45, 62.6, G3 + .75, WZ + .5, new THREE.MeshStandardMaterial({ color: 0xa8281f, metalness: .4, roughness: .45 })); box(.8, .5, .45, 62.6, G3 + .3, WZ + .5, new THREE.MeshStandardMaterial({ color: 0xa8281f, metalness: .4, roughness: .45 })); for (const dx of [-.34, .34]) { const wh = new THREE.Mesh(new THREE.CylinderGeometry(.08, .08, .05, 12), mat(0x111111)); wh.rotation.x = Math.PI / 2; wh.position.set(62.6 + dx, G3 + .08, WZ + .75); scene.add(wh); } for (let k = 0; k < 5; k++) box(.7, .012, .01, 62.6, G3 + .12 + k * .2, WZ + .73, metalM); }
  { const dr = new THREE.Mesh(new THREE.CylinderGeometry(.3, .3, .88, 20), mat(0x2f5a8a)); dr.position.set(64.1, G3 + .44, WZ + .5); scene.add(dr); for (const y of [.2, .66]) { const rg = new THREE.Mesh(new THREE.TorusGeometry(.3, .012, 6, 24), metalM); rg.rotation.x = Math.PI / 2; rg.position.set(64.1, G3 + y, WZ + .5); scene.add(rg); } } // an oil drum
  { for (const dx of [-.22, .22]) { const rl = new THREE.Mesh(new THREE.CylinderGeometry(.02, .02, 3.2, 6), woodM); rl.position.set(65.4 + dx, G3 + 1.6, WZ + .45); rl.rotation.x = -.08; scene.add(rl); } for (let k = 0; k < 9; k++) box(.44, .025, .03, 65.4, G3 + .3 + k * .33, WZ + .36 + k * .0, woodM); } // a ladder against the wall
  // the back door out (Tom 11-26): a work lamp in a cage over it, outside, and a lit step
  { const xc = (DOOR_B[0] + DOOR_B[1]) / 2, arm = new THREE.Mesh(new THREE.CylinderGeometry(.025, .025, .6, 8), metalM); arm.rotation.x = Math.PI / 2; arm.position.set(xc, G3 + DOOR_H + 1.15, .3); scene.add(arm);
    const cage = new THREE.Mesh(new THREE.CylinderGeometry(.1, .17, .3, 14, 1, true), lampShade), bulb = new THREE.Mesh(new THREE.SphereGeometry(.09, 12, 8), shopBulb); cage.position.set(xc, G3 + DOOR_H + 1.02, .62); bulb.position.set(xc, G3 + DOOR_H + .98, .62); scene.add(cage, bulb); }
  // phone: a prop in frame at every piece: a low bench under it and a fluorescent tube on chains hanging into the top of the frame
  if (NARROW) PC.forEach((x, i) => { box(2.7, .06, .5, x, G3 + .24, WZ + .3, woodM); for (const dx of [-1.25, 1.25]) box(.08, .24, .4, x + dx, G3 + .12, WZ + .3, metalM);
    box(.4, .24, .3, x + (i % 2 ? -.8 : .8), G3 + .39, WZ + .3, mat([0xa8281f, 0x3a5a7a, 0x8e5a3a][i]));
    const tb = new THREE.Mesh(new THREE.BoxGeometry(1.2, .05, .1), tubeM); tb.position.set(x + .7, G3 + 3.62, WZ + 1.1); scene.add(tb); for (const dx of [-.5, .5]) { const ch = new THREE.Mesh(new THREE.CylinderGeometry(.006, .006, .75, 4), metalM); ch.position.set(x + .7 + dx, G3 + 4.02, WZ + 1.1); scene.add(ch); } });
  // the lights that go with the camera: a warm spot on the wall it faces, a warm fill from the room's middle, and the light that spills out of the door onto the wet street
  const exitL = new THREE.PointLight(0xffd9a0, 0, 15, 1.4); scene.add(exitL); exitL.position.set((DOOR_B[0] + DOOR_B[1]) / 2, G3 + DOOR_H + .9, 1.1); // the work lamp over the back door
  const shopSpot = new THREE.SpotLight(SHOP_WARM, 0, 15, 1, 1, 1.3), shopFill = new THREE.PointLight(0xf1f2ff, 0, 13, 1.6), spill = new THREE.SpotLight(0xffd29a, 0, 18, .85, .85, 1.1); scene.add(shopSpot, shopSpot.target, shopFill, spill, spill.target);
  function shopAt(now, sv, cp) { // the door's roll, the lamps, where the light stands
    const tIn = sm(cl((sv - 560) / 55)); shop.open = tIn; shop.lit = tIn * (1 - sm(cl((sv - 940) / 50)));
    shop.panel.position.y = G3 + DOOR_H / 2 + tIn * (DOOR_H + .05); shop.panel.visible = tIn < .999;
    const inX = sm(cl((cp.x - HX0 + .2) / 1.4)) * (1 - sm(cl((cp.x - CX1 + 1.2) / 1.6))), inZ = sm(cl((.9 - cp.z) / 1.6)); shop.ins = inX * inZ;
    shopBulb.emissiveIntensity = 2.2 * shop.lit; tubeM.emissiveIntensity = 2.4 * shop.lit; tubeBad.emissiveIntensity = (Math.sin(now / 37) > .55 && Math.random() < .5 ? .15 : 2.4) * shop.lit; shop.screen.material.emissiveIntensity = 1.4 * shop.lit;
    const cx = cl(cp.x, HX0 + 1.5, CX1 - 1.5);
    shopSpot.intensity = 2.2 * shop.lit; shopSpot.position.set(cx, CEIL - .3, WZ + 1.7); shopSpot.target.position.set(cx, G3 + 1.7, WZ);
    shopFill.intensity = 1.0 * shop.lit; shopFill.position.set(cx, G3 + 3.2, WZ + 6.3);
    const sx = sm(cl((cp.x - 50) / 8)), dx = DOOR_A[0] + (DOOR_A[1] - DOOR_A[0]) / 2, ex = DOOR_B[0] + (DOOR_B[1] - DOOR_B[0]) / 2; // the light out of the door follows you to the far one
    spill.position.set(dx + (ex - dx) * sx, G3 + 2.6, WZ + 3.2); spill.target.position.set(dx + (ex - dx) * sx + .4, G3, 7);
    spill.intensity = 14 * shop.lit * (1 - .6 * shop.ins); exitL.intensity = 15 * shop.lit * sm(cl((sv - 820) / 40));
}
  window.garageTest = () => ({ open: +shop.open.toFixed(3), lit: +shop.lit.toFixed(3), inside: +shop.ins.toFixed(3), cam: [+camera.position.x.toFixed(2), +camera.position.y.toFixed(2), +camera.position.z.toFixed(2)], // for the garage check: the door, the light, where the camera is
    paintings: U4.slice(0, 3).map(u => ({ name: u.name, x: u.x, shown: u.B.m.visible && u.B.m.material.opacity > .99, wall: u.zw })) });
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
  // the Toolbox production (Tom 11-26, A5): ONE see-through strip, 5300 x 960 px, painted on the desk's graphics card, cut into four webp tiles (the title tile, then a tile for each piece).
  // The stack words are painted into it as small tags; the live numbers are sprayed in the bare wall above each piece. PK metres a pixel, PC where each piece's middle stands.
  const TILE_TW = [1150, 1300, 1300, 1550], prod = (n, key, link, plate, marks, nums) => tool(PC[n - 1], key, ['', 'ttoolbox', 'dot', 'tthermal'][n], link, plate,
    { tile: n, nums, art: [`assets/toolbox_${n}.webp`, TILE_TW[n] * .00385, TILE_TW[n] * .0024, [650, 480], 2.1, [[0, 190, 1300, 890]]], marks: [marks] });
  const U4 = [
    prod(1, 700, "ttoolbox", "<b>ttoolbox</b>Claude Code plugin with skills and agents to plan, build, review and prove work.", [60, 610, 300, 690], [[30, 40, 420, 230], [880, 40, 1270, 230]]),
    prod(2, 770, "dot", "<b>dot</b>Keeps one GNU Stow dotfiles repo the same on every Linux PC.", [130, 720, 370, 800], [[30, 40, 420, 230], [880, 40, 1270, 230]]),
    prod(3, 840, "tthermal", "<b>tthermal</b>Omarchy bar plugin that keeps an Intel laptop under a temperature you choose.", [60, 590, 300, 670], [[30, 40, 420, 230], [880, 40, 1270, 230]]),
    { x: 75, key: 990, leave: 1045, floor: G3, name: "app-utveckling.se", links: [{ t: "app-utveckling.se", href: "https://app-utveckling.se" }, { t: "mjukvaruutvecklare.com", href: "https://mjukvaruutvecklare.com" }],
      art: ["assets/edge_wall.webp", 6.6, 3.5, [714, 518], 1.9, [[20, 200, 1409, 745], ...EDGE_V.areas]], ov: EDGE_V.ov, marks: EDGE_V.marks,
      plate: "<b>app-utveckling.se</b>Two landing pages for EDGE Associates, on one code base. Work project, built alone." } ];
  U4.forEach((u, i) => { const [file, wL, wP, c, y, areas, z = .002] = u.art; if (u.tile === 1) { u.X = paintOn("assets/toolbox_0.webp", 1150 * (N_ ? .0024 : .00385), [0, 480], [PX0, G3 + 2.1], z, [1150, 960], WZ); u.X.m.visible = false; u.X.m.material.opacity = 0; } u.zw = u.zw || 0; u.B = paintOn(file, N_ ? wP : wL, c, [u.x, u.floor + (N_ && u.yP || y)], z, undefined, u.zw); if (u.ov) { u.O = paintOn(u.ov, N_ ? wP : wL, c, [u.x, u.floor + (N_ && u.yP || y)], z + .001, undefined, u.zw); u.O.m.renderOrder = 2; } areas.forEach((a, j) => u.B.protect(u.name + "'s painting" + (j ? " " + (j + 1) : ""), a));
    u.bb = [0, 1, 2, 3].map(n => Math[n < 2 ? "min" : "max"](...areas.map(a => a[n]))); u.start = 0; // the painted area as one box
    u.links.forEach((l, j) => l.box = u.marks[j]);
    { const [key, colour, stack0] = { "Self-hosted platform": ["self", "#2d3a5c", ["TypeScript", "Next.js", "Hono", "SQLite", "Java", "Docker", "Caddy", "Tailscale"]], ttoolbox: ["ttoolbox", "#c8402a", ["Claude Code", "Python", "Bash"]],
        dot: ["dot", "#25407a", ["Bash", "bats", "GNU Stow", "mise"]], tthermal: ["tthermal", "#d8435f", ["JavaScript", "QML", "Shell"]], "app-utveckling.se": ["edge", "#1f5fc4", ["Astro", "TypeScript"]] }[u.name];
      const stack = u.painted || u.tile ? [] : stack0, yb = u.B.at(0, u.bb[3]).y; // painted: the picture has its stack written in // beside the painting on a laptop; under it, above the floor, on a phone
      if (u.tile) { // (Tom 11-26) the production: the live numbers in the bare wall above the piece (the stack words are painted into the strip)
        u.parts = (LIVE[key] || []).map((_, i) => makeSpray({ key, only: i, name: u.name + "'s number " + (i + 1), colour: "#f3ead8", piece: colour, font: '"Clash Display", sans-serif', weight: 700, stack: [], row: true, zw: u.zw, z: .004,
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

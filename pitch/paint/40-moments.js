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
  // raw wood planks (Tom 11-26: the inside is warm wood, the street is cold concrete): boards 0.3 m wide, drawn once on a canvas; horizontal = across the other way (the floor)
  const plankTex = horiz => { const c = document.createElement("canvas"); c.width = c.height = 256; const g = c.getContext("2d"); let sd = horiz ? 7 : 3; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
    if (horiz) { g.translate(0, 256); g.rotate(-Math.PI / 2); }
    for (let i = 0; i < 4; i++) { const x = i * 64, l = 52 + rnd() * 14; g.fillStyle = `hsl(${26 + rnd() * 6},${24 + rnd() * 8}%,${l - 10}%)`; g.fillRect(x, 0, 64, 256);
      for (let k = 0; k < 26; k++) { g.fillStyle = `rgba(60,34,14,${.03 + rnd() * .06})`; g.fillRect(x + 2 + rnd() * 58, 0, 1 + rnd() * 1.6, 256); }
      if (rnd() < .7) { const ky = rnd() * 230 + 12, kx = x + 14 + rnd() * 36; g.fillStyle = "rgba(55,30,12,.45)"; g.beginPath(); g.ellipse(kx, ky, 4, 7, 0, 0, 6.3); g.fill(); }
      g.fillStyle = "rgba(30,16,6,.7)"; g.fillRect(x, 0, 1.6, 256); g.fillStyle = "rgba(255,225,170,.12)"; g.fillRect(x + 2, 0, 1, 256); }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.encoding = THREE.sRGBEncoding; t.anisotropy = maxAniso; return t; };
  const plank = (w, h, horiz = false, k = 1) => { const t = plankTex(horiz).clone(); t.needsUpdate = true; t.repeat.set(w / 1.2, h / 1.2); return new THREE.MeshStandardMaterial({ map: t, color: new THREE.Color(k, k, k), roughness: .78, envMapIntensity: .15 }); };
  const RW = CX1 - HX0, CEIL = G3 + RH, DOORS = [DOOR_A, DOOR_B], SHOP_WARM = 0xffe6c8;
  const shop = { open: 0, lit: 0, ins: 0, panel: null, screen: null }; // open: how far door A has rolled up (0..1); lit: the workshop's own light (0..1); ins: how far the camera is inside (0..1)
  const woodM = new THREE.MeshStandardMaterial({ color: 0x5b4330, roughness: .8 }), metalM = new THREE.MeshStandardMaterial({ color: 0x4d5156, metalness: .5, roughness: .6 });
  { // the room: floor, back wall, ceiling, the two end walls, and the street wall's inside with a thick frame round each door
    const wallM = plank(RW, RH, false, .62);
    const back = new THREE.Mesh(new THREE.PlaneGeometry(RW, RH), wallM); back.position.set(HX0 + RW / 2, G3 + RH / 2, WZ); scene.add(back);
    for (const [x, ry] of [[HX0, Math.PI / 2], [CX1, -Math.PI / 2]]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(BD, RH), plank(BD, RH, false, .55)); m.rotation.y = ry; m.position.set(x, G3 + RH / 2, WZ / 2); scene.add(m); }
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(RW, BD), plank(RW, BD, false, .5)); ceil.rotation.x = Math.PI / 2; ceil.position.set(HX0 + RW / 2, CEIL, WZ / 2); scene.add(ceil);
    const floorM = plank(RW, BD, true, .6); slab(HX0, CX1, G3 - .3, G3, WZ, 0, floorM);
    const edges = [HX0, DOOR_A[0], DOOR_A[1], DOOR_B[0], DOOR_B[1], CX1]; // the wall between the doors, and over each (the lintel)
    [[0, 1], [2, 3], [4, 5]].forEach(([a, b]) => slab(edges[a], edges[b], G3 - .01, CEIL, -.3, -.001, plank(edges[b] - edges[a], RH, false, .62)));
    [[1, 2], [3, 4]].forEach(([a, b]) => slab(edges[a], edges[b], G3 + DOOR_H, CEIL, -.3, -.001, plank(edges[b] - edges[a], RH - DOOR_H, false, .62)));
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
  // the lamps: warm pendants on cords, rafters, two beams, one conduit; the one tube at the far end that flickers
  const lampShade = new THREE.MeshStandardMaterial({ color: 0x35503f, metalness: .3, roughness: .55, side: THREE.DoubleSide }), shopBulb = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffdca8, emissiveIntensity: 0 });
  const cordM = new THREE.MeshStandardMaterial({ color: 0x111111 }), PENDANTS = [37.4, 42.6, 47.8, 53, 58.2, 63.4];
  PENDANTS.forEach(x => { const z = WZ + 3.6, shade = new THREE.Mesh(new THREE.CylinderGeometry(.08, .3, .22, 22, 1, true), lampShade), bulb = new THREE.Mesh(new THREE.SphereGeometry(.075, 12, 8), shopBulb), cord = new THREE.Mesh(new THREE.CylinderGeometry(.008, .008, .75, 5), cordM);
    shade.position.set(x, CEIL - .86, z); bulb.position.set(x, CEIL - .9, z); cord.position.set(x, CEIL - .375, z); scene.add(shade, bulb, cord); });
  for (let x = HX0 + 1.3; x < CX1; x += 2.75) slab(x - .06, x + .06, CEIL - .22, CEIL, WZ, 0, woodM); // rafters across
  for (const z of [WZ + 3.6, WZ + 7.5]) slab(HX0, CX1, CEIL - .24, CEIL - .02, z - .07, z + .07, woodM); // two beams along
  const pipeM = new THREE.MeshStandardMaterial({ color: 0x6f7377, metalness: .7, roughness: .45 });
  const pipe = (a, b, r = .022) => { const d = b.clone().sub(a), m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, d.length(), 8), pipeM); m.position.copy(a).addScaledVector(d, .5); m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); scene.add(m); return m; };
  pipe(V(HX0 + .2, CEIL - .3, WZ + .12), V(CX1 - .2, CEIL - .3, WZ + .12));
  const fixM = new THREE.MeshStandardMaterial({ color: 0x2a2c2f, metalness: .5, roughness: .5 }), tubeM = new THREE.MeshStandardMaterial({ color: 0, emissive: 0xdfe9ff, emissiveIntensity: 0 });
  { const f = new THREE.Mesh(new THREE.BoxGeometry(1.3, .05, .13), fixM), t = new THREE.Mesh(new THREE.BoxGeometry(1.18, .026, .06), tubeM); f.position.set(65.2, CEIL - .03, WZ + 1.6); t.position.set(65.2, CEIL - .066, WZ + 1.6); scene.add(f, t); }
  // pegboards with their tools painted on (the outline each hangs in), benches, the home server, a coffee cup, a laptop, a red tool chest, crates
  const pegTex = (w, h, seed) => { const PX = 220, c = document.createElement("canvas"); c.width = Math.round(w * PX); c.height = Math.round(h * PX); const g = c.getContext("2d"); let s = seed; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    g.fillStyle = "#8a6c4a"; g.fillRect(0, 0, c.width, c.height); for (let y = 8; y < c.height; y += 16) for (let x = 8; x < c.width; x += 16) { g.fillStyle = "rgba(30,20,10,.55)"; g.beginPath(); g.arc(x, y, 2.2, 0, 6.3); g.fill(); }
    g.lineCap = "round"; const tool = (x, y, k, col, r) => { g.save(); g.translate(x, y); g.rotate(r); g.shadowColor = "rgba(0,0,0,.45)"; g.shadowBlur = 5; g.shadowOffsetX = 3; g.shadowOffsetY = 4; g.strokeStyle = col; g.fillStyle = col;
      if (k === 0) { g.lineWidth = 7; g.strokeStyle = "#7a4e2b"; g.beginPath(); g.moveTo(0, -26); g.lineTo(0, 34); g.stroke(); g.fillStyle = "#6c7075"; g.fillRect(-16, -34, 32, 14); } // hammer
      else if (k === 1) { g.lineWidth = 6; g.strokeStyle = "#a9adb1"; g.beginPath(); g.moveTo(0, -30); g.lineTo(0, 30); g.stroke(); g.lineWidth = 3.5; g.beginPath(); g.arc(0, -32, 9, 0, 6.3); g.stroke(); } // spanner
      else if (k === 2) { g.lineWidth = 3; g.strokeStyle = "#b9bcc0"; g.beginPath(); g.moveTo(0, -4); g.lineTo(0, 30); g.stroke(); g.fillStyle = col; g.fillRect(-5, -34, 10, 30); } // screwdriver
      else if (k === 3) { g.fillStyle = "#a7acb1"; g.beginPath(); g.moveTo(-30, 18); g.lineTo(30, 18); g.lineTo(30, -18); g.closePath(); g.fill(); g.fillStyle = "#6b4a2d"; g.fillRect(-34, 18, 14, 14); } // saw
      else { g.lineWidth = 4; g.strokeStyle = "#a7acb1"; g.beginPath(); g.moveTo(-8, 30); g.lineTo(0, -4); g.lineTo(8, 30); g.stroke(); g.fillStyle = col; g.fillRect(-12, 26, 8, 14); g.fillRect(4, 26, 8, 14); } // pliers
      g.restore(); };
    const cols = ["#c8402a", "#d8a21a", "#2f6fb3", "#26272a", "#c8402a"]; for (let y = 36; y < c.height - 40; y += 72) for (let x = 30; x < c.width - 20; x += 46 + rnd() * 20) tool(x, y + rnd() * 10, (rnd() * 5) | 0, cols[(rnd() * 5) | 0], (rnd() - .5) * .25);
    const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = maxAniso; return t; };
  const pegM = (w, h, seed) => new THREE.MeshStandardMaterial({ map: pegTex(w, h, seed), roughness: .85, envMapIntensity: .2 });
  const peg = (x, w, h, y0, seed) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), pegM(w, h, seed)); m.position.set(x, G3 + y0 + h / 2, WZ + .03); scene.add(m); return m; };
  const bench = (x, w, z = WZ + .45) => { const top = new THREE.Mesh(new THREE.BoxGeometry(w, .06, .7), woodM); top.position.set(x, G3 + .9, z); scene.add(top);
    for (const dx of [-w / 2 + .05, w / 2 - .05]) slab(x + dx - .04, x + dx + .04, G3, G3 + .9, z - .3, z + .3, metalM); slab(x - w / 2 + .1, x + w / 2 - .1, G3 + .28, G3 + .32, z - .3, z + .3, woodM); };
  const GAPS = [45.3, 51.95, 58.45];
  peg(GAPS[0], 1.6, 2.5, 1.1, 11); peg(GAPS[1], 1.35, 2.2, 1.2, 23); peg(GAPS[2], 1.35, 2.2, 1.2, 37); peg(66.2, 1.5, 2.4, 1.1, 41);
  { const m = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 2.3), pegM(5.2, 2.3, 53)); m.rotation.y = Math.PI / 2; m.position.set(HX0 + .03, G3 + 1.2 + 1.15, WZ + 4.8); scene.add(m); } // on the west end wall
  // the home server (the self-hosted platform's neighbour) on the floor in the first gap, with a few lit fronts
  { const w = .52, h = 1.3, d = .6, c = document.createElement("canvas"); c.width = 256; c.height = 640; const g = c.getContext("2d"); g.fillStyle = "#17191c"; g.fillRect(0, 0, 256, 640);
    for (let i = 0; i < 6; i++) { g.fillStyle = "#23262b"; g.fillRect(10, 14 + i * 104, 236, 92); g.fillStyle = "#0a0b0d"; for (let k = 0; k < 8; k++) g.fillRect(24 + k * 14, 28 + i * 104, 8, 40); for (let k = 0; k < 3; k++) { g.fillStyle = ["#46d37a", "#4aa8ff", "#e8b24a"][(i + k) % 3]; g.beginPath(); g.arc(200 + k * 14, 40 + i * 104, 3.6, 0, 6.3); g.fill(); } }
    const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = maxAniso;
    const side = new THREE.MeshStandardMaterial({ color: 0x1b1d20, metalness: .5, roughness: .6 }), front = new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: 0xffffff, emissiveIntensity: .55, metalness: .4, roughness: .6 });
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [side, side, side, side, front, side]); m.position.set(GAPS[0] + .05, G3 + h / 2 + .06, WZ + d / 2 + .06); scene.add(m);
    slab(GAPS[0] - .7, GAPS[0] + .8, G3, G3 + .06, WZ + .02, WZ + .78, metalM); }
  // a bench in the middle gap: a laptop with its screen lit, and the coffee cup
  { bench(GAPS[1], 1.45);
    const base = new THREE.Mesh(new THREE.BoxGeometry(.36, .02, .25), new THREE.MeshStandardMaterial({ color: 0x2b2d30, metalness: .6, roughness: .4 })), scr = new THREE.Mesh(new THREE.BoxGeometry(.36, .23, .012), new THREE.MeshStandardMaterial({ color: 0x0a0c10, emissive: 0x6fc6d6, emissiveIntensity: 0 }));
    base.position.set(GAPS[1] - .22, G3 + .94, WZ + .45); scr.position.set(GAPS[1] - .22, G3 + 1.06, WZ + .33); scr.rotation.x = -.2; scene.add(base, scr); shop.screen = scr;
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(.04, .033, .095, 16), new THREE.MeshStandardMaterial({ color: 0xe9e4d8, roughness: .5 })), cof = new THREE.Mesh(new THREE.CircleGeometry(.034, 16), new THREE.MeshStandardMaterial({ color: 0x2a170c, roughness: .3 }));
    cup.position.set(GAPS[1] + .32, G3 + .98, WZ + .5); cof.rotation.x = -Math.PI / 2; cof.position.set(GAPS[1] + .32, G3 + 1.03, WZ + .5); scene.add(cup, cof); }
  // a red tool chest on a bench in the third gap, a vice beside it
  { bench(GAPS[2], 1.45); const chest = new THREE.Mesh(new THREE.BoxGeometry(.7, .5, .4), new THREE.MeshStandardMaterial({ color: 0xa8281f, metalness: .4, roughness: .45 })); chest.position.set(GAPS[2] - .25, G3 + 1.18, WZ + .45); scene.add(chest);
    for (let k = 0; k < 4; k++) slab(GAPS[2] - .6, GAPS[2] + .1, G3 + 1 + k * .12, G3 + 1.012 + k * .12, WZ + .66, WZ + .665, metalM);
    slab(GAPS[2] + .35, GAPS[2] + .6, G3 + .93, G3 + 1.08, WZ + .35, WZ + .55, metalM); }
  // the far end: a metal shelf with crates, and a stack of tyres by the door
  { for (const y of [.5, 1.1, 1.7]) slab(65, 67.2, G3 + y, G3 + y + .03, WZ + .05, WZ + .55, metalM); for (const x of [65, 67.2]) slab(x - .03, x + .03, G3, G3 + 1.9, WZ + .05, WZ + .55, metalM);
    [[65.6, .5, .9], [66.6, .5, .8], [66.2, 1.1, .7], [65.5, 1.1, .8], [66.4, 1.7, .9]].forEach(([x, y, w], i) => slab(x - w / 4, x + w / 4, G3 + y + .03, G3 + y + .33, WZ + .1, WZ + .5, i % 2 ? woodM : new THREE.MeshStandardMaterial({ color: 0x3a5a7a, roughness: .7 })));
  }
  // the west end: a bench under the pegboard on the end wall, a stool
  { const b = new THREE.Mesh(new THREE.BoxGeometry(.7, .06, 3.6), woodM); b.position.set(HX0 + .4, G3 + .9, WZ + 4.8); scene.add(b); for (const dz of [-1.7, 1.7]) slab(HX0 + .1, HX0 + .7, G3, G3 + .9, WZ + 4.8 + dz - .04, WZ + 4.8 + dz + .04, metalM);
    const st = new THREE.Mesh(new THREE.CylinderGeometry(.19, .17, .06, 16), woodM); st.position.set(HX0 + 1.5, G3 + .5, WZ + 3.4); scene.add(st); const lg = new THREE.Mesh(new THREE.CylinderGeometry(.025, .025, .5, 6), metalM); lg.position.set(HX0 + 1.5, G3 + .25, WZ + 3.4); scene.add(lg); }
  // the back door out (Tom 11-26): a work lamp in a cage over it, outside, and a lit step
  { const xc = (DOOR_B[0] + DOOR_B[1]) / 2, arm = new THREE.Mesh(new THREE.CylinderGeometry(.025, .025, .6, 8), metalM); arm.rotation.x = Math.PI / 2; arm.position.set(xc, G3 + DOOR_H + 1.15, .3); scene.add(arm);
    const cage = new THREE.Mesh(new THREE.CylinderGeometry(.1, .17, .3, 14, 1, true), lampShade), bulb = new THREE.Mesh(new THREE.SphereGeometry(.09, 12, 8), shopBulb); cage.position.set(xc, G3 + DOOR_H + 1.02, .62); bulb.position.set(xc, G3 + DOOR_H + .98, .62); scene.add(cage, bulb); }
  // phone: a prop in frame at every painting: a lamp on the wall hanging into the top corner, and a low bench under it (the numbers sit above it)
  if (NARROW) [42.2, 48.7, 55.2, 61.7].forEach((x, i) => { const bt = new THREE.Mesh(new THREE.BoxGeometry(2.7, .06, .5), woodM); bt.position.set(x, G3 + .24, WZ + .3); scene.add(bt);
    for (const dx of [-1.25, 1.25]) slab(x + dx - .04, x + dx + .04, G3, G3 + .24, WZ + .1, WZ + .5, metalM);
    const crate = new THREE.Mesh(new THREE.BoxGeometry(.4, .24, .3), i % 2 ? new THREE.MeshStandardMaterial({ color: 0x3a5a7a, roughness: .7 }) : new THREE.MeshStandardMaterial({ color: 0xa8281f, roughness: .5 })); crate.position.set(x + (i % 2 ? -.8 : .8), G3 + .39, WZ + .3); scene.add(crate);
    const lx = x + 1.1, arm = new THREE.Mesh(new THREE.CylinderGeometry(.02, .02, .9, 6), metalM); arm.rotation.x = Math.PI / 2; arm.position.set(lx, G3 + 3.6, WZ + .45); scene.add(arm);
    const sh = new THREE.Mesh(new THREE.CylinderGeometry(.06, .26, .22, 18, 1, true), lampShade), bu = new THREE.Mesh(new THREE.SphereGeometry(.07, 10, 8), shopBulb); sh.position.set(lx, G3 + 3.4, WZ + .9); bu.position.set(lx, G3 + 3.36, WZ + .9); scene.add(sh, bu); });
  // the lights that go with the camera: a warm spot on the wall it faces, a warm fill from the room's middle, and the light that spills out of the door onto the wet street
  const exitL = new THREE.PointLight(0xffd9a0, 0, 15, 1.4); scene.add(exitL); exitL.position.set((DOOR_B[0] + DOOR_B[1]) / 2, G3 + DOOR_H + .9, 1.1); // the work lamp over the back door
  const shopSpot = new THREE.SpotLight(SHOP_WARM, 0, 15, 1, 1, 1.3), shopFill = new THREE.PointLight(0xffc98f, 0, 13, 1.6), spill = new THREE.SpotLight(0xffd29a, 0, 18, .85, .85, 1.1); scene.add(shopSpot, shopSpot.target, shopFill, spill, spill.target);
  const toolboxSpray = makeSpray({ key: "toolbox", name: "the Toolbox stencil", colour: "#d9d0ba", font: SPRAY_FONT, cap: .2, stack: ["TOOLBOX"], rect: NARROW ? [37, G3 + 1.6, 40, G3 + 2.6] : [36.2, G3 + 1.6, 39.7, G3 + 2.6], zw: WZ, z: .004 });
  function shopAt(now, sv, cp) { // the door's roll, the lamps, where the light stands
    const tIn = sm(cl((sv - 560) / 55)); shop.open = tIn; shop.lit = tIn * (1 - sm(cl((sv - 1010) / 50)));
    shop.panel.position.y = G3 + DOOR_H / 2 + tIn * (DOOR_H + .05); shop.panel.visible = tIn < .999;
    const inX = sm(cl((cp.x - HX0 + .2) / 1.4)) * (1 - sm(cl((cp.x - CX1 + 1.2) / 1.6))), inZ = sm(cl((.9 - cp.z) / 1.6)); shop.ins = inX * inZ;
    shopBulb.emissiveIntensity = 2.2 * shop.lit; tubeM.emissiveIntensity = (Math.sin(now / 37) > .55 && Math.random() < .5 ? .15 : 2.4) * shop.lit; shop.screen.material.emissiveIntensity = 1.4 * shop.lit;
    const cx = cl(cp.x, HX0 + 1.5, CX1 - 1.5);
    shopSpot.intensity = 6 * shop.lit; shopSpot.position.set(cx, CEIL - .3, WZ + 1.7); shopSpot.target.position.set(cx, G3 + 1.7, WZ);
    shopFill.intensity = 1.6 * shop.lit; shopFill.position.set(cx, G3 + 3.2, WZ + 6.3);
    const sx = sm(cl((cp.x - 50) / 8)), dx = DOOR_A[0] + (DOOR_A[1] - DOOR_A[0]) / 2, ex = DOOR_B[0] + (DOOR_B[1] - DOOR_B[0]) / 2; // the light out of the door follows you to the far one
    spill.position.set(dx + (ex - dx) * sx, G3 + 2.6, WZ + 3.2); spill.target.position.set(dx + (ex - dx) * sx + .4, G3, 7);
    spill.intensity = 14 * shop.lit * (1 - .6 * shop.ins); exitL.intensity = 11 * shop.lit * sm(cl((sv - 880) / 40));
    const here = sv > 590 && sv < 960 && cp.x < 52 && shop.ins > .3; toolboxSpray.fade(here); }
  window.garageTest = () => ({ open: +shop.open.toFixed(3), lit: +shop.lit.toFixed(3), inside: +shop.ins.toFixed(3), cam: [+camera.position.x.toFixed(2), +camera.position.y.toFixed(2), +camera.position.z.toFixed(2)], stencil: +toolboxSpray.op.toFixed(2), // for the garage check: the door, the light, where the camera is, the stencil
    paintings: U4.slice(0, 4).map(u => ({ name: u.name, x: u.x, shown: u.B.m.visible && u.B.m.material.opacity > .99, wall: u.zw })) });
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
  const edgeL = new THREE.SpotLight(0xfff0dc, 0, 12, 1.15, 1, 1.2); edgeL.position.set(EDGE_X, G3 + EDGE_H - .2, 1.15); edgeL.target.position.set(EDGE_X, G3 + 1.7, 0); scene.add(edgeL, edgeL.target);
  const GHUB = "https://github.com/tlxq/";
  // where each one stands (laptop / phone): four tools in the workshop, then EDGE. key: the scroll (vh) where the camera has arrived,
  // leave: where it starts to go on. The camera stops in front of each. Each has its painting (Tom 11-19, one artist per wall): art = [file, picture m wide on a
  // laptop, on a phone, the picture pixel that stands at the stop, its height over the floor, the painted areas (picture pixels: left, top, right, bottom)];
  // the link marks are picture pixels too.
  const N_ = NARROW;
  const EDGE_V = { ov: "assets/edge_banner.webp", marks: [[481, 739, 1059, 821], [411, 825, 1129, 907]], areas: [[411, 739, 1129, 907]] }; // the two banners (the links): the picture over the painting, the two tap areas and the painted area, in picture pixels (left, top, right, bottom)
  const tool = (x, key, name, link, plate, more) => Object.assign({ x, key, leave: key + 25, floor: WF, zw: WZ, name, links: link ? [{ t: "Code for " + link, href: GHUB + link }] : [], plate }, more);
  const U4 = [
    tool(42.2, 700, "Self-hosted platform", null, "<b>Self-hosted platform</b>My own server with web apps, a TV app and a job tool. Built alone.",
      { art: ["assets/self_wall.webp", 4.2, 3.8, [776, 488], 1.7, [[247, 89, 1305, 400], [420, 290, 1175, 888]]], marks: [] }),
    tool(48.7, 770, "ttoolbox", "ttoolbox", "<b>ttoolbox</b>Claude Code plugin with skills and agents to plan, build, review and prove work.",
      { art: ["assets/ttoolbox_wall.webp", 5.6, 3.7, [754, 507], 1.5, [[136, 309, 1372, 706]]], marks: [[180, 620, 360, 706]] }),
    tool(55.2, 840, "dot", "dot", "<b>dot</b>Keeps one GNU Stow dotfiles repo the same on every Linux PC.",
      { art: ["assets/dot_wall.webp", 5, 3.7, [756, 524], 1.5, [[140, 164, 1373, 885]]], marks: [[140, 735, 372, 860]] }),
    tool(61.7, 910, "tthermal", "tthermal", "<b>tthermal</b>Omarchy bar plugin that keeps an Intel laptop under a temperature you choose.",
      { leave: 910, art: ["assets/tthermal_wall.webp", 5.6, 3.4, [775, 525], 1.5, [[104, 254, 1447, 796]]], marks: [[162, 675, 390, 775]] }),
    { x: 75, key: 1045, leave: 1045, floor: G3, name: "app-utveckling.se", links: [{ t: "app-utveckling.se", href: "https://app-utveckling.se" }, { t: "mjukvaruutvecklare.com", href: "https://mjukvaruutvecklare.com" }],
      art: ["assets/edge_wall.webp", 6.6, 3.5, [714, 518], 1.9, [[20, 200, 1409, 745], ...EDGE_V.areas]], ov: EDGE_V.ov, marks: EDGE_V.marks,
      plate: "<b>app-utveckling.se</b>Two landing pages for EDGE Associates, on one code base. Work project, built alone." } ];
  U4.forEach((u, i) => { const [file, wL, wP, c, y, areas, z = .002] = u.art; u.zw = u.zw || 0; u.B = paintOn(file, N_ ? wP : wL, c, [u.x, u.floor + (N_ && u.yP || y)], z, undefined, u.zw); if (u.ov) { u.O = paintOn(u.ov, N_ ? wP : wL, c, [u.x, u.floor + (N_ && u.yP || y)], z + .001, undefined, u.zw); u.O.m.renderOrder = 2; } areas.forEach((a, j) => u.B.protect(u.name + "'s painting" + (j ? " " + (j + 1) : ""), a));
    u.bb = [0, 1, 2, 3].map(n => Math[n < 2 ? "min" : "max"](...areas.map(a => a[n]))); u.start = 0; // the painted area as one box
    u.links.forEach((l, j) => l.box = u.marks[j]);
    { const [key, colour, stack0] = { "Self-hosted platform": ["self", "#2d3a5c", ["TypeScript", "Next.js", "Hono", "SQLite", "Java", "Docker", "Caddy", "Tailscale"]], ttoolbox: ["ttoolbox", "#c8402a", ["Claude Code", "Python", "Bash"]],
        dot: ["dot", "#25407a", ["Bash", "bats", "GNU Stow", "mise"]], tthermal: ["tthermal", "#d8435f", ["JavaScript", "QML", "Shell"]], "app-utveckling.se": ["edge", "#1f5fc4", ["Astro", "TypeScript"]] }[u.name];
      const stack = u.painted ? [] : stack0, yb = u.B.at(0, u.bb[3]).y; // painted: the picture has its stack written in // beside the painting on a laptop; under it, above the floor, on a phone
      if (N_) { // (Tom 11-19) phone: under the painting, above the floor: the numbers big in the piece's style, then each tool its own tag, staggered
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
  document.querySelector(".hud").insertAdjacentHTML("beforeend", '<p class="head">Self-hosted platform: my own server with web apps, a TV app and a job tool. ttoolbox: a Claude Code plugin to plan, build, review and prove work. dot: keeps one dotfiles repo the same on every Linux PC. tthermal: an Omarchy bar plugin that keeps an Intel laptop under a temperature you choose. app-utveckling.se: two landing pages for EDGE Associates. Write to me: the form at the end, or GitHub and LinkedIn.</p>');

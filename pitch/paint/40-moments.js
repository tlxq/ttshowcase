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
    const R = ([u0, v0, u1, v1]) => [RVP.at(u0, 0).x, RVP.at(0, v1).y, RVP.at(u1, 0).x, RVP.at(0, v0).y];
    RVF_TAGS = []; // the stack is in the painting
  }
  const lamp3 = new THREE.SpotLight(0xfff3e6, 0, 30, .62, .75, 1.3); lamp3.position.set(RX - 9, 3.8 - 2 * DROP, 4.4); lamp3.target.position.set(RX - 1.6, .3 - 2 * DROP, 0); lamp3.castShadow = false; scene.add(lamp3, lamp3.target);
  document.querySelector(".hud").insertAdjacentHTML("beforeend", '<a class="hot" id="hot3" href="https://raddavarfruberga.se" target="_blank" rel="noopener" aria-label="Open the site" tabindex="-1"></a>'
    + '<div class="tag facts" id="tagRvf"><b>raddavarfruberga.se</b>A site to collect signatures so 20 children keep their preschool places.</div>');
  const hot3 = document.getElementById("hot3"), tagRvf = document.getElementById("tagRvf");
  svg.insertAdjacentHTML("beforeend", '<line id="l7"/><circle id="c7" r="4"/>'); const l7 = svg.querySelector("#l7"), c7 = svg.querySelector("#c7");
  let rvfStart = 0; const RVF_END = 1.1; // the label comes once the banner's words are on
  let endK = 0; // how far the camera has left raddavarfruberga for the manhole
  function rvfAt(now, walk3, end3) {
    lens.uniforms.uAper.value = 1 - .8 * walk3; const on = walk3 > .02; lamp3.intensity = 5 * sm(cl((walk3 - .1) / .3));
    if (introOver && walk3 > .3 && !rvfStart) rvfStart = now; // once per visit, while the camera is still coming in, so the cloth is never seen empty (Tom 11-25)
    const sec = rvfStart ? (REDUCED ? 99 : (now - rvfStart) / 1000) : -1;
    const showL = sec > RVF_END + .2 && walk3 > .5 && end3 < .5; [tagRvf, l7, c7].forEach(e => e.style.opacity = showL ? 1 : 0);
    if (on) pin(tagRvf, l7, c7, NARROW ? V(RX - .84, G3 + .1, .3) : RVP.at(1194, 905), NARROW ? 14 : 8, NARROW ? 70 : 34); // below the painting's foot, on the dark street, where the neon box has room
    RVF_PAINT(REDUCED ? 1 : sec < 0 ? 0 : cl(sec / .9)); RVF_TAGS.forEach((t, i) => t.fade(showL && sec > RVF_END + .2 + i * .3));
    placeHots([hot3], [RVF_BOX], RVP, sec >= .3 && walk3 > .5 && endK < .5); } // the banner is the link, once the camera is at the wall

  // ---- the ending (storyboard 11-16): past raddavarfruberga a hatch in the pavement, steps down along the wall into a workshop under the street.
  // In it Tom's own tools in a row, biggest first: the self-hosted platform, ttoolbox, dot, tthermal. Steps up at the far end climb out to EDGE,
  // on its own clean wall (a printed sheet, no tag); then on along the wall, in close to its bare concrete, and out at the visitors' wall, where the
  // walk began (Tom 11-23: no flash, no landing).
  // Words from src/content/look.ts and the repos' own descriptions. Signs are drawn once and shown by time (reveal).
  const conc = (w, h, x0, y0, col) => new THREE.MeshStandardMaterial({ map: tex("assets/wall4_diff.jpg", true, w / TILE, h / TILE, (x0 + 21) / TILE, (y0 - GROUND) / TILE),
    normalMap: tex("assets/wall4_nor_gl.jpg", false, w / TILE, h / TILE, (x0 + 21) / TILE, (y0 - GROUND) / TILE), color: col, roughness: .92, envMapIntensity: .2 });
  const slab = (x0, x1, y0, y1, z0, z1, m) => { const b = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), m); b.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); scene.add(b); return b; };
  // the room: 1.5 m of ground above it, plain walls round it; the shafts cut through (MANHOLE_CUT)
  { const ceil = conc(CX1 - HX0, RZ, HX0, 0, 0x55575b); ceil.emissive = new THREE.Color(0x0b0c0f);
    ceil.onBeforeCompile = sh => { sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vWP;").replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.)).xyz;");
      sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec3 vWP;").replace("#include <map_fragment>", "#include <map_fragment>\n" + MANHOLE_CUT)
        // F-81-4: the tubes hang just under the ceiling, so they light it round them; unlit, a phone's tall view showed it as a black band over every piece
        .replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\nif (vWP.y < " + (DY + .02).toFixed(2) + ") { float g = 0.;" + TUBES.map(x => ` g += exp(-pow(vWP.x - ${x.toFixed(2)}, 2.) / 5. - pow(vWP.z - 1.1, 2.) / 14.);`).join("") + " totalEmissiveRadiance += vec3(.87, .91, 1.) * " + CEIL_GLOW.toFixed(2) + " * g * (.6 + 2. * diffuseColor.rgb); }"); };
    slab(HX0, CX1, DY, G3 - .01, 0, RZ + .3, ceil);
    const side = conc(RZ, G3 - WF, 0, WF, 0x8d8f93), h = G3 - WF;
    for (const [x, ry] of [[HX0, Math.PI / 2], [CX1, -Math.PI / 2]]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(RZ + .3, h), side); m.rotation.y = ry; m.position.set(x, WF + h / 2, (RZ + .3) / 2); scene.add(m); }
    const front = new THREE.Mesh(new THREE.PlaneGeometry(CX1 - HX0, h), conc(CX1 - HX0, h, HX0, WF, 0x7d7f83)); front.rotation.y = Math.PI; front.position.set((HX0 + CX1) / 2, WF + h / 2, RZ); scene.add(front); }
  const floorM = conc(CX1 - HX0, RZ, HX0, 0, 0x6c6e72); floorM.roughness = .7; floorM.envMapIntensity = .35;
  slab(HX0, CX1, WF - .3, WF, 0, RZ, floorM);
  // the manholes: a cast-iron cover in a ring on the pavement, a round concrete shaft, iron rungs down its wall side and on down into the room
  const iron = new THREE.MeshStandardMaterial({ color: 0x2c2b29, metalness: .7, roughness: .6, envMapIntensity: .7 });
  const coverTex = (() => { const c = document.createElement("canvas"); c.width = c.height = 256; const g = c.getContext("2d"); g.fillStyle = "#000"; g.fillRect(0, 0, 256, 256);
    g.translate(128, 128); g.strokeStyle = "#fff"; g.lineWidth = 7; for (const r of [120, 92]) { g.beginPath(); g.arc(0, 0, r, 0, 6.283); g.stroke(); }
    g.save(); g.beginPath(); g.arc(0, 0, 86, 0, 6.283); g.clip(); g.lineWidth = 6; for (let k = -88; k <= 88; k += 16) { g.beginPath(); g.moveTo(k, -90); g.lineTo(k, 90); g.stroke(); g.beginPath(); g.moveTo(-90, k); g.lineTo(90, k); g.stroke(); } g.restore(); // the raised grid of a street cover
    for (let a = 0; a < 6.283; a += .2618) { g.save(); g.rotate(a); g.fillStyle = "#fff"; g.fillRect(96, -3, 20, 6); g.restore(); }
    return new THREE.CanvasTexture(c); })();
  const coverM = new THREE.MeshStandardMaterial({ color: 0x4a4440, metalness: .65, roughness: .55, bumpMap: coverTex, bumpScale: 2, envMapIntensity: .8 });
  const rungM = new THREE.MeshStandardMaterial({ color: 0x6b5a48, metalness: .8, roughness: .5 }), shaftM = conc(2 * Math.PI * MR, G3 - DY, 0, DY, 0x5c5e62); shaftM.side = THREE.BackSide;
  const covers = [MX_IN, MX_OUT].map((x, i) => {
    const ring = new THREE.Mesh(new THREE.RingGeometry(MR - .005, MR + .07, 40), iron); ring.rotation.x = -Math.PI / 2; ring.position.set(x, G3 + .006, MZ); scene.add(ring);
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(MR, MR, G3 - DY, 32, 1, true), shaftM); shaft.position.set(x, (G3 + DY) / 2, MZ); scene.add(shaft);
    for (let y = G3 - .3; y > WF + .2; y -= .3) { const r = new THREE.Mesh(new THREE.CylinderGeometry(.016, .016, .36, 8), rungM); r.rotation.z = Math.PI / 2; r.position.set(x, y, MZ - MR + .09); scene.add(r); }
    for (const dx of [-.18, .18]) { const rl = new THREE.Mesh(new THREE.CylinderGeometry(.02, .02, DY - WF, 8), rungM); rl.position.set(x + dx, (DY + WF) / 2, MZ - MR + .09); scene.add(rl);
      for (const y of [DY - .4, WF + 1.2]) { const st = new THREE.Mesh(new THREE.CylinderGeometry(.018, .018, MZ - MR + .09, 8), rungM); st.rotation.x = Math.PI / 2; st.position.set(x + dx, y, (MZ - MR + .09) / 2); scene.add(st); } } // stays back to the wall
    const cover = new THREE.Mesh(new THREE.CylinderGeometry(MR + .04, MR + .04, .05, 40), [coverM, coverM, coverM]); cover.position.set(x, G3 + .02, MZ); scene.add(cover);
    return { x, cover }; });
  // a street lamp's pool over the cover you are near, so you see it open; it fades as you go down or walk on
  const manL = new THREE.SpotLight(0xffd9a8, 0, 9, .55, .7, 1.4); scene.add(manL, manL.target);
  function manAt(cp) { const c = Math.abs(cp.x - MX_IN) < Math.abs(cp.x - MX_OUT) ? MX_IN : MX_OUT, d = Math.abs(cp.x - c);
    manL.position.set(c - 1.2, G3 + 4.2, MZ + 2.4); manL.target.position.set(c + .3, c === MX_OUT ? WF + 1 : G3, MZ); manL.distance = c === MX_OUT ? 13 : 9; const down = c === MX_OUT ? 1 : sm(cl((cp.y - G3 + .5) / 1.2)); // going down you leave it behind; the far one shines down its shaft once the cover is off
    manL.intensity = 9 * (1 - sm(cl((d - 1.5) / 5))) * down * (introOver ? 1 : 0); }
  // tube lights under the ceiling, close to the wall; one of them flickers
  const fixM = new THREE.MeshStandardMaterial({ color: 0x2a2c2f, metalness: .5, roughness: .5 }), tubeM = new THREE.MeshStandardMaterial({ color: 0, emissive: 0xdfe9ff, emissiveIntensity: 2.4 }), tubeBad = tubeM.clone();
  const TUBES = [38.6, 44.5, 50.5, 56.5, 61.6], CEIL_GLOW = .22; // CEIL_GLOW: how bright the ceiling is right round a tube (F-81-4)
  TUBES.forEach((x, i) => { const f = new THREE.Mesh(new THREE.BoxGeometry(1.3, .05, .13), fixM); f.position.set(x, DY - .03, 1.1); const t = new THREE.Mesh(new THREE.BoxGeometry(1.18, .026, .06), i === 3 ? tubeBad : tubeM); t.position.set(x, DY - .066, 1.1); scene.add(f, t); });
  const tubeLight = new THREE.SpotLight(0xdce8ff, 0, 10, 1.15, .75, 1.6); scene.add(tubeLight, tubeLight.target);
  const roomFill = new THREE.PointLight(0xdce8ff, 0, 11, 1.6); scene.add(roomFill); // the tubes ahead light the room, so the steps and the floor show on the way down and up
  // a conduit along the wall under the ceiling, from piece to piece
  const pipeM = new THREE.MeshStandardMaterial({ color: 0x6f7377, metalness: .7, roughness: .45 });
  const pipe = (a, b, r = .022) => { const d = b.clone().sub(a), m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, d.length(), 8), pipeM); m.position.copy(a).addScaledVector(d, .5); m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); scene.add(m); return m; };
  pipe(V(HX0 + .2, DY - .14, .06), V(CX1 - .2, DY - .14, .06));
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
  const EDGE_X = 75, EDGE_W = NARROW ? 3.7 : 6.2, EDGE_H = 4;
  // Tom 11-24: no lamp fixture over EDGE (a lamp on a bare wall made no sense); its light stays, from the street
  const edgeL = new THREE.SpotLight(0xfff0dc, 0, 12, 1.15, 1, 1.2); edgeL.position.set(EDGE_X, G3 + EDGE_H - .2, 1.15); edgeL.target.position.set(EDGE_X, G3 + 1.7, 0); scene.add(edgeL, edgeL.target);
  const GHUB = "https://github.com/tlxq/";
  // where each one stands (laptop / phone): four tools in the workshop, then EDGE. key: the scroll (vh) where the camera has arrived,
  // leave: where it starts to go on. The camera stops in front of each. Each has its painting (Tom 11-19, one artist per wall): art = [file, picture m wide on a
  // laptop, on a phone, the picture pixel that stands at the stop, its height over the floor, the painted areas (picture pixels: left, top, right, bottom)];
  // the link marks are picture pixels too.
  const N_ = NARROW;
  const EDGE_V = { ov: "assets/edge_banner.webp", marks: [[481, 739, 1059, 821], [411, 825, 1129, 907]], areas: [[411, 739, 1129, 907]] }; // the two banners (the links): the picture over the painting, the two tap areas and the painted area, in picture pixels (left, top, right, bottom)
  const tool = (x, key, name, link, plate, more) => Object.assign({ x, key, leave: key + 25, floor: WF, name, links: link ? [{ t: "Code for " + link, href: GHUB + link }] : [], plate }, more);
  const U4 = [
    tool(41, 700, "Self-hosted platform", null, "<b>Self-hosted platform</b>My own server with web apps, a TV app and a job tool. Built alone.",
      { art: ["assets/self_wall.webp", 4.2, 3.8, [776, 488], 1.7, [[247, 89, 1305, 400], [420, 290, 1175, 888]]], marks: [] }),
    tool(47.5, 770, "ttoolbox", "ttoolbox", "<b>ttoolbox</b>Claude Code plugin with skills and agents to plan, build, review and prove work.",
      { art: ["assets/ttoolbox_wall.webp", 5.6, 3.7, [754, 507], 1.5, [[136, 309, 1372, 706]]], marks: [[180, 620, 360, 706]] }),
    tool(54, 840, "dot", "dot", "<b>dot</b>Keeps one GNU Stow dotfiles repo the same on every Linux PC.",
      { art: ["assets/dot_wall.webp", 5, 3.7, [756, 524], 1.5, [[140, 164, 1373, 885]]], marks: [[140, 735, 372, 860]] }),
    tool(60.5, 910, "tthermal", "tthermal", "<b>tthermal</b>Omarchy bar plugin that keeps an Intel laptop under a temperature you choose.",
      { leave: 935, art: ["assets/tthermal_wall.webp", 5.6, 3.4, [775, 525], 1.5, [[104, 254, 1447, 796]]], marks: [[162, 675, 390, 775]] }),
    { x: 75, key: 1045, leave: 1045, floor: G3, name: "app-utveckling.se", links: [{ t: "app-utveckling.se", href: "https://app-utveckling.se" }, { t: "mjukvaruutvecklare.com", href: "https://mjukvaruutvecklare.com" }],
      art: ["assets/edge_wall.webp", 6.6, 3.5, [714, 518], 1.9, [[20, 200, 1409, 745], ...EDGE_V.areas]], ov: EDGE_V.ov, marks: EDGE_V.marks,
      plate: "<b>app-utveckling.se</b>Two landing pages for EDGE Associates, on one code base. Work project, built alone." } ];
  U4.forEach((u, i) => { const [file, wL, wP, c, y, areas, z = .002] = u.art; u.B = paintOn(file, N_ ? wP : wL, c, [u.x, u.floor + y], z); if (u.ov) { u.O = paintOn(u.ov, N_ ? wP : wL, c, [u.x, u.floor + y], z + .001); u.O.m.renderOrder = 2; } areas.forEach((a, j) => u.B.protect(u.name + "'s painting" + (j ? " " + (j + 1) : ""), a));
    u.bb = [0, 1, 2, 3].map(n => Math[n < 2 ? "min" : "max"](...areas.map(a => a[n]))); u.start = 0; // the painted area as one box
    u.links.forEach((l, j) => l.box = u.marks[j]);
    { const [key, colour, stack] = { "Self-hosted platform": ["self", "#2d3a5c", ["TypeScript", "Next.js", "Hono", "SQLite", "Java", "Docker", "Caddy", "Tailscale"]], ttoolbox: ["ttoolbox", "#c8402a", ["Claude Code", "Python", "Bash"]],
        dot: ["dot", "#25407a", ["Bash", "bats", "GNU Stow", "mise"]], tthermal: ["tthermal", "#d8435f", ["JavaScript", "QML", "Shell"]], "app-utveckling.se": ["edge", "#1f5fc4", ["Astro", "TypeScript"]] }[u.name];
      const xr = u.B.at(u.bb[2], 0).x, yb = u.B.at(0, u.bb[3]).y, ym = u.B.at(0, (u.bb[1] + u.bb[3]) / 2).y; // beside the painting on a laptop; under it, above the floor, on a phone
      if (N_) { // (Tom 11-19) phone: under the painting, above the floor: the numbers big in the piece's style, then each tool its own tag, staggered
        const z = (u.art[6] || 0) + .004, top = yb - .04, bot = u.floor + .06, hg = top - bot, nums = (LIVE[key] || []).length, nh = nums ? hg * .58 : 0, long = (LIVE[key] || []).some(s => s.word[1].length > 12);
        const per = Math.ceil(stack.length / (stack.length > 4 ? 2 : 1)), rows = Math.ceil(stack.length / per), th = (hg - nh) / rows, tw = 2.8 / per;
        u.parts = [...[...Array(nums).keys()].map(i => makeSpray({ key, only: i, name: u.name + "'s number " + (i + 1), colour: "#f3ead8", piece: colour, font: '"Clash Display", sans-serif', weight: 700, stack: [], row: true, inline: true, z,
            rect: long ? [u.x - 1.4, top - (i + 1) * nh / nums, u.x + 1.4, top - i * nh / nums] : [u.x - 1.4 + i * 2.8 / nums + .05, top - nh, u.x - 1.4 + (i + 1) * 2.8 / nums - .05, top] })), // a long word: each number its own line
          ...stack.map((t, i) => { const r = Math.floor(i / per), c = i % per, y = top - nh - (r + 1) * th + (c % 2 ? th * .12 : 0);
            return makeSpray({ key: key + "Tag" + i, name: u.name + "'s tag " + t, colour: key === "edge" ? (i % 2 ? INK_LIGHT : INK_BLUE) : i % 2 ? (key === "ttoolbox" ? "#f3ead8" : "#20232b") : colour, /* EDGE (Tom 11-24): on the concrete now, light paint so the words read; ttoolbox: its dark word sat on the dark strip (audit A10) */ stack: [t], row: true, fill: .8, z, rect: [u.x - 1.4 + c * tw, y, u.x - 1.4 + (c + 1) * tw, y + th * .88] }); })]; }
      else { // (Tom 11-19) laptop: the numbers painted big in the piece's style on the right, one over the other; each tool its own tag on the sides, staggered
        const [b0, b1, b2, b3] = u.bb, bh = b3 - b1, R = ([p0, q0, p1, q1]) => [u.B.at(p0, 0).x, u.B.at(0, q1).y, u.B.at(p1, 0).x, u.B.at(0, q0).y], nums = (LIVE[key] || []).length;
        const NUM = i => makeSpray({ key, only: i, name: u.name + "'s number " + (i + 1), colour: "#f3ead8", piece: colour, font: '"Clash Display", sans-serif', weight: 700, stack: [], row: true, rect: R([b2 + 30, b1 + i * bh / 2, b2 + 340, b1 + (i + 1) * bh / 2 - 30]) }); // inside what the camera sees beside a wide painting
        const wide = key === "ttoolbox", bw = b2 - b0; // the wide paintings fill the camera's view: their tags go in the strip above the letters
        const slots = key === "edge" ? [[b0 + 10, 800], [b2 - 255, 800]] /* EDGE: either side of the two links */ : wide ? stack.map((t, i) => [b0 + (i + .5) * bw / stack.length - 160, b1 - 175 + (i % 2) * 30]) : [[b0 - 310, b1], [b0 - 270, b1 + bh * .27], [b0 - 315, b1 + bh * .52], [b0 - 275, b1 + bh * .78], [b2 + 40, b1 + bh * .05], [b2 + 90, b1 + bh * .3], [b2 + 30, b1 + bh * .55], [b2 + 80, b1 + bh * .8]];
        const left = wide ? slots : nums ? slots.slice(0, 4) : slots, order = slots.length === 8 ? [0, 4, 1, 5, 2, 6, 3, 7] : [...slots.keys()]; // with numbers the right side is theirs
        u.parts = [...[...Array(nums).keys()].map(NUM), ...stack.map((t, i) => { const [p, q] = (nums ? left : order.map(k => slots[k]))[i % (nums ? left.length : order.length)];
          return makeSpray({ key: key + "Tag" + i, name: u.name + "'s tag " + t, colour: key === "edge" ? (i % 2 ? INK_LIGHT : INK_BLUE) : i % 2 ? "#20232b" : colour, /* EDGE (Tom 11-24): on the concrete now, light paint so the words read */ stack: [t], row: true, fill: .62, z: (u.art[6] || 0) + .004, rect: R([p, q, p + (key === "edge" ? 250 : 300), q + 95]) }); })]; } }
    u.hots = u.links.map((l, j) => { const a = document.createElement("a"); a.className = "hot"; a.href = l.href; a.target = "_blank"; a.rel = "noopener"; a.setAttribute("aria-label", l.t); a.tabIndex = -1; a.style.display = "none"; document.querySelector(".hud").append(a); return a; });
    if (u.plate) { const el = document.createElement("div"); el.className = "tag facts"; el.innerHTML = u.plate; document.querySelector(".hud").append(el); u.el = el;
      svg.insertAdjacentHTML("beforeend", `<line id="lu${i}"/><circle id="cu${i}" r="4"/>`); u.l = svg.querySelector("#lu" + i); u.c = svg.querySelector("#cu" + i); } });
  document.querySelector(".hud").insertAdjacentHTML("beforeend", '<p class="head">Self-hosted platform: my own server with web apps, a TV app and a job tool. ttoolbox: a Claude Code plugin to plan, build, review and prove work. dot: keeps one dotfiles repo the same on every Linux PC. tthermal: an Omarchy bar plugin that keeps an Intel laptop under a temperature you choose. app-utveckling.se: two landing pages for EDGE Associates. Write to me: the form at the end, or GitHub and LinkedIn.</p>');

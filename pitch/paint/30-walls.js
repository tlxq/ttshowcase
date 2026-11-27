  // ---- moments 2 and 3: the street's one production (Tom 11-27): epaRadar and raddavarfruberga on ONE painted wall, 4000 x 1120 px, painted on the desk's graphics card (CREDITS.txt): the two
  // pieces, the car and the house, the stack handwritten into the paint. The live numbers are written on it at run time in a second hand (the notes below). The wall is one flat stretch of
  // street wall at G3 (Tom 11-27: no stairs or bridge between the pieces; the street's two flights of steps are before it), in two pictures that overlap by 150 px and fade into each other
  // (street_0: wall pixels 120 to 2100, street_1: 1950 to 4000), so no seam shows. Both come after the tip (LATE), like the garage's.
  // The wall's own pixel (px, py) is at x = WX_(px), y = G3 + (WALL_FOOT - py) * SPX: a pixel is 4.2 mm, the pieces' foot (row 1065) stands on the street.
  const SPX = .0042, WALL_FOOT = 1065, WALL_X0 = 17.4, WX_ = px => WALL_X0 + px * SPX, ST_A0 = 120, ST_B0 = 1950, TA = px => px - ST_A0, TB = px => px - ST_B0; // ST_A0, ST_B0: the wall pixel each picture starts at
  const EX = WX_(1068), EW = 7.6, EH = 1120 * SPX, EY = G3 + (WALL_FOOT - 560) * SPX; // the first stop's frame: epaRadar's piece with its car stands round (EX, EY)
  const RX = WX_(2895); // raddavarfruberga's piece: its middle on the wall (the old stop stood at x 29.1)
  // The other six paintings (Tom 11-19, one artist per wall) go on their walls the same way: painted on the desk's graphics card (CREDITS.txt), the bare
  // concrete keyed out so the wall shows through, 1536 x 960 px each. paintOn puts picture pixel (px, py) at the wall point (wx, wy), the picture w m wide.
  // at(u, v) is any picture pixel in the wall's own space; the link marks and the painted areas are in picture pixels. The wall's own hole (moment 3) cuts through it too.
  // zw: the wall's own place in depth (the workshop's back wall stands at WZ)
  function paintOn(file, w, [px, py], [wx, wy], z = .002, [pw, ph] = [1536, 960], zw = 0) { const h = w * ph / pw, k = w / pw, cx = wx - px * k + w / 2, cy = wy + py * k - h / 2, map = tex(file, true, 1, 1, 0, 0, true); map.wrapS = map.wrapT = THREE.ClampToEdgeWrapping;
    // the bumps are the street concrete's (its joints included): a painting on the workshop's back wall (zw) gets none, as that wall is smooth blocks
    // (Tom 11-26: a dark line across the Toolbox paintings at waist height was the street wall's joint, drawn where the block wall has none)
    const mat = new THREE.MeshStandardMaterial({ map, transparent: true, depthWrite: false, roughness: .55, polygonOffset: true, polygonOffsetFactor: -2 });
    if (!zw) Object.assign(mat, { normalMap: tex("assets/wall4_nor_gl.jpg", false, w / TILE, h / TILE, (cx - w / 2 - (WX - WW / 2) - (cx > CX1 ? SEAM_D.x : 0)) / TILE, (cy - h / 2 - GROUND - (cx > CX1 ? SEAM_D.y : 0)) / TILE), normalScale: new THREE.Vector2(.4, .4) });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), zw ? mat : wallBump(mat));
    m.position.set(cx, cy, zw + z); scene.add(m);
    const at = (u, v) => V(cx - w / 2 + u * k, cy + h / 2 - v * k, zw);
    return { m, at, w, h, k, ready: () => texReady(file), protect: (name, [x0, y0, x1, y1]) => PROT.push([name, at(x0, y1), at(x1, y0)]), zw }; }
  // the street's two pictures and what is on them, in the picture's own pixels (the wall's pixel minus ST_A0 / ST_B0)
  const EP = paintOn("assets/street_0.webp", 1980 * SPX, [0, WALL_FOOT], [WX_(ST_A0), G3], .002, [1980, 1120]), RVP = paintOn("assets/street_1.webp", 2050 * SPX, [0, WALL_FOOT], [WX_(ST_B0), G3], .002, [2050, 1120]);
  RVP.m.renderOrder = 1; // over the left picture: in the overlap the two add up to the painted alpha only when the right one is drawn second
  const EPAN = EP, EPA_MARKS = [[TA(318), 418, TA(1632), 822], [TA(1632), 500, TA(2002), 812]], EPAB = EP, RVF_BOX = [TB(1998), 428, TB(3472), 852]; // the links: epaRadar's name (the site) and its car (the code); raddavarfruberga's name (the site)
  EP.protect("epaRadar's name", EPA_MARKS[0]); EP.protect("epaRadar's car", EPA_MARKS[1]); RVP.protect("raddavarfruberga's name", RVF_BOX); RVP.protect("raddavarfruberga's house", [TB(3478), 520, TB(3792), 812]);
  EP.protect("epaRadar's production", [TA(134), 12, TA(2002), 1120]); RVP.protect("raddavarfruberga's production", [TB(2000), 12, TB(3999), 1120]); // each whole piece with its clouds and tags (the framing check: the whole piece is on the screen at its stop)
  // the pictures come up on the wall together once both are in (like the garage's pieces, 80-admin.js): never before their picture, and not before the tip
  const ST = [EP, RVP].map(B => (B.m.visible = false, { B, k: 0 })); let stStart = 0;
  function streetAt(now) { if (!stStart && introOver && EP.ready() && RVP.ready()) { stStart = now; root.dataset.started = (+root.dataset.started || 0) + 2; } // once per visit; the checks count it
    const sec = stStart ? (REDUCED ? 99 : (now - stStart) / 1000) : -1, k = sec < 0 ? 0 : REDUCED ? 1 : sm(cl((sec - .35) / .8));
    for (const s of ST) { s.k = k; s.B.m.visible = k > 0; s.B.m.material.opacity = k; }
    // the notes are sprayed on when they come into view (the camera has reached the first stop), a little after one another, and stay while in view
    NOTE_PARTS.forEach((p, i) => { const [sx, , ok] = proj(p.mesh.position), on = k >= 1 && stencilAt > 0 && ok && sx > -.05 * innerWidth && sx < 1.05 * innerWidth; if (!on) p.seen = 0; else if (!p.seen) p.seen = now; p.fade(on && (REDUCED || now - p.seen > 250 + i * 110)); }); }
  // the tap areas over painted link marks (picture pixels): each at least 48 x 48 px; two marks that sit close share the line between them (each grows away from it), so they never overlap.
  // Each shows while its own mark is in view (on), and is out of the tab order otherwise.
  function placeHots(els, boxes, B, on) { const R = boxes.map(([x0, y0, x1, y1]) => { const [ax, ay, oa] = proj(B.at(x0, y0)), [bx, by, ob] = proj(B.at(x1, y1)), l = Math.min(ax, bx), r = Math.max(ax, bx), t = Math.min(ay, by), b = Math.max(ay, by),
      w = Math.max(48, r - l + 8), h = Math.max(48, b - t), cx = (l + r) / 2, cy = (t + b) / 2;
      return { ok: on && oa && ob && r > 0 && l < innerWidth && b > 0 && t < innerHeight, l: cx - w / 2, r: cx + w / 2, t: cy - h / 2, b: cy + h / 2, cx, cy }; });
    for (let i = 0; i < R.length; i++) for (let j = i + 1; j < R.length; j++) { const a = R[i], c = R[j]; if (!a.ok || !c.ok || Math.min(a.r, c.r) <= Math.max(a.l, c.l) || Math.min(a.b, c.b) <= Math.max(a.t, c.t)) continue;
      if (Math.abs(a.cy - c.cy) >= Math.abs(a.cx - c.cx)) { const [u, d] = a.cy < c.cy ? [a, c] : [c, a], seam = (u.cy + d.cy) / 2; u.b = seam; u.t = Math.min(u.t, seam - 48); d.t = seam; d.b = Math.max(d.b, seam + 48); }
      else { const [u, d] = a.cx < c.cx ? [a, c] : [c, a], seam = (u.cx + d.cx) / 2; u.r = seam; u.l = Math.min(u.l, seam - 48); d.l = seam; d.r = Math.max(d.r, seam + 48); } }
    els.forEach((h, i) => { const g = R[i]; if (!g.ok) { h.style.display = "none"; h.tabIndex = -1; return; }
      Object.assign(h.style, { display: "block", left: g.l + "px", top: g.t + "px", width: g.r - g.l + "px", height: g.b - g.t + "px" }); h.tabIndex = 0; }); }
  // ---- live numbers sprayed on the walls (Tom 11-19). RULE: every visible number comes from a PUBLIC source, asked when the page loads; nothing is typed in or baked into a picture.
  // If it fails that number is not drawn (no old value, no placeholder) and the wall still looks complete (the stack stays).
  // EDGE is private, so it shows no numbers. raddavarfruberga's counts are public-safe counts of a private repository (api/github.ts, with the site's token): without the token the answer has no rvf and its notes are not drawn.
  // The page asks this site's /api/github (api/github.ts), which asks GitHub once an hour for everyone: a visitor's own address may make only 60 anonymous asks an hour, and past that every load logged 403 errors in the console.
  const NUMS = fetch("/api/github").then(r => { if (!r.ok) throw 0; return r.json(); }).catch(() => ({})); // one ask for all walls; no answer = no numbers
  const numOf = (wall, key) => NUMS.then(d => { const n = d?.[wall]?.[key]; if (!(n > 0)) throw 0; return n; });
  const LIVE = { // wall: [singular, plural, how to get it]
    dot: [["commit", "commits", () => numOf("dot", "commits")], ["test", "tests", () => numOf("dot", "tests")]],
    ttoolbox: [["commit", "commits", () => numOf("ttoolbox", "commits")], ["skill", "skills", () => numOf("ttoolbox", "skills")]],
    tthermal: [["commit", "commits", () => numOf("tthermal", "commits")], ["merged pull request", "merged pull requests", () => numOf("tthermal", "merged")]],
    epa: [["commit", "commits", () => numOf("epa", "commits")], ["merged pull request", "merged pull requests", () => numOf("epa", "merged")], ["test", "tests", () => numOf("epa", "tests")], ["migration", "migrations", () => numOf("epa", "migrations")]],
    rvf: [["commit", "commits", () => numOf("rvf", "commits")], ["merged pull request", "merged pull requests", () => numOf("rvf", "merged")]] }; // rvf: only with GitHub's token (api/github.ts); without it the answer has no rvf and neither note is drawn
  const SPRAYS = {}, liveHead = document.createElement("p"); liveHead.className = "head"; liveHead.id = "liveHead"; document.querySelector(".hud").append(liveHead);
  const liveText = () => liveHead.textContent = Object.entries(LIVE).map(([k, a]) => { const got = a.filter(s => s.n != null).map(s => `${s.n.toLocaleString("en-US")} ${s.n === 1 ? s.word[0] : s.word[1]}`); return got.length ? `${{ epa: "epaRadar", rvf: "raddavarfruberga" }[k] || k}: ${got.join(", ")}.` : ""; }).filter(Boolean).join(" ");
  for (const [key, defs] of Object.entries(LIVE)) { LIVE[key] = defs.map(([one, many, get]) => ({ word: [one, many], n: null })); // fetched now, once per page load
    defs.forEach(([, , get], i) => get().then(n => { LIVE[key][i].n = n; SPRAYS[key]?.forEach(sp => sp.draw()); liveText(); }).catch(() => {})); } // a failed fetch leaves n empty: nothing is drawn for it
  // a sprayed text on a wall: canvas drawn at runtime (a soft overspray halo, a speckle round the edges, a few drips), laid on the wall like a painting.
  // o: key (LIVE's), colour, stack (words), rect (wall space: x0, y0, x1, y1), row (stats side by side, else one under the other), name (for the plates check)
  const SPRAY_FONT = '"Saira Stencil One", sans-serif';
  // painted glyphs for live numbers (Tom 11-25): the digits and words in the tag hand, one picture; [x, y, w, h] each, all 160 px tall (tests and skills added 11-26 for the Toolbox)
  const GLYPH = new Image(), GLYPH_AT = {"0":[0,0,105,160],"1":[113,0,95,160],"2":[216,0,134,160],"3":[358,0,123,160],"4":[489,0,136,160],"5":[633,0,136,160],"6":[777,0,109,160],"7":[894,0,121,160],"8":[1023,0,109,160],"9":[1140,0,100,160],"commits":[1248,0,614,160],"merged":[0,168,406,160],"pull requests":[414,168,616,160],"tests":[0,336,379,160],"skills":[387,336,417,160]};
  const glyphsReady = new Promise(done => LATE.run(() => { GLYPH.src = "assets/toolbox_glyphs.webp"; GLYPH.decode().catch(() => {}).then(() => { done(); LATE.got(); }); })); // only the Toolbox's numbers use it: after the tip
  function makeSpray(o) { const FONT = o.font || SPRAY_FONT, WT = o.weight || "", [x0, y0, x1, y1] = o.rect, w = x1 - x0, h = y1 - y0, PPM = 400, W = Math.round(w * PPM), H = Math.round(h * PPM);
    const mk = () => { const c = document.createElement("canvas"); c.width = W; c.height = H; return c; }, out = mk(), og = out.getContext("2d", { willReadFrequently: true });
    const map = new THREE.CanvasTexture(out); map.encoding = THREE.sRGBEncoding; map.anisotropy = maxAniso;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map, transparent: true, depthWrite: false, roughness: .6, opacity: 0, polygonOffset: true, polygonOffsetFactor: -2 }));
    mesh.position.set(x0 + w / 2, y0 + h / 2, (o.zw || 0) + (o.z ?? .004)); mesh.visible = false; scene.add(mesh); // o.z: on a raised panel (EDGE)
    PROT.push([o.name, V(x0, y0, o.zw || 0), V(x1, y1, o.zw || 0)]);
    let seed = [...o.key].reduce((a, c) => a + c.charCodeAt(0), 7); const rnd = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    const sp = { mesh, op: 0, at: 0, draw() { seed = [...o.key].reduce((a, c) => a + c.charCodeAt(0), 7);
      const items = (LIVE[o.key] || []).filter((s, i) => s.n != null && (o.only == null || o.only === i)).map(s => [s.n.toLocaleString("en-US"), s.n === 1 ? s.word[0] : s.word[1]]), stack = o.stack, pad = W * .04;
      const mask = mk(), mg = mask.getContext("2d", { willReadFrequently: true }); mg.fillStyle = "#000"; mg.textBaseline = "top";
      const wide = (t, px) => { mg.font = `${WT} ${px}px ${FONT}`; return mg.measureText(t).width; };
      // the layout: the stats big, their words small under them, the stack small; the stack alone sits in the middle of its place
      const parts = []; // [text, size, x, y, align]
      const fit = (t, px, maxW) => Math.min(px, px * maxW / wide(t, px));
      if (o.inline && items.length) { // (phone) number and word on one line, the word smaller, both on the number's foot
        const cw = (W - 2 * pad) / items.length; let nfs = H * .8; for (const [n, wd] of items) nfs = Math.min(nfs, cw * .92 / ((wide(n, 1000) + wide(wd, 1000) * .5 + 160) / 1000)); // 160: the gap, in thousandths of the size
        const y = (H - nfs) / 2; items.forEach(([n, wd], i) => { const tw = wide(n, nfs) + wide(wd, nfs) * .5 + nfs * .16, x = pad + cw * (i + .5) - tw / 2; parts.push([n, nfs, x, y, "left"], [wd, nfs * .5, x + wide(n, nfs) + nfs * .16, y + nfs * .42, "left"]); });
      } else if (o.row) { const cells = Math.max(items.length, 1), cw = (W - 2 * pad) / cells; let nfs = H * .5;
        for (const [n] of items) nfs = Math.min(nfs, fit(n, 1000, cw * .86)); nfs = Math.min(nfs, H * (!items.length ? 0 : stack.length ? .4 : .58)); // numbers alone take their whole place
        const half = Math.ceil(stack.length / 2), lines = !stack.length ? [] : stack.length > 5 ? [stack.slice(0, half).join("  \u00b7  "), stack.slice(half).join("  \u00b7  ")] : [stack.join("  \u00b7  ")];
        const wfs = nfs * .4; let sfs = H * (o.fill || .2); for (const t of lines) sfs = Math.min(sfs, fit(t, 1000, W - 2 * pad)); sfs = Math.min(sfs, items.length ? (H - nfs - wfs * 1.5) / (lines.length * 1.3 + .3) : 1e9);
        const blockH = (items.length ? nfs + wfs * 1.5 + sfs * .3 : 0) + lines.length * sfs * 1.2;
        let y = Math.max(0, (H - blockH) / 2);
        if (items.length) { items.forEach(([n, wd], i) => { const cx = pad + cw * (i + .5); parts.push([n, nfs, cx, y, "center"], [wd, Math.min(wfs, fit(wd, 1000, cw * .92)), cx, y + nfs * 1.02, "center"]); }); y += nfs + wfs * 1.5 + sfs * .3; }
        lines.forEach(t => { parts.push([t, sfs, W / 2, y, "center"]); y += sfs * 1.2; });
      } else { let nfs = 1e9; for (const [n] of items) nfs = Math.min(nfs, fit(n, 1000, W - 2 * pad)); nfs = Math.min(nfs, W * .5, H * (stack.length > 4 ? .2 : .17)); const wfs = nfs * .3;
        let sfs = 1e9; for (const t of stack) sfs = Math.min(sfs, fit(t, 1000, W - 2 * pad)); sfs = Math.min(sfs, W * (o.cap || .1), (H * .98 - items.length * (nfs * 1.5 + H * .02) - (items.length ? H * .03 : 0)) / (stack.length * 1.3));
        const blockH = items.length * (nfs + wfs * 1.6 + H * .02) + (items.length ? H * .03 : 0) + stack.length * sfs * 1.3; let y = Math.max(0, (H - blockH) / 2);
        for (const [n, wd] of items) { parts.push([n, nfs, pad, y, "left"], [wd, Math.min(wfs, fit(wd, 1000, W - 2 * pad)), pad, y + nfs * 1.02, "left"]); y += nfs + wfs * 1.6 + H * .02; }
        y += items.length ? H * .03 : 0;
        for (const t of stack) { parts.push([t, sfs, pad, y, "left"]); y += sfs * 1.3; } }
      if (o.glyphs) { parts.length = 0; sp.shown = null; const s = LIVE[o.key]?.[o.only]; if (s && s.n != null && s.n !== 1 && GLYPH.naturalWidth && o.glyphs.words.flat().every(g => GLYPH_AT[g])) { sp.shown = s.n; // the number from painted digits, its words beside it (one or two lines); the words are plural glyphs, so a count of 1 is left blank, never "1 commits"
        const digits = String(s.n).split(""), lines = o.glyphs.words, gap = 26, lineH = lines.length > 1 ? .5 : .62; // a small gap between thousands, no comma glyph
        let nw = 0; digits.forEach((d, i) => nw += GLYPH_AT[d][2] * .92 + ((digits.length - 1 - i) % 3 === 0 && i < digits.length - 1 ? gap : 0));
        const ww = Math.max(...lines.map(l => l.reduce((a, g) => a + GLYPH_AT[g][2], 0))) * lineH, k = Math.min((H * (o.piece ? .78 : .9)) / 160, /* room for the outline and its shadow */ (W - 2 * pad) / (nw + 30 + ww));
        let x = pad, y = (H - 160 * k) / 2; digits.forEach((d, i) => { const [gx, gy, gw, gh] = GLYPH_AT[d]; mg.drawImage(GLYPH, gx, gy, gw, gh, x, y, gw * k, gh * k); x += gw * k * .92 + ((digits.length - 1 - i) % 3 === 0 && i < digits.length - 1 ? gap * k : 0); });
        x += 30 * k; let ly = y + 160 * k - lines.length * 160 * k * lineH; for (const l of lines) { let lx = x; for (const g of l) { const [gx, gy, gw, gh] = GLYPH_AT[g]; mg.drawImage(GLYPH, gx, gy, gw, gh, lx, ly, gw * k * lineH, gh * k * lineH); lx += gw * k * lineH; } ly += 160 * k * lineH; } } }
      for (const [t, px, x, y, al] of parts) { mg.font = `${WT} ${px}px ${FONT}`; mg.textAlign = al; mg.fillText(t, x, y); }
      if (o.piece) { // (Tom 11-19) painted like the piece's own letters: a thick black outline, a drop shadow in the piece's colour, the fill, overspray in the shadow colour (typed or painted glyphs)
        const ol = mk(), lg = ol.getContext("2d"); lg.lineJoin = "round"; lg.strokeStyle = lg.fillStyle = "#15110d"; lg.textBaseline = "top";
        for (const [t, px, x, y, al] of parts) { lg.font = `${WT} ${px}px ${FONT}`; lg.textAlign = al; lg.lineWidth = px * .17; lg.strokeText(t, x, y); lg.fillText(t, x, y); }
        const paint = (src, col) => { const c = mk(), g = c.getContext("2d"); g.drawImage(src, 0, 0); g.globalCompositeOperation = "source-in"; g.fillStyle = col; g.fillRect(0, 0, W, H); return c; };
        if (o.glyphs) { const dk = paint(mask, "#15110d"), r = Math.max(2, H * .028); for (let a = 0; a < 6.28; a += .4) lg.drawImage(dk, Math.cos(a) * r, Math.sin(a) * r); } // painted glyphs (Tom 11-26, the Toolbox): the outline round the painted strokes
        const sh = paint(ol, o.piece), fill = paint(mask, o.colour), d = Math.max(3, H * .035); og.clearRect(0, 0, W, H);
        if ("filter" in og) { og.filter = `blur(${H * .06}px)`; og.globalAlpha = .45; og.drawImage(sh, 0, 0); og.filter = "none"; }
        og.globalAlpha = 1; og.drawImage(sh, d, d); og.drawImage(ol, 0, 0); og.drawImage(fill, 0, 0);
        const md = mg.getImageData(0, 0, W, H).data; og.strokeStyle = og.fillStyle = o.piece; og.lineCap = "round";
        for (let j = 0, nd = 2 + (W / 160 | 0); j < nd; j++) { const x = rnd() * W | 0; let y = H - 1; while (y > 0 && md[(y * W + x) * 4 + 3] < 200) y--; const len = 8 + rnd() * H * .12, lw = 2 + rnd() * 2;
          if (y < 4 || y + len > H - 3) continue; og.lineWidth = lw; og.beginPath(); og.moveTo(x, y + 2); og.lineTo(x, y + len); og.stroke(); og.beginPath(); og.arc(x, y + len, lw * .85, 0, 6.3); og.fill(); }
        map.needsUpdate = true; return; }
      // the paint: tinted text, a wide soft halo, a tight one, the text itself, a speckle where the halo is, drips off the lowest edges
      const tint = mk(), tg = tint.getContext("2d"); tg.drawImage(mask, 0, 0); tg.globalCompositeOperation = "source-in"; tg.fillStyle = o.colour; tg.fillRect(0, 0, W, H);
      og.clearRect(0, 0, W, H); const blurred = mk(), bg = blurred.getContext("2d", { willReadFrequently: true });
      if ("filter" in og) { og.filter = `blur(${W * .03}px)`; og.globalAlpha = .38; og.drawImage(tint, 0, 0); og.filter = `blur(${W * .008}px)`; og.globalAlpha = .55; og.drawImage(tint, 0, 0); og.filter = "none"; bg.filter = `blur(${W * .045}px)`; }
      const dark = mk(), dg = dark.getContext("2d"); dg.drawImage(mask, 0, 0); dg.globalCompositeOperation = "source-in"; dg.fillStyle = "#0c0e12"; dg.fillRect(0, 0, W, H); // a dark edge under the paint, so it reads on any wall
      og.globalAlpha = .6; og.drawImage(dark, W * .007, W * .007); og.drawImage(dark, -W * .004, W * .004);
      og.globalAlpha = 1; og.drawImage(tint, 0, 0); bg.drawImage(tint, 0, 0);
      const halo = bg.getImageData(0, 0, W, H).data; og.fillStyle = o.colour;
      for (let i = 0, n = W * H / 28; i < n; i++) { const x = rnd() * W | 0, y = rnd() * H | 0, a = halo[(y * W + x) * 4 + 3] / 255; if (a > .03 && rnd() < a * .9) { og.globalAlpha = .3 + .5 * rnd(); const r = .6 + rnd() * 1.3; og.fillRect(x, y, r, r); } }
      const md = mg.getImageData(0, 0, W, H).data; og.strokeStyle = o.colour; og.lineCap = "round";
      for (let j = 0, nd = 3 + (W / 90 | 0); j < nd; j++) { const x = rnd() * W | 0; let y = H - 1; while (y > 0 && md[(y * W + x) * 4 + 3] < 200) y--; const len = 10 + rnd() * H * .07, lw = 1.5 + rnd() * 1.5;
        if (y < 4 || y + len > H - 3) continue; og.globalAlpha = .9; og.lineWidth = lw; og.beginPath(); og.moveTo(x, y - 2); og.lineTo(x, y + len); og.stroke(); og.beginPath(); og.arc(x, y + len, lw * .85, 0, 6.3); og.fillStyle = o.colour; og.fill(); }
      og.globalAlpha = 1; map.needsUpdate = true; },
      fade(on) { const now = performance.now(), dt = Math.min(.1, (now - sp.at) / 1000 || 0); sp.at = now; sp.op = cl(sp.op + (on ? dt / .6 : -dt / .6)); sp.mesh.visible = sp.op > .01; sp.mesh.material.opacity = sp.op; } };
    (SPRAYS[o.key] ||= []).push(sp); (o.glyphs ? glyphsReady : document.fonts.load(`${WT} 40px ${FONT}`)).then(() => sp.draw(), () => sp.draw()); return sp; }
  // The street's six number notes (Tom 11-27): the live counts written ON the production, in a second hand (assets/street_glyphs.webp: digits 0-9, a second form of the digits 0-8, the words,
  // white ink, 160 px cells; digits stand on row 127, words on row 106). Put together at run time from this site's /api/github, one note per slot of the painting's own layout
  // (tools: street5/layout.json): its anchor (the left end of the first line's baseline, in the wall's pixels), its tilt (+ rises to the right), its digit height, its lines and the room it has.
  // Digits are set 0.9 of their width apart, then a gap, then the words at 1.12 x the digit size on the SAME baseline; a second line starts a little in. A digit that comes twice in a number is
  // its second form the second time. A count that is missing, null, 0 or 1 draws nothing (no "0", no lone word, no "1 commits"); raddavarfruberga's notes need its numbers, which come with a token.
  // The ink is the cream of the painting's stand-in numbers, from the nearest token (--look-form-ink).
  const NOTE_GLYPH = {"0":[0,0,100,160],"1":[108,0,89,160],"2":[205,0,106,160],"3":[319,0,113,160],"4":[440,0,109,160],"5":[557,0,106,160],"6":[671,0,93,160],"7":[772,0,94,160],"8":[874,0,84,160],"9":[966,0,86,160],"commits":[1060,0,403,160],"merged":[1471,0,402,160],"pull requests":[0,168,643,160],"tests":[651,168,272,160],"migrations":[931,168,541,160],"skills":[1480,168,313,160],"0b":[1801,168,106,160],"1b":[1915,168,87,160],"2b":[0,336,109,160],"3b":[117,336,115,160],"4b":[240,336,98,160],"5b":[346,336,108,160],"6b":[462,336,94,160],"7b":[564,336,94,160],"8b":[666,336,95,160]}, NOTE_SHEET = new Image(), NOTE_WORD = 1.12, NOTE_PPW = 1.5, NOTE_SCALE = NARROW ? 1.08 : 1; // NOTE_SCALE: on a phone the words are 8 % bigger (their x-height is then 14 css px at the closest pass of the pan) // NOTE_PPW: canvas pixels per wall pixel
  const noteSheetReady = new Promise(done => LATE.run(() => { NOTE_SHEET.src = "assets/street_glyphs.webp"; NOTE_SHEET.decode().catch(() => {}).then(() => { done(); LATE.got(); }); })); // after the tip, like the pictures
  const NOTE_INK = getComputedStyle(document.documentElement).getPropertyValue("--look-form-ink").trim();
  const NOTES = [ // project, which of its numbers, key, anchor, tilt, digit cell height, lines (# = the number), line pitch, room [x0, y0, x1, y1]
    ["epa", 0, "epa.commits", [255, 236], 5, 100, [["#", "commits"]], 0, [258, 136, 768, 237]],
    ["epa", 1, "epa.merged", [842, 140], -2, 88, [["#", "merged"], ["pull requests"]], 80.5, [845, 75, 1244, 260]],
    ["epa", 2, "epa.tests", [1640, 472], 3, 90, [["#", "tests"]], 0, [1639, 397, 1967, 474]],
    ["epa", 3, "epa.migrations", [1322, 214], 3, 92, [["#", "migrations"]], 0, [1324, 137, 1769, 235]],
    ["rvf", 0, "rvf.commits", [3345, 296], 4, 96, [["#", "commits"]], 0, [3346, 207, 3832, 294]],
    ["rvf", 1, "rvf.merged", [3462, 910], 3, 88, [["#", "merged"], ["pull requests"]], 80.5, [3465, 830, 3871, 1019]] ];
  const NOTE_AT = { epa: [WX_, G3], rvf: [WX_, G3] }; // the wall's pixel x to the scene, and the street under the piece
  // glyphs of a note for a count n, in the note's own space (x from the anchor, y from the first baseline): [glyph, x, y, scale]
  function noteGlyphs(n, [, , , , , hd, lines, pitch]) { const k = hd * NOTE_SCALE / 160, kk = k * NOTE_WORD, seen = {}, out = [];
    lines.forEach((line, li) => { let x = li ? 26 * k : 0; const by = li * pitch;
      for (const part of line) { if (part === "#") { for (const d of String(n)) { const c = seen[d] || 0; seen[d] = c + 1; const g = c % 2 === 1 && NOTE_GLYPH[d + "b"] ? d + "b" : d; out.push([g, x, by - 127 * k, k]); x += NOTE_GLYPH[g][2] * k * .9; } x += 22 * k; }
        else { out.push([part, x, by - 106 * kk, kk]); x += NOTE_GLYPH[part][2] * kk + 16 * k; } } });
    return out; }
  const NOTE_PARTS = NOTES.map((N, i) => { const [proj, nth, key, [ax, ay], tilt, , , , [bx0, by0, bx1, by1]] = N, [ST_X, street] = NOTE_AT[proj], pad = NARROW ? 48 : 12, X0 = bx0 - pad, Y0 = by0 - pad, W = Math.ceil((bx1 - bx0 + 2 * pad) * NOTE_PPW), H = Math.ceil((by1 - by0 + 2 * pad) * NOTE_PPW);
    const cv = Object.assign(document.createElement("canvas"), { width: W, height: H }), g = cv.getContext("2d", { willReadFrequently: true }), map = new THREE.CanvasTexture(cv); map.encoding = THREE.sRGBEncoding; map.anisotropy = maxAniso;
    const wx0 = ST_X(X0), wx1 = ST_X(X0 + W / NOTE_PPW), wy1 = street + (WALL_FOOT - Y0) * SPX, wy0 = street + (WALL_FOOT - (Y0 + H / NOTE_PPW)) * SPX;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(wx1 - wx0, wy1 - wy0), new THREE.MeshStandardMaterial({ map, transparent: true, depthWrite: false, roughness: .6, opacity: 0, polygonOffset: true, polygonOffsetFactor: -2 }));
    mesh.position.set((wx0 + wx1) / 2, (wy0 + wy1) / 2, .004); mesh.renderOrder = 2; mesh.visible = false; scene.add(mesh); // after the picture: both are see-through layers, and a note off to the side is farther than the picture's middle
    PROT.push([{ epa: "epaRadar's ", rvf: "raddavarfruberga's " }[proj] + key.split(".")[1], V(wx0, wy0, 0), V(wx1, wy1, 0)]);
    const sp = { mesh, op: 0, at: 0, key, shown: null, draw() { g.clearRect(0, 0, W, H); sp.shown = null; sp.used = []; const s = LIVE[proj][nth];
        if (s.n != null && s.n !== 1 && NOTE_SHEET.naturalWidth && noteGlyphs(s.n, N).every(([c]) => NOTE_GLYPH[c])) { sp.shown = s.n; sp.used = noteGlyphs(s.n, N).map(q => q[0]);
          g.save(); g.imageSmoothingQuality = "high"; g.translate((ax - X0) * NOTE_PPW, (ay - Y0) * NOTE_PPW); g.rotate(-tilt * Math.PI / 180); g.scale(NOTE_PPW, NOTE_PPW);
          for (const [c, x, y, k] of noteGlyphs(s.n, N)) { const [gx, gy, gw, gh] = NOTE_GLYPH[c]; g.drawImage(NOTE_SHEET, gx, gy, gw, gh, x, y, gw * k, gh * k); }
          g.restore(); g.globalCompositeOperation = "source-in"; g.fillStyle = NOTE_INK; g.fillRect(0, 0, W, H); g.globalCompositeOperation = "source-over"; }
        map.needsUpdate = true; },
      fade(on) { const now = performance.now(), dt = Math.min(.1, (now - sp.at) / 1000 || 0); sp.at = now; sp.op = cl(sp.op + (on ? dt / .6 : -dt / .6)); sp.mesh.visible = sp.op > .01; sp.mesh.material.opacity = sp.op; } }; // the spray-in: it comes up in .6 s
    (SPRAYS[proj] ||= []).push(sp); noteSheetReady.then(() => sp.draw()); return sp; });
    const inkOf = p => { const c = p.mesh.material.map.image, d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data; let ink = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 128) ink++; return ink; };
  window.numsTest = () => Object.fromEntries(["ttoolbox", "dot", "tthermal"].map(k => [k, (SPRAYS[k] || []).map(p => ({ shown: p.shown ?? null, ink: inkOf(p), op: +p.op.toFixed(2) }))])); // for the garage check: each Toolbox number's painted count, paint and how far it has faded in
  window.sprayTest = () => NOTE_PARTS.map(p => ({ key: p.key, shown: p.shown ?? null, used: p.used || [], ink: inkOf(p), op: +p.op.toFixed(2) })); // for the epanums check: the number each of the street's six notes shows, how much paint it has and how far it has faded in
  // a second street light for the second piece; it flickers on as the camera arrives
  const lamp2 = new THREE.SpotLight(0xfff3e6, 0, 30, .62, .75, 1.3); lamp2.position.set(EX - 6.5, 3.8 - 2 * DROP, 3.4); lamp2.target.position.set(EX + .4, EY, 0); scene.add(lamp2, lamp2.target);
  const head = document.getElementById("head");
  const CREAM = "236,230,216";

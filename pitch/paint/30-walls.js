  // ---- moment 2: epaRadar, one finished production wall (Tom 11-18): big letters, the real car from epaRadar's own photo inside
  // the painting, cut off by a concrete pillar; the exit sign and the car's number plate are the links. Painted on the desk's graphics card (CREDITS.txt).
  // One painting (Tom 11-25, like raddavarfruberga): the piece inside its own charcoal-brown backdrop with an orange rim, the stack handwritten on it,
  // nothing of the old background left. The whole painting fills the old piece's place (EX/EW/EH/EY), so the camera's stops still frame it; inside
  // the picture the old piece sits at EPA_K (.84) from (EPA_OX, EPA_OY): the old link marks are mapped with toEPAN.
  const EX = 13, EW = 7.6, EH = EW * 960 / 1536, EY = G2 - EH * 35 / 960 + EH / 2, EPA_K = .84, EPA_OX = 246, EPA_OY = 154;
  const EPN_K = EW / 1536, EPN_L = EX - EW / 2, EPN_T = EY + EH / 2, EPN_W = EW, EPN_H = EH;
  const pieceMap = tex("assets/epa_wall.webp", true, 1, 1); pieceMap.wrapS = pieceMap.wrapT = THREE.ClampToEdgeWrapping;
  const piece = new THREE.Mesh(new THREE.PlaneGeometry(EPN_W, EPN_H), wallBump(new THREE.MeshStandardMaterial({ map: pieceMap, transparent: true, depthWrite: false, roughness: .55,
    normalMap: tex("assets/wall4_nor_gl.jpg", false, EPN_W / TILE, EPN_H / TILE, (EPN_L - (WX - WW / 2)) / TILE, (EPN_T - EPN_H - GROUND) / TILE), normalScale: new THREE.Vector2(.4, .4), polygonOffset: true, polygonOffsetFactor: -2 })));
  piece.position.set(EPN_L + EPN_W / 2, EPN_T - EPN_H / 2, .002); scene.add(piece); PROT.push(["epaRadar's painting", V(EPN_L, EPN_T - EPN_H, 0), V(EPN_L + EPN_W, EPN_T, 0)]); // the whole painting, backdrop included
  // the two link marks, in the picture's pixels (left, top, right, bottom): a green motorway exit sign "Open the site" on its pole by the road, and the car's own
  // rear number plate "CODE" (Tom 11-19: marks that belong to the wall's story, not the blue street signs every wall had)
  const EPAN = { at: (u, v) => V(EPN_L + u * EPN_K, EPN_T - v * EPN_K, 0), k: EPN_K }, toEPAN = b => b.map((q, i) => Math.round(q * EPA_K + (i % 2 ? EPA_OY : EPA_OX))); // the picture's pixels
  const EPA_MARKS = [[114, 556, 502, 674], [949, 669, 1081, 707]].map(toEPAN), EPAB = EPAN; // marks drawn in the old piece's pixels, mapped into the painting
  // The other six paintings (Tom 11-19, one artist per wall) go on their walls the same way: painted on the desk's graphics card (CREDITS.txt), the bare
  // concrete keyed out so the wall shows through, 1536 x 960 px each. paintOn puts picture pixel (px, py) at the wall point (wx, wy), the picture w m wide.
  // at(u, v) is any picture pixel in the wall's own space; the link marks and the painted areas are in picture pixels. The wall's own hole (moment 3) cuts through it too.
  function paintOn(file, w, [px, py], [wx, wy], z = .002, [pw, ph] = [1536, 960]) { const h = w * ph / pw, k = w / pw, cx = wx - px * k + w / 2, cy = wy + py * k - h / 2, late = !/^assets\/(epa|rvf)_/.test(file), map = tex(file, true, 1, 1, 0, 0, late); map.wrapS = map.wrapT = THREE.ClampToEdgeWrapping;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), wallBump(new THREE.MeshStandardMaterial({ map, transparent: true, depthWrite: false, roughness: .55,
      normalMap: tex("assets/wall4_nor_gl.jpg", false, w / TILE, h / TILE, (cx - w / 2 - (WX - WW / 2) - (cx > CX1 ? SEAM_D.x : 0)) / TILE, (cy - h / 2 - GROUND - (cx > CX1 ? SEAM_D.y : 0)) / TILE), normalScale: new THREE.Vector2(.4, .4), polygonOffset: true, polygonOffsetFactor: -2 })));
    m.position.set(cx, cy, z); scene.add(m);
    const at = (u, v) => V(cx - w / 2 + u * k, cy + h / 2 - v * k, 0);
    return { m, at, w, h, k, ready: () => texReady(file), protect: (name, [x0, y0, x1, y1]) => PROT.push([name, at(x0, y1), at(x1, y0)]) }; }
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
  // If it fails that number is not drawn (no old value, no placeholder) and the wall still looks complete (the stack stays). Self-hosted, EDGE and raddavarfruberga show no numbers:
  // the first two are private, and raddavarfruberga.se offers no public count (its page is prerendered and sends no CORS header, so a browser can't read it).
  // The page asks this site's /api/github (api/github.ts), which asks GitHub once an hour for everyone: a visitor's own address may make only 60 anonymous asks an hour, and past that every load logged 403 errors in the console.
  const NUMS = fetch("/api/github").then(r => { if (!r.ok) throw 0; return r.json(); }).catch(() => ({})); // one ask for all walls; no answer = no numbers
  const numOf = (wall, key) => NUMS.then(d => { const n = d?.[wall]?.[key]; if (!(n > 0)) throw 0; return n; });
  const LIVE = { // wall: [singular, plural, how to get it]
    dot: [["commit", "commits", () => numOf("dot", "commits")], ["test", "tests", () => numOf("dot", "tests")]],
    ttoolbox: [["commit", "commits", () => numOf("ttoolbox", "commits")], ["skill", "skills", () => numOf("ttoolbox", "skills")]],
    tthermal: [["commit", "commits", () => numOf("tthermal", "commits")], ["merged pull request", "merged pull requests", () => numOf("tthermal", "merged")]],
    epa: [["commit", "commits", () => numOf("epa", "commits")], ["merged pull request", "merged pull requests", () => numOf("epa", "merged")]] };
  const SPRAYS = {}, liveHead = document.createElement("p"); liveHead.className = "head"; liveHead.id = "liveHead"; document.querySelector(".hud").append(liveHead);
  const liveText = () => liveHead.textContent = Object.entries(LIVE).map(([k, a]) => { const got = a.filter(s => s.n != null).map(s => `${s.n.toLocaleString("en-US")} ${s.n === 1 ? s.word[0] : s.word[1]}`); return got.length ? `${k}: ${got.join(", ")}.` : ""; }).filter(Boolean).join(" ");
  for (const [key, defs] of Object.entries(LIVE)) { LIVE[key] = defs.map(([one, many, get]) => ({ word: [one, many], n: null })); // fetched now, once per page load
    defs.forEach(([, , get], i) => get().then(n => { LIVE[key][i].n = n; SPRAYS[key]?.forEach(sp => sp.draw()); liveText(); }).catch(() => {})); } // a failed fetch leaves n empty: nothing is drawn for it
  // a sprayed text on a wall: canvas drawn at runtime (a soft overspray halo, a speckle round the edges, a few drips), laid on the wall like a painting.
  // o: key (LIVE's), colour, stack (words), rect (wall space: x0, y0, x1, y1), row (stats side by side, else one under the other), name (for the plates check)
  const SPRAY_FONT = '"Saira Stencil One", sans-serif';
  // painted glyphs for live numbers (Tom 11-25): the digits and words in the tag hand, one picture; [x, y, w, h] each, all 160 px tall
  const GLYPH = new Image(), GLYPH_AT = {"0":[0,0,105,160],"1":[113,0,95,160],"2":[216,0,134,160],"3":[358,0,123,160],"4":[489,0,136,160],"5":[633,0,136,160],"6":[777,0,109,160],"7":[894,0,121,160],"8":[1023,0,109,160],"9":[1140,0,100,160],"commits":[1248,0,614,160],"merged":[0,168,406,160],"pull requests":[414,168,616,160]};
  GLYPH.src = "assets/epa_glyphs.webp"; const glyphsReady = GLYPH.decode().catch(() => {});
  function makeSpray(o) { const FONT = o.font || SPRAY_FONT, WT = o.weight || "", [x0, y0, x1, y1] = o.rect, w = x1 - x0, h = y1 - y0, PPM = 400, W = Math.round(w * PPM), H = Math.round(h * PPM);
    const mk = () => { const c = document.createElement("canvas"); c.width = W; c.height = H; return c; }, out = mk(), og = out.getContext("2d", { willReadFrequently: true });
    const map = new THREE.CanvasTexture(out); map.encoding = THREE.sRGBEncoding; map.anisotropy = maxAniso;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map, transparent: true, depthWrite: false, roughness: .6, opacity: 0, polygonOffset: true, polygonOffsetFactor: -2 }));
    mesh.position.set(x0 + w / 2, y0 + h / 2, o.z ?? .004); mesh.visible = false; scene.add(mesh); // o.z: on a raised panel (EDGE)
    PROT.push([o.name, V(x0, y0, 0), V(x1, y1, 0)]);
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
        let sfs = 1e9; for (const t of stack) sfs = Math.min(sfs, fit(t, 1000, W - 2 * pad)); sfs = Math.min(sfs, W * .1, (H * .98 - items.length * (nfs * 1.5 + H * .02) - (items.length ? H * .03 : 0)) / (stack.length * 1.3));
        const blockH = items.length * (nfs + wfs * 1.6 + H * .02) + (items.length ? H * .03 : 0) + stack.length * sfs * 1.3; let y = Math.max(0, (H - blockH) / 2);
        for (const [n, wd] of items) { parts.push([n, nfs, pad, y, "left"], [wd, Math.min(wfs, fit(wd, 1000, W - 2 * pad)), pad, y + nfs * 1.02, "left"]); y += nfs + wfs * 1.6 + H * .02; }
        y += items.length ? H * .03 : 0;
        for (const t of stack) { parts.push([t, sfs, pad, y, "left"]); y += sfs * 1.3; } }
      if (o.glyphs) { parts.length = 0; sp.shown = null; const s = LIVE[o.key]?.[o.only]; if (s && s.n != null && GLYPH.naturalWidth) { sp.shown = s.n; // the number from painted digits, its words beside it (one or two lines)
        const digits = String(s.n).split(""), lines = o.glyphs.words, gap = 26, lineH = lines.length > 1 ? .5 : .62; // a small gap between thousands, no comma glyph
        let nw = 0; digits.forEach((d, i) => nw += GLYPH_AT[d][2] * .92 + ((digits.length - 1 - i) % 3 === 0 && i < digits.length - 1 ? gap : 0));
        const ww = Math.max(...lines.map(l => l.reduce((a, g) => a + GLYPH_AT[g][2], 0))) * lineH, k = Math.min((H * .9) / 160, (W - 2 * pad) / (nw + 30 + ww));
        let x = pad, y = (H - 160 * k) / 2; digits.forEach((d, i) => { const [gx, gy, gw, gh] = GLYPH_AT[d]; mg.drawImage(GLYPH, gx, gy, gw, gh, x, y, gw * k, gh * k); x += gw * k * .92 + ((digits.length - 1 - i) % 3 === 0 && i < digits.length - 1 ? gap * k : 0); });
        x += 30 * k; let ly = y + 160 * k - lines.length * 160 * k * lineH; for (const l of lines) { let lx = x; for (const g of l) { const [gx, gy, gw, gh] = GLYPH_AT[g]; mg.drawImage(GLYPH, gx, gy, gw, gh, lx, ly, gw * k * lineH, gh * k * lineH); lx += gw * k * lineH; } ly += 160 * k * lineH; } } }
      for (const [t, px, x, y, al] of parts) { mg.font = `${WT} ${px}px ${FONT}`; mg.textAlign = al; mg.fillText(t, x, y); }
      if (o.piece) { // (Tom 11-19) painted like the piece's own letters: a thick black outline, a drop shadow in the piece's colour, the fill, overspray in the shadow colour
        const ol = mk(), lg = ol.getContext("2d"); lg.lineJoin = "round"; lg.strokeStyle = lg.fillStyle = "#15110d"; lg.textBaseline = "top";
        for (const [t, px, x, y, al] of parts) { lg.font = `${WT} ${px}px ${FONT}`; lg.textAlign = al; lg.lineWidth = px * .17; lg.strokeText(t, x, y); lg.fillText(t, x, y); }
        const paint = (src, col) => { const c = mk(), g = c.getContext("2d"); g.drawImage(src, 0, 0); g.globalCompositeOperation = "source-in"; g.fillStyle = col; g.fillRect(0, 0, W, H); return c; };
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
  // epaRadar: above the painting
  { // (Tom 11-25) the live numbers in the tag hand, in the backdrop's empty top corners: painted digits and words (assets/epa_glyphs.webp), put
    // together on every load from GitHub's count; sprayed in one after another. The stack is in the painting itself.
    const R = ([u0, v0, u1, v1]) => [EPAN.at(u0, 0).x, EPAN.at(0, v1).y, EPAN.at(u1, 0).x, EPAN.at(0, v0).y];
    var EPA_PARTS = [makeSpray({ key: "epa", only: 0, name: "epaRadar's commits", colour: "#ffb03a", glyphs: { words: [["commits"]] }, stack: [], rect: R([80, 28, 650, 178]) }),
      makeSpray({ key: "epa", only: 1, name: "epaRadar's merged pull requests", colour: "#ffb03a", glyphs: { words: [["merged"], ["pull requests"]] }, stack: [], rect: R([950, 22, 1500, 182]) })]; }
  window.sprayTest = () => EPA_PARTS.map(p => { const c = p.mesh.material.map.image, d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data; let ink = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 128) ink++; return { shown: p.shown ?? null, ink }; }); // for the epanums check: the number each painted spray shows, and how much paint it has
  // the underpass (Tom 11-18): the street goes down its second flight under a bridge, from the painting's right edge to just short of
  // raddavarfruberga. The deck rests on its abutment, a wall that stands forward of the street wall: the car drives in behind its corner.
  const UP0 = EX + EW / 2 - .05, UP1 = 22.9, UD = .22, DECK = G2 + 3.8, DECK_Z = 30;
  { const len = UP1 - UP0, ah = DECK - G3, conc = (rx, ry, c) => new THREE.MeshStandardMaterial({ color: c, roughness: .92, map: tex("assets/wall4_diff.jpg", true, rx, ry), normalMap: tex("assets/wall4_nor_gl.jpg", false, rx, ry) });
    const abut = new THREE.Mesh(new THREE.BoxGeometry(len, ah, UD), conc(len / TILE, ah / TILE, 0x5c5953)); abut.position.set(UP0 + len / 2, G3 + ah / 2, UD / 2); scene.add(abut);
    const deck = new THREE.Mesh(new THREE.BoxGeometry(len + .3, 1.2, DECK_Z), conc((len + .3) / TILE, DECK_Z / TILE, 0x77736c)); deck.position.set(UP0 + len / 2, DECK + .6, DECK_Z / 2); scene.add(deck);
    const tubeM = new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0xffe6c4, emissiveIntensity: 2.4 });
    { const prev = ground.material.onBeforeCompile; ground.material.onBeforeCompile = sh => { prev(sh);
      sh.fragmentShader = sh.fragmentShader.replace("#include <emissivemap_fragment>", `diffuseColor.rgb *= 1. - .62 * smoothstep(${(UP0 - .6).toFixed(2)}, ${(UP0 + .4).toFixed(2)}, vWP.x) * (1. - smoothstep(${(UP1 - .4).toFixed(2)}, ${(UP1 + .6).toFixed(2)}, vWP.x)) * step(vWP.z, ${DECK_Z.toFixed(1)});
        #include <emissivemap_fragment>`); }; }
    for (const z of [2, 7, 12, 17]) { const t = new THREE.Mesh(new THREE.BoxGeometry(1.3, .05, .14), tubeM); t.position.set(UP0 + len / 2, DECK - .03, z); scene.add(t); } }

  // a second street light for the second piece; it flickers on as the camera arrives
  const lamp2 = new THREE.SpotLight(0xfff3e6, 0, 30, .62, .75, 1.3); lamp2.position.set(EX - 6.5, 3.8 - DROP, 3.4); lamp2.target.position.set(EX + .4, EY, 0); scene.add(lamp2, lamp2.target);
  const head = document.getElementById("head");
  const CREAM = "236,230,216";

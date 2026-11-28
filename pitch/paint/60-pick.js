  // ---- hover on every painted link (Tom 11-19): the mark's shape lights up with a soft outline glow in its own colour, the cursor is a spray can, a small label
  // says what it does; keyboard focus shows the same; on a phone the mark pulses once, faintly, when it first comes into view
  function makeGlow(file, B, [x0, y0, x1, y1], o = {}) { const g = { op: 0, pulse: -1, pulsed: false, started: false, mesh: null };
    // Built over a few frames, the picture decoded and cut out off the main thread: in one go, as its wall came into view, it cost one 50-70 ms frame.
    // file: a picture's path, or a function giving a canvas (nothing while it isn't painted yet).
    g.build = () => { if (g.started) return; g.started = true; const M = 26, bw = x1 - x0, bh = y1 - y0, GW = bw + 2 * M, GH = bh + 2 * M, frame = () => new Promise(requestAnimationFrame);
      // cut from the file's own bytes: an <img> cut with createImageBitmap is decoded a second time, on the main thread (23 ms a picture, traced 11-25)
      const from = typeof file === "function" ? file() : file; if (!from) { g.started = false; return; } // a canvas not painted yet: try again on a later frame
      (typeof from === "string" ? fetch(from).then(r => r.blob()) : Promise.resolve(from)).then(b => createImageBitmap(b, x0 - M, y0 - M, GW, GH)).then(async bmp => { await frame();
      const mk = () => Object.assign(document.createElement("canvas"), { width: GW, height: GH });
      const src = mk(), sg = src.getContext("2d", { willReadFrequently: true }); sg.drawImage(bmp, 0, 0); bmp.close(); const px = sg.getImageData(0, 0, GW, GH).data;
      const mask = mk(), mg = mask.getContext("2d"), md = mg.createImageData(GW, GH), ch = [];
      for (let y = M; y < M + bh; y++) for (let x = M; x < M + bw; x++) { const i = (y * GW + x) * 4; if (o.rect || (o.cloth ? Math.min(px[i], px[i + 1], px[i + 2]) > 165 && Math.max(px[i], px[i + 1], px[i + 2]) - Math.min(px[i], px[i + 1], px[i + 2]) < 45 : px[i + 3] > 140)) { /* cloth: the painting's white fabric, not its box */ md.data.set([255, 255, 255, 255], i); ch.push([Math.max(px[i], px[i + 1], px[i + 2]) - Math.min(px[i], px[i + 1], px[i + 2]), px[i], px[i + 1], px[i + 2]]); } }
      mg.putImageData(md, 0, 0); let col = o.colour;
      if (!col) { ch.sort((a, b) => b[0] - a[0]); const top = ch.slice(0, Math.max(1, ch.length >> 2)), m = [1, 2, 3].map(j => top.reduce((s, c) => s + c[j], 0) / top.length);
        col = top.length && top[0][0] > 40 ? `rgb(${m.map(v => Math.min(255, Math.round(v * .55 + 130))).join(",")})` : "#ffffff"; } // its own colour, lifted so it glows
      await frame();
      const out = mk(), og = out.getContext("2d"); og.shadowColor = col; og.shadowBlur = 22; og.shadowOffsetX = 4000; for (let i = 0; i < 5; i++) og.drawImage(mask, -4000, 0);
      og.shadowColor = "transparent"; og.shadowOffsetX = 0; og.globalCompositeOperation = "destination-out"; og.globalAlpha = o.hole ?? .6; og.drawImage(mask, 0, 0); og.globalCompositeOperation = "source-over"; // the glow round the shape; the shape itself only a little lighter, so its words stay readable
      const tint = mk(), tg = tint.getContext("2d"); tg.fillStyle = col; tg.fillRect(0, 0, GW, GH); tg.globalCompositeOperation = "destination-in"; tg.drawImage(mask, 0, 0); og.globalAlpha = o.fill ?? .14; og.drawImage(tint, 0, 0);
      const map = new THREE.CanvasTexture(out), cu = (x0 + x1) / 2, cv = (y0 + y1) / 2; map.encoding = THREE.sRGBEncoding;
      g.mesh = new THREE.Mesh(new THREE.PlaneGeometry(GW * B.k, GH * (B.kv || B.k) * (o.floor ? EFLOOR : 1)), new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0, fog: false, toneMapped: false }));
      if (o.floor) { g.mesh.rotation.x = -Math.PI / 2; g.mesh.position.copy(eFlat(cu, cv)).y += .012; } else if (B.flat) { g.mesh.rotation.x = -Math.PI / 2; g.mesh.position.copy(B.at(cu, cv)).y += .012; } else g.mesh.position.copy(B.at(cu, cv)).z += .012;
      g.mesh.visible = false; scene.add(g.mesh); }).catch(() => {}); }; // a picture that never loads: no glow, as before
    return g; }
  const hlEl = document.createElement("div"); hlEl.className = "hl"; hlEl.setAttribute("aria-hidden", "true"); document.querySelector(".hud").append(hlEl);
  const HOTL = [], PULSE = NARROW || matchMedia("(pointer: coarse)").matches, hostOf = h => h.replace(/^https?:\/\/(www\.)?/, "").replace(/\/.*$/, "");
  const labelOf = el => el.protocol === "mailto:" ? "Opens your email" : el.hostname === "github.com" ? "Opens GitHub" : el.hostname.includes("linkedin") ? "Opens LinkedIn" : "Opens " + hostOf(el.href);
  const hotOn = (el, label, glow, avoid, fixed) => { el.dataset.hl = label; HOTL.push({ el, label, glow, avoid, fixed }); }; // avoid: the painted words round the mark (screen boxes), which its label must not cover
  const boxesOn = (B, boxes) => () => boxes.map(([x0, y0, x1, y1]) => { const [ax, ay] = proj(B.at(x0, y0)), [bx, by] = proj(B.at(x1, y1)); return [Math.min(ax, bx), Math.min(ay, by), Math.max(ax, bx), Math.max(ay, by)]; });
  { const NOGLOW = () => ({ build() {}, pulse: -1, op: 0, mesh: null }); // the street's words are its links (like the production's): no glow over them, and "Opens ..." in the one place
    EPA_MARKS.forEach((b, i) => hotOn(hots[i], labelOf(hots[i]), NOGLOW(), null, true));
    hotOn(hot3, labelOf(hot3), NOGLOW(), null, true);
    U4.forEach(u => u.hots.forEach((h, j) => hotOn(h, labelOf(h), u.tile || u.site ? { build() {}, pulse: -1, op: 0, mesh: null } /* the production's words are the link: no glow over them (it hazed the piece on a phone); the Edge piece's link tags are its links the same way */ : makeGlow(u.ov || u.art[0], u.B, u.links[j].box, u.ov ? { rect: true } : {}), u.text && boxesOn(u.B, [...u.text, ...u.nums]), !!(u.tile || u.site))));
    const leaveHot = document.getElementById("leave");
    hotOn(leaveHot, "Leave your tag", { build() {}, pulse: -1, op: 0, mesh: null }); // a real can: its tap area is the can itself, no glow drawn from paint
    endS.hots = { leaveHot }; }
  // The visitors' wall's way in (walk step 4, Tom 11-22): scrolled up from the start, the bare wall says what it is for. "Leave your tag" sprayed
  // low in the street light, in the front's blue, and a can standing at the wall's foot beside it; both open the tag tool, as the can at the flyer does.
  // Gone once this browser has a tag of its own (it shows instead) and by day (the flyer has its own Leave your tag beside it).
  const VW = { x0: -14.3, y1: 1.9, k: 4.9 / 1024 }, VB = { at: (u, v) => V(VW.x0 + u * VW.k, VW.y1 - v * VW.k, 0), k: VW.k }, VCAN = V(-11.2, GROUND, .7);
  const vCan = Object.assign(document.createElement("canvas"), { width: 1024, height: 200 }); let vFile = false; // true once the words are painted
  const vTex = new THREE.CanvasTexture(vCan); vTex.encoding = THREE.sRGBEncoding; vTex.anisotropy = maxAniso;
  const vWords = new THREE.Mesh(new THREE.PlaneGeometry(1024 * VW.k, 200 * VW.k), new THREE.MeshStandardMaterial({ map: vTex, transparent: true, depthWrite: false, roughness: .6, polygonOffset: true, polygonOffsetFactor: -2 }));
  vWords.position.copy(VB.at(512, 100)).z += .004; vWords.visible = false; scene.add(vWords);
  const vCan3 = can.clone(); vCan3.position.copy(VCAN); vCan3.rotation.y = -.6; vCan3.visible = false; scene.add(vCan3);
  document.fonts.load('700 100px "Clash Display"').catch(() => {}).then(() => { const g = vCan.getContext("2d");
    g.font = '700 118px "Clash Display", sans-serif'; g.textBaseline = "middle"; g.fillStyle = PAINT_HEX; g.translate(18, 104); g.rotate(-.02);
    g.shadowColor = PAINT_HEX; g.shadowBlur = 16; g.globalAlpha = .4; g.fillText("Leave your tag", 0, 0); g.shadowBlur = 0; g.globalAlpha = .95; g.fillText("Leave your tag", 0, 0); // a soft overspray under a firm core, like the flyer wall's
    vTex.needsUpdate = true; vFile = true; });
  const leaveUp = document.createElement("button"); Object.assign(leaveUp, { type: "button", className: "hot", id: "leaveUp", tabIndex: -1 }); leaveUp.setAttribute("aria-label", "Leave your tag"); leaveUp.style.display = "none";
  document.querySelector(".hud").append(leaveUp); leaveUp.addEventListener("click", e => { e.preventDefault(); pickNear = [-12, 3.6]; document.getElementById("leave").click(); });
  hotOn(leaveUp, "", makeGlow(() => vFile && vCan, VB, [0, 0, 1024, 200], { colour: "#ffffff", hole: 1, fill: 0 })); // a light glow round the blue words, none over them: they stay sharp
  const ECAN = V(PW / 2 - .3, GROUND, .8), eCan3 = can.clone(); eCan3.position.copy(ECAN); eCan3.rotation.y = .5; eCan3.visible = false; scene.add(eCan3); // the end's Leave your tag: a can at the foot of the mural's right end, between it and the flyer, where a hand would reach (a phone sees it beside its narrower mural)
  const visitOn = () => !document.getElementById("leave").hidden && !endS.show;
  function visitPlace(lft) { const on = visitOn(); vWords.visible = vCan3.visible = on; // the words and the can, one tap area round both
    const ui = on && lft > .9 && !pick.mode && !!vFile;
    if (!ui) { leaveUp.style.display = "none"; leaveUp.tabIndex = -1; return; }
    const P = [VB.at(0, 0), VB.at(1024, 200), VCAN.clone().add(V(.35, 1.4, 0)), VCAN.clone().add(V(-.35, 0, 0))].map(proj), xs = P.map(p => p[0]), ys = P.map(p => p[1]);
    const l = Math.max(0, Math.min(...xs)), r = Math.min(innerWidth, Math.max(...xs)), t = Math.max(0, Math.min(...ys)), b = Math.min(innerHeight, Math.max(...ys));
    if (P.some(p => !p[2]) || r - l < 48 || b - t < 48) { leaveUp.style.display = "none"; leaveUp.tabIndex = -1; return; } // the words out of view (the page's top looks at the bare wall beside them): no tap area, nothing to tab to
    Object.assign(leaveUp.style, { display: "block", left: l + "px", top: t + "px", width: r - l + "px", height: b - t + "px" }); leaveUp.tabIndex = 0; }
  function endPlace(now) { camera.updateMatrixWorld(); if (endS.show) { inflow.visible = false; outflow.visible = false; curtain.me.visible = false; LRUNS.forEach(r => r.f.me.visible = false); } // the poured paint is not in the day's picture
    const { leaveHot } = endS.hots, ui = endS.show && !pick.mode && endReady, marks = ui; // a phone looking at the form has no marks over it to tap: nothing may lie over the form; the tabs sit under it, so they stay live
    eCan3.visible = endS.show && !leaveHot.hidden;
    { const P = [ECAN.clone().add(V(-.45, 0, 0)), ECAN.clone().add(V(.45, 1.3, 0))].map(proj), l = Math.min(P[0][0], P[1][0]), r = Math.max(P[0][0], P[1][0]), t = Math.min(P[0][1], P[1][1]), b = Math.max(P[0][1], P[1][1]);
      if (!marks || leaveHot.hidden || !P.every(q => q[2]) || r < 0 || l > innerWidth || b < 0 || t > innerHeight) { leaveHot.style.display = "none"; leaveHot.tabIndex = -1; }
      else { const w = Math.max(48, r - l), h = Math.max(48, b - t); Object.assign(leaveHot.style, { display: "block", left: (l + r) / 2 - w / 2 + "px", top: (t + b) / 2 - h / 2 + "px", width: w + "px", height: h + "px" }); leaveHot.tabIndex = 0; } }
    canvas.style.touchAction = narrowNow() ? "pan-y" : "";
    // hover: the glow, the label
    let act = null, dt = Math.min(.1, (now - (endPlace.last || now)) / 1000); endPlace.last = now;
    for (const h of HOTL) { const el = h.el, shown = el.style.display === "block" && !el.hidden, on = shown && el.matches(":hover, :focus-visible"), g = h.glow; let target = on ? 1 : 0; // a hot spot with no label (Tom 11-24: the painted Leave your tag says it once) still glows
      if (shown) { g.build(); if (!g.pulsed && PULSE && !REDUCED) { g.pulsed = true; g.pulse = now; } }
      if (g.pulse >= 0) { const t = (now - g.pulse) / 1400; if (t < 1) target = Math.max(target, .5 * Math.sin(Math.PI * t)); else g.pulse = -1; }
      g.op += (target - g.op) * (REDUCED ? 1 : Math.min(1, dt * 10)); if (g.mesh) { g.mesh.material.opacity = g.op; g.mesh.visible = g.op > .01 && !g.gone; } if (on && h.label) act = h; }
    if (!act && endS.show) { const h = HOTL.find(h => h.el === endS.hots.leaveHot); if (h && h.el.style.display === "block") { act = h; act.below = true; } } // the can says what it is without a hover: a phone has none (design review 11-23)
    if (act) { const r = act.el.getBoundingClientRect(); hlEl.textContent = act.label; hlEl.classList.add("on"); const lw = hlEl.offsetWidth, lh = hlEl.offsetHeight;
      // over the mark (under it for the can), its middle first, then its ends; where painted words sit round the mark (act.avoid), also just over or under each
      // of them, the nearest first. The first place that covers none of them, nor the mark's own painted word, wins.
      const words = act.avoid ? [[r.left, r.top, r.right, r.bottom], ...act.avoid()] : [], clear = (x, y) => words.every(([a, b, c, d]) => x + lw + 6 < a || x - 6 > c || y + lh + 6 < b || y - 6 > d);
      const xs = [(r.left + r.right) / 2 - lw / 2, r.left, r.right - lw].map(x => cl(x, 8, innerWidth - lw - 8)), off = y => y + lh < r.top ? r.top - y - lh : y > r.bottom ? y - r.bottom : 0;
      const ys = [...(act.below ? [r.bottom + 8, r.top - lh - 8] : [r.top - lh - 8, r.bottom + 8]), ...words.flatMap(([, b, , d]) => [b - lh - 8, d + 8]).sort((a, b) => off(a) - off(b))].filter(y => y >= 8 && y + lh <= innerHeight - 8);
      let at = null; // (Tom 11-26) the production's three pieces say "Opens GitHub" in ONE place on every screen: top middle under the stripe. Each was put by where its own box and words stood, so it moved from piece to piece and, where the box ran off the screen, was not drawn at all
      if (act.fixed) at = [(innerWidth - lw) / 2, 44];
      else for (const y of ys.length ? ys : [r.bottom + 8]) { for (const x of xs) if (clear(x, y)) { at = [x, y]; break; } if (at) break; }
      at ||= [xs[0], ys[0] ?? r.bottom + 8]; hlEl.style.left = at[0] + "px"; hlEl.style.top = at[1] + "px"; act.below = false; } else hlEl.classList.remove("on"); }
  // Leave your tag (Tom 11-17, PR5 pick the spot): from the form the camera steps back to a wide shot of the whole wall a visitor may tag:
  // the visitor stretch left of the opening and the opening wall itself, where the bucket pours, so the tags greet everyone who arrives.
  // Lit = may be tagged; dark = kept clear (the title, the line's run to the drain, the bucket's ledge). Tap a lit part: that is the spot (Tom 11-18:
  // tap = your spot, draw at once); the camera flies in close, the wall dims round a work light on it (one dark sheet with a hole, no extra light:
  // every light costs a frame on the T14s) and the drawing starts. Move it goes back to the wide shot, the paint kept. One frame size for everyone,
  // a real tag's size (Tom 11-18: 2.4 x 1.35 m, filling most of the screen close in). Tags are never removed and never covered (Tom 11-27): kept-clear areas, the spots waiting tags hold
  // and the spots approved tags have (both from the store) turn the frame yellow. When no spot is left the area grows along the wall to the left (areaGrow), a step at a time, to the wall's end.
  const FRAME = { w: 2.4, h: 1.35 }, AREA = { x0: VISITOR_WALL.x0, x1: 8.5, y0: GROUND + .4, y1: WALL_TOP - 1 }; // x1: short of the step down to the epaRadar wall
  const AREA_BASE = AREA.x0, AREA_END = WX - WW / 2 + .5 /* the wall's own left end, with a little air */, AREA_STEP = FRAME.w + .5; // one more column of tags a step
  let CLEAR = []; // kept-clear boxes [x0, y0, x1, y1], made when the tool opens
  // Kept clear is the wall's, not the moment's or the screen's (Tom 11-23): a tag is saved in metres and shown on every screen, by night and
  // by day, so every part ever painted or pasted on this wall stays clear on every device: the mural and the bucket's ledge in both
  // layouts, the flyer with a wider calm zone (the recruiter reads the form first), the visitors' words and their can. tools/pitch/checks/space.js proves it.
  function clearBoxes() { const m = .3, b = [];
    for (const M of NARROW ? [MURALS.narrow, MURALS.wide] : [MURALS.wide, MURALS.narrow]) { /* this screen's mural first: CLEAR[0] is the title (pickTest) */ const lx = -M.ledge - .55; b.push([M.cx - M.w / 2 - m, M.cy - M.h / 2 - m, M.cx + M.w / 2 + m, M.cy + M.h / 2 + m], [lx - 1.2, WALL_TOP - 2, lx + 1.6, WALL_TOP], [lx - 1.9, GROUND - .3, lx + 1.9, GROUND + 1.5] /* where the bucket lands and lies after its fall */, M.plate.calm.map((v, i) => v + (i < 2 ? -m : m))); } // the piece, the bucket's ledge, and the wall its plate stands on
    for (const s of Object.values(SIGN)) { const c = SIGN_BOX(s); b.push([c[0] - m, c[1] - m, c[2] + m, c[3] + m]); } // the signature (Tom 11-28)
    // the bucket's leftover paint (runs, drips, splash, puddle, the run to the drain) is not kept clear: a tag may sit on it (Tom 11-27)
    const calm = .6, box = o => { const c = new THREE.Box3().setFromObject(o); return [c.min.x - m, c.min.y - m, c.max.x + m, c.max.y + m]; };
    b.push([eU(E.flyer[0]) - calm, GROUND - .2, eU(E.flyer[2]) + calm, eV(E.flyer[1]) + calm], box(vWords), box(vCan3), ...BOMB_CLEAR); return b; }
  const inArea = (x, y) => [cl(x, AREA.x0 + FRAME.w / 2, AREA.x1 - FRAME.w / 2), cl(y, AREA.y0 + FRAME.h / 2, AREA.y1 - FRAME.h / 2)];
  const hits = (x, y) => c => x + FRAME.w / 2 > c[0] && x - FRAME.w / 2 < c[2] && y + FRAME.h / 2 > c[1] && y - FRAME.h / 2 < c[3];
  const keptBy = (x, y) => CLEAR.some(hits(x, y)) ? "clear" : HELD.some(hits(x, y)) ? "held" : TAKEN.some(hits(x, y)) ? "taken" : null, kept = (x, y) => !!keptBy(x, y); // HELD: where a waiting tag of someone else is, TAKEN: where an approved tag is (the store); they stay lit, only the frame turns yellow
  const freeSpot = near => { let best = null, bd = 1e9; for (let x = AREA.x0 + FRAME.w / 2; x <= AREA.x1 - FRAME.w / 2; x += .25) for (let y = AREA.y0 + FRAME.h / 2; y <= AREA.y1 - FRAME.h / 2; y += .25) { const d = Math.hypot(x - near[0], y - near[1]); if (d < bd && !kept(x, y)) { bd = d; best = [x, y]; } } return best; };
  // the wall is full (no spot left for a frame): the area grows along the wall, so no tag is ever covered or removed (Tom 11-27). It never shrinks during a visit.
  function areaGrow() { if (!CLEAR.length) return; while (AREA.x0 > AREA_END && !freeSpot([AREA.x0, 3])) AREA.x0 = Math.max(AREA_END, AREA.x0 - AREA_STEP); }
  const pickEl = document.getElementById("pick"), pickDim = pickEl.querySelector(".dim"), pickOv = pickEl.querySelector(".ov"), pickFrame = document.getElementById("pickFrame"), pickHint = document.getElementById("pickHint"),
    pickCancel = document.getElementById("pickCancel"), tagMoveB = document.getElementById("tagMoveB");
  const pick = { mode: 0, from: null, t0: 0, dur: 1, k: 0, fog: 0, x: 0, y: 0, cx: 0, cy: 0, ox: 0, drag: null, pan: null, locked: false, ui: false, r: 0, fw: FRAME.w, fh: FRAME.h, rot: 0, last: [V(), V()] }; // fw, fh, rot: the frame's own size and turn (Tom's wall picks a tag up in it)
  // Tom's wall (PR7b): off for everyone. on: his cookie was answered by the server; view: the wide shot with every tag pickable; make: he is drawing a tag of his own (the tag tool, with no limits)
  const adm = { on: false, view: false, make: false, map: new Map(), queue: [], sel: null, g: null, undo: null, note: "", fail: false, busy: false, ready: false, listed: false, link: new URLSearchParams(location.search).get("tag") };
  const th = () => Math.tan(camera.fov * Math.PI / 360);
  const ovD = () => Math.min(30, Math.max((AREA.x1 - AREA.x0 + 1.5) / (2 * th() * camera.aspect), (AREA.y1 - AREA.y0 + 1.5) / (2 * th()))); // the whole area on a laptop; a phone sees ~11 m and swipes
  const ovHalf = () => ovD() * th() * camera.aspect; // half the width the wide shot sees on the wall
  const ovX = x => { const h = ovHalf(), a = AREA.x0 + h - .75, b = AREA.x1 - h + .75; return a > b ? (AREA.x0 + AREA.x1) / 2 : cl(x, a, b); };
  const closeD = () => Math.max(FRAME.w / ((NARROW ? .92 : .8) * 2 * th() * camera.aspect), FRAME.h / (.7 * 2 * th())); // the frame fills ~a third of a laptop screen, most of a phone's width
  const partWord = () => AREA.x0 < AREA_BASE ? "free" : "lit"; // once the area has grown its new part lies past the lamps: "lit" would not be true there (signum L1)
  function pickShow() { const why = keptBy(pick.x, pick.y), t = !!why, m = pick.mode; if (m < 0) return; /* on the way back the last words stay while they fade */ pickFrame.classList.toggle("taken", t); pickFrame.classList.toggle("locked", pick.locked); pickFrame.classList.toggle("small", m === 1);
    pickFrame.setAttribute("aria-valuetext", why === "held" ? "someone is tagging here" : why === "taken" ? "a tag is here" : t ? "kept clear" : "free"); tagMoveB.hidden = m !== 2 || tag.stage !== "draw";
    tagBar.hidden = m !== 2 || tag.stage !== "draw"; tagSend.hidden = m !== 2 || tag.stage !== "send" || !!tag.play; if (tagBar.hidden) tagMenus(); // wide: tapping the wall is the step, no buttons
    pickHint.textContent = tag.stage === "draw" ? (tag.full ? "That's all the paint one tag holds. Undo a stroke or press Done." : "Draw your tag inside the frame.") : tag.stage === "send" ? (tag.play ? "Your tag, once more." : tag.err ? "Couldn't keep your tag: this browser doesn't let the page save it. Try again, or Cancel." : "Add a name if you like, then put it on the wall.") : m === 1 && pick.nope && t ? (why === "held" ? "Someone's tagging here. Pick another spot." : why === "taken" ? "A tag is here already. Pick another spot." : `This part stays clear. Tap a ${partWord()} part of the wall.`)
      : (m === 1 && tag.lost ? "Someone tagged that spot first. Pick another spot." : `Tap a ${partWord()} part of the wall where your tag goes.`) + (ovHalf() * 2 < AREA.x1 - AREA.x0 ? " Swipe to see more of it." : ""); admPaint(); }
  function pickGo(m, dur) { pick.from = [pick.last[0].clone(), pick.last[1].clone()]; pick.t0 = performance.now(); pick.mode = m; pick.dur = dur; pick.pan = null;
    pick.ui = false; if (m <= 0) document.documentElement.classList.remove("flow"); /* only when the flow ends: between its steps the stripe stays away */ pickEl.classList.remove("on"); pickEl.setAttribute("aria-hidden", true); pickEl.inert = true; pickFrame.tabIndex = -1; pickShow(); }
  function pickAt(x, y) { [pick.x, pick.y] = inArea(x, y); pickShow(); }
  const PICK_NEAR = [-6.5, 3.5]; let pickNear = PICK_NEAR;
  document.getElementById("leave").addEventListener("click", e => { e.preventDefault(); const near = tag.lost ? [tag.x, tag.y] : pickNear; pickNear = PICK_NEAR; if (pick.mode) return; if (adm.on) { admOpen(); return; } CLEAR = clearBoxes(); areaGrow(); tagStore(false); if (tag.lost) tagLostPick(); /* the spot went to someone else: the wide shot, the drawing kept, the nearest free spot offered */
    const best = freeSpot(near);
    [pick.x, pick.y] = best || [-12, 3]; pick.ox = ovX(NARROW ? pick.x : 0); pick.locked = false; pickGo(1, 1.4); // the first spot offered: free, beside the opening, where the first screen looks (from the visitors' wall: on it)
    root.style.overflow = "hidden"; root.style.touchAction = "none"; document.activeElement?.blur?.(); });
  const pickIn = () => { [pick.cx, pick.cy] = [pick.x, pick.y]; pickGo(2, .9); };
  const pickWideGo = () => { pick.locked = false; pick.nope = false; pick.ox = ovX(pick.x); pickGo(1, .9); }, pickQuit = () => { if (pick.mode > 0) { tagStop(); if (adm.make) { adm.make = false; adm.view = true; adm.fail = false; pickWideGo(); return; } if (adm.view) { adm.view = false; admSelect(null); } pickGo(-1, 1.2); } }; // Cancel: back to the form from any step
  // the spot chosen (a tap, or Enter on the frame): kept clear says so; else fly in and draw, with the paint so far if it was moved
  const pickChoose = () => { if (!adm.make && kept(pick.x, pick.y)) { pick.nope = true; pickShow(); return; } pick.locked = true; pickIn(); tag.stage === "move" ? tagMoveTo() : tagStart(); };
  const pickBack = () => { if (tagMenus()) return; if (adm.view) { if (adm.sel || adm.undo) admSelect(null); else pickQuit(); return; } if (tag.stage === "send") { if (!tag.play) tagRedo(); return; } if (tag.stage === "draw") { tagMove(); return; }
    if (tag.stage === "move") { [pick.x, pick.y] = [tag.x, tag.y]; pickChoose(); return; } pickQuit(); };
  // Esc: one step back (a menu closes; the name -> drawing; drawing -> the wide shot to move it; moving -> back to where it was; the wide shot -> the form). Esc never throws paint away
  pickCancel.addEventListener("click", pickQuit); tagMoveB.addEventListener("click", () => tagMove());
  const wallAt = (px, py) => { const r = V(px / innerWidth * 2 - 1, 1 - py / innerHeight * 2, .5).unproject(camera).sub(camera.position), k = -camera.position.z / r.z; return k > 0 ? [camera.position.x + r.x * k, camera.position.y + r.y * k] : null; };
  pickEl.addEventListener("pointerdown", e => { if (adm.view || pick.locked || !pick.ui || e.target.closest(".bar, .top")) return; pickEl.setPointerCapture(e.pointerId); pick.pan = { px: e.clientX, py: e.clientY, ox: pick.ox, moved: false }; });
  pickEl.addEventListener("pointermove", e => { const p = pick.pan; if (!p) { if (!adm.view && pick.mode === 1 && pick.ui && e.pointerType === "mouse" && !e.target.closest(".top")) { const w = wallAt(e.clientX, e.clientY); if (w) { pick.nope = false; pickAt(w[0], w[1]); } } return; } // a mouse shows where a click puts it const dx = e.clientX - p.px; if (Math.hypot(dx, e.clientY - p.py) > 8) p.moved = true; // a swipe is never a tap; in the wide shot on a phone it moves along the wall
    if (p.moved && pick.mode === 1) pick.ox = ovX(p.ox - dx * ovHalf() * 2 / innerWidth); });
  pickEl.addEventListener("pointerup", e => { const p = pick.pan; pick.pan = null; if (!p || p.moved) return; const w = wallAt(e.clientX, e.clientY); if (!w) return; // a tap: the frame goes there (wide: and the camera flies in)
    const [x, y] = w; if (pick.mode !== 1 || x < AREA.x0 || x > AREA.x1 || y < AREA.y0 || y > AREA.y1) return; pickAt(x, y); pickChoose(); });
  pickEl.addEventListener("pointercancel", () => pick.pan = null);
  pickFrame.addEventListener("keydown", e => { if (adm.view) return admKey(e); if (pick.locked) return; if (e.key === "Enter" && pick.mode === 1) { e.preventDefault(); pickChoose(); return; }
    pick.nope = false; const st = pick.mode === 1 ? .5 : .1, a = { ArrowLeft: [-st, 0], ArrowRight: [st, 0], ArrowUp: [0, st], ArrowDown: [0, -st] }[e.key]; if (!a) return; e.preventDefault(); pickAt(pick.x + a[0], pick.y + a[1]); if (pick.mode === 1) pick.ox = ovX(pick.x); });
  addEventListener("keydown", e => { if (e.key === "Escape" && pick.mode > 0) pickBack(); });
  function pickCam(now, dt, cp, look) { // after the morning set the form's view: from there to the wide shot, or in close to the spot, or back
    skyMesh.visible = !pick.mode; // the sky over the last wall ends above the opening: the wide shot would show its edge
    if (!pick.mode) { pick.last[0].copy(cp); pick.last[1].copy(look); if (pick.refocus) { const t = leaveB.style.display === "block" ? leaveB : leaveUp; if (!t.hidden && t.style.display === "block") { pick.refocus = false; t.focus({ preventScroll: true }); } } return; } // the painted marks show a frame after the form (endPlace) // after Cancel the keyboard is back where it left
    const tk = REDUCED ? 1 : sm(cl((now - pick.t0) / 1000 / pick.dur));
    { const f = Math.min(1, (REDUCED ? 60 : 3) * dt); pick.cx += (pick.x - pick.cx) * f; pick.cy += (pick.y - pick.cy) * f; } // the camera follows the spot
    let P, L; if (pick.mode === 1) { const oy = (AREA.y0 + AREA.y1) / 2; P = V(pick.ox, oy, ovD()); L = V(pick.ox, oy, 0); } else if (pick.mode === 2) { P = V(pick.cx, pick.cy, closeD()); L = V(pick.cx, pick.cy, 0); } else { P = cp.clone(); L = look.clone(); }
    cp.lerpVectors(pick.from[0], P, tk); look.lerpVectors(pick.from[1], L, tk); pick.last[0].copy(cp); pick.last[1].copy(look);
    pick.k = pick.mode < 0 ? 1 - tk : 1; pick.fog += ((pick.mode === 1 ? 1 : 0) - pick.fog) * Math.min(1, (REDUCED ? 60 : 3) * dt); scene.fog.density = .04 - .03 * pick.fog; // the wide shot sees 30 m: thin the haze
    const ui = pick.mode > 0 && tk > .97; if (ui !== pick.ui) { pick.ui = ui; if (ui) document.documentElement.classList.add("flow"); pickEl.classList.toggle("on", ui); pickEl.dataset.mode = pick.mode; pickEl.setAttribute("aria-hidden", !ui); pickEl.inert = !ui; pickFrame.tabIndex = ui ? 0 : -1; if (ui) (pick.locked ? tagToolB : pickFrame).focus({ preventScroll: true }); }
    if (pick.mode < 0 && tk >= 1) { pick.mode = 0; pick.refocus = true; pick.k = 0; pick.fog = 0; scene.fog.density = .04; root.style.overflow = ""; root.style.touchAction = ""; } }
  function pickPlace() { if (!pick.ui) return; camera.updateMatrixWorld(); // after the camera moved: the frame, and the work light (close) or the lit area (wide)
    const [ax, ay] = proj(V(pick.x - pick.fw / 2, pick.y + pick.fh / 2, 0)), [bx, by] = proj(V(pick.x + pick.fw / 2, pick.y - pick.fh / 2, 0)), w = bx - ax, h = by - ay;
    pickFrame.style.width = w + "px"; pickFrame.style.height = h + "px"; pickFrame.style.transform = `translate(${ax}px, ${ay}px)` + (pick.rot ? ` rotate(${-pick.rot}deg)` : "");
    if (pick.mode === 2) { pickDim.style.transform = `translate(${(ax + bx) / 2}px, ${(ay + by) / 2}px)`;
      const r = Math.round(Math.hypot(w, h) * .5); if (Math.abs(r - pick.r) > 2) { pick.r = r; pickDim.style.setProperty("--r0", r * .75 + "px"); pickDim.style.setProperty("--r1", r * 1.6 + "px"); } } // lit to just past the frame's corners, dark a frame further out
    else { const box = (x0, y0, x1, y1) => { const [a, b] = proj(V(x0, y1, 0)), [c, d] = proj(V(x1, y0, 0)); return `M${a.toFixed(1)} ${b.toFixed(1)}H${c.toFixed(1)}V${d.toFixed(1)}H${a.toFixed(1)}Z`; };
      pickOv.firstChild.setAttribute("d", `M-9 -9H${innerWidth + 9}V${innerHeight + 9}H-9Z` + box(AREA.x0, AREA.y0, AREA.x1, AREA.y1)); // dark outside the area
      pickOv.lastChild.setAttribute("d", CLEAR.map(c => box(Math.max(c[0], AREA.x0), Math.max(c[1], AREA.y0), Math.min(c[2], AREA.x1), Math.min(c[3], AREA.y1))).join("")); } } // and over what stays clear
  const runsIn = (x0, yb, x1, yt) => [...pourRuns, ...LRUNS.map(l => ({ x: l.x, y: GROUND, ys: WALL_TOP })), ...(uTnow < CUR.tailLand + .1 ? [{ x: CUR.x, y: GROUND, ys: WALL_TOP }] : [])].filter(s => s.x > x0 - .05 && s.x < x1 + .05 && s.y < yt && s.ys > yb).map(s => +s.x.toFixed(2)); // every run of the pour through a box on the wall, in metres: the leftover runs and the two beside the bucket (they stay on the wall), and the bucket's own stream for as long as it falls (it is in the air, gone about 2.5 s after the tap)
  window.plateTest = { // for the plates check: the pictures and the mural on the screen now, and every plate that shows
    pictures: () => PROT.filter(([name]) => paint.visible || !/^the mural/.test(name)).map(([name, a, b, only]) => { const [x0, y0, o0] = proj(a), [x1, y1, o1] = proj(b); return o0 && o1 ? { name, only, l: Math.min(x0, x1), t: Math.min(y0, y1), r: Math.max(x0, x1), b: Math.max(y0, y1) } : null; }).filter(Boolean),
    runsBehind: r => { const [x0, yb] = wallAt(r.left, r.bottom), [x1, yt] = wallAt(r.right, r.top); return runsIn(x0, yb, x1, yt); }, // the pour's runs that come down the wall behind this screen box (the start wall's plate)
    runsOverSign: () => runsIn(...SIGN_BOX(SIGN[NARROW ? "narrow" : "wide"])), // and those that cross the tlxq's box (Tom 11-28: none, on both screens)
    nameWhole: () => plateAt < 1e9 ? plateAt / TS : null }; // seconds after the tap at which the poured name is whole: the plate shows then
  window.pickTest = { // for the pickspot check: where things are on the screen now
    clearOnScreen: () => { for (const c of CLEAR) for (let y = c[3] - .2; y > c[1]; y -= .3) for (let x = c[0] + .4; x < c[2]; x += .3) { if (HELD.some(h => x > h[0] && x < h[2] && y > h[1] && y < h[3])) continue; // a kept-clear point on screen that no waiting tag covers
      const [px, py] = proj(V(x, y, 0)); if (px > 40 && px < innerWidth - 40 && py > 100 && py < innerHeight - 100) return { x: px, y: py }; } return null; },
    freeOnScreen: () => { for (let y = AREA.y1 - 1; y > AREA.y0 + 1; y -= .4) for (let x = AREA.x0 + 1; x < AREA.x1 - 1; x += .4) { if (kept(...inArea(x, y)) || Math.hypot(x - pick.x, y - pick.y) < 1) continue; /* a tap puts the frame at inArea's place */ const [px, py] = proj(V(x, y, 0)); if (px > 80 && px < innerWidth - 80 && py > 140 && py < innerHeight - 140) return { x: px, y: py }; } return null; },
    restored: () => pick.fog === 0 && scene.fog.density >= (endS.show ? .012 : .04 - .026 * dayNow()) - 1e-9 /* the day's start haze is thinner than the night's .04 */ && skyMesh.visible && root.style.touchAction === "",
    heldOnScreen: () => { const h = HELD[0]; if (!h) return null; const [px, py] = proj(V((h[0] + h[2]) / 2, (h[1] + h[3]) / 2, 0)); return { x: px, y: py }; },
    worldAt: (px, py) => wallAt(px, py),
    spotOnScreen: () => { const [px, py] = proj(V(pick.x, pick.y, 0)); return { x: px, y: py }; },
    // for the space check: the kept-clear boxes the tag tool would use now, and where the wall's own parts are (metres, [x0, y0, x1, y1])
    // for the space check: which of these frame spots (centres, metres) the camera shows whole right now
    onScreen: (spots, wide) => { const keep = [camera.position.clone(), camera.quaternion.clone()]; if (wide && !narrowNow()) { const w = endWide(); camera.position.copy(w[1]); camera.lookAt(w[2]); } camera.updateMatrixWorld();
      const out = spots.map(([x, y]) => [[-1, -1], [1, -1], [1, 1], [-1, 1]].every(([a, b]) => { const [px, py, front] = proj(V(x + a * FRAME.w / 2, y + b * FRAME.h / 2, 0)); return front && px >= 0 && px <= innerWidth && py >= 0 && py <= innerHeight; }));
      camera.position.copy(keep[0]); camera.quaternion.copy(keep[1]); camera.updateMatrixWorld(); return out; },
    // for the grow check: with these spots taken (boxes in metres), how far the area reaches and which spot is offered first
    grow: boxes => { TAKEN = boxes; CLEAR = clearBoxes(); areaGrow(); const s = freeSpot(PICK_NEAR); return { base: AREA_BASE, end: AREA_END, x0: AREA.x0, y0: AREA.y0, y1: AREA.y1, x1: AREA.x1, offered: s, why: s ? keptBy(s[0], s[1]) : null }; },
    space: () => { const bx = o => { const b = new THREE.Box3().setFromObject(o); return [b.min.x, b.min.y, b.max.x, b.max.y]; };
      return { narrow: NARROW, area: { ...AREA, x0: AREA_END } /* the area as far as it can grow: what the wall has room for */, now: AREA.x0, base: AREA_BASE, frame: FRAME, clear: clearBoxes(), things: { mural: bx(paint), plate: MU.plate.calm, tlxq: SIGN_BOX(SIGN[NARROW ? "narrow" : "wide"]), flyer: [eU(E.flyer[0]), eV(E.flyer[3]), eU(E.flyer[2]), eV(E.flyer[1])], words: bx(vWords), can: bx(vCan3) } }; } };

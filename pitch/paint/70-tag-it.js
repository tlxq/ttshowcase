  // ---- Tag it (Tom 11-17, PR6): after Lock spot the visitor draws in the frame with real graffiti tools; every stroke keeps its own tool
  // and colour. The paint goes on its own small surface on the wall, sent to the graphics card only on frames it changes. Paint stops at the
  // frame; only drips run below it. Done: the tag sprays itself once in the visitor's own rhythm, then a name (optional) and Put it on the wall.
  // The tag stays in this browser (one per device, forever) and shows at its spot, full colour, on every visit. It is also sent to the store (api/tags.ts), quietly:
  // the visitor never sees it go, and a send that fails is tried again on a later visit. After Tom's OK everyone else's wall paints it too.
  const TPM = 320, DRIP = .4, TW = Math.round(FRAME.w * TPM), TFH = Math.round(FRAME.h * TPM), TH = Math.round((FRAME.h + DRIP) * TPM); // pixels a metre; the frame; room for drips
  const TCOLS = [["Black", "#151515"], ["White", "#f2f0ea"], ["Chrome", "#b9bcc2"], ["Gold", "#c9a03a"], ["Red", "#d42a2a"], ["Orange", "#ff4f1a"], ["Yellow", "#f5cf2b"],
    ["Green", "#2fa35a"], ["Sky blue", "#4fb3e8"], ["Deep blue", "#1f3fa6"], ["Purple", "#7a3fb0"], ["Pink", "#ef6fa8"]];
  const TICON = { can: '<svg width="22" height="26" viewBox="0 0 22 26" aria-hidden="true"><rect x="5" y="6" width="12" height="19" rx="2" fill="currentColor" opacity=".9"/><rect x="8" y="2" width="6" height="4" rx="1" fill="currentColor" opacity=".6"/><rect x="10" y="0" width="2" height="2" fill="currentColor"/></svg>',
    mop: '<svg width="22" height="26" viewBox="0 0 22 26" aria-hidden="true"><path d="M6 8h10v15a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z" fill="currentColor" opacity=".9"/><rect x="7" y="2" width="8" height="6" rx="3" fill="currentColor" opacity=".55"/></svg>',
    chisel: '<svg width="22" height="26" viewBox="0 0 22 26" aria-hidden="true"><rect x="7" y="7" width="8" height="18" rx="1.5" fill="currentColor" opacity=".9"/><path d="M8 7 14 2v5z" fill="currentColor" opacity=".6"/></svg>',
    pen: '<svg width="22" height="26" viewBox="0 0 22 26" aria-hidden="true"><rect x="8.5" y="6" width="5" height="19" rx="1.5" fill="currentColor" opacity=".9"/><path d="M9.5 6 11 1l1.5 5z" fill="currentColor" opacity=".6"/></svg>' };
  // r: the mark's radius in metres on a slow pass; mist: overspray specks a dab; flow: paint a second while the can or marker is held still,
  // less as it moves (a drip starts where it reaches 1). A spray line is wide and heavy when slow, thin and light when fast, like a real cap
  const TTOOLS = [{ id: "skinny", name: "Skinny", note: "spray can: thin lines, soft mist", icon: "can", kind: "spray", r: .014, mist: 3, flow: 1.1 },
    { id: "fat", name: "Fat", note: "spray can: wide, overspray, drips", icon: "can", kind: "spray", r: .05, mist: 9, flow: 2.2 },
    { id: "mop", name: "Mop", note: "marker: wet, uneven, drips a lot", icon: "mop", kind: "mop", r: .028, flow: 3.2 },
    { id: "chisel", name: "Chisel", note: "marker: thick and thin by angle", icon: "chisel", kind: "chisel", r: .035, flow: .4 },
    { id: "pen", name: "Pen", note: "thin and solid", icon: "pen", kind: "pen", r: .006, flow: 0 }], TOOL = Object.fromEntries(TTOOLS.map(t => [t.id, t]));
  const LIM = __TAG_LIMITS__, MOST_STROKES = LIM.strokes, MOST_POINTS = LIM.points, TAG_KEY = "ttshowcase.tag", DEVICE_KEY = "ttshowcase.device", TAG_FONT = `${Math.round(.07 * TPM)}px "Saira Stencil One"`; // LIM: the store's own limits (api/tags.ts)
  const tagC = document.createElement("canvas"); tagC.width = TW; tagC.height = TH; const tgc = tagC.getContext("2d", { willReadFrequently: true });
  // Two pictures of the same canvas: while drawing (no smaller copies, and only the part that changed is sent to the graphics card: sending the
  // whole canvas and rebuilding its smaller copies every frame is what the T14s's graphics lagged on, Tom 11-18) and on the wall (with them: seen from afar)
  const tagDrawTx = new THREE.CanvasTexture(tagC); tagDrawTx.encoding = THREE.sRGBEncoding; tagDrawTx.generateMipmaps = false; tagDrawTx.minFilter = THREE.LinearFilter;
  const tagTx = new THREE.CanvasTexture(tagC); tagTx.encoding = THREE.sRGBEncoding; tagTx.anisotropy = maxAniso;
  const tglx = renderer.getContext(), tagBox = { x0: 1e9, y0: 1e9, x1: -1e9, y1: -1e9, all: true };
  const tagGrow = (x, y, r) => { tagBox.x0 = Math.min(tagBox.x0, x - r); tagBox.y0 = Math.min(tagBox.y0, y - r); tagBox.x1 = Math.max(tagBox.x1, x + r); tagBox.y1 = Math.max(tagBox.y1, y + r); };
  const tagMesh = new THREE.Mesh(new THREE.PlaneGeometry(FRAME.w, FRAME.h + DRIP), new THREE.MeshPhysicalMaterial({ map: tagTx, transparent: true, depthWrite: false, roughness: .6, clearcoat: .25, clearcoatRoughness: .3,
    polygonOffset: true, polygonOffsetFactor: -3 })); // no wall bump map: its panel grooves showed through bright paint as thin dark lines
  tagMesh.visible = false; scene.add(tagMesh);
  const tag = { err: false, stage: null, strokes: [], cur: null, t0: 0, tool: TOOL.fat, col: TCOLS[5][1], x: 0, y: 0, name: "", full: false, play: null, putAt: 0, wet: -1, runs: [] };
  const tagBar = document.getElementById("tagBar"), tagSend = document.getElementById("tagSend"), tagToolB = document.getElementById("tagTool"), tagColB = document.getElementById("tagCol"),
    tagUndo = document.getElementById("tagUndo"), tagDone = document.getElementById("tagDone"), tagToolsM = document.getElementById("tagTools"), tagColsM = document.getElementById("tagCols"),
    tagName = document.getElementById("tagName"), tagPut = document.getElementById("tagPut"), leaveB = document.getElementById("leave");
  const rng = tagRng;
  const sprites = {}, sprite = hex => { if (sprites[hex]) return sprites[hex]; const c = document.createElement("canvas"); c.width = c.height = 64; const g = c.getContext("2d"), n = parseInt(hex.slice(1), 16), C = `${n >> 16},${n >> 8 & 255},${n & 255}`;
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, `rgba(${C},.95)`); gr.addColorStop(.45, `rgba(${C},.8)`); gr.addColorStop(1, `rgba(${C},0)`); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return sprites[hex] = c; };
  const TK = { tools: TOOL, tpm: TPM, tw: TW, tfh: TFH, th: TH, sprite, grow: tagGrow }; // what the stroke renderer (tagSegDraw, above the wall's painter) needs
  const tagSeg = (g, s, j, R) => tagSegDraw(g, s, j, R, TK);
  function tagStep(s, j, R) { tgc.save(); tgc.beginPath(); tgc.rect(0, 0, TW, TFH); tgc.clip(); tagSeg(tgc, s, j, R); tgc.restore(); } // paint stops at the frame
  // Drips: paint pools where the can or marker moves slowly or stays, and a run starts there and creeps down, slowing as it dries.
  // Each is kept with its stroke ([point, length mm, start left or right of the point, px]) so a replay and the next visit show the same runs; they may run below the frame.
  function tagDripTo(s, d, from, to, end) { const r = tagDripDraw(tgc, s, d, from, to, end, TK); if (r) tagGrow(r[0], r[1], r[2]); } // whole pixels: no edge is painted twice
  function tagDripNew(s, j, now) { const P = s.pts; if (tag.strokes.reduce((n, t) => n + t.dr.length, 0) >= LIM.dripsTotal) return; /* the tag's last drip: no more, quietly */ if (P[j] < 2 || P[j] > TW - 2 || P[j + 1] < 0 || P[j + 1] > TFH) return; // only from paint inside the frame
    const R = rng(s.seed * 31 + s.dr.length * 7 + 3), d = [j, Math.round((.1 + R() * .25) * (TOOL[s.tool].kind === "mop" ? 1.4 : 1) * 1000), Math.round((R() - .5) * 1.4 * TOOL[s.tool].r * TPM)]; // runs from one pool start side by side across the mark
    s.dr.push(d); tagRun(s, d, now); }
  const tagRun = (s, d, now) => REDUCED ? tagDripTo(s, d, 0, 1e9, true) : tag.runs.push({ s, d, born: now, done: 0 });
  function tagRuns(now) { tag.runs = tag.runs.filter(r => { const L = r.d[1] / 1000 * TPM, to = L * (1 - Math.exp(-Math.max(0, now - r.born) / 900)), /* a frame's time can be a little before the event that made the run */ end = to > L * .98;
    tagDripTo(r.s, r.d, r.done, end ? L : to, end); r.done = to; return !end; }); }
  // how much paint has pooled at the tip: grows with time held, falls as the tip moves on (8 a metre)
  function tagPool(s, j, now, moved) { const T = TOOL[s.tool]; if (!T.flow) return; const P = s.pts, mv = moved && j ? Math.hypot(P[j] - P[j - 4], P[j + 1] - P[j - 3]) / TPM : 0; // a new point takes paint off; held, it only gathers
    s.load = Math.max(0, s.load + (now - s.lt) / 1000 * T.flow - mv * 8); s.lt = now; if (s.load >= 1) { s.load = 0; tagDripNew(s, j, now); } }
  function tagNamePaint() { if (!tag.name) return; tgc.font = `${Math.round(.07 * TPM)}px "Saira Stencil One", sans-serif`; tgc.textAlign = "right"; tgc.textBaseline = "top";
    tgc.fillStyle = "rgba(236,230,216,.88)"; tgc.fillText(tag.name, TW - 8, TFH + .05 * TPM); tgc.textAlign = "left"; }
  function tagRedraw() { tgc.clearRect(0, 0, TW, TH); tag.runs = []; tag.strokes.forEach(s => { const R = rng(s.seed); for (let j = 0; j < s.pts.length; j += 4) tagStep(s, j, R); });
    tag.strokes.forEach(s => (s.dr || []).forEach(d => tagDripTo(s, d, 0, 1e9, true))); tagNamePaint(); tagBox.all = true; }
  // the changed part to the graphics card, once a frame: while drawing only that part, else the whole picture
  function tagUpload() { const tx = tag.stage ? tagDrawTx : tagTx, m = tagMesh.material; if (m.map !== tx) { m.map = tx; tagBox.all = true; }
    const b = tagBox, x = Math.max(0, Math.floor(b.x0)), y = Math.max(0, Math.floor(b.y0)), w = Math.min(TW, Math.ceil(b.x1)) - x, h = Math.min(TH, Math.ceil(b.y1)) - y, pr = renderer.properties.get(tx);
    if (b.all || !pr.__webglTexture || tx !== tagDrawTx) { if (b.all || (w > 0 && h > 0)) tx.needsUpdate = true; }
    else if (w > 0 && h > 0) {
      renderer.state.bindTexture(tglx.TEXTURE_2D, pr.__webglTexture); tglx.pixelStorei(tglx.UNPACK_FLIP_Y_WEBGL, true); tglx.pixelStorei(tglx.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false); tglx.pixelStorei(tglx.UNPACK_ALIGNMENT, 4);
      tglx.texSubImage2D(tglx.TEXTURE_2D, 0, x, TH - y - h, tglx.RGBA, tglx.UNSIGNED_BYTE, tgc.getImageData(x, y, w, h)); }
    b.x0 = b.y0 = 1e9; b.x1 = b.y1 = -1e9; b.all = false; }
  function tagPlace(x, y) { tag.x = x; tag.y = y; tagMesh.position.set(x, y - DRIP / 2, .003); } // the frame's top edge stays at the spot's; the drip room hangs below
  function tagMenus(open) { const was = !tagToolsM.hidden || !tagColsM.hidden, back = !tagToolsM.hidden ? tagToolB : tagColB, inMenu = tagToolsM.contains(document.activeElement) || tagColsM.contains(document.activeElement); tagToolsM.hidden = open !== tagToolsM; tagColsM.hidden = open !== tagColsM;
    tagToolB.setAttribute("aria-expanded", open === tagToolsM); tagColB.setAttribute("aria-expanded", open === tagColsM); if (was && !open && inMenu) back.focus({ preventScroll: true }); return was && !open; }
  [tagToolsM, tagColsM].forEach(m => m.addEventListener("focusout", e => { if (!m.hidden && !m.contains(e.relatedTarget) && e.relatedTarget !== tagToolB && e.relatedTarget !== tagColB) { m.hidden = true; tagToolB.setAttribute("aria-expanded", false); tagColB.setAttribute("aria-expanded", false); } }));
  function tagBarPaint() { tagToolB.querySelector(".ic").innerHTML = TICON[tag.tool.icon]; tagToolB.querySelector(".ic").style.color = tag.col; tagToolB.querySelector(".nm").textContent = tag.tool.name; // fixed SVG: TICON is the walk's own icon set, never a visitor's input. nosemgrep: insecure-innerhtml, insecure-document-method
    const cd = tagColB.querySelector(".dot"); cd.style.background = tag.col; cd.toggleAttribute("data-ring", tag.col === TCOLS[0][1]); tagColB.setAttribute("aria-label", "Colour: " + TCOLS.find(c => c[1] === tag.col)[0]);
    tagToolsM.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", b.dataset.t === tag.tool.id)); tagColsM.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", b.dataset.c === tag.col));
    tagUndo.disabled = tagDone.disabled = !tag.strokes.length; }
  tagToolsM.innerHTML = TTOOLS.map(t => `<button type="button" data-t="${t.id}" aria-pressed="false"><span class="ic" style="color: var(--look-soft)">${TICON[t.icon]}</span><span>${t.name}<small>${t.note}</small></span></button>`).join(""); // fixed text: TTOOLS + TICON are the walk's own lists, never a visitor's input. nosemgrep: insecure-innerhtml, insecure-document-method
  tagColsM.innerHTML = TCOLS.map(([n, h]) => `<button type="button" data-c="${h}" aria-pressed="false"><span class="dot" style="background: ${h}"${h === TCOLS[0][1] ? " data-ring" : ""}></span>${n}</button>`).join(""); // fixed text: TCOLS is the walk's own colour list, never a visitor's input. nosemgrep: insecure-innerhtml, insecure-document-method
  tagToolB.addEventListener("click", () => { tagMenus(tagToolsM.hidden ? tagToolsM : null); if (!tagToolsM.hidden) tagToolsM.querySelector('[aria-pressed="true"]').focus({ preventScroll: true }); });
  tagColB.addEventListener("click", () => { tagMenus(tagColsM.hidden ? tagColsM : null); if (!tagColsM.hidden) tagColsM.querySelector('[aria-pressed="true"]').focus({ preventScroll: true }); });
  tagToolsM.addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; tag.tool = TOOL[b.dataset.t]; tagMenus(); tagBarPaint(); tagToolB.focus({ preventScroll: true }); });
  tagColsM.addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; tag.col = b.dataset.c; tagMenus(); tagBarPaint(); tagColB.focus({ preventScroll: true }); });
  function tagStart() { tag.stage = "draw"; tag.strokes = []; tag.cur = null; tag.full = false; tag.play = null; tag.putAt = 0; tagPlace(pick.x, pick.y); tgc.clearRect(0, 0, TW, TH); tag.runs = []; tagBox.all = true;
    tagMesh.visible = true; tagBarPaint(); pickShow(); document.fonts.load(TAG_FONT).catch(() => {}); }
  function tagStop() { if (!tag.stage) return; tag.stage = null; tag.strokes = []; tag.cur = null; tag.play = null; tag.runs = []; tagMesh.visible = false; tagMenus(); } // Cancel: the paint goes with it
  function tagMove() { if (tag.cur) return; tag.stage = "move"; tagMenus(); pickWideGo(); } // back to the wide shot; the paint stays and goes with the frame
  function tagMoveTo() { tag.stage = "draw"; tagPlace(pick.x, pick.y); tagBarPaint(); pickShow(); }
  function tagRedo() { tag.stage = "draw"; tag.play = null; tag.name = ""; tagRedraw(); tagBarPaint(); pickShow(); tagDone.focus({ preventScroll: true }); }
  const tagAt = e => { const w = wallAt(e.clientX, e.clientY); if (!w) return null;
    return [cl(Math.round((w[0] - (tag.x - FRAME.w / 2)) * TPM), -200, TW + 200), cl(Math.round((tag.y + FRAME.h / 2 - w[1]) * TPM), -200, TFH + 200)]; };
  const tagCount = () => tag.strokes.reduce((n, s) => n + s.pts.length / 4, 0);
  pickEl.addEventListener("pointerdown", e => { if (tag.stage !== "draw" || tag.cur || e.button > 0 || e.target.closest(".bar, .top, .menu")) return; if (tagMenus()) return; const q = tagAt(e);
    if (!q || q[0] < 0 || q[0] > TW || q[1] < 0 || q[1] > TFH) return; // a stroke starts inside the frame: one that starts outside would leave nothing to see
    if (tag.strokes.length >= MOST_STROKES || tagCount() >= MOST_POINTS) { tag.full = true; pickShow(); return; }
    pickEl.setPointerCapture(e.pointerId); const now = performance.now(); if (!tag.strokes.length) tag.t0 = now;
    const s = tag.cur = { pid: e.pointerId, tool: tag.tool.id, col: tag.col, seed: 1 + (Math.random() * 2e9 | 0), pts: [q[0], q[1], Math.round(now - tag.t0), e.pointerType === "pen" && e.pressure > 0 ? e.pressure : .5], dr: [], load: .35, lt: now }; // a spray starts with a spit
    s.R = rng(s.seed); tag.strokes.push(s); tagStep(s, 0, s.R); tagBarPaint(); });
  pickEl.addEventListener("pointermove", e => { const s = tag.cur; if (!s || e.pointerId !== s.pid) return;
    for (const ev of e.getCoalescedEvents ? e.getCoalescedEvents() : [e]) { const q = tagAt(ev), n = s.pts.length; if (!q || Math.hypot(q[0] - s.pts[n - 4], q[1] - s.pts[n - 3]) < 2) continue;
      if (tagCount() >= MOST_POINTS) { tag.full = true; pickShow(); break; }
      // each batched point keeps its own time, so the cap's speed is the hand's speed
      const now = Math.max(s.lt, ev.timeStamp || performance.now()); s.pts.push(q[0], q[1], Math.max(s.pts[n - 2], Math.round(now - tag.t0)), ev.pointerType === "pen" && ev.pressure > 0 ? ev.pressure : .5); tagStep(s, n, s.R); tagPool(s, n, now, true); } });
  const tagEnd = e => { const s = tag.cur; if (!s || (e && e.pointerId !== s.pid)) return; tag.cur = null; delete s.R; delete s.pid; delete s.load; delete s.lt; tagBarPaint(); };
  pickEl.addEventListener("pointerup", tagEnd); pickEl.addEventListener("pointercancel", tagEnd);
  tagUndo.addEventListener("click", () => { if (tag.cur) return; tag.strokes.pop(); tag.full = false; tagRedraw(); tagBarPaint(); pickShow(); if (tagUndo.disabled) tagToolB.focus({ preventScroll: true }); });
  // Done: the tag sprays itself once in the visitor's own rhythm; pauses between strokes are cut to 0.18 s and the whole is held to 4 s at most
  tagDone.addEventListener("click", () => { if (!tag.strokes.length || tag.cur) return; tag.err = false; tag.stage = "send"; tagMenus();
    let shift = 0, last = null; tag.strokes.forEach(s => { if (last !== null) shift += Math.max(0, s.pts[2] - last - 180); s.rt = []; for (let j = 2; j < s.pts.length; j += 4) s.rt.push(s.pts[j] - shift); last = s.pts[s.pts.length - 2]; });
    const total = Math.max(1, last - shift); tgc.clearRect(0, 0, TW, TH); tag.runs = []; tagBox.all = true;
    tag.play = REDUCED ? null : { at: performance.now(), f: Math.min(1, 4000 / total), si: 0, j: 0, R: null }; if (!tag.play) tagRedraw(); pickShow(); if (!tag.play) tagPut.focus({ preventScroll: true }); });
  function tagPlay(now) { const P = tag.play, el = now - P.at;
    while (P.si < tag.strokes.length) { const s = tag.strokes[P.si]; if (!P.j) P.R = rng(s.seed); if (s.rt[P.j / 4] * P.f > el) break;
      tagStep(s, P.j, P.R); s.dr.forEach(d => { if (d[0] === P.j) tagRun(s, d, now); }); P.j += 4; if (P.j >= s.pts.length) { P.si++; P.j = 0; } }
    if (P.si >= tag.strokes.length && el > 300 && !tag.runs.length) { tag.play = null; pickShow(); tagPut.focus({ preventScroll: true }); } }
  document.getElementById("tagBack").addEventListener("click", tagRedo);
  tagName.addEventListener("keydown", e => { if (e.key === "Enter" && !e.isComposing) { e.preventDefault(); tagPut.click(); } });
  // Put it on the wall: kept in this browser and sent to the store without a word; the camera steps back out to the form while the wet paint dries
  tagPut.addEventListener("click", () => { if (tag.stage !== "send" || tag.play) return; if (adm.make) { admPut(); return; } tag.name = tagName.value.replace(/[\p{Cc}\p{Cf}]/gu, "").trim().slice(0, 24); tagRedraw();
    try { localStorage.setItem(TAG_KEY, JSON.stringify({ v: 1, x: tag.x, y: tag.y, w: FRAME.w, h: FRAME.h, turn: 0, name: tag.name, strokes: tag.strokes.map(({ tool, col, seed, pts, dr }) => ({ tool, col, seed, pts, dr })) })); }
    catch (_) { tag.err = true; pickShow(); return; } // nowhere to keep it: it stays here, and Leave your tag stays
    tag.stage = null; tag.putAt = performance.now() - (REDUCED ? 1e5 : 0); leaveB.hidden = true; pick.locked = false; pickGo(-1, 1.2); tagSendOut(); });
  function tagTick(now) { if (adm.on) admTick(); if (tag.play) tagPlay(now);
    const c = tag.cur; if (c && TOOL[c.tool].flow && c.load + (now - c.lt) / 1000 * TOOL[c.tool].flow >= 1) tagPool(c, c.pts.length - 4, now, false); // held still: it pools and runs
    if (tag.runs.length) tagRuns(now);
    const w = tag.stage ? 1 : tag.putAt ? cl(1 - (now - tag.putAt) / 5000) : 0; // wet while you paint; dries over 5 s once it's on the wall
    if (Math.abs(w - tag.wet) > .01 || (w === 0 && tag.wet !== 0)) { tag.wet = w; const m = tagMesh.material; m.roughness = .6 - .48 * w; m.clearcoat = .25 + .75 * w; m.clearcoatRoughness = .3 - .25 * w; }
    if (tagBox.all || tagBox.x1 > tagBox.x0) tagUpload(); }
  // a tag as the store or this browser keeps it: the same rules as api/tags.ts's readStrokes, so a broken one is skipped, never drawn
  const tagOk = o => o && Number.isFinite(o.x) && Number.isFinite(o.y) && Array.isArray(o.strokes) && o.strokes.length && o.strokes.length <= MOST_STROKES && Math.abs(o.x) < 50 && o.y > -10 && o.y < 20 && o.strokes.reduce((n, s) => n + (s && Array.isArray(s.dr) ? s.dr.length : 0), 0) <= LIM.dripsTotal && o.strokes.reduce((n, s) => n + (s && Array.isArray(s.pts) ? s.pts.length / 4 : 1e9), 0) <= MOST_POINTS && o.strokes.every(s => s && Object.hasOwn(TOOL, s.tool) && /^#[0-9a-f]{6}$/.test(s.col) && Number.isInteger(s.seed) && Array.isArray(s.pts) && s.pts.length >= 4 && s.pts.length % 4 === 0 && s.pts.every(Number.isFinite)
    && (s.dr === undefined || Array.isArray(s.dr) && s.dr.length <= LIM.drips && s.dr.every(d => Array.isArray(d) && d.length === 3 && Number.isInteger(d[0]) && d[0] >= 0 && d[0] < s.pts.length && d[0] % 4 === 0 && Number.isFinite(d[1]) && Number.isFinite(d[2]) && d[1] > 0 && d[1] < LIM.dripMm && Math.abs(d[2]) < LIM.dripSide)));
  const tagSaved = () => { try { const o = JSON.parse(localStorage.getItem(TAG_KEY) || "null"); return o && o.v === 1 && tagOk(o) ? o : null; } catch (_) { return null; } };
  const tagSave = patch => { try { const o = JSON.parse(localStorage.getItem(TAG_KEY) || "null"); if (o) localStorage.setItem(TAG_KEY, JSON.stringify({ ...o, ...patch })); } catch (_) {} };
  // Sending: the saved tag and a random device id (kept here) go to the store. Nothing on the screen tells. sent: "yes" (and its id), or "stop" when the store will never take it
  // (400 broken, 409 this device or the spot already has one, 429 too many from this address); a network failure or a 5xx (mail service, wall busy, not set up) leaves it unsent, and the next visit tries again.
  let tagSending = false;
  const tagDevice = () => { try { let d = localStorage.getItem(DEVICE_KEY); if (!/^[\w-]{16,64}$/.test(d || "")) { d = crypto.randomUUID ? crypto.randomUUID() : Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, "0")).join(""); localStorage.setItem(DEVICE_KEY, d); } return d; } catch (_) { return null; } };
  async function tagSendOut() { const o = tagSaved(), device = o && !o.sent && !tagSending ? tagDevice() : null; if (!device) return; tagSending = true;
    try { const r = await fetch("/api/tags", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: o.name, device, spot: { x: o.x, y: o.y, w: o.w, h: o.h, turn: o.turn }, strokes: o.strokes.map(({ tool, col, seed, pts, dr }) => ({ tool, col, seed, pts, dr })) }) });
      if (r.ok) { const j = await r.json().catch(() => null); tagSave({ sent: "yes", id: j && typeof j.id === "string" ? j.id : null }); }
      else if (r.status === 400 || r.status === 409 || r.status === 429) tagSave({ sent: "stop" }); } catch (_) {} // else: unsent, tried again next visit
    tagSending = false; }
  // your own tag on every visit: at its spot, dry, and no second Leave your tag
  { const o = tagSaved();
    if (o) { tag.strokes = o.strokes; tag.strokes.forEach(s => s.dr = s.dr || []); tag.name = typeof o.name === "string" ? o.name.slice(0, 24) : ""; tagPlace(o.x, o.y); tagMesh.visible = true; tag.putAt = -1e6; leaveB.hidden = true;
      tagRedraw(); if (tag.name) document.fonts.load(TAG_FONT).then(tagRedraw, () => {}); tagSendOut(); } }
  // The wall's other tags: the store's approved ones (oldest first, so the newest paint over the older), each at its spot, drawn by the same renderer as the tag tool but on the wall's stretch pictures
  // (one picture per stretch, painted in a worker): not a mesh a tag. Yours is not in it: it shows from this browser. The store also says which spots waiting tags hold: those join the kept-clear boxes.
  let HELD = [], storeSeen = false, storeW = null;
  const tagsHeld = list => { HELD = list.filter(h => [h.x, h.y, h.w, h.h].every(Number.isFinite)).map(h => [h.x - h.w / 2, h.y - h.h / 2, h.x + h.w / 2, h.y + h.h / 2]); pickShow(); };
  async function tagStore(first) { let d = null; const asked = adm.on || admHinted(); // asked: this browser has been signed in at /admin, so the server is asked for Tom's view; every other browser asks the public question
    try { const r = await fetch(asked ? "/api/tags?admin=1" : "/api/tags", asked ? { cache: "no-store" } : undefined); if (r.ok) d = await r.json(); } catch (_) {}
    if (!d) return; if (asked) { if (d.admin === true) { if (!adm.g) admSet(d.tags); if (!adm.on) admEnter(); return; } if (adm.on) return; admUnhint(); }
    if (Array.isArray(d.held)) tagsHeld(d.held); if (!first || storeSeen) return; storeSeen = true;
    const own = tagSaved(), list = (Array.isArray(d.tags) ? d.tags : []).filter(t => tagOk(t) && Number.isFinite(t.w) && Number.isFinite(t.turn) && t.w > .2 && t.w < 6 && (!own || !own.id || t.id !== own.id)).slice(-60);
    if (!list.length) return;
    // painted while the page loads, like the hand words: done long before the bucket is ready, so no frame after the tap pays for it
    const tags = list.map(t => ({ strokes: t.strokes.map(({ tool, col, seed, pts, dr }) => ({ tool, col, seed, pts, dr: dr || [] })), x: t.x, y: t.y, w: t.w, turn: t.turn, k: 1, st: [], label: typeof t.name === "string" ? t.name.slice(0, 24) : "" }));
    storeW = wallLayer(tags, .0025); storeW.meshes.forEach(m => m && (m.frustumCulled = false)); document.documentElement.dataset.storeTags = tags.length; storeStart(); }
  async function storeStart() { const W = storeW, names = []; // names become small pictures on this thread (it has the font); the rest is the worker's
    if (W.tags.some(T => T.label)) await document.fonts.load(TAG_FONT).catch(() => {});
    for (const T of W.tags) if (T.label) { const c = document.createElement("canvas"), g = c.getContext("2d"), f = `${Math.round(.07 * TPM)}px "Saira Stencil One", sans-serif`; g.font = f; c.width = Math.ceil(g.measureText(T.label).width) + 4; c.height = Math.round(.07 * TPM * 1.5);
      g.font = f; g.textBaseline = "top"; g.fillStyle = "rgba(236,230,216,.88)"; g.fillText(T.label, 2, 0); T.nameBmp = await createImageBitmap(c); names.push(T.nameBmp); }
    wallRun(W, { hands: {}, tags: W.tags, L: W.L, K: { tools: TOOL, tpm: TPM, tw: TW, tfh: TFH, th: TH } }, names); }

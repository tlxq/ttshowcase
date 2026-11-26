  // ---- Tom's wall (PR7b, Tom 11-18). With his cookie (api/admin.ts) the server answers with every tag, waiting ones too. They are drawn one by one (a small picture and a mesh each, in place of the
  // baked stretches) so each can be picked up, moved, sized and turned. Nothing here runs for a visitor: no extra request, no mesh, and the frame loop only asks one flag.
  const admChip = document.getElementById("adm"), admNote = document.getElementById("admNote"), admSelBar = document.getElementById("admSel"), admFramesEl = document.getElementById("admFrames"),
    admSizeH = document.getElementById("admSize"), admTurnH = document.getElementById("admTurn"), admApproveB = document.getElementById("admApprove"), admRemoveB = document.getElementById("admRemove"), admUndoB = document.getElementById("admUndo");
  const ADM_HINT = "ttshowcase.admin", admGeo = new THREE.PlaneGeometry(FRAME.w, FRAME.h + DRIP), admKit = { tools: TOOL, tpm: TPM, tw: TW, tfh: TFH, th: TH, grow: null, sprite }, frameLabel = pickFrame.getAttribute("aria-label");
  const admHinted = () => { try { return localStorage.getItem(ADM_HINT) === "1"; } catch (_) { return false; } }, admUnhint = () => { try { localStorage.removeItem(ADM_HINT); } catch (_) {} };
  const admOkT = t => tagOk(t) && typeof t.id === "string" && Number.isFinite(t.w) && Number.isFinite(t.turn) && t.w > .2 && t.w < 6.01 && (t.status === "up" || t.status === "waiting");
  const admSpot = t => ({ x: +t.x.toFixed(3), y: +t.y.toFixed(3), w: +t.w.toFixed(3), h: +(t.w * FRAME.h / FRAME.w).toFixed(3), turn: +t.turn.toFixed(1) });
  function admBuild(t) { const c = document.createElement("canvas"); c.width = TW >> 1; c.height = TH >> 1; const tx = new THREE.CanvasTexture(c); tx.encoding = THREE.sRGBEncoding; tx.anisotropy = maxAniso; // half size: a hundred tags on the wall stay light
    const mesh = new THREE.Mesh(admGeo, new THREE.MeshStandardMaterial({ map: tx, transparent: true, depthWrite: false, roughness: .7, metalness: 0, polygonOffset: true, polygonOffsetFactor: -3 })), grp = new THREE.Group();
    mesh.position.y = -DRIP / 2; mesh.frustumCulled = false; grp.add(mesh); scene.add(grp); // the frame turns about its middle; the drip room hangs below
    const A = { t, c, tx, mesh, grp, order: 0, drawn: false, f: null }; adm.map.set(t.id, A); adm.queue.push(A); return A; }
  function admDraw(A) { const g = A.c.getContext("2d"), t = A.t; g.setTransform(.5, 0, 0, .5, 0, 0); g.clearRect(0, 0, TW, TH);
    g.save(); g.beginPath(); g.rect(0, 0, TW, TFH); g.clip(); t.strokes.forEach(s => { const R = rng(s.seed); for (let j = 0; j < s.pts.length; j += 4) tagSegDraw(g, s, j, R, admKit); }); g.restore(); // paint stops at the frame
    t.strokes.forEach(s => (s.dr || []).forEach(d => tagDripDraw(g, s, d, 0, 1e9, true, admKit)));
    if (t.name) { g.font = `${Math.round(.07 * TPM)}px "Saira Stencil One", sans-serif`; g.textAlign = "right"; g.textBaseline = "top"; g.fillStyle = "rgba(236,230,216,.88)"; g.fillText(t.name, TW - 8, TFH + .05 * TPM); }
    A.tx.needsUpdate = true; A.drawn = true; }
  function admPose(A) { const t = A.t, k = t.w / FRAME.w; A.grp.position.set(t.x, t.y, .003); A.grp.rotation.z = t.turn * Math.PI / 180; A.grp.scale.set(k, k, 1); }
  function admDispose(A) { scene.remove(A.grp); A.tx.dispose(); A.mesh.material.dispose(); if (A.f) A.f.remove(); adm.map.delete(A.t.id); adm.queue = adm.queue.filter(q => q !== A); }
  function admSet(list) { const keep = new Set();
    list.filter(admOkT).forEach((t, i) => { keep.add(t.id); let A = adm.map.get(t.id); t = { ...t, h: t.w * FRAME.h / FRAME.w }; if (!A) A = admBuild(t); else A.t = t; A.order = i; A.mesh.renderOrder = -1 + i * 1e-3; admPose(A); });
    for (const A of [...adm.map.values()]) if (!keep.has(A.t.id)) { if (adm.sel === A.t.id) adm.sel = null; admDispose(A); }
    adm.listed = true; admFrames(); admSelect(adm.sel && adm.map.has(adm.sel) ? adm.sel : null, true); }
  function admFrames() { for (const A of adm.map.values()) { const w = A.t.status === "waiting";
      if (w && !A.f) { const f = document.createElement("div"); f.className = "wrap"; f.dataset.id = A.t.id; f.innerHTML = '<div class="wf"></div><div class="wb"><button type="button" data-do="approve">Approve</button><button type="button" data-do="remove">Remove</button></div>'; admFramesEl.appendChild(f); A.f = f; }
      else if (!w && A.f) { A.f.remove(); A.f = null; } } }
  function admPlace() { const on = adm.view && pick.mode === 1 && pick.ui; admFramesEl.hidden = !on; if (!on) return; camera.updateMatrixWorld();
    for (const A of adm.map.values()) { if (!A.f) continue; A.f.style.display = adm.sel === A.t.id ? "none" : ""; /* the picked one has its own frame and bar */ if (adm.sel === A.t.id) continue; const t = A.t, [cx, cy] = proj(V(t.x, t.y, 0)), [ax, ay] = proj(V(t.x - t.w / 2, t.y + t.h / 2, 0)), [bx, by] = proj(V(t.x + t.w / 2, t.y - t.h / 2, 0)), w = bx - ax, h = by - ay, f = A.f.firstChild;
      f.style.width = w + "px"; f.style.height = h + "px"; f.style.transform = `translate(${cx - w / 2}px, ${cy - h / 2}px) rotate(${-t.turn}deg)`; A.f.lastChild.style.transform = `translate(${cx - 4}px, ${cy + h / 2 + 6}px)`; } }
  function admEnter() { adm.on = true; const own = tagSaved();
    if (own && own.id && adm.map.has(own.id)) { tag.strokes = []; tagMesh.visible = false; } // his own tag comes from the store like the rest, so it can be picked up
    document.fonts.load(TAG_FONT).catch(() => {}).then(() => { adm.ready = true; });
    admPaint(); }
  function admSelect(id, keep) { const A = id && adm.map.get(id); if (!keep) { adm.undo = null; adm.note = ""; adm.fail = false; } adm.sel = A ? id : null;
    if (A) { [pick.x, pick.y, pick.fw, pick.fh, pick.rot] = [A.t.x, A.t.y, A.t.w, A.t.h, A.t.turn]; } else { [pick.fw, pick.fh, pick.rot] = [FRAME.w, FRAME.h, 0]; } pickShow(); admPaint(); }
  function admPaint() { if (!adm.on) return; const A = adm.sel && adm.map.get(adm.sel), v = adm.view, n = [...adm.map.values()].filter(a => a.t.status === "waiting").length;
    admNote.textContent = n ? `Admin · ${n} waiting` : "Admin"; pickCancel.textContent = v ? "Close" : "Cancel";
    admSelBar.hidden = !(v && pick.mode === 1 && (A || adm.undo)); admApproveB.hidden = !(A && A.t.status === "waiting"); admRemoveB.hidden = !A; admUndoB.hidden = !!A || !adm.undo;
    pickFrame.style.display = v && !A ? "none" : ""; admSizeH.hidden = admTurnH.hidden = !(v && A); pickFrame.setAttribute("aria-label", v ? "The tag you picked. Move it with the arrow keys" : frameLabel);
    if (v) { pickFrame.classList.toggle("taken", !!A && A.t.status === "waiting"); pickFrame.classList.remove("locked");
      pickHint.textContent = adm.fail ? "Couldn't save the change. Try again." : adm.note || (A ? (A.t.status === "waiting" ? "Waiting for you. " : "On the wall. ") + "Drag to move. The corner sizes it, the dot turns it." : "Tap a tag to change it, or a bare part of the wall to tag."); }
    else if (adm.make) { if (adm.fail) pickHint.textContent = "Couldn't put your tag on the wall. Try again."; else if (tag.stage === "draw" && !tag.full && kept(pick.x, pick.y)) pickHint.textContent = "Visitors can't tag here. You can."; } }
  function admOpen() { if (pick.mode || !adm.on) return; CLEAR = clearBoxes(); adm.view = true; adm.make = false; adm.sel = null; adm.undo = null; adm.note = ""; adm.fail = false; [pick.fw, pick.fh, pick.rot] = [FRAME.w, FRAME.h, 0];
    [pick.x, pick.y] = [(AREA.x0 + AREA.x1) / 2, (AREA.y0 + AREA.y1) / 2]; pick.ox = ovX(NARROW ? pick.x : 0); pick.locked = false; pick.nope = false; pickGo(1, 1.4); tagStore(false);
    root.style.overflow = "hidden"; root.style.touchAction = "none"; document.activeElement?.blur?.(); }
  let admLit = false, admSaved = null;
  function admTick() { const show = introOver && !pick.mode; if (admChip.hidden === show) admChip.hidden = !show;
    // while Tom looks over the wall, it is lit evenly (by night too), so every tag can be seen; the light goes back as it was when he closes it
    if (adm.view !== admLit) { admLit = adm.view; document.querySelector(".hud").style.visibility = admLit ? "hidden" : ""; if (admLit) admSaved = [sky.color.clone(), sky.intensity]; else if (admSaved) { sky.color.copy(admSaved[0]); sky.intensity = admSaved[1]; } }
    if (admLit) { sky.color.set(0xc8ccd6); sky.groundColor.set(0xc8ccd6); sky.intensity = Math.max(sky.intensity, .9); }
    if (adm.ready && adm.queue.length) { const A = adm.queue.shift(); if (adm.map.get(A.t.id) === A) admDraw(A); }
    if (adm.link && adm.listed && introOver && !pick.mode) { const id = adm.link; adm.link = null; if (adm.map.has(id)) { admOpen(); admSelect(id); pick.ox = ovX(pick.x); } } } // the mail's link: walk to that tag and pick it
  document.getElementById("admOpen").addEventListener("click", admOpen);
  // the hit: the newest tag under the point (the frame, turned back to square)
  function admIn(A, x, y) { const t = A.t, r = t.turn * Math.PI / 180, dx = x - t.x, dy = y - t.y, u = dx * Math.cos(r) + dy * Math.sin(r), v = -dx * Math.sin(r) + dy * Math.cos(r); return Math.abs(u) <= t.w / 2 && Math.abs(v) <= t.h / 2; }
  function admHit(x, y) { let best = null; for (const A of adm.map.values()) if (admIn(A, x, y) && (!best || A.order > best.order)) best = A; return best; }
  function admMove(A, patch) { Object.assign(A.t, patch); A.t.h = A.t.w * FRAME.h / FRAME.w; admPose(A); if (adm.sel === A.t.id) [pick.x, pick.y, pick.fw, pick.fh, pick.rot] = [A.t.x, A.t.y, A.t.w, A.t.h, A.t.turn]; }
  async function admPost(body) { try { const r = await fetch("/api/tags?admin=1", { method: "POST", headers: { "Content-Type": "application/json", "X-Admin": "1" }, body: JSON.stringify(body) }); return { ok: r.ok, status: r.status, j: await r.json().catch(() => null) }; } catch (_) { return { ok: false, status: 0, j: null }; } }
  async function admSave(A, was) { adm.undo = null; const sp = admSpot(A.t); admMove(A, sp); const r = await admPost({ do: "update", id: A.t.id, spot: sp });
    if (!r.ok) { admMove(A, was); adm.fail = true; } else { adm.fail = false; adm.note = ""; } pickShow(); }
  async function admAct(what, id) { const A = adm.map.get(id); if (!A || adm.busy) return; adm.busy = true; adm.fail = false; const t = A.t, snap = { name: t.name, spot: admSpot(t), strokes: t.strokes.map(({ tool, col, seed, pts, dr }) => ({ tool, col, seed, pts, dr: dr || [] })) };
    const r = await admPost({ do: what, id }); adm.busy = false;
    if (!r.ok) { adm.fail = true; pickShow(); return; }
    if (what === "approve") { t.status = "up"; adm.note = "Approved."; admFrames(); }
    else { if (adm.sel === id) adm.sel = null; admDispose(A); adm.undo = { ...snap, restore: r.j && r.j.row }; /* Undo puts this very row back: its id, time and device */ adm.note = "Removed."; [pick.fw, pick.fh, pick.rot] = [FRAME.w, FRAME.h, 0]; }
    pickShow(); admPaint(); }
  async function admUndo() { const u = adm.undo; if (!u || adm.busy) return; adm.busy = true; const r = await admPost({ do: "create", ...u }); adm.busy = false; if (!r.ok) { adm.fail = true; pickShow(); return; }
    adm.undo = null; await admRefresh(); admSelect(r.j.id); adm.note = "Put back."; admPaint(); }
  async function admRefresh() { try { const r = await fetch("/api/tags?admin=1", { cache: "no-store" }), d = r.ok ? await r.json() : null; if (d && d.admin === true && !adm.g) admSet(d.tags); } catch (_) {}
    for (const A of adm.map.values()) if (!A.drawn && adm.ready) { admDraw(A); adm.queue = adm.queue.filter(q => q !== A); } }
  admApproveB.addEventListener("click", () => adm.sel && admAct("approve", adm.sel)); admRemoveB.addEventListener("click", () => adm.sel && admAct("remove", adm.sel)); admUndoB.addEventListener("click", admUndo);
  document.getElementById("admDone").addEventListener("click", () => admSelect(null));
  admFramesEl.addEventListener("click", e => { const b = e.target.closest("button[data-do]"); if (b) admAct(b.dataset.do, b.closest(".wrap").dataset.id); });
  // Tom's own tag: the tag tool as it is, no limits. Put it on the wall goes up at once, and the camera steps back to the wide shot with it picked
  function admMake(x, y) { adm.view = false; adm.make = true; adm.sel = null; adm.undo = null; adm.note = ""; adm.fail = false; [pick.fw, pick.fh, pick.rot] = [FRAME.w, FRAME.h, 0]; pick.nope = false; [pick.x, pick.y] = inArea(x, y); pickChoose(); }
  async function admPut() { if (tag.stage !== "send" || tag.play || adm.busy) return; adm.busy = true; adm.fail = false; const name = tagName.value.replace(/[\p{Cc}\p{Cf}]/gu, "").trim().slice(0, 24);
    const r = await admPost({ do: "create", name, spot: { x: tag.x, y: tag.y, w: FRAME.w, h: FRAME.h, turn: 0 }, strokes: tag.strokes.map(({ tool, col, seed, pts, dr }) => ({ tool, col, seed, pts, dr })) }); adm.busy = false;
    if (!r.ok) { adm.fail = true; pickShow(); return; }
    tagName.value = ""; tagStop(); adm.make = false; adm.view = true; await admRefresh(); admSelect(r.j.id); pickWideGo(); }
  // gestures in the wide shot: drag a picked tag, pull its corner (size), turn its dot, or pinch it; a tap picks the tag under it, or tags a bare part; a swipe on a phone moves along the wall
  const admPtr = new Map();
  pickEl.addEventListener("pointerdown", e => { if (!adm.view || pick.mode !== 1 || !pick.ui || e.button > 0 || e.target.closest(".bar, .top, #admFrames button")) return;
    admPtr.set(e.pointerId, [e.clientX, e.clientY]); try { pickEl.setPointerCapture(e.pointerId); } catch (_) {}
    const A = adm.sel && adm.map.get(adm.sel), w = wallAt(e.clientX, e.clientY), was = A && admSpot(A.t);
    if (A && admPtr.size === 2) { const [p, q] = [...admPtr.values()]; adm.g = { k: "pinch", A, was, d0: Math.hypot(p[0] - q[0], p[1] - q[1]) || 1, w0: A.t.w, moved: false }; return; }
    if (adm.g) return;
    if (A && w && e.target === admSizeH) adm.g = { k: "size", A, was, d0: Math.hypot(w[0] - A.t.x, w[1] - A.t.y) || 1, w0: A.t.w, moved: false };
    else if (A && w && e.target === admTurnH) adm.g = { k: "turn", A, was, a0: Math.atan2(w[1] - A.t.y, w[0] - A.t.x), t0: A.t.turn, moved: false };
    else if (A && w && (admIn(A, w[0], w[1]) || e.target === pickFrame)) adm.g = { k: "move", A, was, dx: A.t.x - w[0], dy: A.t.y - w[1], px: e.clientX, py: e.clientY, moved: false };
    else adm.g = { k: "pan", px: e.clientX, py: e.clientY, ox: pick.ox, moved: false }; });
  pickEl.addEventListener("pointermove", e => { const g = adm.g; if (!adm.view || !g || !admPtr.has(e.pointerId)) return; admPtr.set(e.pointerId, [e.clientX, e.clientY]);
    if (g.k === "pinch") { if (admPtr.size < 2) return; const [p, q] = [...admPtr.values()]; g.moved = true; admMove(g.A, { w: cl(g.w0 * Math.hypot(p[0] - q[0], p[1] - q[1]) / g.d0, .6, 6) }); return; }
    if (g.k === "pan") { const dx = e.clientX - g.px; if (Math.hypot(dx, e.clientY - g.py) > 8) g.moved = true; if (g.moved) pick.ox = ovX(g.ox - dx * ovHalf() * 2 / innerWidth); return; }
    if (g.k === "none") return; const w = wallAt(e.clientX, e.clientY); if (!w) return;
    if (g.k === "move") { if (!g.moved && Math.hypot(e.clientX - g.px, e.clientY - g.py) < 5) return; g.moved = true; admMove(g.A, { x: cl(w[0] + g.dx, AREA.x0, AREA.x1), y: cl(w[1] + g.dy, GROUND + .2, WALL_TOP) }); }
    else if (g.k === "size") { g.moved = true; admMove(g.A, { w: cl(g.w0 * Math.hypot(w[0] - g.A.t.x, w[1] - g.A.t.y) / g.d0, .6, 6) }); }
    else if (g.k === "turn") { g.moved = true; let d = (Math.atan2(w[1] - g.A.t.y, w[0] - g.A.t.x) - g.a0) * 180 / Math.PI; d = ((d + 540) % 360) - 180; let tr = cl(g.t0 + d, -45, 45); if (Math.abs(tr) < 2) tr = 0; admMove(g.A, { turn: tr }); } });
  const admUp = e => { if (!admPtr.delete(e.pointerId)) return; const g = adm.g; if (!g) return;
    if (g.k === "pinch") { if (g.moved) admSave(g.A, g.was); adm.g = admPtr.size ? { k: "none" } : null; return; }
    if (g.k === "none") { if (!admPtr.size) adm.g = null; return; }
    adm.g = null;
    if (g.k === "pan") { if (!g.moved && e.type === "pointerup") admTap(e); return; }
    if (g.moved) admSave(g.A, g.was); };
  pickEl.addEventListener("pointerup", admUp); pickEl.addEventListener("pointercancel", admUp);
  function admTap(e) { const w = wallAt(e.clientX, e.clientY); if (!w) return; const A = admHit(w[0], w[1]); if (A) { admSelect(A.t.id); return; } if (adm.sel || adm.undo) { admSelect(null); return; }
    if (w[0] < AREA.x0 || w[0] > AREA.x1 || w[1] < AREA.y0 || w[1] > AREA.y1) return; admMake(w[0], w[1]); }
  let admKeyT = 0, admWas = null;
  function admKey(e) { const A = adm.sel && adm.map.get(adm.sel), a = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[e.key]; if (!A || !a) return; e.preventDefault(); const st = e.shiftKey ? .5 : .1;
    admWas = admWas || admSpot(A.t); admMove(A, { x: cl(A.t.x + a[0] * st, AREA.x0, AREA.x1), y: cl(A.t.y + a[1] * st, GROUND + .2, WALL_TOP) }); clearTimeout(admKeyT); admKeyT = setTimeout(() => { const was = admWas; admWas = null; admSave(A, was); }, 600); }
  window.admTest = { // for the admin check
    state: () => ({ on: adm.on, view: adm.view, make: adm.make, sel: adm.sel, chip: !admChip.hidden, chipNote: admNote.textContent, bar: !admSelBar.hidden, buttons: [...admSelBar.querySelectorAll("button")].filter(b => !b.hidden).map(b => b.textContent), hint: pickHint.textContent, mode: pick.mode, ui: pick.ui, fail: adm.fail,
      frames: admFramesEl.children.length, cancel: pickCancel.textContent, handles: !admSizeH.hidden && !admTurnH.hidden, own: tagMesh.visible, tags: [...adm.map.values()].map(A => ({ id: A.t.id, status: A.t.status, name: A.t.name, x: A.t.x, y: A.t.y, w: A.t.w, turn: A.t.turn, drawn: A.drawn, framed: !!A.f })) }),
    at: id => { const A = adm.map.get(id); camera.updateMatrixWorld(); const [x, y] = proj(V(A.t.x, A.t.y, 0)); return { x, y }; },
    bare: () => { camera.updateMatrixWorld(); for (let y = AREA.y1 - 1; y > AREA.y0 + 1; y -= .4) for (let x = AREA.x0 + 1; x < AREA.x1 - 1; x += .4) { if (admHit(x, y) || kept(...inArea(x, y))) continue; const [px, py] = proj(V(x, y, 0)); if (px > 80 && px < innerWidth - 80 && py > 140 && py < innerHeight - 140) return { x: px, y: py }; } return null; },
    handle: which => { const r = (which === "size" ? admSizeH : admTurnH).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; },
    look: id => { pick.ox = ovX(adm.map.get(id).t.x); }, open: admOpen, kept: () => kept(pick.x, pick.y), scene: () => scene.children.filter(c => c.type === "Group").length };
  tagStore(true);
  window.tagTest = { // for the tagit check
    frameBox: () => { const r = pickFrame.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; },
    state: () => ({ stage: tag.stage, strokes: tag.strokes.length, points: tagCount(), playing: !!tag.play, shown: tagMesh.visible, wet: +tag.wet.toFixed(2), name: tag.name,
      saved: (() => { try { return !!localStorage.getItem(TAG_KEY); } catch (_) { return false; } })(), leave: !leaveB.hidden,
      sent: (() => { try { return JSON.parse(localStorage.getItem(TAG_KEY)).sent || null; } catch (_) { return null; } })(), id: (() => { try { return JSON.parse(localStorage.getItem(TAG_KEY)).id || null; } catch (_) { return null; } })() }),
    held: () => HELD.length, layer: () => storeW && { stretches: storeW.want, up: storeW.done, shown: storeW.meshes.filter(m => m && m.material.map !== wallEmpty).length }, store: () => document.documentElement.dataset.storeTags || null, paintAt: (u, v) => tgc.getImageData(u, v, 1, 1).data[3], size: [TW, TFH, TH], drips: () => tag.strokes.reduce((n, s) => n + s.dr.length, 0), running: () => tag.runs.length };
  // the clock light (Tom 11-23): the start wall and the end are lit by the visitor's own time: day 07-18, night 19-06, a blend in 06-07 and 18-19. ?hour=13.5 forces one
  const HOUR_Q = new URLSearchParams(location.search).get("hour");
  function dayNow() { const d = new Date(), h = HOUR_Q !== null && HOUR_Q !== "" && isFinite(+HOUR_Q) ? ((+HOUR_Q % 24) + 24) % 24 : d.getHours() + d.getMinutes() / 60; return sm(cl(h - 6)) * (1 - sm(cl(h - 18))); }
  function clockLight(k) { skyU.uDay.value = Math.max(0, k); if (k <= 0) return; const n = 1 - k, cf = cityFar.material.color.r; // day: the street light, the work light and the stair lights off, the sun and the morning sky on
    lamp.intensity *= n; pool.intensity *= n; bulbM.emissiveIntensity *= n; work.intensity *= n; lamp2.intensity *= n; stairLight.intensity *= n; edgeL.intensity *= n; siteM.emissiveIntensity *= n;
    sky.color.lerp(SKYM, k); sky.groundColor.lerp(GNDM, k); sky.intensity += (.75 - sky.intensity) * k; sun.intensity = 2.1 * k; scene.background.lerp(BGM, k); scene.fog.color.lerp(FOGM, k);
    lens.uniforms.uAper.value += (.5 - lens.uniforms.uAper.value) * k; cityFar.material.color.setScalar(cf + (1 - cf) * k); skyU.uBg.value.copy(scene.background); }
  document.documentElement.dataset.day = dayNow().toFixed(2); // the checks read it
  function morning(now, sv, cp, look) { // after endCam: past EDGE, in close to the bare wall, the change to the visitors' wall, the light
    const day = sv >= CUT; endVisit = 0;
    // no landing, no flash (Tom 11-23, no zoom 11-24): past EDGE the street is the bare stretch's twin, moved by SEAM_D (the same concrete, the same lamp over it),
    // and its end is the visitors' wall, the page's seam. The page's top shows
    // that same wall, so scrolling down past the end jumps there, and scrolling up from the wall jumps here; nothing turns back, nothing shows
    if (sv > 1060 && !pick.mode) { scene.fog.density = .04; lens.uniforms.uAper.value = 1; }
    if (day) { const k = sm(cl((sv - CUT) / (SV_MAX - 6 - CUT))); 
      // back at the start wall in the visitor's own light (Tom 11-23): the night is the start's own set-up, the clock blends it to day
      lamp.intensity = 5.5; pool.intensity = 9; bulbM.emissiveIntensity = 2.2; work.intensity = 4.2 * .3; stairLight.intensity = 0;
      sky.color.copy(SKY0); sky.groundColor.copy(GND0); sky.intensity = .35; sun.intensity = 0; scene.background.copy(BG0); scene.fog.color.copy(FOG0); lens.uniforms.uAper.value = 1; cityFar.material.color.setScalar(.25);
      if (sv >= SV_MAX - 4 && introOver && !pick.mode && !sheetOpen) scrollTo(0, 8); // the loop: the page's top shows the same wall, then the pole, the start
      clockLight(dayNow()); }
    else { endVisit = 0; sun.intensity = 0; sky.groundColor.copy(GND0); scene.background.copy(BG0); clockLight(dayNow() * startDay * (1 - shop.ins)); } // by day the sun comes up only as the start's paint shows the wall // the street is in the clock's light all along; inside the workshop it has its own warm light (Tom 11-26)
    endReady = false; // no end landing any more (Tom 11-23): Leave your tag lives on the visitors' wall
    if (document.documentElement.dataset.endReady !== (endReady ? "1" : "0")) document.documentElement.dataset.endReady = endReady ? "1" : "0"; // the checks wait for it
    endWallState(now, false);
    sun.intensity *= 1 - .97 * shop.ins; sky.intensity *= 1 - .6 * shop.ins; } // inside the workshop the day's sun and sky are mostly shut out
  // the camera's way: along the street to the garage door, in through it, a stop in front of each tool on the workshop's back wall, out through the far door,
  // on to EDGE, on towards the sunrise (then morning() cuts to the opening wall).
  const stop = (x, y, z, ly, lz = 0) => [V(x + .1, y, z), V(x, ly, lz)];
  // the visitors' wall's street light (Tom 11-23: one more light, no swing) is lamp2, which is off wherever that wall is in view: at the epaRadar wall on the
  // walk, at the visitors' wall (and the start beside it) and at its twin past EDGE, where the walk changes from one to the other
  const L2_VIS = [V(-18.6, GROUND + 6.35, 3.7), V(-11, 1.2, 0)], L2_EPA = [lamp2.position.clone(), lamp2.target.position.clone()];
  function lamp2At(sv) { const vis = sv < 4, twin = !vis && sv > 1040;
    if (!vis && !twin) { lamp2.position.copy(L2_EPA[0]); lamp2.target.position.copy(L2_EPA[1]); lamp2.angle = .62; lamp2.penumbra = .75; return; }
    const d = twin ? SEAM_D : V(); lamp2.position.copy(L2_VIS[0]).add(d); lamp2.target.position.copy(L2_VIS[1]).add(d); lamp2.angle = .9; lamp2.penumbra = .75; lamp2.intensity = 6.2;
    }
  // the wash (R3): the visitors' lamp's own pool on the wall under it, at the page's top; past EDGE the same light moved by SEAM_D lights the way to
  // its twin, so the walk's end and the page's top are lit the same (no new light: off everywhere between)
  const WASH_TOP = () => [V(VPOST.x - .6, GROUND + 6.2, VPOST.z + 1.25), V(BARE[1].x + .4, GROUND + 1.2, 0)];
  function washAt(sv, top) { const end = sv > 990, d = end ? SEAM_D : V(), w = WASH_TOP(); washL.position.copy(w[0]).add(d); washL.target.position.copy(w[1]).add(d);
    washL.intensity = 2.6 * (end ? sm(cl((sv - 1000) / 25)) : sm(cl(top / .3))); }
  const EDGE_STOP = N_ ? stop(75, G3 + 1.9, 8.4, G3 + 1.9) : stop(75, G3 + 1.7, 9.2, G3 + 2);
  const VISIT = NARROW ? [V(-12, 2.4, 15), V(-12, 1.9, 0)] : [V(-12, 2.2, 14.5), V(-12, 1.6, 0)];
  const BARE = NARROW ? [V(-19.5, 2.6, 8), V(-19.5, 2.4, 0)] : [V(-21.2, 2.6, 8), V(-21.2, 2.4, 0)], BARE_T = BARE.map(v => v.clone().add(SEAM_D)); // R3: the page's top and the walk's end, the same view: the visitors' lamp post and the wall under it, left of the tags, the street out of view
  // the stop-motion stencil (Tom 11-24, card B of the front-turn round): his head turn, 22 frames sprayed in three layers (cream, blue, night), on the bare
  // wall left of the visitors' lamp post: the page's top, and its twin past EDGE that the walk ends on (one material, so both always show the same frame).
  // 8 frames a second with a small wobble; it looks where the pointer is, and without one it looks round by itself. The frames are made from Tom's own
  // photos; Tom said 11-24 they may be published (assets/stencil). Where they don't load, nothing is drawn.
  const STEN = { n: 22, h: NARROW ? 2.5 : 3, x: NARROW ? BARE[1].x - .7 : BARE[1].x - 1.2, y: GROUND + 4.3, frames: [], f: 11, dir: 1, step: -1, at: -1e9 };
  { const w = STEN.h * 512 / 543, mat = wallBump(new THREE.MeshStandardMaterial({ transparent: true, depthWrite: false, roughness: .6, polygonOffset: true, polygonOffsetFactor: -2, visible: false,
      normalMap: tex("assets/wall4_nor_gl.jpg", false, w / TILE, STEN.h / TILE, (STEN.x - w / 2 - (WX - WW / 2)) / TILE, (STEN.y - STEN.h / 2 - GROUND) / TILE), normalScale: new THREE.Vector2(.4, .4) }));
    STEN.mat = mat; STEN.meshes = [V(), SEAM_D].map(d => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, STEN.h), mat); m.position.set(STEN.x + d.x, STEN.y + d.y, .002); scene.add(m); return m; });
    const tl2 = new THREE.TextureLoader(LATE.mgr); let got = 0, lost = 0;
    for (let i = 0; i < STEN.n; i++) LATE.run(() => tl2.load(`assets/stencil/s${String(i).padStart(2, "0")}.webp`, t => { t.encoding = THREE.sRGBEncoding; t.anisotropy = maxAniso; STEN.frames[i] = t; LATE.up(() => { renderer.initTexture(t); LATE.got(); // each frame goes to the graphics card on its own turn, not all 22 in one frame (145 ms)
      if (++got === STEN.n) { mat.map = STEN.frames[STEN.f]; mat.opacity = 0; STEN.t0 = performance.now(); mat.visible = true; mat.needsUpdate = true; } }); }, undefined, () => { LATE.got(); if (!lost++) console.info("The stencil is off: a frame in media/stencil didn't load."); })); }
  addEventListener("pointermove", () => STEN.at = performance.now());
  function stencilTick(now, cp) { if (!STEN.mat.visible) return; const near = cp.x < -8 || cp.x > 80; STEN.meshes.forEach(m => m.visible = near); if (!near) return; STEN.mat.opacity = REDUCED ? 1 : cl((now - STEN.t0) / 700); // it comes up on its wall when its frames are in, never pops
    const step = Math.floor(now / 125); if (step === STEN.step) return; STEN.step = step;
    if (REDUCED) STEN.f = 11; else if (now - STEN.at < 2500) STEN.f = Math.round((mx * .5 + .5) * (STEN.n - 1)); else { STEN.f += STEN.dir; if (STEN.f >= STEN.n - 1 || STEN.f <= 0) STEN.dir *= -1; STEN.f = cl(STEN.f, 0, STEN.n - 1); }
    STEN.mat.map = STEN.frames[STEN.f]; const j = REDUCED ? [0, 0, 0] : [(Math.random() - .5) * .02, (Math.random() - .5) * .02, (Math.random() - .5) * .008];
    STEN.meshes.forEach((m, k) => { m.position.set(STEN.x + j[0] + (k ? SEAM_D.x : 0), STEN.y + j[1] + (k ? SEAM_D.y : 0), .002); m.rotation.z = j[2]; }); }
  // the way through the workshop (Tom 11-26): to the door, through it, then a stop in front of each tool, out by the far door
  const DOOR_X = (DOOR_A[0] + DOOR_A[1]) / 2, EXIT_X = (DOOR_B[0] + DOOR_B[1]) / 2;
  const toolStop = (x, floor) => N_ ? stop(x, floor + 1.55, WZ + 8.2, floor + 1.95, WZ) : stop(x, floor + 1.3, WZ + 7.6, floor + 1.75, WZ);
  const KEYS = [[548, 612, V(DOOR_X - .3, G3 + 1.7, 4.6), V(DOOR_X + .3, G3 + 1.5, WZ + 2)], [612, 640, V(DOOR_X + .5, G3 + 1.55, -1), V(DOOR_X + .4, G3 + 1.6, WZ)],
    [640, U4[0].key, ...toolStop(U4[0].x, WF)], ...U4.slice(1, 3).map(u => [u.key - 45, u.key, ...toolStop(u.x, WF)]),
    [860, 875, V(EXIT_X - .2, G3 + 1.65, -1), V(EXIT_X + 1.5, G3 + .4, 4)], [875, 905, V(EXIT_X + 1.5, G3 + 1.65, 2.2), V(EXIT_X + 8, G3 + 1.8, 0)], [905, 965, ...EDGE_STOP], [1058, SV_MAX - 10, ...BARE_T] /* R3 (Tom 11-24: no zoom): on along the street to the bare stretch past EDGE, the page's top's own view */];
  function endCam(sv, cp, look) { for (const [a, b, P, L] of KEYS) { const k = sm(cl((sv - a) / (b - a))); if (k <= 0) continue; cp.lerp(P, k); look.lerp(L, k); } }
  function endAt(now, sv, cp) { shopAt(now, sv, cp); const cx = cp.x;
    edgeL.intensity = 5 * sm(cl((sv - 850) / 40)); siteM.emissiveIntensity = 2.6 * sm(cl((sv - 850) / 40)); /* on as you come, and it stays on behind you (a lamp doesn't go out as you walk away) */
    scene.fog.color.copy(FOG0); sky.color.copy(SKY0);
    const FADE = .8; // seconds a painting takes to come up on its wall
    U4.forEach((u, i) => { const near = Math.abs(cx - u.x) < (NARROW ? 3 : 5), here = sv > u.key - 14 && sv < u.leave + 15;
      if (introOver && sv > u.key - 14 && !u.start && u.B.ready() && (!u.O || u.O.ready()) && (!u.X || u.X.ready())) { u.start = now; root.dataset.started = (+root.dataset.started || 0) + 1; } // once per visit
      const sec = u.start ? (REDUCED ? 99 : (now - u.start) / 1000) : -1, t0 = .35, k = sec < 0 ? 0 : REDUCED ? 1 : sm(cl((sec - t0) / FADE)), shown = k >= 1;
      if (k > 0 && !u.B.ready()) root.dataset.pops = (+root.dataset.pops || 0) + 1; u.B.m.visible = k > 0; u.B.m.material.opacity = k; if (u.X) { u.X.m.visible = k > 0; u.X.m.material.opacity = k; } if (u.O) { u.O.m.visible = k > 0; u.O.m.material.opacity = k; }
      placeHots(u.hots, u.links.map(l => l.box), u.B, shown && near && here);
      if (u.el) { const show = here && near && shown && sec > t0 + .2 + FADE; [u.el, u.l, u.c].forEach(e => e.style.opacity = show ? 1 : 0); u.parts.forEach((p, k) => p.fade(show && sec > t0 + .2 + FADE + k * .3));
        if (show) { if (NARROW) u.el.style.width = Math.min(innerWidth - 24 - 112, 250) + "px"; /* narrower than the Write to me sticker's left edge */ } if (show) pin(u.el, u.l, u.c, NARROW ? V(u.x - .9, u.floor + .05, (u.zw || 0) + .3) : u.B.at(u.bb[2] - 80, u.bb[3]), NARROW ? 10 : -20, NARROW ? 40 : 70); if (show && NARROW) u.el.style.left = "12px"; } }); } // phone: on the floor below the wall, where nothing is painted

  svg.insertAdjacentHTML("beforeend", '<line id="l6"/><circle id="c6" r="4"/>');
  const tagFacts = document.getElementById("tagFacts"), l6 = svg.querySelector("#l6"), c6 = svg.querySelector("#c6");
  const lerpV = (a, b, t) => a.clone().lerp(b, t);
  const CAM = NARROW
    ? { A: [V(.4, 1.6, 18), V(0, 1.5, 0)], /* a third wider (Tom 11-23): tags above and round the mural are in the first picture */ B: [V(2.9, 2.1, 18), V(.6, .65, 0)], C: [V(EX + .3, EY + .6, 21.5), V(EX + .3, EY + .4, 0)], D: [V(EX + 3.2, EY + .5, 16), V(EX + 3.2, EY + .3, 0)], E: [V(RX - 2.2, -.4 - 2 * DROP, 17), V(RX - 2.2, -.6 - 2 * DROP, 0)], F: [V(RX - 2.2, -.5 - 2 * DROP, 17.5), V(RX - 2.2, -.7 - 2 * DROP, -1)] } // phone: the raddavarfruberga painting (centre x RX - 2.2, 6.4 m wide) centred across the whole width, uncut
    : { A: [V(1.3, 1.4, 14.6), V(.1, 1.3, 0)], /* a third wider (Tom 11-23): the wall round the mural, where the visitors' tags go, is in the first picture */ B: [V(5, 3.2, 15.6), V(1.2, -.4, 2)], C: [V(EX + .5, EY + .5, 12.2), V(EX + .4, EY + .2, 0)], D: [V(EX + .6, EY + .4, 11), V(EX + .5, EY + .1, 0)], E: [V(RX - 1.9, .1 - 2 * DROP, 13.2), V(RX - 1.8, -.5 - 2 * DROP, 0)], F: [V(RX - 1.5, -.1 - 2 * DROP, 11.4), V(RX - 1.4, -.7 - 2 * DROP, -1)] }; // the painting and its pillar, the floor under it

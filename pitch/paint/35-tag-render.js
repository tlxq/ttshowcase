  // The wall's tags: [word, centre x, centre y, width (m), turn (degrees), strength (0-1, old = faint), colour]. None today (Tom 11-17):
  // visitors' tags and Tom's own come from the tag tool; ?tags=full fills the visitor wall to test the speed.
  const WALL_TAGS = { tags: [] };
  const WALL_HAND = __HAND_WALL__;
  // Visitors' tags go left of the opening (Tom 11-17): their own stretch of the same wall, so Tom's tags and the title stay clean.
  // How many fit follows from the space: about one tag per 1.5 m2; when it's full a new tag paints over the oldest.
  const VISITOR_WALL = { x0: -17, x1: -7, y0: .6, y1: 6.6 }; VISITOR_WALL.fits = Math.floor((VISITOR_WALL.x1 - VISITOR_WALL.x0) * (VISITOR_WALL.y1 - VISITOR_WALL.y0) / 1.5);
  // ?tags=full: the speed test for the tag tool (PR1): the visitor wall full, plus half again painted over the oldest. Same seed every run.
  if (new URLSearchParams(location.search).get("tags") === "full") { let s = 7; const r = () => (s = s * 16807 % 2147483647) / 2147483647, words = Object.keys(WALL_HAND), V_ = VISITOR_WALL;
    for (let i = 0; i < Math.round(V_.fits * 1.5); i++) { const w = .7 + r() * 1.1, old = i < V_.fits * .5; // the first half: old, faint, under the newer ones
      WALL_TAGS.tags.push([words[(r() * words.length) | 0], V_.x0 + w / 2 + r() * (V_.x1 - V_.x0 - w), V_.y0 + r() * (V_.y1 - V_.y0), w, (r() - .5) * 16, old ? .35 + r() * .2 : .7 + r() * .25, r() < .5 ? SPRAY : CREAM]); } }
  // The wall's tags live in a few wide stretches of the wall, each one picture: one draw and one upload per stretch, not one per tag
  // (15 tags as their own meshes, painted here: 123 ms of a stalled load; 200 would be seconds). A worker paints them off the page's own
  // thread; each finished stretch is sent to the graphics card on its own frame. Only the painted part of a stretch is kept.
  // The tag renderer: one piece of a stroke and one drip, drawn on any 2D canvas g. It is plain functions of their arguments, so the tag tool (this thread)
  // and the wall's worker (wallPaint, for the approved tags of other visitors) draw the very same marks. K: { tools, tpm, th, sprite(hex), grow(x, y, r) or null }.
  function tagRng(seed) { let s = (seed % 2147483646) + 1; return () => (s = s * 16807 % 2147483647) / 2147483647; }
  // one piece of a stroke: from its point j - 4 to point j (u, v, ms, pressure in tag pixels), with the stroke's own tool, colour and dice.
  // A spray dab grows and darkens the slower the can moves (m/s from the points' own times), so the same stroke replays the same
  function tagSegDraw(g, s, j, R, K) { const T = K.tools[s.tool], TPM = K.tpm, P = s.pts, i0 = j ? j - 4 : 0, a = [P[i0], P[i0 + 1], P[i0 + 3]], b = [P[j], P[j + 1], P[j + 3]], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy);
    const slow = j ? Math.min(1, Math.max(0, 1 - L / Math.max(1, P[j + 2] - P[i0 + 2]) * 1000 / TPM / 1.6)) : 1, st = Math.max(1, T.r * TPM * .3), n = Math.max(1, Math.ceil(L / st));
    for (let i = 1; i <= n; i++) { const x = a[0] + dx * i / n, y = a[1] + dy * i / n, p = a[2] + (b[2] - a[2]) * i / n;
      if (T.kind === "spray") { const r = T.r * TPM * (.55 + .5 * slow) * (.8 + .4 * p); g.globalAlpha = .3 + .6 * slow; g.drawImage(K.sprite(s.col), x - r * 1.8, y - r * 1.8, r * 3.6, r * 3.6);
        g.globalAlpha = .45; g.fillStyle = s.col; const m = Math.round(T.mist * (.4 + .8 * slow)); for (let k = 0; k < m; k++) { const an = R() * 6.283, d = r * (1.4 + R() * 2); g.fillRect(x + Math.cos(an) * d, y + Math.sin(an) * d, 1.5, 1.5); }
        if (K.grow) K.grow(x, y, r * 3.5 + 2); }
      else { const r = T.r * TPM * (.8 + .4 * p); g.fillStyle = s.col;
        if (T.kind === "mop") { g.globalAlpha = .85; g.beginPath(); g.arc(x, y, r * (.85 + R() * .3 + .2 * slow), 0, 6.283); g.fill(); }
        else if (T.kind === "chisel") { g.globalAlpha = .92; g.save(); g.translate(x, y); g.rotate(-.7); g.fillRect(-r, -r * .18, r * 2, r * .36); g.restore(); }
        else { g.globalAlpha = 1; g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill(); } if (K.grow) K.grow(x, y, r * 1.6 + 2); } }
    g.globalAlpha = 1; }
  // A drip is [point, length mm, start left or right of the point, px]; it runs from `from` to `to` px below the pool's lower edge (and ends with a bead when `end`). Returns the part it touched.
  function tagDripDraw(g, s, d, from, to, end, K) { const T = K.tools[s.tool], x = s.pts[d[0]] + d[2], y = s.pts[d[0] + 1] + T.r * K.tpm * .7 /* from the pool's lower edge */, w = Math.max(1.5, T.r * K.tpm * .22), L = d[1] / 1000 * K.tpm, a = Math.min(from, L), b = Math.min(to, L, K.th - 3 - y); if (b <= a && !end) return null;
    g.globalAlpha = .88; g.fillStyle = s.col; const ya = Math.round(y + a), yb = Math.round(y + b); if (yb > ya) g.fillRect(Math.round(x - w / 2), ya, Math.round(w), yb - ya); // whole pixels: no edge is painted twice // a filled bar: tiny stroked pieces left a cleared line across the pool in Chrome (11-18)
    if (end) { g.beginPath(); g.arc(x, y + b, w * .95, 0, 6.283); g.fill(); } g.globalAlpha = 1; return [x, y + (a + b) / 2, (b - a) / 2 + w * 2 + 2]; }
  // Runs in the worker (or here, a tag a frame, where a page has no worker canvas): paints every tag on its own sheet, then onto each stretch it reaches.
  function* wallPaint(J, mk, emit) { const { hands, tags, L, K } = J, PXM = L.px; let seed = 11; const rnd = () => (seed = seed * 16807 % 2147483647) / 2147483647, sprites = {};
    const sprite = C => { if (sprites[C]) return sprites[C]; const c = mk(64, 64), g = c.getContext("2d", { willReadFrequently: true }), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, `rgba(${C},.95)`); gr.addColorStop(.45, `rgba(${C},.8)`); gr.addColorStop(1, `rgba(${C},0)`); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return sprites[C] = c; };
    // one tag on its own sheet: spray dots, specks and three drips, so its strength applies to it as a whole
    const sheet = T => { const H = hands[T.word]; let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      H.strokes.forEach(s => { for (let i = 0; i < s.length; i += 4) { x0 = Math.min(x0, s[i]); x1 = Math.max(x1, s[i]); y0 = Math.min(y0, s[i + 1]); y1 = Math.max(y1, s[i + 1]); } });
      const wW = T.w, hW = wW * (y1 - y0) / (x1 - x0), W = Math.round((wW + .3) * PXM), Hh = Math.round((hW + .75) * PXM), c = mk(W, Hh), g = c.getContext("2d", { willReadFrequently: true }), sp = sprite(T.col), sc = wW * PXM / (x1 - x0);
      const ox = .15 * PXM, oy = .15 * PXM, pts = []; H.strokes.forEach(s => { for (let i = 0; i < s.length; i += 4) pts.push([ox + (s[i] - x0) * sc, oy + (s[i + 1] - y0) * sc, s[i + 3], i === 0]); });
      let bx0 = 1e9, by0 = 1e9, bx1 = -1e9, by1 = -1e9;
      const dot = (x, y, p) => { const R = PXM * (.011 + .016 * p) * 1.8; g.drawImage(sp, x - R, y - R, R * 2, R * 2); bx0 = Math.min(bx0, x - R); bx1 = Math.max(bx1, x + R); by0 = Math.min(by0, y - R); by1 = Math.max(by1, y + R);
        if (rnd() < .5) { const a = rnd() * 6.283, r = R / 1.8 * (2 + rnd() * 2.5); g.fillRect(x + Math.cos(a) * r, y + Math.sin(a) * r, 1, 1); } };
      g.fillStyle = `rgba(${T.col},.5)`;
      for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[i - 1];
        if (b && !a[3]) { const n = Math.max(1, Math.ceil(Math.hypot(a[0] - b[0], a[1] - b[1]) / 1.2)); for (let k = 1; k <= n; k++) dot(b[0] + (a[0] - b[0]) * k / n, b[1] + (a[1] - b[1]) * k / n, b[2] + (a[2] - b[2]) * k / n); }
        else dot(a[0], a[1], a[2]); }
      const low = pts.slice().sort((u, v) => v[1] - u[1]).slice(0, 24); g.strokeStyle = `rgba(${T.col},.85)`; g.lineWidth = PXM * .012;
      for (let k = 0; k < 3; k++) { const q = low[(rnd() * low.length) | 0], Ld = PXM * (.12 + rnd() * .3); g.beginPath(); g.moveTo(q[0], q[1]); g.lineTo(q[0], q[1] + Ld * .98); g.stroke(); by1 = Math.max(by1, q[1] + Ld); }
      // its centre on the wall (the middle of the sheet, as the old meshes turned) and the painted box's corners, turned
      const cx = T.x, cy = T.y - .225, a = T.turn * Math.PI / 180, corners = [[bx0, by0], [bx1, by0], [bx1, by1], [bx0, by1]].map(([u, v]) => {
        const dx = (u - W / 2) / PXM, dy = (Hh / 2 - v) / PXM; return [cx + dx * Math.cos(a) - dy * Math.sin(a), cy + dx * Math.sin(a) + dy * Math.cos(a)]; });
      return { c, W, Hh, cx, cy, a, corners }; };
    // a visitor's tag (strokes with their own tools and colours) on its own sheet, drawn by the tag tool's own renderer at the wall's scale, then its name under it.
    // The sheet is the tag tool's whole picture (the frame and the room for drips below it); its middle is placed so the frame's top edge sits on the spot's.
    const strokeSheet = T => { const sc = T.w * PXM / K.tw, W = Math.round(T.w * PXM), Hh = Math.round(K.th * sc), c = mk(W, Hh), g = c.getContext("2d", { willReadFrequently: true });
      const KK = { tools: K.tools, tpm: K.tpm, th: K.th, grow: null, sprite: hex => { const n = parseInt(hex.slice(1), 16); return sprite(`${n >> 16},${n >> 8 & 255},${n & 255}`); } };
      g.scale(sc, sc); g.imageSmoothingQuality = "high";
      for (const s of T.strokes) { const R = tagRng(s.seed); g.save(); g.beginPath(); g.rect(0, 0, K.tw, K.tfh); g.clip(); for (let j = 0; j < s.pts.length; j += 4) tagSegDraw(g, s, j, R, KK); g.restore(); } // paint stops at the frame
      for (const s of T.strokes) for (const d of s.dr) tagDripDraw(g, s, d, 0, 1e9, true, KK); // the runs, finished
      if (T.nameBmp) g.drawImage(T.nameBmp, K.tw - 8 - T.nameBmp.width, K.tfh + .05 * K.tpm);
      const cx = T.x, cy = T.y + T.w * K.tfh / K.tw / 2 - Hh / PXM / 2, a = T.turn * Math.PI / 180, corners = [[0, 0], [W, 0], [W, Hh], [0, Hh]].map(([u, v]) => {
        const dx = (u - W / 2) / PXM, dy = (Hh / 2 - v) / PXM; return [cx + dx * Math.cos(a) - dy * Math.sin(a), cy + dx * Math.sin(a) + dy * Math.cos(a)]; });
      return { c, W, Hh, cx, cy, a, corners }; };
    const sheets = {}, left = tags.map(T => T.st.length);
    for (const i of L.order) { const S = L.st[i]; if (!S.tags.length) continue;
      const c = mk(L.sw, L.sh), g = c.getContext("2d", { willReadFrequently: true }), boxes = []; let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      for (const ti of S.tags) { const T = tags[ti], sh = sheets[ti] || (sheets[ti] = T.strokes ? strokeSheet(T) : sheet(T)); yield;
        // wall pixels: x from the wall's left end, y down from its top; this stretch starts L.sw * i to the right
        const px = (sh.cx - L.x0) * PXM - L.sw * i, py = (L.y1 - sh.cy) * PXM;
        g.save(); g.globalAlpha = T.k; g.translate(px, py); g.rotate(-sh.a); g.drawImage(sh.c, -sh.W / 2, -sh.Hh / 2); g.restore();
        sh.corners.forEach(([wx, wy]) => { const u = (wx - L.x0) * PXM - L.sw * i, v = (L.y1 - wy) * PXM; x0 = Math.min(x0, u); x1 = Math.max(x1, u); y0 = Math.min(y0, v); y1 = Math.max(y1, v); });
        boxes.push([ti, sh.corners]); if (!--left[ti]) delete sheets[ti]; }
      x0 = Math.max(0, Math.floor(x0)); y0 = Math.max(0, Math.floor(y0)); x1 = Math.min(L.sw, Math.ceil(x1)); y1 = Math.min(L.sh, Math.ceil(y1));
      if (!(x1 > x0 && y1 > y0)) { x0 = y0 = 0; x1 = y1 = 1; } yield emit(i, c, [x0, y0, x1 - x0, y1 - y0], boxes); } } // every stretch reports, even one whose paint fell off it
  // One layer is a set of tags painted into the wall's stretches. The hand words (and ?tags=full) are one layer; visitors' approved tags are another, made once the store has answered.
  const WLS = [], wallLayer = (tags, z) => { const px = NARROW ? 96 : 128, n = 12, sw = Math.round(WW / n * px); // 12 stretches of 7.5 m, the wall's full height
    const L = { px, sw, sh: Math.round(WH * px), x0: WX - WW / 2, y1: WALL_TOP, st: [...Array(n)].map(() => ({ tags: [] })) };
    tags.forEach((T, ti) => { const r = T.w / 2 + .8, a = Math.floor(((T.x - r) - L.x0) * px / sw), b = Math.floor(((T.x + r) - L.x0) * px / sw);
      for (let i = Math.max(0, a); i <= Math.min(n - 1, b); i++) { L.st[i].tags.push(ti); T.st.push(i); } });
    L.order = L.st.map((_, i) => i).sort((i, j) => Math.abs(L.x0 + (i + .5) * sw / px) - Math.abs(L.x0 + (j + .5) * sw / px)); // the first screen's first
    // a mesh per stretch that has tags, with an empty picture until its own arrives: the shader is the same before and after, so warmUp builds it
    const meshes = L.st.map((S, i) => { if (!S.tags.length) return null;
      const mat = wallBump(new THREE.MeshPhysicalMaterial({ map: wallEmpty, transparent: true, depthWrite: false, alphaTest: .004, roughness: .25, clearcoat: .8, clearcoatRoughness: .15, // alphaTest: bare wall stops before the light is worked out
        normalMap: tex("assets/wall4_nor_gl.jpg", false, 1, 1), normalScale: new THREE.Vector2(.6, .6), polygonOffset: true, polygonOffsetFactor: -3 }));
      const me = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat); me.position.set(L.x0 + (i + .5) * sw / px, (WALL_TOP + GROUND) / 2, z); me.scale.set(.01, .01, 1);
      me.renderOrder = -1; scene.add(me); return me; }); // under everything else on the wall: the poured line, the runs (sorted by distance they swapped places as the camera moved: flicker, Tom 11-17)
    const W = { L, tags, meshes, up: [], done: 0, want: L.st.filter(S => S.tags.length).length }; WLS.push(W); return W; };
  const wallEmpty = new THREE.DataTexture(new Uint8Array(4), 1, 1); wallEmpty.encoding = THREE.sRGBEncoding; wallEmpty.needsUpdate = true;
  const WL = wallLayer(WALL_TAGS.tags.map(([word, x, y, w, turn, k, col]) => ({ word, x, y, w, turn, k, col, st: [] })), .002);
  function wallGot(W, i, bmp, [x, y, w, h]) { // a finished stretch: its painted part goes on its mesh, sized and placed to match
    const t = new THREE.Texture(bmp); t.flipY = false; t.encoding = THREE.sRGBEncoding; t.anisotropy = maxAniso; t.generateMipmaps = true; t.needsUpdate = true;
    W.up.push({ i, t, x, y, w, h }); }
  function wallUpload() { const W = WLS.find(W => W.up.length); if (!W) return; const u = W.up.shift(), { L } = W, me = W.meshes[u.i], m = me.material, ww = u.w / L.px, hh = u.h / L.px;
    const x0 = L.x0 + (L.sw * u.i + u.x) / L.px, y1 = L.y1 - u.y / L.px; me.scale.set(ww, hh, 1); me.position.set(x0 + ww / 2, y1 - hh / 2, me.position.z);
    m.normalMap.repeat.set(ww / TILE, hh / TILE); m.normalMap.offset.set((x0 - L.x0) / TILE, (y1 - hh - GROUND) / TILE); m.normalMap.updateMatrix();
    m.map = u.t; renderer.initTexture(u.t); // sent now, on a frame with nothing else to send, not on the first frame it shows
    if (++W.done === W.want) document.documentElement.dataset[W === WL ? "wallAt" : "storeAt"] = Math.round(performance.now() - t0); }
  // paints a layer: in a worker off the page's own thread when the browser has canvases there, else here a few ms a frame
  function wallRun(W, J, xfer) { const pic = (c, [x, y, w, h]) => createImageBitmap(c, x, y, w, h, { imageOrientation: "flipY", premultiplyAlpha: "none" });
    let wk = null; try { if (typeof OffscreenCanvas === "function" && new OffscreenCanvas(1, 1).getContext("2d")) {
      const src = `${tagRng};${tagSegDraw};${tagDripDraw};${wallPaint};onmessage=async e=>{const J=e.data,mk=(w,h)=>new OffscreenCanvas(w,h),out=[];for(const _ of wallPaint(J,mk,(i,c,b,x)=>out.push([i,c,b,x])))while(out.length){const[i,c,b,x]=out.shift();const p=await createImageBitmap(c,b[0],b[1],b[2],b[3],{imageOrientation:"flipY",premultiplyAlpha:"none"});postMessage([i,p,b,x],[p]);}};`;
      wk = new Worker(URL.createObjectURL(new Blob([src], { type: "text/javascript" }))); wk.onmessage = e => wallGot(W, ...e.data);
      wk.onerror = wk.onmessageerror = () => { wk.terminate(); W.up.length = 0; here(); }; wk.postMessage(J, xfer || []); } } catch (e) { wk = null; } // a worker that fails paints here instead
    function here() { const it = wallPaint(J, (w, h) => Object.assign(document.createElement("canvas"), { width: w, height: h }), (i, c, b, x) => pic(c, b).then(p => wallGot(W, i, p, b)));
      (function step() { const s = performance.now(); while (performance.now() - s < 4) if (it.next().done) return; requestAnimationFrame(step); })(); }
    if (!wk) here(); }
  wallRun(WL, { hands: WALL_HAND, tags: WL.tags, L: WL.L });
  const links = [{ t: "Open the site, epaRadar", href: "https://eparadar.se" }, { t: "Code for epaRadar", href: "https://github.com/tlxq/eparadar" }];
  document.querySelector(".hud").insertAdjacentHTML("beforeend", links.map((l, i) => `<a class="hot" id="hot${i}" href="${l.href}" target="_blank" rel="noopener" aria-label="${l.t}" tabindex="-1"></a>`).join("")
    + '<p class="head">epaRadar: Friends on a live map. Only friends see where you are. Degree project, built by me. React Native, Expo, Supabase, Postgres, pgTAP.</p>');
  const hots = links.map((l, i) => document.getElementById("hot" + i));

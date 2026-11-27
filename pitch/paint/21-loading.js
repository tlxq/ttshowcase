let startOpen = false; // taps tip the bucket only when the paint has gone (20-intro.js asks)
const loadTick = (() => { // everything of the loading screen is in here: its names stay out of the walk
  // The loading screen and its hand-over (pitch/start prototype, Tom 11-27). The walk's wall with the bucket's blue poured down it, Tom's black-and-white
  // portrait in front: the portrait IS the progress (one number p, 0..1: how far the start set has loaded). When p = 1 his tlxq tag writes itself; then,
  // once the walk is ready to show, the blue runs down the screen like poured paint and the start wall (bucket full) is under it.
  // Knobs in the link: min= seconds the fill takes at the very least [1.2] · slow= a fake load time in seconds · p= freeze at a value (no hand-over)
  //   run= seconds for the paint to run off [1.1] · hold= seconds between the written tag and the run [.4] · photo=fade|slide [fade]
  const Q = new URLSearchParams(location.search), num = (k, d) => { const v = Q.get(k); return v === null || v === "" || isNaN(+v) ? d : +v; };
  const K = { min: Math.max(.2, num("min", 1.2)), run: Math.max(.2, num("run", 1.1)), hold: Math.max(0, num("hold", .4)), slow: Math.max(0, num("slow", 0)),
    photo: Q.get("photo") === "slide" ? "slide" : "fade", p: Q.has("p") && Q.get("p") !== "" ? cl(num("p", 1)) : null };
  const TAG_MS = 2733 + 250; // the tag's own writing time (tag.svg --written) and a beat for the last stroke
  const ld = document.getElementById("load"), cv = ld.querySelector("canvas"), X = cv.getContext("2d"), tagBox = ld.querySelector(".ld-tag");
  const LAYERS = window.__ld || { img: {}, tag: Promise.resolve("") };
  const L = document.createElement("canvas"), LX = L.getContext("2d"), PS = document.createElement("canvas"), PX = PS.getContext("2d");
  const SIZE = NARROW ? [540, 1170] : [800, 1000], TAG = NARROW ? { right: .06, top: .31, w: .4 } : { right: .03, top: .04, w: .36 }, TAGAR = 2472 / 3809;
  const STEPS = [["blue", 0, .22, 100], ["coat-dark", .16, .42, 80], ["coat-blue", .38, .62, 105], ["coat-cream", .58, .8, 75]], EDGES = [.22, .42, .62, .8, 1];
  let G = null, W = 0, H = 0, SC = 1, T0 = 0, last = 0, p = 0, srcMax = 0, tagAt = 0, runAt = 0, done = false, reduceAt = 0, shadowFor = "";
  tagBox.dataset.ready = "0"; LAYERS.tag.then(svg => { tagBox.innerHTML = svg; tagBox.dataset.ready = "1"; }).catch(() => {}); // the pack's own svg (Tom's tag); fixed file, not visitor input. nosemgrep: insecure-innerhtml, insecure-document-method
  const isReady = () => readyAt > 0 || (REDUCED && pourReady && loadFrac > .99); // reduced motion: the fill (level) does not move there, so the walk counts as ready when the pour is built and everything is loaded
  const sm_ = t => t * t * (3 - 2 * t), vh = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  const vnoise = t => { const i = Math.floor(t), f = t - i; return vh(i) + (vh(i + 1) - vh(i)) * sm_(f); };
  const FINGERS = Array.from({ length: 15 }, (_, i) => ({ x: (vh(i * 3.1 + 1) * .96 + .02), w: .0025 + .006 * vh(i * 5.3 + 2), a: .1 + .3 * vh(i * 7.7 + 3), g: 1.5 + 1.2 * vh(i * 2.9 + 4) }));
  const imgOK = n => LAYERS.img[n] && LAYERS.img[n].complete && LAYERS.img[n].naturalWidth > 0;
  function geometry() {
    const w = innerWidth, h = innerHeight; if (G && w === W && h === H) return; W = w; H = h; SC = Math.min(devicePixelRatio || 1, 1.5);
    for (const c of [cv, L, PS]) { c.width = Math.round(W * SC); c.height = Math.round(H * SC); }
    let sw, sh, sx, sy;
    if (NARROW) { const k = Math.max(W / SIZE[0], H / SIZE[1]); sw = SIZE[0] * k; sh = SIZE[1] * k; sx = (W - sw) / 2; sy = H - sh; } // phone: the crop covers the screen, his feet on the bottom edge
    else { sh = H; sw = H * SIZE[0] / SIZE[1]; sx = (W - sw) / 2; sy = 0; } // laptop: the 4:5 picture stands in the middle at full height, the wall goes on to both sides
    G = { sx, sy, sw, sh };
    tagBox.style.width = TAG.w * sw + "px"; tagBox.style.left = sx + sw - TAG.right * sw - TAG.w * sw + "px"; tagBox.style.top = sy + TAG.top * sh + "px"; tagBox.style.transform = "rotate(-6deg)";
    shadowFor = ""; }
  // a wipe like the pack's: a soft edge swept across a box at a css angle; t 0..1; returns a gradient, or null (nothing) / "all"
  function wipe(ctx, b, deg, t) { const a = -.2 + 1.4 * t, s0 = a - .18, s1 = a; if (s1 <= 0) return null; if (s0 >= 1) return "all";
    const r = deg * Math.PI / 180, dx = Math.sin(r), dy = -Math.cos(r), len = Math.abs(b.w * dx) + Math.abs(b.h * dy), cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    const g = ctx.createLinearGradient(cx - dx * len / 2, cy - dy * len / 2, cx + dx * len / 2, cy + dy * len / 2);
    g.addColorStop(Math.max(0, Math.min(1, s0)), "#000"); g.addColorStop(Math.max(0, Math.min(1, s1)), "rgba(0,0,0,0)"); return g; }
  // the wall and the paint go on past the picture's sides as mirror copies of it (laptop: the screen is wider than the 4:5 crop)
  function tiles(ctx, img, y0 = G.sy) { if (!img) return; const k0 = Math.floor(-G.sx / G.sw) - 1, k1 = Math.ceil((W - G.sx) / G.sw);
    for (let k = k0; k <= k1; k++) { const x = G.sx + k * G.sw; if (x > W || x + G.sw < 0) continue; if (k & 1) { ctx.save(); ctx.translate(x + G.sw, 0); ctx.scale(-1, 1); ctx.drawImage(img, -.5, y0, G.sw + 1, G.sh); ctx.restore(); } else ctx.drawImage(img, x - .5, y0, G.sw + 1, G.sh); } }
  // THE PAINT'S RUN (reuses the pour's maths: gravity gives a slow start and a fast finish; each column has its own speed like the pour's runs, LRUNS r.v, and a
  // few narrow fingers run ahead of the rest). dY(x, u): how far the blue at screen column x has slid down at run time u 0..1, in px.
  const BASE = () => Math.max(0, -G.sy);
  const spd = x => .84 + .22 * vnoise(x / G.sw * 7.5 + 3) + .12 * vnoise(x / G.sw * 31 + 9);
  let REACH = 1;
  function dY(x, u) { const gr = Math.pow(u, 1.75); let e = 0; for (const f of FINGERS) { const d = (x - f.x * W) / (f.w * H * 1.7); e += f.a * .8 * H *Math.exp(-d * d) * Math.pow(u, f.g); }
    return BASE() + REACH * gr * spd(x) + e; }
  function loadTick(now) { if (done) return; if (!T0) { T0 = last = now; geometry(); } frame(now); root.dataset.loadP = p.toFixed(3); }
  function frame(now) {
    const since = (now - T0) / 1000, dt = Math.min(.1, (now - last) / 1000); last = now;
    // ---- the one number p: the real load, held back by a minimum time, never backwards, creeping inside its coat while the line is slow
    if (K.p !== null) p = K.p; else if (!runAt) {
      const real = isReady() ? 1 : Math.min(1, level / .975), fake = K.slow ? Math.min(real, since / K.slow) : real; srcMax = Math.max(srcMax, fake);
      const target = Math.min(srcMax, since / K.min);
      let np = p + (target - p) * Math.min(1, dt * 6); if (target - np < .008) np = target;
      if (target - p < .01 && p < 1 && srcMax < 1) { const cap = (EDGES.find(e => e > srcMax + 1e-6) || 1) - .03; np = Math.max(np, Math.min(p + dt * .03, Math.max(p, cap))); } // the slow idle creep, inside the current coat
      p = Math.max(p, Math.min(1, np)); }
    if (p >= .999 && !tagAt) { tagAt = now; tagBox.classList.add("on"); }
    const tagWritten = tagAt && now - tagAt >= TAG_MS;
    // ---- the hand-over: when the tag is written AND the walk is ready to show
    if (!runAt && K.p === null && tagWritten && isReady() && now - tagAt >= TAG_MS + K.hold * 1000) runAt = now;
    const u = runAt ? cl((now - runAt) / 1000 / K.run) : 0;
    if (REDUCED) { if (!reduceAt && isReady() && since > K.min) reduceAt = now; }
    if (!G || !imgOK("wall")) return;
    if (!ld.style.background) ld.style.background = "transparent"; // the black behind the first frames goes: what the paint uncovers is the real start
    geometry(); const b ={ x: G.sx, y: G.sy, w: G.sw, h: G.sh }, full = { x: 0, y: 0, w: W, h: H }; REACH = (H - G.sy + 40) / .72 + BASE() * 0;
    X.setTransform(SC, 0, 0, SC, 0, 0); LX.setTransform(SC, 0, 0, SC, 0, 0); X.globalAlpha = 1; X.clearRect(0, 0, W, H);
    const spray = REDUCED ? 1 : 0; // reduced motion: everything is simply there
    // the wall (fades in from black in the first moments); when the paint runs, it goes with the paint's front, a little ahead of it
    X.save(); X.globalAlpha = REDUCED ? 1 : sm_(cl(since / .35));
    if (u > 0) { X.beginPath(); X.moveTo(0, H + 2); for (let x = 0; x <= W + 4; x += 4) X.lineTo(x, Math.min(H + 2, G.sy + dY(x, u) + .035 * H)); X.lineTo(W + 4, H + 2); X.closePath(); X.clip(); }
    tiles(X, LAYERS.img.wall);
    { // the wall is graded down to the start's night as the paint goes (the start is dark with the work light on the bucket): a little during the tag, then with the run
      const dim = Math.max(.12 * sm_(cl((now - (tagAt || now + 1e9)) / 2500)), runAt ? .12 + .76 * sm_(cl(u / .75)) : 0), bk = window.bucketAt ? window.bucketAt() : { x: W * .8, y: H * .85 };
      X.globalAlpha = 1; X.fillStyle = "rgba(7,8,10," + dim.toFixed(3) + ")"; X.fillRect(0, 0, W, H);
      if (runAt || tagAt) { const r = H * .55, g = X.createRadialGradient(bk.x, bk.y, 0, bk.x, bk.y, r); g.addColorStop(0, "rgba(255,226,190," + (.34 * dim / .88).toFixed(3) + ")"); g.addColorStop(1, "rgba(255,226,190,0)"); X.fillStyle = g; X.fillRect(0, 0, W, H); } } // the work light's warm pool on the bucket
    X.restore();
    // the poured blue: wiped in by p; at the hand-over each column slides down by its own amount
    { LX.clearRect(0, 0, W, H); const img = LAYERS.img.blue;
      if (img && imgOK("blue")) { if (u <= 0) tiles(LX, img); else { const SW = 3, iw = img.naturalWidth, ih = img.naturalHeight;
          for (let x = 0; x < W; x += SW) { const xm = x + SW / 2, d = dY(xm, u), y = G.sy + d; if (y >= H) continue; let k = Math.floor((xm - G.sx) / G.sw), t = ((xm - G.sx) - k * G.sw) / G.sw; if (k & 1) t = 1 - t;
            LX.drawImage(img, Math.max(0, Math.min(iw - 2, t * iw - SW / G.sw * iw / 2)), 0, Math.max(1, SW / G.sw * iw), ih, x, y, SW + 1, G.sh); } } }
      const wp = spray || p >= 1 ? 1 : p; if (!REDUCED) { const g = wipe(LX, full, STEPS[0][3], cl((wp - STEPS[0][1]) / (STEPS[0][2] - STEPS[0][1])));
        if (g === null) LX.clearRect(0, 0, W, H); else if (g !== "all") { LX.globalCompositeOperation = "destination-in"; LX.fillStyle = g; LX.fillRect(0, 0, W, H); LX.globalCompositeOperation = "source-over"; } }
      X.drawImage(L, 0, 0, W, H);
      if (u > 0 && u < 1) { // the wet front: a thick darker rim and a thin shine along its top edge, so it reads as liquid, not a cut
        const paint = getComputedStyle(document.documentElement).getPropertyValue("--front-spray").trim() || "#4aa8ff"; X.lineJoin = "round"; X.lineCap = "round";
        const edge = off => { X.beginPath(); for (let x = 0; x <= W + 4; x += 3) { const y = G.sy + dY(x, u) + off; x ? X.lineTo(x, y) : X.moveTo(x, y); } };
        edge(H * .006); X.strokeStyle = "rgba(6,30,70,.38)"; X.lineWidth = H * .011; X.stroke();
        edge(H * .0015); X.strokeStyle = paint; X.lineWidth = H * .006; X.stroke();
        edge(-H * .0005); X.strokeStyle = "rgba(255,255,255,.34)"; X.lineWidth = H * .0022; X.stroke(); } }
    // the three stencil coats round him, then fade out at the end of the load
    for (const [name, a, z, deg] of STEPS.slice(1)) { if (!imgOK(name)) continue; const wp = spray || p >= 1 ? 1 : p, f = REDUCED ? 0 : cl((wp - a) / (z - a)), out = REDUCED ? 1 : sm_(cl((wp - .9) / .1)); if (f <= 0 || out >= 1) continue;
      LX.clearRect(0, 0, W, H); LX.globalCompositeOperation = "source-over"; LX.drawImage(LAYERS.img[name], G.sx, G.sy, G.sw, G.sh);
      const g = wipe(LX, b, deg, f); if (g !== null && g !== "all") { LX.globalCompositeOperation = "destination-in"; LX.fillStyle = g; LX.fillRect(0, 0, W, H); LX.globalCompositeOperation = "source-over"; }
      if (g !== null) { X.globalAlpha = (1 - out) * (runAt ? 1 - sm_(cl(u / .5)) : 1); X.drawImage(L, 0, 0, W, H); X.globalAlpha = 1; } }
    // the portrait: appears 0.80..1; at the hand-over it fades as the paint leaves, or slides down with it
    let pa = REDUCED ? 1 : sm_(cl((p - .8) / .2)), ph = 0;
    if (runAt) { if (K.photo === "slide") ph = H * 1.12 * Math.pow(u, 1.9); else pa *= 1 - sm_(cl(u / .6)); }
    if (pa > 0 && imgOK("photo")) { if (shadowFor !== W + "x" + H) { shadowFor = W + "x" + H; PX.setTransform(SC, 0, 0, SC, 0, 0); PX.clearRect(0, 0, W, H); PX.save(); PX.shadowColor = "rgba(0,0,0,.5)"; PX.shadowOffsetX = .02 * W * SC; PX.shadowOffsetY = .014 * W * SC; PX.shadowBlur = .024 * W * SC; PX.drawImage(LAYERS.img.photo, G.sx, G.sy, G.sw, G.sh); PX.restore(); }
      X.globalAlpha = pa; X.setTransform(1, 0, 0, 1, 0, ph * SC); X.drawImage(PS, 0, 0); X.setTransform(SC, 0, 0, SC, 0, 0); X.globalAlpha = 1; }
    // the tag (DOM, the site's own writing effect) goes with the portrait
    const to = runAt ? (K.photo === "slide" ? 1 : 1 - sm_(cl(u / .6))) : 1; tagBox.style.opacity = tagAt || REDUCED ? to : 0; tagBox.style.transform = `translateY(${ph.toFixed(1)}px) rotate(-6deg)`;
    // done
    if (!REDUCED && u >= 1 && !done) { done = true; openStart(); }
    if (REDUCED && reduceAt) { const f = cl((now - reduceAt) / 600); ld.style.opacity = 1 - f; if (f >= 1 && !done) { done = true; openStart(); } } }
  function openStart() { ld.style.display = "none"; startOpen = true; root.dataset.startOpen = Math.round(performance.now() - T0); }
  window.loadState = () => ({ p, tagAt, runAt, done, K });
  return loadTick;
})();

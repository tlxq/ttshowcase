  // ---- INTRO PROTOTYPE (pitch/intro-earth, Tom's "through the earth"): the film's pour lands on the soil, the view glides down through generated earth,
  // the blue seeps down it and drips out above the ledge into the real bucket, which fills with the (faked) load. Judged in motion; nothing merges.
  // ?load=slow|fast sets how long the fake load takes; ?intro=old shows the start as it is on master. A tap or key skips the journey.
  // Its pictures (pitch/assets/intro/: the clip, the generated earth) are not in git.
  const EARTH = (() => {
    const E = { on: false, streamOn: false, bucketSeen: false, wall: 0 }, Q = new URLSearchParams(location.search), box = document.getElementById("earth");
    if (!box || REDUCED || Q.get("intro") === "old") { if (box) box.remove(); return E; } // reduced motion: the start as it is, no journey (the bucket is already tipped)
    const world = document.getElementById("eWorld"), vid = document.getElementById("eVid"), strip = document.getElementById("eStrip"), pourCv = document.getElementById("ePour"), veinCv = document.getElementById("eCv"),
      dropEl = document.getElementById("eDrop"), dropEl2 = document.getElementById("eDrop2"), nameEl = document.getElementById("eName"), pc = pourCv.getContext("2d"), vc = veinCv.getContext("2d");
    const SEEK = Q.get("seek") === null ? null : +Q.get("seek"), FILM = Q.get("film") !== "0", SLOW = Q.get("load") === "slow";
    // the prototype's own numbers (listed in the report): seconds on the journey's clock, and picture sizes in the 1080-wide film frame's pixels
    const D0 = FILM ? 2.95 : 2.05, T = { seepA: FILM ? .9 : .1, glideA: FILM ? 1 : .2, glideB: FILM ? 2.9 : 2, seepB: D0 + .05, dropA: D0, frontA: D0 + 1.1, frontB: D0 + 1.45, fillA: D0 + 1.1, fillFast: 2, fillSlow: 11, pourGrow: .5, pourEnd: 2.6, leaveA: D0 + 1.5, leaveD: .9 },
      FILM_W = 1080, FILM_H = 1920, STRIP_Y = 1560, IMPACT = FILM ? [440, 1546] : [470, STRIP_Y + 90], LIP = [596, 526], TEAR = 95, GAP_UP = .17, GAP_MIN = .22, GAP_MAX = .45;
    let stripH = 2071, started = false, et = 0, rate = 1, skipping = false, last = 0, veinX = -1, veins = null, lx = 0, ly = 0, ls = 0, outS = null;
    const boot = performance.now(), clamp = cl, ease = sm, rgb = a => `rgba(${SPRAY},${a})`;
    strip.addEventListener("load", () => { if (strip.naturalWidth) { stripH = strip.naturalHeight * FILM_W / strip.naturalWidth; sizeVeins(); veinX = -1; } });
    const fail = () => { E.on = false; box.remove(); document.documentElement.classList.remove("earth-on"); };
    if (FILM) vid.addEventListener("error", fail); strip.addEventListener("error", fail);
    E.on = true; document.documentElement.classList.add("earth-on");
    const sizeVeins = () => { veinCv.width = FILM_W / 2; veinCv.height = Math.ceil((stripH + 320) / 2); veinCv.style.top = (STRIP_Y - 60) + "px"; veinCv.style.height = (stripH + 320) + "px"; };
    pourCv.width = FILM_W / 2; pourCv.height = 600; pourCv.style.top = "500px"; pourCv.style.height = "1200px"; sizeVeins();
    // ---- the film's blue: a stream from the can's lip to where it lands, drawn over the clip (the clip's own water is a thin white thread)
    if (FILM) { vid.src = "assets/intro/film.mp4"; vid.poster = "assets/intro/film-poster.webp"; } else vid.remove(); // ?film=0 starts underground with no clip (the earth part alone, for its own byte count)
    const pourPts = [LIP, [548, 690], [505, 900], [470, 1180], [448, 1420], [440, 1546]];
    const along = (pts, f) => { const n = pts.length - 1, u = clamp(f) * n, i = Math.min(n - 1, Math.floor(u)), k = u - i; return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k]; };
    const poly = (c, pts, f, ox, oy, f0 = 0) => { c.beginPath(); const steps = Math.max(2, Math.ceil((f - f0) * 60)); for (let i = 0; i <= steps; i++) { const q = along(pts, f0 + (f - f0) * i / steps); i ? c.lineTo((q[0] - ox) / 2, (q[1] - oy) / 2) : c.moveTo((q[0] - ox) / 2, (q[1] - oy) / 2); } };
    function drawPour() { if (!FILM) return; pc.clearRect(0, 0, pourCv.width, pourCv.height);
      const g = clamp(et / T.pourGrow), fade = 1 - ease(clamp((et - T.pourEnd) / .5)); if (g <= 0 || fade <= 0) return;
      const wob = 1 + .12 * Math.sin(et * 40);
      pc.lineCap = "round"; pc.lineJoin = "round";
      for (const [w, a, col] of [[14, .18 * fade, rgb(1)], [6.5 * wob, .8 * fade, rgb(1)], [2, .75 * fade, "rgba(214,236,255,1)"]]) { pc.globalAlpha = a; pc.strokeStyle = col; pc.lineWidth = w / 2; poly(pc, pourPts, ease(g), 0, 500); pc.stroke(); }
      pc.globalAlpha = 1;
      // the wet patch where it lands: grows while the pour runs
      const r = (20 + 80 * ease(clamp((et - T.pourGrow) / 1.4))) / 2, px = (IMPACT[0]) / 2, py = (IMPACT[1] + 10 - 500) / 2;
      if (et > T.pourGrow * .8) { const gr = pc.createRadialGradient(px, py, 0, px, py, r * 1.6); gr.addColorStop(0, rgb(.75 * fade + .25)); gr.addColorStop(.6, rgb(.35)); gr.addColorStop(1, rgb(0)); pc.fillStyle = gr; pc.save(); pc.translate(px, py); pc.scale(1.5, .8); pc.translate(-px, -py); pc.beginPath(); pc.arc(px, py, r * 1.6, 0, 6.283); pc.fill(); pc.restore(); } }
    // ---- the seep: one main vein from the landing to the outlet and a few branches, drawn as they spread; every vein is a walk with a seeded wobble
    const hash = (i, j) => { const v = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return v - Math.floor(v); };
    function buildVeins(xOut) { const yEnd = STRIP_Y + stripH - TEAR - 44, N = 70, main = []; const x0 = IMPACT[0], y0 = IMPACT[1] + 14;
      for (let i = 0; i <= N; i++) { const q = i / N, env = Math.sin(Math.PI * q) ** .7; main.push([x0 + (xOut - x0) * ease(q) + env * (70 * Math.sin(q * 9 + 1) + 34 * Math.sin(q * 23 + 2)), y0 + (yEnd - y0) * q]); }
      const br = []; for (let b = 0; b < 8; b++) { const at = .08 + .8 * hash(b, 3), [sx, sy] = along(main, at), dir = (b % 2 ? 1 : -1) * (.45 + .75 * hash(b, 5)), len = 160 + 300 * hash(b, 7), pts = [];
        for (let i = 0; i <= 14; i++) { const q = i / 14; pts.push([sx + Math.sin(dir) * len * q + 22 * Math.sin(q * 11 + b), sy + Math.cos(dir) * len * q * .9]); }
        br.push({ at, pts }); }
      return { main, br, x: xOut }; }
    // THE OUTLET (Tom's choice to change: a weep pipe, the steel drain pipe a retaining wall has): a short pipe set in a dark lump of earth, the paint gathering in its mouth, a stain round it and a runnel below it
    function drawOutlet(p) { if (!veins) return; const x = veins.x, ev = STRIP_Y + stripH - TEAR, oy = STRIP_Y - 60, full = ease(clamp((p - .88) / .12)), age = Math.max(0, et - T.dropA);
      vc.save(); vc.scale(.5, .5); vc.translate(0, -oy); vc.lineCap = "round";
      let g = vc.createRadialGradient(x, ev, 20, x, ev, 230); g.addColorStop(0, "rgba(44,45,48,.95)"); g.addColorStop(.6, "rgba(30,31,33,.8)"); g.addColorStop(1, "rgba(24,25,27,0)"); // the concrete face the pipe is set in, running up into the earth
      vc.fillStyle = g; vc.save(); vc.translate(x, ev - 20); vc.scale(1, .62); vc.translate(-x, -ev); vc.beginPath(); vc.arc(x, ev, 230, 0, 6.283); vc.fill(); vc.restore();
      g = vc.createRadialGradient(x, ev - 30, 10, x, ev - 30, 170); g.addColorStop(0, "rgba(6,5,5,.92)"); g.addColorStop(.55, "rgba(10,8,7,.7)"); g.addColorStop(1, "rgba(10,8,7,0)");
      vc.fillStyle = g; vc.save(); vc.translate(x, ev - 30); vc.scale(1, .55); vc.translate(-x, -(ev - 30)); vc.beginPath(); vc.arc(x, ev - 30, 170, 0, 6.283); vc.fill(); vc.restore();
      g = vc.createRadialGradient(x, ev - 10, 6, x, ev - 10, 120); g.addColorStop(0, rgb(.3 * ease(p))); g.addColorStop(1, rgb(0)); // the stain the paint leaves round the mouth
      vc.fillStyle = g; vc.save(); vc.translate(x, ev - 10); vc.scale(1, .7); vc.translate(-x, -(ev - 10)); vc.beginPath(); vc.arc(x, ev - 10, 120, 0, 6.283); vc.fill(); vc.restore();
      if (age > 0) { const L = 60 + 190 * ease(clamp(age / 2)); g = vc.createLinearGradient(0, ev, 0, ev + L); g.addColorStop(0, rgb(.38)); g.addColorStop(1, rgb(0)); vc.strokeStyle = g; vc.lineWidth = 15; vc.beginPath(); vc.moveTo(x, ev + 8); vc.lineTo(x + 3, ev + L); vc.stroke(); } // the runnel down the wall
      g = vc.createLinearGradient(x - 31, 0, x + 31, 0); g.addColorStop(0, "#101214"); g.addColorStop(.3, "#5d636a"); g.addColorStop(.55, "#2b2f34"); g.addColorStop(1, "#0b0c0e");
      vc.fillStyle = g; vc.fillRect(x - 31, ev - 56, 62, 56);
      vc.fillStyle = "rgba(120,60,30,.25)"; vc.fillRect(x - 31, ev - 56, 62, 12); // a little rust where it meets the earth
      vc.beginPath(); vc.ellipse(x, ev, 31, 10, 0, 0, 6.283); vc.fillStyle = "#2a2d31"; vc.fill(); vc.lineWidth = 3; vc.strokeStyle = "#7d838a"; vc.stroke();
      vc.beginPath(); vc.ellipse(x, ev + 1, 22, 6.5, 0, 0, 6.283); vc.fillStyle = "#050607"; vc.fill();
      if (full > 0) { vc.beginPath(); vc.ellipse(x, ev + 1.5, 22 * full, 6.5 * full, 0, 0, 6.283); vc.fillStyle = rgb(.95); vc.fill(); vc.beginPath(); vc.ellipse(x - 6, ev, 8 * full, 2 * full, 0, 0, 6.283); vc.fillStyle = "rgba(214,236,255,.7)"; vc.fill(); }
      vc.restore(); }
    function drawVeins(p) { vc.clearRect(0, 0, veinCv.width, veinCv.height); if (!veins) return; if (p <= 0) { drawOutlet(0); return; } const oy = STRIP_Y - 60;
      vc.lineCap = "round"; vc.lineJoin = "round";
      const stroke = (pts, f, wScale, seed, taper) => { if (f <= 0) return; // a wet stain, the paint itself, a thin light edge; then beads where it pools. taper: the last part of the main vein thins to a thread where it leaves the earth
        for (const [w, a, col, dx] of [[58, .13, rgb(1), 0], [30, .62, rgb(1), 0], [16, .5, rgb(.9), 0], [5, .3, "rgba(190,224,255,1)", -5]]) { vc.globalAlpha = a; vc.strokeStyle = col; vc.lineWidth = w * wScale / 2; const k = taper ? Math.min(f, taper) : f; poly(vc, pts, k, -dx, oy); vc.stroke();
          if (taper && f > taper) { vc.lineWidth = Math.min(w, 9) * wScale / 2; poly(vc, pts, f, -dx, oy, taper); vc.stroke(); } }
        vc.fillStyle = rgb(.5); for (let i = 0; i < 26 * f; i++) { const q = (i + hash(seed, i)) / 26 * f, [x, y] = along(pts, q), r = (9 + 17 * hash(i, seed + 1)) * wScale; vc.globalAlpha = .55; vc.beginPath(); vc.arc((x + (hash(i, seed + 2) - .5) * 26 * wScale) / 2, (y - oy) / 2, r / 2, 0, 6.283); vc.fill(); } };
      stroke(veins.main, p, 1, 1, .8);
      veins.br.forEach((b, i) => stroke(b.pts, clamp((p - b.at) * 2.4), .5, 5 + i));
      vc.globalAlpha = 1; drawOutlet(p); }
    // ---- where the blue leaves the earth, on the screen, and the world height of the real bucket's column that carries on from it
    const solve = yScreen => { bucket.updateWorldMatrix(true, false); camera.updateMatrixWorld(); const A = bucket.localToWorld(V(.1, 0, .06)), P = y => { const v = V(A.x, y, A.z).project(camera); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; };
      let y1 = A.y + .5, y2 = A.y + 6; for (let k = 0; k < 3; k++) { const f1 = P(y1)[1] - yScreen, f2 = P(y2)[1] - yScreen; if (Math.abs(f2 - f1) < 1e-6) break; const y3 = y2 - f2 * (y2 - y1) / (f2 - f1); y1 = y2; y2 = y3; }
      return { x: P(y2)[0], O: V(A.x, y2, A.z) }; };
    E.target = () => { if (et < T.fillA) return 0; const x = clamp((et - T.fillA) / (SLOW ? T.fillSlow : T.fillFast));
      return SLOW ? .62 * ease(clamp(x / .5)) + .38 * ease(clamp((x - .75) / .25)) : 1 - (1 - x) * (1 - x); };
    // the real inflow column, from the front of the falling thread (or the paint's surface) up to the outlet
    E.column = (column, mesh, top, r) => { if (!outS) return; const fp = ease(clamp((et - T.frontA) / (T.frontB - T.frontA))), O = outS.O, y = Math.max(top.y, O.y - (O.y - top.y) * fp);
      column(mesh, V(top.x, y, top.z), V(O.x, O.y, top.z), Math.max(1e-4, r * (.5 + .5 * clamp((et - T.frontA) / .6)))); };
    const ripple = (x, y, k) => { const r = document.createElement("i"); r.className = "eRip"; r.style.left = x.toFixed(0) + "px"; r.style.top = y.toFixed(0) + "px"; box.appendChild(r);
      r.animate([{ transform: `translate(-50%, -50%) scale(${.2 * k})`, opacity: .9 }, { transform: `translate(-50%, -50%) scale(${1.5 * k})`, opacity: 0 }], { duration: 700, easing: "ease-out" }).onfinish = () => r.remove(); };
    E.skip = () => { if (started && et < T.fillA) { skipping = true; rate = 4; if (FILM) vid.playbackRate = 4; } };
    addEventListener("pointerdown", E.skip); addEventListener("keydown", E.skip);
    E.tick = (now, dt) => { if (!E.on) return;
      if (!started && (!FILM || vid.readyState >= 3 || now - boot > 1800)) { started = true; if (FILM) vid.play().catch(() => {}); }
      if (skipping && et >= T.fillA) { skipping = false; rate = 1; if (FILM) vid.playbackRate = 1; }
      if (SEEK !== null) { started = true; if (et !== SEEK) { et = SEEK; if (FILM) { vid.pause(); vid.currentTime = clamp(et, 0, 1.85); } } } else if (started) et += dt * rate; // ?seek=2.4 holds the journey at one moment (for pictures)
      const W = innerWidth, H = innerHeight, s = Math.max(W / FILM_W, H / FILM_H), xOff = (W - FILM_W * s) / 2, y0 = FILM ? Math.max(0, STRIP_Y + 140 - H / s) : STRIP_Y + 40, bucketTop = stBox[1] > 0 ? stBox[1] : H * .55;
      const gap = clamp(bucketTop - GAP_UP * H, GAP_MIN * H, GAP_MAX * H), Ew = STRIP_Y + stripH, cam1 = Ew - gap / s;
      const p = ease(clamp((et - T.glideA) / (T.glideB - T.glideA))), lv = ease(clamp((et - T.leaveA) / T.leaveD)), cam = y0 + (cam1 - y0) * p + lv * (gap + 140) / s; // the glide goes on after the drip has started: the earth leaves the top of the screen and the thread is left coming from above, as the start was
      if (box.classList.contains("pre")) box.classList.remove("pre");
      if (ls !== s || lx !== xOff || ly !== cam) { world.style.transform = `translate3d(${xOff.toFixed(1)}px, ${(-cam * s).toFixed(1)}px, 0) scale(${s.toFixed(4)})`; ls = s; lx = xOff; ly = cam; }
      outS = solve(gap - TEAR * s - lv * (gap + 140)); // the outlet: where the earth's torn edge ends up on this screen
      const wx = (outS.x - xOff) / s; if (lv > 0 && !E.done) { E.done = true; document.documentElement.classList.add("earth-done"); } if (Math.abs(wx - veinX) > 3) { veinX = wx; veins = buildVeins(clamp(wx, 80, 1000)); }
      drawPour(); drawVeins(ease(clamp((et - T.seepA) / (T.seepB - T.seepA)))); // (the seep is the same drawing every frame; it is cheap)
      // the bucket is in view once the earth's edge has risen above it; the wall gets a little light then, and the label may show
      const edgeNow = (Ew - cam) * s; E.bucketSeen = edgeNow < bucketTop; E.wall += ((E.bucketSeen ? .3 : 0) - E.wall) * Math.min(1, dt * 2);
      E.streamOn = et >= T.frontA;
      // the drip's rhythm: a bead swells at the lip (slow), necks and lets go, falls with gravity into the mouth of the bucket; a second, smaller and quicker; then the thread
      const dr = H * .017, lipY = gap - TEAR * s, mouth = proj(bucket.localToWorld(V(.1, BK.h - .02, .06)));
      const beads = [[T.dropA, .5, .5], [T.dropA + .42, .32, .42]], now_ = et; let landed = false;
      beads.forEach(([g0, gl, fl], i) => { const el = i ? dropEl2 : dropEl, grow = clamp((now_ - g0) / gl), ft = now_ - (g0 + gl), fall = ft > 0 ? ft / fl : 0, live = now_ >= g0 && fall < 1 && now_ < T.frontA + .1, D = Math.max(40, mouth[1] - lipY);
        if (live !== !!el._on) { el._on = live; el.style.opacity = live ? 1 : 0; }
        if (live) { const sc = (.3 + .7 * ease(grow)) * dr / 10 * (i ? .8 : 1), y = lipY + (1 - ease(grow)) * 0 + ease(grow) * dr * .5 + (fall > 0 ? D * fall * fall : 0), st = fall > 0 ? 1 + 1.4 * fall : 1 + .45 * grow;
          el.style.transform = `translate(${(outS.x - 5).toFixed(1)}px, ${y.toFixed(1)}px) scale(${(sc * (fall > 0 ? .85 : 1)).toFixed(3)}, ${(sc * st).toFixed(3)})`; }
        if (fall >= 1 && !el._hit) { el._hit = 1; ripple(mouth[0], mouth[1], .7); } });
      if (E.streamOn && now_ - (E.lastRip || 0) > .42 && !readyAt) { E.lastRip = now_; const A = proj(bucket.localToWorld(V(.1, Math.max(.02, level * FULL), .06))); ripple(A[0], A[1], 1); }
      nameEl.style.opacity = et > .15 && lv < .05 ? 1 : 0; if (lv >= 1 && box.style.display !== "none") box.style.display = "none";
      if (goAt) { if (!E.gone) { E.gone = performance.now(); box.classList.add("leave"); } else if (performance.now() - E.gone > 1200) { box.remove(); E.on = false; document.documentElement.classList.remove("earth-on"); } }
    };
    return E;
  })();

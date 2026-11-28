  // ---- moment 4: the building site (Tom 11-27): the back door opens onto ONE off-white site container, 8 m x 2.6 m, straight across the street from it (its painted face turned to the door,
  // the camera looks up the street at it from the pavement). The Edge piece is painted on it (CREDITS.txt): late-loaded, one picture a device (the laptop's has the three links in a row under the
  // piece, the phone's has them stacked). Two site lamps on tripods at its front corners light it (off by day); a steel mesh fence on concrete feet runs from both ends of the container along the
  // street to the end wall; behind the fence, what the mesh shows: a dark concrete building frame with a few work lights and, far off, one crane with its red light.
  // The container's ribs are shallow and wide (a site office's panel: 12 mm deep, 287 mm to a rib), so a thin link tag laid across them stays one line from any angle the walk looks from; the paint is
  // laid FLAT over the crests, and the ribs reach it as light (its normals lean over each flank like the metal's), so it can never slide or break across them (the rib test, 11-27).
  const SITE = (() => {
    const L = 8, H = 2.6, D = 2.44, CX = 64.9, ZF = 9.5, X0 = CX - L / 2, X1 = CX + L / 2, Y0 = G3; // ZF: the container's front (rib crests); the camera is on the street side, at smaller z
    const P = .2874, NR = 27, XR0 = X0 + .12, RIB_D = .012, YF0 = Y0 + .14, YF1 = Y0 + H - .14; // 27 ribs of 287.4 mm between the corner posts, 12 mm deep
    const rnd = (s => () => (s = (s * 16807) % 2147483647) / 2147483647)(7919);
    const mk = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
    const rib = s => s < .27 ? 1 : s < .5 ? 1 - (s - .27) / .23 : s < .77 ? 0 : (s - .77) / .23; // 1 in a valley, 0 on a crest, along one rib (s: 0..1)
    const tex2 = (c, rep) => { const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = maxAniso; if (rep) t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; };
    // the container's paint: off-white, a little dirty and warm (Tom: worn, not clean white), rain streaks from the top rail, splash dirt low down, scuffs, a few rust specks at the edges
    const bodyCanvas = (w, h, seed) => { const c = mk(w, h), g = c.getContext("2d"); g.fillStyle = "#e0dccf"; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 520; i++) { const x = rnd() * w, y = rnd() * h * .85, l = 30 + rnd() * h * .55; g.fillStyle = `rgba(${rnd() < .5 ? "92,84,66" : "245,240,226"},${.02 + rnd() * .05})`; g.fillRect(x, y, 1 + rnd() * 3, l); }
      const sp = g.createLinearGradient(0, h * .55, 0, h); sp.addColorStop(0, "rgba(96,86,66,0)"); sp.addColorStop(1, "rgba(96,86,66,.34)"); g.fillStyle = sp; g.fillRect(0, h * .55, w, h * .45);
      for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(${rnd() < .5 ? "80,72,56" : "250,246,232"},${.04 + rnd() * .08})`; g.beginPath(); g.ellipse(rnd() * w, rnd() * h, 8 + rnd() * 40, 4 + rnd() * 16, rnd() * 3, 0, 6.3); g.fill(); }
      for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(${120 + rnd() * 30},${64 + rnd() * 20},38,${.12 + rnd() * .2})`; g.fillRect(rnd() * w, h * (.88 + rnd() * .12), 1 + rnd() * 3, 3 + rnd() * 14); }
      return c; };
    const ribShade = (c, x0px, perPx, dark = .05, light = .05) => { const g = c.getContext('2d'), im = g.getImageData(0, 0, c.width, c.height), d = im.data; for (let x = 0; x < c.width; x++) { const s = (((x - x0px) / perPx) % 1 + 1) % 1, w = Math.cos(2 * Math.PI * (s - .635)); // 1 on a crest, -1 in a valley
        const a = w > 0 ? w * light : -w * dark, v = w > 0 ? 255 : 40; for (let y = 0; y < c.height; y++) { const k = (y * c.width + x) * 4, al = Math.round(a * 255) / 255, ia = d[k + 3] / 255, o = al + ia * (1 - al); d[k] = (v * al + d[k] * ia * (1 - al)) / (o || 1); d[k + 1] = (v * al + d[k + 1] * ia * (1 - al)) / (o || 1); d[k + 2] = (v * al + d[k + 2] * ia * (1 - al)) / (o || 1); d[k + 3] = o * 255; } } g.putImageData(im, 0, 0); return c; }; // one rib = one soft wave: light on the crest, a little dark in the valley, never a bar
    const bodyRibs = c => { const t = ribShade(mk(64, 4), 0, 64, .05, .05), g = c.getContext('2d'); for (let r = 0; r < NR; r++) g.drawImage(t, .12 / L * 2048 + r * P / L * 2048, 0, P / L * 2048, c.height); return c; }; // the rib wave is made once on a tiny picture and laid once a rib: a pixel loop over the whole 2048 x 1024 body held the start back (startbytes, round 4)
    const bodyT = tex2(bodyRibs(bodyCanvas(2048, 1024)), false), endT = tex2((() => { const c = bodyCanvas(512, 1024), g = c.getContext("2d"); g.strokeStyle = "rgba(60,54,42,.55)"; g.lineWidth = 3; g.strokeRect(24, 40, 464, 940); g.beginPath(); g.moveTo(256, 40); g.lineTo(256, 980); g.stroke();
      for (const x of [88, 168, 344, 424]) { g.fillStyle = "rgba(70,64,52,.5)"; g.fillRect(x - 5, 80, 10, 860); g.fillStyle = "rgba(60,56,46,.7)"; g.fillRect(x - 14, 480, 28, 40); } return c; })(), false);
    const bodyM = new THREE.MeshStandardMaterial({ map: bodyT, roughness: .66, metalness: .08, envMapIntensity: .25 }), endM = new THREE.MeshStandardMaterial({ map: endT, roughness: .66, metalness: .08, envMapIntensity: .25 });
    const steel = new THREE.MeshStandardMaterial({ color: 0xb3ae9e, roughness: .55, metalness: .15, envMapIntensity: .25 }), grey = new THREE.MeshStandardMaterial({ color: 0x3b3e43, roughness: .6, metalness: .5 }), cast = new THREE.MeshStandardMaterial({ color: 0x9d9889, roughness: .6, metalness: .25, envMapIntensity: .25 });
    const group = new THREE.Group(); group.name = "building-site"; scene.add(group);
    const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); group.add(m); return m; };
    // the ribbed front: a strip of flat quads, each with the normal of its slope (non-indexed: every quad its own)
    { const pos = [], nor = [], uv = [], zAt = s => ZF + RIB_D * rib(s);
      const pts = []; for (let r = 0; r < NR; r++) for (const s of [0, .27, .5, .77]) pts.push([XR0 + (r + s) * P, zAt(s)]); pts.push([XR0 + NR * P, zAt(0)]);
      for (let i = 0; i < pts.length - 1; i++) { const [xa, za] = pts[i], [xb, zb] = pts[i + 1], dx = xb - xa, dz = zb - za, n = V(dz * .4, 0, -dx).normalize() /* the flank's normal leans 40 % of what its slope says: soft folds under a grazing lamp, never dark bars */, ua = (xa - X0) / L, ub = (xb - X0) / L, va = (YF0 - Y0) / H, vb = (YF1 - Y0) / H;
        pos.push(xa, YF0, za, xb, YF1, zb, xb, YF0, zb, xa, YF0, za, xa, YF1, za, xb, YF1, zb); for (let k = 0; k < 6; k++) nor.push(n.x, n.y, n.z);
        uv.push(ua, va, ub, vb, ub, va, ua, va, ua, vb, ub, vb); }
      const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
      const face = new THREE.Mesh(g, bodyM); group.add(face);  }
    // the rest: back, roof, floor, the two ends (the right one is seen on the way to the end wall), the posts and the rails (steel, a little proud of the ribs)
    add(new THREE.BoxGeometry(L, H, .06), bodyM, CX, Y0 + H / 2, ZF + D - .03);
    add(new THREE.BoxGeometry(L, .06, D), bodyM, CX, Y0 + H - .04, ZF + D / 2);
    for (const sx of [-1, 1]) add(new THREE.BoxGeometry(.06, H, D), [endM, endM, bodyM, bodyM, bodyM, bodyM], CX + sx * (L / 2 - .03), Y0 + H / 2, ZF + D / 2);
    add(new THREE.BoxGeometry(L, .17, .1), steel, CX, Y0 + H - .095, ZF - .035); add(new THREE.BoxGeometry(L, .14, .1), steel, CX, Y0 + .07, ZF - .035);
    for (const sx of [-1, 1]) for (const [y, h] of [[Y0 + H / 2, H]]) { add(new THREE.BoxGeometry(.14, h, .12), steel, CX + sx * (L / 2 - .07), y, ZF - .045); add(new THREE.BoxGeometry(.12, h, .1), steel, CX + sx * (L / 2 - .06), y, ZF + D + .035); }
    for (const sx of [-1, 1]) for (const y of [Y0 + .09, Y0 + H - .09]) add(new THREE.BoxGeometry(.18, .18, .18), cast, CX + sx * (L / 2 - .09), y, ZF - .06);
    for (const x of [X0 + .4, X1 - .4]) add(new THREE.BoxGeometry(.3, .16, .3), grey, x, Y0 - .08, ZF + D / 2); // two pads it stands on
    // by day the ribs read at a glance (round 4): a stronger rib wave over the metal, in only as the day comes in (opacity 0 at night: the night look is round 3's)
    const dayRibs = (() => { const c = mk(256, 8); ribShade(c, 0, 256, .16, .09); const t = tex2(c, true); t.repeat.set(NR, 1);
      const g = new THREE.PlaneGeometry(NR * P, YF1 - YF0), m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, opacity: 0, polygonOffset: true, polygonOffsetFactor: -1 })); m.rotation.y = Math.PI; m.position.set(XR0 + NR * P / 2, (YF0 + YF1) / 2, ZF - .0015); m.scale.x = -1; m.material.side = THREE.DoubleSide; group.add(m); return m; })();
    // ---- the paint: one flat sheet over the crests, normals leaning over each flank (the metal's ribs reach the paint as light, never as a shift)
    const ANG = .2; // radians: how far the paint's normal leans on a flank (the metal itself leans .17: the paint under a grazing lamp reads about as the metal does)
    const painted = (file, w, y0, [pw, ph]) => { const k = w / pw, h = ph * k, xa = CX - w / 2, xb = CX + w / 2, N = Math.ceil(w / P * 12), pos = [], nor = [], uv = [], idx = [], z = ZF - .003;
      for (let i = 0; i <= N; i++) { const x = xa + w * i / N, s = (((x - XR0) / P) % 1 + 1) % 1, lean = s > .27 && s < .5 ? -Math.sin(Math.PI * (s - .27) / .23) : s > .77 ? Math.sin(Math.PI * (s - .77) / .23) : 0, a = lean * ANG, u = (xb - x) / w; // picture u runs to the left (the face looks the other way)
        for (const [y, v] of [[y0, 0], [y0 + h, 1]]) { pos.push(x, y, z); nor.push(Math.sin(a), 0, -Math.cos(a)); uv.push(u, v); } }
      for (let i = 0; i < N; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
      const map = tex(file, true, 1, 1, 0, 0, true); map.wrapS = map.wrapT = THREE.ClampToEdgeWrapping;
      const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map, color: 0x9c9c9c, transparent: true, depthWrite: false, roughness: .7, envMapIntensity: .1, polygonOffset: true, polygonOffsetFactor: -2 })); m.visible = false; group.add(m);
      // picture pixel (px, py) in the world: the picture's top is at y0 + h, its left at the world's right
      const at = (px, py) => V(xb - px * k, y0 + h - py * k, z);
      { const c = mk(256, 8); ribShade(c, 0, 256, .06, .03); const t = tex2(c, true); t.repeat.set(-w / P, 1); t.offset.set((((xb - XR0) / P) % 1 + 1) % 1, 0);
        const sh = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, opacity: .6, fog: false, polygonOffset: true, polygonOffsetFactor: -3 })); m.add(sh); }
      return { m, at, w, h, k, ready: () => texReady(file), protect: (name, [x0, y0, x1, y1]) => PROT.push([name, at(x0, y0), at(x1, y1)]), zw: 0 }; };
    const B = NARROW ? painted("assets/site_phone.webp", 2.2, Y0 + .22, [1689, 1711]) : painted("assets/site_laptop.webp", 5, Y0 + .3, [2146, 924]);
    // ---- the two lamps, on tripods at the front corners, both turned to the container (no bright lamp face competes with the piece)
    const lampM = new THREE.MeshStandardMaterial({ color: 0x1d1a14, emissive: 0xffe2b0, emissiveIntensity: 0 }), lamps = [];
    for (const [sx, tx] of [[-1, 1.6], [1, -1.6]]) { const lx = CX + sx * 2.95, lz = ZF - 1.6, hy = Y0 + 1.95;
      const legM = new THREE.MeshStandardMaterial({ color: 0x3a3d42, roughness: .45, metalness: .6 });
      for (let i = 0; i < 3; i++) { const a = i * 2.094 + .5, leg = new THREE.Mesh(new THREE.CylinderGeometry(.014, .018, 1.95, 6), legM); leg.position.set(lx + Math.sin(a) * .15, Y0 + .93, lz + Math.cos(a) * .15); leg.rotation.set(-Math.cos(a) * .157, 0, Math.sin(a) * .157); group.add(leg); }
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(.02, .02, .5, 6), grey); pole.position.set(lx, hy - .2, lz); group.add(pole);
      const head = new THREE.Group(); head.position.set(lx, hy + .1, lz); const hb = new THREE.Mesh(new THREE.BoxGeometry(.5, .36, .1), grey), face = new THREE.Mesh(new THREE.PlaneGeometry(.44, .3), lampM); face.position.z = .056; head.add(hb, face);
      const aim = V(CX + tx, Y0 + 1.2, ZF); head.lookAt(aim); group.add(head);
      const sp = new THREE.SpotLight(0xffe0bc, 0, 17, .62, 1, 1.4); sp.position.copy(head.position); sp.target.position.copy(aim); scene.add(sp, sp.target);
      lamps.push(sp); }
    // ---- the fence: steel mesh panels (3.5 m x 2 m) on concrete feet, from both ends of the container along the street to the end wall (x 104); see-through, so what stands behind it is built
    const FZ = ZF + .3, FW = 3.5, FH = 2, fence = [[X0, -1, 3], [X1, 1, 10]]; // [start x, direction, panels]
    const meshT = (() => { const c = mk(64, 64), g = c.getContext("2d"); g.strokeStyle = "#b9bdc2"; g.lineWidth = 6; g.strokeRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(FW / .1, FH / .1); t.anisotropy = maxAniso; t.encoding = THREE.sRGBEncoding; return t; })();
    const meshM = new THREE.MeshStandardMaterial({ map: meshT, transparent: true, alphaTest: .35, side: THREE.DoubleSide, roughness: .5, metalness: .6, envMapIntensity: .3 }), concM = new THREE.MeshStandardMaterial({ color: 0x74767a, roughness: .95 });
    const T4 = (x, y, z, sx = 1, sy = 1, sz = 1) => new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion(), V(sx, sy, sz));
    const inst = (geo, mat, ms) => { const im = new THREE.InstancedMesh(geo, mat, ms.length); ms.forEach((m, i) => im.setMatrixAt(i, m)); im.frustumCulled = false; group.add(im); return im; };
    { const panels = [], posts = [], feet = [], rails = [];
      for (const [x0, d, n] of fence) for (let i = 0; i < n; i++) { const xa = x0 + d * i * FW, xm = xa + d * FW / 2, xb = xa + d * FW;
        panels.push(T4(xm, Y0 + .1 + FH / 2, FZ)); rails.push(T4(xm, Y0 + .1 + FH - .02, FZ), T4(xm, Y0 + .1 + .04, FZ));
        for (const x of i ? [xb] : [xa, xb]) { posts.push(T4(x, Y0 + .1 + FH / 2, FZ)); feet.push(T4(x, Y0 + .11, FZ)); } }
      inst(new THREE.PlaneGeometry(FW, FH), meshM, panels); inst(new THREE.BoxGeometry(FW, .04, .04), grey, rails); inst(new THREE.CylinderGeometry(.02, .02, FH + .1, 6), grey, posts); inst(new THREE.BoxGeometry(.7, .22, .25), concM, feet); }
    // ---- behind the fence: the ground goes on (dark), a concrete building frame at each side of the container's view with its work lights, and one far crane
    const darkM = new THREE.MeshStandardMaterial({ color: 0x2a2c30, roughness: .95, envMapIntensity: .15 });
    { const gr = new THREE.Mesh(new THREE.PlaneGeometry(160, 90), darkM); gr.rotation.x = -Math.PI / 2; gr.position.set(80, Y0 - .02, 64); group.add(gr); }
    const conc = new THREE.MeshStandardMaterial({ color: 0x4b4e54, roughness: .95, envMapIntensity: .15 }), FL = 3.4, NF = 2;
    const work = [], workM = new THREE.MeshStandardMaterial({ color: 0x2a1c0e, emissive: 0xffb060, emissiveIntensity: 0 });
    { const cols = [], slabs = [], bars = [];
      for (const [xa, xb, za, zb] of [[42, 60, 25, 37], [70, 96, 25, 37]]) { const nx = Math.round((xb - xa) / 4), nz = Math.round((zb - za) / 6);
        for (let i = 0; i <= nx; i++) for (let j = 0; j <= nz; j++) { const x = xa + i * (xb - xa) / nx, z = za + j * (zb - za) / nz; cols.push(T4(x, Y0 + (FL * NF + .6) / 2, z, 1, FL * NF + .6, 1)); if (i % 2 === 0 && j === 0) bars.push(T4(x, Y0 + FL * NF + 1.4, z)); }
        for (let f = 1; f <= NF; f++) slabs.push(T4((xa + xb) / 2, Y0 + f * FL, (za + zb) / 2, xb - xa + 1, 1, zb - za + 1));
        for (const [fx, fz, f] of [[xa + 2, za - .6, 1], [xb - 3, za - .6, 2], [(xa + xb) / 2, za - .6, 2], [xa + 6, za - .6, 1]]) { const m = new THREE.Mesh(new THREE.BoxGeometry(.5, .16, .16), workM); m.position.set(fx, Y0 + f * FL - .4, fz); group.add(m); work.push(m); } }
      inst(new THREE.BoxGeometry(.5, 1, .5), conc, cols); inst(new THREE.BoxGeometry(1, .3, 1), conc, slabs); inst(new THREE.CylinderGeometry(.015, .015, 1.6, 4), grey, bars); }
    const glow = (() => { const c = mk(64, 64), g = c.getContext("2d"), r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(.25, "rgba(255,255,255,.35)"); r.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = r; g.fillRect(0, 0, 64, 64); return tex2(c, false); })();
    const halos = []; // a soft halo on each light (additive, no fog: it is what is seen of the work from far)
    const halo = (x, y, z, size, col) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: col, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, fog: false, opacity: 0 })); sp.scale.set(size, size, 1); sp.position.set(x, y, z); group.add(sp); halos.push({ sp, size }); return sp; };
    work.forEach(m => halo(m.position.x, m.position.y, m.position.z, .9, 0xffa850));
    const workL = [[77, 9.4], [86, 9.4], [96, 9.4]].map(([x, z]) => { const l = new THREE.PointLight(0xffd8b0, 0, 10, 1.4); l.position.set(x, Y0 + 4.6, z); scene.add(l);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(.05, .07, 4.6, 6), grey); pole.position.set(x, Y0 + 2.3, z + .1); group.add(pole); const hd = new THREE.Mesh(new THREE.BoxGeometry(.5, .14, .3), workM); hd.position.set(x, Y0 + 4.65, z); group.add(hd); return l; }); // 4: two floodlight masts behind the fence: real lights that show the fence, its feet and the ground on the way to the end wall
    // the crane: one silhouette plane far off (the lattice mast, the jib with its counter-jib and the hook) and its red light; a soft horizon glow behind it so it shows against the night
    const craneC = (() => { const c = mk(512, 512), g = c.getContext("2d"); g.strokeStyle = "#fff"; g.fillStyle = "#fff"; g.lineWidth = 3; g.beginPath(); g.moveTo(236, 512); g.lineTo(236, 80); g.moveTo(276, 512); g.lineTo(276, 80); g.stroke(); g.lineWidth = 2;
      for (let y = 512; y > 90; y -= 32) { g.beginPath(); g.moveTo(236, y); g.lineTo(276, y - 32); g.moveTo(276, y); g.lineTo(236, y - 32); g.stroke(); }
      g.lineWidth = 5; g.beginPath(); g.moveTo(40, 74); g.lineTo(500, 74); g.stroke(); g.lineWidth = 3; g.beginPath(); g.moveTo(236, 50); g.lineTo(256, 20); g.lineTo(276, 50); g.moveTo(256, 20); g.lineTo(480, 72); g.moveTo(256, 20); g.lineTo(60, 72); g.stroke();
      g.fillRect(40, 66, 50, 22); g.lineWidth = 1.5; g.beginPath(); g.moveTo(430, 76); g.lineTo(430, 150); g.stroke(); g.fillRect(424, 150, 12, 14); return c; })();
    const craneM = new THREE.MeshBasicMaterial({ map: tex2(craneC, false), color: 0x07080b, transparent: true, depthWrite: false, fog: false }), CRANE = { x: CX - 5, z: 70, s: 18 };
    { const cr = new THREE.Mesh(new THREE.PlaneGeometry(CRANE.s, CRANE.s), craneM); cr.rotation.y = Math.PI; cr.scale.x = -1; craneM.side = THREE.DoubleSide; cr.position.set(CRANE.x, Y0 + CRANE.s / 2 - 1, CRANE.z); group.add(cr);
      // the plane is turned to face the camera, so its picture is mirrored: the jib's tip (picture x 500 of 512, y 20 of 512 from the top) is at the world's x below the plane's middle
      halo(CRANE.x + (500 / 512 - .5) * CRANE.s, Y0 + CRANE.s / 2 - 1 + (.5 - 70 / 512) * CRANE.s, CRANE.z - .1, 1.8, 0xff2a1a); }
    const hz = new THREE.Mesh(new THREE.PlaneGeometry(240, 40), new THREE.MeshBasicMaterial({ map: glow, color: 0x4a6490, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, fog: false, opacity: 0 })); hz.position.set(CX, Y0 + 4, 80); hz.rotation.y = Math.PI; group.add(hz);
    return { L, H, D, CX, ZF, X0, X1, Y0, B, bodyM, dayRibs, lamps, lampM, work, workM, workL, halos, craneM, hz, group };
  })();
  const siteLamps = SITE.lamps, siteM = SITE.lampM;
  // daylight on the street outside the back door, for when the camera is inside (the day's sun is shut out of the workshop): a wide soft spot from outside, aimed at the container, that reaches nothing inside
  const siteDay = new THREE.SpotLight(0xfff0dc, 0, 40, 1.1, 1, 1.2); siteDay.position.set(SITE.CX, SITE.Y0 + 9, 1.5); siteDay.target.position.set(SITE.CX, SITE.Y0 + 1, SITE.ZF); scene.add(siteDay, siteDay.target);
  const siteFill = k => { siteDay.intensity = 4 * k; };
  // the site's lights: k = how far the camera has come out (0..1); the lamps and the work lights are on from there and stay on behind it. The clock (80-admin.js clockLight) switches them off by day with siteLights.
  const LAMP_I = 4.2;
  // the site's meshes are shown only while the walk can see them (sv 815 to 1160); its lights stay in the scene all the way: taking them out and putting them back changes the number of lights, and every program is built again for it (measured round 5: an 800 ms stop at sv 816, on the desk's card), six lights in every material's loop is the cheaper price
  let siteWas = null;
  function siteActive(on) { if (on === siteWas) return; siteWas = on; SITE.group.visible = on; }
  siteActive(false);
  function siteOn(k) { siteLamps.forEach(l => l.intensity = LAMP_I * k); siteM.emissiveIntensity = 2.4 * k; SITE.workM.emissiveIntensity = 2 * k; SITE.workL.forEach(l => l.intensity = 6 * k); SITE.halos.forEach((h, i) => h.sp.material.opacity = k * (i === SITE.halos.length - 1 ? .9 : .35));
    SITE.craneM.color.setHex(0x07080b); SITE.hz.material.opacity = k * .9; SITE.dayRibs.material.opacity = 0; SITE.bodyM.color.setHex(0xffffff); }
  function siteLights(n) { SITE.workL.forEach(l => l.intensity *= n); SITE.workM.emissiveIntensity *= n; SITE.halos.forEach(h => h.sp.material.opacity *= n); SITE.hz.material.opacity *= n; SITE.craneM.color.setHex(0x5b6370); SITE.dayRibs.material.opacity = 1 - n; SITE.bodyM.color.setHex(0xffffff).lerp(DAY_BODY, 1 - n); } // by day: a greyer, more worn off-white (f2) and ribs that read
  const DAY_BODY = new THREE.Color(0xb9b6aa);

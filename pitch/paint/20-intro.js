  // ---- the intro: a dark wall, a bucket filling like a progress bar, then the paint goes onto the wall (plays once, by itself)
  const metal = new THREE.MeshPhysicalMaterial({ color: 0x8b9197, metalness: .85, roughness: .36, clearcoat: .3, envMapIntensity: 1.2, side: THREE.DoubleSide });
  const paintIn = new THREE.MeshPhysicalMaterial({ color: PAINT, roughness: .1, clearcoat: 1, clearcoatRoughness: .04, envMapIntensity: 1.1 });
  const paintCoat = paintIn.clone(); paintCoat.side = THREE.DoubleSide; paintCoat.color = PAINT.clone().multiplyScalar(.4); paintCoat.envMapIntensity = .3; const coatCut = new THREE.Plane(); paintCoat.clippingPlanes = [coatCut]; renderer.localClippingEnabled = true; // the top you see is this coat lit as level under the lamp: at full strength the light blue washed out to milky, like water (11-22)
  // the paint in the bucket is a body of liquid: its inside cut by a level plane (world up), and the inside faces you see through the cut lit as a
  // flat surface, so the top always lies level whatever the bucket does (Tom 11-16: the old disc tilted with the bucket and left a straight line)
  paintCoat.onBeforeCompile = sh => { sh.fragmentShader = sh.fragmentShader.replace("#include <normal_fragment_maps>", "#include <normal_fragment_maps>\n if (!gl_FrontFacing) normal = normalize((viewMatrix * vec4(0., 1., 0., 0.)).xyz);"); };
  const filmMat = paintIn.clone(); filmMat.side = THREE.DoubleSide; filmMat.color = PAINT.clone().multiplyScalar(.45); filmMat.roughness = .25; // the walls it leaves wet
  const bucketHome = new THREE.Group(), bucketTip = new THREE.Group(), bucket = new THREE.Group();
  bucketHome.add(bucketTip); bucketTip.add(bucket); scene.add(bucketHome);
  // the pail: one turned profile of thin metal, a rolled rim, two pressed rings, a wire handle
  const pail = [[0, 0], [BK.r0, 0], [BK.r0 + .004, .012], [BK.r1, BK.h]].map(([r, y]) => new THREE.Vector2(r, y));
  bucket.add(new THREE.Mesh(new THREE.LatheGeometry(pail, 72), metal));
  const ring = (r, y, t) => { const m = new THREE.Mesh(new THREE.TorusGeometry(r, t, 10, 72), metal); m.rotation.x = Math.PI / 2; m.position.y = y; bucket.add(m); };
  ring(BK.r1 + .006, BK.h, .012); [.2, .45].forEach(f => ring(BK.r0 + (BK.r1 - BK.r0) * f + .002, BK.h * f, .006));
  const handle = new THREE.Mesh(new THREE.TorusGeometry(BK.r1 + .02, .007, 8, 48, Math.PI), new THREE.MeshStandardMaterial({ color: 0x6f747a, metalness: 1, roughness: .3 }));
  // the paint inside: a coat on the inner wall up to the level, and the glossy surface
  const coat = new THREE.Mesh(new THREE.LatheGeometry(pail.map(v => new THREE.Vector2(Math.max(0, v.x - .011), Math.max(.004, v.y))), 72), paintCoat); bucket.add(coat);
  const film = new THREE.Mesh(new THREE.LatheGeometry(pail.map(v => new THREE.Vector2(Math.max(0, v.x - .004), Math.min(BK.h - .01, Math.max(.002, v.y)))), 72), filmMat); film.visible = false; bucket.add(film);
  const surface = new THREE.Mesh(new THREE.CircleGeometry(1, 64), paintIn); surface.rotation.x = -Math.PI / 2; bucket.add(surface);
  const FULL = BK.h * .9;
  // what pours in from above while it fills, and what pours out after
  const colGeo = new THREE.CylinderGeometry(1, 1, 1, 16, 1, true); colGeo.translate(0, .5, 0);
  const inflow = new THREE.Mesh(colGeo, paintIn); scene.add(inflow);
  // what pours out (Tom 11-16: the pipe felt off): a sheet that leaves over the lowest point of the rim, falls in an arc,
  // narrows as it speeds up, with ripples running down it; the rim gets wet; at the end the tail falls away from the lip
  const OK_ = 30, OM = 14, outGeo = new THREE.BufferGeometry(), outPos = new Float32Array(OK_ * OM * 3), outIdx = [];
  for (let i = 0; i < OK_ - 1; i++) for (let j = 0; j < OM; j++) { const a = i * OM + j, b = i * OM + (j + 1) % OM; outIdx.push(a, a + OM, b, b, a + OM, b + OM); }
  outGeo.setAttribute("position", new THREE.BufferAttribute(outPos, 3)); outGeo.setIndex(outIdx);
  const outflow = new THREE.Mesh(outGeo, paintIn); outflow.visible = false; outflow.frustumCulled = false; scene.add(outflow);
  const lipGeo = new THREE.TorusGeometry(BK.r1 + .008, .0105, 10, 32, 1.1); lipGeo.rotateZ(-.55); lipGeo.rotateX(Math.PI / 2); lipGeo.translate(0, BK.h, 0);
  const lipWet = new THREE.Mesh(lipGeo, paintIn); lipWet.visible = false; bucket.add(lipWet);
  function pourSheet(f, tail, now) { // f: how much flows (0..1); tail: 0..1 how far the tail has fallen from the lip
    const inn = bucket.localToWorld(V(BK.r1 - .016, BK.h - .004, 0)), /* starts at the rim, not inside the bucket (that showed as a hard wedge) */ lip = bucket.localToWorld(V(BK.r1 + .01, BK.h + .012, 0));
    const out = lip.clone().sub(bucket.localToWorld(V(0, BK.h, 0))).setZ(0).normalize(), u = .35 + .75 * f, yEnd = WALL_TOP + .03;
    const yv = out.y * u, T = (yv + Math.sqrt(Math.max(0, yv * yv + 2 * 9.8 * (lip.y - yEnd)))) / 9.8, pts = [];
    for (let i = 0; i < OK_; i++) { const q = i / (OK_ - 1);
      if (i < 3) { pts.push(inn.clone().lerp(lip, i / 2)); continue; }
      const t = (q - 3 / (OK_ - 1)) / (1 - 3 / (OK_ - 1)) * T * 1.04; pts.push(V(lip.x + out.x * u * t, lip.y + yv * t - 4.9 * t * t, lip.z)); }
    const B = V(0, 0, 1), Tg = V(), N = V();
    for (let i = 0; i < OK_; i++) { const q = i / (OK_ - 1), a = pts[Math.max(0, i - 1)], b = pts[Math.min(OK_ - 1, i + 1)];
      Tg.subVectors(b, a).normalize(); N.crossVectors(Tg, B).normalize();
      const fall = Math.max(0, q - .07), w0 = (.03 + .17 * f), rip = 1 + .035 * Math.sin(q * 16 - now / 40) + .015 * Math.sin(q * 33 - now / 27);
      let w = w0 / (1 + 3 * fall) * rip, th = Math.min(w, (.012 + .032 * f) * (1 + 2.2 * fall)) * (2 - rip); // flat over the lip, round as it falls
      const gone = q < tail ? 0 : 1, bead = q < tail + .06 && tail > 0 ? 1.3 : 1; w = Math.max(.002, w * gone * bead); th = Math.max(.002, th * gone * bead);
      for (let j = 0; j < OM; j++) { const ang = j / OM * Math.PI * 2, cw = Math.cos(ang), sw = Math.sin(ang), k = (i * OM + j) * 3;
        outPos[k] = pts[i].x + B.x * cw * w + N.x * sw * th; outPos[k + 1] = pts[i].y + B.y * cw * w + N.y * sw * th; outPos[k + 2] = pts[i].z + B.z * cw * w + N.z * sw * th; } }
    outGeo.attributes.position.needsUpdate = true; outGeo.computeVertexNormals(); }
  // paint that leaves the wall top: the first gush goes over the front edge as a free-falling curtain that breaks into strands;
  // left of the bucket two thin runs go down the wall (Tom 11-16: a full bucket's worth reaches the floor early, not only to one side)
  const fallMat = new THREE.MeshPhysicalMaterial({ transparent: true, depthWrite: false, roughness: .08, clearcoat: 1, clearcoatRoughness: .04, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -3 });
  function makeFall(cx, z, o) { const u = { uFront: { value: 99 }, uTail: { value: 99 }, uTop: { value: WALL_TOP }, uCX: { value: cx }, uW: { value: o.w }, uNar: { value: o.nar }, uBrk: { value: o.brk }, uC: { value: PAINT }, uTm: { value: 0 } };
    const m = fallMat.clone(); m.onBeforeCompile = sh => { Object.assign(sh.uniforms, u);
      sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vWP;").replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.)).xyz;");
      sh.fragmentShader = sh.fragmentShader.replace("#include <common>", `#include <common>
        varying vec3 vWP; uniform float uFront, uTail, uTop, uCX, uW, uNar, uBrk, uTm; uniform vec3 uC;
        float fh(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float fn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(fh(i), fh(i + vec2(1, 0)), f.x), mix(fh(i + vec2(0, 1)), fh(i + vec2(1, 1)), f.x), f.y); }`)
        .replace("#include <map_fragment>", `
        float y = vWP.y, fall = max(0., uTop - y), wob = .035 * sin(y * 2.7 + uTm * 1.7) * min(1., fall * .4);
        float x = vWP.x - uCX - wob, w = uW / (1. + uNar * fall);
        float nearF = 1. - smoothstep(0., .5, y - uFront); w *= 1. - .55 * nearF;              // the front tapers
        float side = step(0., x), ew = 1. + (.32 + .5 * exp(-fall * 5.)) * (fn(vec2(y * 2.3 - uTm * 7. + side * 17., side * 5.)) - .5) * min(1., fall * .8 + .45); w *= ew; // ragged most where it leaves the lip; // uneven edges that move with the flow
        float aa = fwidth(x) + .002, a = (1. - smoothstep(w - aa, w + aa, abs(x))) * smoothstep(uFront - .02, uFront + .05, y) * step(y, uTail);
        float dy = uFront - y, dr = fn(vec2(x * 22., (y + uTm * 2.6) * 9.)); // below the front: drops running ahead, fewer the further ahead
        if (dy > 0. && dy < .45 && y < uTail) a = max(a, smoothstep(.62 + dy * .7, .7 + dy * .7, dr) * (1. - smoothstep(w * .5, w * .7, abs(x))));
        if (uBrk > 0.) a *= smoothstep(.32, .5, fn(vec2(x / max(w, .01) * 2.6 + 7., y * .35)) + 1.6 / (1. + fall * uBrk)); // splits into strands as it falls
        float r = abs(x) / max(w, .001); vec3 col = uC * .8; col *= mix(1., .5, smoothstep(.6, 1., r)); col += uC * .4 * (1. - smoothstep(.05, .5, r));
        col *= .82 + .32 * fn(vec2(x / max(w, .01) * 5., y * .9 - uTm * 9.)); // streaks running down: it flows
        diffuseColor = vec4(col, a);`); };
    const me = new THREE.Mesh(new THREE.PlaneGeometry(o.w * 2 + .5, WALL_TOP - GROUND + .2), m); me.position.set(cx, (WALL_TOP + GROUND) / 2, z); me.visible = false; me.frustumCulled = false; scene.add(me); return { me, u }; }
  const g2 = Math.sqrt(2 * (WALL_TOP - .05 - GROUND) / 9.8) * TS; // free fall from the wall top to the ground, in pour-clock seconds
  const CUR = { x: LEDGE.x0 + .28, c0: .38, c1: .2 + .6 * Math.log(1 / .45) }; CUR.land = CUR.c0 + g2; CUR.tailLand = CUR.c1 + g2;
  const curtain = makeFall(CUR.x, .09, { w: .34, nar: .07, brk: 1.8 }); // breaks into strands soon after the lip, not one tube
  const LRUNS = [{ x: LEDGE.x0 - .55, t0: .85, v: 2.4, w: .026 }, { x: LEDGE.x0 - 1.05, t0: 1.25, v: 2, w: .018 }].map(r => ({ ...r, land: r.t0 + (WALL_TOP - .12 - GROUND) / r.v, f: makeFall(r.x, .006, { w: r.w, nar: 0, brk: 0 }) }));
  // prepare everything that first shows during the pour while the bucket waits, so the pour itself has no first-use stalls (S23 11-16: 158 ms)
  // one piece a frame, with only the lights and that piece shown, so no single frame carries the whole cost
  // warm-up while the bucket waits: every object is drawn once, for real, into a 4 x 4 image the way the page draws (HalfFloat target,
  // as the composer). compile() alone built the screen variants, and the phone only finishes a shader on its first draw (S23 cold run 11-16:
  // 525 ms on arriving at epaRadar, 234 ms at the break)
  let warmQ = null; const warmRT = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType });
  function warmUp() { warmQ = []; const seen = new Set(); scene.traverse(o => { if (!(o.isMesh || o.isPoints || o.isLine)) return; // one object per material: the rest share its shader
    const k = (Array.isArray(o.material) ? o.material : [o.material]).map(m => m.uuid).join() + (o.isInstancedMesh ? 'i' : ''); if (!seen.has(k)) { seen.add(k); warmQ.push(o); } }); }
  function warmStep() { if (!warmQ || !warmQ.length) return; const m = warmQ.shift(), keep = new Set(); for (let o = m; o; o = o.parent) keep.add(o);
    const was = []; scene.traverse(o => { if (!o.isLight && !keep.has(o) && o.visible && o !== scene) was.push(o); }); was.forEach(o => o.visible = false);
    const anc = [...keep].map(o => [o, o.visible]); anc.forEach(([o]) => o.visible = true); const fc = m.frustumCulled; m.frustumCulled = false;
    const bg = scene.background; scene.background = null;
    try { renderer.setRenderTarget(warmRT); renderer.render(scene, camera); } catch (e) {} renderer.setRenderTarget(null);
    scene.background = bg; m.frustumCulled = fc; anc.forEach(([o, v]) => o.visible = v); was.forEach(o => o.visible = true); }
  function fallsAt(ic) { const free = t => WALL_TOP - .05 - 4.9 * Math.pow(Math.max(0, t) / TS, 2);
    const cu = curtain.u, on = ic > CUR.c0 && ic < CUR.tailLand + .1; curtain.me.visible = on;
    if (on) { cu.uFront.value = Math.max(GROUND - .1, free(ic - CUR.c0)); cu.uTail.value = ic < CUR.c1 ? WALL_TOP + .1 : free(ic - CUR.c1); cu.uW.value = .045 + .11 * left(Math.min(ic, CUR.c1)) /* thinner where it leaves the lip */; cu.uTm.value = ic; }
    LRUNS.forEach(r => { const on = ic > r.t0; r.f.me.visible = on; if (on) { r.f.u.uTop.value = WALL_TOP - .1; r.f.u.uFront.value = Math.max(GROUND - .05, WALL_TOP - .12 - r.v * (ic - r.t0)); r.f.u.uTail.value = WALL_TOP - .1; r.f.u.uTm.value = ic < r.land ? ic : r.land + .8 * (1 - Math.exp(-(ic - r.land) / .8)); } }); } // the flow slows to a stop once the run reaches the floor (it ran forever: Tom 11-17)
  const column = (m, a, b, r) => { const d = b.clone().sub(a), L = d.length(); m.position.copy(a); m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); m.scale.set(r, L, r); };
  // the wall's cap: the bucket stands on it (ledge), the paint floods along it
  const capNor = tex("assets/wall4_nor_gl.jpg", false, WW / TILE, .5 / TILE);
  const cap2 = new THREE.Mesh(new THREE.BoxGeometry(WW, .14, .46), new THREE.MeshStandardMaterial({ color: 0x55585c, roughness: .85, normalMap: capNor, envMapIntensity: .3 }));
  cap2.position.set(WX, WALL_TOP - .02, -.17); scene.add(cap2);
  // the start's dark (Tom 11-25): until the tap only the work light's pool on the cap shows; then the wall appears where the paint has run,
  // a soft curtain that follows the pour's own clock (ledgeArrive), and all of it once the camera follows the paint down
  const veilU = { uIc: { value: -9 }, uAll: { value: 0 } };
  for (const m of [wall.material, cap2.material, bareL.material]) { const prev = m.onBeforeCompile; m.onBeforeCompile = (sh, rr) => { if (prev) prev(sh, rr); Object.assign(sh.uniforms, veilU);
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vVW;").replace("#include <project_vertex>", "#include <project_vertex>\nvVW = (modelMatrix * vec4(transformed, 1.0)).xyz;");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec3 vVW; uniform float uIc, uAll;").replace("#include <dithering_fragment>", `
      if (uAll < .999) { // the rest of the walk skips the veil
      float arrive = ${(LEDGE.tip + .05).toFixed(3)} + max(0., vVW.x - ${LEDGE.x0.toFixed(3)}) / ${LEDGE.spread.toFixed(3)};
      float xi = vVW.x * .7, i0 = floor(xi), h0 = fract(sin(i0 * 91.7) * 4375.5), h1 = fract(sin((i0 + 1.) * 91.7) * 4375.5), col = mix(h0, h1, smoothstep(0., 1., fract(xi))), age = uIc - arrive;
      float reach = max(0., age) * ${(LEDGE.run * 1.3).toFixed(2)} * (.75 + .5 * col), below = ${WALL_TOP.toFixed(3)} - vVW.y;
      float wet = smoothstep(${(LEDGE.x - .7).toFixed(3)}, ${(LEDGE.x + .3).toFixed(3)}, vVW.x) * smoothstep(-.1, .5, age) * (1. - smoothstep(reach - 1.4, reach + .6, below));
      float spot = exp(-pow((vVW.x - ${(LEDGE.x + .1).toFixed(3)}) / 1.1, 2.) - pow(max(0., below) / .18, 2.));
      gl_FragColor.rgb *= clamp(max(max(wet, spot), uAll), 0., 1.);  }
      #include <dithering_fragment>`); }; }
  const sheetU = { uFrom: { value: 99 }, uTo: { value: 99 }, uC: { value: PAINT } };
  const sheetMat = new THREE.MeshPhysicalMaterial({ transparent: true, depthWrite: false, roughness: .1, clearcoat: 1, clearcoatRoughness: .05, polygonOffset: true, polygonOffsetFactor: -2 });
  sheetMat.defines = { USE_UV: "" };
  sheetMat.onBeforeCompile = sh => { Object.assign(sh.uniforms, sheetU);
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", `#include <common>
      uniform float uFrom, uTo; uniform vec3 uC;
      float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float vn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
      float fbm(vec2 p) { float a = .5, s = 0.; for (int i = 0; i < 5; i++) { s += a * vn(p); p = p * 2.07 + 17.3; a *= .5; } return s; }`)
      // the edge of spreading paint: uneven fingers at several sizes (no repeating wave), a darker thick rim; d = metres back from the front edge, continuous over the corner
      .replace("#include <map_fragment>", `float x = (vUv.x - .5) * ${(WW).toFixed(1)} + ${WX.toFixed(1)}, d = vUv.y * .46;
        float e = (fbm(vec2(x * 2.6, d * 2.6)) - .5) * .34 + (vn(vec2(x * 11., d * 11.)) - .5) * .07;
        float aa = fwidth(x + e) + .002, lead = uTo - (x + e), tail = x + e - uFrom;
        float a = smoothstep(-aa, aa, tail) * smoothstep(-aa, aa, lead);
        float rim = 1. - smoothstep(0., .035, min(lead, tail));
        diffuseColor = vec4(uC * (1. - .28 * rim), a);`); };
  const sheetTop = new THREE.Mesh(new THREE.PlaneGeometry(WW, .46), sheetMat); sheetTop.rotation.x = -Math.PI / 2; sheetTop.position.set(WX, WALL_TOP + .051, -.17);
  const frontGeo = new THREE.PlaneGeometry(WW, .14), fuv = frontGeo.attributes.uv; for (let i = 0; i < fuv.count; i++) fuv.setY(i, (fuv.getY(i) - 1) * .14 / .46); // the front face goes on from the top's front edge
  const sheetFront = new THREE.Mesh(frontGeo, sheetMat); sheetFront.position.set(WX, WALL_TOP - .02, .061);
  scene.add(sheetTop, sheetFront);
  handle.position.y = BK.h - .05; handle.rotation.x = -1.25; bucket.add(handle);
  bucketTip.position.set(BK.r0, 0, 0); bucket.position.set(-BK.r0, 0, 0); bucketHome.position.set(LEDGE.x, WALL_TOP + .05, -.17);
  // a small work light on the bucket while the wall is dark
  const workAt = { x: LEDGE.x + .1, y: WALL_TOP + .2 };
  const work = new THREE.SpotLight(0xffe6cc, 0, 14, .2, .8, 1.4); scene.add(work, work.target);
  work.position.set(LEDGE.x + .9, WALL_TOP + 4.2, 1.6); work.target.position.set(LEDGE.x + .1, WALL_TOP + .2, -.17);
  const INTRO = NARROW ? [V(LEDGE.x + .6, WALL_TOP + 2.6, 3.2), V(LEDGE.x + .2, WALL_TOP + .2, -.17)] : [V(LEDGE.x - .2, WALL_TOP + 2.4, 3.9), V(LEDGE.x - 1.3, WALL_TOP + .75, -.17)]; // laptop (Tom 11-25): the bucket low in the bottom-right corner, Tom's photo on the left, the name across the top // laptop: the bucket right of centre, Tom's photo on the left
  const CAM_IN = [.4, 0], FREE_AT = 3.2; // camera starts moving, finishes (set when the pour is known); FREE_AT: on the pour clock the scroll is free here, ~4 s after the tap, while the paint still runs
  // the visitor tips the bucket: one click or tap, or Enter/Space. Until then it waits, rocking a little now and then.
  let goAt = 0, level = 0, skipped = false, introOver = false, coatMax = 0, readyAt = 0, tilt = 0, tiltV = 0, tilt0 = 0, slosh = 0, sloshV = 0, rocks = 0;
  try { history.scrollRestoration = "manual"; } catch (e) {} scrollTo(0, upPx());
  // the window changes shape (a phone turned, a tiled window made full screen): the street is laid out once, for a phone or a laptop (NARROW),
  // so crossing that line reloads the walk at the same place, past the bucket, instead of showing the phone's street through a laptop's window.
  // Not while the visitor writes a tag or a message: that would lose their work.
  const RESUME_KEY = "tlxq-walk-resume", RESUME = (() => { try { const v = JSON.parse(sessionStorage.getItem(RESUME_KEY)); sessionStorage.removeItem(RESUME_KEY); return v && Date.now() - v.at < 15000 ? v.f : null; } catch (_) { return null; } })();
  document.documentElement.dataset.narrow = NARROW ? "1" : "0"; // the checks read it
  { let shapeT = 0; addEventListener("resize", () => { clearTimeout(shapeT); shapeT = setTimeout(() => {
    if (narrowNow() === NARROW || sheetOpen || ["draw", "move", "send"].includes(tag.stage)) return;
    const room = document.documentElement.scrollHeight - innerHeight - upPx();
    try { if (introOver) sessionStorage.setItem(RESUME_KEY, JSON.stringify({ f: room > 0 ? Math.max(0, Math.min(1, (scrollY - upPx()) / room)) : 0, at: Date.now() })); } catch (_) {}
    location.reload(); }, 400); }); }
  // a reload starts at the top: some hosts put the old scroll place back after load, so hold the top until the intro ends
  addEventListener("pageshow", () => { if (!introOver) scrollTo(0, upPx()); });
  const root = document.documentElement; root.style.overflow = "hidden"; root.style.touchAction = "none";
  const go = () => { if (!goAt) { goAt = performance.now(); tilt0 = tilt; tagBucket.tabIndex = -1; tagBucket.removeAttribute("role"); tagBucket.blur(); } };
  addEventListener("pointerdown", e => { if (goAt && !introOver) skipped = true; else if (readyAt && onBucket(e)) go(); }); // only the bucket tips it (Tom 11-25); a tap anywhere still skips the camera's ride
  addEventListener("pointermove", e => { const c = readyAt && !goAt && onBucket(e) ? "pointer" : ""; if (document.body.style.cursor !== c) document.body.style.cursor = c; }, { passive: true });
  addEventListener("keydown", e => { if (goAt && !introOver) skipped = true; else if (readyAt && !goAt && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); go(); } }); // only while the bucket waits: later Enter and Space belong to the form and its links
  addEventListener("wheel", () => { if (goAt && !introOver) skipped = true; }, { passive: true });
  const tagBucket = document.getElementById("tagBucket"); let tagText = "";
  // the start's page layer: the photo beside the bucket (a phone: above it), the name, the loading number. Measured from where the bucket is on screen.
  // The photo is lit with the bucket: the work light warms up on both (lampOn), and both lean a little with the mouse or the phone's tilt.
  let startDay = 0, START_T = 0; const startEl = document.querySelector(".start"), stIm = startEl.querySelector("img"), stNm = startEl.querySelector("h2"), stNum = startEl.querySelector(".num"), stGo = startEl.querySelector(".go"), stWd = startEl.querySelector(".word");
  let stPx = 0, stPy = 0, stTx = 0, stTy = 0, lampOn = 0;
  addEventListener("pointermove", e => { stTx = e.clientX / innerWidth - .5; stTy = e.clientY / innerHeight - .5; }, { passive: true });
  addEventListener("deviceorientation", e => { if (e.gamma == null) return; stTx = Math.max(-.5, Math.min(.5, e.gamma / 50)); stTy = Math.max(-.5, Math.min(.5, (e.beta - 50) / 80)); }, { passive: true });
  let nameW = 0, tomR = .45; const nameEm = () => { if (!nameW) { stNm.style.fontSize = "100px"; nameW = stNm.getBoundingClientRect().width / 100; const rg = document.createRange(); rg.selectNodeContents(stNm.firstChild); tomR = rg.getBoundingClientRect().width / 100 / nameW; } return 1 / nameW; }; // and TOM's width as a share of LARSSON's, for the word beside it // font size per px of width: LARSSON's real width
  document.fonts.load('900 100px "Archivo"').then(() => { nameW = 0; }, () => {});
  function startTick(now, ic) { const wt = START_T ? (now - START_T) / 1000 : 0; // the lamp warms up: off, two flickers, on
    lampOn = REDUCED ? 1 : wt < .3 ? 0 : wt < 1.3 ? sm(cl((wt - .3) / .9)) * (Math.random() < .3 ? .25 : 1) : 1;
    const f = ic < 0 ? 0 : sm(cl(ic / 1.2)); if (f >= 1) { if (startEl.style.display !== "none") startEl.style.display = "none"; return; }
    const op = (1 - f).toFixed(3); if (startEl.style.opacity !== op) startEl.style.opacity = op; // opacity only: a full-screen blur each frame is heavy on a phone
    stPx += (stTx - stPx) * .06; stPy += (stTy - stPy) * .06;
    startLayout(innerWidth, innerHeight, Math.max(16, innerWidth * .03)); // measured every frame (cheap): the bucket's place can change while the page loads; styles are written only when they change
    const tf = (e, k, v) => { const m = stW.get(e) || stW.set(e, {}).get(e), kk = k.slice(2); if (m[kk] !== v) { m[kk] = v; if (kk === "textContent") e.textContent = v; else e.style[kk] = v; } }; // each style written only when it changes: no per-frame style work on a phone
    tf(stIm, "i.transform", `translate(${(-stPx * 14).toFixed(0)}px, ${(-stPy * 8).toFixed(0)}px)`); tf(stIm, "i.filter", lampOn < 1 ? `brightness(${(.15 + .85 * lampOn).toFixed(2)})` : "none");
    tf(stNm, "n.transform", `translate(${(-stPx * 6).toFixed(0)}px, ${(-stPy * 4).toFixed(0)}px)`); tf(stWd, "w.transform", stNm.style.transform);
    const sp = (REDUCED ? 112 : -12 + 124 * Math.min(1, level / .9)).toFixed(0) + "%"; const wm = stW.get(stWd) || stW.set(stWd, {}).get(stWd); if (wm.p !== sp) { wm.p = sp; stWd.style.setProperty("--p", sp); } // sprayed on as the bucket fills, whole a little before it is full
    stShown = Math.max(stShown, Math.round(level * 100)); tf(stNum, "u.textContent", String(stShown)) /* never counts down */; tf(stNum, "u.opacity", readyAt ? "0" : "1"); tf(stGo, "g.opacity", readyAt && !goAt ? "1" : "0"); }
  const stW = new Map(); let stShown = 0, stBox = [0, 0, 0, 0];
  const onBucket = e => e.clientX >= stBox[0] && e.clientX <= stBox[2] && e.clientY >= stBox[1] && e.clientY <= stBox[3];
  window.bucketAt = () => ({ x: (stBox[0] + stBox[2]) / 2, y: (stBox[1] + stBox[3]) / 2 }); // the checks click the bucket, not the middle
  function startLayout(W, H, gu) { bucketHome.updateWorldMatrix(true, false); camera.updateMatrixWorld(); // placed now, not as of the last render: the first frames come before it
    const P = q => { const v = bucketHome.localToWorld(q).project(camera); return [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H]; };
    const [cx] = P(V(0, BK.h * .5, 0)), [ex] = P(V(BK.r1 + .06, BK.h * .5, 0)), [, ty] = P(V(0, BK.h + .12, 0)), [, by] = P(V(0, -.05, 0)), room = cx - Math.abs(ex - cx) - gu, AR = .73;
    const set = (e, o) => { const m = stW.get(e) || stW.set(e, {}).get(e); for (const k in o) { const v = typeof o[k] === "number" ? o[k].toFixed(0) + "px" : o[k]; if (m[k] !== v) { m[k] = v; e.style[k] = v; } } };
    if (room > W * .3) { // beside: the photo fills the room left of the bucket, his chest level with it; the name top right
      const ph = Math.min(H * .94, (room - gu) / AR), fs = Math.min(H * .15, (W - gu * 3 - ph * AR) * nameEm()); // the room right of the photo
      set(stIm, { left: gu, top: Math.max(H * .03, Math.min(H - ph, (ty + by) / 2 - ph * .42)), height: ph, translate: "0 0" });
      set(stNm, { left: "auto", right: gu, top: H * .06, bottom: "auto", textAlign: "right", fontSize: fs });
      const lw = fs / nameEm(), ww = lw * .46; // the word left of TOM, level with it
      set(stWd, { left: "auto", right: gu + lw * tomR + lw * .025, top: H * .06 + fs * .22 - ww * 369 / 900 / 2, bottom: "auto", width: ww });
      for (const e of [stNum, stGo]) set(e, { left: "auto", right: gu }); set(stNum, { fontSize: Math.min(W * .09, H * .17) });
      { const nt = H * .06 + fs * .84 * 2 + gu; set(stNum, { top: nt, bottom: "auto" }); set(stGo, { right: W - (cx - Math.abs(ex - cx)) + gu, top: (ty + by) / 2, bottom: "auto" }); } // the bucket has the bottom: the number goes under the name, the line beside the bucket
    } else { // stacked: the photo above the bucket, the name low, clear of the paint's fall
      const ph = Math.max(0, ty - H * .03), fs = (W - gu * 2) * nameEm();
      set(stIm, { left: "50%", top: H * .02, height: ph, translate: "-50% 0" });
      const nb = H * .04 + W * .2 * .8 + gu; set(stNm, { left: gu, right: "auto", top: "auto", bottom: nb, textAlign: "left", fontSize: fs }); // above the number
      const lw = W - gu * 2, wl = gu + lw * tomR + lw * .06; // the word right of TOM, on its line
      set(stWd, { left: wl, right: "auto", top: "auto", bottom: nb + fs * .84 + fs * .1, width: W - gu - wl });
      for (const e of [stNum, stGo]) set(e, { left: gu, right: "auto" }); set(stNum, { fontSize: W * .2 }); }
    const hw = Math.abs(ex - cx), pad = Math.max(16, hw * .25); stBox = [cx - hw - pad, ty - pad, cx + hw + pad, by + pad]; // where a click tips it
    if (!START_T) { START_T = performance.now(); startEl.classList.add("placed"); } } // the lamp warms up from the moment the start shows
  const lines = document.getElementById("lines"); lines.insertAdjacentHTML("beforeend", '<line id="l5"/><circle id="c5" r="4"/>');
  const l5 = lines.querySelector("#l5"), c5 = lines.querySelector("#c5");
  function intro(now, dt) {
    const since = (now - t0) / 1000; wallUpload(); if (introOver) LATE.start(); // the bucket has tipped and the pour is over: now the rest is asked for (not during the pour, which keeps the frames to itself)
    if (!goAt) {
      const target = Math.min(Math.max(loadFrac, since > 6 ? 1 : 0) * (pourReady ? 1 : .92), since / 1.0); // a fill that is not held back by loading takes about a second (Tom 11-26: quicker, still poured); loadFrac keeps a slow line waiting for the real loading
      level += ((readyAt ? 1 : target) - level) * Math.min(1, dt * 7);
      if (pourReady && level > .975 && !readyAt) { readyAt = now; root.dataset.readyAt = Math.round(now - t0); warmUp(); tagBucket.tabIndex = 0; tagBucket.setAttribute("role", "button"); tagBucket.setAttribute("aria-label", "Tip the bucket to enter"); } /* Tab reaches the start, Enter tips it (B-4) */ else warmStep();
      if (pourReady && (REDUCED || RESUME !== null)) goAt = now - 60000; // a reload for a new window shape skips the bucket: the visitor tipped it already
      // a small rock now and then shows it can move
      { if (readyAt && Math.floor((now - readyAt) / 3200) > rocks) { rocks++; tiltV += .55; } tiltV += (-42 * tilt - 6 * tiltV) * dt; tilt = Math.max(-.04, tilt + tiltV * dt); }
    } else if (skipped && now - goAt < 60000) goAt = now - 60000;
    const ic = goAt ? (now - goAt) / 1000 * TS : -1; // the pour clock: 0.8 of real time, so the whole pour is calmer
    if (pourReady && !CAM_IN[1]) CAM_IN[1] = Math.min(FREE_AT - .3, Math.max(CAM_IN[0] + 1.5, pourDone - .7));
    if (!introOver && (scrollX || Math.abs(scrollY - upPx()) > 1)) scrollTo(0, upPx());
    if (!introOver && ic > Math.min(pourDone + .3, FREE_AT)) { scrollTo(0, upPx()); introOver = true; root.style.overflow = ""; root.style.touchAction = ""; document.body.style.cursor = "";  if (RESUME !== null) scrollTo(0, upPx() + RESUME * Math.max(0, root.scrollHeight - innerHeight - upPx()));}
    if (goAt && document.body.style.cursor === "pointer") document.body.style.cursor = ""; // the hand is only over the bucket (pointermove), and gone once it tips
    // the bucket fills
    const fillL = goAt ? Math.max(.03, left(ic)) : level; coatMax = Math.max(coatMax, fillL);
    const inflowOn = !readyAt && !goAt, sy = fillL * FULL;
    inflow.visible = inflowOn;
    if (inflowOn) { const top = bucket.localToWorld(V(.1, sy, .06)), r = .02 * (1 + Math.sin(now / 70) * .08);
      column(inflow, top, top.clone().add(V(0, 9, 0)), Math.max(1e-4, r)); } // no splash while it fills: on the black start the drops drift off as stray dots
    // the bucket tips: from where the visitor left it, all the way over on its side
    const k = cl(ic / .45), ang = goAt ? tilt0 + (1.52 - tilt0) * (k < 1 ? sm(k) * (1 + .12 * Math.sin(k * Math.PI)) : 1) : tilt;
    bucketTip.rotation.z = -ang;
    // the paint surface stays level and sloshes a little behind the bucket
    sloshV += (-(slosh - ang) * 70 - sloshV * 6) * dt; slosh += sloshV * dt;
    surface.visible = false;
    // the paint's level: find the height where the bucket, at its angle, holds what is left; never above the lowest point of the rim
    { bucket.updateWorldMatrix(true, false); const u = V(0, 1, 0).applyQuaternion(bucket.getWorldQuaternion(new THREE.Quaternion())), b0 = bucket.localToWorld(V(0, 0, 0)), sn = Math.sqrt(Math.max(0, 1 - u.y * u.y));
      const N = 24, ds = BK.h / N, rad = s_ => BK.r0 + (BK.r1 - BK.r0) * s_ / BK.h - .011;
      const vol = L => { let v = 0; for (let i = 0; i < N; i++) { const s_ = (i + .5) * ds, r = rad(s_), cy = b0.y + u.y * s_, e = r * sn;
        const t = e < 1e-4 ? (L > cy ? 1 : -1) : Math.max(-1, Math.min(1, (L - cy) / e)); v += Math.PI * r * r * ((t * Math.sqrt(1 - t * t) + Math.asin(t)) / Math.PI + .5) * ds; } return v; };
      let full = 0; for (let i = 0; i < N; i++) { const s_ = (i + .5) * ds; if (s_ < FULL) full += Math.PI * rad(s_) ** 2 * ds; }
      const want = fillL * full; let lo = b0.y - 1, hi = b0.y + 1; for (let k = 0; k < 22; k++) { const m = (lo + hi) / 2; if (vol(m) < want) lo = m; else hi = m; }
      const rimC = bucket.localToWorld(V(0, BK.h, 0)), lip = rimC.y - (BK.r1 - .011) * sn;
      coatCut.set(V(0, -1, 0), Math.min(lo, lip) + Math.sin(now / 160) * .002); coat.visible = fillL > .02; film.visible = !!goAt; }

    sheetU.uFrom.value = LEDGE.x - .1; sheetU.uTo.value = ic < LEDGE.tip ? LEDGE.x - .2 : Math.min(SPAN + .1, LEDGE.x0 + (ic - LEDGE.tip) * LEDGE.spread);
    if (goAt) fallsAt(ic);
    { const f = ic > .2 ? left(ic) : 0, tail = sm(cl((ic - 2.05) / .45)); outflow.visible = ic > .2 && tail < .98; if (outflow.visible) pourSheet(f, tail, now); lipWet.visible = ic > .15; }
    // the label: shows when the bucket is full, until it tips
    // while it fills: the paint level as a number (nothing in the first second); when full: what to do (signum L1, L2)
    const showB = !goAt && (readyAt ? now - readyAt > 400 : now - t0 > 1000);
    const txt = readyAt ? "Tip the bucket to enter" : `Loading ${Math.min(99, Math.round(level * 100))}%`;
    if (showB && txt !== tagText) { tagText = txt; tagBucket.innerHTML = `<b>Tom Larsson &middot; Product engineer</b>${txt}`; } // fixed text: the label's own words and a number, never a visitor's input. nosemgrep: insecure-innerhtml, insecure-document-method
    tagBucket.style.opacity = showB ? 1 : 0; [l5, c5].forEach(e => e.style.opacity = showB ? 1 : 0);
    if (showB) pin(tagBucket, l5, c5, bucket.localToWorld(V(-.25, BK.h * .8, .2)), NARROW ? -6 : -70, NARROW ? -150 : -60); // phone: no room at the side, so above, clear of the rim
    // light: dark wall, work light on the bucket; the street light comes on as the paint goes
    veilU.uIc.value = ic < 0 ? -9 : ic; veilU.uAll.value = startDay = sm(cl((ic - 1.1) / 1.5)); skyU.uVeil.value = startDay; cityFar.material.opacity = startDay;
    const lk = ic < 0 ? 0 : sm(cl((ic - .6) / 1.1)), flick = lk > 0 && lk < .6 && Math.random() < .3 ? .2 : 1;
    lamp.intensity = 5.5 * lk * flick * (1 + Math.sin(now / 90) * .01); pool.intensity = 9 * lk * flick; bulbM.emissiveIntensity = 2.2 * lk * flick; sky.intensity = .1 + .25 * lk; work.intensity = 4.2 * lampOn * (1 - .7 * (ic < 0 ? 0 : sm(cl((ic - 2.4) / 1.2))));
    // after the tip the work light widens and follows the paint's front along the top, so the sheet is seen coming down
    { const k = ic < 0 ? 0 : sm(cl((ic - .25) / .6)), fx = Math.min(SPAN - .6, LEDGE.x0 + Math.max(0, ic - LEDGE.tip - .2) * LEDGE.spread - .6);
      const tx = LEDGE.x + .1 + (fx - LEDGE.x - .1) * k, ty = WALL_TOP + .2 - (.2 + SB * .8) * k;
      workAt.x += (tx - workAt.x) * Math.min(1, dt * 5); workAt.y += (ty - workAt.y) * Math.min(1, dt * 5);
      work.target.position.set(workAt.x, workAt.y, -.17 + .17 * k); work.position.set(workAt.x + .8, WALL_TOP + 4.2, 1.6 + 1.2 * k); work.angle = .2 + .22 * k; }
    return ic;
  }
  const toWorld = (x, y) => V(-PW / 2 + x / PX, PCY + PH / 2 - y / PX, 0);
  const SPRAY = [1, 3, 5].map(i => parseInt(PAINT_HEX.slice(i, i + 2), 16)).join(","); // from the hex: PAINT holds linear values // Tom's tag in the paint's colour
  function spray(x, y, p, amount) {
    const rc = 5 + p * 9;
    const gr = g.createRadialGradient(x, y, 0, x, y, rc); gr.addColorStop(0, `rgba(${SPRAY},${.7 * amount})`); gr.addColorStop(.5, `rgba(${SPRAY},${.45 * amount})`); gr.addColorStop(1, `rgba(${SPRAY},0)`);
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, rc, 0, 6.283); g.fill();
    g.fillStyle = `rgba(${SPRAY},.55)`;
    for (let k = 0; k < 10 * amount; k++) { const r = rc * (1 + Math.abs(gauss()) * 1.6), a = Math.random() * 6.283, s = .4 + Math.random() * 1.1; g.fillRect(x + Math.cos(a) * r, y + Math.sin(a) * r, s, s); }
  }
  const gauss = () => { let u = 0; for (let i = 0; i < 3; i++) u += Math.random(); return u - 1.5; };
  const drips = []; let dripsLeft = HAND.paint && HAND.paint.drips === "less" ? 5 : 9;

  // the can: modelled from its profile, painted black metal, a cap in the paint's colour
  const can = new THREE.Group();
  const prof = [[0, 0], [.27, 0], [.3, .02], [.3, 1.02], [.285, 1.1], [.2, 1.2], [.115, 1.25], [.115, 1.29], [0, 1.29]].map(([r, y]) => new THREE.Vector2(r, y));
  const body = new THREE.Mesh(new THREE.LatheGeometry(prof, 72), new THREE.MeshPhysicalMaterial({ color: 0x0c0c0e, metalness: .55, roughness: .32, clearcoat: 1, clearcoatRoughness: .08, envMapIntensity: 1.2 }));
  const band = new THREE.Mesh(new THREE.CylinderGeometry(.302, .302, .32, 72, 1, true), new THREE.MeshPhysicalMaterial({ color: PAINT, roughness: .4, clearcoat: .6, envMapIntensity: .8 })); band.position.y = .82;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(.115, .012, 12, 48), new THREE.MeshStandardMaterial({ color: 0xd8d8dc, metalness: 1, roughness: .22 })); rim.rotation.x = Math.PI / 2; rim.position.y = 1.29;
  const capMat = new THREE.MeshPhysicalMaterial({ color: PAINT, roughness: .35, clearcoat: .5 });
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(.06, .066, .1, 32), capMat); cap.position.y = 1.34;
  const tip = new THREE.Mesh(new THREE.CylinderGeometry(.018, .018, .03, 16), new THREE.MeshStandardMaterial({ color: 0x111111 })); tip.rotation.x = Math.PI / 2; tip.position.set(0, 1.355, -.065);
  [body, band, rim, cap, tip].forEach(m => can.add(m)); scene.add(can);
  // the can's shadow: where the street light's rays through the can meet the wall (drawn, soft, long because the light grazes)
  const shTex = (() => { const c = document.createElement("canvas"); c.width = 256; c.height = 64; const x = c.getContext("2d"); const gr = x.createRadialGradient(128, 32, 4, 128, 32, 128); gr.addColorStop(0, "#fff"); gr.addColorStop(.55, "#777"); gr.addColorStop(1, "#000"); x.fillStyle = gr; x.save(); x.scale(1, .25); x.fillRect(0, 0, 256, 256); x.restore(); return new THREE.CanvasTexture(c); })();
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0x000000, alphaMap: shTex, transparent: true, depthWrite: false, opacity: 0, fog: false }));
  shadow.position.z = .006; scene.add(shadow);
  const onWall = (w, L = lamp.position) => { const k = L.z / (L.z - w.z); return V(L.x + (w.x - L.x) * k, L.y + (w.y - L.y) * k, .006); };
  const NOZZLE = V(0, 1.355, -.08), REACH = .55;

  // mist: grains leaving the nozzle toward the wall; some hang in the light
  const MN = 2400, mp = new Float32Array(MN * 3), mv = new Float32Array(MN * 3), ml = new Float32Array(MN); let mi = 0;
  const mg = new THREE.BufferGeometry(); mg.setAttribute("position", new THREE.BufferAttribute(mp, 3)); mg.setAttribute("life", new THREE.BufferAttribute(ml, 1)); const mc = new Float32Array(MN * 3).fill(1); mg.setAttribute("col", new THREE.BufferAttribute(mc, 3));
  const mist = new THREE.Points(mg, new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uScale: { value: 1 } },
    vertexShader: "attribute float life; attribute vec3 col; uniform float uScale; varying float vL; varying vec3 vC; void main(){ vL = life; vC = col; vec4 m = modelViewMatrix * vec4(position, 1.); gl_Position = projectionMatrix * m; gl_PointSize = (.012 + (1. - life) * .03) * uScale / -m.z; }",
    fragmentShader: "varying float vL; varying vec3 vC; void main(){ vec2 c = gl_PointCoord - .5; float a = smoothstep(.25, 0., dot(c, c)) * vL * .55; gl_FragColor = vec4(vC * a, 1.); }" }));
  mist.frustumCulled = false; scene.add(mist);
  function emit(from, to, n) { for (let k = 0; k < n; k++) { const i = mi = (mi + 1) % MN; mc[i * 3] = mistCol[0]; mc[i * 3 + 1] = mistCol[1]; mc[i * 3 + 2] = mistCol[2]; mp[i * 3] = from.x; mp[i * 3 + 1] = from.y; mp[i * 3 + 2] = from.z; const d = to.clone().sub(from); d.x += gauss() * .12; d.y += gauss() * .12; d.multiplyScalar((2.2 + Math.random() * 1.2)); mv[i * 3] = d.x; mv[i * 3 + 1] = d.y; mv[i * 3 + 2] = d.z; ml[i] = 1; } }

  // lens: bloom on the light, then depth of field, colour fringe at the edges, grain and the film curve
  const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType }); const composer = new THREE.EffectComposer(renderer, rt);
  [composer.renderTarget1, composer.renderTarget2].forEach(r => { r.depthTexture = new THREE.DepthTexture(); r.depthTexture.type = THREE.UnsignedIntType; });
  composer.addPass(new THREE.RenderPass(scene, camera));
  const bloom = new THREE.UnrealBloomPass(new THREE.Vector2(256, 256), .35, .5, .92); composer.addPass(bloom);
  const lens = new THREE.ShaderPass({ uniforms: { tDiffuse: { value: null }, tDepth: { value: null }, uRes: { value: new THREE.Vector2() }, uFocus: { value: 6 }, uNear: { value: camera.near }, uFar: { value: camera.far }, uTime: { value: 0 }, uAper: { value: 1 } },
    vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }",
    fragmentShader: `
      uniform sampler2D tDiffuse, tDepth; uniform vec2 uRes; uniform float uFocus, uNear, uFar, uTime, uAper; varying vec2 vUv;
      float viewZ(vec2 uv){ float d = texture2D(tDepth, uv).x; return uNear * uFar / ((uFar - uNear) * d - uFar); }
      float coc(vec2 uv){ return clamp(abs(-viewZ(uv) - uFocus) * .9 * uAper, 0., 9.); }
      float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      void main(){
        float r = coc(vUv); vec3 acc = vec3(0.); float wsum = 0.;
        for (int i = 0; i < 24; i++) { float fi = float(i); float a = fi * 2.39996; float rr = sqrt((fi + .5) / 24.) * r; vec2 o = vec2(cos(a), sin(a)) * rr / uRes;
          float w = clamp(coc(vUv + o) / max(r, .001) + .2, 0., 1.); acc += texture2D(tDiffuse, vUv + o).rgb * w; wsum += w; }
        vec3 col = acc / max(wsum, .001);
        vec2 dc = vUv - .5; float e = dot(dc, dc);
        float fr = .8 * (1. - smoothstep(.8, 3., r)); // no fringe on blurred parts: it sampled the sharp picture there and lit specks as coloured dots
        col.r = mix(col.r, texture2D(tDiffuse, vUv - dc * e * .009).r, fr); col.b = mix(col.b, texture2D(tDiffuse, vUv + dc * e * .009).b, fr); // half the old split: thin blue runs at the edge broke into green and violet
        col *= 1. - e * 1.25;
        gl_FragColor = vec4(col, 1.);
        #include <tonemapping_fragment>
        #include <encodings_fragment>
        gl_FragColor.rgb += (hash(vUv * uRes + fract(uTime) * 91.) - .5) * .045;
      }` });
  composer.addPass(lens);

  const fit = () => {
    const w = innerWidth, h = innerHeight; camera.aspect = w / h;
    // every wall framed (Tom 11-23: "the camera focus is strange"): the stops are set for a laptop (16:10) and a phone (9:20); a narrower window keeps the same width in view
    // by seeing more above and below, so no painting loses its sides
    camera.fov = Math.min(72, camera.aspect >= ASP0 ? FOV0 : 2 * THREE.MathUtils.radToDeg(Math.atan(Math.tan(THREE.MathUtils.degToRad(FOV0 / 2)) * ASP0 / camera.aspect))); camera.updateProjectionMatrix(); renderer.setSize(w, h, false); composer.setSize(w, h); canvas.style.height = h + "px"; // the picture exactly as tall as the page draws for: on a phone 100vh is the screen with the address bar hidden, so with the bar showing the picture stretched and every tap area and the form sat above its mark (S23, 11-22)
    lens.uniforms.uRes.value.set(w * renderer.getPixelRatio(), h * renderer.getPixelRatio()); mist.material.uniforms.uScale.value = h * renderer.getPixelRatio() / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
  };
  fit(); addEventListener("resize", fit);

  // labels pinned to the can and to the writing, with real facts from the hand file
  const tagCan = document.getElementById("tagCan"), tagHand = document.getElementById("tagHand"), svg = document.getElementById("lines");
  tagCan.innerHTML = `<b>${HAND.pen}</b>written ${HAND.written}`; // fixed text: HAND is built at build time from the repo's own words, never a visitor's input. nosemgrep: insecure-innerhtml, insecure-document-method
  tagHand.innerHTML = "<b>Tom Larsson</b>Product engineer";
  svg.insertAdjacentHTML("beforeend", '<line id="l1"/><circle id="c1" r="4"/><line id="l2"/><circle id="c2" r="4"/>');
  const proj = v => { const p = v.clone().project(camera); return [(p.x + 1) / 2 * innerWidth, (1 - p.y) / 2 * innerHeight, p.z < 1]; };
  function pin(el, line, dot, world, dx, dy) {
    const [x, y] = proj(world); const tx = x + dx, ty = y + dy;
    dot.setAttribute("cx", x); dot.setAttribute("cy", y); line.setAttribute("x1", x); line.setAttribute("y1", y); line.setAttribute("x2", tx); line.setAttribute("y2", ty);
    el.style.left = cl(dx < 0 ? tx - el.offsetWidth - 6 : tx + 6, 12, innerWidth - el.offsetWidth - 12) + "px"; el.style.top = cl(ty - 9, 12, innerHeight - el.offsetHeight - 12) + "px";
  }


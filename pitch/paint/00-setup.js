(() => {
  // The opening: a real concrete wall at night, one street light grazing it, and Tom's line poured down the wall
  // as the light comes on. (The hand-written tag code stays but is off: no pen samples.)
  const HAND = __HAND__;
  const NARROW = innerWidth / innerHeight < .8, narrowNow = () => innerWidth / innerHeight < .8; // NARROW shapes the scene once, at load; the end wall asks again every frame, so a phone turned mid-walk gets the end wall for its new shape
  const PROT = []; // what a plate must never cover: [name, one corner, the other corner (in the wall's own space), which plates ("" = all)]; the plates check reads them
  const canvas = document.getElementById("c");
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" }); }
  catch (e) { // no 3D (graphics turned off, an old browser): never a dead end (signum L1), the same work is on the front (Tom 11-24)
    document.body.insertAdjacentHTML("beforeend", '<div class="nogl" role="main"><p>The walk needs 3D graphics, and this browser has them turned off.</p><a class="go" href="front.html">See the work without 3D</a>'
      + '<p class="ways"><a href="mailto:hello@ttdevs.com">hello@ttdevs.com</a><a href="https://github.com/tlxq" target="_blank" rel="noopener">GitHub ↗</a><a href="https://linkedin.com/in/tlxq" target="_blank" rel="noopener">LinkedIn ↗</a></p></div>'); return; }
  THREE.ColorManagement.legacyMode = false;
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .95;
  // loading progress for the bucket: every texture goes through the default manager
  let loadFrac = 0; THREE.DefaultLoadingManager.onProgress = (u, a, b) => { loadFrac = a / b; };
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x07080a); scene.fog = new THREE.FogExp2(0x0d0f13, .04);
  const FOV0 = NARROW ? 46 : 34, ASP0 = NARROW ? .45 : 1.6, camera = new THREE.PerspectiveCamera(FOV0, 1, .1, 120);
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const sm = t => t * t * (3 - 2 * t), cl = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

  // night light from a real rooftop (Poly Haven, CC0), only for reflections
  const pmrem = new THREE.PMREMGenerator(renderer);
  new THREE.TextureLoader().load("assets/env.jpg", t => { t.mapping = THREE.EquirectangularReflectionMapping; t.encoding = THREE.sRGBEncoding; scene.environment = pmrem.fromEquirectangular(t).texture; t.dispose(); });

  // the wall: scanned concrete (Poly Haven concrete_wall_003, CC0)
  const tl = new THREE.TextureLoader(), maxAniso = renderer.capabilities.getMaxAnisotropy();
  // each picture is loaded and sent to the graphics card once; every surface that uses it shares it (own repeat/offset only)
  const texCache = {};
  const tex = (u, srgb, rx, ry, ox = 0, oy = 0) => { let c = texCache[u];
    if (!c) { c = texCache[u] = { all: [] }; c.base = tl.load(u, () => { c.all.forEach(t => { if (t !== c.base) { t.source = c.base.source; t.needsUpdate = true; } }); renderer.initTexture(c.base); }); }
    // a surface asking before the picture is in gets an empty texture that takes the picture on load: clone() marks it for upload at once, and an upload with no picture warns every frame
    const t = !c.all.length ? c.base : c.base.image ? c.base.clone() : new THREE.Texture(); c.all.push(t); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.offset.set(ox, oy); t.anisotropy = maxAniso; if (srgb) t.encoding = THREE.sRGBEncoding; return t; };
  const WW = 90, WX = 24, WH = 10, GROUND = -2.2, TILE = 6;
  // the concrete's bumps under a painting (Tom 11-24: black lines across EDGE and epaRadar): three.js r147 places every map of a material by the colour map's
  // repeat and offset, so the bump texture was squeezed into the painting's own size and its joints fell where the wall has none. This reads it by its own.
  const wallBump = m => { m.onBeforeCompile = sh => { m.normalMap.updateMatrix(); sh.uniforms.uNorT = { value: m.normalMap.matrix };
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nuniform mat3 uNorT;").replace("#include <normal_fragment_maps>",
      THREE.ShaderChunk.normal_fragment_maps.replaceAll("texture2D( normalMap, vUv )", "texture2D( normalMap, ( uNorT * vec3( vUv, 1. ) ).xy )")); };
    m.customProgramCacheKey = () => "wallBump"; return m; };
  // downhill (Tom 11-16: scrolling down should go down): the street steps down 1.8 m twice, between the scenes
  const DROP = 1.8, G2 = GROUND - DROP, G3 = GROUND - 2 * DROP, STAIRS = [[5, 8, GROUND, G2], [19.3, 22.3, G2, G3]], NSTEP = 12;
  // the workshop (Tom 11-26: a garage workshop, not a way down under the ground). A room built behind the street wall from HX0 to CX1: BD deep, RH high, its
  // floor the street's (WF = G3). A garage door in the street wall (DOOR_A) rolls up as you come; the far one (DOOR_B) is open, the way out. The four tools'
  // walls hang on the room's back wall, at z = WZ. The street stays at G3 all along.
  const SV_END = 1180, LOOP = 60, SV_MAX = SV_END + LOOP; document.documentElement.dataset.svEnd = SV_END; // the scroll at the page's end, in vh; the checks read it. LOOP (Tom 11-23): past the end the camera steps back to the start's view in the same light, and the page is at the start again
  // the walk is a loop (Tom 11-17): after the pour the page parks UP vh down; scrolling up from there turns the camera left to the visitor wall.
  // upPx: the park in pixels, from the track's own height (a phone's vh and innerHeight differ while its address bar moves)
  // TOP (Tom 11-23, the loop both ways): the camera rests on the visitors' wall; at the very top the page is at its end, which shows that wall too
  // the scroll's own pace (R2, Tom 11-24: "a lot of scrolling"): the walk keeps its own count (sv, 0..SV_MAX: every moment, light and check is set in it),
  // but the page is shorter: a wall holds ~20-25 vh of scroll, a move between walls about half what it took. PACE: [sv, vh down the page below the park];
  // straight between pairs, so a move keeps its own easing. The checks scroll with svY(sv), which reads it.
  const PACE = [[0, 0], [60, 45], [240, 70], [304, 90], [340, 95], [416, 145], [486, 170], [529, 190], [548, 195], [612, 217], [656, 230], [700, 248], /* 612-656: through the garage door, a little quicker */ [725, 262], [770, 290], [795, 310],
    [840, 340], [865, 360], [910, 390], [935, 410], [1045, 460], [1058, 485], [SV_MAX - 10, 535], [SV_MAX, 543]], WALK = PACE[PACE.length - 1][1];
  const paceOf = (v, a, b) => { if (v <= PACE[0][a]) return PACE[0][b]; for (let i = 1; i < PACE.length; i++) if (v <= PACE[i][a]) { const [p, q] = [PACE[i - 1], PACE[i]]; return p[b] + (q[b] - p[b]) * (v - p[a]) / (q[a] - p[a]); } return PACE[PACE.length - 1][b]; };
  const UP = 90, TOP = 50, PAGE = TOP + UP + WALK + 100, track = document.querySelector(".track"), upPx = () => track.offsetHeight * (TOP + UP) / PAGE, topPx = () => track.offsetHeight * TOP / PAGE;
  track.style.height = PAGE + "vh"; // the stylesheet says the same, for the first paint
  window.visitY = () => topPx(); // the visitors' wall in pixels; the checks scroll with this
  let up0 = 0, endVisit = 0; // the park at the last frame; how far the end has walked in to the visitors' wall (0..1)
  window.svY = sv => upPx() + (document.documentElement.scrollHeight - innerHeight - upPx()) * paceOf(sv, 0, 1) / WALK; // the checks scroll with this
  const HX0 = 34.5, CX1 = 67.5, BD = 9.5, RH = 4.4, WZ = -BD, WF = G3, DOOR_A = [35.6, 40.6], DOOR_B = [62.7, 67.1], DOOR_H = 3.3, END_X = 104;
  const wallGeo = new THREE.PlaneGeometry(WW, WH + 2 * TILE); wallGeo.setAttribute("uv2", wallGeo.attributes.uv);
  const wall = new THREE.Mesh(wallGeo, new THREE.MeshStandardMaterial({ map: tex("assets/wall4_diff.jpg", true, WW / TILE, (WH + 2 * TILE) / TILE), normalMap: tex("assets/wall4_nor_gl.jpg", false, WW / TILE, (WH + 2 * TILE) / TILE), roughnessMap: tex("assets/wall4_rough.jpg", false, WW / TILE, (WH + 2 * TILE) / TILE), aoMap: tex("assets/wall4_ao.jpg", false, WW / TILE, (WH + 2 * TILE) / TILE), color: 0xc9ccd0, envMapIntensity: .3, normalScale: new THREE.Vector2(.7, .7) }));
  // the two garage doors' openings, cut through the street wall (the room's own front wall frames them, see the workshop)
  wall.material.onBeforeCompile = sh => { sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vWP;").replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.)).xyz;");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec3 vWP;").replace("#include <map_fragment>", `#include <map_fragment>
      if (vWP.y > ${(G3 - .3).toFixed(2)} && vWP.y < ${(G3 + DOOR_H).toFixed(2)} && ((vWP.x > ${DOOR_A[0]} && vWP.x < ${DOOR_A[1]}) || (vWP.x > ${DOOR_B[0]} && vWP.x < ${DOOR_B[1]}))) discard;`); };
  wall.position.set(WX, GROUND - 2 * TILE + (WH + 2 * TILE) / 2, 0); wall.receiveShadow = true; scene.add(wall); // reaches down to the workshop floor
  // the bare stretch left of the visitors' wall (R3): the page's top starts on it; its twin past EDGE ends the walk on the same view
  const WALL_ADD = (x0, x1, yb, yt, shift) => { const w = x1 - x0, h = yt - yb, ox = (x0 - shift.x - (WX - WW / 2)) / TILE, oy = (yb - shift.y - (GROUND - 2 * TILE)) / TILE, rx = w / TILE, ry = h / TILE, g = new THREE.PlaneGeometry(w, h); g.setAttribute("uv2", g.attributes.uv);
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: tex("assets/wall4_diff.jpg", true, rx, ry, ox, oy), normalMap: tex("assets/wall4_nor_gl.jpg", false, rx, ry, ox, oy), roughnessMap: tex("assets/wall4_rough.jpg", false, rx, ry, ox, oy), aoMap: tex("assets/wall4_ao.jpg", false, rx, ry, ox, oy), color: 0xc9ccd0, envMapIntensity: .3, normalScale: new THREE.Vector2(.7, .7) }));
    m.position.set((x0 + x1) / 2, yb + h / 2, 0); m.receiveShadow = true; scene.add(m);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(w, .14, .46), new THREE.MeshStandardMaterial({ color: 0x55585c, roughness: .85, envMapIntensity: .3 })); cap.position.set((x0 + x1) / 2, yt - .02, -.17); scene.add(cap); return m; };
  const bareL = WALL_ADD(-39, WX - WW / 2, GROUND - 2 * TILE, GROUND + WH, V());
  const PROF = (() => { const pts = [[-40, GROUND]]; for (const [a, b, h0, h1] of STAIRS) { const t = (b - a) / NSTEP, r = (h0 - h1) / NSTEP;
      pts.push([a, h0]); for (let k = 0; k < NSTEP; k++) { pts.push([a + k * t, h0 - (k + 1) * r], [a + (k + 1) * t, h0 - (k + 1) * r]); } } pts.push([END_X, G3]); return pts; })();
  const groundAt = x => { let h = GROUND; for (const [a, b, h0, h1] of STAIRS) { if (x >= b) h = h1; else if (x >= a) h = h0 - (Math.floor((x - a) / ((b - a) / NSTEP)) + 1) * (h0 - h1) / NSTEP; } return h; };
  // under the bridge (Tom 11-18: a 20 m wide field of steps looked painful) the second flight is only SW wide, along the wall; beside it
  // the street runs down as a smooth ramp, a low side wall between them
  const SW = 3, [RA, RB, RH0, RH1] = STAIRS[1], PROF_R = PROF.filter(([x, y]) => x < RA || x >= RB || (x === RA && y === RH0));
  const groundGeo = (() => { const P = [], N = [], U = [];
    for (const [prof, z0, z1] of [[PROF, 0, SW], [PROF_R, SW, 20]]) for (let i = 0; i < prof.length - 1; i++) { const [x0, y0] = prof[i], [x1, y1] = prof[i + 1]; if (x0 === x1 && y0 === y1) continue;
      const dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy), n = [-dy / l, dx / l, 0], u0 = (x0 + 28 + (GROUND - y0)) / 64, u1 = (x1 + 28 + (GROUND - y1)) / 64, v0 = 1 - z0 / 20, v1 = 1 - z1 / 20;
      const q = [[x0, y0, z0, u0, v0], [x0, y0, z1, u0, v1], [x1, y1, z1, u1, v1], [x0, y0, z0, u0, v0], [x1, y1, z1, u1, v1], [x1, y1, z0, u1, v0]];
      for (const [x, y, z, u, v] of q) { P.push(x, y, z); N.push(...n); U.push(u, v); } }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(N, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(U, 2)); g.setAttribute("uv2", g.attributes.uv); return g; })();
  const ground = new THREE.Mesh(groundGeo, new THREE.MeshStandardMaterial({ map: tex("assets/wall4_diff.jpg", true, 64 / TILE, 20 / TILE), normalMap: tex("assets/wall4_nor_gl.jpg", false, 64 / TILE, 20 / TILE), aoMap: tex("assets/wall4_ao.jpg", false, 64 / TILE, 20 / TILE), color: 0x7a7c80, roughness: .78, envMapIntensity: .35 }));
  // pavement: 1.2 m slabs with sunk joints from the wall out to the curb, then darker asphalt (Tom 11-16: a real ground for the paint)
  const CURB_Z = 2.7;
  // the road: Poly Haven's aerial_asphalt_01 (CC0, Rob Tuytel), 4 m a tile, sampled by world place (Tom 11-16: the drawn cracks read as a map)
  const roadT = { tRD: { value: tex("assets/road_diff.jpg", true, 1, 1) }, tRN: { value: tex("assets/road_nor_gl.jpg", false, 1, 1) }, tRR: { value: tex("assets/road_rough.jpg", false, 1, 1) } };
  ground.material.onBeforeCompile = sh => { Object.assign(sh.uniforms, roadT);
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vWP;").replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.)).xyz;");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", `#include <common>
      varying vec3 vWP; float gJoint; float gRoad; float gWet; float gGrate; vec2 gUV; uniform sampler2D tRD, tRN, tRR;
      float gh(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float gn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(gh(i), gh(i + vec2(1, 0)), f.x), mix(gh(i + vec2(0, 1)), gh(i + vec2(1, 1)), f.x), f.y); }
      float gf(vec2 p) { float a = .5, s = 0.; for (int i = 0; i < 5; i++) { s += a * gn(p); p = p * 2.03 + 11.7; a *= .5; } return s; }`)
      .replace("#include <map_fragment>", `#include <map_fragment>
        float jx = abs(fract((vWP.x - .13) / 1.2 + .5) - .5) * 1.2, jz = abs(fract(vWP.z / 1.2 + .5) - .5) * 1.2, aw = fwidth(vWP.x) + fwidth(vWP.z);
        gRoad = smoothstep(${CURB_Z.toFixed(2)} + .32, ${CURB_Z.toFixed(2)} + .36, vWP.z);
        gJoint = (1. - gRoad) * (1. - smoothstep(.012, .012 + aw, min(jx, jz))) * step(.15, vWP.z);
        float wallFoot = 1. - smoothstep(0., .12, vWP.z); // grime where the slab meets the wall
        diffuseColor.rgb *= mix(1., .38, gJoint) * mix(1., .55, wallFoot);
        // the abandoned back street (Tom 11-16): real cracked asphalt, the gutter, a worn centre line, rain in the dips, a rusty drain
        vec2 P = vWP.xz; float z = vWP.z - ${CURB_Z.toFixed(2)}; gUV = vec2(P.x, -P.y) / 4.;
        float gut = smoothstep(.32, .36, z) * (1. - smoothstep(.62, .66, z));
        float n = gf(P * 1.3);
        vec3 asph = texture2D(tRD, gUV).rgb * .5 * (.8 + .4 * gf(P * .3 + 5.));
        float lz = z - 3.9, dash = step(.45, fract(P.x / 6.)), worn = smoothstep(.35, .75, gf(P * 3.1 + 2.)) * smoothstep(.25, .45, texture2D(tRD, gUV).g);
        float line = (1. - smoothstep(.06, .07, abs(lz))) * dash * worn * .5;
        asph = mix(asph, vec3(.6, .58, .52), line);
        vec3 gutC = vec3(.2, .2, .2) * (.8 + .4 * n) * (1. - .35 * (1. - abs(z - .49) / .15));
        gWet = smoothstep(.66, .69, gf(P * 1.1 + 3.)) * smoothstep(.45, .55, gn(P * .35 + 9.)) * gRoad * (1. - gut) + gut * .7; // small puddles in the dips, not one big stain
        vec2 gq = vec2(P.x - ${DRAIN_X.toFixed(2)}, z - .49); float inG = step(abs(gq.x), .32) * step(abs(gq.y), .12);
        gGrate = inG * (1. - step(.5, fract(gq.x * 22.)) * step(abs(gq.y), .1) * step(abs(gq.x), .3));
        vec3 grate = mix(vec3(.01), vec3(.2, .09, .04) * (.6 + .6 * gn(P * 40.)), gGrate);
        vec3 road = mix(asph, gutC, gut); road = mix(road, grate, inG);
        road *= mix(1., .5, gWet);
        diffuseColor.rgb = mix(diffuseColor.rgb, road, gRoad);`)
      .replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>
        { vec3 nm = texture2D(tRN, gUV).xyz * 2. - 1.; vec3 wn = normalize(mix(vec3(nm.x, nm.z, -nm.y), vec3(0, 1, 0), max(gWet, .15))); // the rain lies flat
          normal = normalize(mix(normal, normalize((viewMatrix * vec4(wn, 0.)).xyz), gRoad)); }`)
      .replace("#include <lights_fragment_maps>", "#include <lights_fragment_maps>\n#ifdef USE_ENVMAP\n radiance *= mix(1., .3, gRoad); // a night street mirrors the dark, not a bright sky\n#endif")
      .replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, .95, gJoint); roughnessFactor = mix(roughnessFactor, mix(.6, 1., texture2D(tRR, gUV).r), gRoad); roughnessFactor = mix(roughnessFactor, .04, gWet); roughnessFactor = mix(roughnessFactor, .5, gGrate);"); };
  // the curb has a broken gap; the paint from one puddle finds it and runs along the gutter into the drain (Tom 11-16)
  const GAP_X = NARROW ? .7 : 1.25, DRAIN_X = NARROW ? 1.55 : 2.3, X0 = WX - WW / 2, X1 = END_X; // the curb runs on over the workshop and past the exit
  const curbM = new THREE.MeshStandardMaterial({ color: 0x8a8c90, roughness: .85, map: tex("assets/wall4_diff.jpg", true, WW / TILE, .3), normalMap: tex("assets/wall4_nor_gl.jpg", false, WW / TILE, .3), envMapIntensity: .3 });
  for (let i = 0; i < PROF.length - 1; i++) { const [p0, h] = PROF[i], [p1, h1] = PROF[i + 1]; if (h !== h1 || p1 <= p0 || (p0 >= RA && p1 <= RB)) continue; // each flat piece of street; not on the narrow flight's treads
    for (const [a, b] of [[X0, GAP_X - .22], [GAP_X + .2, X1]]) { const x0 = Math.max(a, p0), x1 = Math.min(b, p1); if (x1 - x0 < .01) continue; const c = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, .16, .34), curbM); c.position.set((x0 + x1) / 2, h + .02, CURB_Z + .17); scene.add(c); } }
  for (const [x, z, r, sy] of [[GAP_X - .27, CURB_Z + .5, .07, .6], [GAP_X + .3, CURB_Z + .1, .05, .7], [GAP_X - .1, CURB_Z - .12, .035, .8]]) { // broken bits of the curb
    const b = new THREE.Mesh(new THREE.DodecahedronGeometry(r), curbM); b.scale.y = sy; b.position.set(x, GROUND + r * sy * .7, z); b.rotation.set(x * 3, z * 5, 1); scene.add(b); }
  // a street light on the pavement's edge, its pool of light on the road; the rain in the dips reflects it (Tom 11-16)
  const POST = V(-4.4, 0, 2.45), postM = new THREE.MeshStandardMaterial({ color: 0x1a1b1d, metalness: .6, roughness: .55, envMapIntensity: .5 });
  const bulbM = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffd9a8, emissiveIntensity: 0 });
  const POSTMESH = []; // the street light's parts: by day, at the end, the pole is not in front of the painting
  { const pole = new THREE.Mesh(new THREE.CylinderGeometry(.06, .09, 6.6, 16), postM); pole.position.set(POST.x, GROUND + 3.3, POST.z);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(.035, .035, 1.3, 10), postM); arm.rotation.x = Math.PI / 2 - .2; arm.position.set(POST.x, GROUND + 6.5, POST.z + .62);
    const head = new THREE.Mesh(new THREE.CylinderGeometry(.13, .32, .18, 20), postM); head.position.set(POST.x, GROUND + 6.45, POST.z + 1.25);
    const bulb = new THREE.Mesh(new THREE.CylinderGeometry(.24, .24, .02, 20), bulbM); bulb.position.set(POST.x, GROUND + 6.35, POST.z + 1.25);
    scene.add(pole, arm, head, bulb); POSTMESH.push(pole, arm, head, bulb); }
  // the visitors' wall's own street light (Tom 11-23: the swinging light goes), and its twin past EDGE at the same place on the wall, a whole number of tiles
  // on (SEAM_D): in close, the concrete under each looks the same, so the walk changes from one to the other without a cut you can see
  const SEAM_D = V(110.4, -2 * DROP, 0), VPOST = V(-18.6, 0, 2.45); // R3 (Tom 11-24: no zoom): the street past EDGE is the street left of the visitors' wall, moved; 110.4 + 3.6 is a whole number of tiles, so the pavement lines up too
  for (const [d, g] of [[V(), GROUND], [SEAM_D, GROUND - 2 * DROP]]) { const q = VPOST.clone().add(d), hy = GROUND + 6.45 + d.y, L = hy + .15 - g; // the twin's street is lower: a shorter pole, its head at the same place
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(.06, .09, L, 16), postM); pole.position.set(q.x, g + L / 2, q.z);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(.035, .035, 1.3, 10), postM); arm.rotation.x = Math.PI / 2 - .2; arm.position.set(q.x, hy + .05, q.z + .62);
    const head = new THREE.Mesh(new THREE.CylinderGeometry(.13, .32, .18, 20), postM); head.position.set(q.x, hy, q.z + 1.25);
    const bulb = new THREE.Mesh(new THREE.CylinderGeometry(.24, .24, .02, 20), bulbM); bulb.position.set(q.x, hy - .1, q.z + 1.25); scene.add(pole, arm, head, bulb); }


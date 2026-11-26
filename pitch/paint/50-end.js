  // ---- the end (Tom 11-23, no flash): past EDGE the head turns to the next street light and the street goes on as its twin
  // (SEAM_D) up to the visitors' wall; the visitors' wall is the page's seam, lit by the visitor's own clock.
  // No fly-back (a strip of walls from above looks like a set).
  const CUT = 1125; // the scroll (vh) where the walk changes from the bare wall past EDGE to the bare wall by the visitors' wall, in close (Tom 11-23: no flash)
  const sun = new THREE.DirectionalLight(0xffe4c8, 0); sun.position.set(14, 7, 9); sun.target.position.set(0, .5, 0); scene.add(sun, sun.target);
  const BG0 = scene.background.clone(), BGM = new THREE.Color(0xb9c3cf), FOGM = new THREE.Color(0xa7adb5), SKYM = new THREE.Color(0xdfe6ef), GND0 = sky.groundColor.clone(), GNDM = new THREE.Color(0x6d6862);
    // the form: the same fields and words as the live site's (src/look/MailForm.tsx), sent by the server (api/contact.ts); signum W3, W5, W6
  document.querySelector(".hud").insertAdjacentHTML("beforeend", `<form class="mail" id="mail" inert><span class="head">Write to me</span><div class="fields" style="display: contents">
    <label class="f-name"><input name="name" autocomplete="name" required maxlength="100" enterkeyhint="next" placeholder=" "><span>Name</span></label>
    <label class="f-email"><input name="email" type="email" autocomplete="email" required maxlength="200" enterkeyhint="next" placeholder=" "><span>Email</span></label>
    <label class="f-msg"><textarea name="message" rows="2" required maxlength="4000" placeholder=" "></textarea><span>Message</span></label>
    <label class="trap" aria-hidden="true">Website<input name="website" tabindex="-1" autocomplete="off"></label>
    <p class="err" role="alert" hidden></p><a class="pv" href="/privacy" target="_blank" rel="noopener">privacy</a><button>Send</button></div></form>
    <button type="button" class="hot" id="leave" aria-label="Leave your tag" tabindex="-1" style="display: none"></button>
`);
  const mail = document.getElementById("mail"), mailErr = mail.querySelector(".err"), mailBtn = mail.querySelector("button");
  const MAIL = __MAIL_WORDS__; // the words: src/content/mailWords.json, one source (tools/pitch/build.mjs fills it in)
  mail.addEventListener("submit", async e => { e.preventDefault(); mailBtn.disabled = true; mailBtn.textContent = "Sending\u2026"; mailErr.hidden = true; let why;
    try { const f = Object.fromEntries(new FormData(mail)), a = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
      if (a.ok) { sheetSent = true; const sent = document.createElement("p"); sent.setAttribute("role", "status"); sent.textContent = `Sent. I'll write back to ${f.email}.`; mail.querySelector(".fields").replaceChildren(sent); return; } // the links stay: a next step (signum L1)
      why = MAIL.why[((await a.json().catch(() => ({}))).error) || ""] || MAIL.other; } catch (_) { why = MAIL.offline; }
    mailErr.textContent = MAIL.lead + why; mailErr.hidden = false; mailBtn.disabled = false; mailBtn.textContent = "Try again"; });
  // the end wall (Tom 11-19, try 67): one painting on the graphics card (CREDITS.txt), the bare concrete keyed out so the wall
  // shows through; the can is the Leave your tag button, the form sits in the painted frame, the two sprayed stencils (GitHub's and LinkedIn's own marks, drawn from their vector shapes) are the links to GitHub and
  // LinkedIn. Picture pixels: 1536 x 960; foot: the row
  // where the wall meets the ground (what is below it lies flat on the street); form: the dark panel's inside.
  const FORM_W = 500, FORM_H = 276, FLYER_TILT = -.012; // the form laid out once at this size, then scaled to the flyer; the flyer's tilt
  const E = { foot: 795, flyer: [816, 130, 1384, 772], form: [846, 330, 1354, 610], tabs: [[822, 650, 1004, 766], [1007, 650, 1193, 766], [1196, 650, 1378, 766]], bbox: [800, 120, 1400, 790] }; E.signs = E.tabs; // a flyer pasted on the concrete (Tom 11-22): WRITE TO ME printed, the form on the paper, tear-off tabs (email, GitHub, LinkedIn)
  const EPW = 9.73, EK = EPW / 1536, EFLOOR = 2.2, ECX = 5, ELIFT = .9; // the ending (Tom 11-23): only the flyer is left on this canvas, 3.6 m wide, pasted on the start wall between the mural and the epaRadar wall (x 5.3..8.9); hung .9 m up, clear of the stair's railing and its lamp
  const eU = u => ECX - EPW / 2 + u * EK, eV = v => GROUND + ELIFT + (E.foot - v) * EK;
  const eFlat = (u, v) => V(eU(u), GROUND, (v - E.foot) * EK * EFLOOR);
  const endMat = extra => new THREE.MeshStandardMaterial(Object.assign({ transparent: true, depthWrite: false, roughness: .55, opacity: 0, polygonOffset: true, polygonOffsetFactor: -2 }, extra));
  const eHW = E.foot / 960, eHF = 1 - eHW,  eWallH = E.foot * EK, eFD = (960 - E.foot) * EK * EFLOOR;
  // the end wall is painted here, on a canvas, in the front's words and colours (Tom 11-22, walk step 3): WRITE TO ME with the front's blue
  // swipe under WRITE, the address, GitHub and LinkedIn, Leave your tag, and the form's panel (Tom 11-23: only the flyer is left).
  // Dark paint on the day-lit concrete (the front's dark words on cream); words, not logos (Tom 11-22).
  const eCan = Object.assign(document.createElement("canvas"), { width: 1536, height: 960 });
  const eTex = () => { const t = new THREE.CanvasTexture(eCan); t.encoding = THREE.sRGBEncoding; t.anisotropy = maxAniso; return t; };
  const eMapW = eTex(), eMapF = eTex(); eMapW.repeat.set(1, eHW); eMapW.offset.set(0, eHF); eMapF.repeat.set(1, eHF);
  function paintEnd(swipe) { const g = eCan.getContext("2d", { willReadFrequently: true }), W = 1536, H = 960, css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
    const DARK = css("--look-dark"), SOFT = css("--look-dark-soft"), CREAM = css("--look-cream"); let sd = 3; const rn = () => (sd = sd * 16807 % 2147483647) / 2147483647;
    g.clearRect(0, 0, W, H); g.textBaseline = "alphabetic";
    // the flyer: cream paper, pasted a little crooked, its shadow, glue sheen and creases
    const [fx0, fy0, fx1, fy1] = E.flyer, fw = fx1 - fx0, fh = fy1 - fy0, tilt = FLYER_TILT;
    g.save(); g.translate(fx0 + fw / 2, fy0 + fh / 2); g.rotate(tilt); g.translate(-fw / 2, -fh / 2);
    g.shadowColor = "rgba(0,0,0,.35)"; g.shadowBlur = 10; g.shadowOffsetY = 3; g.fillStyle = CREAM;
    g.beginPath(); g.moveTo(0, 0); g.lineTo(fw - 46, 0); g.lineTo(fw - 30, 14); g.lineTo(fw - 18, 6); g.lineTo(fw, 26); g.lineTo(fw, fh - 128); g.lineTo(fw, fh); g.lineTo(0, fh); g.closePath(); g.fill(); g.shadowColor = "transparent"; // the top-right corner torn
    for (let k = 0; k < 9; k++) { const y = rn() * fh, gr = g.createLinearGradient(0, y - 6, 0, y + 6); gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(.5, `rgba(${rn() < .5 ? "0,0,0,.05" : "255,255,255,.12"})`); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(0, y - 6, fw, 12); } // creases from the paste brush
    g.fillStyle = DARK; g.font = '700 100px "Clash Display", sans-serif'; g.fillText("WRITE", 28, 112); g.fillText("TO ME", 28, 196);
    // tear-off tabs: cut lines, and each tab's words
    const ty = E.tabs[0][1] - fy0; g.strokeStyle = SOFT; g.lineWidth = 2; g.setLineDash([10, 7]); g.beginPath(); g.moveTo(0, ty); g.lineTo(fw, ty);
    E.tabs.slice(1).forEach(t => { const x = t[0] - fx0 - 2; g.moveTo(x, ty); g.lineTo(x, fh); }); g.stroke(); g.setLineDash([]);
    [["Email", "hello@ttdevs.com"], ["GitHub ↗", "github.com/tlxq"], ["LinkedIn ↗", "in/tlxq"]].forEach(([a, b], k) => { const t = E.tabs[k], x = t[0] - fx0 + 14;
      const room = t[2] - t[0] - 22; let px = 24; g.font = `600 ${px}px "Inter", sans-serif`; while (px > 16 && g.measureText(b).width > room) g.font = `600 ${--px}px "Inter", sans-serif`; // the address as big as the tab allows: it has to read on a phone
      g.fillStyle = DARK; g.fillText(b, x, ty + 84); g.font = '700 28px "Inter", sans-serif'; g.fillText(a, x, ty + 46); });
    g.restore();
    if (swipe) { g.save(); g.translate(fx0 - 30, fy0 + 40); g.rotate(-.5); g.globalAlpha = .9; g.drawImage(swipe, -60, -30, 300, 60); g.restore(); } // the last of the bucket's blue: one stroke across the flyer's corner
    const d = g.getImageData(0, 0, W, H), p = d.data; for (let i = 0; i < p.length; i += 4) if (p[i + 3]) { const n = rn(); p[i + 3] = Math.max(0, p[i + 3] - n * 40); const f = 1 - n * .06; p[i] *= f; p[i + 1] *= f; p[i + 2] *= f; } g.putImageData(d, 0, 0); // paint and paper, not print: grain
    eMapW.needsUpdate = eMapF.needsUpdate = true; }
  { const sw = new Image(); sw.onload = () => document.fonts.ready.then(() => Promise.all(['700 100px "Clash Display"', '600 40px "Inter"', '700 40px "Inter"'].map(f => document.fonts.load(f).catch(() => {})))).then(() => paintEnd(sw)); sw.onerror = () => paintEnd(null); sw.src = "assets/swipe.webp"; }
  for (const t of [eMapW, eMapF]) t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  const eWall = new THREE.Mesh(new THREE.PlaneGeometry(EPW, eWallH), wallBump(endMat({ map: eMapW, normalMap: tex("assets/wall4_nor_gl.jpg", false, EPW / TILE, eWallH / TILE, (ECX - EPW / 2 - (WX - WW / 2)) / TILE, 0), normalScale: new THREE.Vector2(.9, .9) })));
  eWall.position.set(ECX, GROUND + ELIFT + eWallH / 2, .003);
  const eFloor = new THREE.Mesh(new THREE.PlaneGeometry(EPW, eFD), endMat({ map: eMapF, roughness: .8 })); eFloor.rotation.x = -Math.PI / 2; eFloor.position.set(ECX, GROUND + .004, eFD / 2);
  eWall.visible = eFloor.visible = false; scene.add(eWall, eFloor);
  // ---- Write to me from the sticker bomb (pitch 11-23, the motion only; the end flyer stays on this branch). The sticker is the flyer folded once:
  // hover lifts its corner, a tap peels it off the pole, it flies to the middle turning over, and the folded half opens down into the flyer with the form.
  // x, Esc or a tap outside folds it back onto the pole (into the screen's corner when the pole is out of view). After Send it wears a tick.
  document.body.insertAdjacentHTML("beforeend", `<div id="dim"></div>
    <div id="sheet" role="dialog" aria-modal="true" aria-label="Write to me"><div class="fly"><div class="top"><div class="face paper"></div><div class="face cover"></div></div>
      <div class="bot"><div class="face paper"></div><div class="face back"></div></div>
      <a class="tab" href="mailto:hello@ttdevs.com" aria-label="Email"></a><a class="tab" href="${GHUB.slice(0, -1)}" target="_blank" rel="noopener" aria-label="GitHub"></a><a class="tab" href="https://linkedin.com/in/tlxq" target="_blank" rel="noopener" aria-label="LinkedIn"></a>
      <button type="button" class="x" aria-label="Close">&times;</button></div></div>
    <button type="button" class="stk" id="bombHot" aria-label="Write to me"><span class="tick" aria-hidden="true">&check;</span></button>
    <button type="button" class="stk" id="corner" aria-label="Write to me"><img src="assets/stickers/writetome.webp" alt=""><span class="tick" aria-hidden="true">&check;</span></button>`);
  const sheet = document.getElementById("sheet"), fly = sheet.querySelector(".fly"), flyBot = sheet.querySelector(".bot"), flyX = sheet.querySelector(".x"), sTabs = [...sheet.querySelectorAll(".tab")];
  const dim = document.getElementById("dim"), bombHot = document.getElementById("bombHot"), corner = document.getElementById("corner"), mailHome = mail.parentNode;
  const FL = E.flyer, FLW = FL[2] - FL[0], FLH = FL[3] - FL[1], msOf = n => REDUCED ? 0 : parseFloat(tok(n)) || 0, EASE = "cubic-bezier(.2, 0, 0, 1)"; // --ease
  const TOUCH = matchMedia("(pointer: coarse)").matches; fly.tabIndex = -1; fly.style.outline = "none";
  let sheetOpen = false, sheetBusy = false, sheetSent = false, sheetFrom = null, wtmCurl = null, wtmCurlT = null;
  function sheetPaper() { const c = Object.assign(document.createElement("canvas"), { width: FLW, height: FLH }), g = c.getContext("2d"); // the flyer off the wall, straightened
    g.translate(FLW / 2, FLH / 2); g.rotate(-FLYER_TILT); g.translate(-(FL[0] + FLW / 2), -(FL[1] + FLH / 2)); g.drawImage(eCan, 0, 0); return `url(${c.toDataURL()})`; }
  const sheetBox = () => { const ph = narrowNow(), w = ph ? innerWidth : Math.min(innerWidth * .9, Math.min(innerHeight * .9, 760) * FLW / FLH), h = w * FLH / FLW; return { w, h, x: (innerWidth - w) / 2, y: ph ? innerHeight - h : (innerHeight - h) / 2 }; }; // a phone: a sheet along the bottom, full width
  function sheetLay(b) { const k = b.w / FLW, fx = (E.form[0] - FL[0]) * k, fy = (E.form[1] - FL[1]) * k, fw = (E.form[2] - E.form[0]) * k, fh = (E.form[3] - E.form[1]) * k;
    Object.assign(fly.style, { width: b.w + "px", height: b.h + "px" });
    if (narrowNow()) Object.assign(mail.style, { transform: "", left: fx + "px", top: fy + "px", width: fw + "px", minHeight: fh + "px" }); // the form at full size: 16 px typing, 48 px taps
    else { const z = Math.min(fw / FORM_W, fh / FORM_H); Object.assign(mail.style, { width: FORM_W + "px", minHeight: FORM_H + "px", left: fx + (fw - FORM_W * z) / 2 + "px", top: fy + (fh - FORM_H * z) / 2 + "px", transformOrigin: "0 0", transform: `scale(${z})` }); }
    sTabs.forEach((t, i) => { const r = E.tabs[i]; Object.assign(t.style, { left: (r[0] - FL[0]) * k + "px", top: (r[1] - FL[1]) * k + "px", width: (r[2] - r[0]) * k + "px", height: (r[3] - r[1]) * k + "px" }); }); }
  function wtmRect() { const m = BOMB_WTM; if (!m || !m.visible || !BOMB_WTM.material.map) return null; if (!m.geometry.boundingBox) m.geometry.computeBoundingBox(); const bb = m.geometry.boundingBox, P = [];
    for (let i = 0; i < 8; i++) P.push(proj(V(i & 1 ? bb.max.x : bb.min.x, i & 2 ? bb.max.y : bb.min.y, i & 4 ? bb.max.z : bb.min.z)));
    if (!P.every(q => q[2])) return null; const xs = P.map(q => q[0]), ys = P.map(q => q[1]), l = Math.min(...xs), r = Math.max(...xs), t = Math.min(...ys), b = Math.max(...ys);
    return r < 0 || l > innerWidth || b < 0 || t > innerHeight ? null : { l, t, w: r - l, h: b - t }; }
  const cornerRect = () => { const r = corner.querySelector("img").getBoundingClientRect(); return { l: r.left, t: r.top, w: r.width, h: r.height }; };
  // the fly's transform: the folded half (the top of the flyer) laid over rect r, or the open flyer in its box b
  const flyAt = (r, b, turn, z) => r ? `translate(${r.l}px, ${r.t}px) scale(${r.w / b.w}, ${r.h / (b.h / 2)}) translate(${b.w / 2}px, ${b.h / 4}px) rotateY(${turn}deg) rotateZ(${z}deg) translate(${-b.w / 2}px, ${-b.h / 4}px)`
    : `translate(${b.x}px, ${b.y}px) scale(1, 1) translate(${b.w / 2}px, ${b.h / 4}px) rotateY(0deg) rotateZ(0deg) translate(${-b.w / 2}px, ${-b.h / 4}px)`;
  const FOLD = "translateZ(1px) rotateX(180deg)", FLAT = "translateZ(0px) rotateX(0deg)";
  const tween = (ms, f) => new Promise(ok => { const t0 = performance.now(); (function st(now) { const u = ms ? Math.min(1, (now - t0) / ms) : 1; f(u); if (u < 1) requestAnimationFrame(st); else ok(); })(t0); });
  const bendTo = (c, R, ms) => { const m = BOMB_WTM; if (!m) return Promise.resolve(); const c0 = wtmCurl ?? m.userData.curl, R0 = wtmCurlT ?? .5; return tween(ms, u => { const e = u * u; wtmCurl = c0 + (c - c0) * e; wtmCurlT = R0 + (R - R0) * e; m.userData.bend(wtmCurl, wtmCurlT); }); };
  async function sheetOpenFrom(src) { if (sheetOpen || sheetBusy) return; sheetBusy = true; sheetOpen = true; sheetFrom = src;
    const P = msOf("--panel"), T = msOf("--toggle"); let r = src === "pole" ? wtmRect() : null;
    if (r) { await bendTo(.05, 1.7, REDUCED ? 0 : 110); r = wtmRect() || r; BOMB_WTM.visible = false; } // the corner comes away first, then the whole sticker
    else { r = cornerRect(); corner.classList.add("off"); }
    const b = sheetBox(); sheet.querySelectorAll(".paper").forEach(e => e.style.backgroundImage = sheetPaper()); sheet.querySelector(".cover").style.backgroundImage = 'url("assets/stickers/writetome.webp")'; // quoted, so the /next build rewrites it like every other picture
    fly.appendChild(mail); sheetLay(b); mail.classList.add("on"); mail.style.opacity = 0; mail.inert = false; sheet.classList.add("on"); dim.classList.add("on");
    flyBot.style.transform = FOLD; sTabs.forEach(t => t.tabIndex = -1);
    dim.animate([{ opacity: 0 }, { opacity: 1 }], { duration: P + T, fill: "forwards" });
    await fly.animate([{ transform: flyAt(r, b, -180, -3) }, { transform: flyAt(null, b) }], { duration: P, easing: EASE, fill: "forwards" }).finished; // off the pole, turning over on the way: the blank back of the paper
    await flyBot.animate([{ transform: FOLD }, { transform: FLAT }], { duration: T, easing: EASE, fill: "forwards" }).finished; // the folded half opens down
    mail.animate([{ opacity: 0 }, { opacity: 1 }], { duration: T / 2, fill: "forwards" }); mail.style.opacity = "";
    sheet.classList.add("open"); sTabs.forEach(t => t.tabIndex = 0); sheetBusy = false;
    (TOUCH ? fly : mail.querySelector("input") || flyX).focus({ preventScroll: true }); } // a touch screen: the flyer itself, so the keyboard opens only when a field is tapped (S23 11-23: it covered the form)
  async function sheetClose() { if (!sheetOpen || sheetBusy) return; sheetBusy = true; sheet.classList.remove("open");
    const P = msOf("--panel"), T = msOf("--toggle"), b = sheetBox(), back = sheetFrom === "pole" && BOMB_WTM ? (BOMB_WTM.visible = true, wtmRect()) : null; if (back) BOMB_WTM.visible = false; // folds back onto the pole when it is in view, else into the corner
    const r = back || cornerRect(); mail.animate([{ opacity: 1 }, { opacity: 0 }], { duration: T / 2, fill: "forwards" });
    dim.animate([{ opacity: 1 }, { opacity: 0 }], { duration: P + T, fill: "forwards" });
    await flyBot.animate([{ transform: FLAT }, { transform: FOLD }], { duration: T, easing: EASE, fill: "forwards" }).finished; // folded again
    await fly.animate([{ transform: flyAt(null, b) }, { transform: flyAt(r, b, -180, -3) }], { duration: P, easing: EASE, fill: "forwards" }).finished; // and back where it came from
    if (sheetSent) { bombTick(); corner.classList.add("sent"); }
    if (BOMB_WTM) BOMB_WTM.visible = true; if (back && BOMB_WTM) { bendTo(BOMB_WTM.userData.curl, .5, REDUCED ? 0 : 160); } // stuck down again
    corner.classList.remove("off"); sheet.classList.remove("on"); dim.classList.remove("on"); fly.getAnimations().forEach(a => a.cancel()); mail.getAnimations().forEach(a => a.cancel());
    mailHome.appendChild(mail); mail.style.cssText = ""; mail.classList.remove("on"); mail.inert = true; sheetOpen = sheetBusy = false; (back ? bombHot : corner).focus({ preventScroll: true }); }
  function bombTick() { const m = BOMB_WTM, img = m && m.material.map && m.material.map.image; if (!img || m.userData.ticked) return; m.userData.ticked = true; // a small tick on the sticker: sent
    const c = Object.assign(document.createElement("canvas"), { width: img.width, height: img.height }), g = c.getContext("2d"), r = c.height * .2, cx = c.width - r * 1.25, cy = r * 1.25; g.drawImage(img, 0, 0);
    g.fillStyle = tok("--front-spray"); g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill(); g.strokeStyle = tok("--look-dark"); g.lineWidth = r * .3; g.lineCap = g.lineJoin = "round";
    g.beginPath(); g.moveTo(cx - r * .45, cy); g.lineTo(cx - r * .1, cy + r * .38); g.lineTo(cx + r * .48, cy - r * .35); g.stroke();
    const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = maxAniso; m.material.map = t; m.material.needsUpdate = true; }
  bombHot.addEventListener("click", () => sheetOpenFrom("pole")); corner.addEventListener("click", () => sheetOpenFrom("corner"));
  bombHot.addEventListener("pointerenter", () => { bombHot.dataset.hover = 1; }); bombHot.addEventListener("pointerleave", () => { delete bombHot.dataset.hover; });
  dim.addEventListener("click", sheetClose); flyX.addEventListener("click", sheetClose); addEventListener("keydown", e => { if (e.key === "Escape" && sheetOpen) sheetClose(); });
  addEventListener("resize", () => { if (sheetOpen && !sheetBusy) { const b = sheetBox(); sheetLay(b); fly.getAnimations().forEach(a => a.cancel()); fly.style.transform = flyAt(null, b); } });
  function bombPlace() { // the tap area over the sticker on the pole (when it is big enough to aim at), its lifted corner on hover, and the corner sticker
    const r = !sheetOpen && !pick.mode ? wtmRect() : null, big = r && r.w >= 16;
    if (big) { const w = Math.max(48, r.w), h = Math.max(48, r.h); Object.assign(bombHot.style, { display: "block", left: r.l + r.w / 2 - w / 2 + "px", top: r.t + r.h / 2 - h / 2 + "px", width: w + "px", height: h + "px" }); }
    else { bombHot.style.display = "none"; delete bombHot.dataset.hover; }
    if (!sheetOpen && BOMB_WTM) { const want = bombHot.dataset.hover || bombHot.matches(":focus-visible") ? .035 : BOMB_WTM.userData.curl; if (wtmCurl == null) wtmCurl = BOMB_WTM.userData.curl;
      if (Math.abs(want - wtmCurl) > .0005) { wtmCurl += (want - wtmCurl) * (REDUCED ? 1 : .25); wtmCurlT = .5 + (wtmCurl - BOMB_WTM.userData.curl) * 4; BOMB_WTM.userData.bend(wtmCurl, wtmCurlT); } }
    corner.classList.toggle("off", sheetOpen || pick.mode || !introOver); corner.inert = sheetOpen || pick.mode || !introOver; }
  const endS = { day: false, show: false }; let eOp = 0, eLast = 0, eFog = false;
  let endReady = false;
  const DAY_CX = (POST.x - .8 + MURALS.wide.w / 2 + 1.2) / 2; // the morning's laptop view: from the sticker pole to the can past the mural's right end (no flyer, Tom 11-23)
  const endWide = () => [V(DAY_CX + .15, 2, 21.8), V(DAY_CX + .15, 1.9, 20.5), V(DAY_CX + .15, 1.3, 0)]; // the landing, a third wider (Tom 11-23): the tags round the mural and the flyer are in view
  function endWallState(now, show) { const dt = Math.min(.1, (now - eLast) / 1000); eLast = now;
    eOp = show ? 1 : Math.max(0, eOp - dt / .7 * (REDUCED ? 99 : 1)); for (const m of [eWall, eFloor]) m.visible = false; // the flyer is not on the wall any more (Tom 11-23): the sticker on the pole holds it
    if (show && !pick.mode) { scene.fog.density = .012; eFog = true; } else if (!show && eFog && !pick.mode) { scene.fog.density = .04; eFog = false; } // the painting is 16 m away: the haze of the opening would wash it out
    endS.show = show; }

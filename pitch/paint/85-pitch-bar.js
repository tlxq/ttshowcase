  // ---- PITCH (11-26, not for master): the progress bar and the cursor, Tom picks one. ?bar=A|B|C, ?cur=1|2.
  // The walk's three areas (Tom 11-26): Side projects (epaRadar, raddavarfruberga), Toolbox (Self-hosted, ttoolbox, dot, tthermal), Client work (EDGE).
  { const Q = new URLSearchParams(location.search), BAR = (Q.get("bar") || "").toUpperCase(), CUR = Q.get("cur") || "";
    const AREAS = [["Side projects", 0, 128], ["Toolbox", 590, 700], ["Client work", 990, 1045]]; // name, where the area starts (sv), its first stop
    const RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const where = () => { const max = document.documentElement.scrollHeight - innerHeight, park = upPx(); if (max <= park) return { f: 0, area: 0, at: [] };
      const fOf = sv => (svY(sv) - park) / (max - park), f = scrollY < park ? 0 : cl((scrollY - park) / (max - park), 0, 1), at = AREAS.map(a => fOf(a[1]));
      let area = 0; at.forEach((s, i) => { if (f >= s - .002) area = i; }); return { f, area, at }; };
    if ("ABC".includes(BAR) && BAR) {
      document.querySelectorAll(".prog").forEach(e => e.style.display = "none"); const css = document.createElement("style"); document.head.append(css);
      const bar = document.createElement("nav"); bar.className = "pbar pbar" + BAR; bar.setAttribute("aria-label", "Where you are in the walk"); document.body.append(bar);
      css.textContent = `
.pbar { position: fixed; z-index: 7; font-family: "Inter", system-ui, sans-serif; color: var(--look-soft); }
.pbarA { left: 50%; top: 14px; transform: translateX(-50%); width: min(720px, calc(100vw - 32px)); height: 64px; background: var(--look-plate); border: 1px solid var(--look-plate-edge); border-radius: 32px; }
.pbarA .ln { position: absolute; left: 44px; right: 44px; top: 22px; height: 4px; border-radius: 2px; background: var(--look-dark-quiet); }
.pbarA .ln b { position: absolute; left: 0; top: 0; bottom: 0; border-radius: 2px; background: var(--front-spray); }
.pbarA button { position: absolute; top: 6px; transform: translateX(-50%); display: grid; justify-items: center; gap: 6px; min-width: 48px; min-height: 52px; padding: 0 4px; background: none; border: 0; color: inherit; font: 500 13px/1.1 "Inter", system-ui, sans-serif; cursor: pointer; white-space: nowrap; }
.pbarA button i { width: 18px; height: 18px; border-radius: 50%; background: var(--look-dark); border: 3px solid var(--look-dark-quiet); box-sizing: border-box; transition: border-color 200ms var(--ease), background 200ms var(--ease); }
.pbarA button.done i { border-color: var(--front-spray); }
.pbarA button.on { color: var(--look-text); font-weight: 700; }
.pbarA button.on i { border-color: var(--front-spray); background: var(--front-spray); box-shadow: 0 0 0 5px color-mix(in srgb, var(--front-spray) 30%, transparent); }
.pbarB { left: 0; right: 0; top: 0; height: 74px; pointer-events: none; }
.pbarB canvas { position: absolute; left: 0; top: 0; width: 100%; height: 100%; }
.pbarB span { position: absolute; top: 30px; transform: translateX(-2px); font: 22px/1 "Saira Stencil One", sans-serif; color: var(--look-soft); opacity: .55; white-space: nowrap; transition: opacity 300ms var(--ease), color 300ms var(--ease); }
.pbarB span.on { opacity: 1; color: var(--look-text); }
.pbarC { left: 16px; bottom: 16px; display: flex; align-items: flex-end; gap: 12px; padding: 10px 16px 10px 12px; background: var(--look-plate); border: 1px solid var(--look-plate-edge); border-radius: 3px; pointer-events: none; }
.pbarC svg { width: 44px; height: 64px; flex: none; }
.pbarC p { margin: 0; display: grid; gap: 4px; }
.pbarC strong { font: 26px/1 "Saira Stencil One", sans-serif; color: var(--look-text); font-weight: 400; }
.pbarC small { font: 500 13px/1.2 "Inter", system-ui, sans-serif; color: var(--look-soft); }
@media (max-aspect-ratio: 4/5) { .pbarA { height: 60px; top: 10px; } .pbarA button { font-size: 12px; } .pbarB span { font-size: 17px; top: 26px; } .pbarB { height: 64px; } .pbarC strong { font-size: 22px; } .pbarC { top: 12px; bottom: auto; } }`;
      let draw = () => {};
      if (BAR === "A") { bar.innerHTML = '<div class="ln"><b></b></div>'; const fill = bar.querySelector("b"), btns = AREAS.map(([n, , stop]) => { const b = document.createElement("button"); b.type = "button"; b.innerHTML = "<i></i>"; b.append(n); b.addEventListener("click", () => scrollTo({ top: svY(stop), behavior: RM ? "auto" : "smooth" })); bar.append(b); return b; });
        draw = () => { const { f, area } = where(), ln = bar.querySelector(".ln"), L = ln.offsetLeft, W = ln.offsetWidth, n = AREAS.length; fill.style.width = (f * 100).toFixed(2) + "%";
          btns.forEach((b, i) => { b.style.left = (L + W * i / (n - 1)) + "px"; b.classList.toggle("on", i === area); b.classList.toggle("done", i < area); if (i === area) b.setAttribute("aria-current", "step"); else b.removeAttribute("aria-current"); }); }; }
      if (BAR === "B") { const c = document.createElement("canvas"); bar.append(c); const spans = AREAS.map(([n]) => { const s = document.createElement("span"); s.textContent = n; bar.append(s); return s; });
        let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647; let edge = [];
        draw = () => { const { f, area, at } = where(), W = innerWidth, H = bar.offsetHeight, dpr = Math.min(2, devicePixelRatio || 1); if (c.width !== Math.round(W * dpr)) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); seed = 7; edge = Array.from({ length: Math.ceil(W / 6) + 2 }, () => rnd()); }
          const g = c.getContext("2d"); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H); g.translate(0, H); g.scale(1, -1); const x = f * W, top = H - 20, col = getComputedStyle(document.documentElement).getPropertyValue("--front-spray").trim();
          g.fillStyle = "rgba(10,10,10,.55)"; g.fillRect(0, top, W, 20); g.fillStyle = col; g.beginPath(); g.moveTo(0, H); for (let i = 0; i * 6 <= x; i++) g.lineTo(i * 6, top + 3 + edge[i] * 5); g.lineTo(x, top + 6); g.lineTo(x, H); g.closePath(); g.fill();
          seed = 11; for (let i = 0; i < x / 3; i++) { const px = rnd() * x, py = top - 2 - rnd() * 8; g.globalAlpha = .25 + rnd() * .5; g.fillRect(px, py, 1.4, 1.4); } g.globalAlpha = 1; // overspray above the stripe
          spans.forEach((s, i) => { s.style.left = Math.min(W - s.offsetWidth - 16, Math.max(16, at[i] * W + 8)) + "px"; s.classList.toggle("on", i === area); }); }; }
      if (BAR === "C") { bar.innerHTML = '<svg viewBox="0 0 44 64" aria-hidden="true"><rect x="16" y="2" width="12" height="7" rx="2" fill="var(--look-soft)"/><rect x="5" y="10" width="34" height="52" rx="7" fill="var(--look-dark-quiet)" stroke="var(--look-soft)" stroke-width="2"/><clipPath id="pcClip"><rect x="7" y="12" width="30" height="48" rx="5"/></clipPath><rect id="pcPaint" clip-path="url(#pcClip)" x="7" y="12" width="30" height="48" fill="var(--front-spray)"/><rect x="5" y="28" width="34" height="8" fill="var(--look-cream)" opacity=".85"/></svg><p><strong></strong><small></small></p>';
        const paint = bar.querySelector("#pcPaint"), name = bar.querySelector("strong"), sub = bar.querySelector("small"), COUNT = [2, 4, 1];
        draw = () => { const { f, area } = where(), h = 48 * (1 - f) + 2; paint.setAttribute("y", (60 - h).toFixed(1)); paint.setAttribute("height", h.toFixed(1)); if (name.textContent !== AREAS[area][0]) { name.textContent = AREAS[area][0]; sub.textContent = `${area + 1} of 3 · ${COUNT[area]} ${COUNT[area] === 1 ? "wall" : "walls"}`; } }; }
      addEventListener("scroll", () => draw(), { passive: true }); addEventListener("resize", () => draw()); requestAnimationFrame(function t() { draw(); if (!document.hidden) setTimeout(() => requestAnimationFrame(t), 500); });
      window.barTest = () => ({ bar: BAR, ...where() }); }
    if ((CUR === "1" || CUR === "2") && matchMedia("(pointer: fine)").matches) { // a laptop's mouse only: phones have no cursor
      const css = document.createElement("style"); document.head.append(css); css.textContent = `html.pcur, html.pcur * { cursor: none !important; }
.pc { position: fixed; left: 0; top: 0; z-index: 50; pointer-events: none; will-change: transform; }
.pc svg { display: block; overflow: visible; } .pcmist { position: fixed; inset: 0; z-index: 49; pointer-events: none; }`;
      document.documentElement.classList.add("pcur"); const el = document.createElement("div"); el.className = "pc"; document.body.append(el);
      const NOZZLE = '<svg width="34" height="34" viewBox="-4 -4 34 34"><path d="M2 2 L10 6 L8 8 Z" fill="var(--look-cream)"/><rect x="8" y="5" width="9" height="7" rx="2" transform="rotate(35 12 8)" fill="var(--look-soft)" stroke="#111" stroke-width="1.2"/><rect x="11" y="10" width="14" height="20" rx="4" transform="rotate(35 18 20)" fill="var(--front-spray)" stroke="#111" stroke-width="1.4"/></svg>';
      const CAP = '<svg width="30" height="30" viewBox="-15 -15 30 30"><circle r="9" fill="var(--look-dark)" stroke="var(--look-cream)" stroke-width="2.5"/><circle r="3.2" fill="var(--front-spray)"/></svg>';
      const HAND = '<svg width="30" height="34" viewBox="-6 -2 30 34"><path d="M6 14 V4 a2.6 2.6 0 0 1 5.2 0 V12 l1-.2 a2.4 2.4 0 0 1 4.6.6 v.6 a2.4 2.4 0 0 1 4.4 1 v1 a2.4 2.4 0 0 1 4.4 1.2 V22 c0 5-3.6 8-8.4 8 h-2.6 c-3 0-5-1.4-6.6-4 L2.2 20 a2.4 2.4 0 0 1 3.8-2.8 Z" fill="var(--look-cream)" stroke="#111" stroke-width="1.6" stroke-linejoin="round"/></svg>';
      let mist = null, mg = null, dots = []; if (CUR === "1" && !RM) { mist = document.createElement("canvas"); mist.className = "pcmist"; document.body.append(mist); mg = mist.getContext("2d"); }
      let x = -99, y = -99, over = false, shape = "";
      const hotAt = t => !!(t && t.closest && t.closest("a, button, [role=button], .hot, .stk, input, textarea, label")) || document.body.style.cursor === "pointer";
      const set = s => { if (shape === s) return; shape = s; el.innerHTML = s === "hand" ? HAND : s === "cap" ? CAP : NOZZLE; };
      addEventListener("pointermove", e => { if (e.pointerType !== "mouse") return; x = e.clientX; y = e.clientY; over = hotAt(e.target) || [...document.querySelectorAll(".hot")].some(h => getComputedStyle(h).display !== "none" && (() => { const r = h.getBoundingClientRect(); return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom; })());
        if (CUR === "1") { set("nozzle"); el.style.transform = `translate(${x - 2}px, ${y - 2}px) scale(${over ? 1.15 : 1})`; if (mg) for (let i = 0; i < (over ? 5 : 2); i++) dots.push({ x: x + (Math.random() - .5) * 10, y: y + (Math.random() - .5) * 10, a: .55, r: .8 + Math.random() * 1.6 }); }
        else { set(over ? "hand" : "cap"); el.style.transform = over ? `translate(${x - 8}px, ${y - 2}px)` : `translate(${x - 15}px, ${y - 15}px)`; } }, { passive: true });
      if (mg) requestAnimationFrame(function t() { const dpr = Math.min(2, devicePixelRatio || 1); if (mist.width !== Math.round(innerWidth * dpr)) { mist.width = Math.round(innerWidth * dpr); mist.height = Math.round(innerHeight * dpr); }
        mg.setTransform(dpr, 0, 0, dpr, 0, 0); mg.clearRect(0, 0, innerWidth, innerHeight); const col = getComputedStyle(document.documentElement).getPropertyValue("--front-spray").trim(); mg.fillStyle = col;
        dots = dots.filter(d => (d.a -= .025) > 0).slice(-160); for (const d of dots) { mg.globalAlpha = d.a; mg.beginPath(); mg.arc(d.x, d.y, d.r, 0, 6.3); mg.fill(); } mg.globalAlpha = 1; requestAnimationFrame(t); });
      set(CUR === "1" ? "nozzle" : "cap"); window.curTest = () => ({ cur: CUR, shape, over }); }
  }

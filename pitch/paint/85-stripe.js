  // ---- The progress stripe (Tom 11-26, pick B; it replaced the 3px line and its blue dash): a sprayed stripe along the top of the screen that fills as you
  // walk, with the area's name stencilled under it. The walk's three areas (Tom 11-26): Side projects (epaRadar, raddavarfruberga), Toolbox (Self-hosted,
  // ttoolbox, dot, tthermal), Client work (EDGE). Its sizes and colours are tokens (--look-stripe*); a screen reader hears the area as the bar's value text.
  const STRIPE_AREAS = [["Side projects", 0, 128], ["Toolbox", 590, 700], ["Client work", 990, 1045]]; // name, where the area starts (sv), its first stop
  const stripeNav = document.createElement("nav"); stripeNav.className = "stripe"; stripeNav.setAttribute("role", "progressbar"); stripeNav.setAttribute("aria-label", "Where you are in the walk");
  stripeNav.setAttribute("aria-valuemin", "0"); stripeNav.setAttribute("aria-valuemax", "100"); document.body.append(stripeNav);
  const stripeCanvas = document.createElement("canvas"); stripeCanvas.setAttribute("aria-hidden", "true"); stripeNav.append(stripeCanvas);
  const stripeNames = STRIPE_AREAS.map(([n]) => { const s = document.createElement("span"); s.setAttribute("aria-hidden", "true"); s.textContent = n; stripeNav.append(s); return s; });
  let stripeSeed = 7, stripeEdge = [], stripeLast = "";
  const stripeTok = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const stripeWhere = () => { const max = document.documentElement.scrollHeight - innerHeight, park = upPx(); if (max <= park) return { f: 0, area: 0, at: STRIPE_AREAS.map(() => 0) };
    const fOf = sv => (svY(sv) - park) / (max - park), f = scrollY < park ? 0 : cl((scrollY - park) / (max - park), 0, 1), at = STRIPE_AREAS.map(a => fOf(a[1]));
    let area = 0; at.forEach((s, i) => { if (f >= s - .002) area = i; }); return { f, area, at }; };
  function stripePlace() { const { f, area, at } = stripeWhere(), W = innerWidth, H = stripeNav.offsetHeight, dpr = Math.min(2, devicePixelRatio || 1), c = stripeCanvas;
    if (c.width !== Math.round(W * dpr) || c.height !== Math.round(H * dpr)) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); stripeSeed = 7; stripeEdge = Array.from({ length: Math.ceil(W / 6) + 2 }, () => (stripeSeed = (stripeSeed * 16807) % 2147483647) / 2147483647); stripeLast = ""; }
    const key = [f.toFixed(4), W, H, area].join(); if (key === stripeLast) return; stripeLast = key;
    const g = c.getContext("2d"), x = f * W, band = 20; g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
    g.fillStyle = stripeTok("--look-stripe-band"); g.fillRect(0, 0, W, band); g.fillStyle = stripeTok("--look-stripe-edge");
    g.beginPath(); g.moveTo(0, 0); for (let i = 0; i * 6 <= x; i++) g.lineTo(i * 6, band - 3 - stripeEdge[i] * 5); g.lineTo(x, band - 6); g.lineTo(x, 0); g.closePath(); g.fill();
    let s = 11; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647; // the overspray under the stripe: the same dots every frame
    for (let i = 0; i < x / 3; i++) { const px = rnd() * x, py = band + 2 + rnd() * 8; g.globalAlpha = .25 + rnd() * .5; g.fillRect(px, py, 1.4, 1.4); } g.globalAlpha = 1;
    const gap = parseFloat(stripeTok("--look-stripe-gap")) || 14;
    stripeNames.forEach((n, i) => { n.style.left = Math.min(W - n.offsetWidth - gap, Math.max(gap, at[i] * W + 8)) + "px"; n.classList.toggle("on", i === area); });
    stripeNav.setAttribute("aria-valuenow", String(Math.round(f * 100))); stripeNav.setAttribute("aria-valuetext", STRIPE_AREAS[area][0]); window.stripeTest = () => ({ f, area, name: STRIPE_AREAS[area][0] }); }

"use client";

import { useEffect, useRef, useState } from "react";
import { TIP } from "./Motion";

/** How fast the drawn line catches up with the tip, per second. */
const FOLLOW = 5;
/** How round the line's corners are, in pixels. */
const ROUND = 40;
/** How far under the letters' line the line runs, in pixels. */
const UNDER_GAP = 22;
/** A loop round one of Tom's tools: how far out it goes and how tall it is, in pixels. */
const LOOP_OUT = 120;
const LOOP_HALF = 30;

const f = (n: number) => n.toFixed(1);

/**
 * The line's route, kept both as one path (to measure along) and as its pieces, each its own path
 * starting where the last ended. Drawn as pieces, only the piece at the pen's tip changes while the
 * page scrolls, so a phone repaints that small piece instead of the whole page-tall line.
 */
class Route {
  d = "";
  pieces: string[] = [];
  private x = 0;
  private y = 0;
  M(x: number, y: number) {
    this.d += `M${f(x)} ${f(y)}`;
    this.x = x;
    this.y = y;
  }
  private piece(cmd: string, x: number, y: number) {
    // A straight piece that goes nowhere is left out: its round cap would paint a dot.
    if (!/^[CQ]/.test(cmd) && f(x) === f(this.x) && f(y) === f(this.y)) return;
    this.d += cmd;
    this.pieces.push(`M${f(this.x)} ${f(this.y)}${cmd}`);
    this.x = x;
    this.y = y;
  }
  C(x1: number, y1: number, x2: number, y2: number, x: number, y: number) {
    this.piece(`C${f(x1)} ${f(y1)} ${f(x2)} ${f(y2)} ${f(x)} ${f(y)}`, x, y);
  }
  Q(cx: number, cy: number, x: number, y: number) {
    this.piece(`Q${f(cx)} ${f(cy)} ${f(x)} ${f(y)}`, x, y);
  }
  L(x: number, y: number) {
    this.piece(`L${f(x)} ${f(y)}`, x, y);
  }
  V(y: number) {
    this.piece(`V${f(y)}`, this.x, y);
  }
  H(x: number) {
    this.piece(`H${f(x)}`, x, this.y);
  }
}

/**
 * The one line through the page. It carries on from the end of the tag's swash, bends round and
 * runs down the right side, then under the tlxq letters to the left side and down on. It draws
 * itself as the page scrolls, never further than the pen's tip, once the tag has been written.
 * Its route is worked out from where things really are, again whenever the page changes size.
 */
export function LookLine() {
  const svg = useRef<SVGSVGElement>(null);
  const [route, setRoute] = useState<Route | null>(null);
  // How far the line is drawn and when it may start, kept when the route is worked out again, so
  // a resize carries on from where the line was instead of drawing it from the top.
  const drawnSoFar = useRef(0);
  const startsAt = useRef(0);

  useEffect(() => {
    const host = svg.current?.parentElement;
    if (!host) return;
    const place = () => {
      const area = host.getBoundingClientRect();
      const tag = host.querySelector<SVGSVGElement>(".lk-tag");
      const under = host.querySelector<HTMLElement>("[data-line-under]");
      if (!tag) return;
      const t = tag.getBoundingClientRect();
      const x = t.left - area.left + Number(tag.dataset.endX) * t.width;
      const y = t.top - area.top + Number(tag.dataset.endY) * t.height;
      const angle = Number(tag.dataset.endAngle);
      const hero = host.querySelector<HTMLElement>(".lk-hero");
      const side = hero ? parseFloat(getComputedStyle(hero).paddingRight) || 16 : 16;
      const right = area.width - side;
      const reach = Math.max(12, (right - x) * 0.6);
      const turn = Math.max(24, Math.min(80, right - x));
      const path = new Route();
      path.M(x, y);
      path.C(
        x + Math.cos(angle) * reach,
        y + Math.sin(angle) * reach,
        right,
        y - turn * 0.2,
        right,
        y + turn,
      );
      if (under) {
        // Under the letters: round into a run to the left side, then round down again.
        const u =
          under.getBoundingClientRect().bottom -
          parseFloat(getComputedStyle(under).paddingBottom) -
          area.top +
          UNDER_GAP;
        path.V(u - ROUND);
        path.Q(right, u, right - ROUND, u);
        path.H(side + ROUND);
        path.Q(side, u, side, u + ROUND);
      }
      // Where the line is across the page as it goes on down.
      let atX = right;
      const stack = host.querySelector<HTMLElement>("[data-line-stack]");
      if (stack) {
        // Into the Tom part: across to the tools, then a loop out round each one (daksh).
        const box = stack.getBoundingClientRect();
        const lx = box.left - area.left;
        atX = lx;
        const loops = [...stack.querySelectorAll<HTMLElement>("[data-line-loop]")].map((li) => {
          const b = li.getBoundingClientRect();
          return b.top - area.top + b.height / 2;
        });
        // Each loop takes four of its half heights; close tools get smaller loops, never touching.
        const apart = Math.min(...loops.slice(1).map((y, i) => y - loops[i]!), Infinity);
        const r = Math.max(10, Math.min(LOOP_HALF, apart / 4 - 3));
        const across = (loops[0] ?? box.top - area.top) - 3 * r - ROUND * 2;
        const dir = lx < right ? -1 : 1;
        path.V(across - ROUND);
        path.Q(right, across, right + dir * ROUND, across);
        path.H(lx - dir * ROUND);
        path.Q(lx, across, lx, across + ROUND);
        for (const y of loops) {
          path.V(y - 2 * r);
          path.Q(lx, y - r, lx + r, y - r);
          path.H(lx + LOOP_OUT - r);
          path.Q(lx + LOOP_OUT, y - r, lx + LOOP_OUT, y);
          path.Q(lx + LOOP_OUT, y + r, lx + LOOP_OUT - r, y + r);
          path.H(lx + r);
          path.Q(lx, y + r, lx, y + 2 * r);
        }
      }
      const live = host.querySelector<HTMLElement>("[data-line-right]");
      if (live && Math.abs(right - atX) >= ROUND * 2) {
        // Into the Live part: across its empty top to the right side, and down it clear of the names.
        const b = live.getBoundingClientRect();
        const ty = b.top - area.top + parseFloat(getComputedStyle(live).paddingTop) / 2;
        const dir = right < atX ? -1 : 1;
        path.V(ty - ROUND);
        path.Q(atX, ty, atX + dir * ROUND, ty);
        path.H(right - dir * ROUND);
        path.Q(right, ty, right, ty + ROUND);
        atX = right;
      }
      const sign = host.querySelector<SVGSVGElement>("[data-line-end]");
      if (sign) {
        // The end: over to where Tom's signature starts, and down into it; the signature runs on.
        const b = sign.getBoundingClientRect();
        const sx = b.left - area.left + Number(sign.dataset.startX) * b.width;
        const sy = b.top - area.top + Number(sign.dataset.startY) * b.height;
        const ty = b.top - area.top - ROUND;
        if (Math.abs(sx - atX) < ROUND * 2) {
          path.V(ty);
          path.L(sx, sy);
        } else {
          const dir = sx < atX ? -1 : 1;
          path.V(ty - ROUND);
          path.Q(atX, ty, atX + dir * ROUND, ty);
          path.H(sx - dir * ROUND);
          path.Q(sx, ty, sx, ty + ROUND);
          path.V(sy);
        }
      } else path.V(area.height);
      setRoute((was) => (was?.d === path.d ? was : path));
    };
    place();
    const watch = new ResizeObserver(place);
    watch.observe(host);
    document.fonts.ready.then(place);
    return () => watch.disconnect();
  }, []);

  // Draw it down to the pen's tip, easing after the scroll. Each piece shows how much of it is
  // drawn; only a piece whose share changes is touched, so finished pieces are never repainted.
  useEffect(() => {
    const root = svg.current;
    const whole = root?.querySelector<SVGPathElement>(".lk-path");
    if (!root || !whole || !route) return;
    const total = whole.getTotalLength();
    // Each piece: where along the line it starts, how long it is, its ink and haze, what it shows.
    // And how far along the line each 8 px reaches, and how low it is there: measured on the pieces,
    // each one curve long, because measuring along the whole line walks all of it at every point.
    const table: { at: number; y: number }[] = [];
    let from = 0;
    const hazes = [...root.querySelectorAll<SVGPathElement>(".lk-haze")];
    const pieces = [...root.querySelectorAll<SVGPathElement>(".lk-ink")].map((ink, i) => {
      const paths = [ink, hazes[i]].filter((p): p is SVGPathElement => !!p);
      const long = Math.max(0.01, ink.getTotalLength());
      for (let at = Math.ceil(from / 8) * 8; at < from + long; at += 8)
        table.push({ at, y: ink.getPointAtLength(at - from).y });
      const piece = { from, long, paths, shown: "" };
      from += long;
      return piece;
    });
    table.push({ at: total, y: whole.getPointAtLength(total).y });
    const host = root.parentElement!;
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    // It starts once the tag is written.
    if (!startsAt.current)
      startsAt.current = still
        ? 1
        : performance.now() +
          (parseFloat(getComputedStyle(host).getPropertyValue("--look-tag-at")) || 0) +
          Number(host.dataset.written ?? 0);
    let drawn = still ? total : Math.min(total, drawnSoFar.current);
    let last = performance.now();
    let frame = 0;
    let told = "";
    // The loop rests once the line has caught up with the tip; a scroll or resize starts it again.
    const tick = (now: number) => {
      const tip = window.scrollY + window.innerHeight * TIP - host.offsetTop;
      const reached = table.find((p) => p.y > tip)?.at ?? total;
      // Without motion the line is simply there, whole.
      const waiting = now < startsAt.current;
      const target = still ? total : waiting ? 0 : reached;
      const step = Math.max(0, Math.min(0.1, (now - last) / 1000));
      last = now;
      drawn = still ? target : drawn + (target - drawn) * (1 - Math.exp(-FOLLOW * step));
      if (Math.abs(target - drawn) < 0.5) drawn = target;
      drawnSoFar.current = drawn;
      for (const p of pieces) {
        const share = Math.min(1, Math.max(0, (drawn - p.from) / p.long));
        const offset = (1 - share).toFixed(4);
        if (offset === p.shown) continue;
        p.shown = offset;
        for (const path of p.paths) path.style.strokeDashoffset = offset;
      }
      // For the walks: how much of the whole line is drawn.
      const share = (drawn / total).toFixed(3);
      if (share !== told) root.dataset.drawn = told = share;
      frame = waiting || drawn !== target ? requestAnimationFrame(tick) : 0;
    };
    const wake = () => {
      if (frame) return;
      last = performance.now();
      frame = requestAnimationFrame(tick);
    };
    addEventListener("scroll", wake, { passive: true });
    addEventListener("resize", wake);
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      removeEventListener("scroll", wake);
      removeEventListener("resize", wake);
    };
  }, [route]);

  return (
    <svg ref={svg} className="lk-line" aria-hidden="true">
      {route && (
        <>
          <path className="lk-path" d={route.d} />
          {/* The haze's see-through is on its group, so where two pieces meet it isn't doubled */}
          <g className="lk-hazes">
            {route.pieces.map((piece, i) => (
              <path key={i} className="lk-haze" d={piece} pathLength={1} />
            ))}
          </g>
          {route.pieces.map((piece, i) => (
            <path key={i} className="lk-ink" d={piece} pathLength={1} />
          ))}
        </>
      )}
    </svg>
  );
}

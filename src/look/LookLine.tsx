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
 * The one line through the page. It carries on from the end of the tag's swash, bends round and
 * runs down the right side, then under the tlxq letters to the left side and down on. It draws
 * itself as the page scrolls, never further than the pen's tip, once the tag has been written.
 * Its route is worked out from where things really are, again whenever the page changes size.
 */
export function LookLine() {
  const svg = useRef<SVGSVGElement>(null);
  const [d, setD] = useState("");

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
      let path =
        `M${f(x)} ${f(y)}` +
        `C${f(x + Math.cos(angle) * reach)} ${f(y + Math.sin(angle) * reach)}` +
        ` ${f(right)} ${f(y - turn * 0.2)} ${f(right)} ${f(y + turn)}`;
      if (under) {
        // Under the letters: round into a run to the left side, then round down again.
        const u =
          under.getBoundingClientRect().bottom -
          parseFloat(getComputedStyle(under).paddingBottom) -
          area.top +
          UNDER_GAP;
        path +=
          `V${f(u - ROUND)}Q${f(right)} ${f(u)} ${f(right - ROUND)} ${f(u)}` +
          `H${f(side + ROUND)}Q${f(side)} ${f(u)} ${f(side)} ${f(u + ROUND)}`;
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
        path +=
          `V${f(across - ROUND)}Q${f(right)} ${f(across)} ${f(right + dir * ROUND)} ${f(across)}` +
          `H${f(lx - dir * ROUND)}Q${f(lx)} ${f(across)} ${f(lx)} ${f(across + ROUND)}`;
        for (const y of loops) {
          path +=
            `V${f(y - 2 * r)}Q${f(lx)} ${f(y - r)} ${f(lx + r)} ${f(y - r)}` +
            `H${f(lx + LOOP_OUT - r)}Q${f(lx + LOOP_OUT)} ${f(y - r)} ${f(lx + LOOP_OUT)} ${f(y)}` +
            `Q${f(lx + LOOP_OUT)} ${f(y + r)} ${f(lx + LOOP_OUT - r)} ${f(y + r)}` +
            `H${f(lx + r)}Q${f(lx)} ${f(y + r)} ${f(lx)} ${f(y + 2 * r)}`;
        }
      }
      // The Live part's projects keep their screens left of where the line runs down, their words right of it.
      host.style.setProperty("--lk-line-x", `${f(atX)}px`);
      const sign = host.querySelector<SVGSVGElement>("[data-line-end]");
      if (sign) {
        // The end: over to where Tom's signature starts, and down into it; the signature runs on.
        const b = sign.getBoundingClientRect();
        const sx = b.left - area.left + Number(sign.dataset.startX) * b.width;
        const sy = b.top - area.top + Number(sign.dataset.startY) * b.height;
        const ty = b.top - area.top - ROUND;
        if (Math.abs(sx - atX) < ROUND * 2) path += `V${f(ty)}L${f(sx)} ${f(sy)}`;
        else {
          const dir = sx < atX ? -1 : 1;
          path +=
            `V${f(ty - ROUND)}Q${f(atX)} ${f(ty)} ${f(atX + dir * ROUND)} ${f(ty)}` +
            `H${f(sx - dir * ROUND)}Q${f(sx)} ${f(ty)} ${f(sx)} ${f(ty + ROUND)}V${f(sy)}`;
        }
        setD(path);
      } else setD(`${path}V${f(area.height)}`);
    };
    place();
    const watch = new ResizeObserver(place);
    watch.observe(host);
    document.fonts.ready.then(place);
    return () => watch.disconnect();
  }, []);

  // Draw it down to the pen's tip, easing after the scroll.
  useEffect(() => {
    const paths = [...(svg.current?.querySelectorAll<SVGPathElement>("path") ?? [])];
    const ink = paths[0];
    if (!ink || !d) return;
    const total = ink.getTotalLength();
    // How far along the line each 8 px reaches, and how low it is there.
    const table: { at: number; y: number }[] = [];
    for (let at = 0; at <= total; at += 8) table.push({ at, y: ink.getPointAtLength(at).y });
    const host = svg.current!.parentElement!;
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    // It starts once the tag is written.
    const startsAt = still
      ? 0
      : performance.now() +
        (parseFloat(getComputedStyle(host).getPropertyValue("--look-tag-at")) || 0) +
        Number(host.dataset.written ?? 0);
    let drawn = still ? total : 0;
    let last = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const tip = window.scrollY + window.innerHeight * TIP - host.offsetTop;
      const reached = table.find((p) => p.y > tip)?.at ?? total;
      // Without motion the line is simply there, whole.
      const target = still ? total : now < startsAt ? 0 : reached;
      const step = Math.min(0.1, (now - last) / 1000);
      last = now;
      drawn = still ? target : drawn + (target - drawn) * (1 - Math.exp(-FOLLOW * step));
      const offset = (1 - drawn / total).toFixed(5);
      if (ink.style.strokeDashoffset !== offset)
        for (const p of paths) p.style.strokeDashoffset = offset;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [d]);

  return (
    <svg ref={svg} className="lk-line" aria-hidden="true">
      {d && (
        <>
          <path className="lk-ink" d={d} pathLength={1} />
          <path className="lk-haze" d={d} pathLength={1} />
        </>
      )}
    </svg>
  );
}

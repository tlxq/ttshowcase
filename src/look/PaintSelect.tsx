"use client";

import { useEffect } from "react";
import { NIB } from "@/scene/pen";

const SVG = "http://www.w3.org/2000/svg";
/** How far each line's stroke reaches past the words' top and bottom, as shares of the line. */
const TOP = 0.12;
const FOOT = 0.05;
/** How rough the stroke's top and bottom edges are, in pixels, and how often they wobble. */
const ROUGH = 2.4;
const WOBBLE_EVERY = 5;

/** A seeded random, so the same selection is painted the same way every time. */
const seeded = (seed: number) => {
  let s = (Math.abs(Math.floor(seed)) % 2147483646) + 1;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
};

interface Line {
  left: number;
  right: number;
  top: number;
  height: number;
}

/** One line's chisel stroke: its ends slanted at the pen's own angle, rough along the top and foot,
 * reaching past the words so no letter is half on bare ground. */
function strokePath({ left, right, top, height }: Line): { mark: string; pool: string } {
  const random = seeded(left * 7 + top * 13);
  const y0 = top + height * TOP * 0.5;
  const y1 = top + height * (1 - FOOT);
  const slant = (y1 - y0) * Math.tan(-NIB.angle);
  const x0 = left - slant - 3;
  const x1 = right + slant + 3;
  const pts: [number, number][] = [];
  for (let x = x0 + slant; x < x1; x += WOBBLE_EVERY) pts.push([x, y0 + (random() - 0.5) * ROUGH]);
  pts.push([x1, y0]);
  pts.push([x1 - slant, y1]);
  for (let x = x1 - slant - WOBBLE_EVERY; x > x0; x -= WOBBLE_EVERY)
    pts.push([x, y1 + (random() - 0.5) * ROUGH * 1.2]);
  pts.push([x0, y1]);
  const mark = `M${pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join("L")}Z`;
  // Where the pen landed the felt holds more paint.
  const cx = x0 + slant * 0.9;
  const cy = (y0 + y1) / 2;
  const rx = slant * 0.7;
  const ry = (y1 - y0) / 2;
  const pool = `M${(cx - rx).toFixed(1)} ${cy.toFixed(1)}a${rx.toFixed(1)} ${ry.toFixed(1)} 0 1 0 ${(2 * rx).toFixed(1)} 0a${rx.toFixed(1)} ${ry.toFixed(1)} 0 1 0 ${(-2 * rx).toFixed(1)} 0Z`;
  return { mark, pool };
}

/** The nearest box around a piece of text that is not itself inline: the stroke is painted in it,
 * under its words. */
function boxOf(node: Node): HTMLElement | null {
  let el = node.parentElement;
  while (el && getComputedStyle(el).display === "inline") el = el.parentElement;
  return el;
}

/**
 * Selected text on /look is painted over with Tom's chisel marker (Tom picked D 11-14, pitch
 * https://claude.ai/artifact/SoWM1R8BDksT5c7NVYjWcd): each selected line gets one stroke, drawn
 * under the words in the box that holds them. Until this runs, and in text fields, the selection is
 * a flat spray (look.css).
 */
export function PaintSelect() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".lk");
    if (!root || matchMedia("(forced-colors: active)").matches) return;
    root.classList.add("lk-painting");
    let painted: { box: HTMLElement; svg: SVGSVGElement; style: string | null }[] = [];
    let frame = 0;
    // What is painted now, so a repaint that would draw the same thing (the browser also says the
    // selection changed when the stroke goes in) is left alone.
    let key = "";

    const clear = () => {
      for (const p of painted) {
        p.svg.remove();
        if (p.style === null) p.box.removeAttribute("style");
        else p.box.setAttribute("style", p.style);
      }
      painted = [];
    };

    const paint = () => {
      frame = 0;
      const selection = document.getSelection();
      if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
        clear();
        key = "";
        return;
      }
      const byBox = new Map<HTMLElement, DOMRect[]>();
      for (let r = 0; r < selection.rangeCount; r++) {
        const range = selection.getRangeAt(r);
        if (!root.contains(range.commonAncestorContainer)) continue;
        const walker = document.createTreeWalker(
          range.commonAncestorContainer,
          NodeFilter.SHOW_TEXT,
        );
        const texts: Text[] = [];
        if (range.commonAncestorContainer.nodeType === Node.TEXT_NODE)
          texts.push(range.commonAncestorContainer as Text);
        for (let n = walker.nextNode(); n; n = walker.nextNode())
          if (range.intersectsNode(n) && n.textContent?.trim()) texts.push(n as Text);
        for (const text of texts) {
          const box = boxOf(text);
          // Text fields keep the browser's own selection; their flat spray is in look.css.
          if (!box || box.closest("input, textarea, svg")) continue;
          const part = document.createRange();
          part.selectNodeContents(text);
          if (text === range.startContainer) part.setStart(text, range.startOffset);
          if (text === range.endContainer) part.setEnd(text, range.endOffset);
          const rects = [...part.getClientRects()].filter((q) => q.width > 1);
          if (rects.length) byBox.set(box, [...(byBox.get(box) ?? []), ...rects]);
        }
      }
      const next = [...byBox.values()]
        .flat()
        .map((q) => `${Math.round(q.left)},${Math.round(q.top)},${Math.round(q.width)}`)
        .join(" ");
      if (next === key) return;
      key = next;
      clear();
      for (const [box, rects] of byBox) {
        const at = box.getBoundingClientRect();
        const lines: Line[] = [];
        for (const q of rects) {
          const top = q.top - at.top;
          const line = lines.find((l) => Math.abs(l.top - top) < q.height * 0.5);
          if (line) {
            line.left = Math.min(line.left, q.left - at.left);
            line.right = Math.max(line.right, q.right - at.left);
            line.height = Math.max(line.height, q.height);
          } else
            lines.push({ left: q.left - at.left, right: q.right - at.left, top, height: q.height });
        }
        const svg = document.createElementNS(SVG, "svg");
        svg.setAttribute("class", "lk-sel");
        svg.setAttribute("aria-hidden", "true");
        for (const line of lines) {
          const { mark, pool } = strokePath(line);
          for (const [d, cls] of [
            [mark, "lk-sel-mark"],
            [pool, "lk-sel-pool"],
          ] as const) {
            const path = document.createElementNS(SVG, "path");
            path.setAttribute("d", d);
            path.setAttribute("class", cls);
            svg.append(path);
          }
        }
        const style = box.getAttribute("style");
        // The box holds the stroke under its own words: it gets a layer of its own for this.
        if (getComputedStyle(box).position === "static") box.style.position = "relative";
        box.style.isolation = "isolate";
        box.prepend(svg);
        painted.push({ box, svg, style });
      }
    };

    const soon = () => {
      if (!frame) frame = requestAnimationFrame(paint);
    };
    document.addEventListener("selectionchange", soon);
    addEventListener("resize", soon);
    return () => {
      document.removeEventListener("selectionchange", soon);
      removeEventListener("resize", soon);
      cancelAnimationFrame(frame);
      clear();
      root.classList.remove("lk-painting");
    };
  }, []);
  return null;
}

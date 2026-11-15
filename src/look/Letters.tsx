"use client";

import { type CSSProperties, useEffect, useRef } from "react";
import { lookParts } from "@/content/look";

/** How fast the moment catches up with the scroll, per second. Lower feels heavier. */
const FOLLOW = 4;
/** Where in the moment (0 to 1 of the scroll through it) each part happens. */
const ROWS_GO = [0.1, 0.28] as const;
const FLY = { from: 0.12, each: 0.05, runs: 0.32 } as const;
const LEAVE = [0.84, 1] as const;
/** How far a letter turns and comes towards you at the height of its flight. */
const TURN_Y = [-38, 26, -22, 34] as const;
const TURN_X = 22;
const TOWARDS = 260;
/** How far the locked word leans with the pointer, in degrees. */
const LEAN = 7;
/** How much the T grows as the page flies through it, and where its stem is from its middle, as
 * shares of the letter's height (down) and the font size (right). */
const THROUGH = 140;
const STEM = { down: 0.1, right: 0.025 } as const;

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const span = (p: number, [a, b]: readonly [number, number]) => clamp((p - a) / (b - a));

/** Where an element's box is inside `stage`, from layout alone (transforms left out). */
function placeIn(el: HTMLElement, stage: HTMLElement) {
  let x = 0;
  let y = 0;
  let at: HTMLElement | null = el;
  while (at && at !== stage) {
    x += at.offsetLeft;
    y += at.offsetTop;
    at = at.offsetParent as HTMLElement | null;
  }
  return { x, y, w: el.offsetWidth, h: el.offsetHeight };
}

/**
 * What tlxq means, and the moment it becomes the word (Tom 11-13: clear, but it has to blow people's
 * minds). It starts as four rows, a part each, its letter of tlxq in the spray colour. Scrolling on,
 * the rest of the rows fall away and the four letters fly out at you in 3D, turning into windows
 * onto their parts' pictures, lock together into one huge TLXQ that leans with the pointer, and the
 * page flies through the T into the Tom part. Every step follows the scroll, both ways.
 */
export function Letters() {
  const section = useRef<HTMLElement>(null);

  useEffect(() => {
    const host = section.current;
    const stage = host?.querySelector<HTMLElement>(".lk-stage");
    const rows = host?.querySelector<HTMLElement>(".lk-index");
    const word = host?.querySelector<HTMLElement>(".lk-big");
    const flood = host?.querySelector<HTMLElement>(".lk-flood");
    if (!host || !stage || !rows || !word || !flood) return;
    const keys = [...rows.querySelectorAll<HTMLElement>(".lk-key")];
    const bigs = [...word.querySelectorAll<HTMLElement>(".lk-big-letter")];
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      host.classList.add("lk-still");
      return;
    }

    // Each letter's start: where its row's letter is, as a shift and a size from where it ends.
    let starts: { dx: number; dy: number; s: number; cx: number; cy: number }[] = [];
    const measure = () => {
      starts = bigs.map((big, i) => {
        const from = placeIn(keys[i]!, stage);
        const to = placeIn(big, stage);
        const s = from.h / to.h;
        // Measured from their middles: the letters turn about their own middles.
        return {
          dx: from.x + from.w / 2 - (to.x + to.w / 2),
          dy: from.y + from.h / 2 - (to.y + to.h / 2),
          s,
          // How far its middle is from the screen's middle, once locked.
          cx: to.x + to.w / 2 - stage.clientWidth / 2,
          cy: to.y + to.h / 2 - stage.clientHeight / 2,
        };
      });
    };
    measure();
    const watch = new ResizeObserver(measure);
    watch.observe(stage);
    document.fonts.ready.then(measure);

    const pointer = { x: 0.5, y: 0.5, sx: 0.5, sy: 0.5 };
    const onMove = (e: PointerEvent) => {
      pointer.x = e.clientX / window.innerWidth;
      pointer.y = e.clientY / window.innerHeight;
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    let p = 0;
    let last = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const step = Math.min(0.1, (now - last) / 1000);
      last = now;
      const run = host.offsetHeight - window.innerHeight;
      const target = clamp((window.scrollY - host.offsetTop) / Math.max(1, run));
      p += (target - p) * (1 - Math.exp(-FOLLOW * step));
      if (Math.abs(target - p) < 0.0002) p = target;
      pointer.sx += (pointer.x - pointer.sx) * 0.06;
      pointer.sy += (pointer.y - pointer.sy) * 0.06;

      const rowsGo = ease(span(p, ROWS_GO));
      rows.style.opacity = (1 - rowsGo).toFixed(3);
      rows.style.transform = `translateY(${(-rowsGo * 6).toFixed(2)}svh)`;
      // Gone rows can't be clicked or tabbed to.
      rows.style.pointerEvents = rowsGo > 0.5 ? "none" : "";
      rows.inert = rowsGo > 0.5;

      const locked = span(p, [FLY.from + FLY.each * 3 + FLY.runs, LEAVE[0]]);
      const lean = (1 - span(p, LEAVE)) * Math.min(1, locked * 4);
      word.style.transform =
        `rotateX(${(-(pointer.sy - 0.5) * LEAN * lean).toFixed(2)}deg)` +
        ` rotateY(${((pointer.sx - 0.5) * LEAN * 1.4 * lean).toFixed(2)}deg)`;
      word.style.setProperty("--drift", `${(30 + locked * 40).toFixed(1)}%`);
      // Through the T: it grows round its stem until its picture is the whole screen, the other
      // letters fly off, and the screen turns cream, the Tom part's ground.
      const into = Math.pow(span(p, LEAVE), 2.2);
      flood.style.opacity = span(p, [LEAVE[0] + 0.72 * (LEAVE[1] - LEAVE[0]), 0.99]).toFixed(3);

      bigs.forEach((big, i) => {
        const from = starts[i];
        if (!from) return;
        const t = span(p, [FLY.from + FLY.each * i, FLY.from + FLY.each * i + FLY.runs]);
        const e = ease(t);
        const arc = Math.sin(Math.PI * t);
        const s = from.s + (1 - from.s) * e;
        let through = "";
        if (i === 0 && into > 0) {
          const grow = Math.pow(THROUGH, into);
          const font = parseFloat(getComputedStyle(big).fontSize);
          const centre = Math.min(1, into * 3);
          through =
            ` translate(${(-from.cx * centre).toFixed(1)}px, ${(-from.cy * centre).toFixed(1)}px)` +
            ` translate(${(-STEM.right * font * (grow - 1)).toFixed(1)}px, ${(-STEM.down * big.offsetHeight * (grow - 1)).toFixed(1)}px)` +
            ` scale(${grow.toFixed(3)})`;
        } else if (into > 0) {
          const away = Math.min(1, into * 6);
          through = ` translate(${((40 + i * 25) * away).toFixed(1)}vw, ${(i % 2 ? -20 : 20) * away}vh) scale(${(1 + away * 0.3).toFixed(3)})`;
          big.style.opacity = (1 - away).toFixed(3);
        } else big.style.opacity = "";
        big.style.transform =
          `translate3d(${(from.dx * (1 - e)).toFixed(1)}px, ${(from.dy * (1 - e)).toFixed(1)}px, ${(arc * TOWARDS).toFixed(1)}px)` +
          ` rotateY(${(arc * TURN_Y[i]!).toFixed(2)}deg) rotateX(${(arc * TURN_X).toFixed(2)}deg)` +
          ` scale(${s.toFixed(4)})${through}`;
        big.style.setProperty("--window", clamp((t - 0.25) / 0.6).toFixed(3));
      });
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      watch.disconnect();
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  return (
    <section ref={section} className="lk-letters" id="lk-parts" aria-label="The four parts">
      <div className="lk-stage">
        <ol className="lk-index">
          {lookParts.map((part) => (
            <li key={part.id}>
              <a className="lk-row" href={`#${part.id}`}>
                <span className="lk-word">
                  {part.label.slice(0, part.mark)}
                  <span className="lk-key">{part.label[part.mark]}</span>
                  {part.label.slice(part.mark + 1)}
                </span>
                <span className="lk-what">{part.note}</span>
              </a>
            </li>
          ))}
        </ol>
        <div className="lk-big" aria-hidden="true">
          {lookParts.map((part) => (
            <a
              key={part.id}
              className="lk-big-letter"
              href={`#${part.id}`}
              tabIndex={-1}
              style={{ "--photo": `url(${part.photo})` } as CSSProperties}
            >
              <span className="lk-big-paint">{part.label[part.mark]}</span>
              <span className="lk-big-photo">{part.label[part.mark]}</span>
            </a>
          ))}
        </div>
        <div className="lk-flood" aria-hidden="true" />
      </div>
    </section>
  );
}

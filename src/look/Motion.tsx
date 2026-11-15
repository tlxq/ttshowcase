"use client";

import { useEffect } from "react";

/** Where the pen's tip is on the screen, as a share of its height (the same as LookLine's). */
export const TIP = 0.78;
/** How fast each piece catches up with the scroll, per second. */
const FOLLOW = 6;
/** How much scroll, as a share of the screen, a piece of handwriting is written over. */
const WRITE_OVER = 0.35;
/** Words rise in over this share of the screen as they come up from its foot. */
const RISE_OVER = 0.3;

const clamp = (v: number) => Math.min(1, Math.max(0, v));

/**
 * The page's small moments, all on the scroll and both ways: Tom's handwriting is written at his
 * pen's speed as it passes the pen's tip ([data-write], its ms in the attribute), and words rise in
 * from under a cut as they come up the screen ([data-rise]). A project's screens also follow how far
 * the page has passed them, from coming up at the screen's foot to leaving at its top ([data-pass],
 * --pass 0 to 1). A live frame ([data-frame]) loads only where its site lets it be shown
 * ([data-from]), as it nears the screen, and is marked once loaded, so it shows only then. A film
 * ([data-film]) plays only while it is near the screen.
 */
export function Motion() {
  useEffect(() => {
    // Each pen stroke and drip of a piece of handwriting is its own paused animation; a frame moves
    // only those whose picture changes, so a finished stroke is never drawn again.
    const strokesOf = (el: SVGSVGElement) =>
      el.getAnimations({ subtree: true }).map((anim) => {
        const timing = anim.effect?.getComputedTiming();
        const from = Number(timing?.delay ?? 0);
        const runs = Math.max(1, Number(timing?.activeDuration ?? 1));
        return { anim, from, runs, share: -1 };
      });
    const writes = [...document.querySelectorAll<SVGSVGElement>("[data-write]")].map((el) => ({
      el,
      ms: Number(el.dataset.write) || 1,
      now: 0,
      strokes: strokesOf(el),
    }));
    const rises = [...document.querySelectorAll<HTMLElement>("[data-rise]")].map((el) => ({
      el,
      now: 0,
    }));
    const passes = [...document.querySelectorAll<HTMLElement>("[data-pass]")].map((el) => ({
      el,
      now: 0,
    }));
    const frames = [...document.querySelectorAll<HTMLIFrameElement>("[data-frame]")].filter(
      (f) => !f.src && (f.dataset.from ?? "").split(" ").includes(location.hostname),
    );
    const near = new IntersectionObserver(
      (seen) => {
        for (const s of seen) {
          if (!s.isIntersecting) continue;
          const f = s.target as HTMLIFrameElement;
          near.unobserve(f);
          f.addEventListener("load", () => f.setAttribute("data-loaded", ""), { once: true });
          f.src = f.dataset.frame ?? "";
        }
      },
      { rootMargin: "100% 0px" },
    );
    for (const f of frames) near.observe(f);
    // Films play while they are near the screen and stop once they are away (never with reduced
    // motion: their first frame stays).
    const films = new IntersectionObserver(
      (seen) => {
        for (const s of seen) {
          const v = s.target as HTMLVideoElement;
          if (s.isIntersecting) v.play().catch(() => {});
          else v.pause();
        }
      },
      { rootMargin: "25% 0px" },
    );
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!still) for (const v of document.querySelectorAll("[data-film]")) films.observe(v);
    let last = performance.now();
    let frame = 0;
    // One frame: read every position first, then write, so the browser works out the page's style
    // and layout once per frame instead of once per piece. A value is only written when it changes,
    // and the loop stops once everything has caught up; a scroll or resize starts it again.
    const tick = (now: number) => {
      // A wake from a scroll handler can stamp a time just after this frame's: never a step back.
      const step = Math.max(0, Math.min(0.1, (now - last) / 1000));
      last = now;
      const k = still ? 1 : 1 - Math.exp(-FOLLOW * step);
      const vh = window.innerHeight;
      // How far the page can still scroll: a piece near the end is written over what is left, so
      // it is finished by the time the page stops.
      const left = document.documentElement.scrollHeight - vh - window.scrollY;
      const writeTops = writes.map((w) => w.el.getBoundingClientRect().top);
      const riseTops = rises.map((r) => r.el.getBoundingClientRect().top);
      const passBoxes = passes.map((p) => p.el.getBoundingClientRect());
      let moving = false;
      const follow = (piece: { now: number }, target: number) => {
        const next = piece.now + (target - piece.now) * k;
        piece.now = Math.abs(target - next) < 0.0005 ? target : next;
        if (piece.now !== target) moving = true;
      };
      writes.forEach((w, i) => {
        const top = writeTops[i] ?? 0;
        const over = Math.max(1, Math.min(vh * WRITE_OVER, vh * TIP - (top - left)));
        follow(w, still ? 1 : clamp((vh * TIP - top) / over));
      });
      rises.forEach((r, i) =>
        follow(r, still ? 1 : clamp((vh - (riseTops[i] ?? 0)) / (vh * RISE_OVER))),
      );
      passes.forEach((p, i) => {
        const box = passBoxes[i];
        if (!box) return;
        follow(p, still ? 0 : clamp((vh - box.top) / (vh + box.height)));
      });
      for (const w of writes) {
        const t = Math.round(w.now * w.ms);
        // The browser makes new animations when a piece's style is worked out again (or when a
        // piece had none yet); then the list is read again, so no stroke is left unmoved.
        if (!still && (!w.strokes.length || w.strokes.some((s) => s.anim.playState === "idle")))
          w.strokes = strokesOf(w.el);
        for (const stroke of w.strokes) {
          const share = clamp((t - stroke.from) / stroke.runs);
          if (share === stroke.share) continue;
          stroke.share = share;
          stroke.anim.currentTime = t;
        }
      }
      for (const r of rises) set(r, "--rise", r.now.toFixed(4));
      for (const p of passes) set(p, "--pass", p.now.toFixed(4));
      frame = moving ? requestAnimationFrame(tick) : 0;
    };
    const set = (
      piece: { el: HTMLElement | SVGElement; shown?: string },
      name: string,
      value: string,
    ) => {
      if (piece.shown === value) return;
      piece.shown = value;
      piece.el.style.setProperty(name, value);
    };
    const wake = () => {
      if (frame) return;
      last = performance.now();
      frame = requestAnimationFrame(tick);
    };
    addEventListener("scroll", wake, { passive: true });
    addEventListener("resize", wake);
    // The page can also change height without a scroll (fonts, pictures, the mail form): wake then too.
    const grown = new ResizeObserver(wake);
    grown.observe(document.body);
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      removeEventListener("scroll", wake);
      removeEventListener("resize", wake);
      grown.disconnect();
      near.disconnect();
      films.disconnect();
    };
  }, []);
  return null;
}

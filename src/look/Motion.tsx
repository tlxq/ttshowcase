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
    const writes = [...document.querySelectorAll<SVGSVGElement>("[data-write]")].map((el) => ({
      el,
      ms: Number(el.dataset.write) || 1,
      now: 0,
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
    const tick = (now: number) => {
      const step = Math.min(0.1, (now - last) / 1000);
      last = now;
      const k = still ? 1 : 1 - Math.exp(-FOLLOW * step);
      const vh = window.innerHeight;
      // How far the page can still scroll: a piece near the end is written over what is left, so
      // it is finished by the time the page stops.
      const left = document.documentElement.scrollHeight - vh - window.scrollY;
      for (const w of writes) {
        const top = w.el.getBoundingClientRect().top;
        const over = Math.max(1, Math.min(vh * WRITE_OVER, vh * TIP - (top - left)));
        const target = still ? 1 : clamp((vh * TIP - top) / over);
        w.now += (target - w.now) * k;
        w.el.style.setProperty("--t", `${(w.now * w.ms).toFixed(0)}ms`);
      }
      for (const r of rises) {
        const top = r.el.getBoundingClientRect().top;
        const target = still ? 1 : clamp((vh - top) / (vh * RISE_OVER));
        r.now += (target - r.now) * k;
        r.el.style.setProperty("--rise", r.now.toFixed(4));
      }
      for (const p of passes) {
        const box = p.el.getBoundingClientRect();
        const target = still ? 0 : clamp((vh - box.top) / (vh + box.height));
        p.now += (target - p.now) * k;
        p.el.style.setProperty("--pass", p.now.toFixed(4));
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      near.disconnect();
      films.disconnect();
    };
  }, []);
  return null;
}

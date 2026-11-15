"use client";

import { useEffect } from "react";
import { DRIP_FRAMES } from "./dripFrames";

/** How long each picture of the drip shows while a visitor is away, in ms. The whole drip then runs
 * about 3 s and holds. A constant here, not a token, until Tom has said the speed is right. */
const FRAME_MS = 380;

/**
 * While a visitor is on another tab, the tab's icon slowly drips paint (the pictures icon-drip/1.svg
 * and on, made at build time, because a browser shows only an SVG icon's first picture); coming back
 * puts the clean icon back. With reduced motion the drip is one still picture. The title never changes.
 */
export function TabAway() {
  useEffect(() => {
    const link = document.querySelector<HTMLLinkElement>('link[rel~="icon"][type="image/svg+xml"]');
    if (!link) return;
    const clean = link.getAttribute("href") ?? "/icon.svg";
    const frame = (n: number) => `/icon-drip/${n}.svg`;
    const still = matchMedia("(prefers-reduced-motion: reduce)");

    let timer: number | undefined;
    const stop = () => {
      window.clearInterval(timer);
      timer = undefined;
    };
    const change = () => {
      stop();
      if (!document.hidden) {
        link.setAttribute("href", clean);
        return;
      }
      if (still.matches) {
        link.setAttribute("href", frame(DRIP_FRAMES));
        return;
      }
      let n = 1;
      link.setAttribute("href", frame(n));
      timer = window.setInterval(() => {
        n++;
        link.setAttribute("href", frame(n));
        if (n >= DRIP_FRAMES) stop();
      }, FRAME_MS);
    };
    document.addEventListener("visibilitychange", change);
    return () => {
      document.removeEventListener("visibilitychange", change);
      stop();
      link.setAttribute("href", clean);
    };
  }, []);
  return null;
}

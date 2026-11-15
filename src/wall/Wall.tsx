"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { cssMs, cssVar } from "@/design/tokens";
import { Street, type StreetLook, type StreetState } from "./street";

/** How far one wheel pixel or one dragged pixel walks, in metres. */
const PER_PX = 0.008;
/** One arrow key press, and one Page Down. */
const STEP = 1.5;
const PAGE = 5;

/**
 * The wall: the visitor steps out of the page onto a night street and walks along the wall
 * (Tom picked A 11-14). The scene is street.ts; this is the page round it: the walking by wheel,
 * drag, swipe and keys, the way back, and what shows when the browser can't draw it.
 */
export function Wall() {
  const root = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<StreetState | null>(null);
  const [failed, setFailed] = useState(false);
  const [moved, setMoved] = useState(false);

  useEffect(() => {
    const host = root.current;
    const cv = canvas.current;
    if (!host || !cv) return;
    const style = getComputedStyle(host);
    const look: StreetLook = {
      ground: cssVar("--look-ground"),
      text: cssVar("--look-text"),
      quiet: cssVar("--look-quiet"),
      spray: cssVar("--look-spray"),
      cream: cssVar("--look-cream"),
      words: style.getPropertyValue("--look-words").trim(),
      mono: style.getPropertyValue("--look-mono").trim(),
      night: cssVar("--wall-night"),
      lamp: cssVar("--wall-lamp"),
      moon: cssVar("--wall-moon"),
      brick: cssVar("--wall-brick"),
      mortar: cssVar("--wall-mortar"),
      pavement: cssVar("--wall-pavement"),
      iron: cssVar("--wall-iron"),
      bone: cssVar("--wall-bone"),
      pullback: cssMs("--wall-pullback"),
      lampOn: cssMs("--wall-lamp-on"),
    };
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let street: Street;
    try {
      street = new Street(cv, look, still, setState);
    } catch {
      // Without WebGL there is no street to walk; the page says so (L8).
      queueMicrotask(() => setFailed(true));
      return;
    }
    let gone = false;
    const faces = [`900 100px ${look.words}`, `500 20px ${look.mono}`];
    Promise.all(faces.map((f) => document.fonts.load(f)))
      .catch(() => undefined)
      .then(() => {
        if (gone) return;
        street.setPoster();
        // A moment on the page as it was, then the camera pulls back from it.
        setTimeout(() => !gone && street.pullBack(), still ? 0 : 700);
      });

    const walked = () => setMoved(true);
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? innerHeight : 1;
      street.walk((Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) * unit * PER_PX);
      walked();
    };
    let last: { x: number; y: number } | null = null;
    const onDown = (e: PointerEvent) => {
      last = { x: e.clientX, y: e.clientY };
      cv.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!last) return;
      const dx = e.clientX - last.x;
      const dy = e.clientY - last.y;
      last = { x: e.clientX, y: e.clientY };
      // Pulling the street to the left, or swiping up, walks on.
      street.walk(-(Math.abs(dx) > Math.abs(dy) ? dx : dy) * PER_PX);
      walked();
    };
    const onUp = () => {
      last = null;
    };
    const onKey = (e: KeyboardEvent) => {
      const by: Record<string, number> = {
        ArrowRight: STEP,
        ArrowDown: STEP,
        ArrowLeft: -STEP,
        ArrowUp: -STEP,
        PageDown: PAGE,
        PageUp: -PAGE,
        " ": e.shiftKey ? -PAGE : PAGE,
        Home: -1000,
        End: 1000,
      };
      const m = by[e.key];
      if (m === undefined) return;
      e.preventDefault();
      street.walk(m);
      walked();
    };
    const onResize = () => street.resize();
    host.addEventListener("wheel", onWheel, { passive: false });
    cv.addEventListener("pointerdown", onDown);
    cv.addEventListener("pointermove", onMove);
    cv.addEventListener("pointerup", onUp);
    cv.addEventListener("pointercancel", onUp);
    cv.addEventListener("keydown", onKey);
    addEventListener("resize", onResize);
    return () => {
      gone = true;
      host.removeEventListener("wheel", onWheel);
      cv.removeEventListener("pointerdown", onDown);
      cv.removeEventListener("pointermove", onMove);
      cv.removeEventListener("pointerup", onUp);
      cv.removeEventListener("pointercancel", onUp);
      cv.removeEventListener("keydown", onKey);
      removeEventListener("resize", onResize);
      street.dispose();
    };
  }, []);

  return (
    <div
      ref={root}
      className="lk wall"
      data-ready={state ? "" : undefined}
      data-walking={state?.walking ? "" : undefined}
      data-at={state?.at}
      data-lit={state?.lit}
      data-written={state ? `${state.written}/${state.tags}` : undefined}
    >
      <canvas
        ref={canvas}
        className="wall-street"
        tabIndex={0}
        role="img"
        aria-label="A brick wall along a street at night, with Tom's tags on it. Use the arrow keys to walk along it."
      />
      <Link className="wall-close" href="/#questions">
        Close
      </Link>
      {failed ? (
        <p className="wall-note">Couldn&apos;t show the wall. This browser can&apos;t draw 3D.</p>
      ) : !state ? (
        <p className="wall-note wall-wait">Painting the wall…</p>
      ) : state.walking && !moved ? (
        <p className="wall-note wall-hint">Scroll or swipe to walk</p>
      ) : null}
    </div>
  );
}

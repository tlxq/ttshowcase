import type { CSSProperties } from "react";
import { handMarkup } from "./handMarkup";
import { dripGrows, type HandName, hands } from "./handPaint";

interface HandProps {
  name: HandName;
  /** What it says, for screen readers; left out when it is only a mark. */
  label?: string;
  className?: string;
  /** "auto" writes itself once the page opens; "scroll" is written as it passes the pen's tip. */
  mode?: "auto" | "scroll";
  /** The one line through the page ends where this piece starts, and runs on as it. */
  lineEnd?: boolean;
}

/**
 * A piece of Tom's handwriting in spray paint. Each stroke shows along its own path at the pen's
 * own speed, then the paint runs (look.css). Without motion it is simply there. A piece written
 * as the page scrolls ("scroll") is only its empty svg in the page: its strokes are in
 * one file (/hands.svg, app/hands.svg) that Motion.tsx puts in once the page has settled,
 * so the page carries them once, not twice (as drawn and as data for the browser).
 */
export function Hand({ name, label, className = "", mode = "scroll", lineEnd }: HandProps) {
  const { box, end, start, written, drips } = hands[name];
  return (
    <svg
      className={`lk-hand lk-hand-${mode} ${className}`}
      viewBox={`${box.left.toFixed(0)} ${box.top.toFixed(0)} ${box.width.toFixed(0)} ${box.height.toFixed(0)}`}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      // In scroll mode the drips run on as the page scrolls past the writing, until the last is down.
      data-write={mode === "scroll" ? written + (drips.length ? dripGrows : 0) : undefined}
      data-hand={mode === "scroll" ? name : undefined}
      data-end-x={end.x.toFixed(4)}
      data-end-y={end.y.toFixed(4)}
      data-end-angle={end.angle.toFixed(4)}
      data-start-x={start.x.toFixed(4)}
      data-start-y={start.y.toFixed(4)}
      data-line-end={lineEnd ? "" : undefined}
      style={
        {
          "--written": `${written}ms`,
          "--box-w": box.width.toFixed(0),
          "--grows": `${dripGrows}ms`,
        } as CSSProperties
      }
      // The strokes of a piece written on the scroll come later (Motion.tsx); the tag has them here.
      dangerouslySetInnerHTML={mode === "scroll" ? undefined : { __html: handMarkup(name) }}
    />
  );
}

/** Tom's tlxq tag, sprayed over the first screen's words; the page's line runs on from its swash. */
export function Tag() {
  return <Hand name="tlxq" label="tlxq, Tom's tag" className="lk-tag" mode="auto" />;
}

import type { CSSProperties } from "react";
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
 * own speed, then the paint runs (look.css). Without motion it is simply there.
 */
export function Hand({ name, label, className = "", mode = "scroll", lineEnd }: HandProps) {
  const { box, strokes, drips, end, start, written } = hands[name];
  const id = `lk-hand-${name}`;
  return (
    <svg
      className={`lk-hand lk-hand-${mode} ${className}`}
      viewBox={`${box.left.toFixed(0)} ${box.top.toFixed(0)} ${box.width.toFixed(0)} ${box.height.toFixed(0)}`}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      // In scroll mode the drips run on as the page scrolls past the writing, until the last is down.
      data-write={mode === "scroll" ? written + (drips.length ? dripGrows : 0) : undefined}
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
    >
      <defs>
        {strokes.map((stroke, i) => (
          <mask
            key={i}
            id={`${id}-${i}`}
            maskUnits="userSpaceOnUse"
            x={box.left}
            y={box.top}
            width={box.width}
            height={box.height}
          >
            <path
              className="lk-reveal"
              d={stroke.path}
              pathLength={1}
              strokeWidth={stroke.cover}
              style={
                {
                  "--from": `${stroke.from}ms`,
                  "--runs": `${stroke.runs}ms`,
                  "--pen": stroke.timing,
                } as CSSProperties
              }
            />
          </mask>
        ))}
      </defs>
      {strokes.map((stroke, i) => (
        <path key={i} className="lk-paint" d={stroke.shape} mask={`url(#${id}-${i})`} />
      ))}
      {drips.map((d, i) => (
        <path
          key={i}
          className="lk-drip"
          d={d.shape}
          style={{ "--at": `${d.at}ms` } as CSSProperties}
        />
      ))}
    </svg>
  );
}

/** Tom's tlxq tag, sprayed over the first screen's words; the page's line runs on from its swash. */
export function Tag() {
  return <Hand name="tlxq" label="tlxq, Tom's tag" className="lk-tag" mode="auto" />;
}

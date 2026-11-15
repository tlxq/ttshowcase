import type { CSSProperties } from "react";
import { lookLab } from "@/content/look";
import { Hand } from "./Tag";

/**
 * The Experiments part: a wall, and Tom's own tools pasted on it as posters. As each one comes up
 * it falls onto the wall tipped and too big, lands flat at its own angle with its shadow pulling
 * in, then its words come in. The one line runs on behind the posters. All on the scroll, both
 * ways (Motion.tsx sets --rise).
 */
export function Lab() {
  return (
    <section className="lk-lab" id="experiments" aria-labelledby="lk-lab-title">
      <h2 className="lk-eyebrow">
        <span>03 / 04</span>
        <span className="lk-rule" aria-hidden="true" />
        <span id="lk-lab-title">Experiments</span>
      </h2>
      <Hand name="wip" label="work in progress" className="lk-note lk-lab-wip" />
      <ol className="lk-lab-wall">
        {lookLab.map((tool, i) => (
          <li
            key={tool.name}
            className="lk-lab-poster"
            data-rise=""
            style={
              {
                "--turn": `${tool.turn}deg`,
                "--chars": Math.max(...tool.name.split(" ").map((w) => w.length)),
              } as CSSProperties
            }
          >
            <p className="lk-lab-num">{String(i + 1).padStart(2, "0")}</p>
            <h3 className="lk-lab-name">{tool.name}</h3>
            <p className="lk-lab-line">{tool.line}</p>
            <ul className="lk-lab-built">
              {tool.built.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
            {tool.links && (
              <p className="lk-run-act">
                {tool.links.map((link) => (
                  <a
                    key={link.href}
                    className="lk-run-open"
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {link.label} ›
                  </a>
                ))}
              </p>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}

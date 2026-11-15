import type { CSSProperties } from "react";
import type { Term as TermText } from "@/content/look";

/**
 * A terminal on a laptop's or a phone's screen: its title bar, then its lines, each coming in after
 * the one before on the stage's --rise (Motion.tsx), as if typed while the screen comes up.
 */
export function Term({ term }: { term: TermText }) {
  return (
    <div className="lk-term" style={{ "--n": term.lines.length } as CSSProperties}>
      <p className="lk-term-title">{term.title}</p>
      <ol className="lk-term-lines">
        {term.lines.map((line, i) => (
          <li
            key={`${i}-${line.text}`}
            className={line.kind ? `lk-term-${line.kind}` : undefined}
            style={{ "--i": i } as CSSProperties}
          >
            {line.text}
          </li>
        ))}
      </ol>
    </div>
  );
}

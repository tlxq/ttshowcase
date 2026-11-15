import type { CSSProperties } from "react";
import { lookHero, lookParts, lookWho } from "@/content/look";
import { PhoneMenu } from "./PhoneMenu";
import { Tag } from "./Tag";
import { tagWritten } from "./handPaint";

/** The header: the name, who Tom is, and the four parts. On a phone the parts fold into a menu. */
export function LookHeader() {
  const links = (
    <>
      {lookParts.map((part) => (
        <a key={part.id} href={`#${part.id}`}>
          {part.label}
        </a>
      ))}
      <a className="lk-pill" href="#write">
        Email me
      </a>
    </>
  );
  return (
    <header className="lk-head">
      <div className="lk-name">
        <a className="lk-mark" href="#lk-top" aria-label="tlxq, go to the top">
          tlxq
        </a>
        <p className="lk-who">
          {lookWho.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </p>
      </div>
      <nav className="lk-nav" aria-label="Main">
        {links}
      </nav>
      <PhoneMenu>{links}</PhoneMenu>
    </header>
  );
}

/** The first screen: the words, Tom's tag sprayed over them, and the line running on from it. */
export function Hero() {
  return (
    <section
      className="lk-hero"
      id="lk-top"
      style={{ "--written": `${tagWritten}ms` } as CSSProperties}
    >
      <p className="lk-who-phone">{lookWho.slice(0, 2).join(" · ")}</p>
      <div className="lk-words">
        <h1>
          {lookHero.lines.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </h1>
        <Tag />
      </div>
      <p className="lk-lead">{lookHero.lead}</p>
      <p className="lk-cue">
        {lookHero.cue} <span aria-hidden="true">↓</span>
      </p>
    </section>
  );
}

import type { CSSProperties } from "react";
import { lookAsk } from "@/content/look";
import { MailForm } from "./MailForm";
import { Hand } from "./Tag";

/**
 * The Questions part, the end of the page, back on the dark ground. Who it is for comes in line by
 * line, each sliding in slanted from its own side; Tom's "ask me" points at where to reach him;
 * and the one line through the page comes down and turns into his signature, written as it
 * passes the pen's tip. All on the scroll, both ways (Motion.tsx sets --rise and moves the strokes).
 */
export function Ask() {
  return (
    <section className="lk-ask" id="questions" aria-labelledby="lk-ask-title">
      <p className="lk-eyebrow">
        <span>04 / 04</span>
        <span className="lk-rule" aria-hidden="true" />
        <span>Questions</span>
      </p>
      <h2
        className="lk-ask-title"
        id="lk-ask-title"
        style={
          {
            "--chars": Math.max(...lookAsk.lines.flatMap((l) => l.split(" ")).map((w) => w.length)),
          } as CSSProperties
        }
      >
        {lookAsk.lines.map((line, i) => (
          <span
            key={line}
            className="lk-ask-line"
            data-rise=""
            style={{ "--side": i % 2 ? 1 : -1 } as CSSProperties}
          >
            {line}
          </span>
        ))}
      </h2>
      <div className="lk-ask-write" id="write" data-rise="">
        <MailForm />
      </div>
      <div className="lk-ask-reach" data-rise="">
        <ul className="lk-ask-links">
          {lookAsk.links.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                {...(link.external ? { target: "_blank", rel: "noreferrer" } : {})}
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
        <Hand name="askMe" label="ask me" className="lk-note lk-ask-me" />
      </div>
      <div className="lk-ask-end">
        <Hand name="signature" label="Tom's signature" className="lk-note lk-ask-sign" lineEnd />
        <p className="lk-ask-who">{lookAsk.sign}</p>
      </div>
    </section>
  );
}

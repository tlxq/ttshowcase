import { lookLive, lookTom } from "@/content/look";
import { Hand } from "./Tag";

/**
 * The Tom part, on cream: Tom's own hello sprayed over the print, the words rising in, the line
 * looping round each of his daily tools with his note beside them, and how many projects he has, with the
 * live ones circled and "still running" pointing at them. Everything is written as it passes the pen's tip (Motion.tsx).
 */
export function Tom() {
  const { headline, about, stack } = lookTom;
  const projects = `${lookLive.length} projects ·`;
  const live = `${lookLive.filter((p) => p.live).length} live now`;
  return (
    <section className="lk-tom" id="tom" aria-labelledby="lk-tom-title">
      <p className="lk-eyebrow">
        <span>01 / 04</span>
        <span className="lk-rule" aria-hidden="true" />
        <span>Tom</span>
      </p>
      <div className="lk-tom-head">
        <Hand name="hi" label="hi, I'm Tom" className="lk-tom-hi" />
        <h2 id="lk-tom-title">
          {headline.map((line) => (
            <span key={line} className="lk-rise" data-rise="">
              <span>{line}</span>
            </span>
          ))}
        </h2>
      </div>
      <div className="lk-tom-stack">
        <Hand name="tools" label="my daily tools" className="lk-tom-tools" />
        <ul data-line-stack="">
          {stack.map((tool) => (
            <li key={tool} data-line-loop="">
              {tool}
            </li>
          ))}
        </ul>
      </div>
      <div className="lk-tom-about">
        <p className="lk-rise-soft" data-rise="">
          {about}
        </p>
        <p className="lk-live">
          <span className="lk-live-all">{projects}</span>
          <span className="lk-circled">
            <span className="lk-dot" aria-hidden="true" />
            {live}
            <Hand name="circle" className="lk-tom-circle" />
          </span>
          <Hand name="running" label="still running" className="lk-tom-running" />
        </p>
      </div>
    </section>
  );
}

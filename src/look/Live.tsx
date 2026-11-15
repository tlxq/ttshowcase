import type { CSSProperties } from "react";
import { lookLive } from "@/content/look";
import { HomeMap } from "./HomeMap";
import { Hand } from "./Tag";
import { Term } from "./Term";

type Project = (typeof lookLive)[number];

/**
 * A project's screens on a laptop and a phone, on their own --rise and --pass (Motion.tsx): the
 * laptop's lid opens up from lying flat and its screen comes on, the phone slides out from behind it
 * and turns towards you, and a tall phone shot scrolls through the site as the page passes. Where the
 * site allows it, the laptop shows it live (it can't be clicked into, so the page's scroll is never
 * caught by it, and the words' links open it); its shot stays under it until it has loaded. A project
 * whose screens can't be shown has a drawing or a terminal on them instead (HomeMap, Term).
 */
function Screens({ project }: { project: Project }) {
  const { laptop, phone, frame, diagram, laptopTerm, phoneTerm, laptopFilm, phoneFilm } =
    project.screens;
  const stage = (
    <>
      <div className="lk-case-laptop">
        <div className="lk-case-lid">
          <div className="lk-case-screen">
            {laptop && (
              <img src={laptop} alt="" width={960} height={600} loading="lazy" decoding="async" />
            )}
            {frame && (
              <iframe
                title={`${project.name}, live`}
                tabIndex={-1}
                // Motion.tsx loads it only on an address the site lets show it, as it nears the
                // screen, and shows it over its shot once it has loaded (look.css)
                data-frame={frame.src}
                data-from={frame.from.join(" ")}
              />
            )}
            {laptopFilm && <Film path={laptopFilm} />}
            {diagram === "home" && <HomeMap />}
            {laptopTerm && <Term term={laptopTerm} />}
          </div>
        </div>
        <div className="lk-case-base" />
      </div>
      <div className="lk-case-phone">
        <div className="lk-case-phone-screen">
          {phoneTerm && <Term term={phoneTerm} />}
          {phoneFilm && <Film path={phoneFilm} />}
          {phone && (
            <img
              src={phone.src}
              alt=""
              width={300}
              height={phone.height}
              loading="lazy"
              decoding="async"
            />
          )}
        </div>
      </div>
    </>
  );
  return (
    <div className="lk-case-stage" data-rise="" data-pass="" aria-hidden="true">
      {stage}
    </div>
  );
}

/**
 * A film of a site scrolling, its first frame showing until Motion.tsx plays it as it nears the
 * screen (never with reduced motion), on a loop and without sound.
 */
function Film({ path }: { path: string }) {
  return (
    <video muted loop playsInline preload="none" poster={`${path}.webp`} data-film="">
      <source src={`${path}.webm`} type="video/webm" />
      <source src={`${path}.mp4`} type="video/mp4" />
    </video>
  );
}

/**
 * The Live part, back on the dark ground: the main projects, each a small case study. Its name,
 * as big as fits the screen, tips up from lying back and rises from under a cut, its letters
 * opening into windows onto its screens; then its screens come up on a laptop and a phone, and its
 * words follow in beside them. The one line runs on behind the names. All on the scroll, both ways.
 */
export function Live() {
  return (
    <section className="lk-run" id="live" aria-labelledby="lk-run-title">
      <h2 className="lk-eyebrow">
        <span>02 / 04</span>
        <span className="lk-rule" aria-hidden="true" />
        <span id="lk-run-title">Live</span>
      </h2>
      <ol className="lk-run-list">
        {lookLive.map((project, i) => (
          <li
            key={project.name}
            className="lk-run-item"
            data-rise=""
            style={
              {
                "--chars": project.name.length,
                "--photo": `url(${project.photo})`,
              } as CSSProperties
            }
          >
            <p className="lk-run-head">
              <span>{String(i + 1).padStart(2, "0")}</span>
              <span className="lk-dot" aria-hidden="true" />
              <span>{project.role}</span>
            </p>
            <h3 className="lk-run-name">
              <span className="lk-run-cut">
                <span className="lk-run-word">
                  <span className="lk-run-paint">{project.name}</span>
                  <span className="lk-run-photo" aria-hidden="true">
                    {project.name}
                  </span>
                </span>
              </span>
            </h3>
            <div className="lk-case">
              <Screens project={project} />
              <div className="lk-run-words" data-rise="">
                {project.note && !project.links && (
                  <Hand
                    name={project.note.hand}
                    label={project.note.label}
                    className="lk-note lk-run-server"
                  />
                )}
                <p className="lk-run-line">{project.line}</p>
                <ul className="lk-case-did">
                  {project.did.map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                </ul>
                <p className="lk-case-stack">{project.stack}</p>
                {project.links ? (
                  <p className="lk-run-act">
                    {project.links.map((link) => (
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
                    {project.note && (
                      <Hand
                        name={project.note.hand}
                        label={project.note.label}
                        className="lk-note lk-run-try"
                      />
                    )}
                  </p>
                ) : (
                  project.away && <p className="lk-run-note">{project.away}</p>
                )}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

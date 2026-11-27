"use client";

import { useRef, useState, type FormEvent } from "react";

import mail from "@/content/mailWords.json";
import { sendContact } from "@/content/sendContact";

type State = "writing" | "sending" | "sent" | "failed";

/** The longest message (api/contact.ts says the same). */
const LONGEST = 4000;
/** "312 left" shows from this close to the longest message. */
const SHOW_LEFT = 400;

/**
 * The mail form in Questions (Tom 11-11 picked Rows: mono rows, send ↵; 11-15: the only way to
 * write, the header's Email me comes here): a message to Tom, sent by the server (api/contact.ts)
 * so his address and the key are never in the page. What was written stays in the fields until it
 * has gone (W6).
 */
export function MailForm() {
  const [state, setState] = useState<State>("writing");
  const [why, setWhy] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState("");
  // The sent note keeps the form's height, so the page doesn't jump when the form goes.
  const form = useRef<HTMLFormElement>(null);
  const [height, setHeight] = useState(0);

  async function send(event: FormEvent) {
    event.preventDefault();
    setHeight(form.current?.offsetHeight ?? 0);
    setState("sending");
    // The send and its error words: one source for the site and both pitch pages (src/content/sendContact.ts, mailWords.json).
    const answer = await sendContact({ name, email, message, website }, mail);
    if (answer.ok) {
      setState("sent");
      return;
    }
    setWhy(answer.why);
    setState("failed");
  }

  const left = LONGEST - message.length;

  if (state === "sent") {
    return (
      <div className="lk-mail lk-mail-sent" role="status" style={{ minHeight: height }}>
        <p>sent. I&apos;ll write back to {email}.</p>
        <button
          type="button"
          className="lk-mail-send"
          onClick={() => {
            setMessage("");
            setState("writing");
          }}
        >
          write another
        </button>
      </div>
    );
  }

  return (
    <form
      className="lk-mail"
      method="post"
      onSubmit={send}
      ref={form}
      style={{ minHeight: height }}
    >
      <label className="lk-mail-row">
        <span className="lk-mail-key">name</span>
        <input
          type="text"
          name="name"
          autoComplete="name"
          required
          maxLength={100}
          enterKeyHint="next"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <label className="lk-mail-row">
        <span className="lk-mail-key">email</span>
        <input
          type="email"
          name="email"
          autoComplete="email"
          required
          maxLength={200}
          enterKeyHint="next"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <label className="lk-mail-row">
        <span className="lk-mail-key">message</span>
        <textarea
          name="message"
          required
          rows={4}
          maxLength={LONGEST}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </label>
      {left <= SHOW_LEFT && <p className="lk-mail-left">{left} left</p>}
      {/* Only robots fill this in (api/contact.ts). */}
      <label className="lk-mail-trap" aria-hidden="true">
        Website
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </label>
      {state === "failed" && (
        <p className="lk-mail-error" role="alert">
          {mail.lead}
          {why}
        </p>
      )}
      <div className="lk-mail-foot">
        <button type="submit" className="lk-mail-send" disabled={state === "sending"}>
          {state === "sending" ? "sending…" : state === "failed" ? "try again ↵" : "send ↵"}
        </button>
        {/* What the site keeps, where the data is given (Tom 11-24: one small word, the page in a new tab so the message stays). */}
        <a className="lk-mail-privacy" href="/privacy" target="_blank" rel="noopener">
          privacy
        </a>
      </div>
    </form>
  );
}

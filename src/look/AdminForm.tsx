"use client";

import { useEffect, useState, type FormEvent } from "react";

type State = "checking" | "out" | "sending" | "in" | "failed";

/** Why the sign-in failed, in words (signum W6: what, why, Try again). The wrong key and a stopped address say it plainly: this page is Tom's. */
const WHY: Record<string, string> = {
  key: "That key is wrong.",
  "too-many": "Too many wrong keys from this address today.",
};

/** The browser's own note that this device has signed in: the wall asks the server for Tom's view only when it is here, so a visitor's wall never asks. It holds no secret. */
const HINT = "ttshowcase.admin";
const hint = (on: boolean) => {
  try {
    if (on) localStorage.setItem(HINT, "1");
    else localStorage.removeItem(HINT);
  } catch {
    // no storage: the wall won't ask, and Tom signs in again there
  }
};

const call = (body: object) =>
  fetch("/api/admin", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Admin": "1" },
    body: JSON.stringify(body),
  });

/**
 * Tom's sign-in (api/admin.ts): one field, one button. Signed in, it says so and offers Sign out. It reads the cookie's state from the server (the cookie itself can't be read here), so a stale note is put right.
 */
export function AdminForm() {
  const [state, setState] = useState<State>("checking");
  const [why, setWhy] = useState("");
  const [key, setKey] = useState("");
  const [outWhy, setOutWhy] = useState("");

  useEffect(() => {
    let live = true;
    fetch("/api/tags?admin=1", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { admin?: boolean } | null) => {
        if (!live) return;
        hint(j?.admin === true);
        setState(j?.admin === true ? "in" : "out");
      })
      .catch(() => live && setState("out"));
    return () => {
      live = false;
    };
  }, []);

  async function signIn(event: FormEvent) {
    event.preventDefault();
    setState("sending");
    try {
      const answer = await call({ key });
      if (answer.ok) {
        hint(true);
        setKey("");
        setState("in");
        return;
      }
      const { error } = (await answer.json().catch(() => ({}))) as { error?: string };
      setWhy(WHY[error ?? ""] ?? "The server didn't answer.");
    } catch {
      setWhy("The page couldn't reach the server.");
    }
    setState("failed");
  }

  async function signOut() {
    setState("sending");
    setOutWhy("");
    try {
      const answer = await call({ signout: true });
      if (!answer.ok) throw new Error("refused");
    } catch (e) {
      setOutWhy(
        e instanceof TypeError
          ? "The page couldn't reach the server."
          : "The server didn't answer.",
      );
      setState("in");
      return;
    }
    hint(false);
    setState("out");
  }

  if (state === "checking") return null;

  if (state === "in" || (state === "sending" && !key)) {
    return (
      <div className="lk-mail lk-admin" role="status">
        <p className="lk-admin-say">Signed in on this device.</p>
        <button
          type="button"
          className="lk-mail-send"
          disabled={state === "sending"}
          onClick={signOut}
        >
          {state === "sending" ? "Signing out…" : "Sign out"}
        </button>
        {outWhy && (
          <p className="lk-mail-error" role="alert">
            Couldn&apos;t sign out. {outWhy} Try again.
          </p>
        )}
      </div>
    );
  }

  return (
    <form className="lk-mail lk-admin" method="post" onSubmit={signIn}>
      <label className="lk-mail-row">
        <span className="lk-mail-key">Key</span>
        <input
          type="password"
          name="key"
          autoComplete="current-password"
          required
          maxLength={200}
          value={key}
          onChange={(e) => setKey(e.target.value)}
        />
      </label>
      {state === "failed" && (
        <p className="lk-mail-error" role="alert">
          Couldn&apos;t sign in. {why} Try again.
        </p>
      )}
      <button type="submit" className="lk-mail-send" disabled={state === "sending"}>
        {state === "sending" ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

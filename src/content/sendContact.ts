// The contact form's send, once. The site's form (src/look/MailForm.tsx) imports it; tools/pitch/build.mjs puts the
// same function, types stripped, into both pitch pages (__MAIL_SEND__ in pitch/front.src.html and pitch/paint/50-end.js),
// so the three can't drift. It asks the server (api/contact.ts) and turns every way a send can end into one answer; the
// pages only show it. Only erasable TypeScript here (types, no enums or imports): the build runs it as plain JavaScript.
// It calls the page's own fetch at the moment of sending: Vercel BotID wraps it (instrumentation-client.ts, and its
// inlined script on the pitch pages), and that wrapper is what marks the send as a person's.
type Words = { lead: string; other: string; offline: string; why: Record<string, string> };
type Answer = { ok: true } | { ok: false; code: string; known: boolean; why: string; text: string };

export async function sendContact(
  fields: Record<string, unknown>,
  words: Words,
  post: typeof fetch = (input, init) => fetch(input, init),
): Promise<Answer> {
  let why: string,
    code = "";
  try {
    const answer = await post("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    });
    if (answer.ok) return { ok: true };
    code = ((await answer.json().catch(() => ({}))) as { error?: string }).error || "";
    why = words.why[code] || words.other;
  } catch (_) {
    why = words.offline;
  }
  return { ok: false, code, known: !!words.why[code], why, text: words.lead + why };
}

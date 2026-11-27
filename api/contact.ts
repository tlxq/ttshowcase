/**
 * The mail form (Questions): sends a visitor's message to Tom through Resend. Tom's address and the
 * key stay here, on the server (CONTACT_TO and RESEND_API_KEY in Vercel's settings), never in the
 * page. CONTACT_FROM is the sender, an address on ttdevs.com (a domain set up at Resend).
 *
 * A few messages a day per address: the key is shared with the wall's tags (api/tags.ts), so a flood
 * here would use up the mail service and stop the tags too. The count lives in the tags' sends table
 * (DATABASE_URL, TAG_SECRET), under its own scrambled address, so mail and tags don't share a limit.
 * Tests: src/tags/contact.test.ts.
 */
import { checkBotId } from "botid/server";
import { neon } from "@neondatabase/serverless";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import mailWordsJson from "../src/content/mailWords.json" with { type: "json" };

export const LONGEST = 4000;
/** Messages one address may send in a day: a real visitor writes once or twice, a robot doesn't stop. */
export const MAIL_PER_ADDRESS = 5;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** The sender's address scrambled with the secret, as api/tags.ts does it, plus "mail:" so the two
 * never count each other's sends. Each api file is its own function on Vercel, so it isn't shared. */
export function mailHash(request: Request, secret: string): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = (forwarded?.split(",")[0] || request.headers.get("x-real-ip") || "unknown").trim();
  return createHash("sha256")
    .update(secret + "mail:" + ip)
    .digest("base64url");
}

/** Everything the handler needs from the outside, so the tests can run it without a database or mail. */
export type ContactDeps = {
  secret: string;
  /** Mails sent from this address in the last day. */
  sentToday(ipHash: string): Promise<number>;
  /** Counts one more mail for this address (and clears rows older than a day). */
  count(ipHash: string): Promise<void>;
  /** Takes back this address's latest count: the mail never went out, so it must not use up the day's messages. */
  refund(ipHash: string): Promise<void>;
  mail(m: { replyTo: string; subject: string; text: string }): Promise<boolean>;
  /** A person sent this, not a robot (Vercel BotID). Missing = no check (the tests). */
  human?(): Promise<boolean>;
};

/** What the handler decided, before it is turned into JSON or into the plain answer page. */
type Verdict = { status: number; error?: string };
type Body = { name?: unknown; email?: unknown; message?: unknown; website?: unknown };

/** The one place the rules live: validation, the robot check, the per-address limit and the send. */
async function decide(d: ContactDeps, request: Request, body: Body): Promise<Verdict> {
  // A field only robots fill in: they get a thank-you and nothing is sent.
  if (typeof body.website === "string" && body.website) return { status: 200 };
  const email = typeof body.email === "string" ? body.email.trim() : "";
  // The name goes into the mail's subject: one line, without hidden characters (the tag tool drops the same ones).
  const name =
    typeof body.name === "string"
      ? body.name
          .replace(/[\p{Cc}\p{Cf}]/gu, "")
          .trim()
          .slice(0, 100)
      : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!EMAIL.test(email) || email.length > 200) return { status: 400, error: "email" };
  if (!message || message.length > LONGEST) return { status: 400, error: "message" };
  if (d.human && !(await d.human())) return { status: 403, error: "robot" };
  const ipHash = mailHash(request, d.secret);
  // Counted before it goes, so a flood can't slip past while the mail is in flight; given back when the
  // mail fails. No count, no mail: when the database doesn't answer, nothing is sent.
  try {
    if ((await d.sentToday(ipHash)) >= MAIL_PER_ADDRESS) return { status: 429, error: "too-many" };
    await d.count(ipHash);
  } catch {
    return { status: 503, error: "mail-service" };
  }
  const sent = await d.mail({
    replyTo: email,
    subject: `Message from ${name ? `${name} <${email}>` : email}`,
    text: message,
  });
  if (!sent) {
    // The mail never reached Tom: give the send back, as api/tags.ts does.
    try {
      await d.refund(ipHash);
    } catch {
      // The answer is the same; the count stays until it is a day old.
    }
    return { status: 502, error: "mail-service" };
  }
  return { status: 200 };
}

const json = (v: Verdict) =>
  v.error ? Response.json({ error: v.error }, { status: v.status }) : Response.json({ sent: true });

// ---- the answer page for a form sent without JavaScript (a plain post: urlencoded or multipart) ----

/** The address the site already shows (the front and the walk link it). */
export const EMAIL_TO_TOM = "hello@ttdevs.com";
const mailWords = mailWordsJson as { lead: string; other: string; why: Record<string, string> };
/** Words only this page needs. The rest (the lead, the reasons) is src/content/mailWords.json, as on the other pages. */
export const PLAIN = {
  sentTitle: "Sent",
  sent: "I'll write back to ",
  notSent: "Your message was not sent.",
  yourText: "Your text, so you can copy it:",
  other: "You can also write to me at ",
  back: "Back to the site",
  // The browser check needs JavaScript, so without it this is the reason, not "reload".
  robot: "The browser check didn't pass. It needs JavaScript.",
  // A post that came from another site, or that could not be read.
  broken: "The form didn't arrive whole.",
};

const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );

/** The site's one token file, put on the page as is; the page's own rules only use its values.
 * vercel.json ships the file with this function. */
let tokens: string | undefined;
const tokenCss = () => {
  // The mail may already be sent when the page is built: a missing file must cost the look, never the answer
  // (a 500 here would make the visitor send again, and the message would arrive twice).
  try {
    return (tokens ??= readFileSync(join(process.cwd(), "src/design/tokens.css"), "utf8"));
  } catch {
    return "";
  }
};

/** The page's look, built only from tokens.css. */
export const ANSWER_CSS =
  "body{font:var(--look-reading)/1.5 sans-serif;margin:0 auto;max-width:var(--look-form);" +
  "padding:var(--s3) var(--gutter);background:var(--look-ground);color:var(--look-text)}" +
  "h1{margin:0 0 var(--s2)}a{color:var(--look-text)}" +
  "pre{white-space:pre-wrap;overflow-wrap:anywhere;font:inherit;padding:var(--s2);border:thin solid var(--look-rule);margin:var(--s1) 0 var(--s2)}" +
  "p.quiet{color:var(--look-quiet)}" +
  "a.back{display:inline-block;min-height:var(--tap);line-height:var(--tap)}";

function answerPage(v: Verdict, email: string, message: string): Response {
  let title: string, body: string;
  if (!v.error) {
    title = PLAIN.sentTitle;
    // no address to name (the trap field's thank-you): the heading alone
    body =
      `<h1>${esc(PLAIN.sentTitle)}</h1>` + (email ? `<p>${esc(PLAIN.sent)}${esc(email)}.</p>` : "");
  } else {
    const why =
      v.error === "robot"
        ? PLAIN.robot
        : v.error === "bad-request"
          ? PLAIN.broken
          : mailWords.why[v.error] || mailWords.other;
    title = mailWords.lead.trim();
    body =
      `<h1>${esc(title)}</h1><p>${esc(why)}</p><p>${esc(PLAIN.notSent)}</p>` +
      (message ? `<p class="quiet">${esc(PLAIN.yourText)}</p><pre>${esc(message)}</pre>` : "") +
      `<p>${esc(PLAIN.other)}<a href="mailto:${EMAIL_TO_TOM}">${EMAIL_TO_TOM}</a>.</p>`;
  }
  return new Response(
    `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">` +
      `<meta name="robots" content="noindex"><title>${esc(title)}</title>` +
      `<style>${tokenCss()}</style><style>${ANSWER_CSS}</style><body>${body}` +
      `<p><a class="back" href="/">${esc(PLAIN.back)}</a></p></body></html>`,
    {
      status: v.status,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "private, no-store",
        "X-Robots-Tag": "noindex, nofollow",
        // Only this page's own inline style; no script, no framing, and it posts nowhere.
        "Content-Security-Policy":
          "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
      },
    },
  );
}

/** A plain form post: the fields as text. Anything else in the post (files) is left out, so it fails validation. */
async function plainFields(request: Request): Promise<Body | null> {
  try {
    const out: Record<string, unknown> = {};
    for (const [k, v] of await request.formData()) if (typeof v === "string") out[k] = v;
    return out;
  } catch {
    return null;
  }
}

/** A form on another site can't post here: when the browser says where it came from, it must be this site. */
function fromOtherSite(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host !== new URL(request.url).host;
  } catch {
    return true;
  }
}

export function contact(deps: () => ContactDeps | null) {
  return async function POST(request: Request): Promise<Response> {
    const d = deps();
    const type = request.headers.get("content-type") ?? "";
    if (/^(application\/x-www-form-urlencoded|multipart\/form-data)\b/i.test(type)) {
      // The visitor's own text goes back on the page, so they can copy it when the send fails.
      const fields = await plainFields(request);
      const text = typeof fields?.message === "string" ? fields.message.trim() : "";
      const email = typeof fields?.email === "string" ? fields.email.trim() : "";
      if (!d) return answerPage({ status: 503, error: "not-set-up" }, email, text);
      if (!fields || fromOtherSite(request))
        return answerPage({ status: 400, error: "bad-request" }, email, text);
      return answerPage(await decide(d, request, fields), email, text);
    }
    if (!d) return Response.json({ error: "not-set-up" }, { status: 503 });
    let body: Body;
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return Response.json({ error: "bad-request" }, { status: 400 });
    }
    if (!body || typeof body !== "object")
      return Response.json({ error: "bad-request" }, { status: 400 });
    return json(await decide(d, request, body));
  };
}

function liveDeps(): ContactDeps | null {
  const key = process.env.RESEND_API_KEY,
    to = process.env.CONTACT_TO,
    url = process.env.DATABASE_URL,
    secret = process.env.TAG_SECRET;
  if (!key || !to || !url || !secret || secret.length < 32) return null;
  const sql = neon(url);
  return {
    secret,
    async sentToday(ipHash) {
      const r =
        await sql`select count(*)::int as n from sends where ip_hash = ${ipHash} and at > now() - interval '1 day'`;
      return r[0]!.n as number;
    },
    async count(ipHash) {
      await sql.transaction([
        sql`delete from sends where at < now() - interval '1 day'`,
        sql`insert into sends (ip_hash) values (${ipHash})`,
      ]);
    },
    async refund(ipHash) {
      await sql`delete from sends where ctid = (select ctid from sends where ip_hash = ${ipHash} order by at desc limit 1)`;
    },
    async mail({ replyTo, subject, text }) {
      try {
        const sent = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: process.env.CONTACT_FROM || "tlxq <onboarding@resend.dev>",
            to: [to],
            reply_to: replyTo,
            subject,
            text,
          }),
        });
        return sent.ok;
      } catch {
        return false;
      }
    },
  };
}

/** BotID's verdict; when the check itself fails, the message goes on (the per-address limit still holds). */
async function human(): Promise<boolean> {
  try {
    return !(await checkBotId()).isBot;
  } catch (e) {
    console.error("botid: check failed", (e as Error).message);
    return true;
  }
}

const live = contact(() => {
  const d = liveDeps();
  return d && { ...d, human };
});
export function POST(request: Request) {
  return live(request);
}

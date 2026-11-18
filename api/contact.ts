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
import { neon } from "@neondatabase/serverless";
import { createHash } from "node:crypto";

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
  mail(m: { replyTo: string; subject: string; text: string }): Promise<boolean>;
};

export function contact(deps: () => ContactDeps | null) {
  return async function POST(request: Request): Promise<Response> {
    const d = deps();
    if (!d) return Response.json({ error: "not-set-up" }, { status: 503 });
    let body: { name?: unknown; email?: unknown; message?: unknown; website?: unknown };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return Response.json({ error: "bad-request" }, { status: 400 });
    }
    if (!body || typeof body !== "object")
      return Response.json({ error: "bad-request" }, { status: 400 });
    // A field only robots fill in: they get a thank-you and nothing is sent.
    if (typeof body.website === "string" && body.website) return Response.json({ sent: true });
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const name = typeof body.name === "string" ? body.name.trim().slice(0, 100) : "";
    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (!EMAIL.test(email) || email.length > 200) {
      return Response.json({ error: "email" }, { status: 400 });
    }
    if (!message || message.length > LONGEST) {
      return Response.json({ error: "message" }, { status: 400 });
    }
    const ipHash = mailHash(request, d.secret);
    // Counted before it goes: a send the mail service turns down still used a call to it. No count, no
    // mail: when the database doesn't answer, nothing is sent.
    try {
      if ((await d.sentToday(ipHash)) >= MAIL_PER_ADDRESS) {
        return Response.json({ error: "too-many" }, { status: 429 });
      }
      await d.count(ipHash);
    } catch {
      return Response.json({ error: "mail-service" }, { status: 503 });
    }
    const sent = await d.mail({
      replyTo: email,
      subject: `Message from ${name ? `${name} <${email}>` : email}`,
      text: message,
    });
    if (!sent) return Response.json({ error: "mail-service" }, { status: 502 });
    return Response.json({ sent: true });
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

const live = contact(liveDeps);
export function POST(request: Request) {
  return live(request);
}

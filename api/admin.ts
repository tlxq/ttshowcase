/**
 * Tom's sign-in. The page /admin posts the key here; the right key gets a cookie (src/tags/admin.ts), a wrong one
 * is counted against the address (the tags' sends table, under its own "admin:" scramble, like the mail form's "mail:")
 * and answered with the same words. Sign out clears the cookie. Settings in Vercel: ADMIN_KEY, DATABASE_URL, TAG_SECRET.
 *
 *   POST /api/admin { key }           → 200 and the cookie, or 401 { error: "key" }, 429 { error: "too-many" }
 *   POST /api/admin { signout: true } → 200 and the cookie cleared
 *
 * Every call must come from our own page (header X-Admin: 1 and the site as Origin). Tests: src/tags/admin.test.ts.
 */
import { neon } from "@neondatabase/serverless";
import { createHash } from "node:crypto";
import {
  ADMIN_TRIES,
  adminToken,
  cookieLine,
  fromOurPage,
  sameKey,
  usable,
} from "../src/tags/admin.ts";

export type AdminDeps = {
  key: string;
  secret: string;
  /** Wrong keys tried from this address in the last day. */
  triedToday(ipHash: string): Promise<number>;
  /** Counts one more wrong key (and clears rows older than a day). */
  count(ipHash: string): Promise<void>;
};

/** The sender's address scrambled with the secret and "admin:", so it never counts with the tags' or the mail's sends. */
export function adminHash(request: Request, secret: string): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = (forwarded?.split(",")[0] || request.headers.get("x-real-ip") || "unknown").trim();
  return createHash("sha256")
    .update(secret + "admin:" + ip)
    .digest("base64url");
}

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  Response.json(body, { status, headers: { "Cache-Control": "private, no-store", ...headers } });

export function admin(deps: () => AdminDeps | null) {
  return async function POST(request: Request): Promise<Response> {
    const d = deps();
    if (!d) return json({ error: "not-set-up" }, 503);
    if (!fromOurPage(request)) return json({ error: "not-found" }, 403);
    let body: { key?: unknown; signout?: unknown };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return json({ error: "bad-request" }, 400);
    }
    if (!body || typeof body !== "object") return json({ error: "bad-request" }, 400);
    if (body.signout === true)
      return json({ ok: true }, 200, { "Set-Cookie": cookieLine(request, null) });
    const given = typeof body.key === "string" ? body.key.slice(0, 200) : "";
    const ipHash = adminHash(request, d.secret);
    try {
      if ((await d.triedToday(ipHash)) >= ADMIN_TRIES) return json({ error: "too-many" }, 429);
      if (sameKey(given, d.key)) {
        console.log("admin: signed in");
        return json({ ok: true }, 200, { "Set-Cookie": cookieLine(request, adminToken(d.key)) });
      }
      await d.count(ipHash);
    } catch {
      return json({ error: "store" }, 503);
    }
    console.log("admin: wrong key");
    return json({ error: "key" }, 401);
  };
}

function liveDeps(): AdminDeps | null {
  const key = process.env.ADMIN_KEY,
    url = process.env.DATABASE_URL,
    secret = process.env.TAG_SECRET;
  if (!usable(key) || !url || !secret || secret.length < 32) return null;
  const sql = neon(url);
  return {
    key,
    secret,
    async triedToday(ipHash) {
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
  };
}

const live = admin(liveDeps);
export function POST(request: Request) {
  return live(request);
}

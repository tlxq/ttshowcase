/**
 * The visitor wall's tags. A visitor draws a tag and sends it; it waits until Tom approves it from the mail he
 * gets, then it shows on the wall from the next visit. No accounts: a device id from the page and a hashed
 * address limit sends to 3 a day.
 *
 *   GET    /api/tags                      the approved tags, oldest first (the newest ones paint over them)
 *   GET    /api/tags?ids=a,b              where the visitor's own tags stand: waiting, up or removed
 *   POST   /api/tags                      send a tag → { id, removeKey }; Tom gets a mail with a review link
 *   DELETE /api/tags                      { id, removeKey }: the visitor takes their own tag down
 *   GET    /api/tags?review=<id>&sig=…    Tom's review page: the tag drawn, Approve and Remove
 *   POST   /api/tags?review=<id>&sig=…&do=approve|remove
 *
 * The review link is signed (TAG_SECRET), so only the mail opens it. Approving needs a button press: mail
 * scanners open links but never press buttons. Settings in Vercel: DATABASE_URL (Neon), TAG_SECRET,
 * RESEND_API_KEY, CONTACT_TO, CONTACT_FROM. Table: tools/tags/schema.sql. Tests: src/tags/tags.test.ts.
 */
import { neon } from "@neondatabase/serverless";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const PER_DAY = 3;
/** Waiting tags Tom hasn't looked at yet; past this, sending stops until he does, so his inbox can't flood. */
export const MOST_WAITING = 50;
/** Approved tags the wall gets: more than the visitor area fits (40), the oldest are painted over anyway. */
export const LIST_MOST = 60;
const MOST_POINTS = 4000;
const MOST_STROKES = 80;
const NAME_LONGEST = 24;

export type Status = "waiting" | "up" | "removed";
export type Spot = { x: number; y: number; w: number; turn: number };
export type NewTag = { name: string; pen: string; color: string; strokes: number[][] } & Spot;
export type Tag = NewTag & { id: string; created_at: string };

/** Everything the handlers need from the outside, so the tests can run them without a database or mail. */
export type Deps = {
  db: {
    sentSince(device: string, ipHash: string, hours: number): Promise<number>;
    waiting(): Promise<number>;
    insert(tag: NewTag & { device: string; ip_hash: string; remove_hash: string }): Promise<string>;
    drop(id: string): Promise<void>;
    get(id: string): Promise<(Tag & { status: Status; remove_hash: string }) | null>;
    setStatus(id: string, status: Status): Promise<void>;
    up(most: number): Promise<Tag[]>;
    statuses(ids: string[]): Promise<{ id: string; status: Status }[]>;
  };
  mail(subject: string, text: string): Promise<boolean>;
  secret: string;
};

const json = (body: unknown, status = 200) => Response.json(body, { status });
const sha = (s: string) => createHash("sha256").update(s).digest("base64url");
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function sign(secret: string, id: string): string {
  return createHmac("sha256", secret)
    .update("review:" + id)
    .digest("base64url");
}

export function signed(secret: string, id: string, sig: string | null): boolean {
  if (!sig || !UUID.test(id)) return false;
  const a = Buffer.from(sign(secret, id)),
    b = Buffer.from(sig);
  return a.length === b.length && timingSafeEqual(a, b);
}

const num = (v: unknown, lo: number, hi: number) =>
  typeof v === "number" && Number.isFinite(v) && v >= lo && v <= hi;

/**
 * A sent tag as it is stored, or the reason it isn't. Points are rounded to whole numbers and pressure to
 * 0..100, which keeps a tag at a few KB.
 */
export function readTag(body: Record<string, unknown>): NewTag | { error: string } {
  const name =
    typeof body.name === "string" ? body.name.replace(/[\p{Cc}\p{Cf}]/gu, "").trim() : "";
  if (name.length > NAME_LONGEST) return { error: "name" };
  if (typeof body.pen !== "string" || !/^[a-z]{2,12}$/.test(body.pen)) return { error: "pen" };
  const color = typeof body.color === "string" ? body.color.toLowerCase() : "";
  if (!/^#[0-9a-f]{6}$/.test(color)) return { error: "color" };
  const spot = body.spot as Record<string, unknown> | undefined;
  if (
    !spot ||
    !num(spot.x, -50, 50) ||
    !num(spot.y, 0, 20) ||
    !num(spot.w, 0.2, 6) ||
    !num(spot.turn, -45, 45)
  ) {
    return { error: "spot" };
  }
  const raw = body.strokes;
  if (!Array.isArray(raw) || raw.length < 1 || raw.length > MOST_STROKES)
    return { error: "strokes" };
  const strokes: number[][] = [];
  let points = 0;
  for (const s of raw) {
    if (!Array.isArray(s) || s.length < 4 || s.length % 4) return { error: "strokes" };
    const out: number[] = [];
    for (let i = 0; i < s.length; i += 4) {
      const [x, y, ms, p] = [s[i], s[i + 1], s[i + 2], s[i + 3]];
      if (
        !num(x, -10000, 10000) ||
        !num(y, -10000, 10000) ||
        !num(ms, 0, 600000) ||
        !num(p, 0, 1)
      ) {
        return { error: "strokes" };
      }
      out.push(
        Math.round(x as number),
        Math.round(y as number),
        Math.round(ms as number),
        Math.round((p as number) * 100),
      );
    }
    points += out.length / 4;
    strokes.push(out);
  }
  if (points > MOST_POINTS) return { error: "strokes" };
  const { x, y, w, turn } = spot as Spot;
  return { name, pen: body.pen, color, strokes, x, y, w, turn };
}

function address(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return (forwarded?.split(",")[0] || request.headers.get("x-real-ip") || "unknown").trim();
}

export function handlers(deps: () => Deps | null) {
  async function GET(request: Request): Promise<Response> {
    const d = deps();
    if (!d) return json({ error: "not-set-up" }, 503);
    const url = new URL(request.url);
    const review = url.searchParams.get("review");
    if (review !== null) return reviewPage(d, review, url.searchParams.get("sig"));
    const ids = url.searchParams.get("ids");
    if (ids !== null) {
      const list = ids
        .split(",")
        .filter((id) => UUID.test(id))
        .slice(0, 20);
      return json({ tags: list.length ? await d.db.statuses(list) : [] });
    }
    // Only these fields leave the server: never the device, the address hash or the remove key's hash.
    const tags = (await d.db.up(LIST_MOST)).map(
      ({ id, created_at, name, pen, color, strokes, x, y, w, turn }) => ({
        id,
        created_at,
        name,
        pen,
        color,
        strokes,
        x,
        y,
        w,
        turn,
      }),
    );
    return Response.json(
      { tags },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=600" } },
    );
  }

  async function POST(request: Request): Promise<Response> {
    const d = deps();
    if (!d) return json({ error: "not-set-up" }, 503);
    const url = new URL(request.url);
    const review = url.searchParams.get("review");
    if (review !== null)
      return reviewDo(d, review, url.searchParams.get("sig"), url.searchParams.get("do"));
    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return json({ error: "bad-request" }, 400);
    }
    if (!body || typeof body !== "object") return json({ error: "bad-request" }, 400);
    const device = typeof body.device === "string" ? body.device : "";
    if (!/^[\w-]{16,64}$/.test(device)) return json({ error: "device" }, 400);
    const tag = readTag(body);
    if ("error" in tag) return json(tag, 400);
    const ipHash = sha(d.secret + address(request));
    if ((await d.db.sentSince(device, ipHash, 24)) >= PER_DAY)
      return json({ error: "too-many" }, 429);
    if ((await d.db.waiting()) >= MOST_WAITING) return json({ error: "wall-busy" }, 503);
    const removeKey = randomBytes(18).toString("base64url");
    const id = await d.db.insert({ ...tag, device, ip_hash: ipHash, remove_hash: sha(removeKey) });
    const link = `${url.origin}/api/tags?review=${id}&sig=${sign(d.secret, id)}`;
    const who = tag.name || "someone without a name";
    const sent = await d.mail(
      `New tag on the wall from ${who}`,
      `${who} left a tag.\n\nLook at it and approve or remove it:\n${link}\n`,
    );
    if (!sent) {
      await d.db.drop(id);
      return json({ error: "mail-service" }, 502);
    }
    return json({ id, removeKey });
  }

  async function DELETE(request: Request): Promise<Response> {
    const d = deps();
    if (!d) return json({ error: "not-set-up" }, 503);
    let body: { id?: unknown; removeKey?: unknown };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return json({ error: "bad-request" }, 400);
    }
    const id = typeof body.id === "string" && UUID.test(body.id) ? body.id : "";
    const key = typeof body.removeKey === "string" ? body.removeKey : "";
    const tag = id ? await d.db.get(id) : null;
    if (!tag || !key) return json({ error: "not-found" }, 404);
    const a = Buffer.from(sha(key)),
      b = Buffer.from(tag.remove_hash);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return json({ error: "not-found" }, 404);
    await d.db.setStatus(id, "removed");
    return json({ removed: true });
  }

  return { GET, POST, DELETE };
}

const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );

function page(title: string, body: string, status = 200): Response {
  return new Response(
    `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">` +
      `<meta name="robots" content="noindex"><title>${esc(title)}</title>` +
      `<style>body{font:16px/1.5 system-ui,sans-serif;margin:0 auto;max-width:640px;padding:16px;background:#111;color:#eee}` +
      `canvas{width:100%;background:#d8d2c4;border-radius:8px}form{display:inline}` +
      `button{font:inherit;min-height:44px;padding:0 20px;margin:12px 8px 0 0;border:0;border-radius:8px;cursor:pointer}` +
      `.ok{background:#3c7;color:#000}.no{background:#c33;color:#fff}</style>${body}</html>`,
    {
      status,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "private, no-store",
        "X-Robots-Tag": "noindex, nofollow",
        "Referrer-Policy": "no-referrer",
      },
    },
  );
}

async function reviewPage(d: Deps, id: string, sig: string | null): Promise<Response> {
  if (!signed(d.secret, id, sig))
    return page("Not found", "<p>This link doesn't open anything.</p>", 404);
  const tag = await d.db.get(id);
  if (!tag) return page("Not found", "<p>This tag is gone.</p>", 404);
  const action = (what: string, label: string, cls: string) =>
    `<form method="post" action="/api/tags?review=${id}&amp;sig=${esc(sig!)}&amp;do=${what}"><button class="${cls}">${label}</button></form>`;
  const now = { waiting: "Waiting for you", up: "On the wall", removed: "Removed" }[tag.status];
  const draw = JSON.stringify({ strokes: tag.strokes, color: tag.color }).replace(/</g, "\\u003c");
  return page(
    `Tag from ${tag.name || "no name"}`,
    `<h1>${esc(tag.name || "No name")}</h1><p>${now} · sent ${esc(new Date(tag.created_at).toUTCString())}</p>` +
      `<canvas width="1200" height="600"></canvas>` +
      (tag.status !== "up" ? action("approve", "Approve", "ok") : "") +
      (tag.status !== "removed" ? action("remove", "Remove", "no") : "") +
      `<script>(()=>{const t=${draw},c=document.querySelector("canvas"),g=c.getContext("2d");` +
      `let a=1/0,b=1/0,e=-1/0,f=-1/0;for(const s of t.strokes)for(let i=0;i<s.length;i+=4){a=Math.min(a,s[i]);b=Math.min(b,s[i+1]);e=Math.max(e,s[i]);f=Math.max(f,s[i+1])}` +
      `const k=Math.min((c.width-80)/Math.max(e-a,1),(c.height-80)/Math.max(f-b,1)),ox=(c.width-(e-a)*k)/2,oy=(c.height-(f-b)*k)/2;` +
      `g.strokeStyle=t.color;g.lineCap=g.lineJoin="round";for(const s of t.strokes)for(let i=4;i<s.length;i+=4){` +
      `g.lineWidth=2+s[i+3]*.25;g.beginPath();g.moveTo(ox+(s[i-4]-a)*k,oy+(s[i-3]-b)*k);g.lineTo(ox+(s[i]-a)*k,oy+(s[i+1]-b)*k);g.stroke()}})()</script>`,
  );
}

async function reviewDo(
  d: Deps,
  id: string,
  sig: string | null,
  what: string | null,
): Promise<Response> {
  if (!signed(d.secret, id, sig))
    return page("Not found", "<p>This link doesn't open anything.</p>", 404);
  if (what !== "approve" && what !== "remove")
    return page("Not found", "<p>Nothing to do.</p>", 400);
  if (!(await d.db.get(id))) return page("Not found", "<p>This tag is gone.</p>", 404);
  await d.db.setStatus(id, what === "approve" ? "up" : "removed");
  return what === "approve"
    ? page("Approved", "<p>Approved. It shows on the wall from the next visit.</p>")
    : page("Removed", "<p>Removed. It won't show on the wall.</p>");
}

function liveDeps(): Deps | null {
  const url = process.env.DATABASE_URL,
    secret = process.env.TAG_SECRET;
  const key = process.env.RESEND_API_KEY,
    to = process.env.CONTACT_TO;
  if (!url || !secret || secret.length < 32 || !key || !to) return null;
  const sql = neon(url);
  const COLS = "id, created_at, name, pen, color, strokes, x, y, w, turn";
  return {
    secret,
    db: {
      async sentSince(device, ipHash, hours) {
        const r =
          await sql`select count(*)::int as n from tags where created_at > now() - make_interval(hours => ${hours}) and (device = ${device} or ip_hash = ${ipHash})`;
        return r[0]!.n as number;
      },
      async waiting() {
        const r = await sql`select count(*)::int as n from tags where status = 'waiting'`;
        return r[0]!.n as number;
      },
      async insert(t) {
        const r =
          await sql`insert into tags (name, pen, color, strokes, x, y, w, turn, device, ip_hash, remove_hash)
          values (${t.name}, ${t.pen}, ${t.color}, ${JSON.stringify(t.strokes)}::jsonb, ${t.x}, ${t.y}, ${t.w}, ${t.turn}, ${t.device}, ${t.ip_hash}, ${t.remove_hash})
          returning id`;
        return r[0]!.id as string;
      },
      async drop(id) {
        await sql`delete from tags where id = ${id}`;
      },
      async get(id) {
        const r = await sql.query(`select ${COLS}, status, remove_hash from tags where id = $1`, [
          id,
        ]);
        return (r[0] as (Tag & { status: Status; remove_hash: string }) | undefined) ?? null;
      },
      async setStatus(id, status) {
        await sql`update tags set status = ${status} where id = ${id}`;
      },
      async up(most) {
        const r = await sql.query(
          `select * from (select ${COLS} from tags where status = 'up' order by created_at desc limit $1) t order by created_at`,
          [most],
        );
        return r as Tag[];
      },
      async statuses(ids) {
        const r = await sql`select id, status from tags where id = any(${ids}::uuid[])`;
        return r as { id: string; status: Status }[];
      },
    },
    async mail(subject, text) {
      try {
        const sent = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: process.env.CONTACT_FROM || "tlxq <onboarding@resend.dev>",
            to: [to],
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

const live = handlers(liveDeps);
export function GET(request: Request) {
  return live.GET(request);
}
export function POST(request: Request) {
  return live.POST(request);
}
export function DELETE(request: Request) {
  return live.DELETE(request);
}

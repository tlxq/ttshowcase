/**
 * The visitor wall's tags. A visitor picks a spot, draws one tag and sends it. Their own browser keeps the tag
 * and shows it on their wall at once, as if it were up; everyone else sees it only after Tom approves it from
 * the mail he gets. While it waits, it holds its spot: nobody else can tag over it. Tom's Remove deletes it,
 * which frees the spot and lets that visitor tag again. No accounts: one tag per device id, and a scrambled
 * address stops robots (a few a day per address).
 *
 *   GET  /api/tags                      approved tags (oldest first, the newest paint over them) + held spots
 *   GET  /api/tags?ids=a                whether the visitor's own tag is still there: waiting or up
 *   POST /api/tags                      send a tag → { id }; Tom gets a mail with a review link
 *   GET  /api/tags?review=<id>&sig=…    Tom's review page: the tag drawn, Approve and Remove
 *   POST /api/tags?review=<id>&sig=…&do=approve|remove
 *
 * The review link is signed (TAG_SECRET), so only the mail opens it. Approving needs a button press: mail
 * scanners open links but never press buttons. Settings in Vercel: DATABASE_URL (Neon), TAG_SECRET,
 * RESEND_API_KEY, CONTACT_TO, CONTACT_FROM. Table: tools/tags/schema.sql. Tests: src/tags/tags.test.ts.
 */
import { neon } from "@neondatabase/serverless";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/** Tags one address may send in a day: a family or an office on one Wi-Fi still fits, a robot doesn't. */
export const PER_ADDRESS = 5;
/** Waiting tags Tom hasn't looked at yet; past this, sending stops until he does, so his inbox can't flood. */
export const MOST_WAITING = 50;
/** Approved tags the wall gets: more than the visitor area fits (40), the oldest are painted over anyway. */
export const LIST_MOST = 60;
const MOST_POINTS = 4000;
const MOST_STROKES = 80;
const NAME_LONGEST = 24;

export type Status = "waiting" | "up";
/** Where the tag sits on the wall, in metres: its middle, its size, and how far it is turned. */
export type Spot = { x: number; y: number; w: number; h: number; turn: number };
export type NewTag = { name: string; pen: string; color: string; strokes: number[][] } & Spot;
export type Tag = NewTag & { id: string; created_at: string };

/** Everything the handlers need from the outside, so the tests can run them without a database or mail. */
export type Deps = {
  db: {
    /** Tags this device has on the wall or waiting (a removed tag is deleted, so it doesn't count). */
    byDevice(device: string): Promise<number>;
    /** Tags sent from this address in the last day, removed ones included. */
    byAddress(ipHash: string): Promise<number>;
    waiting(): Promise<number>;
    /** Spots taken by waiting tags and by the approved tags the wall shows. */
    taken(): Promise<Spot[]>;
    held(): Promise<Spot[]>;
    /** The new tag's id, or null when this device already has one (two sends at the same moment). */
    insert(tag: NewTag & { device: string; ip_hash: string }): Promise<string | null>;
    drop(id: string): Promise<void>;
    get(id: string): Promise<(Tag & { status: Status }) | null>;
    approve(id: string): Promise<void>;
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

/** Two spots overlap when their boxes do (the small turn is left out: a tag's box already has air around it). */
export function overlaps(a: Spot, b: Spot): boolean {
  return Math.abs(a.x - b.x) < (a.w + b.w) / 2 && Math.abs(a.y - b.y) < (a.h + b.h) / 2;
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
    !num(spot.h, 0.2, 4) ||
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
  const { x, y, w, h, turn } = spot as Spot;
  return { name, pen: body.pen, color, strokes, x, y, w, h, turn };
}

function address(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return (forwarded?.split(",")[0] || request.headers.get("x-real-ip") || "unknown").trim();
}

const spotOf = ({ x, y, w, h, turn }: Spot): Spot => ({ x, y, w, h, turn });

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
        .slice(0, 5);
      return Response.json(
        { tags: list.length ? await d.db.statuses(list) : [] },
        { headers: { "Cache-Control": "private, no-store" } },
      );
    }
    // Only these fields leave the server: never the device or the address hash. Held spots carry no tag.
    const tags = (await d.db.up(LIST_MOST)).map(
      ({ id, created_at, name, pen, color, strokes, ...spot }) => ({
        id,
        created_at,
        name,
        pen,
        color,
        strokes,
        ...spotOf(spot),
      }),
    );
    const held = (await d.db.held()).map(spotOf);
    return Response.json(
      { tags, held },
      { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=300" } },
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
    if ((await d.db.byDevice(device)) > 0) return json({ error: "one-tag" }, 409);
    const ipHash = sha(d.secret + address(request));
    if ((await d.db.byAddress(ipHash)) >= PER_ADDRESS) return json({ error: "too-many" }, 429);
    if ((await d.db.waiting()) >= MOST_WAITING) return json({ error: "wall-busy" }, 503);
    if ((await d.db.taken()).some((s) => overlaps(s, tag)))
      return json({ error: "spot-taken" }, 409);
    const id = await d.db.insert({ ...tag, device, ip_hash: ipHash });
    if (!id) return json({ error: "one-tag" }, 409);
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
    return json({ id });
  }

  return { GET, POST };
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

const gone = () => page("Not found", "<p>This tag is gone.</p>", 404);
const badLink = () => page("Not found", "<p>This link doesn't open anything.</p>", 404);

async function reviewPage(d: Deps, id: string, sig: string | null): Promise<Response> {
  if (!signed(d.secret, id, sig)) return badLink();
  const tag = await d.db.get(id);
  if (!tag) return gone();
  const action = (what: string, label: string, cls: string) =>
    `<form method="post" action="/api/tags?review=${id}&amp;sig=${esc(sig!)}&amp;do=${what}"><button class="${cls}">${label}</button></form>`;
  const now = tag.status === "up" ? "On the wall" : "Waiting for you";
  const draw = JSON.stringify({ strokes: tag.strokes, color: tag.color }).replace(/</g, "\\u003c");
  return page(
    `Tag from ${tag.name || "no name"}`,
    `<h1>${esc(tag.name || "No name")}</h1><p>${now} · sent ${esc(new Date(tag.created_at).toUTCString())}</p>` +
      `<canvas width="1200" height="600"></canvas>` +
      (tag.status === "waiting" ? action("approve", "Approve", "ok") : "") +
      action("remove", "Remove", "no") +
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
  if (!signed(d.secret, id, sig)) return badLink();
  if (what !== "approve" && what !== "remove")
    return page("Not found", "<p>Nothing to do.</p>", 400);
  if (!(await d.db.get(id))) return gone();
  if (what === "approve") {
    await d.db.approve(id);
    return page("Approved", "<p>Approved. Everyone sees it on the wall from their next visit.</p>");
  }
  await d.db.drop(id);
  return page("Removed", "<p>Removed. The spot is free again.</p>");
}

function liveDeps(): Deps | null {
  const url = process.env.DATABASE_URL,
    secret = process.env.TAG_SECRET;
  const key = process.env.RESEND_API_KEY,
    to = process.env.CONTACT_TO;
  if (!url || !secret || secret.length < 32 || !key || !to) return null;
  const sql = neon(url);
  const COLS = "id, created_at, name, pen, color, strokes, x, y, w, h, turn";
  return {
    secret,
    db: {
      async byDevice(device) {
        const r = await sql`select count(*)::int as n from tags where device = ${device}`;
        return r[0]!.n as number;
      },
      async byAddress(ipHash) {
        const r =
          await sql`select count(*)::int as n from sends where ip_hash = ${ipHash} and at > now() - interval '1 day'`;
        return r[0]!.n as number;
      },
      async waiting() {
        const r = await sql`select count(*)::int as n from tags where status = 'waiting'`;
        return r[0]!.n as number;
      },
      async taken() {
        const r = await sql.query(
          `select x, y, w, h, turn from tags where status = 'waiting'
           union all select x, y, w, h, turn from (select * from tags where status = 'up' order by created_at desc limit $1) t`,
          [LIST_MOST],
        );
        return r as Spot[];
      },
      async held() {
        const r = await sql`select x, y, w, h, turn from tags where status = 'waiting'`;
        return r as Spot[];
      },
      async insert(t) {
        // The address count lives in its own table, so a removed tag still counts for the day; rows older than
        // a day are cleared on every send.
        let r;
        try {
          [, , r] = await sql.transaction([
            sql`delete from sends where at < now() - interval '1 day'`,
            sql`insert into sends (ip_hash) values (${t.ip_hash})`,
            sql`insert into tags (name, pen, color, strokes, x, y, w, h, turn, device)
              values (${t.name}, ${t.pen}, ${t.color}, ${JSON.stringify(t.strokes)}::jsonb, ${t.x}, ${t.y}, ${t.w}, ${t.h}, ${t.turn}, ${t.device})
              returning id`,
          ]);
        } catch (e) {
          if ((e as { code?: string }).code === "23505") return null; // tags_one_per_device
          throw e;
        }
        return r![0]!.id as string;
      },
      async drop(id) {
        await sql`delete from tags where id = ${id}`;
      },
      async get(id) {
        const r = await sql.query(`select ${COLS}, status from tags where id = $1`, [id]);
        return (r[0] as (Tag & { status: Status }) | undefined) ?? null;
      },
      async approve(id) {
        await sql`update tags set status = 'up' where id = ${id}`;
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

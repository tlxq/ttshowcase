/**
 * The visitor wall's tags. A visitor picks a spot, draws one tag and sends it. Their own browser keeps the tag
 * and shows it on their wall at once, as if it were up; everyone else sees it only after Tom approves it from
 * the mail he gets. While it waits, it holds its spot: nobody else can tag over it. Tom's Remove deletes it,
 * which frees the spot and lets that visitor tag again. An approved tag holds nothing: a new tag may go over it
 * (the old one stays under it). No accounts: one tag per device id, and a scrambled
 * address stops robots (a few a day per address).
 *
 *   GET  /api/tags                      approved tags (oldest first, the newest paint over them) + held spots
 *   GET  /api/tags?ids=a                whether the visitor's own tag is still there: waiting or up
 *   POST /api/tags                      send { name, device, spot, strokes } → { id }; Tom gets a mail with a review link
 *   GET  /api/tags?review=<id>&sig=…    Tom's review page: the tag drawn, Approve and Remove
 *   POST /api/tags?review=<id>&sig=…&do=approve|remove
 *
 *   GET  /api/tags?admin=1              with Tom's cookie (api/admin.ts): every tag, waiting ones too, with its status; else the public answer
 *   POST /api/tags?admin=1              with Tom's cookie, the header X-Admin: 1 and this site as Origin: { do: "approve" | "remove" | "update" | "create", ... }
 *
 * The review link is signed (TAG_SECRET), so only the mail opens it. Approving needs a button press: mail
 * scanners open links but never press buttons. Settings in Vercel: DATABASE_URL (Neon), TAG_SECRET,
 * RESEND_API_KEY, CONTACT_TO, CONTACT_FROM, and ADMIN_KEY for Tom's own wall. Table: tools/tags/schema.sql. Tests: src/tags/tags.test.ts.
 */
import { neon } from "@neondatabase/serverless";
import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fromOurPage, isAdmin, usable } from "../src/tags/admin.ts";

/** Tags one address may send in a day: a family or an office on one Wi-Fi still fits, a robot doesn't. */
export const PER_ADDRESS = 5;
/** Waiting tags Tom hasn't looked at yet; past this, sending stops until he does, so his inbox can't flood. */
export const MOST_WAITING = 50;
/** Approved tags the wall gets: more than the visitor area fits (40), the oldest are painted over anyway. */
export const LIST_MOST = 60;
/**
 * What one tag may hold. The pitch's tag tool and its loader use the same numbers: tools/pitch/build.mjs puts
 * them into the page, so the two can't drift apart (src/tags/tags.test.ts checks the tool ids too).
 */
export const TAG_LIMITS = {
  strokes: 80,
  points: 4000,
  drips: 200,
  dripsTotal: 400, // a whole tag: real drawing makes a few to a few dozen
  dripMm: 1000,
  dripSide: 50,
  name: 24,
  tools: ["skinny", "fat", "mop", "chisel", "pen"],
};

/** Where the wall is on the site: the mail's second link opens it on the wall itself. One constant, so the launch can move it. */
export const WALL_PATH = "/next";

export type Status = "waiting" | "up";
/** Where the tag sits on the wall, in metres: its middle, its size, and how far it is turned. */
export type Spot = { x: number; y: number; w: number; h: number; turn: number };
/**
 * One stroke as the tag tool makes it, with its own tool and colour. pts is [u, v, ms, pressure, ...], four numbers a
 * point: u and v in tag pixels (320 a metre, the frame is 2.4 x 1.35 m), ms since the tag was started, pressure 0..1
 * with two decimals (the tool's own number; a mouse is 0.5). dr is the drips: [index into pts, length in mm, side offset in px].
 */
export type Stroke = { tool: string; col: string; seed: number; pts: number[]; dr: number[][] };
export type NewTag = { name: string; strokes: Stroke[] } & Spot;
export type Tag = NewTag & { id: string; created_at: string };

/** Everything the handlers need from the outside, so the tests can run them without a database or mail. */
export type Deps = {
  db: {
    /** Tags this device has on the wall or waiting (a removed tag is deleted, so it doesn't count). */
    byDevice(device: string): Promise<number>;
    /** Tags sent from this address in the last day, removed ones included. */
    byAddress(ipHash: string): Promise<number>;
    waiting(): Promise<number>;
    /**
     * Spots held by waiting tags: nobody may tag over them until Tom decides. Approved tags hold nothing, so a
     * new tag may go over one (the old one stays under it).
     */
    held(): Promise<Spot[]>;
    /** The new tag's id, or null when this device already has one (two sends at the same moment). */
    insert(tag: NewTag & { device: string; ip_hash: string }): Promise<string | null>;
    /** Takes back the address's latest send: the tag never reached Tom (the mail failed), so it must not use up the day's quota. */
    refund(ipHash: string): Promise<void>;
    drop(id: string): Promise<void>;
    get(id: string): Promise<(Tag & { status: Status }) | null>;
    approve(id: string): Promise<void>;
    /** Tom's wall: every waiting tag and the newest approved ones, oldest first. */
    everything(most: number): Promise<(Tag & { status: Status })[]>;
    /** Tom moved, sized or turned a tag. */
    update(id: string, spot: Spot): Promise<void>;
    /** Tom's own tag: no address, no count, no mail; its device starts with "tom:". */
    insertUp(tag: NewTag & { device: string; status: Status }): Promise<string>;
    up(most: number): Promise<Tag[]>;
    statuses(ids: string[]): Promise<{ id: string; status: Status }[]>;
  };
  mail(subject: string, text: string): Promise<boolean>;
  secret: string;
  /** Tom's key (ADMIN_KEY); without it nothing on the admin side answers. */
  adminKey?: string | null;
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

const whole = (v: unknown, lo: number, hi: number) => Number.isInteger(v) && num(v, lo, hi);

/**
 * The strokes of a sent tag as they are stored, or null when one is wrong. Same rules as the pitch's loader. Points and
 * times are whole numbers, pressure has two decimals, drips are whole numbers: a tag stays a few KB.
 */
export function readStrokes(raw: unknown): Stroke[] | null {
  const L = TAG_LIMITS;
  if (!Array.isArray(raw) || raw.length < 1 || raw.length > L.strokes) return null;
  const strokes: Stroke[] = [];
  let points = 0,
    dripsAll = 0;
  for (const s of raw as Record<string, unknown>[]) {
    if (!s || typeof s !== "object") return null;
    if (typeof s.tool !== "string" || !L.tools.includes(s.tool)) return null;
    const col = typeof s.col === "string" ? s.col.toLowerCase() : "";
    if (!/^#[0-9a-f]{6}$/.test(col)) return null;
    if (!whole(s.seed, 0, 2147483647)) return null;
    const p = s.pts;
    if (!Array.isArray(p) || p.length < 4 || p.length % 4) return null;
    const pts: number[] = [];
    for (let i = 0; i < p.length; i += 4) {
      const [u, v, ms, pr] = [p[i], p[i + 1], p[i + 2], p[i + 3]];
      if (
        !num(u, -10000, 10000) ||
        !num(v, -10000, 10000) ||
        !num(ms, 0, 3600000) ||
        !num(pr, 0, 1)
      )
        return null;
      pts.push(
        Math.round(u as number),
        Math.round(v as number),
        Math.round(ms as number),
        Math.round((pr as number) * 100) / 100,
      );
    }
    points += pts.length / 4;
    if (points > L.points) return null;
    const dr: number[][] = [];
    if (s.dr !== undefined) {
      if (!Array.isArray(s.dr) || s.dr.length > L.drips) return null;
      dripsAll += s.dr.length;
      if (dripsAll > L.dripsTotal) return null;
      for (const d of s.dr) {
        if (!Array.isArray(d) || d.length !== 3) return null;
        if (!whole(d[0], 0, pts.length - 1) || (d[0] as number) % 4) return null;
        if (!num(d[1], 0.5, L.dripMm - 0.5) || !num(d[2], -L.dripSide + 0.5, L.dripSide - 0.5))
          return null;
        dr.push([d[0] as number, Math.round(d[1] as number), Math.round(d[2] as number)]);
      }
    }
    strokes.push({ tool: s.tool, col, seed: s.seed as number, pts, dr });
  }
  return strokes;
}

/** A spot as the wall takes it, or null when a number is wrong. */
export function readSpot(raw: unknown): Spot | null {
  const spot = raw as Record<string, unknown> | undefined;
  if (
    !spot ||
    !num(spot.x, -50, 50) ||
    !num(spot.y, -5, 20) || // the wall starts at -2.2 m: a tag low on it sits below 0
    !num(spot.w, 0.2, 6) ||
    !num(spot.h, 0.2, 4) ||
    !num(spot.turn, -45, 45)
  )
    return null;
  const { x, y, w, h, turn } = spot as Spot;
  return { x, y, w, h, turn };
}

/** A sent tag as it is stored, or the reason it isn't. */
export function readTag(body: Record<string, unknown>): NewTag | { error: string } {
  const name =
    typeof body.name === "string" ? body.name.replace(/[\p{Cc}\p{Cf}]/gu, "").trim() : "";
  if (name.length > TAG_LIMITS.name) return { error: "name" };
  const spot = readSpot(body.spot);
  if (!spot) return { error: "spot" };
  const strokes = readStrokes(body.strokes);
  if (!strokes) return { error: "strokes" };
  return { name, strokes, ...spot };
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
    // Tom's cookie: every tag with its status. Anyone else gets the public answer below, as if the question was never asked.
    if (url.searchParams.has("admin") && isAdmin(request, d.adminKey)) {
      const all = (await d.db.everything(LIST_MOST)).map(
        ({ id, created_at, name, strokes, status, ...spot }) => ({
          id,
          created_at,
          name,
          strokes,
          status,
          ...spotOf(spot),
        }),
      );
      return Response.json(
        { admin: true, tags: all, held: [] },
        { headers: { "Cache-Control": "private, no-store" } },
      );
    }
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
    const tags = (await d.db.up(LIST_MOST)).map(({ id, created_at, name, strokes, ...spot }) => ({
      id,
      created_at,
      name,
      strokes,
      ...spotOf(spot),
    }));
    const held = (await d.db.held()).map(spotOf);
    return Response.json(
      { tags, held },
      {
        headers: {
          // an address with ?admin= from someone without the cookie is never kept by a shared cache
          "Cache-Control": url.searchParams.has("admin")
            ? "private, no-store"
            : "public, s-maxage=30, stale-while-revalidate=300",
        },
      },
    );
  }

  async function POST(request: Request): Promise<Response> {
    try {
      return await post(request);
    } catch (e) {
      // e.g. the table still has the old NOT NULL columns (tools/tags/schema.sql step 1 not run): say so in the log, not just a bare 500
      const err = e as { code?: string; message?: string };
      console.error("tags: store failed", err.code, err.message);
      return json({ error: "store" }, 500);
    }
  }

  async function post(request: Request): Promise<Response> {
    const d = deps();
    if (!d) return json({ error: "not-set-up" }, 503);
    const url = new URL(request.url);
    if (url.searchParams.has("admin")) return adminDo(d, request);
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
    if ((await d.db.held()).some((s) => overlaps(s, tag)))
      return json({ error: "spot-taken" }, 409);
    const id = await d.db.insert({ ...tag, device, ip_hash: ipHash });
    if (!id) return json({ error: "one-tag" }, 409);
    const link = `${url.origin}/api/tags?review=${id}&sig=${sign(d.secret, id)}`;
    const who = tag.name || "someone without a name";
    const sent = await d.mail(
      `New tag on the wall from ${who}`,
      `${who} left a tag.\n\nLook at it and approve or remove it:\n${link}\n\n` +
        `Open it on the wall: ${url.origin}${WALL_PATH}?tag=${id}\n`,
    );
    if (!sent) {
      await d.db.drop(id);
      await d.db.refund(ipHash);
      return json({ error: "mail-service" }, 502);
    }
    return json({ id });
  }

  return { GET, POST };
}

/** The new size keeps the frame's shape (16 by 9), so a tag is never squashed. */
const SHAPE = 2.4 / 1.35;
const shapeOk = (s: Spot) => Math.abs(s.w / s.h - SHAPE) < 0.03;

/** Tom's actions. Cookie first (anyone else gets the same answer as for an address that isn't here), then the page the call came from. */
async function adminDo(d: Deps, request: Request): Promise<Response> {
  if (!usable(d.adminKey) || !isAdmin(request, d.adminKey))
    return json({ error: "not-found" }, 404);
  if (!fromOurPage(request)) return json({ error: "origin" }, 403);
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ error: "bad-request" }, 400);
  }
  if (!body || typeof body !== "object") return json({ error: "bad-request" }, 400);
  const what = body.do;
  if (what === "create") {
    const tag = readTag(body);
    if ("error" in tag) return json(tag, 400);
    if (!shapeOk(tag)) return json({ error: "spot" }, 400);
    // a restored tag (Undo after Remove) may go back as waiting; a new one goes up at once
    const status: Status = body.status === "waiting" ? "waiting" : "up";
    const id = await d.db.insertUp({ ...tag, device: "tom:" + randomUUID(), status });
    console.log("admin: create", id, status);
    return json({ id });
  }
  const id = typeof body.id === "string" ? body.id : "";
  if (!UUID.test(id)) return json({ error: "id" }, 400);
  if (what !== "approve" && what !== "remove" && what !== "update")
    return json({ error: "do" }, 400);
  if (!(await d.db.get(id))) return json({ error: "gone" }, 404);
  if (what === "approve") await d.db.approve(id);
  else if (what === "remove") await d.db.drop(id);
  else {
    const spot = readSpot(body.spot);
    if (!spot || !shapeOk(spot)) return json({ error: "spot" }, 400);
    await d.db.update(id, spot);
  }
  console.log("admin:", what, id);
  return json({ ok: true });
}

const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );

/** The site's one token file, put on the review page as is; the page's own rules only use its values.
 * vercel.json ships the file with this function. */
let tokens: string | undefined;
const tokenCss = () =>
  (tokens ??= readFileSync(join(process.cwd(), "src/design/tokens.css"), "utf8"));

/** The review page's look, built only from tokens.css. */
export const REVIEW_CSS =
  "body{font:var(--look-reading)/1.5 sans-serif;margin:0 auto;max-width:var(--look-form);" +
  "padding:var(--s3) var(--gutter);background:var(--look-ground);color:var(--look-text)}" +
  "h1{margin:0 0 var(--s1)}.quiet{color:var(--look-quiet)}" +
  "canvas{display:block;width:100%;margin-top:var(--s2);background:var(--wall-bone)}form{display:inline}" +
  "button{font:inherit;min-height:var(--tap);padding:0 var(--s3);margin:var(--s2) var(--s1) 0 0;cursor:pointer;" +
  "background:none;color:var(--look-text);border:thin solid var(--look-rule)}" +
  ".ok{background:var(--look-spray);border-color:var(--look-spray);color:var(--look-dark)}";

function page(title: string, body: string, status = 200): Response {
  return new Response(
    `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">` +
      `<meta name="robots" content="noindex"><title>${esc(title)}</title>` +
      `<style>${tokenCss()}</style><style>${REVIEW_CSS}</style><body class="lk">${body}</body></html>`,
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
  const draw = JSON.stringify(tag.strokes).replace(/</g, "\\u003c");
  // A plain picture of the tag for the mail's reader: every stroke in its own colour as a line, its drips as short lines.
  // The widths are each tool's mark radius in tag pixels (the pitch's tools); pressure, mist and wetness are left out.
  const script =
    `(()=>{const t=${draw}.filter(s=>s&&s.pts),c=document.querySelector("canvas"),g=c.getContext("2d"),R={skinny:5,fat:16,mop:9,chisel:11,pen:2};` +
    `let a=1/0,b=1/0,e=-1/0,f=-1/0;const at=(x,y)=>{a=Math.min(a,x);b=Math.min(b,y);e=Math.max(e,x);f=Math.max(f,y)};` +
    `for(const s of t){for(let i=0;i<s.pts.length;i+=4)at(s.pts[i],s.pts[i+1]);for(const d of s.dr||[])at(s.pts[d[0]]+d[2],s.pts[d[0]+1]+d[1]*.32)}` +
    `const k=Math.min((c.width-80)/Math.max(e-a,1),(c.height-80)/Math.max(f-b,1)),ox=(c.width-(e-a)*k)/2-a*k,oy=(c.height-(f-b)*k)/2-b*k;` +
    `g.lineCap=g.lineJoin="round";for(const s of t){const r=R[s.tool]||5,p=s.pts;g.strokeStyle=g.fillStyle=s.col;g.lineWidth=Math.max(2,r*k*1.4);g.beginPath();` +
    `g.moveTo(ox+p[0]*k,oy+p[1]*k);for(let i=4;i<p.length;i+=4)g.lineTo(ox+p[i]*k,oy+p[i+1]*k);if(p.length==4)g.lineTo(ox+p[0]*k+.1,oy+p[1]*k);g.stroke();` +
    `g.lineWidth=Math.max(1.5,r*k*.5);for(const d of s.dr||[]){const x=ox+(p[d[0]]+d[2])*k,y=oy+p[d[0]+1]*k;g.beginPath();g.moveTo(x,y);g.lineTo(x,y+d[1]*.32*k);g.stroke()}}})()`;
  return page(
    `Tag from ${tag.name || "no name"}`,
    `<h1>${esc(tag.name || "No name")}</h1><p class="quiet">${now} · sent ${esc(new Date(tag.created_at).toUTCString())}</p>` +
      `<canvas width="1200" height="600"></canvas>` +
      (tag.status === "waiting" ? action("approve", "Approve", "ok") : "") +
      action("remove", "Remove", "") +
      `<script>${script}</script>`,
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
  const COLS = "id, created_at, name, strokes, x, y, w, h, turn";
  return {
    secret,
    adminKey: process.env.ADMIN_KEY ?? null,
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
            sql`insert into tags (name, strokes, x, y, w, h, turn, device)
              values (${t.name}, ${JSON.stringify(t.strokes)}::jsonb, ${t.x}, ${t.y}, ${t.w}, ${t.h}, ${t.turn}, ${t.device})
              returning id`,
          ]);
        } catch (e) {
          if ((e as { code?: string }).code === "23505") return null; // tags_one_per_device
          throw e;
        }
        return r![0]!.id as string;
      },
      async refund(ipHash) {
        await sql`delete from sends where ctid = (select ctid from sends where ip_hash = ${ipHash} order by at desc limit 1)`;
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
      async everything(most) {
        const r = await sql.query(
          `select ${COLS}, status from tags where status = 'waiting' or id in (select id from tags where status = 'up' order by created_at desc limit $1) order by created_at`,
          [most],
        );
        return r as (Tag & { status: Status })[];
      },
      async update(id, s) {
        await sql`update tags set x = ${s.x}, y = ${s.y}, w = ${s.w}, h = ${s.h}, turn = ${s.turn} where id = ${id}`;
      },
      async insertUp(t) {
        const r = await sql`insert into tags (name, strokes, x, y, w, h, turn, device, status)
          values (${t.name}, ${JSON.stringify(t.strokes)}::jsonb, ${t.x}, ${t.y}, ${t.w}, ${t.h}, ${t.turn}, ${t.device}, ${t.status})
          returning id`;
        return r[0]!.id as string;
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

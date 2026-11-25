import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { readParts } from "../../tools/pitch/paint-parts.mjs";
import { ADMIN_Y_MIN, handlers, VISITOR_Y_MIN, WALL_GROUND, WALL_PATH } from "../../api/tags.ts";
import { admin, adminHash } from "../../api/admin.ts";
import {
  ADMIN_COOKIE,
  ADMIN_TRIES,
  adminToken,
  cookieLine,
  cookieValue,
  fromOurPage,
  isAdmin,
  sameKey,
} from "./admin.ts";
import { memoryDeps } from "./memory.ts";

const SECRET = "x".repeat(40);
const KEY = "test-admin-key-0123456789abcdef";
const SITE = "https://ttdevs.com";

function world() {
  const mails: { subject: string; text: string }[] = [];
  const { rows, sends, deps } = memoryDeps(
    SECRET,
    async (subject, text) => (mails.push({ subject, text }), true),
    KEY,
  );
  const tries: string[] = [];
  const login = admin(() => ({
    key: KEY,
    secret: SECRET,
    triedToday: async (h) => tries.filter((t) => t === h).length,
    count: async (h) => void tries.push(h),
  }));
  return { rows, sends, mails, tries, api: handlers(() => deps), login };
}

const COOKIE = `${ADMIN_COOKIE}=${adminToken(KEY)}`;
const from = (path: string, init: RequestInit = {}, headers: Record<string, string> = {}) =>
  new Request(SITE + path, {
    ...init,
    headers: { "x-forwarded-for": "9.9.9.9", "Content-Type": "application/json", ...headers },
  });
/** A call from Tom's own page: cookie, custom header, the site as origin. */
const tom = (body: unknown, headers: Record<string, string> = {}) =>
  from(
    "/api/tags?admin=1",
    { method: "POST", body: JSON.stringify(body) },
    { cookie: COOKIE, "x-admin": "1", origin: SITE, ...headers },
  );
const signin = (body: unknown, headers: Record<string, string> = {}) =>
  from(
    "/api/admin",
    { method: "POST", body: JSON.stringify(body) },
    { "x-admin": "1", origin: SITE, ...headers },
  );
const stroke = {
  tool: "fat",
  col: "#e8452c",
  seed: 1,
  pts: [0, 0, 0, 0.5, 10, 20, 16, 0.5],
  dr: [],
};
const spot = (extra: Record<string, number> = {}) => ({
  x: -12,
  y: 3,
  w: 2.4,
  h: 1.35,
  turn: 0,
  ...extra,
});
const newTag = (extra: Record<string, unknown> = {}) => ({
  do: "create",
  name: "Tom",
  spot: spot(),
  strokes: [stroke],
  ...extra,
});

test("the cookie holds a scramble of the key, never the key", () => {
  assert.equal(adminToken(KEY).includes(KEY), false);
  assert.equal(adminToken(KEY), adminToken(KEY));
  assert.notEqual(adminToken(KEY), adminToken(KEY + "x"));
  const line = cookieLine(from("/api/admin"), adminToken(KEY));
  assert.match(line, /HttpOnly/);
  assert.match(line, /Secure/);
  assert.match(line, /SameSite=Strict/);
  assert.match(line, /Path=\//);
  assert.match(line, /Max-Age=31536000/);
  assert.equal(line.includes(KEY), false);
  assert.match(cookieLine(from("/api/admin"), null), /Max-Age=0/);
  assert.equal(
    cookieLine(new Request("http://127.0.0.1:1/api/admin"), "t").includes("Secure"),
    false,
    "plain http (this PC) can't keep a Secure cookie everywhere",
  );
});

test("the cookie is Tom's only for the key it was made with", () => {
  const withCookie = (v: string) => from("/", {}, { cookie: `a=1; ${ADMIN_COOKIE}=${v}; b=2` });
  assert.equal(isAdmin(withCookie(adminToken(KEY)), KEY), true);
  assert.equal(isAdmin(withCookie(adminToken("old-key-0123456789abcdefghij")), KEY), false);
  assert.equal(isAdmin(withCookie(KEY), KEY), false, "the raw key is no cookie");
  assert.equal(isAdmin(withCookie(""), KEY), false);
  assert.equal(isAdmin(withCookie(adminToken(KEY).slice(1)), KEY), false);
  assert.equal(isAdmin(from("/"), KEY), false);
  assert.equal(isAdmin(withCookie(adminToken(KEY)), null), false, "no key set: nobody is Tom");
  assert.equal(isAdmin(withCookie(adminToken("short")), "short"), false, "a short key is no key");
  assert.equal(cookieValue("a=1; admin=zz", "admin"), "zz");
});

test("the key compare takes any guess, of any length", () => {
  assert.equal(sameKey(KEY, KEY), true);
  assert.equal(sameKey("", KEY), false);
  assert.equal(sameKey(KEY + "x", KEY), false);
  assert.equal(sameKey("é".repeat(200), KEY), false);
});

test("a call counts as ours only with the header and the site as origin", () => {
  const call = (headers: Record<string, string>) => from("/api/tags?admin=1", {}, headers);
  assert.equal(fromOurPage(call({ "x-admin": "1", origin: SITE })), true);
  assert.equal(fromOurPage(call({ origin: SITE })), false, "no header");
  assert.equal(fromOurPage(call({ "x-admin": "1" })), false, "no origin");
  assert.equal(fromOurPage(call({ "x-admin": "1", origin: "https://evil.example" })), false);
  assert.equal(fromOurPage(call({ "x-admin": "1", origin: SITE + ".evil.example" })), false);
  assert.equal(fromOurPage(call({ "x-admin": "yes", origin: SITE })), false);
});

test("sign in: the right key gets the cookie, a wrong one the same words every time", async () => {
  const { login, tries } = world();
  const ok = await login(signin({ key: KEY }));
  assert.equal(ok.status, 200);
  assert.match(ok.headers.get("set-cookie")!, new RegExp(`^${ADMIN_COOKIE}=${adminToken(KEY)};`));
  assert.equal((await ok.text()).includes(KEY), false);
  const a = await login(signin({ key: "nope" }));
  const b = await login(signin({ key: KEY + "x" }));
  const c = await login(signin({}));
  for (const r of [a, b, c]) assert.equal(r.status, 401);
  assert.deepEqual(await a.json(), { error: "key" });
  assert.deepEqual(await b.json(), { error: "key" });
  assert.equal(a.headers.get("set-cookie"), null);
  assert.equal(tries.length, 3, "each wrong key is counted, the right one is not");
  assert.equal(tries[0], adminHash(signin({}), SECRET));
});

test("sign in: a page that isn't ours is turned away before the key is looked at", async () => {
  const { login, tries } = world();
  assert.equal((await login(signin({ key: KEY }, { origin: "https://evil.example" }))).status, 403);
  const noHeader = from(
    "/api/admin",
    { method: "POST", body: JSON.stringify({ key: KEY }) },
    { origin: SITE },
  );
  assert.equal((await login(noHeader)).status, 403);
  assert.equal(tries.length, 0);
});

test(`sign in: after ${ADMIN_TRIES} wrong keys an address is stopped, even with the right one`, async () => {
  const { login } = world();
  for (let i = 0; i < ADMIN_TRIES; i++)
    assert.equal((await login(signin({ key: "no" }))).status, 401);
  const stopped = await login(signin({ key: KEY }));
  assert.equal(stopped.status, 429);
  assert.equal(stopped.headers.get("set-cookie"), null);
  const other = await login(signin({ key: KEY }, { "x-forwarded-for": "8.8.8.8" }));
  assert.equal(other.status, 200, "another address is not stopped");
});

test("sign out clears the cookie", async () => {
  const { login } = world();
  const r = await login(signin({ signout: true }));
  assert.equal(r.status, 200);
  assert.match(r.headers.get("set-cookie")!, /Max-Age=0/);
});

test("not set up: the sign-in says so", async () => {
  const r = await admin(() => null)(signin({ key: KEY }));
  assert.equal(r.status, 503);
});

test("the public answer is the same for everyone without the cookie", async () => {
  const { api } = world();
  await api.POST(tom(newTag()));
  const plain = await api.GET(from("/api/tags"));
  const asked = await api.GET(from("/api/tags?admin=1"));
  const forged = await api.GET(
    from(
      "/api/tags?admin=1",
      {},
      { cookie: `${ADMIN_COOKIE}=${adminToken("old-key-0123456789abcdefghij")}` },
    ),
  );
  const body = await plain.json();
  assert.equal((body as { admin?: boolean }).admin, undefined);
  assert.deepEqual(await asked.json(), body);
  assert.deepEqual(await forged.json(), body);
  assert.match(plain.headers.get("cache-control")!, /public/);
  assert.match(
    asked.headers.get("cache-control")!,
    /no-store/,
    "an admin address is never kept by a shared cache",
  );
});

test("with the cookie the list has every tag, waiting ones too, and never a device", async () => {
  const { api } = world();
  await api.POST(
    new Request(SITE + "/api/tags", {
      method: "POST",
      headers: { "x-forwarded-for": "1.1.1.1" },
      body: JSON.stringify({
        name: "Visitor",
        device: "device-0000000000000001",
        spot: spot({ x: -8 }),
        strokes: [stroke],
      }),
    }),
  );
  await api.POST(tom(newTag()));
  const r = await api.GET(from("/api/tags?admin=1", {}, { cookie: COOKIE }));
  const j = (await r.json()) as { admin: boolean; tags: { status: string; name: string }[] };
  assert.equal(j.admin, true);
  assert.deepEqual(
    j.tags.map((t) => [t.name, t.status]),
    [
      ["Visitor", "waiting"],
      ["Tom", "up"],
    ],
  );
  assert.equal(JSON.stringify(j).includes("device"), false);
  assert.match(r.headers.get("cache-control")!, /no-store/);
});

test("admin calls without the cookie are the same 404 as any unknown address", async () => {
  const { api, rows } = world();
  const cookies: Record<string, string>[] = [
    {},
    { cookie: `${ADMIN_COOKIE}=nope` },
    { cookie: `${ADMIN_COOKIE}=${adminToken("other-key-0123456789abcdefgh")}` },
  ];
  for (const h of cookies) {
    const r = await api.POST(
      from(
        "/api/tags?admin=1",
        { method: "POST", body: JSON.stringify(newTag()) },
        { "x-admin": "1", origin: SITE, ...h },
      ),
    );
    assert.equal(r.status, 404);
  }
  assert.equal(rows.length, 0);
});

test("admin calls from another page are refused even with the cookie", async () => {
  const { api, rows } = world();
  const heads: Record<string, string>[] = [
    { origin: "https://evil.example" },
    { "x-admin": "" },
    { origin: "" },
  ];
  for (const h of heads) {
    const r = await api.POST(tom(newTag(), h));
    assert.equal(r.status, 403, JSON.stringify(h));
  }
  const noOrigin = from(
    "/api/tags?admin=1",
    { method: "POST", body: JSON.stringify(newTag()) },
    { cookie: COOKIE, "x-admin": "1" },
  );
  assert.equal((await api.POST(noOrigin)).status, 403);
  assert.equal(rows.length, 0);
});

test("Tom's own tag goes up at once, with no mail, no device limit and no held-spot rule", async () => {
  const { api, rows, mails, sends } = world();
  await api.POST(
    new Request(SITE + "/api/tags", {
      method: "POST",
      headers: { "x-forwarded-for": "1.1.1.1" },
      body: JSON.stringify({
        name: "V",
        device: "device-0000000000000002",
        spot: spot(),
        strokes: [stroke],
      }),
    }),
  );
  const mailsBefore = mails.length,
    sendsBefore = sends.length;
  for (let i = 0; i < 3; i++) {
    const r = await api.POST(tom(newTag())); // the same spot as the waiting tag, three times
    assert.equal(r.status, 200);
  }
  assert.equal(mails.length, mailsBefore, "no mail");
  assert.equal(sends.length, sendsBefore, "no use of anyone's day");
  const tomRows = rows.filter((r) => r.device.startsWith("tom:"));
  assert.equal(tomRows.length, 3);
  assert.deepEqual(new Set(tomRows.map((r) => r.status)), new Set(["up"]));
  assert.equal(new Set(tomRows.map((r) => r.device)).size, 3);
});

/** A visitor's tag, sent as the page sends it. */
const visitorSends = (api: ReturnType<typeof handlers>, device: string, x = -8, y = 3) =>
  api.POST(
    new Request(SITE + "/api/tags", {
      method: "POST",
      headers: { "x-forwarded-for": "1.1.1.1" },
      body: JSON.stringify({ name: "V", device, spot: spot({ x, y }), strokes: [stroke] }),
    }),
  );

test("Undo puts the very same row back: id, time, device and status", async () => {
  const { api, rows } = world();
  await visitorSends(api, "device-00000000000000aa");
  await api.POST(tom({ do: "approve", id: rows[0]!.id }));
  const before = { ...rows[0]! };
  const gone = await api.POST(tom({ do: "remove", id: before.id }));
  const { row } = (await gone.json()) as { row: Record<string, string> };
  assert.deepEqual(row, {
    id: before.id,
    created_at: before.created_at,
    device: before.device,
    status: "up",
  });
  assert.equal(rows.length, 0);
  const back = await api.POST(
    tom({ ...newTag({ name: "V", spot: spot({ x: -8, y: 3 }) }), restore: row }),
  );
  assert.equal(back.status, 200);
  assert.deepEqual(await back.json(), { id: before.id });
  assert.equal(rows.length, 1);
  assert.deepEqual(
    [rows[0]!.id, rows[0]!.created_at, rows[0]!.device, rows[0]!.status],
    [before.id, before.created_at, before.device, "up"],
  );
  assert.equal(
    (await visitorSends(api, "device-00000000000000aa", -3)).status,
    409,
    "the visitor still has their one tag, so they can't end up with two",
  );
});

test("a waiting tag comes back waiting, and the restore is checked", async () => {
  const { api, rows } = world();
  await visitorSends(api, "device-00000000000000bb");
  const id = rows[0]!.id;
  const { row } = (await (await api.POST(tom({ do: "remove", id }))).json()) as {
    row: Record<string, string>;
  };
  assert.equal(row.status, "waiting");
  const put = (restore: unknown) => api.POST(tom({ ...newTag(), restore }));
  for (const bad of [
    { ...row, id: "nope" },
    { ...row, created_at: "yesterday" },
    { ...row, device: "x" },
    { ...row, status: "gone" },
    "row",
  ])
    assert.equal((await put(bad)).status, 400, JSON.stringify(bad));
  assert.equal(rows.length, 0);
  assert.equal((await put(row)).status, 200);
  assert.equal(rows[0]!.status, "waiting");
  assert.equal((await put(row)).status, 409, "the id is in use again");
  const twice = await put({ ...row, id: crypto.randomUUID() });
  assert.equal(twice.status, 409, "and so is the device");
  assert.equal(rows.length, 1);
});

test("a restore from anyone but Tom is refused", async () => {
  const { api, rows } = world();
  const r = await api.POST(
    from(
      "/api/tags?admin=1",
      {
        method: "POST",
        body: JSON.stringify({ ...newTag(), restore: { id: crypto.randomUUID() } }),
      },
      { "x-admin": "1", origin: SITE },
    ),
  );
  assert.equal(r.status, 404);
  assert.equal(rows.length, 0);
});

test("a visitor's tag may sit as low as the visitor area goes, Tom's as low as the wall", async () => {
  const { api } = world();
  let across = -30;
  const low = (y: number) =>
    visitorSends(api, "device-" + String(Math.random()).slice(2, 18), (across += 3), y);
  // the lowest middle the pitch allows a visitor: its AREA floor (ground + 0.4 m) plus half a frame
  assert.equal((await low(-2.2 + 0.4 + 1.35 / 2)).status, 200);
  assert.equal((await low(-1.1)).status, 200, "the silent-400 case");
  assert.equal((await low(VISITOR_Y_MIN - 0.01)).status, 400);
  assert.equal((await low(-4)).status, 400);
  assert.equal((await low(0)).status, 200);
  const tag = (y: number) => api.POST(tom(newTag({ spot: spot({ y }) })));
  assert.equal((await tag(-4)).status, 200, "Tom goes lower");
  assert.equal((await tag(ADMIN_Y_MIN)).status, 200);
  assert.equal((await tag(ADMIN_Y_MIN - 0.01)).status, 400);
});

test("the visitor floor follows the pitch's own wall", () => {
  const pitch = readParts(fileURLToPath(new URL("../../pitch/paint", import.meta.url))).js;
  const ground = Number(pitch.match(/GROUND = (-?[\d.]+)/)![1]);
  assert.equal(ground, WALL_GROUND);
  assert.match(pitch, /AREA = \{[^}]*y0: GROUND \+ \.4/);
});

test("Tom's tag is held to the same rules as a visitor's", async () => {
  const { api, rows } = world();
  const bad = async (extra: Record<string, unknown>) => (await api.POST(tom(newTag(extra)))).status;
  assert.equal(await bad({ strokes: [] }), 400);
  assert.equal(await bad({ name: "x".repeat(25) }), 400);
  assert.equal(await bad({ spot: spot({ x: 99 }) }), 400);
  assert.equal(await bad({ spot: spot({ w: 2.4, h: 4 }) }), 400, "squashed");
  assert.equal(rows.length, 0);
});

test("approve, remove and a missing tag", async () => {
  const { api, rows } = world();
  await api.POST(
    new Request(SITE + "/api/tags", {
      method: "POST",
      headers: { "x-forwarded-for": "1.1.1.1" },
      body: JSON.stringify({
        name: "V",
        device: "device-0000000000000003",
        spot: spot(),
        strokes: [stroke],
      }),
    }),
  );
  const id = rows[0]!.id;
  assert.equal((await api.POST(tom({ do: "approve", id }))).status, 200);
  assert.equal(rows[0]!.status, "up");
  assert.equal((await api.POST(tom({ do: "approve", id: "nope" }))).status, 400);
  assert.equal((await api.POST(tom({ do: "remove", id: crypto.randomUUID() }))).status, 404);
  assert.equal((await api.POST(tom({ do: "fly", id }))).status, 400);
  assert.equal((await api.POST(tom({ do: "remove", id }))).status, 200);
  assert.equal(rows.length, 0);
});

test("Tom moves, sizes and turns a tag: the spot is checked like a new tag's", async () => {
  const { api, rows } = world();
  const { id } = (await (await api.POST(tom(newTag()))).json()) as { id: string };
  const upd = async (s: object) => (await api.POST(tom({ do: "update", id, spot: s }))).status;
  assert.equal(await upd(spot({ x: -10, y: 4, w: 3.2, h: 1.8, turn: 12 })), 200);
  assert.deepEqual(
    [rows[0]!.x, rows[0]!.y, rows[0]!.w, rows[0]!.h, rows[0]!.turn],
    [-10, 4, 3.2, 1.8, 12],
  );
  const kept = { ...rows[0]! };
  for (const bad of [
    spot({ x: 51 }),
    spot({ y: -6 }),
    spot({ y: 21 }),
    spot({ w: 7, h: 3.9 }),
    spot({ w: 0.1, h: 0.05 }),
    spot({ turn: 46 }),
    spot({ turn: Number.NaN }),
    spot({ w: 2.4, h: 1 }),
    { x: 0, y: 1, w: 2.4, h: 1.35 },
  ])
    assert.equal(await upd(bad), 400, JSON.stringify(bad));
  assert.deepEqual([rows[0]!.x, rows[0]!.w, rows[0]!.turn], [kept.x, kept.w, kept.turn]);
  assert.equal((await api.POST(tom({ do: "update", id, spot: "far" }))).status, 400);
});

test("a visitor's tag mail has a second line that opens the wall on the tag", async () => {
  const { api, mails, rows } = world();
  const r = await api.POST(
    new Request(SITE + "/api/tags", {
      method: "POST",
      headers: { "x-forwarded-for": "1.1.1.1" },
      body: JSON.stringify({
        name: "V",
        device: "device-0000000000000004",
        spot: spot(),
        strokes: [stroke],
      }),
    }),
  );
  assert.equal(r.status, 200);
  const text = mails[0]!.text;
  assert.match(text, /\/api\/tags\?review=.+&sig=/);
  assert.ok(text.includes(`Open it on the wall: ${SITE}${WALL_PATH}?tag=${rows[0]!.id}\n`));
  assert.ok(
    text.indexOf("review=") < text.indexOf("Open it on the wall"),
    "the review link stays first",
  );
});

test("without ADMIN_KEY nothing admin answers, even with a cookie made from nothing", async () => {
  const { deps } = memoryDeps(SECRET, async () => true);
  const api = handlers(() => deps);
  const r = await api.GET(
    from("/api/tags?admin=1", {}, { cookie: `${ADMIN_COOKIE}=${adminToken("")}` }),
  );
  assert.equal(((await r.json()) as { admin?: boolean }).admin, undefined);
  assert.equal((await api.POST(tom(newTag()))).status, 404);
});

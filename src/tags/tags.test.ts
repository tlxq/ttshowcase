import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { readParts } from "../../tools/pitch/paint-parts.mjs";
import {
  handlers,
  overlaps,
  readTag,
  sign,
  signed,
  PER_ADDRESS,
  MOST_WAITING,
  REVIEW_CSS,
  TAG_LIMITS,
} from "../../api/tags.ts";
import { memoryDeps } from "./memory.ts";

const SECRET = "x".repeat(40);

/** The handlers on an in-memory table and a mail box that keeps what was sent. */
function world(mailWorks = true) {
  const mails: { subject: string; text: string }[] = [];
  const { rows, sends, deps } = memoryDeps(SECRET, async (subject, text) => {
    mails.push({ subject, text });
    return mailWorks;
  });
  return { rows, sends, mails, deps, api: handlers(() => deps) };
}

let devices = 0;
const newDevice = () => `device-${String(++devices).padStart(16, "0")}`;
const spotAt = (x: number, y = 2, w = 1, h = 0.5) => ({ x, y, w, h, turn: 0 });
const stroke = (extra: Record<string, unknown> = {}) => ({
  tool: "fat",
  col: "#E8452C",
  seed: 12345,
  pts: [0, 0, 0, 0.5, 10.4, 20.6, 16.2, 0.555],
  dr: [[4, 300.4, -3.2]],
  ...extra,
});
const tag = (extra: Record<string, unknown> = {}) => ({
  name: "Kasper",
  spot: { x: -12, y: 2, w: 1.4, h: 0.6, turn: -3 },
  strokes: [stroke()],
  device: newDevice(),
  ...extra,
});
const at = (path: string, init?: RequestInit, ip = "1.2.3.4") =>
  new Request("https://ttdevs.com" + path, {
    ...init,
    headers: { "x-forwarded-for": ip, ...init?.headers },
  });
const send = (body: unknown, ip?: string) =>
  at(
    "/api/tags",
    { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } },
    ip,
  );
const reviewLink = (text: string) => {
  const u = new URL(text.match(/https:\S+/)![0]);
  return u.pathname + u.search;
};
type Api = ReturnType<typeof handlers>;
const decide = (api: Api, mail: { text: string }, what: string) =>
  api.POST(at(reviewLink(mail.text) + "&do=" + what, { method: "POST" }));
const wall = async (api: Api) =>
  (await (await api.GET(at("/api/tags"))).json()) as { tags: { id: string }[]; held: object[] };
const mine = async (api: Api, id: string) =>
  ((await (await api.GET(at(`/api/tags?ids=${id},nope`))).json()) as { tags: unknown[] }).tags;

test("a tag is stored as the tool makes it, rounded and small", () => {
  const t = readTag(
    tag({ strokes: [stroke(), stroke({ tool: "pen", col: "#2fa35a", dr: undefined })] }),
  );
  assert.ok(!("error" in t));
  assert.deepEqual(t.strokes[0], {
    tool: "fat",
    col: "#e8452c",
    seed: 12345,
    pts: [0, 0, 0, 0.5, 10, 21, 16, 0.56],
    dr: [[4, 300, -3]],
  });
  assert.deepEqual(
    t.strokes.map((s) => [s.tool, s.col]),
    [
      ["fat", "#e8452c"],
      ["pen", "#2fa35a"],
    ],
    "each stroke keeps its own tool and colour",
  );
  assert.deepEqual(t.strokes[1]!.dr, []);
  assert.equal("pen" in t || "color" in t, false, "no tag-level pen or colour");
});

test("bad tags are refused with the field that is wrong", () => {
  const bad = (extra: Record<string, unknown>) => readTag(tag(extra));
  assert.deepEqual(bad({ name: "x".repeat(25) }), { error: "name" });
  assert.deepEqual(bad({ spot: spotAt(0, 2, 99) }), { error: "spot" });
  assert.deepEqual(bad({ spot: { x: 0, y: 2, w: 1, turn: 0 } }), { error: "spot" });
  assert.deepEqual(bad({ strokes: [] }), { error: "strokes" });
  assert.deepEqual(bad({ strokes: [[0, 0, 0, 0.5]] }), { error: "strokes" }, "the old flat format");
  const one = (s: Record<string, unknown>) => bad({ strokes: [stroke(s)] });
  for (const s of [
    { tool: "graffiti" },
    { col: "red" },
    { seed: 1.5 },
    { seed: "7" },
    { pts: [0, 0, 0] },
    { pts: [0, 0, 0, 2] },
    { pts: [0, 0, 0, 0.5, 1, 1, 1, 0.5, 2] },
    { pts: Array(4004 * 4).fill(0) },
    { dr: "x" },
    { dr: [[2, 300, 0]] }, // not on a point
    { dr: [[8, 300, 0]] }, // past the last point
    { dr: [[0, 0, 0]] },
    { dr: [[0, 1000, 0]] },
    { dr: [[0, 300, 50]] },
    { dr: [[0, 300]] },
    { dr: Array(TAG_LIMITS.drips + 1).fill([0, 300, 0]) },
  ]) {
    assert.deepEqual(one(s), { error: "strokes" }, JSON.stringify(s).slice(0, 60));
  }
  assert.deepEqual(bad({ strokes: Array(TAG_LIMITS.strokes + 1).fill(stroke()) }), {
    error: "strokes",
  });
  assert.ok(!("error" in bad({ strokes: Array(TAG_LIMITS.strokes).fill(stroke()) })));
});

test("the tool ids the pitch draws with are the ones the store takes", () => {
  const page = readParts("pitch/paint").js; // the pitch's script, its parts joined
  const ids = [...page.matchAll(/\{ id: "(\w+)", name: "[^"]+", note:/g)].map((m) => m[1]);
  assert.deepEqual(ids, TAG_LIMITS.tools);
  assert.ok(page.includes("__TAG_LIMITS__"), "the pitch gets its limits from the build");
});

test("hidden characters are taken out of the name", () => {
  const name = ` Kas${String.fromCodePoint(0x202e)}pe${String.fromCodePoint(0)}r `;
  const t = readTag(tag({ name }));
  assert.ok(!("error" in t));
  assert.equal(t.name, "Kasper");
});

test("send → mail → approve → on everyone's wall", async () => {
  const { api, mails } = world();
  const r = await api.POST(send(tag()));
  assert.equal(r.status, 200);
  const { id } = (await r.json()) as { id: string };
  assert.equal(mails.length, 1);
  assert.match(mails[0]!.subject, /Kasper/);

  const before = await wall(api);
  assert.deepEqual(before.tags, [], "nobody else sees it before Tom's OK");
  assert.equal(before.held.length, 1, "but its spot is held");
  assert.deepEqual(await mine(api, id), [{ id, status: "waiting" }]);

  const review = await api.GET(at(reviewLink(mails[0]!.text)));
  assert.equal(review.status, 200);
  assert.match(await review.text(), /Approve/);
  assert.equal((await decide(api, mails[0]!, "approve")).status, 200);

  const after = await wall(api);
  assert.deepEqual(
    after.tags.map((t) => t.id),
    [id],
  );
  assert.deepEqual(after.held, []);
  assert.equal(JSON.stringify(after).includes("device"), false, "the list never shows the device");
  assert.equal(JSON.stringify(after).includes("hash"), false, "or the address");
});

test("a held spot shows no tag, only where it is", async () => {
  const { api } = world();
  await api.POST(send(tag()));
  assert.deepEqual(Object.keys((await wall(api)).held[0]!).sort(), ["h", "turn", "w", "x", "y"]);
});

test("a robot (BotID says so) is refused: nothing stored, counted or mailed", async () => {
  const w = world();
  const robot = handlers(() => ({
    ...memoryDeps(SECRET, async () => true).deps,
    human: async () => false,
  }));
  const r = await robot.POST(send(tag()));
  assert.equal(r.status, 403);
  assert.deepEqual(await r.json(), { error: "robot" });
  const person = handlers(() => ({ ...w.deps, human: async () => true }));
  assert.equal((await person.POST(send(tag()))).status, 200, "a person still gets through");
});

test("one tag per device, forever", async () => {
  const { api, mails } = world();
  const device = newDevice();
  assert.equal((await api.POST(send(tag({ device })))).status, 200);
  const again = await api.POST(send(tag({ device, spot: spotAt(5) })));
  assert.equal(again.status, 409);
  assert.deepEqual(await again.json(), { error: "one-tag" });
  await decide(api, mails[0]!, "approve");
  const later = await api.POST(send(tag({ device, spot: spotAt(5) })));
  assert.equal(later.status, 409, "approved doesn't free it either");
});

test("Remove deletes the tag: the spot is free and the device may tag again", async () => {
  const { api, mails, rows } = world();
  const device = newDevice();
  const { id } = (await (await api.POST(send(tag({ device })))).json()) as { id: string };
  assert.equal((await decide(api, mails[0]!, "remove")).status, 200);
  assert.equal(rows.length, 0);
  assert.deepEqual(await mine(api, id), [], "the visitor's page sees it gone");
  assert.deepEqual((await wall(api)).held, []);
  assert.equal((await api.POST(send(tag({ device }), "5.6.7.8"))).status, 200);
});

test("only a waiting tag holds its spot: an approved one never blocks a new tag", async () => {
  const { api, mails } = world();
  await api.POST(send(tag()));
  const over = await api.POST(send(tag({ spot: spotAt(-11.5, 2.2, 1.4, 0.6) })));
  assert.equal(over.status, 409);
  assert.deepEqual(await over.json(), { error: "spot-taken" });
  assert.equal((await wall(api)).held.length, 1);
  await decide(api, mails[0]!, "approve");
  assert.deepEqual((await wall(api)).held, [], "approved: nothing is held any more");
  const on = await api.POST(send(tag({ spot: spotAt(-12) })));
  assert.equal(on.status, 200, "a new tag may go right over the approved one");
  const next = await api.POST(send(tag({ spot: spotAt(-9, 2, 1.4, 0.6) })));
  assert.equal(next.status, 200, "right next to it is fine");
  assert.equal((await wall(api)).held.length, 2, "the new waiting tags hold theirs");
  const again = await api.POST(send(tag({ spot: spotAt(-12) })));
  assert.equal(again.status, 409, "but not over a waiting one");
});

test("boxes overlap only when they really do", () => {
  const a = spotAt(0, 0, 2, 1);
  assert.ok(overlaps(a, { ...a, x: 1.9 }));
  assert.equal(overlaps(a, { ...a, x: 2 }), false);
  assert.equal(overlaps(a, { ...a, y: 1 }), false);
});

test(`${PER_ADDRESS} sends a day per address, removed ones included`, async () => {
  const { api, mails } = world();
  for (let i = 0; i < PER_ADDRESS; i++) {
    assert.equal((await api.POST(send(tag({ spot: spotAt(-16 + i * 2) })))).status, 200);
  }
  await decide(api, mails[0]!, "remove");
  assert.equal((await api.POST(send(tag({ spot: spotAt(5, 5) })))).status, 429);
  assert.equal((await api.POST(send(tag({ spot: spotAt(5, 5) }), "5.6.7.8"))).status, 200);
});

test(`sending stops at ${MOST_WAITING} waiting tags`, async () => {
  const { api } = world();
  for (let i = 0; i < MOST_WAITING; i++) {
    const spot = spotAt(-40 + (i % 10) * 2, 1 + Math.floor(i / 10) * 2);
    assert.equal((await api.POST(send(tag({ spot }), `10.0.0.${i}`))).status, 200);
  }
  assert.equal((await api.POST(send(tag({ spot: spotAt(40, 15) }), "9.9.9.9"))).status, 503);
});

test("the review link only works with its own signature", async () => {
  const { api } = world();
  const { id } = (await (await api.POST(send(tag()))).json()) as { id: string };
  const good = sign(SECRET, id);
  assert.ok(signed(SECRET, id, good));
  assert.equal(signed(SECRET, id, sign("y".repeat(40), id)), false);
  assert.equal((await api.GET(at(`/api/tags?review=${id}&sig=nope`))).status, 404);
  const post = (q: string) => api.POST(at(`/api/tags?${q}`, { method: "POST" }));
  assert.equal((await post(`review=${id}&sig=nope&do=remove`)).status, 404);
  assert.equal((await api.GET(at(`/api/tags?review=${randomUUID()}&sig=${good}`))).status, 404);
  assert.equal((await post(`review=${id}&sig=${good}&do=delete`)).status, 400);
});

test("the review page can't be broken by the name", async () => {
  const { api, mails } = world();
  await api.POST(send(tag({ name: "<script>x</script>" })));
  const html = await (await api.GET(at(reviewLink(mails[0]!.text)))).text();
  assert.equal(html.includes("<script>x"), false);
});

test("no mail = no tag kept, so the visitor can send again", async () => {
  const { api, rows } = world(false);
  assert.equal((await api.POST(send(tag()))).status, 502);
  assert.equal(rows.length, 0);
});

test("a failed mail doesn't use up the address's quota", async () => {
  const { api, sends } = world(false);
  for (let i = 0; i < PER_ADDRESS + 2; i++)
    assert.equal((await api.POST(send(tag()))).status, 502, "retried again and again, still 502");
  assert.equal(sends.length, 0);
});

test("a store that throws answers 500 store and logs why", async () => {
  const { deps } = memoryDeps(SECRET, async () => true);
  deps.db.insert = async () => {
    throw Object.assign(new Error('null value in column "pen"'), { code: "23502" });
  };
  const api = handlers(() => deps);
  const logged: unknown[][] = [];
  const was = console.error;
  console.error = (...a: unknown[]) => void logged.push(a);
  try {
    const r = await api.POST(send(tag()));
    assert.equal(r.status, 500);
    assert.deepEqual(await r.json(), { error: "store" });
  } finally {
    console.error = was;
  }
  assert.ok(JSON.stringify(logged).includes("23502") && JSON.stringify(logged).includes("pen"));
});

test("a tag holds at most dripsTotal drips, over all its strokes", () => {
  const dr = (n: number) => Array.from({ length: n }, () => [0, 300, 0]);
  const per = TAG_LIMITS.drips;
  const strokes = (n: number) =>
    Array.from({ length: Math.ceil(n / per) }, (_, i) =>
      stroke({ dr: dr(Math.min(per, n - i * per)) }),
    );
  assert.ok(!("error" in readTag(tag({ strokes: strokes(TAG_LIMITS.dripsTotal) }))));
  assert.deepEqual(readTag(tag({ strokes: strokes(TAG_LIMITS.dripsTotal + 1) })), {
    error: "strokes",
  });
});

test("not set up: every call says so instead of failing", async () => {
  const api = handlers(() => null);
  assert.equal((await api.GET(at("/api/tags"))).status, 503);
  assert.equal((await api.POST(send(tag()))).status, 503);
});

test("the review page draws each stroke in its own colour", async () => {
  const { api, mails } = world();
  const strokes = [stroke({ col: "#d42a2a" }), stroke({ tool: "pen", col: "#2fa35a" })];
  await api.POST(send(tag({ strokes })));
  const html = await (await api.GET(at(reviewLink(mails[0]!.text)))).text();
  assert.ok(html.includes('"col":"#d42a2a"') && html.includes('"col":"#2fa35a"'));
  assert.ok(
    html.includes("g.strokeStyle=g.fillStyle=s.col"),
    "the page paints with the stroke's own",
  );
  assert.equal(html.includes("t.color"), false);
});

test("the review page takes every colour from tokens.css", async () => {
  const { api, mails } = world();
  await api.POST(send(tag()));
  const html = await (await api.GET(at(reviewLink(mails[0]!.text)))).text();
  const tokens = readFileSync("src/design/tokens.css", "utf8");
  assert.ok(html.includes(tokens), "the token file is on the page");
  const own = html.replace(tokens, "").replace("#e8452c", ""); // the stroke's own paint colour is data
  assert.deepEqual(own.match(/#[0-9a-f]{3,8}\b|rgba?\(/gi), null, "no colour of its own");
  assert.equal(/\d+px/.test(REVIEW_CSS), false, "no sizes of its own");
});

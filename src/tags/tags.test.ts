import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  handlers,
  overlaps,
  readTag,
  sign,
  signed,
  PER_ADDRESS,
  MOST_WAITING,
  REVIEW_CSS,
  type Deps,
  type Status,
} from "../../api/tags.ts";

const SECRET = "x".repeat(40);
type Row = Parameters<Deps["db"]["insert"]>[0] & { id: string; created_at: string; status: Status };

/** The handlers on an in-memory table and a mail box that keeps what was sent. */
function world(mailWorks = true) {
  const rows: Row[] = [];
  const sends: string[] = [];
  const mails: { subject: string; text: string }[] = [];
  const deps: Deps = {
    secret: SECRET,
    db: {
      async byDevice(device) {
        return rows.filter((r) => r.device === device).length;
      },
      async byAddress(ipHash) {
        return sends.filter((s) => s === ipHash).length;
      },
      async waiting() {
        return rows.filter((r) => r.status === "waiting").length;
      },
      async taken() {
        return rows;
      },
      async held() {
        return rows.filter((r) => r.status === "waiting");
      },
      async insert(t) {
        if (rows.some((r) => r.device === t.device)) return null;
        const id = randomUUID();
        sends.push(t.ip_hash);
        rows.push({ ...t, id, created_at: new Date().toISOString(), status: "waiting" });
        return id;
      },
      async drop(id) {
        const i = rows.findIndex((r) => r.id === id);
        if (i >= 0) rows.splice(i, 1);
      },
      async get(id) {
        return rows.find((r) => r.id === id) ?? null;
      },
      async approve(id) {
        rows.find((r) => r.id === id)!.status = "up";
      },
      async up(most) {
        return rows.filter((r) => r.status === "up").slice(-most);
      },
      async statuses(ids) {
        return rows.filter((r) => ids.includes(r.id)).map(({ id, status }) => ({ id, status }));
      },
    },
    async mail(subject, text) {
      mails.push({ subject, text });
      return mailWorks;
    },
  };
  return { rows, mails, api: handlers(() => deps) };
}

let devices = 0;
const newDevice = () => `device-${String(++devices).padStart(16, "0")}`;
const spotAt = (x: number, y = 2, w = 1, h = 0.5) => ({ x, y, w, h, turn: 0 });
const tag = (extra: Record<string, unknown> = {}) => ({
  name: "Kasper",
  pen: "graffiti",
  color: "#E8452C",
  spot: { x: -12, y: 2, w: 1.4, h: 0.6, turn: -3 },
  strokes: [[0, 0, 0, 0.5, 10.4, 20.6, 16.2, 0.555]],
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

test("a tag is stored rounded and small", () => {
  const t = readTag(tag());
  assert.ok(!("error" in t));
  assert.deepEqual(t.strokes, [[0, 0, 0, 50, 10, 21, 16, 56]]);
  assert.equal(t.color, "#e8452c");
});

test("bad tags are refused with the field that is wrong", () => {
  assert.deepEqual(readTag(tag({ name: "x".repeat(25) })), { error: "name" });
  assert.deepEqual(readTag(tag({ pen: "<b>" })), { error: "pen" });
  assert.deepEqual(readTag(tag({ color: "red" })), { error: "color" });
  assert.deepEqual(readTag(tag({ spot: spotAt(0, 2, 99) })), { error: "spot" });
  assert.deepEqual(readTag(tag({ spot: { x: 0, y: 2, w: 1, turn: 0 } })), { error: "spot" });
  assert.deepEqual(readTag(tag({ strokes: [] })), { error: "strokes" });
  assert.deepEqual(readTag(tag({ strokes: [[0, 0, 0]] })), { error: "strokes" });
  assert.deepEqual(readTag(tag({ strokes: [[0, 0, 0, 2]] })), { error: "strokes" });
  assert.deepEqual(readTag(tag({ strokes: [Array(4004 * 4).fill(0)] })), { error: "strokes" });
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

test("a spot that is waiting or on the wall can't be tagged over", async () => {
  const { api, mails } = world();
  await api.POST(send(tag()));
  const over = await api.POST(send(tag({ spot: spotAt(-11.5, 2.2, 1.4, 0.6) })));
  assert.equal(over.status, 409);
  assert.deepEqual(await over.json(), { error: "spot-taken" });
  await decide(api, mails[0]!, "approve");
  assert.equal((await api.POST(send(tag({ spot: spotAt(-12) })))).status, 409);
  const next = await api.POST(send(tag({ spot: spotAt(-9, 2, 1.4, 0.6) })));
  assert.equal(next.status, 200, "right next to it is fine");
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

test("not set up: every call says so instead of failing", async () => {
  const api = handlers(() => null);
  assert.equal((await api.GET(at("/api/tags"))).status, 503);
  assert.equal((await api.POST(send(tag()))).status, 503);
});

test("the review page takes every colour from tokens.css", async () => {
  const { api, mails } = world();
  await api.POST(send(tag()));
  const html = await (await api.GET(at(reviewLink(mails[0]!.text)))).text();
  const tokens = readFileSync("src/design/tokens.css", "utf8");
  assert.ok(html.includes(tokens), "the token file is on the page");
  const own = html.replace(tokens, "").replace("#e8452c", ""); // the tag's own paint colour is data
  assert.deepEqual(own.match(/#[0-9a-f]{3,8}\b|rgba?\(/gi), null, "no colour of its own");
  assert.equal(/\d+px/.test(REVIEW_CSS), false, "no sizes of its own");
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  handlers,
  readTag,
  sign,
  signed,
  PER_DAY,
  MOST_WAITING,
  type Deps,
  type Status,
} from "../../api/tags.ts";

const SECRET = "x".repeat(40);
type Row = Parameters<Deps["db"]["insert"]>[0] & { id: string; created_at: string; status: Status };

/** The handlers on an in-memory table and a mail box that keeps what was sent. */
function world(mailWorks = true) {
  const rows: Row[] = [];
  const mails: { subject: string; text: string }[] = [];
  const deps: Deps = {
    secret: SECRET,
    db: {
      async sentSince(device, ipHash) {
        return rows.filter((r) => r.device === device || r.ip_hash === ipHash).length;
      },
      async waiting() {
        return rows.filter((r) => r.status === "waiting").length;
      },
      async insert(t) {
        const id = randomUUID();
        rows.push({
          ...t,
          id,
          created_at: new Date(Date.now() + rows.length).toISOString(),
          status: "waiting",
        });
        return id;
      },
      async drop(id) {
        rows.splice(
          rows.findIndex((r) => r.id === id),
          1,
        );
      },
      async get(id) {
        return rows.find((r) => r.id === id) ?? null;
      },
      async setStatus(id, status) {
        rows.find((r) => r.id === id)!.status = status;
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

const tag = (extra: Record<string, unknown> = {}) => ({
  name: "Kasper",
  pen: "graffiti",
  color: "#E8452C",
  spot: { x: -12, y: 2, w: 1.4, turn: -3 },
  strokes: [[0, 0, 0, 0.5, 10.4, 20.6, 16.2, 0.555]],
  device: "device-0123456789abcdef",
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
const reviewLink = (text: string) => new URL(text.match(/https:\S+/)![0]);

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
  assert.deepEqual(readTag(tag({ spot: { x: 0, y: 2, w: 99, turn: 0 } })), { error: "spot" });
  assert.deepEqual(readTag(tag({ strokes: [] })), { error: "strokes" });
  assert.deepEqual(readTag(tag({ strokes: [[0, 0, 0]] })), { error: "strokes" });
  assert.deepEqual(readTag(tag({ strokes: [[0, 0, 0, 2]] })), { error: "strokes" });
  assert.deepEqual(readTag(tag({ strokes: [Array(4004 * 4).fill(0)] })), { error: "strokes" });
});

test("hidden characters are taken out of the name", () => {
  const t = readTag(tag({ name: " Ho‮ll\u0000y " }));
  assert.ok(!("error" in t));
  assert.equal(t.name, "Kasper");
});

test("send → mail → approve → on the wall", async () => {
  const { api, mails } = world();
  const r = await api.POST(send(tag()));
  assert.equal(r.status, 200);
  const { id, removeKey } = (await r.json()) as { id: string; removeKey: string };
  assert.ok(removeKey.length >= 20);
  assert.equal(mails.length, 1);
  assert.match(mails[0]!.subject, /Kasper/);

  assert.deepEqual(
    ((await (await api.GET(at("/api/tags"))).json()) as { tags: unknown[] }).tags,
    [],
  );
  const link = reviewLink(mails[0]!.text);
  const review = await api.GET(at(link.pathname + link.search));
  assert.equal(review.status, 200);
  assert.match(await review.text(), /Approve/);

  const done = await api.POST(at(link.pathname + link.search + "&do=approve", { method: "POST" }));
  assert.equal(done.status, 200);
  const wall = (await (await api.GET(at("/api/tags"))).json()) as {
    tags: { id: string; name: string }[];
  };
  assert.deepEqual(
    wall.tags.map((t) => t.id),
    [id],
  );
  assert.equal(
    JSON.stringify(wall).includes("device"),
    false,
    "the list never shows device, address or keys",
  );
  assert.equal(JSON.stringify(wall).includes("hash"), false);
});

test("the review link only works with its own signature", async () => {
  const { api } = world();
  const { id } = (await (await api.POST(send(tag()))).json()) as { id: string };
  assert.ok(signed(SECRET, id, sign(SECRET, id)));
  assert.equal(signed(SECRET, id, sign("y".repeat(40), id)), false);
  assert.equal((await api.GET(at(`/api/tags?review=${id}&sig=nope`))).status, 404);
  assert.equal(
    (await api.POST(at(`/api/tags?review=${id}&sig=nope&do=approve`, { method: "POST" }))).status,
    404,
  );
  const other = randomUUID();
  assert.equal(
    (await api.GET(at(`/api/tags?review=${other}&sig=${sign(SECRET, id)}`))).status,
    404,
  );
});

test("the review page can't be broken by the name", async () => {
  const { api, mails } = world();
  await api.POST(send(tag({ name: "<script>x</script>" })));
  const link = reviewLink(mails[0]!.text);
  const html = await (await api.GET(at(link.pathname + link.search))).text();
  assert.equal(html.includes("<script>x"), false);
});

test(`${PER_DAY} tags a day per device, and per address`, async () => {
  const { api } = world();
  for (let i = 0; i < PER_DAY; i++) assert.equal((await api.POST(send(tag()))).status, 200);
  assert.equal((await api.POST(send(tag()))).status, 429);
  assert.equal(
    (await api.POST(send(tag({ device: "another-device-0123456" })))).status,
    429,
    "same address",
  );
  assert.equal((await api.POST(send(tag(), "5.6.7.8"))).status, 429, "same device");
  assert.equal(
    (await api.POST(send(tag({ device: "another-device-0123456" }), "5.6.7.8"))).status,
    200,
  );
});

test(`sending stops at ${MOST_WAITING} waiting tags`, async () => {
  const { api } = world();
  for (let i = 0; i < MOST_WAITING; i++) {
    assert.equal(
      (
        await api.POST(
          send(tag({ device: `device-${String(i).padStart(16, "0")}` }), `10.0.0.${i}`),
        )
      ).status,
      200,
    );
  }
  assert.equal(
    (await api.POST(send(tag({ device: "device-last-0123456789" }), "9.9.9.9"))).status,
    503,
  );
});

test("no mail = no tag kept, so the visitor can send again", async () => {
  const { api, rows } = world(false);
  assert.equal((await api.POST(send(tag()))).status, 502);
  assert.equal(rows.length, 0);
});

test("the visitor takes their own tag down with their key, nobody else can", async () => {
  const { api } = world();
  const { id, removeKey } = (await (await api.POST(send(tag()))).json()) as {
    id: string;
    removeKey: string;
  };
  const del = (body: unknown) =>
    api.DELETE(at("/api/tags", { method: "DELETE", body: JSON.stringify(body) }));
  assert.equal((await del({ id, removeKey: "wrong" })).status, 404);
  assert.equal((await del({ id: randomUUID(), removeKey })).status, 404);
  const mine = async () =>
    ((await (await api.GET(at(`/api/tags?ids=${id},nope`))).json()) as { tags: unknown[] }).tags;
  assert.deepEqual(await mine(), [{ id, status: "waiting" }]);
  assert.equal((await del({ id, removeKey })).status, 200);
  assert.deepEqual(await mine(), [{ id, status: "removed" }]);
});

test("not set up: every call says so instead of failing", async () => {
  const api = handlers(() => null);
  assert.equal((await api.GET(at("/api/tags"))).status, 503);
  assert.equal((await api.POST(send(tag()))).status, 503);
});

/**
 * The tag save on a real Postgres: api/tags.ts's own store (store(), the same statements) through Neon's own driver,
 * with the table from tools/tags/schema.sql. `mise run tags:db` starts a throwaway Postgres on this PC, gives its
 * address in TAGS_DB_URL and runs this file; without the address every test here is skipped.
 *
 * The one thing swapped: Neon's driver sends each query over HTTP to Neon's own proxy, which a plain Postgres doesn't
 * have. Here the driver's fetch (neonConfig.fetchFunction) is answered on this PC: the same request body is run on
 * Postgres with pg, parameters as text, a batch between begin and commit on one connection, and the rows go back as
 * text for the driver to read, as Neon's proxy does.
 */
import { after, before, test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { neon, neonConfig } from "@neondatabase/serverless";
import pg from "pg";
import { handlers, overlaps, sign, store, VISITOR_FRAME, type Spot } from "../../api/tags.ts";

const url = process.env.TAGS_DB_URL;
const skip = url ? false : "no database address (TAGS_DB_URL). Run: mise run tags:db";
/** Rounds of each race: the task runs 50; fewer for a quick look. */
const ROUNDS = Number(process.env.TAGS_DB_ROUNDS) || 50;
/** Sends racing in one round. */
const SENDS = 24;
const SECRET = "x".repeat(40);

type Query = { query: string; params: unknown[] };
const pool = new pg.Pool({ connectionString: url, max: SENDS + 8 });
const asText = { getTypeParser: () => (v: string) => v };
let batches = 0;

async function run(client: pg.PoolClient, q: Query) {
  const r = await client.query({
    text: q.query,
    values: q.params,
    rowMode: "array",
    types: asText,
  });
  return {
    command: r.command,
    rowCount: r.rowCount,
    fields: r.fields.map((f) => ({ name: f.name, dataTypeID: f.dataTypeID })),
    rows: r.rows,
  };
}

/** Neon's proxy, on this PC: one query, or a batch as one transaction. An error answers 400 with Postgres's own code. */
async function proxy(_endpoint: string, init: { body: string; headers: Record<string, string> }) {
  const body = JSON.parse(init.body) as Query | { queries: Query[] };
  const client = await pool.connect();
  try {
    if (!("queries" in body)) return Response.json(await run(client, body));
    batches++;
    const level = init.headers["Neon-Batch-Isolation-Level"];
    await client.query(
      level ? `begin isolation level ${level.replace(/([a-z])([A-Z])/g, "$1 $2")}` : "begin",
    );
    try {
      const results = [];
      for (const q of body.queries) results.push(await run(client, q));
      await client.query("commit");
      return Response.json({ results });
    } catch (e) {
      await client.query("rollback");
      throw e;
    }
  } catch (e) {
    const { message, code, detail, constraint } = e as pg.DatabaseError;
    return Response.json({ message, code, detail, constraint }, { status: 400 });
  } finally {
    client.release();
  }
}

const mails: string[] = [];
const api = handlers(() =>
  url
    ? {
        db: store(neon(url)),
        secret: SECRET,
        mail: async (subject) => {
          mails.push(subject);
          return true;
        },
      }
    : null,
);

let devices = 0;
const newDevice = () => `db-device-${String(++devices).padStart(12, "0")}`;
const stroke = {
  tool: "fat",
  col: "#e8452c",
  seed: 12345,
  pts: [0, 0, 0, 0.5, 10, 21, 16, 0.56],
  dr: [[4, 300, -3]],
};
/** One send, each from its own device and address unless told otherwise. A sent size is ignored by the server. */
async function send(x: number, y = 2, extra: Record<string, unknown> = {}) {
  const n = ++devices;
  const r = await api.POST(
    new Request("https://ttdevs.com/api/tags", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": `10.${(n >> 16) & 255}.${(n >> 8) & 255}.${n & 255}`,
      },
      body: JSON.stringify({
        name: "db test",
        device: newDevice(),
        spot: { x, y, w: 6, h: 4, turn: 0 },
        strokes: [stroke],
        ...extra,
      }),
    }),
  );
  const j = (await r.json()) as { id?: string; error?: string };
  return { status: r.status, id: j.id, error: j.error };
}
const rows = async () =>
  (
    await pool.query(
      "select id, status, name, strokes, x, y, w, h, turn, device from tags order by created_at",
    )
  ).rows as (Spot & {
    id: string;
    status: string;
    strokes: unknown;
    device: string;
  })[];
const count = async (table: "tags" | "sends") =>
  (await pool.query(`select count(*)::int as n from ${table}`)).rows[0].n as number;
const empty = () => pool.query("truncate tags, sends");
const tally = (answers: { status: number; error?: string }[]) => ({
  stored: answers.filter((a) => a.status === 200).length,
  taken: answers.filter((a) => a.status === 409 && a.error === "spot-taken").length,
  other: answers.filter((a) => a.status !== 200 && !(a.status === 409 && a.error === "spot-taken")),
});
const approve = (id: string) =>
  api.POST(
    new Request(`https://ttdevs.com/api/tags?review=${id}&sig=${sign(SECRET, id)}&do=approve`, {
      method: "POST",
    }),
  );

before(async () => {
  if (!url) return;
  neonConfig.fetchFunction = proxy;
  // the table must be the repo's own (tools/tags/schema.sql, put there by the task), never one made up here
  const cols = await pool.query(
    "select column_name from information_schema.columns where table_name = 'tags'",
  );
  assert.ok(cols.rowCount, "the tags table is missing. Run: mise run tags:db");
  await empty();
});
after(() => pool.end());

test("a real Postgres: one send is stored, with the server's own frame", { skip }, async () => {
  await empty();
  const a = await send(-12, 2);
  assert.equal(a.status, 200);
  const all = await rows();
  assert.equal(all.length, 1);
  const row = all[0]!;
  assert.equal(row.id, a.id);
  assert.equal(row.status, "waiting");
  assert.deepEqual(
    [row.x, row.y, row.w, row.h, row.turn],
    [-12, 2, VISITOR_FRAME.w, VISITOR_FRAME.h, 0],
  );
  assert.deepEqual(row.strokes, [stroke]);
  assert.equal(await count("sends"), 1);
  assert.equal(mails.length, 1);
});

test(
  `a real Postgres: ${SENDS} sends racing for the same spot, exactly one is stored`,
  { skip },
  async (t: TestContext) => {
    let stored = 0,
      taken = 0;
    const before = batches;
    for (let round = 0; round < ROUNDS; round++) {
      await empty();
      const answers = await Promise.all(Array.from({ length: SENDS }, () => send(3, 2)));
      const got = tally(answers);
      assert.deepEqual(got.other, [], `round ${round}: only 200 or 409 spot-taken`);
      assert.equal(got.stored, 1, `round ${round}: sends that got in`);
      assert.equal(got.taken, SENDS - 1, `round ${round}: sends told the spot is taken`);
      assert.equal(await count("tags"), 1, `round ${round}: tags stored`);
      assert.equal(
        await count("sends"),
        1,
        `round ${round}: only the stored tag's address is counted`,
      );
      stored += got.stored;
      taken += got.taken;
    }
    assert.equal(batches - before, ROUNDS * SENDS, "every send reached the store's transaction");
    t.diagnostic(
      `same spot: ${ROUNDS} rounds, ${ROUNDS * SENDS} sends, ${stored} stored, ${taken} answered 409 spot-taken`,
    );
  },
);

test(
  `a real Postgres: ${SENDS} sends racing for different free spots all get in`,
  { skip },
  async (t: TestContext) => {
    const rounds = Math.max(1, Math.round(ROUNDS / 5));
    let stored = 0;
    for (let round = 0; round < rounds; round++) {
      await empty();
      // two rows of spots exactly side by side and exactly on top of each other: touching is not overlapping
      const answers = await Promise.all(
        Array.from({ length: SENDS }, (_, i) =>
          send(-14.4 + (i % 12) * VISITOR_FRAME.w, 2 + (i < 12 ? 0 : VISITOR_FRAME.h)),
        ),
      );
      const got = tally(answers);
      assert.deepEqual(got.other, []);
      assert.equal(got.stored, SENDS, `round ${round}: sends that got in`);
      assert.equal(await count("tags"), SENDS);
      assert.equal(await count("sends"), SENDS);
      stored += got.stored;
    }
    t.diagnostic(`different spots: ${rounds} rounds, ${rounds * SENDS} sends, ${stored} stored`);
  },
);

test(
  "a real Postgres: partly overlapping spots clash, touching spots don't",
  { skip },
  async (t: TestContext) => {
    await empty();
    const { w, h } = VISITOR_FRAME;
    assert.equal((await send(0, 2)).status, 200);
    for (const [x, y] of [
      [w - 0.01, 2],
      [-(w - 0.01), 2],
      [0, 2 + h - 0.01],
      [1.2, 2.6],
      [-0.3, 1.4],
    ] as const)
      assert.deepEqual(
        await send(x, y),
        { status: 409, id: undefined, error: "spot-taken" },
        `a tag at ${x}, ${y} overlaps`,
      );
    for (const [x, y] of [
      [w, 2],
      [-w, 2],
      [0, 2 + h],
    ] as const)
      assert.equal((await send(x, y)).status, 200, `a tag at ${x}, ${y} only touches`);
    assert.equal(await count("tags"), 4);

    // racing: each spot overlaps its neighbours (none only touches), so who gets in depends on the order; whatever the order, no two stored tags overlap
    const rounds = Math.max(1, Math.round(ROUNDS / 5));
    let stored = 0,
      taken = 0;
    for (let round = 0; round < rounds; round++) {
      await empty();
      const answers = await Promise.all(
        Array.from({ length: SENDS }, (_, i) => send(-10 + i * 0.7, 2 + (i % 3) * 0.4)),
      );
      const got = tally(answers);
      assert.deepEqual(got.other, []);
      const all = await rows();
      assert.equal(all.length, got.stored, `round ${round}: stored tags and 200 answers`);
      assert.ok(got.stored >= 1 && got.taken === SENDS - got.stored);
      for (const a of all)
        for (const b of all)
          assert.ok(a === b || !overlaps(a, b), `round ${round}: two stored tags overlap`);
      stored += got.stored;
      taken += got.taken;
    }
    t.diagnostic(
      `overlapping spots: ${rounds} rounds, ${rounds * SENDS} sends, ${stored} stored, ${taken} answered 409 spot-taken, 0 stored tags overlap`,
    );
  },
);

test(
  "a real Postgres: an approved tag keeps its spot against new sends",
  { skip },
  async (t: TestContext) => {
    await empty();
    const first = await send(5, 3);
    assert.equal((await approve(first.id!)).status, 200);
    assert.equal((await rows())[0]!.status, "up");
    assert.deepEqual(await send(5, 3), { status: 409, id: undefined, error: "spot-taken" });
    assert.deepEqual(await send(6.5, 3.5), { status: 409, id: undefined, error: "spot-taken" });
    const got = tally(await Promise.all(Array.from({ length: SENDS }, () => send(5, 3))));
    assert.deepEqual([got.stored, got.taken, got.other], [0, SENDS, []]);
    assert.deepEqual(
      (await rows()).map((r) => r.id),
      [first.id],
    );
    t.diagnostic(`approved tag: ${SENDS + 2} sends for its spot, 0 stored`);
  },
);

test("a real Postgres: one device racing for different spots gets one tag", { skip }, async () => {
  await empty();
  const device = newDevice();
  const answers = await Promise.all(
    Array.from({ length: SENDS }, (_, i) => send(-20 + i * 3, 2, { device })),
  );
  assert.equal(answers.filter((a) => a.status === 200).length, 1);
  assert.equal(answers.filter((a) => a.status === 409 && a.error === "one-tag").length, SENDS - 1);
  assert.equal(await count("tags"), 1);
  assert.equal(await count("sends"), 1);
});

test("a real Postgres: the public answer's taken list is what is stored", { skip }, async () => {
  await empty();
  const sent = await Promise.all([
    send(-9.127, 2.004),
    send(0, 2),
    send(4.2, 5.555),
    send(0.4, 2.2),
    send(11, 0),
  ]);
  assert.deepEqual(
    [sent[0], sent[2], sent[4]].map((s) => s!.status),
    [200, 200, 200],
  );
  assert.equal(sent[1]!.status + sent[3]!.status, 609, "of the two overlapping sends one got in");
  await approve(sent[0]!.id!);
  const r = await api.GET(new Request("https://ttdevs.com/api/tags"));
  const answer = (await r.json()) as {
    tags: Record<string, unknown>[];
    held: Spot[];
    taken: number[][];
  };
  const all = await rows();
  assert.equal(all.length, 4);
  const cm = (v: number) => Math.round(v * 100) / 100;
  const sorted = (list: number[][]) => list.map((s) => s.join(" ")).sort();
  assert.deepEqual(
    sorted(answer.taken),
    sorted(all.map((s) => [cm(s.x), cm(s.y), cm(s.w), cm(s.h)])),
  );
  assert.ok(answer.taken.every((s) => s[2] === VISITOR_FRAME.w && s[3] === VISITOR_FRAME.h));
  assert.deepEqual(
    answer.tags.map((tag) => tag.id),
    [sent[0]!.id],
  );
  assert.equal(answer.held.length, 3);
  // the page offers no spot the store would refuse: a send for any listed spot is refused, by the same list
  for (const [x, y] of answer.taken) assert.equal((await send(x!, y!)).error, "spot-taken");
  assert.ok(
    !/device|ip_hash|db-device/.test(JSON.stringify(answer)),
    "no device or address leaves the server",
  );
});

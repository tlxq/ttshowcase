import { test } from "node:test";
import assert from "node:assert/strict";
import { answer, numbers } from "../../api/github.ts";

const json = (body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { headers });

/** GitHub with fixed answers; `fail` makes the asks it matches come back refused (403). */
function github(fail: RegExp | null = null) {
  return async (url: string) => {
    if (fail?.test(decodeURIComponent(url))) return new Response("", { status: 403 });
    if (/\/commits\?/.test(url))
      return json([{}], {
        Link: '<https://x/?page=2>; rel="next", <https://x/?page=346>; rel="last"',
      });
    if (/search\/issues/.test(url)) return json({ total_count: 14, incomplete_results: false });
    if (/git\/trees/.test(url))
      return json({
        truncated: false,
        tree: [
          { type: "blob", path: "t/a.bats" },
          { type: "blob", path: "plugins/p/skills/s/SKILL.md" },
          { type: "blob", path: "plugins/p/skills/s2/SKILL.md" },
          { type: "blob", path: "apps/m/src/__tests__/a.test.ts" },
          { type: "blob", path: "apps/m/src/__tests__/b.test.tsx" },
          { type: "blob", path: "apps/m/src/notes.ts" },
          { type: "blob", path: "supabase/tests/database/one.sql" },
          { type: "blob", path: "supabase/migrations/1_a.sql" },
          { type: "blob", path: "supabase/migrations/2_b.sql" },
          { type: "blob", path: "supabase/migrations/3_c.sql" },
        ],
      });
    return new Response("@test one\n@test two\nnot a test\n");
  };
}

test("every number comes from one round of asks", async () => {
  assert.deepEqual(await numbers(github()), {
    dot: { commits: 346, tests: 2 },
    ttoolbox: { commits: 346, skills: 2 },
    tthermal: { commits: 346, merged: 14 },
    epa: { commits: 346, merged: 14, tests: 3, migrations: 3 },
  });
});

test("a refused ask leaves only its own number empty, never a made-up one", async () => {
  const n = await numbers(github(/repos\/tlxq\/eparadar\/commits/));
  assert.equal(n.epa?.commits, null);
  assert.equal(n.epa?.merged, 14);
  assert.equal(n.dot?.commits, 346);
});

test("when GitHub refuses everything the answer is all null and short-lived", async () => {
  const r = await answer(github(/.*/));
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), {
    dot: { commits: null, tests: null },
    ttoolbox: { commits: null, skills: null },
    tthermal: { commits: null, merged: null },
    epa: { commits: null, merged: null, tests: null, migrations: null },
  });
  assert.match(r.headers.get("Cache-Control")!, /s-maxage=300$/);
});

test("a whole answer is kept at the edge for an hour", async () => {
  const r = await answer(github());
  assert.match(r.headers.get("Cache-Control")!, /s-maxage=3600/);
});

test("the token is sent only when there is one", async () => {
  const seen: (string | undefined)[] = [];
  const get = async (_: string, init?: RequestInit) => {
    seen.push((init?.headers as Record<string, string>).Authorization);
    return new Response("", { status: 500 });
  };
  await numbers(get);
  const before = seen.length;
  await numbers(get, "tok");
  assert.ok(seen.slice(0, before).every((h) => h === undefined));
  assert.ok(seen.slice(before).every((h) => h === "Bearer tok"));
});

const without = (n: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(n).filter(([k]) => k !== "rvf"));

test("the private repo is asked only with a token", async () => {
  const none = await numbers(github());
  assert.ok(!("rvf" in none));
  const withTok = await numbers(github(), "tok");
  assert.deepEqual(withTok.rvf, { commits: 346, merged: 14 });
  assert.deepEqual(without(withTok), none);
});

for (const status of [404, 403]) {
  test(`a token that can't see the private repo (${status}) leaves rvf out, the rest whole`, async () => {
    const ok = github();
    const get = async (url: string) =>
      /raddavarfruberga/.test(decodeURIComponent(url)) ? new Response("", { status }) : ok(url);
    const n = await numbers(get, "tok");
    assert.ok(!("rvf" in n));
    assert.deepEqual(n, await numbers(github()));
    assert.match((await answer(get, "tok")).headers.get("Cache-Control")!, /s-maxage=3600/);
  });
}

test("the token never reaches an answer or a log, even when GitHub echoes it back", async () => {
  const heard: string[] = [];
  const keep = (...a: unknown[]) =>
    void heard.push(
      a.map((x) => (x instanceof Error ? `${x.message}\n${x.stack}` : String(x))).join(" "),
    );
  const methods = ["log", "info", "warn", "error", "debug", "trace"] as const;
  const saved = methods.map((m) => console[m]);
  const writeOut = process.stdout.write;
  const writeErr = process.stderr.write;
  methods.forEach((m) => (console[m] = keep));
  process.stdout.write = ((c: unknown) => (keep(c), true)) as typeof process.stdout.write;
  process.stderr.write = ((c: unknown) => (keep(c), true)) as typeof process.stderr.write;
  let calls = 0;
  let body = "";
  let headers = "";
  try {
    // refused, with the token echoed in the body and in a header; every third ask throws an error that holds it too
    const get = async (_: string, init?: RequestInit) => {
      const auth = (init?.headers as Record<string, string>).Authorization ?? "";
      if (++calls % 3 === 0) throw new Error(`network down for ${auth}`);
      return new Response(JSON.stringify({ message: "bad", echo: auth }), {
        status: 401,
        headers: { "X-Echo": auth },
      });
    };
    const r = await answer(get, "ghp_SECRET123");
    body = JSON.stringify(await r.json());
    headers = [...r.headers].join();
  } finally {
    methods.forEach((m, i) => (console[m] = saved[i] as never));
    process.stdout.write = writeOut;
    process.stderr.write = writeErr;
  }
  assert.ok(calls > 3, "the failing asks really ran");
  const places: [string, string][] = [
    ["body", body],
    ["headers", headers],
    ["console", heard.join("\n")],
  ];
  for (const [where, text] of places) {
    assert.ok(!text.includes("SECRET123"), `the token is in the ${where}`);
    assert.ok(!text.includes("Bearer"), `the token's header is in the ${where}`);
  }
});

test("a cut-off file list gives null for every number that counts files, never a too-low one", async () => {
  const ok = github();
  const get = async (url: string) =>
    /\/trees\//.test(url)
      ? json({ truncated: true, tree: [{ type: "blob", path: "supabase/migrations/1_a.sql" }] })
      : ok(url);
  const n = await numbers(get);
  assert.deepEqual(n.epa, { commits: 346, merged: 14, tests: null, migrations: null });
  assert.deepEqual(n.dot, { commits: 346, tests: null });
  assert.deepEqual(n.ttoolbox, { commits: 346, skills: null });
  // the numbers that don't read the list stay whole, and the answer is asked again in five minutes
  assert.match((await answer(get)).headers.get("Cache-Control")!, /s-maxage=300$/);
});

test("a passing fault on the private repo (500) keeps rvf empty and asks again in five minutes", async () => {
  const ok = github();
  const get = async (url: string) =>
    /raddavarfruberga/.test(decodeURIComponent(url)) ? new Response("", { status: 500 }) : ok(url);
  const n = await numbers(get, "tok");
  assert.deepEqual(n.rvf, { commits: null, merged: null });
  assert.match((await answer(get, "tok")).headers.get("Cache-Control")!, /s-maxage=300$/);
});

test("the token goes to GitHub's API only, not to the raw file host", async () => {
  const ok = github();
  const seen: string[] = [];
  const get = async (url: string, init?: RequestInit) => {
    if (new Headers(init?.headers).get("Authorization")) seen.push(new URL(url).host);
    return ok(url);
  };
  await numbers(get, "tok");
  assert.ok(seen.length > 0);
  assert.deepEqual([...new Set(seen)], ["api.github.com"]);
});

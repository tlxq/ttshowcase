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
    epa: { commits: 346, merged: 14 },
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
    epa: { commits: null, merged: null },
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

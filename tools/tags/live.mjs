// Run through tools/tags/live.sh, which loads DATABASE_URL and TAG_SECRET.
import { createHmac, randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";

const base = process.env.BASE,
  secret = process.env.TAG_SECRET,
  db = process.env.DATABASE_URL;
if (!secret) throw new Error("TAG_SECRET isn't set in Vercel");
const api = base + "/api/tags";
const sig = (id) =>
  createHmac("sha256", secret)
    .update("review:" + id)
    .digest("base64url");
const listed = async (id) =>
  ((await (await fetch(api, { cache: "no-store" })).json()).tags ?? []).some((t) => t.id === id);
const step = (ok, what) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${what}`);
  if (!ok) process.exitCode = 1;
};

const sent = await fetch(api, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    name: "test",
    pen: "graffiti",
    color: "#e8452c",
    spot: { x: -12, y: 2, w: 1.4, turn: 0 },
    strokes: [[0, 0, 0, 0.5, 400, 300, 120, 0.8, 800, 0, 240, 0.6]],
    device: "live-test-" + randomBytes(8).toString("hex"),
  }),
});
const body = await sent.json();
step(
  sent.ok && body.id && body.removeKey,
  `send: ${sent.status} ${JSON.stringify(body).slice(0, 80)}`,
);
if (!sent.ok) process.exit(1);
const { id, removeKey } = body;
try {
  // The list is cached for up to a minute, but a tag that was never approved can't be in it.
  step(!(await listed(id)), "not on the wall before Tom approves");
  const page = await fetch(`${api}?review=${id}&sig=${sig(id)}`);
  step(page.ok && /Approve/.test(await page.text()), `review page: ${page.status}`);
  step(
    (await fetch(`${api}?review=${id}&sig=nope`)).status === 404,
    "review page with a wrong signature: 404",
  );
  const ok = await fetch(`${api}?review=${id}&sig=${sig(id)}&do=approve`, { method: "POST" });
  step(ok.ok, `approve: ${ok.status}`);
  const mine = await (await fetch(`${api}?ids=${id}`)).json();
  step(mine.tags?.[0]?.status === "up", `status after approve: ${mine.tags?.[0]?.status}`);
  const wrong = await fetch(api, {
    method: "DELETE",
    body: JSON.stringify({ id, removeKey: "nope" }),
  });
  step(wrong.status === 404, "take down with a wrong key: 404");
  const down = await fetch(api, { method: "DELETE", body: JSON.stringify({ id, removeKey }) });
  step(down.ok, `take down with the visitor's key: ${down.status}`);
  const after = await (await fetch(`${api}?ids=${id}`)).json();
  step(after.tags?.[0]?.status === "removed", `status after take down: ${after.tags?.[0]?.status}`);
} finally {
  execFileSync("psql", [db, "-qAt", "-c", `delete from tags where id = '${id}' and name = 'test'`]);
  console.log("test tag deleted");
}

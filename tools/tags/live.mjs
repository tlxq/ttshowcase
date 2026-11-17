// Run through tools/tags/live.sh, which passes BASE and TAG_SECRET.
import { createHmac, randomBytes } from "node:crypto";

const api = process.env.BASE + "/api/tags";
const secret = process.env.TAG_SECRET;
const sig = (id) =>
  createHmac("sha256", secret)
    .update("review:" + id)
    .digest("base64url");
const step = (ok, what) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${what}`);
  if (!ok) process.exitCode = 1;
};
const status = async (id) =>
  (await (await fetch(`${api}?ids=${id}`)).json()).tags?.[0]?.status ?? "gone";
// Off the visitor wall on purpose: a test tag must never show to anyone.
const spot = { x: 40 + Math.random() * 5, y: 15, w: 0.4, h: 0.2, turn: 0 };

const sent = await fetch(api, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    name: "test",
    pen: "graffiti",
    color: "#e8452c",
    spot,
    strokes: [[0, 0, 0, 0.5, 400, 300, 120, 0.8, 800, 0, 240, 0.6]],
    device: "live-test-" + randomBytes(8).toString("hex"),
  }),
});
const body = await sent.json();
step(sent.ok && body.id, `send: ${sent.status} ${JSON.stringify(body)}`);
if (!sent.ok) process.exit(1);
const { id } = body;
const review = `${api}?review=${id}&sig=${sig(id)}`;
try {
  step((await status(id)) === "waiting", "waiting for Tom's OK");
  const again = await fetch(api, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "test",
      pen: "graffiti",
      color: "#e8452c",
      spot,
      strokes: [[0, 0, 0, 0.5]],
      device: "live-test-" + randomBytes(8).toString("hex"),
    }),
  });
  step(again.status === 409, `another tag on the same spot: ${again.status} (held)`);
  const page = await fetch(review);
  step(page.ok && /Approve/.test(await page.text()), `review page: ${page.status}`);
  step(
    (await fetch(`${api}?review=${id}&sig=nope`)).status === 404,
    "review page with a wrong signature: 404",
  );
  step((await fetch(review + "&do=approve", { method: "POST" })).ok, "approve");
  step((await status(id)) === "up", "on the wall after approve");
} finally {
  const removed = await fetch(review + "&do=remove", { method: "POST" });
  step(removed.ok && (await status(id)) === "gone", `remove: ${removed.status}, tag gone`);
}

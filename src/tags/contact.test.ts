import { test } from "node:test";
import assert from "node:assert/strict";
import { contact, mailHash, MAIL_PER_ADDRESS, type ContactDeps } from "../../api/contact.ts";

const SECRET = "x".repeat(40);

/** The handler on an in-memory sends table and a mail box that keeps what was sent. */
function world(mailWorks = true, human?: boolean) {
  const sends: string[] = [];
  const mails: Parameters<ContactDeps["mail"]>[0][] = [];
  const deps: ContactDeps = {
    secret: SECRET,
    async sentToday(ipHash) {
      return sends.filter((s) => s === ipHash).length;
    },
    async count(ipHash) {
      sends.push(ipHash);
    },
    async refund(ipHash) {
      const i = sends.lastIndexOf(ipHash);
      if (i >= 0) sends.splice(i, 1);
    },
    async mail(m) {
      mails.push(m);
      return mailWorks;
    },
  };
  if (human !== undefined) deps.human = async () => human;
  return { sends, mails, post: contact(() => deps) };
}

const send = (body: Record<string, unknown>, ip = "1.2.3.4") =>
  new Request("https://ttdevs.com/api/contact", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
const letter = { name: "Kasper", email: "k@example.com", message: "Hej Tom" };

test("a message goes to Tom with the visitor as reply-to", async () => {
  const w = world();
  const r = await w.post(send(letter));
  assert.equal(r.status, 200);
  assert.deepEqual(w.mails, [
    { replyTo: "k@example.com", subject: "Message from Kasper <k@example.com>", text: "Hej Tom" },
  ]);
});

test("the subject is one line: line breaks and hidden characters in the name are dropped", async () => {
  const w = world();
  await w.post(send({ ...letter, name: "Kas\r\nBcc: x@y.z\u200eper" }));
  assert.equal(w.mails[0]!.subject, "Message from KasBcc: x@y.zper <k@example.com>");
});

test("a robot (BotID says so) is refused: nothing counted, nothing mailed", async () => {
  const w = world(true, false);
  const r = await w.post(send(letter));
  assert.equal(r.status, 403);
  assert.deepEqual(await r.json(), { error: "robot" });
  assert.deepEqual(w.sends, []);
  assert.deepEqual(w.mails, []);
  assert.equal(
    (await world(true, true).post(send(letter))).status,
    200,
    "a person still gets through",
  );
});

test(`${MAIL_PER_ADDRESS} messages a day per address, then too-many and no mail`, async () => {
  const w = world();
  for (let i = 0; i < MAIL_PER_ADDRESS; i++) assert.equal((await w.post(send(letter))).status, 200);
  const r = await w.post(send(letter));
  assert.equal(r.status, 429);
  assert.deepEqual(await r.json(), { error: "too-many" });
  assert.equal(w.mails.length, MAIL_PER_ADDRESS);
  // Another address still gets through.
  assert.equal((await w.post(send(letter, "5.6.7.8"))).status, 200);
});

test("a send the mail service turns down is given back", async () => {
  const w = world(false);
  for (let i = 0; i < MAIL_PER_ADDRESS + 2; i++) {
    const r = await w.post(send(letter));
    assert.equal(r.status, 502);
    assert.deepEqual(await r.json(), { error: "mail-service" });
  }
  assert.equal(w.sends.length, 0);
});

test("robots, bad addresses and empty messages are never counted or mailed", async () => {
  const w = world();
  assert.equal((await w.post(send({ ...letter, website: "x" }))).status, 200);
  assert.equal((await w.post(send({ ...letter, email: "nope" }))).status, 400);
  assert.equal((await w.post(send({ ...letter, message: " " }))).status, 400);
  assert.equal((await w.post(send({ ...letter, message: "x".repeat(4001) }))).status, 400);
  assert.equal(w.sends.length, 0);
  assert.equal(w.mails.length, 0);
});

test("mail and tags count apart, and no real address is stored", () => {
  const r = send(letter);
  const h = mailHash(r, SECRET);
  assert.ok(!h.includes("1.2.3.4"));
  assert.equal(h, mailHash(send(letter), SECRET));
  assert.notEqual(h, mailHash(send(letter, "5.6.7.8"), SECRET));
});

test("no database, no mail", async () => {
  let mailed = 0;
  const post = contact(() => ({
    secret: SECRET,
    sentToday: () => Promise.reject(new Error("down")),
    count: async () => {},
    refund: async () => {},
    mail: async () => (mailed++, true),
  }));
  assert.equal((await post(send(letter))).status, 503);
  assert.equal(mailed, 0);
});

test("not set up answers 503", async () => {
  const r = await contact(() => null)(send(letter));
  assert.equal(r.status, 503);
});

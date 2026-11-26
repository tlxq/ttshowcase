// The contact form's one send (sendContact.ts): the request it makes and every way it can end, in the visitor's words.
import assert from "node:assert/strict";
import { test } from "node:test";

import words from "./mailWords.json" with { type: "json" };
import { sendContact } from "./sendContact.ts";

const fields = { name: "Ada", email: "ada@example.com", message: "Hi", website: "" };
const reply = (status: number, body?: unknown) =>
  (async () =>
    new Response(body === undefined ? "not json" : JSON.stringify(body), {
      status,
    })) as typeof fetch;

test("it posts the fields as JSON to /api/contact", async () => {
  let seen: { url: unknown; init: RequestInit | undefined } | undefined;
  const post = (async (url: unknown, init?: RequestInit) => {
    seen = { url, init };
    return new Response("{}", { status: 200 });
  }) as typeof fetch;
  assert.deepEqual(await sendContact(fields, words, post), { ok: true });
  assert.equal(seen?.url, "/api/contact");
  assert.equal(seen?.init?.method, "POST");
  assert.deepEqual(seen?.init?.headers, { "Content-Type": "application/json" });
  assert.equal(seen?.init?.body, JSON.stringify(fields));
});

test("it sends with the page's own fetch, the one Vercel BotID wraps, read at the moment of sending", async () => {
  const real = globalThis.fetch;
  let used = 0;
  globalThis.fetch = (async () => {
    used++;
    return new Response("{}", { status: 200 });
  }) as typeof fetch;
  try {
    assert.deepEqual(await sendContact(fields, words), { ok: true });
  } finally {
    globalThis.fetch = real;
  }
  assert.equal(used, 1, "a fetch put in place after the file loaded was not used");
});

test("each error code the server sends gets its own line, and names the field", async () => {
  for (const [code, line] of Object.entries(words.why)) {
    const r = await sendContact(fields, words, reply(400, { error: code }));
    assert.deepEqual(r, { ok: false, code, known: true, why: line, text: words.lead + line });
  }
});

test("an error the page has no line for says the mail service didn't answer", async () => {
  for (const r of [
    await sendContact(fields, words, reply(500, { error: "something-new" })),
    await sendContact(fields, words, reply(502)), // not JSON at all
    await sendContact(fields, words, reply(500, {})),
  ]) {
    assert.equal(r.ok, false);
    if (r.ok) continue;
    assert.equal(r.known, false);
    assert.equal(r.why, words.other);
    assert.equal(r.text, words.lead + words.other);
  }
});

test("no answer from the server says the page couldn't reach it", async () => {
  const post = (async () => {
    throw new TypeError("Failed to fetch");
  }) as typeof fetch;
  const r = await sendContact(fields, words, post);
  assert.deepEqual(r, {
    ok: false,
    code: "",
    known: false,
    why: words.offline,
    text: words.lead + words.offline,
  });
});

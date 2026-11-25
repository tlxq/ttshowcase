// F-102-1: api/contact.ts and api/tags.ts answer 403 {"error":"robot"} when Vercel BotID refuses a send. Every page that
// maps the contact form's error codes to words needs a line for it, or the visitor reads that the mail service didn't answer.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = join(fileURLToPath(import.meta.url), "../../..");
const clients = ["src/look/MailForm.tsx", "pitch/front.src.html", "pitch/paint/50-end.js"];

for (const file of clients) {
  test(`${file} says what a robot refusal means`, () => {
    const text = readFileSync(join(root, file), "utf8");
    assert.match(text, /"too-many":/, "this file no longer maps the error codes: update this test");
    const line = text.match(/\brobot: "([^"]+)"/);
    assert.ok(line, "no line for the error code robot");
    assert.doesNotMatch(line[1], /mail service/, "a robot refusal is not a mail service failure");
    assert.match(line[1], /try again/i, "say what to do next (signum W6)");
  });
}

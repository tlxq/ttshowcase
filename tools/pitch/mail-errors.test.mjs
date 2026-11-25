// The contact form's words (error lines, the lead, the two fall-backs) live once, in src/content/mailWords.json. The site's form
// (src/look/MailForm.tsx) imports it; the two pitch pages get it from tools/pitch/build.mjs through __MAIL_WORDS__.
// This fails if one of the three holds a copy of its own again, or if the words say the wrong thing.
// F-102-1: api/contact.ts and api/tags.ts answer 403 {"error":"robot"} when Vercel BotID refuses a send; that line must exist and say what to do.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = join(fileURLToPath(import.meta.url), "../../..");
const read = (file) => readFileSync(join(root, file), "utf8");
const words = JSON.parse(read("src/content/mailWords.json"));
const clients = {
  "src/look/MailForm.tsx": /from "@\/content\/mailWords\.json"/,
  "pitch/front.src.html": /__MAIL_WORDS__/,
  "pitch/paint/50-end.js": /__MAIL_WORDS__/,
};

test("the words say what a robot refusal means", () => {
  assert.ok(words.why.robot, "no line for the error code robot");
  assert.doesNotMatch(
    words.why.robot,
    /mail service/,
    "a robot refusal is not a mail service failure",
  );
  assert.match(words.why.robot, /try again/i, "say what to do next (signum W6)");
  for (const code of ["email", "message", "too-many"])
    assert.ok(words.why[code], `no line for ${code}`);
});

for (const [file, source] of Object.entries(clients)) {
  test(`${file} reads the one source and keeps no copy`, () => {
    const text = read(file);
    assert.match(text, source, "this file no longer reads src/content/mailWords.json");
    for (const line of [
      words.lead.trim(),
      words.other,
      words.offline,
      ...Object.values(words.why),
    ]) {
      // JSX writes an apostrophe as &apos;
      assert.ok(
        !text.includes(line) && !text.includes(line.replaceAll("'", "&apos;")),
        `${file} holds its own copy of "${line}": it belongs in src/content/mailWords.json only`,
      );
    }
  });
}

test("the build fills the pitch pages with the same words", () => {
  const build = read("tools/pitch/build.mjs");
  assert.match(build, /__MAIL_WORDS__[\s\S]{0,80}src\/content\/mailWords\.json/);
  assert.match(build, /replaceAll\("__MAIL_WORDS__"/, "front.html is not filled with the words");
});

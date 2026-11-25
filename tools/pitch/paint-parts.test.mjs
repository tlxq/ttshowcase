// The paint pitch's parts (pitch/paint/): the page's markers get filled, the order list matches the files, and the
// parts of the script cut cleanly (each is whole statements, so they join back into the one scope they came from).
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CSS_MARKER, JS_MARKER, fillParts, readParts } from "./paint-parts.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const dir = join(root, "pitch/paint");

function scratch(files) {
  const d = mkdtempSync(join(tmpdir(), "paint-parts-"));
  for (const [n, text] of Object.entries(files)) writeFileSync(join(d, n), text);
  return d;
}

test("no marker is left unfilled in the page the build makes", () => {
  const page = fillParts(readFileSync(join(root, "pitch/paint.src.html"), "utf8"), readParts(dir));
  assert.ok(!page.includes("__PAINT_"), "a __PAINT_ marker is still in the page");
  assert.ok(page.includes("(() => {"), "the script's opening is in the page");
});

test("a page that lost a marker is refused", () => {
  const parts = { css: "a{}\n", js: "x();\n" };
  assert.throws(() => fillParts("<style>\n</style>\n" + JS_MARKER, parts), /__PAINT_CSS__/);
  assert.throws(() => fillParts(CSS_MARKER + "<script>\n</script>", parts), /__PAINT_JS__/);
  assert.equal(fillParts(CSS_MARKER + JS_MARKER, parts), "a{}\nx();\n");
});

test("the parts are joined in the order the list gives, byte for byte", () => {
  const d = scratch({
    "order.txt": "b.js\na.js\n",
    "a.js": "A\n",
    "b.js": "B\n",
    "style.css": "c\n",
  });
  try {
    assert.deepEqual(readParts(d), { css: "c\n", js: "B\nA\n" });
  } finally {
    rmSync(d, { recursive: true });
  }
});

test("a part missing from the list, or the list naming a missing part, fails the build", () => {
  const d = scratch({ "order.txt": "a.js\n", "a.js": "A\n", "b.js": "B\n", "style.css": "" });
  try {
    assert.throws(() => readParts(d), /b\.js is not in pitch\/paint\/order\.txt/);
    writeFileSync(join(d, "order.txt"), "a.js\nb.js\nc.js\n");
    assert.throws(() => readParts(d), /lists c\.js, which is not in pitch\/paint/);
    writeFileSync(join(d, "order.txt"), "a.js\na.js\nb.js\n");
    assert.throws(() => readParts(d), /a\.js twice/);
  } finally {
    rmSync(d, { recursive: true });
  }
});

test("each script part is whole statements, so no seam falls inside a function or string", () => {
  const { js } = readParts(dir);
  const names = readFileSync(join(dir, "order.txt"), "utf8").split("\n").filter(Boolean);
  assert.ok(names.length > 1);
  // the first part opens the one scope and the last closes it: strip those two lines, then each middle part must parse alone
  names.forEach((n, i) => {
    let text = readFileSync(join(dir, n), "utf8");
    if (i === 0) text = text.replace(/^\(\(\) => \{\n/, "");
    if (i === names.length - 1) text = text.replace(/\}\)\(\);\n$/, "");
    assert.doesNotThrow(() => new Function(text), `${n} is not whole statements`);
  });
  assert.doesNotThrow(() => new Function(js.replace(/__[A-Z_]{3,}__/g, "0")));
});

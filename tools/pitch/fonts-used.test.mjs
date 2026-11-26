// Each pitch page embeds exactly the fonts it uses (audit N-30). The build runs the same check on both built pages (tools/pitch/build.mjs).
import { test } from "node:test";
import assert from "node:assert/strict";
import { fontProblems } from "./fonts-used.mjs";

const face = (name) =>
  `@font-face{font-family:'${name}';src:url(data:font/woff2;base64,AAAA) format('woff2')}`;

test("a font the page never uses is named", () => {
  const html = `<style>${face("Inter")}${face("Clash Display")} body{font:16px "Inter"}</style>`;
  assert.deepEqual(fontProblems(html, "front"), [
    "front embeds Clash Display but never uses it: drop it from tools/pitch/build.mjs",
  ]);
});

test("a canvas font string counts as use, and so does a font loaded by name", () => {
  const html = `${face("Saira Stencil One")}${face("Archivo")}<script>g.font = \`40px "Saira Stencil One", sans-serif\`; document.fonts.load('900 100px "Archivo"')</script>`;
  assert.deepEqual(fontProblems(html, "walk"), []);
});

test("a font used but not embedded is named", () => {
  const html = `<style>${face("Inter")} h1{font:900 1em "Archivo"} p{font:1em "Inter"}</style>`;
  assert.deepEqual(fontProblems(html, "walk"), [
    "walk uses Archivo but does not embed it: add it in tools/pitch/build.mjs",
  ]);
});

test("the family's name inside its own @font-face does not count as use", () => {
  assert.equal(fontProblems(face("Inter"), "front").length, 1);
});

// The two pitch pages embed their fonts as base64 in the head, and base64 does not compress: a font a page never uses is bytes on the
// wire before first paint (audit N-30). This names the fonts a built page embeds but never uses, and the fonts it uses but does not embed.
// "Used" means the family is written in quotes anywhere outside its own @font-face rule: a stylesheet (font:, font-family, a token),
// a canvas (`ctx.font = ...`, three.js text textures) or a document.fonts.load string all count.
export const FAMILIES = [
  "Clash Display",
  "Saira Stencil One",
  "Sedgwick Ave Display",
  "Inter",
  "Archivo",
  "JetBrains Mono",
];

export function fontProblems(html, page) {
  const embedded = new Set(
    [...html.matchAll(/@font-face\{font-family:'([^']+)'/g)].map((m) => m[1]),
  );
  const rest = html.replace(/@font-face\{[^}]*\}/g, "");
  const problems = [];
  for (const family of FAMILIES) {
    const used = new RegExp(`["'\`]${family}["'\`]`).test(rest);
    if (embedded.has(family) && !used)
      problems.push(
        `${page} embeds ${family} but never uses it: drop it from tools/pitch/build.mjs`,
      );
    if (used && !embedded.has(family))
      problems.push(
        `${page} uses ${family} but does not embed it: add it in tools/pitch/build.mjs`,
      );
  }
  return problems;
}

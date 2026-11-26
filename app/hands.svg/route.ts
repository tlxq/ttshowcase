import { handMarkup } from "@/look/handMarkup";
import type { HandName } from "@/look/handPaint";

export const dynamic = "force-static";

/** The pieces written as the page scrolls (Hand's "scroll" mode); the tag over the first screen stays in the page. */
const pieces: HandName[] = [
  "hi",
  "tools",
  "running",
  "circle",
  "tryIt",
  "server",
  "wip",
  "askMe",
  "signature",
];

/** The strokes of every piece, one group each, made at build time from the same paint as the page's;
 * Motion.tsx puts each group into its piece's svg. One file, so the page makes one request for them. */
export function GET() {
  const groups = pieces.map((name) => `<g id="${name}">${handMarkup(name)}</g>`).join("");
  return new Response(`<svg xmlns="http://www.w3.org/2000/svg">${groups}</svg>`, {
    headers: { "Content-Type": "image/svg+xml" },
  });
}

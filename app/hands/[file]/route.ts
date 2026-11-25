import { handMarkup } from "@/look/handMarkup";
import type { HandName } from "@/look/handPaint";

export const dynamic = "force-static";
export const dynamicParams = false;

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

export function generateStaticParams() {
  return pieces.map((name) => ({ file: `${name}.svg` }));
}

/** One piece's strokes, made at build time from the same paint as the page's; Motion.tsx puts them into the page. */
export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const name = (await params).file.replace(/\.svg$/, "") as HandName;
  const inner = handMarkup(name);
  return new Response(`<svg xmlns="http://www.w3.org/2000/svg">${inner}</svg>`, {
    headers: { "Content-Type": "image/svg+xml" },
  });
}

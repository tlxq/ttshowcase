import { iconSvg } from "@/look/iconSvg";

export const dynamic = "force-static";

/** The browser tab's icon: Tom's icon tag in the spray colour on the look's dark ground, made at
 * build time from the same paint as the page's. */
export function GET() {
  const { view, side, ground, spray, d } = iconSvg();
  const [x, y] = view.split(" ");
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${view}">` +
    `<rect x="${x}" y="${y}" width="${side.toFixed(0)}" height="${side.toFixed(0)}" rx="${(side * 0.2).toFixed(0)}" fill="${ground}"/>` +
    `<path fill="${spray}" d="${d}"/></svg>`;
  return new Response(svg, { headers: { "Content-Type": "image/svg+xml" } });
}

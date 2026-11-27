import { iconTabSvg } from "@/look/iconSvg";

export const dynamic = "force-static";

/** The browser tab's icon: Tom's icon tag in the paint blue on the look's dark ground, made at
 * build time from the same paint as the page's. */
export function GET() {
  return new Response(iconTabSvg(), { headers: { "Content-Type": "image/svg+xml" } });
}

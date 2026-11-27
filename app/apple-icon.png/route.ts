import { readFileSync } from "node:fs";

export const dynamic = "force-static";

/** The icon for a phone's home screen: the TT mark as a piece letter on a cloud, the picture Tom approved
 * 11-27 (180 px, assets/piece-180.png beside this file). */
export function GET() {
  return new Response(readFileSync("app/apple-icon.png/assets/piece-180.png"), {
    headers: { "Content-Type": "image/png" },
  });
}

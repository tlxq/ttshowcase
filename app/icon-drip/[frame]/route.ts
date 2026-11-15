import { DRIP_FRAMES } from "@/look/dripFrames";
import { iconDripSvg } from "@/look/iconSvg";

export const dynamic = "force-static";
export const dynamicParams = false;

/** The tab icon with its paint dripping, one picture per step (icon-drip/1.svg and on), made at build
 * time. The page swaps between them while a visitor is away (TabAway.tsx). */
export function generateStaticParams() {
  return Array.from({ length: DRIP_FRAMES }, (_, i) => ({ frame: `${i + 1}.svg` }));
}

export async function GET(_: Request, { params }: { params: Promise<{ frame: string }> }) {
  const { frame } = await params;
  return new Response(iconDripSvg(parseInt(frame, 10)), {
    headers: { "Content-Type": "image/svg+xml" },
  });
}

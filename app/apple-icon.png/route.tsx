import { ImageResponse } from "next/og";
import { iconSvg } from "@/look/iconSvg";

export const dynamic = "force-static";

const size = 180;

/** The icon for a phone's home screen: the tab icon, drawn as a picture at build time. */
export function GET() {
  const { view, side, ground, spray, d } = iconSvg();
  const [x, y] = view.split(" ");
  return new ImageResponse(
    <svg width={size} height={size} viewBox={view}>
      <rect x={x} y={y} width={side} height={side} fill={ground} />
      <path d={d} fill={spray} />
    </svg>,
    { width: size, height: size },
  );
}

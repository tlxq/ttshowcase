/**
 * Guards /next (src/release/next-gate.ts). Vercel runs this file as Routing Middleware in front of the static site;
 * `next dev` runs it as its proxy, so the Tailscale dev server guards /next the same way.
 */
import { gate } from "./src/release/next-gate";

export const config = { matcher: ["/next", "/next/:path*", "/next.html", "/next.txt"] };

export default async function middleware(request: Request): Promise<Response | undefined> {
  const url = new URL(request.url);
  const g = gate(url, request.headers.get("cookie"), process.env.PREVIEW_KEY);
  if (g.kind === "pass") return undefined;
  if (g.kind === "redirect") {
    return new Response(null, {
      status: 303,
      headers: {
        Location: new URL(g.location, url).toString(),
        "Set-Cookie": g.setCookie,
        "Cache-Control": "no-store",
      },
    });
  }
  // the site's own 404 page, with a 404 status
  const page = await fetch(new URL("/404", url));
  return new Response(page.body, {
    status: 404,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}

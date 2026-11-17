/**
 * /next is where the new site is built before it goes live: a secret link, never a public page.
 * `/next?key=<key>` once per device sets a cookie and drops the key from the address; after that the cookie lets
 * the device in. Without it, /next is the site's normal 404. The key comes from PREVIEW_KEY (Vercel env, and on
 * the PCs from Proton Pass through ttpass); it is never in the repo. tools/serve.py does the same for local builds.
 *
 * Vercel runs this file as Routing Middleware in front of the static site; `next dev` runs it as its proxy. It has
 * no imports on purpose: Vercel loads it as plain Node ESM (needs ".js" paths), Next's dev server can't resolve those.
 * Tests: src/release/middleware.test.ts.
 */
export const COOKIE = "next_key";
const YEAR = 60 * 60 * 24 * 365;

export type Gate =
  | { kind: "pass" }
  | { kind: "not-found" }
  | { kind: "redirect"; location: string; setCookie: string };

export function isNextPath(pathname: string): boolean {
  // the export also writes next.html and next.txt (the page data) beside the next/ folder
  return pathname === "/next" || pathname.startsWith("/next/") || pathname.startsWith("/next.");
}

/** Compares in the same time whatever the guess, so the key can't be found one letter at a time. */
export function sameKey(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function cookieValue(header: string | null, name: string): string | null {
  for (const part of (header ?? "").split(";")) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i).trim() === name) {
      try {
        return decodeURIComponent(part.slice(i + 1).trim());
      } catch {
        return null; // a broken cookie is no cookie: the normal 404, never a 500
      }
    }
  }
  return null;
}

/** What to do with a request. No key set (PREVIEW_KEY empty) means /next is closed to everyone. */
export function gate(url: URL, cookieHeader: string | null, key: string | undefined): Gate {
  if (!isNextPath(url.pathname)) return { kind: "pass" };
  if (!key) return { kind: "not-found" };
  const given = url.searchParams.get("key");
  if (given !== null) {
    if (!sameKey(given, key)) return { kind: "not-found" };
    const clean = new URL(url);
    clean.searchParams.delete("key");
    const secure = url.protocol === "https:" ? "; Secure" : "";
    return {
      kind: "redirect",
      location: clean.pathname + clean.search,
      setCookie: `${COOKIE}=${encodeURIComponent(key)}; Path=/next; Max-Age=${YEAR}; HttpOnly; SameSite=Lax${secure}`,
    };
  }
  const cookie = cookieValue(cookieHeader, COOKIE);
  return cookie !== null && sameKey(cookie, key) ? { kind: "pass" } : { kind: "not-found" };
}

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
  // the visitor's own cookies and bypass header go along, so a protected Vercel preview answers too
  const pass = new Headers();
  for (const h of ["cookie", "x-vercel-protection-bypass"]) {
    const v = request.headers.get(h);
    if (v) pass.set(h, v);
  }
  const html = { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" };
  try {
    const page = await fetch(new URL("/404", url), {
      headers: pass,
      signal: AbortSignal.timeout(3000),
    });
    if (page.ok || page.status === 404)
      return new Response(page.body, { status: 404, headers: html });
  } catch {
    // the page didn't load: a plain 404 below
  }
  return new Response("<!doctype html><title>Page not found</title><p>Page not found.</p>", {
    status: 404,
    headers: html,
  });
}

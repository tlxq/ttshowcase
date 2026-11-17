/**
 * /next is where the new site is built before it goes live: a secret link, never a public page.
 * `/next?key=<key>` once per device sets a cookie and drops the key from the address; after that the cookie lets
 * the device in. Without it, /next is the site's normal 404. The key comes from PREVIEW_KEY (Vercel env, and on
 * the PCs from Proton Pass through ttpass); it is never in the repo. tools/serve.py does the same for local builds.
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
    if (i > 0 && part.slice(0, i).trim() === name)
      return decodeURIComponent(part.slice(i + 1).trim());
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

/**
 * Tom's way in (Tom 11-18): one key, ADMIN_KEY in Vercel, opens /admin, which sets a cookie. The cookie holds only
 * an HMAC of the word "admin" made with the key, never the key, so a new key ends every old cookie. The tag store
 * (api/tags.ts) and the sign-in (api/admin.ts) both ask here. Tests: src/tags/admin.test.ts.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

export const ADMIN_COOKIE = "admin";
const YEAR = 60 * 60 * 24 * 365;
/** A key shorter than this counts as not set: a short key can be guessed. */
export const KEY_LEAST = 24;
/** Wrong keys one address may try in a day. */
export const ADMIN_TRIES = 10;

const mac = (key: string, word: string) => createHmac("sha256", key).update(word).digest();

/** What the cookie holds for this key. */
export function adminToken(key: string): string {
  return mac(key, "admin").toString("base64url");
}

/** True when the two keys are the same. Both are scrambled first, so the compare takes the same time whatever the guess. */
export function sameKey(given: string, key: string): boolean {
  return timingSafeEqual(mac(key, "same:" + given), mac(key, "same:" + key));
}

export function cookieValue(header: string | null, name: string): string | null {
  for (const part of (header ?? "").split(";")) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return null;
}

/** The key, when it is set and long enough. */
export const usable = (key: string | undefined | null): key is string =>
  typeof key === "string" && key.length >= KEY_LEAST;

/** True when the request carries Tom's cookie for this key. */
export function isAdmin(request: Request, key: string | null | undefined): boolean {
  if (!usable(key)) return false;
  const given = cookieValue(request.headers.get("cookie"), ADMIN_COOKIE);
  if (given === null) return false;
  const a = Buffer.from(given),
    b = Buffer.from(adminToken(key));
  return a.length === b.length && timingSafeEqual(a, b);
}

/** An admin POST must come from this site's own page: the custom header and the site as origin. */
export function fromOurPage(request: Request): boolean {
  if (request.headers.get("x-admin") !== "1") return false;
  const origin = request.headers.get("origin");
  return origin !== null && origin === new URL(request.url).origin;
}

/** The Set-Cookie line that signs in (token) or out (null). Secure goes on whenever the site is on https. */
export function cookieLine(request: Request, token: string | null): string {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${ADMIN_COOKIE}=${token ?? ""}; Path=/; Max-Age=${token ? YEAR : 0}; HttpOnly; SameSite=Strict${secure}`;
}

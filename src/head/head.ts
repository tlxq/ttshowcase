import { readFileSync } from "node:fs";
import { lookAsk } from "../content/look.ts";

/** Everything the pages say about themselves to search, shared links and the browser bar, in one place. */
export const SITE = "https://ttdevs.com";
export const NAME = "Tom Larsson";

/** The front page's title, as it has always been. */
export const FRONT_TITLE = "Tom Larsson, product engineer";

/** What a shared link and a search result say under the title: meta, og and twitter all take it from here
 * (Tom's words 11-27; LinkedIn wants 100 characters or more). */
export const DESCRIPTION =
  "Tom Larsson, product engineer from Sweden. I build and run web and mobile products myself, from sketch to live, with AI in the work every day.";

/** Every other page: "Page · Tom Larsson". */
export const pageTitle = (page: string) => `${page} · ${NAME}`;

/** Pages meant for search, with the address each one is listed under (sitemap.xml). */
export const PUBLIC_PAGES = ["/", "/privacy"] as const;

/** Pages and files search must never list: Tom's sign-in, the wall (it redirects to the front), the closed /next and its
 * sub-pages. The page's own robots tag says it, and vercel.json sends the same as a header for /admin and /next. */
export const PRIVATE_PATHS = ["/admin", "/wall", "/next"] as const;

/** The robots tag of a private page. */
export const NOINDEX = { index: false, follow: false } as const;

/** The share picture's address, as search and chats must read it. */
export const SHARE_IMAGE = `${SITE}/share.jpg`;

/** What the share picture shows, for og:image:alt and twitter:image:alt (picture and text approved by Tom 11-27). The new
 * front's pages (pitch/*.src.html) carry the same words; head.test.ts holds them equal. */
export const SHARE_ALT =
  "Tom Larsson, product engineer: a black and white portrait in front of a concrete wall with blue paint poured down it, signed with his tlxq tag.";

const link = (host: string) => lookAsk.links.find((l) => new URL(l.href).hostname === host)?.href;

/** The Person block for the front page: the profile links are the site's own (src/content/look.ts), no e-mail. */
export function personJsonLd() {
  const sameAs = [link("github.com"), link("linkedin.com")].filter((u): u is string => !!u);
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: NAME,
    jobTitle: "Product engineer",
    url: SITE,
    image: SHARE_IMAGE,
    address: { "@type": "PostalAddress", addressCountry: "SE" },
    sameAs,
  };
}

/** The block as the text inside its script tag. "<" is escaped so no value can ever close the tag early. */
export function personJsonLdText() {
  return JSON.stringify(personJsonLd()).replace(/</g, "\\u003c");
}

/** A colour from the one token file. */
export function tokenColour(css: string, name: string): string {
  // the whole name: nothing name-like before it, the colon right after it
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = new RegExp(`(?<![\\w-])${escaped}\\s*:\\s*(#[0-9a-fA-F]{3,8})`).exec(css);
  if (!m) throw new Error(`head: no colour token ${name} in tokens.css`);
  return m[1]!;
}

/** The browser bar's colour. The live page has no day and night switch (it is one dark page; the day blue exists only in
 * the closed /next pitch), so there is one value: the page's own ground, so the bar and the page are one black. */
export function themeColor(): string {
  return tokenColour(readFileSync("src/design/tokens.css", "utf8"), "--look-ground");
}

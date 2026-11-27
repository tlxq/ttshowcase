import type { MetadataRoute } from "next";
import { PUBLIC_PAGES, SITE } from "@/head/head";

export const dynamic = "force-static";

/** The public pages only, under the real host (src/head/head.ts keeps the list). */
export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_PAGES.map((path) => ({ url: SITE + path }));
}

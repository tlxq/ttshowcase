import type { MetadataRoute } from "next";

export const dynamic = "force-static";

/** The site is one page. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: "https://ttdevs.com/" }];
}

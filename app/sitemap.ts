import type { MetadataRoute } from "next";

export const dynamic = "force-static";

/** The site and its privacy page. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: "https://ttdevs.com/" }, { url: "https://ttdevs.com/privacy" }];
}

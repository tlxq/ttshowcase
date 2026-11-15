import type { MetadataRoute } from "next";

export const dynamic = "force-static";

/** Search engines may read the whole site; other hosts (Vercel previews) send noindex in vercel.json. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: "https://ttdevs.com/sitemap.xml",
  };
}

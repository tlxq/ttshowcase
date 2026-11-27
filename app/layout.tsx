import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { themeColor } from "@/head/head";
import { lookFonts } from "@/look/fonts";
import { TabAway } from "@/look/TabAway";
import "./globals.css";

/** The site's own address, so a shared link's picture is found: ttdevs.com in production, the
 * preview's own address on a Vercel preview, this PC while building here. */
const address =
  process.env.VERCEL_ENV === "production"
    ? "https://ttdevs.com"
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:8123";

export const metadata: Metadata = {
  metadataBase: new URL(address),
  // Tom's icon tag (app/icon.svg/route.ts), made at build time.
  icons: {
    icon: [
      // the old address every browser and crawler still asks for (public/favicon.ico, tools/icons/favicon.mjs)
      { url: "/favicon.ico", sizes: "16x16 32x32 48x48" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: { url: "/apple-icon.png", type: "image/png" },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: themeColor(),
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={lookFonts}>
      <body>
        {children}
        <TabAway />
      </body>
    </html>
  );
}

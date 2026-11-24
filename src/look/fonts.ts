import { Inter_Tight, JetBrains_Mono } from "next/font/google";

// The new look's two faces, self-hosted by Next at build time, for /look and /wall.
const interTight = Inter_Tight({
  subsets: ["latin"],
  weight: ["800", "900"],
  variable: "--font-inter-tight",
  display: "swap",
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

/** Put on the page's outer box: names the two faces for everything inside. */
export const lookFonts = `${interTight.variable} ${jetbrainsMono.variable}`;

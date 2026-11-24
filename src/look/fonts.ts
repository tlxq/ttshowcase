import { Archivo, Inter_Tight, JetBrains_Mono } from "next/font/google";

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

// The front's poster face (Archivo Expanded), for the pages that take the front's design (the 404).
const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
});

/** Put on the page's outer box: names the faces for everything inside. */
export const lookFonts = `${interTight.variable} ${jetbrainsMono.variable} ${archivo.variable}`;

import { Archivo } from "next/font/google";

/** The front's poster face (Archivo Expanded) for the Next pages in the front's design (the 404). The 404 is built into
 * every page, so it is never preloaded: a browser fetches it only where it is drawn, and the other pages' font budget
 * stays as it was. */
const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
  preload: false,
});

export const posterFont = archivo.variable;

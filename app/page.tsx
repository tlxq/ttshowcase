import type { Metadata } from "next";
import { Ask } from "@/look/Ask";
import { Hero, LookHeader } from "@/look/Hero";
import { Lab } from "@/look/Lab";
import { Letters } from "@/look/Letters";
import { Live } from "@/look/Live";
import { LookLine } from "@/look/LookLine";
import { Motion } from "@/look/Motion";
import { PaintSelect } from "@/look/PaintSelect";
import { Tom } from "@/look/Tom";
import { tagWritten } from "@/look/handPaint";
import { DESCRIPTION as description, FRONT_TITLE as title, personJsonLdText } from "@/head/head";

export const metadata: Metadata = {
  title,
  description,
  // One address for search and shared links, whichever host served the page.
  alternates: { canonical: "https://ttdevs.com/" },
  // What a link to the page shows on LinkedIn, in chats and mail: the first screen
  // (public/share.jpg, made with mise run share; Tom picked C 11-14).
  openGraph: {
    type: "website",
    url: "https://ttdevs.com/",
    title,
    description,
    images: [
      {
        url: "/share.jpg",
        width: 1200,
        height: 630,
        alt: "I build and run things myself, with Tom's tlxq tag",
      },
    ],
  },
  twitter: { card: "summary_large_image", title, description },
};

/** The new look, built next to the old page until Tom says it is right (11-13). */
export default function LookPage() {
  return (
    <div className="lk">
      {/* data, not a script the browser runs: the CSP leaves it alone (tools/csp/manifest.mjs) */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: personJsonLdText() }} />
      <LookHeader />
      <main className="lk-main" data-written={tagWritten}>
        <Hero />
        <Letters />
        <Tom />
        <Live />
        <Lab />
        <Ask />
        <LookLine />
      </main>
      <Motion />
      <PaintSelect />
    </div>
  );
}

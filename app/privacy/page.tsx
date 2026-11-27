import type { Metadata } from "next";
import Link from "next/link";
import { pageTitle } from "@/head/head";
import { posterFont } from "@/look/posterFont";
import { TlxqMark } from "@/look/TlxqMark";
import "./privacy.css";

export const metadata: Metadata = {
  title: pageTitle("Privacy"),
  description: "What ttdevs.com keeps from the mail form and the wall's tags, and what it doesn't.",
  alternates: { canonical: "https://ttdevs.com/privacy" },
};

/** What the site keeps (Tom's words, 11-24), opened by the small "privacy" beside every Send (the mail forms and the tag tool).
 * Each line says what the code does: api/contact.ts, api/tags.ts, tools/tags/schema.sql, vercel.json's CSP. Same look as the 404. */
export default function Privacy() {
  return (
    <main className={`lk lk-missing lk-privacy ${posterFont}`}>
      <TlxqMark className="lk-missing-mark" />
      <h1 className="lk-privacy-title">Privacy</h1>
      <section>
        <h2>Your message</h2>
        <p>
          The form sends your name, email and message to my inbox through Resend. This site keeps
          none of it.
        </p>
      </section>
      <section>
        <h2>Your tag</h2>
        <p>
          The site keeps your drawing, the name you give and its spot on the wall. Others see it
          once I approve it. Your browser remembers your tag, so you see it at once.
        </p>
      </section>
      <section>
        <h2>Robots</h2>
        <p>Your address is kept scrambled for one day, only to count sends.</p>
      </section>
      <section>
        <h2>Nothing else</h2>
        <p>
          The site runs on Vercel. The 3D code comes from jsDelivr, the live numbers from GitHub. No
          tracking, no ads, no cookies.
        </p>
      </section>
      <p>Want your tag or message gone? Write to me through the form and I delete it.</p>
      <Link className="lk-missing-back" href="/">
        Back to the start
      </Link>
    </main>
  );
}

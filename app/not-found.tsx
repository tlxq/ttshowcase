import type { Metadata } from "next";
import Link from "next/link";
import { Address } from "@/look/Address";
import { Hand } from "@/look/Tag";
import { lookParts } from "@/content/look";

/** The tab says what happened; the page was a bare address before. */
export const metadata: Metadata = { title: "Page not found, Tom Larsson" };

/** Any address that isn't a page: Tom's 404 tag, the address struck through, one line and the way back. */
export default function NotFound() {
  return (
    <main className="lk lk-missing">
      <h1 className="lk-missing-tag">
        <Hand name="notFound" label="404" mode="auto" className="lk-missing-mark" />
      </h1>
      <Address />
      <p className="lk-missing-say">Nothing painted here.</p>
      <nav className="lk-missing-ways" aria-label="The four parts">
        {lookParts.map((p) => (
          <Link key={p.id} className="lk-pill" href={`/#${p.id}`}>
            {p.label}
          </Link>
        ))}
      </nav>
    </main>
  );
}

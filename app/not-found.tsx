import type { Metadata } from "next";
import Link from "next/link";
import { Address } from "@/look/Address";

/** The tab says what happened; the page was a bare address before. */
export const metadata: Metadata = { title: "Page not found, Tom Larsson" };

/** Any address that isn't a page, in the front's design: 404 in the poster face, the address struck through, one
 * line and one way back. */
export default function NotFound() {
  return (
    <main className="lk lk-missing">
      <h1 className="lk-missing-tag">404</h1>
      <Address />
      <p className="lk-missing-say">Nothing painted here.</p>
      <Link className="lk-missing-back" href="/">
        Back to the start
      </Link>
    </main>
  );
}

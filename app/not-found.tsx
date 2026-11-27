import type { Metadata } from "next";
import Link from "next/link";
import { pageTitle } from "@/head/head";
import { Address } from "@/look/Address";
import { posterFont } from "@/look/posterFont";
import { TlxqMark } from "@/look/TlxqMark";

/** The tab says what happened; the page was a bare address before. */
export const metadata: Metadata = { title: pageTitle("Page not found") };

/** Any address that isn't a page, in the front's design: Tom's tlxq mark, 404 in the poster face, the address struck through, one
 * line and one way back. */
export default function NotFound() {
  return (
    <main className={`lk lk-missing ${posterFont}`}>
      <TlxqMark className="lk-missing-mark" />
      <h1 className="lk-missing-tag">404</h1>
      <Address />
      <p className="lk-missing-say">Nothing painted here.</p>
      <Link className="lk-missing-back" href="/">
        Back to the start
      </Link>
    </main>
  );
}

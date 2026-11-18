import type { Metadata } from "next";
import Link from "next/link";
import { Address } from "@/look/Address";
import { Hand } from "@/look/Tag";

/** The tab says what happened; the page was a bare address before. */
export const metadata: Metadata = { title: "Page not found, Tom Larsson" };

/** Any address that isn't a page: Tom's 404 tag, the address struck through, one line and one way back. */
export default function NotFound() {
  return (
    <main className="lk lk-missing">
      <h1 className="lk-missing-tag">
        <Hand name="notFound" label="404" mode="auto" className="lk-missing-mark" />
      </h1>
      <Address />
      <div className="lk-missing-plate">
        <p className="lk-missing-say">Nothing painted here.</p>
        <Link className="lk-missing-back" href="/">
          Back to the start
        </Link>
      </div>
    </main>
  );
}

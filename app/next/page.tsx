import type { Metadata } from "next";

/** Behind the secret link (middleware.ts): the port builds the new site here until it goes live. */
export const metadata: Metadata = {
  title: "Next, Tom Larsson",
  robots: { index: false, follow: false },
};

export default function Next() {
  return (
    <main className="lk lk-missing">
      <p className="lk-missing-say">The new site is built here.</p>
    </main>
  );
}

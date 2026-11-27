import type { Metadata } from "next";
import { NOINDEX, pageTitle } from "@/head/head";
import { AdminForm } from "@/look/AdminForm";

export const metadata: Metadata = {
  title: pageTitle("Sign in"),
  robots: NOINDEX,
};

/** Tom's sign-in (api/admin.ts). Linked from nowhere, kept out of search; vercel.json sends noindex with it too. */
export default function AdminPage() {
  return (
    <main className="lk lk-admin-page">
      <AdminForm />
    </main>
  );
}

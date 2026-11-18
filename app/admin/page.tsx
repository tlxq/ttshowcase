import type { Metadata } from "next";
import { AdminForm } from "@/look/AdminForm";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

/** Tom's sign-in (api/admin.ts). Linked from nowhere, kept out of search; vercel.json sends noindex with it too. */
export default function AdminPage() {
  return (
    <main className="lk lk-admin-page">
      <AdminForm />
    </main>
  );
}

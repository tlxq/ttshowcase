"use client";

import type { ReactNode } from "react";

/** The parts folded into a menu on a phone; it closes once a part is picked. */
export function PhoneMenu({ children }: { children: ReactNode }) {
  return (
    <details className="lk-menu">
      <summary className="lk-pill">Menu</summary>
      <nav
        aria-label="Main, on a phone"
        onClick={(e) => e.currentTarget.parentElement?.removeAttribute("open")}
      >
        {children}
      </nav>
    </details>
  );
}

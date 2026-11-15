"use client";

import { useSyncExternalStore } from "react";

const none = () => () => {};
const typed = () => decodeURIComponent(location.pathname);
const unknown = () => "";

/** The address the visitor typed, struck through with the marker. Known only in the browser (the
 * page is one file for every missing address), so nothing shows until then. */
export function Address() {
  const path = useSyncExternalStore(none, typed, unknown);
  if (!path) return null;
  return (
    <p className="lk-missing-path">
      <span>{path}</span>
    </p>
  );
}

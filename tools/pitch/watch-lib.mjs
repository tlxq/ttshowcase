// The pure parts of tools/pitch/watch.mjs (live reload of the pitch): which changes count, and the debounce.
// Tests: tools/showcase/reload.test.mjs.

// What a file change under the watched folders means a rebuild: not editor swap files, dot files or the checks' own folder.
export function relevant(rel) {
  const path = String(rel ?? "").replaceAll("\\", "/");
  if (!path) return true; // the platform didn't say which file: rebuild to be safe
  if (path.startsWith("checks/") || path.includes("/checks/")) return false;
  const name = path.split("/").pop();
  return !(
    name.startsWith(".") ||
    name.endsWith("~") ||
    name.endsWith(".swp") ||
    /^\d+$/.test(name)
  );
}

// Runs fn once, `ms` after the last call.
export function debounced(fn, ms, timers = { set: setTimeout, clear: clearTimeout }) {
  let t = null;
  return () => {
    if (t !== null) timers.clear(t);
    t = timers.set(() => {
      t = null;
      fn();
    }, ms);
  };
}

// The last lines of a failed build, for the server's log.
export function errorTail(out, lines = 12) {
  return String(out)
    .trim()
    .split("\n")
    .slice(-lines)
    .map((l) => (l.length > 300 ? l.slice(0, 300) + "…" : l))
    .join("\n");
}

// Live reload for the pitch served on this PC (showcase pitch / showcase look). tools/serve.py puts it into the pages it
// serves when SERVE_RELOAD_FILE is set, and serves it at /__reload.js. It is never part of a build: tools/showcase/reload.test.mjs
// fails if the name of this file or of its endpoint turns up in anything that ships.
// The page asks /__reload and waits; when the rebuild has written a new version it answers and the page reloads. The walk
// keeps its place the way its own resize reload does: the same session key, the fraction of the way down the walk.
(() => {
  const v0 = new URL(document.currentScript.src).searchParams.get("v") ?? "";
  const keep = () => {
    try {
      const up = window.svY ? window.svY(0) : 0; // the page's park, where the walk starts
      const room = document.documentElement.scrollHeight - innerHeight - up;
      const f = room > 0 ? Math.max(0, Math.min(1, (scrollY - up) / room)) : 0;
      sessionStorage.setItem("tlxq-walk-resume", JSON.stringify({ f, at: Date.now() }));
    } catch (_) {}
  };
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  (async () => {
    for (;;) {
      try {
        const r = await fetch("/__reload?v=" + encodeURIComponent(v0), { cache: "no-store" });
        if (r.status === 200) {
          keep();
          return location.reload();
        }
        if (r.status !== 204) await wait(3000);
      } catch (_) {
        await wait(1500); // the server is restarting
      }
    }
  })();
})();

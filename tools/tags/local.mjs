// The tag store for the pitch on this PC: api/tags.ts on an in-memory table, no Neon, no mail. tools/serve.py passes /api/tags to it
// (tools/serve.sh with SERVE_TAGS=1, and tools/pitch/run.sh start it). Nothing is kept when it stops.
//   node tools/tags/local.mjs <port>      listens on 127.0.0.1 only
// Mails are not sent: each is kept (and printed) with its review link; open the link, or the checks press Approve for you.
// Extra doors for the checks, under /api/tags-local/ (serve.py lets only this PC through):
//   GET  mails | rows | stats       what was "mailed", what is stored, how many sends came
//   POST reset                      empty store, no failures set
//   POST fail?times=1&status=502    the next sends answer with that status (not stored), to test the retry
//   POST seed?n=40                  n approved tags from random strokes, to measure the wall
//   POST approve                    approve every waiting tag
import { createServer } from "node:http";
import { randomBytes } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { handlers } from "../../api/tags.ts";
import { GET as githubNumbers } from "../../api/github.ts";
import { admin } from "../../api/admin.ts";
import { memoryDeps } from "../../src/tags/memory.ts";

const port = Number(process.argv[2] || process.env.TAGS_PORT);
if (!port) {
  console.error("Usage: node tools/tags/local.mjs <port>");
  process.exit(2);
}
const SECRET = "local-pitch-tag-secret-0123456789abcdef";
// Tom's key for the local store: a test key, or ADMIN_KEY when one is given (tools/serve.sh passes the real one for a desk walk). POST /api/admin signs in.
const ADMIN_KEY = process.env.ADMIN_KEY || "local-pitch-admin-key-0123456789abcdef";
const wrongKeys = [];
const mails = [];
let world, api, signin;
let failing = { times: 0, status: 502 },
  posts = 0;
const fresh = () => {
  world = memoryDeps(
    SECRET,
    async (subject, text) => {
      mails.push({ subject, text, link: text.match(/https?:\S+/)?.[0] ?? null });
      console.log(`mail: ${subject}\n  ${mails.at(-1).link}`);
      return true;
    },
    ADMIN_KEY,
  );
  api = handlers(() => world.deps);
  wrongKeys.length = 0;
  signin = admin(() => ({
    key: ADMIN_KEY,
    secret: SECRET,
    triedToday: async (h) => wrongKeys.filter((w) => w === h).length,
    count: async (h) => void wrongKeys.push(h),
  }));
  mails.length = 0;
  failing = { times: 0, status: 502 };
  posts = 0;
};
fresh();

const rnd = (() => {
  let s = 7;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
})();
const TOOLS = ["skinny", "fat", "mop", "chisel", "pen"];
const COLS = [
  "#151515",
  "#f2f0ea",
  "#d42a2a",
  "#ff4f1a",
  "#f5cf2b",
  "#2fa35a",
  "#4fb3e8",
  "#7a3fb0",
];
function strokes() {
  const out = [];
  for (let k = 0, n = 3 + Math.floor(rnd() * 3); k < n; k++) {
    const pts = [];
    const y0 = 80 + rnd() * 270,
      x0 = 60 + rnd() * 200;
    for (let i = 0, ms = k * 900; i < 40; i++, ms += 20)
      pts.push(
        Math.round(x0 + i * (12 + rnd() * 4)),
        Math.round(y0 + Math.sin(i / 4 + k) * 50),
        ms,
        0.5,
      );
    out.push({
      tool: TOOLS[Math.floor(rnd() * TOOLS.length)],
      col: COLS[Math.floor(rnd() * COLS.length)],
      seed: 1 + Math.floor(rnd() * 2e9),
      pts,
      dr: [
        [40, 200, 0],
        [80, 350, 3],
      ],
    });
  }
  return out;
}
async function seed(n) {
  for (let i = 0; i < n; i++) {
    const w = 2.4,
      h = 1.35;
    // put up as Tom's own tags are (insertUp): the seed is a speed test's full wall, its random spots may overlap, which a visitor's send no longer may
    await world.deps.db.insertUp({
      name: i % 3 ? "" : "Seed " + i,
      strokes: strokes(),
      x: -16 + w / 2 + rnd() * (9 - w),
      y: 0.6 + h / 2 + rnd() * (6 - h),
      w,
      h,
      turn: 0,
      device: "seed-" + i + "-" + randomBytes(8).toString("hex"),
      status: "up",
    });
  }
}

// /api/github on this PC, kept like Vercel's edge keeps it (api/github.ts): GitHub is asked at most once an hour (every 5 minutes while
// a number is missing), not on every load, so a preview open all day stays under GitHub's 60 asks an hour. The answer is also kept in
// .cache/github-numbers.json, so a restarted server doesn't ask again. Local preview only: a number GitHub doesn't give now keeps the
// last one it gave (the live site draws nothing instead).
const NUMBERS_FILE = fileURLToPath(new URL("../../.cache/github-numbers.json", import.meta.url));
const HOUR = 3600e3,
  RETRY = 300e3;
let numbersKept = (() => {
  try {
    return JSON.parse(readFileSync(NUMBERS_FILE, "utf8"));
  } catch {
    return null; // none yet
  }
})();
let numbersAsking = null;
async function localNumbers() {
  const k = numbersKept;
  if (k && Date.now() - k.at < (k.whole ? HOUR : RETRY)) return k.body;
  numbersAsking ??= (async () => {
    const fresh = await (await githubNumbers()).json();
    const body = {};
    for (const [wall, own] of Object.entries(fresh)) {
      body[wall] = {};
      for (const [key, n] of Object.entries(own))
        body[wall][key] = n ?? k?.body?.[wall]?.[key] ?? null;
    }
    const whole = Object.values(fresh).every((w) => Object.values(w).every((n) => n != null));
    numbersKept = { at: Date.now(), whole, body };
    try {
      mkdirSync(dirname(NUMBERS_FILE), { recursive: true });
      writeFileSync(NUMBERS_FILE, JSON.stringify(numbersKept));
    } catch {
      // kept in memory only
    }
    return body;
  })().finally(() => (numbersAsking = null));
  return numbersAsking;
}

const reply = (res, body, status = 200) => {
  res.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" });
  res.end(JSON.stringify(body));
};

createServer(async (req, res) => {
  try {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const url = new URL(req.url, `http://${req.headers.host || "127.0.0.1:" + port}`);
    if (url.pathname === "/api/github") {
      // the walls' live numbers (the checks answer this path themselves, so a run never asks GitHub)
      return reply(res, await localNumbers());
    }
    if (url.pathname.startsWith("/api/tags-local/")) {
      const door = url.pathname.slice("/api/tags-local/".length);
      if (door === "mails") return reply(res, mails);
      if (door === "rows") return reply(res, world.rows);
      if (door === "stats") return reply(res, { posts }); // sends that reached /api/tags, failed or not
      if (door === "reset") return (fresh(), reply(res, { ok: true }));
      if (door === "fail") {
        failing = {
          times: Number(url.searchParams.get("times") || 1),
          status: Number(url.searchParams.get("status") || 502),
        };
        return reply(res, failing);
      }
      if (door === "seed") {
        await seed(Number(url.searchParams.get("n") || 40));
        return reply(res, { rows: world.rows.length });
      }
      if (door === "approve") {
        for (const r of world.rows) if (r.status === "waiting") await world.deps.db.approve(r.id);
        return reply(res, { ok: true });
      }
      return reply(res, { error: "unknown" }, 404);
    }
    if (url.pathname === "/api/admin" && req.method === "POST") {
      const answer = await signin(
        new Request(url, { method: "POST", headers: req.headers, body: Buffer.concat(chunks) }),
      );
      res.writeHead(answer.status, Object.fromEntries(answer.headers));
      return res.end(Buffer.from(await answer.arrayBuffer()));
    }
    if (url.pathname !== "/api/tags") return reply(res, { error: "not-found" }, 404);
    const visitor =
      req.method === "POST" && !url.searchParams.has("review") && !url.searchParams.has("admin");
    if (visitor) posts++;
    if (visitor && failing.times > 0) {
      failing.times--;
      return reply(res, { error: "local-failure" }, failing.status);
    }
    const init = { method: req.method, headers: req.headers };
    if (req.method === "POST") init.body = Buffer.concat(chunks);
    const request = new Request(url, init);
    const answer = req.method === "POST" ? await api.POST(request) : await api.GET(request);
    const body = Buffer.from(await answer.arrayBuffer());
    res.writeHead(answer.status, Object.fromEntries(answer.headers));
    res.end(body);
  } catch (e) {
    console.error(e);
    reply(res, { error: "local-store" }, 500);
  }
}).listen(port, "127.0.0.1", () => console.log(`Local tag store on 127.0.0.1:${port}`));

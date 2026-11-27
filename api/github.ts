/**
 * The walls' live numbers (commits, merged pull requests, tests, skills), asked of GitHub once here, not once per visitor.
 * GitHub lets one address make 60 anonymous asks an hour: a visitor's browser used them up and then logged 403 errors in
 * the console. Vercel's edge keeps the answer (s-maxage), so GitHub is asked about once an hour whoever comes.
 * A number GitHub didn't give is null: the page draws nothing for it, never an old or made-up number.
 *
 *   GET /api/github   { dot: { commits, tests }, ttoolbox: { commits, skills }, tthermal: { commits, merged },
 *                       epa: { commits, merged, tests, migrations }, rvf?: { commits, merged } }
 *
 * epa.tests counts files, not cases: every *.test.ts(x) plus every supabase/tests/**\/*.sql (pgTAP); epa.migrations counts
 * the files under supabase/migrations/. Both are one `find` away from the repo. dot.tests counts @test cases in .bats files.
 *
 * GITHUB_TOKEN (optional, Vercel setting): a read-only token raises the limit to 5,000 an hour. rvf is a private repo:
 * it is asked only with a token, and is left out (never an error) when there is none or the token can't see the repo.
 * The token only goes to GitHub: it is never in an answer, an error or a log line. Tests: src/github/github.test.ts.
 */
const API = "https://api.github.com/";
const RAW = "https://raw.githubusercontent.com/tlxq/";

export type Numbers = Record<string, Record<string, number | null>>;
type Get = (url: string, init?: RequestInit) => Promise<Response>;

const positive = (n: unknown): number => {
  if (typeof n !== "number" || !(n > 0)) throw new Error("not a positive number");
  return n;
};

/** Asks GitHub for every number; each one that fails is null on its own. */
export async function numbers(get: Get, token?: string): Promise<Numbers> {
  const init: RequestInit = {
    headers: {
      Accept: "application/vnd.github+json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  };
  const ask = async (url: string) => {
    const r = await get(url, init);
    if (!r.ok) throw new Error(String(r.status));
    return r;
  };
  const trees: Record<string, Promise<string[]>> = {}; // one tree request per repo
  const filesOf = (repo: string, branch: string) =>
    (trees[repo] ??= ask(`${API}repos/tlxq/${repo}/git/trees/${branch}?recursive=1`)
      .then((r) => r.json())
      .then((d) => {
        if (d.truncated) throw new Error("truncated");
        return d.tree
          .filter((t: { type: string }) => t.type === "blob")
          .map((t: { path: string }) => t.path);
      }));
  // commits: the page count of a one-per-page listing, from its Link header (exact)
  const commitsOf = async (repo: string) => {
    const r = await ask(`${API}repos/tlxq/${repo}/commits?per_page=1`);
    const last = /[?&]page=(\d+)>; rel="last"/.exec(r.headers.get("Link") ?? "");
    return positive(last?.[1] ? +last[1] : (await r.json()).length);
  };
  const mergedOf = async (repo: string) => {
    const q = encodeURIComponent(`repo:tlxq/${repo} is:pr is:merged`);
    const d = await (await ask(`${API}search/issues?q=${q}&per_page=1`)).json();
    if (d.incomplete_results) throw new Error("incomplete");
    return positive(d.total_count);
  };
  const testsOf = async (repo: string, branch: string) => {
    const files = (await filesOf(repo, branch)).filter((p) => p.endsWith(".bats"));
    const counts = await Promise.all(
      files.map(
        async (f) =>
          ((await (await ask(`${RAW}${repo}/${branch}/${f}`)).text()).match(/^@test\b/gm) ?? [])
            .length,
      ),
    );
    return positive(counts.reduce((a, b) => a + b, 0));
  };
  const epaTestsOf = async () =>
    positive(
      (await filesOf("eparadar", "master")).filter((p) =>
        /\.test\.tsx?$|^supabase\/tests\/.+\.sql$/.test(p),
      ).length,
    );
  const migrationsOf = async () =>
    positive(
      (await filesOf("eparadar", "master")).filter((p) => p.startsWith("supabase/migrations/"))
        .length,
    );
  const skillsOf = async (repo: string, branch: string) =>
    positive(
      (await filesOf(repo, branch)).filter((p) =>
        /^plugins\/[^/]+\/skills\/[^/]+\/SKILL\.md$/.test(p),
      ).length,
    );

  const wanted: Record<string, Record<string, () => Promise<number>>> = {
    dot: { commits: () => commitsOf("dot"), tests: () => testsOf("dot", "main") },
    ttoolbox: { commits: () => commitsOf("ttoolbox"), skills: () => skillsOf("ttoolbox", "main") },
    tthermal: { commits: () => commitsOf("tthermal"), merged: () => mergedOf("tthermal") },
    epa: {
      commits: () => commitsOf("eparadar"),
      merged: () => mergedOf("eparadar"),
      tests: epaTestsOf,
      migrations: migrationsOf,
    },
  };
  // a private repo: only asked with a token
  if (token)
    wanted.rvf = {
      commits: () => commitsOf("raddavarfruberga"),
      merged: () => mergedOf("raddavarfruberga"),
    };
  const out: Numbers = {};
  await Promise.all(
    Object.entries(wanted).flatMap(([wall, gets]) => {
      const own: Record<string, number | null> = (out[wall] = {});
      return Object.entries(gets).map(async ([key, run]) => {
        own[key] = await run().catch(() => null);
      });
    }),
  );
  // a token that can't see the private repo: leave it out, whole
  if (out.rvf && Object.values(out.rvf).every((n) => n == null)) delete out.rvf;
  return out;
}

/** The answer: kept at the edge for an hour; with a number missing only for five minutes, so the next ask tries again. */
export async function answer(get: Get, token?: string): Promise<Response> {
  const body = await numbers(get, token);
  const whole = Object.values(body).every((w) => Object.values(w).every((n) => n != null));
  return Response.json(body, {
    headers: {
      "Cache-Control": whole
        ? "public, s-maxage=3600, stale-while-revalidate=86400"
        : "public, s-maxage=300",
    },
  });
}

export function GET() {
  return answer(fetch, process.env.GITHUB_TOKEN);
}

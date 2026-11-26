# Workflow

How a change goes from an idea to ttdevs.com. `mise run` lists every task; `mise.toml` says what each does.

## Setup

```sh
mise install        # Node, playwright-cli, vercel, osv-scanner at the pinned versions
mise run install    # npm packages
```

Works the same on both PCs. The browser checks need the graphics card; `tools/walk/graphics.sh` stops a run
that would draw in software.

## A session

1. `/start` in Claude Code, or by hand: a fresh branch off `master`, one change named.
2. Run it:
   - the site: `mise run dev` (live editing) or `mise run open` (the built page)
   - the paint pitch: `mise run pitch`, served on the Tailscale address for the T14s and the S23
3. Change one thing. Look at it on a laptop and on the phone.
4. Check (below), then `/ship`.

## Where a change goes

| Change | Where |
|---|---|
| A colour, size, space or speed | `src/design/tokens.css` first, with Tom's OK |
| Words on the site | `src/content/look.ts`; handwritten ones with `mise run write` into `src/content/hand` |
| The paint pitch | `pitch/paint.src.html` and its parts in `pitch/paint/` (order in `order.txt`); pictures in `pitch/assets` (CC0 or Tom's own, listed in `CREDITS.txt`) |
| A font | Never in git. `tools/pitch/build.mjs` fetches it into `.cache/fonts` |

## Checks

| Check | When | What |
|---|---|---|
| `mise run check` | Every push (pre-push runs it) | Types, the guard hook's tests, lint, build, known holes in packages |
| `mise run walk` | A site change, before merge | The built page at laptop, tablet and phone sizes: look, line clearance, accessibility, speed |
| `mise run pitch:check` | A pitch change, before merge | 1440 and phone: the whole walk, the waits, each wall paints once, reduced motion, text contrast |
| `mise run pictures` | A change in how the site looks | Before/after pictures against `master` |

One name runs one check: `mise run walk a11y-phone`, `mise run pitch:check contrast`. A check that is red twice
is a real problem: read its output before changing anything. Frame speed on a laptop is proven here; touch and
phone speed on the S23.

## Pull request

- One branch and one PR per change. Commits: one line, Conventional Commits, lowercase, no AI attribution.
- GitHub runs `mise run check` on every PR; the PR says which desk checks passed (`Tested:`).
- A change in what you see waits for Tom on the T14s and the S23. Then squash merge.
- Merging into `master` deploys to ttdevs.com (Vercel). Nothing deploys from the terminal.

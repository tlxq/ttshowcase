# ttshowcase

Tom's portfolio, the `tlxq` site, live at ttdevs.com since 2026-11-15.

Read `brief.md` for what it is and `docs/design.md` for how it looks and moves.

## Rules
- One branch and one PR per change. GitHub runs `mise run check` on every PR (Tom 11-17); the GPU walks stay on the desk. Before merge: the PR's check is green and `tools/walk/run.sh` passes on the desk; the PR says so. Squash merge.
- Check once per commit: a passing `mise run check`, `mise run walk` or `mise run pitch:check` is saved against the commit and the tool versions (`tools/passes`), and the same check on that commit is skipped, by the main session, `/ship` and the verifier alike. The verifier proves only the live parts (deploy, URL, one real-browser look). No repeat runs "to be sure"; `--force` is for a check known to be flaky.
- Fast loop while building: run only the check for what you touched (one pitch check by name, one walk by name). The whole set runs once, before the PR.
- Tom judges on the PR's preview while the checks run: `mise run next preview [PR#]` prints its /next link and a QR for the S23. Previews stay closed to everyone else.
- `mise run check` is the whole check (GitHub runs it on every PR; pre-push skips it). `mise run format` formats.
- Colours, sizes, spacing and speeds come from `src/design/tokens.css`. Nothing outside it. A new value goes there first, with Tom's OK.
- Visible text follows `workflow:signum`'s word and logic rules; `docs/design.md` says which rules this site replaces.
- No `.md` file in this repo changes without Tom reading its text.
- Stand-in photos stay out of git and off the real site.

## Working on feel
- One moment at a time: name the cause, change one thing, Tom judges. No rounds of options.
- A visual step ends when Tom says it feels right on laptop and phone.
- Browser checks run on the desk's graphics card: they prove look and frame speed on a laptop. Touch and phone speed are proven on the S23.

## Pitch rounds
- One decision per round: one wall, one question, at most 4 options. Pictures show only that moment: one laptop and one phone per option.
- A prototype on a pitch branch gets no `pitch:check`. At most it gets the one check for what changed. The full `pitch:check` and walk run once, on the real build's PR.
- Pictures jump straight to the moment instead of walking every scene before it.
- Before a round, check free memory. If it's under 8 GB, name what's holding it and ask before stopping anything. Picture generation (sd-cli) finishes before any browser starts.
- `/handover` deletes the session's scratch pictures, because `/tmp` uses memory.

## Pointers
- Run it: `mise run open`. Browser checks: `mise run walk`.
- New site before it goes live: `mise run next` (live) or `mise run next dev` (Tailscale dev server); the key is in Pass (Dev › ttshowcase next key). Name a release: `mise run release minor` (or major, patch).
- Plan and never-public list: `~/.claude/plans/ttshowcase.md`, private.
- Logo and brand: `~/.1dot/kit/brand`.
- Deploy: merging a PR into `master` deploys to ttdevs.com (Vercel). Nothing deploys from the terminal.

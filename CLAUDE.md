# ttshowcase

Tom's portfolio, the `tlxq` site, live at ttdevs.com since 2026-11-15.

Read `brief.md` for what it is and `docs/design.md` for how it looks and moves. The new front is built against its Direction page (private; its link is in `~/.claude/plans/design-workflow.md`; Tom approved 2026-11-21): what the blue becomes at each moment, and the recruiter gate every idea passes first.

## Rules
- One PR per change; small fixes go together in one batch PR a day, a big visual moment gets its own. GitHub runs `mise run check` on every PR (Tom 11-17). Before merge: the check is green and the walks and pitch checks for what changed pass on the desk; the PR names them. Squash merge.
- The full `mise run pitch:check` and `mise run walk` run once a night on master on the desk. Red at night = the first fix next morning, before new work.
- Check once per tree: a passing `mise run check`, `mise run walk` or `mise run pitch:check` is saved against the files it ran on (committed or not) and the tool versions (`tools/passes`), shared by the main checkout and every worktree. The same check on the same files is skipped, by the main session, `/ship` and the verifier alike. The verifier proves only the live parts (deploy, URL, one real-browser look). No repeat runs "to be sure"; `--force` is for a check known to be flaky.
- Fast loop while building: run only the check for what you touched (one pitch check by name, one walk by name). The whole set runs at night, on master.
- Tom judges on the PR's preview while the checks run: `mise run next preview [PR#]` prints its /next link and a QR for the S23. Previews stay closed to everyone else.
- `mise run check` is the whole check (GitHub runs it on every PR; pre-push skips it). `mise run format` formats.
- Colours, sizes, spacing and speeds come from `src/design/tokens.css`. Nothing outside it. A new value goes there first, with Tom's OK.
- Visible text follows `workflow:signum`'s word and logic rules; `docs/design.md` says which rules this site replaces.
- No `.md` file in this repo changes without Tom reading its text.
- Stand-in photos stay out of git and off the real site.

## Working on feel
- One moment at a time: name the cause, change one thing, Tom judges. No rounds of options.
- Every visual step shows the whole walk: `mise run pitch:sheet` puts each moment on master and on the branch side by side (laptop and phone, night and day). The design reviewer and Tom see it before Tom judges, so a change in one moment can't quietly hurt another.
- Before anything is made, the idea passes the Direction page's recruiter gate. Tom gets the look link as soon as a build runs, with one line on what is known to be rough. The design reviewer reads at the same time; its findings and Tom's go into the next round together.
- A visual step is built in slices, one look each: first the main thing and how the camera meets it, then the light, then the surroundings. A slice is about 30 minutes of building.
- Every build round ends with `mise run pitch:pair`: the approved picture beside the build, and master beside the branch for the moments before and after the change. The builder looks at it before reporting.
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
- Plan: the ttshowcase plan changed most recently in `~/.claude/plans/` (session start lists them). Never-public list: `~/.claude/plans/ttshowcase.md`, private.
- Logo and brand: `~/.1dot/kit/brand`.
- Deploy: merging a PR into `master` deploys to ttdevs.com (Vercel). Nothing deploys from the terminal.

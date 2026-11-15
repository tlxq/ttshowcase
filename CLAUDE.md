# ttshowcase

Tom's portfolio, the `tlxq` site. Becomes ttdevs.com at launch; not live yet.

Read `brief.md` for what it is and `docs/design.md` for how it looks and moves.

## Rules
- One branch and one PR per change; GitHub CI is off (Actions minutes, Tom 11-10). Before merge: `mise run check` (pre-push) and `tools/walk/run.sh` pass on the desk; the PR says so. Squash merge.
- `mise run check` is the whole check (pre-push runs it). `mise run format` formats.
- Colours, sizes, spacing and speeds come from `src/design/tokens.css`. Nothing outside it. A new value goes there first, with Tom's OK.
- Visible text follows `workflow:signum`'s word and logic rules; `docs/design.md` says which rules this site replaces.
- No `.md` file in this repo changes without Tom reading its text.
- Stand-in photos stay out of git and off the real site.

## Working on feel
- One moment at a time: name the cause, change one thing, Tom judges. No rounds of options.
- A visual step ends when Tom says it feels right on laptop and phone.
- The test browser has no graphics card: it proves behaviour, never feel or speed.

## Pointers
- Run it: `mise run open`. Browser checks: `mise run walk`.
- Plan and never-public list: `~/.claude/plans/ttshowcase.md`, private.
- Logo and brand: `~/.1dot/kit/brand`.
- Deploy: not set up yet.

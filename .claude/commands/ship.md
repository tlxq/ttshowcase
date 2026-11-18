---
description: Check, review, commit, push, PR and squash merge the current branch; a visual change merges only after Tom says it feels right.
---

Ship the current branch. Rules: `CLAUDE.md`. GitHub CI is off, so the checks run here, on the desk.

1. Not on `master`. Nothing to ship: say so and stop.
2. A `.md` file changed: Tom has read its text in this session. If not, show it to him and stop.
3. Checks run once per commit: a pass is saved against the commit and the tool versions (`tools/passes`, in `.cache/passes`), and the same check on the same commit is skipped ("already passed on <sha>, skipped"). Do not run it again to be sure; `--force` only for a check known to be flaky.
   `mise run check`. Pitch changed (`pitch/`, `tools/pitch/`): `mise run pitch:check` (behaviour checks 4 at a time, frame-speed checks alone after). Site changed: `mise run walk`.
   Red: fix and run again; red twice on the same check: stop and show Tom the output. A fix is a new commit, so it runs again.
4. `reviewer` agent on the diff. Fix its must-fix items, then step 3 again.
5. Commit: one line, Conventional Commits, lowercase, says what the visitor or Tom gets. No AI attribution (the
   guard hook and the commit-msg hook both refuse it).
6. Push the branch and open the PR: what changed and why in short bullets, then `Tested:` with the checks from step
   3 and their result lines.
7. While the checks run, Tom can already judge on the PR's preview: `mise run next preview` prints its /next link and a QR for the S23. Changes what a visitor sees or how it moves: Tom judges it on the T14s and the S23 before the merge. Until he
   says it feels right, stop here with the link.
8. `gh pr merge --squash --delete-branch`, `git switch master && git pull`, then the `verifier` agent on the result.
9. Write the result in the plan (`~/.claude/plans/ttshowcase.md`) and the board line: PR number, what Tom said, the
   verifier's verdict.

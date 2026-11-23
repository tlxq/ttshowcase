---
description: Start a session on the site or the paint pitch - where it stands, one change named, a fresh branch, the pitch served for Tom.
---

Start a session in this repo. Rules: `CLAUDE.md`. One moment at a time: name the cause, change one thing, Tom judges.

1. Read the board's ttshowcase line (`~/.claude/plans/board.md`) and the newest entries of the plan section it points
   to (`~/.claude/plans/ttshowcase.md`). Say in two lines where it stands and what's next.
2. `git status` and `git branch`. Uncommitted work or a branch with commits only on this PC: say what it is and ask
   before touching it.
3. Name the one change for this session in a sentence: what Tom sees after it, and which screen or scene. Two
   changes = two sessions.
4. Branch off a fresh `master`: `feat/`, `fix/` or `chore/` plus a few words.
5. Pitch work (`pitch/`): `mise run pitch` serves it on the Tailscale address, the link opens on the T14s and the
   S23. Site work: `mise run dev`.
6. Before changing what you see: load `workflow:signum` for words, read `docs/design.md` for the site, the "look
   good/bad" memory for both.
7. Build it. When a first version runs, send Tom the link right away, with the whole-walk sheet (`mise run pitch:sheet`); the checks come after.
8. Checks: `mise run pitch:check` (pitch) or `mise run walk` (site), and `mise run check`. Then `/ship`.

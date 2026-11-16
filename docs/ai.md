# AI tooling

The repo carries its own Claude Code setup in `.claude/`. The rules are in `CLAUDE.md`; this file lists the
tools.

## Commands (`.claude/commands/`)

| Command | What it does |
|---|---|
| `/start` | Where the work stands, one change named, a fresh branch, the pitch or the site served |
| `/ship` | `mise run check` and the right walk, the `reviewer` agent, commit, push, PR; a visual change waits for Tom on the T14s and the S23, then squash merge and the `verifier` agent |

## Guard hook (`.claude/hooks/guard.mjs`)

Runs before every shell command Claude makes (`PreToolUse` on `Bash`, set in `.claude/settings.json`).

| Blocks | Why |
|---|---|
| AI attribution in a commit or PR text | The repo is public and never has it |
| `vercel deploy`, `--prod`, `promote`, `env` changes | The site deploys when a PR is merged into `master` |
| Force-push, push to `master` | One branch and one PR per change |
| A commit with font files in it | Clash Display's licence forbids a public repository |

Tests: `node --test .claude/hooks/`, part of `mise run check`. Change the rules and the tests together.

## Settings (`.claude/settings.json`)

Commit and PR attribution off, and the guard hook. Personal settings go in `.claude/settings.local.json`
(not in git).

## Agents and skills

The `reviewer` and `verifier` agents and the `workflow` skills (`signum`, `ship-branch`, `findings-register`,
`design-pitch`) come from Tom's toolbox on both PCs, not from this repo.

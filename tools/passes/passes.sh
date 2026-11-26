#!/usr/bin/env bash
# Saved passes: a check that went green is saved against the TREE it ran on (every tracked and untracked file that
# git doesn't ignore, committed or not) and the tool versions (node, playwright-cli, the browsers installed, the npm
# lockfile). The same check on the same tree with the same versions is then skipped.
# Workflow audit 11-26: keyed by the commit, a pass needed a clean tree (24 "not saved" against 6 skips in 3 days), and
# each worktree kept its own .cache/passes, so a pass made in a worktree never helped the main checkout. Now a dirty
# tree saves and skips too, and the passes live in the shared git folder (<git common dir>/passes), so the main
# checkout and every worktree on the same tree share them.
# The tree is taken when the check starts (at `skip`), so files edited during a long run don't get a pass they never had.
# Ignored files aren't in the tree; the .env files are hashed into the versions, because the build reads them.
# One file per check and tree (<common dir>/passes/<check>/<tree>); the newest 50 per check are kept.
#   passes.sh skip <check>   exit 0 and print "<check>: already passed on these files, skipped" when a pass is saved;
#                            otherwise note the tree for `save` (also with FORCE=1)
#   passes.sh save <check>   save a pass for the tree noted at `skip` (or the tree now, without a `skip`)
#   passes.sh has <check>    exit 0 when a pass is saved for the files as they are now (showcase status)
#   passes.sh key            print what a pass is tied to (tree + versions)
# FORCE=1 makes skip say no (the scripts also take --force).
set -euo pipefail
root="$(cd "$(dirname "$0")/../.." && pwd)"
dir="$(git -C "$root" rev-parse --path-format=absolute --git-common-dir)/passes"

versions() {
  echo "node $(node -v 2>/dev/null)"
  echo "playwright-cli $(playwright-cli --version 2>/dev/null | head -1)"
  echo "browsers $(ls "${PLAYWRIGHT_BROWSERS_PATH:-$HOME/.cache/ms-playwright}" 2>/dev/null | grep -E '^(chromium|chromium_headless_shell)-' | sort | tr '\n' ' ')"
  echo "lock $(sha256sum "$root/package-lock.json" | cut -c1-16)"
  echo "env $(cat "$root"/.env* 2>/dev/null | sha256sum | cut -c1-16)"
}

# the work tree as git would commit it with `git add -A`, written through a throwaway index (the real one is untouched)
tree() {
  local idx; idx=$(mktemp); trap 'rm -f "$idx"' RETURN
  cp "$(git -C "$root" rev-parse --path-format=absolute --git-path index)" "$idx" 2>/dev/null || true
  GIT_INDEX_FILE="$idx" git -C "$root" add -A >/dev/null
  GIT_INDEX_FILE="$idx" git -C "$root" write-tree
}
stamp() { echo "$1"; versions; }
saved() { local f="$dir/$1/$2"; [ -f "$f" ] && [ "$(cat "$f")" = "$(stamp "$2")" ]; }
# the tree noted at `skip`, one per check and checkout
pending() { echo "$dir/$1/.start-$(echo "$root" | sha256sum | cut -c1-12)"; }

case "${1:-}" in
  skip)
    t=$(tree); mkdir -p "$dir/${2:?check name}"; echo "$t" > "$(pending "$2")"
    [ "${FORCE:-}" = 1 ] && exit 1
    saved "$2" "$t" || exit 1
    touch "$dir/$2/$t" # newest first for the clean-up below
    echo "$2: already passed on these files, skipped (--force runs it anyway)"
    ;;
  save)
    mkdir -p "$dir/${2:?check name}"; p=$(pending "$2")
    t=$(cat "$p" 2>/dev/null) || t=$(tree); rm -f "$p"
    stamp "$t" > "$dir/$2/.tmp.$$" && mv "$dir/$2/.tmp.$$" "$dir/$2/$t" # whole or not at all: another checkout may read it
    ls -t "$dir/$2" | tail -n +51 | while read -r old; do rm -f "$dir/$2/$old"; done
    rm -rf "$root/.cache/passes" # the old per-checkout passes (before 11-26), nothing reads them
    ;;
  has) saved "${2:?check name}" "$(tree)" ;;
  key) stamp "$(tree)" ;;
  *) echo "Usage: passes.sh skip|save|has <check>, or key" >&2; exit 2 ;;
esac

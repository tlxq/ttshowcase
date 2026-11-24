#!/usr/bin/env bash
# Saved passes: a check that went green on a clean tree is saved against the commit and the tool versions
# (node, playwright-cli, the browsers installed, the npm lockfile), in .cache/passes/. The same check on the same
# commit with the same versions is then skipped. A dirty tree never skips and never saves.
# One file per check and commit (.cache/passes/<check>/<sha>), so switching branches keeps every commit's pass; the
# newest 50 per check are kept.
#   passes.sh skip <check>   exit 0 and print "<check>: already passed on <sha>, skipped" when a pass is saved
#   passes.sh save <check>   save a pass (only on a clean tree)
#   passes.sh key            print what a pass is tied to (sha + versions)
# FORCE=1 makes skip say no (the scripts also take --force).
set -euo pipefail
root="$(cd "$(dirname "$0")/../.." && pwd)"
dir="$root/.cache/passes"

clean() { [ -z "$(git -C "$root" status --porcelain 2>/dev/null)" ]; }

versions() {
  echo "node $(node -v 2>/dev/null)"
  echo "playwright-cli $(playwright-cli --version 2>/dev/null | head -1)"
  echo "browsers $(ls "${PLAYWRIGHT_BROWSERS_PATH:-$HOME/.cache/ms-playwright}" 2>/dev/null | grep -E '^(chromium|chromium_headless_shell)-' | sort | tr '\n' ' ')"
  echo "lock $(sha256sum "$root/package-lock.json" | cut -c1-16)"
}

sha() { git -C "$root" rev-parse HEAD; }
stamp() { sha; versions; }

case "${1:-}" in
  skip)
    [ "${FORCE:-}" = 1 ] && exit 1
    clean || exit 1
    f="$dir/${2:?check name}/$(sha)"
    [ -f "$f" ] && [ "$(cat "$f")" = "$(stamp)" ] || exit 1
    echo "$2: already passed on $(sha | cut -c1-7), skipped (--force runs it anyway)"
    ;;
  save)
    clean || { echo "$2: tree is not clean, pass not saved"; exit 0; }
    mkdir -p "$dir/${2:?check name}"
    stamp > "$dir/$2/$(sha)"
    ls -t "$dir/$2" | tail -n +51 | while read -r old; do rm -f "$dir/$2/$old"; done
    ;;
  key) stamp ;;
  *) echo "Usage: passes.sh skip|save <check>, or key" >&2; exit 2 ;;
esac

#!/usr/bin/env bash
# build-first.sh <pass> <mise build task> <script> [args]: the saved-pass lookup runs BEFORE the build, so a check that
# already passed on these files skips without building anything. Otherwise: build, then run the script with the args.
# A named single check (any non-flag arg) is never skipped. --force runs it anyway.
set -euo pipefail
cd "$(dirname "$0")/../.."
pass="$1" build="$2" script="$3"
shift 3
named=""
for a in "$@"; do if [ "$a" = --force ]; then export FORCE=1; else named="$a"; fi; done
# A whole run queues in the desk's test lane (~/.1dot testlane: `testlane status` shows who has it) from here to the
# end, so the build and the check both hold the slot and the pass lookup sees the files the run really starts with.
# A named single check doesn't queue (the quick loop). Inside a held slot (TESTLANE_HELD) or without testlane it just runs.
[ -n "$named" ] || [ -n "${TESTLANE_HELD:-}" ] || ! command -v testlane >/dev/null ||
  exec testlane run --name "ttshowcase $pass" -- "$PWD/tools/passes/build-first.sh" "$pass" "$build" "$script" "$@"
[ -n "$named" ] || ! tools/passes/passes.sh skip "$pass" || exit 0
mise run "$build"
exec "$script" "$@"

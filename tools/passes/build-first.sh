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
[ -n "$named" ] || ! tools/passes/passes.sh skip "$pass" || exit 0
mise run "$build"
exec "$script" "$@"

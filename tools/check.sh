#!/usr/bin/env bash
# `mise run check` (the steps are the hidden task check:steps). Skipped when it already passed on these exact files
# and these tool versions (tools/passes); --force or FORCE=1 runs it anyway.
set -euo pipefail
cd "$(dirname "$0")/.."
for a in "$@"; do [ "$a" = --force ] && export FORCE=1; done
tools/passes/passes.sh skip check && exit 0
mise run check:steps
tools/passes/passes.sh save check

#!/usr/bin/env bash
# gpu-slot.sh <what> <command> [args]: the graphics card's short slot (batch 9). What needs the card alone takes it: the frame-speed checks
# (FRAME_CHECKS in tools/pitch/run.sh), the walk's speed-look, pitch:pair's browsers and picture generation. Everything else (the other named
# checks) runs at once beside them.
# The slot is the desk's graphics-card lock, the one the night run (tools/night.sh) and picture generation (sd-gen) already take
# (flock ~/.cache/ttshowcase-gpu.lock), so every user of the card takes turns, whole runs included: a whole run's own speed checks take it
# one at a time. A holder that starts a check which asks again (the night run, a slot inside a slot) must not wait on itself: whoever holds
# the lock exports GPU_LOCK_HELD=1, and then the command just runs.
# The command's children keep the lock until they end: close browser sessions before the command ends.
set -u
what="$1"
shift
[ -z "${GPU_LOCK_HELD:-}" ] || exec "$@"
lock="${SD_GEN_LOCK:-$HOME/.cache/ttshowcase-gpu.lock}"
mkdir -p "${lock%/*}"
exec 9>>"$lock"
if ! flock -n 9; then
  echo "Waiting for the graphics card ($what)" >&2
  flock 9
fi
export GPU_LOCK_HELD=1
"$@"

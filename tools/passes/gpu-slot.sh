#!/usr/bin/env bash
# gpu-slot.sh <what> <command> [args]: the graphics card's short slot (batch 9). What needs the card alone takes it: the frame-speed checks
# (FRAME_CHECKS in tools/pitch/run.sh), the walk's speed-look, pitch:pair's browsers and picture generation. Everything else (the other named
# checks) runs at once beside them.
# The slot is the desk's graphics-card lock, the one the night run (tools/night.sh) and picture generation (sd-gen) already take
# (flock ~/.cache/ttshowcase-gpu.lock), so every user of the card takes turns, whole runs included: a whole run's own speed checks take it
# one at a time. A holder that starts a check which asks again (the night run, a slot inside a slot) must not wait on itself: whoever holds
# the lock exports GPU_LOCK_HELD=1, and then the command just runs.
# Like the night run, it waits at most GPU_SLOT_WAIT_MIN minutes (default 60; GPU_SLOT_WAIT_SEC for tests), then runs anyway and says so.
# Without a writable lock file or without flock the command runs, with one line saying so.
# The command runs with the lock's file closed, so what it starts (browsers, servers) can never keep the card locked after it ends.
set -u
what="$1"
shift
[ -z "${GPU_LOCK_HELD:-}" ] || exec "$@"
lock="${SD_GEN_LOCK:-$HOME/.cache/ttshowcase-gpu.lock}"
wait_s="${GPU_SLOT_WAIT_SEC:-$(( ${GPU_SLOT_WAIT_MIN:-60} * 60 ))}"
if ! command -v flock >/dev/null || ! mkdir -p "${lock%/*}" 2>/dev/null || ! ( : >>"$lock" ) 2>/dev/null; then
  echo "Couldn't take the graphics card's turn ($what), so it runs now" >&2
  exec "$@"
fi
exec 9>>"$lock"
if ! flock -n 9; then
  echo "Waiting for the graphics card ($what)" >&2
  flock -w "$wait_s" 9 || echo "The graphics card stayed busy for $(( (wait_s + 59) / 60 )) min, so $what runs now; its times may be off" >&2
fi
export GPU_LOCK_HELD=1
"$@" 9>&-

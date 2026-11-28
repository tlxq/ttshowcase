#!/usr/bin/env bash
# gpu-slot.sh <what> <command> [args]: the graphics card's short slot (batch 9). Only what needs the card alone takes one: the frame-speed
# checks (FRAME_CHECKS in tools/pitch/run.sh), the walk's speed-look and picture generation. Everything else (named behaviour checks,
# pitch:pair) runs at once beside them.
# The slot is the desk's test lane (testlane, ~/.1dot, both PCs) limited to its first slot, so every user of this script takes turns:
# a speed check started beside a picture run waits for it, then runs. Inside a whole run that already holds a lane slot (TESTLANE_HELD),
# or without testlane, the command just runs.
set -u
what="$1"
shift
[ -n "${TESTLANE_HELD:-}" ] || ! command -v testlane >/dev/null || exec env TESTLANE_SLOTS=1 testlane run --name "ttshowcase $what" -- "$@"
exec "$@"

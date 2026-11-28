#!/usr/bin/env bash
# The pair (batch 9): a few moments of the walk, each as the approved picture beside the build, and master beside this branch, laptop and
# phone, night and day. A small page (.cache/pitch/pair/index.html) and one picture per screen (pair-laptop-night.png and the other three).
# It jumps straight to each scroll position (tools/pitch/sheet.js), so a moment takes seconds, not the whole sheet's minutes. It is
# not a speed check: it takes no graphics-card slot and runs beside pitch:check's other checks (its branch build has a folder of its own).
# Usage: pair.sh <sv> [<sv> ...] [--approved <folder>] [--base <ref>]
#   sv: scroll positions of the walk, e.g. 840 872 990 (tools/pitch/checks/tour.js has the stops)
#   --approved: a folder of Tom's approved pictures: <sv>-<laptop|phone>-<night|day>.png, <sv>-<laptop|phone>.png or <sv>.png
#   --base: what the branch is compared with (default origin/master)
set -u
cd "$(dirname "$0")/../.."
svs=() approved="" base=""
while [ $# -gt 0 ]; do
  case "$1" in
    --approved) approved="${2:-}"; shift 2 || break ;;
    --base) base="${2:-}"; shift 2 || break ;;
    -*) echo "Couldn't read $1. Usage: mise run pitch:pair 840 872 990 [--approved <folder>] [--base <ref>]" >&2; exit 2 ;;
    *) svs+=("$1"); shift ;;
  esac
done
[ "${#svs[@]}" -gt 0 ] || { echo "Name the scroll positions to show, e.g. mise run pitch:pair 840 872 990" >&2; exit 2; }
for n in "${svs[@]}"; do case "$n" in ''|*[!0-9]*) echo "A scroll position is a number, not '$n'." >&2; exit 2 ;; esac; done
[ -z "$approved" ] || [ -d "$approved" ] || { echo "Couldn't find the folder $approved." >&2; exit 2; }
at=$(IFS=,; echo "${svs[*]}")
exec tools/pitch/sheet.sh --at "$at" ${approved:+--approved "$(cd "$approved" && pwd)"} ${base:+"$base"}

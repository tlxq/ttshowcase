#!/usr/bin/env bash
# One real tag round on a deployment: send, held spot, review page, approve, on the wall, remove, gone.
# Tom gets one mail (name "test"). The test tag sits off the wall (x 40), so no visitor ever sees it.
#   tools/tags/live.sh [base url]   default https://ttdevs.com; an empty address is an error
# The review links' secret comes from Proton Pass via ttpass sync, like /next's key.
set -euo pipefail
# an address that came out empty (a failed look-up) must never mean the live site: only no address at all does
if [ $# -gt 0 ] && [ -z "${1//[[:space:]]/}" ]; then
  echo "Couldn't start the tag round. The address is empty. Name a preview address, or leave it out for https://ttdevs.com" >&2
  exit 2
fi
key_file="$HOME/.config/ttdevs/ttshowcase-tags.key"
[ -r "$key_file" ] || { echo "Couldn't find the tag review secret in $key_file. Run: ttpass sync" >&2; exit 1; }
TAG_SECRET="$(tr -d '\n' <"$key_file")" BASE="${1-https://ttdevs.com}" node "$(dirname "$0")/live.mjs"

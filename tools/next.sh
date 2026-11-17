#!/usr/bin/env bash
# Opens /next, the new site behind its secret link: once per browser, then the cookie remembers it.
#   tools/next.sh live   ttdevs.com/next (Vercel)
#   tools/next.sh dev    this PC's Tailscale dev server (mise run dev), port from PORT (default 3000)
# Add --print to print the link instead (for the phone). The key comes from Proton Pass via ttpass sync.
set -euo pipefail
key_file="$HOME/.config/ttdevs/ttshowcase-next.key"
[ -r "$key_file" ] || { echo "Couldn't find /next's key in $key_file. Run: ttpass sync" >&2; exit 1; }
case "${1:-live}" in
  live) base="https://ttdevs.com" ;;
  dev)
    name=$(tailscale status --json | python3 -I -c 'import json, sys; print(json.load(sys.stdin)["Self"]["DNSName"].rstrip("."))')
    base="http://$name:${PORT:-3000}" ;;
  *) echo "Usage: tools/next.sh live|dev [--print]" >&2; exit 2 ;;
esac
# percent-encoded: Pass may put symbols in the key
url="$base/next?key=$(python3 -I -c 'import sys, urllib.parse; print(urllib.parse.quote(sys.stdin.read().strip(), safe=""))' <"$key_file")"
if [ "${2:-}" = --print ]; then
  echo "$url"
  command -v qrencode >/dev/null && qrencode -t ansiutf8 "$url"
else
  xdg-open "$url" >/dev/null 2>&1 &
  echo "Opened $base/next in the browser"
fi

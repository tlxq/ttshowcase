#!/usr/bin/env bash
# Live editing on this PC's Tailscale address, so the other PC and the phone see changes within seconds.
# The port comes from PORT (default 3000). The address is looked up each time, so it works on both PCs.
set -euo pipefail
cd "$(dirname "$0")/.."

# /next's key (src/release/next-gate.ts), from Proton Pass via ttpass sync; without it /next stays closed
key_file="$HOME/.config/ttdevs/ttshowcase-next.key"
[ -z "${PREVIEW_KEY:-}" ] && [ -r "$key_file" ] && PREVIEW_KEY=$(<"$key_file") && export PREVIEW_KEY
port="${PORT:-3000}"
ip=$(tailscale ip -4 | head -n 1)
[ -n "$ip" ] || { echo "Couldn't find this PC's Tailscale address. Start Tailscale, then try again" >&2; exit 1; }
name=$(tailscale status --json | python3 -I -c 'import json, sys; print(json.load(sys.stdin)["Self"]["DNSName"].rstrip("."))')

echo "Live editing at http://$name:$port (Ctrl+C to stop)"
exec npx next dev --hostname "$ip" --port "$port"

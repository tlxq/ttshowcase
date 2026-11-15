#!/usr/bin/env bash
# The writing page on this PC's Tailscale address, for the S23's S Pen. Port from PORT (default 3011).
set -euo pipefail
cd "$(dirname "$0")/../.."
port="${PORT:-3011}"
ip=$(tailscale ip -4 | head -n 1)
[ -n "$ip" ] || { echo "Couldn't find this PC's Tailscale address. Start Tailscale, then try again" >&2; exit 1; }
name=$(tailscale status --json | python3 -I -c 'import json, sys; print(json.load(sys.stdin)["Self"]["DNSName"].rstrip("."))')
echo "Open http://$name:$port on the phone"
exec python3 -I tools/write/serve.py "$ip" "$port"

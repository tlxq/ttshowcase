#!/usr/bin/env bash
# Serves the static build (out/) over HTTP. Usage: tools/serve.sh tailscale|localhost [--open]
# SERVE_DIR serves another build (the pitch: .cache/pitch) and SERVE_PAGE is the page to open in it.
#   tailscale  this PC's Tailscale address, so the other PC and the phone can open it
#   localhost  this PC only
# The port comes from PORT (default 8123). The address is looked up each time, so it works on both PCs.
set -euo pipefail
cd "$(dirname "$0")/.."

dir="${SERVE_DIR:-out}"
page="${SERVE_PAGE:-}"
[ -f "$dir/${page:-index.html}" ] || { echo "Couldn't find the build in $dir/. Run: mise run ${SERVE_BUILD:-build}" >&2; exit 1; }
export SERVE_DIR="$dir"

# /next's key (src/release/next-gate.ts), from Proton Pass via ttpass sync; without it /next stays closed
key_file="$HOME/.config/ttdevs/ttshowcase-next.key"
[ -z "${PREVIEW_KEY:-}" ] && [ -r "$key_file" ] && PREVIEW_KEY=$(<"$key_file") && export PREVIEW_KEY
port="${PORT:-8123}"
case "${1:-localhost}" in
  tailscale)
    host=$(tailscale ip -4 | head -n 1)
    [ -n "$host" ] || { echo "Couldn't find this PC's Tailscale address. Start Tailscale, then try again" >&2; exit 1; }
    ;;
  localhost) host=localhost ;;
  *) echo "Usage: tools/serve.sh tailscale|localhost [--open]" >&2; exit 2 ;;
esac

url="http://$host:$port/$page"
echo "Serving $dir/ at $url (Ctrl+C to stop)"
if [ "${2:-}" = "--open" ]; then
  (sleep 1; xdg-open "$url" >/dev/null 2>&1) &
fi
exec python3 -I tools/serve.py "$host" "$port"

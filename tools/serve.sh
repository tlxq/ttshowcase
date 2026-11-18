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

# /next's key (middleware.ts), from Proton Pass via ttpass sync; without it /next stays closed
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
# The pitch's own tag store (SERVE_TAGS=1): api/tags.ts in memory on this PC, behind serve.py's /api/tags
if [ -n "${SERVE_TAGS:-}" ]; then
  TAGS_PORT=$(python3 -I -c 'import socket; s = socket.socket(); s.bind(("127.0.0.1", 0)); print(s.getsockname()[1])')
  export TAGS_PORT
  # Tom's wall on the local store uses a test key (tools/tags/local.mjs), or an ADMIN_KEY set by hand: this server answers over plain http on the
  # Tailscale address, so the real key never goes in.
  node tools/tags/local.mjs "$TAGS_PORT" &
  tags=$!
  trap 'kill "$tags" 2>/dev/null' EXIT
fi
python3 -I tools/serve.py "$host" "$port"

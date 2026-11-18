#!/usr/bin/env bash
# Walks the paint pitch (.cache/pitch/paint.html) with playwright-cli at 1440 x 900 and on a phone (Pixel, 412 wide)
# and prints one JSON result per check. Pictures: .cache/shots/pitch-*.png.
# Runs on the graphics card (tools/walk/graphics.sh stops it otherwise). Phone speed and touch are proven on the S23.
# Usage: run.sh [check-name], e.g. run.sh contrast-phone.
set -u
only="${1:-}"
cd "$(dirname "$0")/../.."
root="$PWD"
[ -f .cache/pitch/paint.html ] || { echo "Couldn't find the pitch build. Run: mise run pitch:build" >&2; exit 1; }
mkdir -p .cache/shots .cache/walk
. tools/walk/graphics.sh || exit 1

port=$(python3 -I -c 'import socket; s = socket.socket(); s.bind(("127.0.0.1", 0)); print(s.getsockname()[1])')
SERVE_DIR=.cache/pitch python3 -I tools/serve.py 127.0.0.1 "$port" >/dev/null 2>&1 &
server=$!
trap 'kill "$server" 2>/dev/null' EXIT
for _ in $(seq 1 50); do
  curl -fs "http://127.0.0.1:$port/paint.html" >/dev/null 2>&1 && break
  sleep 0.1
done

names="tour waits endwaits replay2 reduced contrast tagsfull scrollup loop pickspot tagit"
failed=0
ran=0
check() { # check, then "desktop" or "phone"
  local name="$1-$2"
  [ -z "$only" ] || [ "$only" = "$name" ] || [ "$only" = "$1" ] || return 0
  ran=1
  local s="pitch-$name" result script=".cache/walk/pitch-$1.js"
  sed -e "s#__URL__#http://127.0.0.1:$port/paint.html#" -e "s#__SHOTS__#$root/.cache/shots/#" "tools/pitch/checks/$1.js" > "$script"
  if [ "$2" = phone ]; then playwright-cli -s="$s" open --mobile >/dev/null 2>&1
  else playwright-cli -s="$s" open >/dev/null 2>&1 && playwright-cli -s="$s" resize 1440 900 >/dev/null; fi
  result=$(playwright-cli --raw -s="$s" run-code --filename="$root/$script" 2>&1 | grep -v '^$' | tail -1)
  playwright-cli -s="$s" close >/dev/null 2>&1
  case "$result" in
    '"{\"errs\":[],'*) echo "$name: $result" ;;
    *) echo "$name: FAILED $result"; failed=1 ;;
  esac
}
for c in $names; do
  check "$c" desktop
  check "$c" phone
done
[ "$ran" = 1 ] || { echo "Couldn't find a check named $only. Names: $names, each also as <name>-desktop or <name>-phone" >&2; exit 2; }
exit "$failed"

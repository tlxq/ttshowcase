#!/usr/bin/env bash
# Walks the built page with playwright-cli and prints one JSON result per walk. Screenshots: .cache/shots.
# The build (out/) is served on localhost, because a static export does not work from file://.
# Runs on the NVIDIA card where there is one (timing readings then repeat), otherwise on software rendering.
# Either way this proves behaviour, never speed or feel.
# Usage: run.sh [walk-name]. With a name, only that walk runs, e.g. route-phone.
set -u
only="${1:-}"
cd "$(dirname "$0")/../.."
root="$PWD"
[ -f out/index.html ] || { echo "Couldn't find the build in out/. Run: mise run build" >&2; exit 1; }
mkdir -p .cache/shots .cache/walk
export PLAYWRIGHT_MCP_CONFIG="${PLAYWRIGHT_MCP_CONFIG:-$HOME/.claude/playwright-cli.config.json}"
# Without a config of its own (as in CI), the walk uses headless Chromium.
if [ ! -f "$PLAYWRIGHT_MCP_CONFIG" ]; then
  printf '{"browser":{"browserName":"chromium","launchOptions":{"headless":true}}}\n' > .cache/walk/cli.json
  export PLAYWRIGHT_MCP_CONFIG="$root/.cache/walk/cli.json"
fi
if nvidia-smi -L >/dev/null 2>&1; then
  python3 -I tools/walk/gpu_config.py "$PLAYWRIGHT_MCP_CONFIG" > .cache/walk/gpu.json
  export PLAYWRIGHT_MCP_CONFIG="$root/.cache/walk/gpu.json"
fi

port=$(python3 -I -c 'import socket; s = socket.socket(); s.bind(("127.0.0.1", 0)); print(s.getsockname()[1])')
python3 -I -m http.server "$port" --bind 127.0.0.1 --directory out >/dev/null 2>&1 &
server=$!
trap 'kill "$server" 2>/dev/null' EXIT
for _ in $(seq 1 50); do
  curl -fs "http://127.0.0.1:$port/" >/dev/null 2>&1 && break
  sleep 0.1
done

failed=0
ran=0
walk() { # name, script, then "desktop" or "phone"
  [ -z "$only" ] || [ "$only" = "$1" ] || return 0
  ran=1
  local s="walk-$1" result script=".cache/walk/$2"
  sed -e "s#__WALK_URL__#http://127.0.0.1:$port#" -e "s#__SHOTS__#$root/.cache/shots/#" -e "s#__AXE__#$root/node_modules/axe-core/axe.min.js#" -e "s#__BUDGET__#$(tr -d ' \n' < tools/walk/budget.json)#" "tools/walk/$2" > "$script"
  if [ "$3" = phone ]; then playwright-cli -s="$s" open --mobile >/dev/null 2>&1
  else playwright-cli -s="$s" open >/dev/null 2>&1 && playwright-cli -s="$s" resize 1440 900 >/dev/null; fi
  result=$(playwright-cli --raw -s="$s" run-code --filename="$root/$script" 2>&1 | grep -v '^$' | tail -1)
  playwright-cli -s="$s" close >/dev/null 2>&1
  case "$result" in
    '"{\"errs\":[],'*) echo "$1: $result" ;;
    *) echo "$1: FAILED $result"; failed=1 ;;
  esac
}
# The Live part's films (mise run previews): fails once one is more than 30 days old, so the page
# never shows a site as it was long ago.
if [ -z "$only" ] || [ "$only" = recordings ]; then
  ran=1
  if stale=$(python3 -I - src/content/recordings.json <<'PY'
import datetime, json, sys
today = datetime.date.today()
old = [f'{r["name"]} ({r["recorded"] or "never"})' for r in json.load(open(sys.argv[1]))
       if not r["recorded"] or (today - datetime.date.fromisoformat(r["recorded"])).days > 30]
print(", ".join(old))
sys.exit(1 if old else 0)
PY
  ); then echo 'recordings: "{\"errs\":[]}"'
  else echo "recordings: FAILED more than 30 days old, run mise run previews: $stale"; failed=1; fi
fi
walk look-desktop look.js desktop
walk look-phone look.js phone
walk look-widths widths.js desktop
walk wall-desktop wall.js desktop
walk wall-phone wall.js phone
walk a11y-desktop a11y.js desktop
walk a11y-phone a11y.js phone
walk speed-look speed.js desktop
[ "$ran" = 1 ] || { echo "Couldn't find a walk named $only. Names: recordings opening-desktop opening-phone route-desktop route-phone lines-desktop lines-phone back-desktop back-phone fallback-phone look-desktop look-phone look-widths a11y-desktop a11y-phone speed-look" >&2; exit 2; }
exit "$failed"

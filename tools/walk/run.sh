#!/usr/bin/env bash
# Walks the built page with playwright-cli and prints one JSON result per walk. Screenshots: .cache/shots.
# The build (out/) is served on localhost, because a static export does not work from file://.
# Runs on the graphics card (tools/walk/graphics.sh stops it otherwise): look and laptop frame speed.
# Touch and phone speed are proven on the S23.
# Usage: run.sh [walk-name] [--force]. With a name, only that walk runs, e.g. route-phone.
set -u
only=""
for a in "$@"; do if [ "$a" = --force ]; then export FORCE=1; else only="$a"; fi; done
cd "$(dirname "$0")/../.."
# A whole run that already passed on these files and these tool versions is skipped (tools/passes); --force runs it.
[ -n "$only" ] || ! tools/passes/passes.sh skip walk || exit 0
root="$PWD"
[ -f out/index.html ] || { echo "Couldn't find the build in out/. Run: mise run build" >&2; exit 1; }
mkdir -p .cache/shots .cache/walk
. tools/walk/graphics.sh || exit 1

port=$(python3 -I -c 'import socket; s = socket.socket(); s.bind(("127.0.0.1", 0)); print(s.getsockname()[1])')
# a key of its own, so the walk can open /next like Tom does
PREVIEW_KEY=walk-local-key SERVE_DIR=out python3 -I tools/serve.py 127.0.0.1 "$port" >/dev/null 2>&1 &
server=$!
trap 'kill "$server" 2>/dev/null' EXIT
for _ in $(seq 1 50); do
  curl -fs "http://127.0.0.1:$port/" >/dev/null 2>&1 && break
  sleep 0.1
done

failed=0
ran=0
names=""
walk() { # name, script, then "desktop" or "phone"
  names="$names $1"
  [ -z "$only" ] || [ "$only" = "$1" ] || return 0
  ran=1
  local s="walk-$1" result script=".cache/walk/$1.js"
  sed -e "s#__WALK_URL__#http://127.0.0.1:$port#" -e "s#__URL__#http://127.0.0.1:$port/next/front?key=walk-local-key#" -e "s#__SHOTS__#$root/.cache/shots/#" -e "s#__BUDGET__#$(tr -d ' \n' < tools/walk/budget.json)#" "tools/walk/$2" > "$script"
  # the axe source goes in as a JSON string for page.evaluate (a script tag is blocked by the page's CSP)
  python3 -I - "$script" "$root/node_modules/axe-core/axe.min.js" <<'PY'
import json, sys
js = open(sys.argv[1], encoding="utf-8").read()
if "__AXE_SOURCE__" in js:
    open(sys.argv[1], "w", encoding="utf-8").write(js.replace("__AXE_SOURCE__", json.dumps(open(sys.argv[2], encoding="utf-8").read())))
PY
  if [ "$3" = phone ]; then playwright-cli -s="$s" open --mobile >/dev/null 2>&1
  else playwright-cli -s="$s" open >/dev/null 2>&1 && playwright-cli -s="$s" resize 1440 900 >/dev/null; fi
  # the frame-speed walk takes the graphics card's short slot (tools/passes/gpu-slot.sh) and, inside it, waits for a quiet desk (quiet.sh)
  local lead=(); [ "$1" = speed-look ] && lead=(tools/passes/gpu-slot.sh "walk $1" tools/walk/quiet.sh)
  result=$("${lead[@]}" playwright-cli --raw -s="$s" run-code --filename="$root/$script" 2>&1 | grep -v '^$' | tail -1)
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
walk clearance clearance.js desktop
walk wall-desktop wall.js desktop
walk wall-phone wall.js phone
walk a11y-desktop a11y.js desktop
walk a11y-phone a11y.js phone
# the front pitch as the site serves it (/next/front, its paths and script rule rewritten by the build): the same
# checks as pitch:check's front, so a page that works in the pitch but not on the site fails here
walk front-desktop ../pitch/checks/front.js desktop
walk front-phone ../pitch/checks/front.js phone
walk speed-look speed.js desktop # takes the graphics card's short slot and waits for a quiet desk inside it (in walk() above)
[ "$ran" = 1 ] || { echo "Couldn't find a walk named $only. Names: recordings$names" >&2; exit 2; }
[ -n "$only" ] || [ "$failed" != 0 ] || tools/passes/passes.sh save walk
exit "$failed"

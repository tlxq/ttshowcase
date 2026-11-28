#!/usr/bin/env bash
# Walks the paint pitch (.cache/pitch/paint.html, and the front page front.html: checks front*) with playwright-cli at 1440 x 900 and on a phone (Pixel, 412 wide)
# and prints one JSON result per check. Pictures: .cache/shots/pitch-*.png.
# Behaviour checks run 4 at a time (JOBS=n), each with its own browser session, page server and tag store. The checks
# that time the pour or measure frame speed (FRAME_CHECKS) run alone afterwards: side by side they would disturb each other.
# The output is one line per check in a fixed order. A whole run that passes is saved against the commit (tools/passes).
# Runs on the graphics card (tools/walk/graphics.sh stops it otherwise). Phone speed and touch are proven on the S23.
# Usage: run.sh [check-name] [--force], e.g. run.sh contrast-phone.
set -u
only=""
for a in "$@"; do if [ "$a" = --force ]; then export FORCE=1; else only="$a"; fi; done
cd "$(dirname "$0")/../.."
# A whole run that already passed on these files and these tool versions is skipped (tools/passes); --force runs it.
[ -n "$only" ] || ! tools/passes/passes.sh skip pitch || exit 0
root="$PWD"
[ -f .cache/pitch/paint.html ] || { echo "Couldn't find the pitch build. Run: mise run pitch:build" >&2; exit 1; }
grep -q "const SAVED_NUMBERS = {};" .cache/pitch/paint.html || { echo "The pitch build carries saved numbers, which the checks must not see. Run: PITCH_NUMBERS=off mise run pitch:build (mise run pitch:check does it)" >&2; exit 1; }
mkdir -p .cache/shots .cache/walk
. tools/walk/graphics.sh || exit 1

names="startbytes lateload stripe tour garage site waits epanums nogithub endwaits replay2 reduced contrast plates framed tagsfull scrollup pickspot space tagit tagstore admin nogl startkey startclick startload fall shape pageinfo front frontstill frontpace inventory" # front*: the front page (front.html)
FRAME_CHECKS=" startbytes lateload waits endwaits tagsfull frontpace "
JOBS="${JOBS:-4}"
out=$(mktemp -d)
trap 'kill $(jobs -p) 2>/dev/null; rm -rf "$out"' EXIT

free_port() { python3 -I -c 'import socket; s = socket.socket(); s.bind(("127.0.0.1", 0)); print(s.getsockname()[1])'; }

job() { # check, then "desktop" or "phone": its own servers and browser session; writes $out/<name>.line and .rc
  local name="$1-$2" s="pitch-$1-$2" result script=".cache/walk/pitch-$1-$2.js" port tport tags srv
  port=$(free_port)
  tport=$(free_port)
  ADMIN_KEY=local-pitch-admin-key-0123456789abcdef node tools/tags/local.mjs "$tport" >/dev/null 2>&1 & # this check's own tag store (in memory, no mail)
  tags=$!
  TAGS_PORT="$tport" SERVE_DIR=.cache/pitch python3 -I tools/serve.py 127.0.0.1 "$port" >/dev/null 2>&1 &
  srv=$!
  for _ in $(seq 1 50); do
    curl -fs "http://127.0.0.1:$port/paint.html" >/dev/null 2>&1 && curl -fs "http://127.0.0.1:$port/api/tags" >/dev/null 2>&1 && break
    sleep 0.1
  done
  local page="paint.html?hour=23"; case "$1" in front*) page=front.html ;; esac # the clock light (Tom 11-23): the checks walk at night, the start's own light; contrast walks at noon too
  budget=$(node -p 'JSON.stringify(require("./tools/walk/budget.json").pitchStart.limits)')
  standin=$(tr -d '\n' < tools/pitch/standin-numbers.json)
  scene=$(tr -d '\n ' < tools/pitch/scene.json)
  # wrap.mjs: three.js is answered from tools/pitch/vendor (no network needed), and any other outside request fails the check
  sed -e "s#__BUDGET__#$budget#g" -e "s#__URL__#http://127.0.0.1:$port/$page#g" -e "s#__SHOTS__#$root/.cache/shots/#g" -e "s#__STANDIN__#$standin#g" -e "s#__SCENE__#$scene#g" "tools/pitch/checks/$1.js" | node tools/pitch/wrap.mjs /dev/stdin > "$script"
  if [ "$2" = phone ]; then playwright-cli -s="$s" open --mobile >/dev/null 2>&1
  else playwright-cli -s="$s" open >/dev/null 2>&1 && playwright-cli -s="$s" resize 1440 900 >/dev/null; fi
  # The walls' live numbers come from this site's /api/github, which asks GitHub (60 anonymous asks an hour per address): a whole run would use
  # that up. So the checks answer it with no numbers: nothing is drawn, which is also the page's own "no answer" look. (The real numbers are
  # looked at by eye, in the pictures; the nogithub check proves the page never asks GitHub itself.)
  playwright-cli -s="$s" route "**/api/github" --status=200 --body='{}' >/dev/null 2>&1
  # a frame-speed check holds the graphics card's short slot while it measures (tools/passes/gpu-slot.sh); the others run at once beside whatever else runs
  local lead=(); case "$FRAME_CHECKS" in *" $1 "*) lead=(tools/passes/gpu-slot.sh "pitch $1-$2") ;; esac
  result=$("${lead[@]}" playwright-cli --raw -s="$s" run-code --filename="$root/$script" 2>&1 | grep -v '^$' | tail -1)
  playwright-cli -s="$s" close >/dev/null 2>&1
  kill "$srv" "$tags" 2>/dev/null
  case "$result" in
    '"{\"errs\":[],'*) echo "$name: $result" > "$out/$name.line"; echo 0 > "$out/$name.rc" ;;
    *) echo "$name: FAILED $result" > "$out/$name.line"; echo 1 > "$out/$name.rc" ;;
  esac
}

parallel=""
alone=""
for c in $names; do
  for d in desktop phone; do
    [ -z "$only" ] || [ "$only" = "$c-$d" ] || [ "$only" = "$c" ] || continue
    case "$FRAME_CHECKS" in *" $c "*) alone="$alone $c-$d" ;; *) parallel="$parallel $c-$d" ;; esac
  done
done
[ -n "$parallel$alone" ] || { echo "Couldn't find a check named $only. Names: $names, each also as <name>-desktop or <name>-phone" >&2; exit 2; }

running=0
for n in $parallel; do
  job "${n%-*}" "${n##*-}" &
  running=$((running + 1))
  if [ "$running" -ge "$JOBS" ]; then wait -n; running=$((running - 1)); fi
done
wait
for n in $alone; do job "${n%-*}" "${n##*-}"; done

failed=0
for c in $names; do
  for d in desktop phone; do
    [ -f "$out/$c-$d.line" ] || continue
    cat "$out/$c-$d.line"
    [ "$(cat "$out/$c-$d.rc")" = 0 ] || failed=1
  done
done
[ -n "$only" ] || [ "$failed" != 0 ] || tools/passes/passes.sh save pitch
exit "$failed"

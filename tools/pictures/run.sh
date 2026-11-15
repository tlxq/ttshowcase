#!/usr/bin/env bash
# Pictures of every part of the page (and the 404) at 1440x900 and 390x844, at rest (reduced motion),
# for a before/after check. Pictures live in .cache/pictures of the main checkout, never in git.
# On master the run becomes the baseline; on any other branch it is compared with it and a page is written.
# Usage: run.sh [--baseline] [--compare-only]. --baseline saves this run as the baseline whatever the branch;
# --compare-only writes the page again from the last run.
set -u
cd "$(dirname "$0")/../.."
root="$PWD"
save_base=0
compare_only=0
for a in "$@"; do
  case "$a" in
    --baseline) save_base=1 ;;
    --compare-only) compare_only=1 ;;
    *) echo "Unknown option $a. Options: --baseline --compare-only" >&2; exit 2 ;;
  esac
done
branch=$(git rev-parse --abbrev-ref HEAD)
slug=$(printf '%s' "$branch" | tr -c 'A-Za-z0-9._-' '-')
common=$(git rev-parse --path-format=absolute --git-common-dir)
store="$(dirname "$common")/.cache/pictures"
run="$store/run-$slug"
base="$store/master"
page="$store/$slug.html"

if [ "$compare_only" = 0 ]; then
  [ -f out/index.html ] || { echo "Couldn't find the build in out/. Run: mise run build" >&2; exit 1; }
  mkdir -p .cache/walk
  rm -rf "$run"
  mkdir -p "$run/desktop" "$run/phone"
  . tools/walk/graphics.sh || exit 1
  port=$(python3 -I -c 'import socket; s = socket.socket(); s.bind(("127.0.0.1", 0)); print(s.getsockname()[1])')
  python3 -I -m http.server "$port" --bind 127.0.0.1 --directory out >/dev/null 2>&1 &
  server=$!
  trap 'kill "$server" 2>/dev/null; for k in desktop phone; do playwright-cli -s="pictures-$k" close >/dev/null 2>&1; done' EXIT
  for _ in $(seq 1 50); do
    curl -fs "http://127.0.0.1:$port/" >/dev/null 2>&1 && break
    sleep 0.1
  done
  failed=0
  for kind in desktop phone; do
    s="pictures-$kind"
    script=".cache/walk/pictures-$kind.js"
    sed -e "s#__URL__#http://127.0.0.1:$port#g" -e "s#__OUT__#$run/$kind#g" tools/pictures/shoot.js > "$script"
    if [ "$kind" = phone ]; then
      playwright-cli -s="$s" open --mobile >/dev/null 2>&1
    else
      playwright-cli -s="$s" open >/dev/null 2>&1 && playwright-cli -s="$s" resize 1440 900 >/dev/null
    fi
    result=$(playwright-cli --raw -s="$s" run-code --filename="$root/$script" 2>&1 | grep -v '^$' | tail -1)
    playwright-cli -s="$s" close >/dev/null 2>&1
    case "$result" in
      '"{\"errs\":[],'*) echo "$kind: $(find "$run/$kind" -name '*.png' | wc -l) pictures" ;;
      *) echo "$kind: FAILED $result" >&2; failed=1 ;;
    esac
  done
  [ "$failed" = 0 ] || exit 1
  # One flat folder: the name carries the size.
  for kind in desktop phone; do
    for f in "$run/$kind"/*.png; do mv "$f" "$run/$kind-$(basename "$f")"; done
    rmdir "$run/$kind"
  done
fi
[ -n "$(ls "$run"/*.png 2>/dev/null)" ] || { echo "No pictures from this run." >&2; exit 1; }
if [ "$branch" = master ] || [ "$save_base" = 1 ]; then
  rm -rf "$base"
  cp -r "$run" "$base"
  git rev-parse HEAD > "$base/SHA"
  echo "Saved $(ls "$base"/*.png | wc -l) pictures as the baseline."
  exit 0
fi
[ -d "$base" ] || { echo "No pictures from master to compare with. Run mise run pictures on master first." >&2; exit 1; }
# The baseline is only fair when it is the master this branch starts from.
from=$(cat "$base/SHA" 2>/dev/null || echo unknown)
start=$(git merge-base HEAD master 2>/dev/null || echo unknown)
note="Compared with master at ${from:0:7}."
if [ "$from" != "$start" ]; then
  note="$note This branch starts from ${start:0:7}, so some changes may be master's own. Run mise run pictures on master again."
  echo "$note" >&2
fi
python3 -I tools/pictures/compare.py "$base" "$run" "$page" "$branch" "$note" || exit 1
echo "Page: $page"

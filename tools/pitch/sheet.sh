#!/usr/bin/env bash
# The whole-walk sheet (Tom 11-23, "hand in hand"): the same moments of the walk on a base build (default origin/master) and on this
# branch, laptop 1440 x 900 + phone, by night (?hour=23) and by day (?hour=12), side by side, changed pictures marked. Shown to
# Tom and the design reviewer before every visual step, so a change in one moment can't quietly hurt another.
# Pictures and page: .cache/pitch/sheet/ (served by `mise run pitch` at /sheet/). Runs on the graphics card, 4 browsers at a time.
# It rebuilds .cache/pitch, so it runs after pitch:check, not beside it.
# Usage: sheet.sh [base-ref]
set -u
base="${1:-origin/master}" # origin's: a worktree's own master is often behind
cd "$(dirname "$0")/../.."
root="$PWD" sheet="$PWD/.cache/pitch/sheet" src="$PWD/.cache/sheet-base"
. tools/walk/graphics.sh || exit 1
git rev-parse --verify -q --end-of-options "$base^{commit}" >/dev/null || { echo "Couldn't find $base. Name a branch or commit." >&2; exit 2; }

SESSIONS=$(for b in base branch; do for w in laptop phone; do for h in 23 12; do echo "sheet-$b-$w-$h"; done; done; done)
cleanup() { kill $(jobs -p) 2>/dev/null; for s in $SESSIONS; do playwright-cli -s="$s" close >/dev/null 2>&1; done; rm -rf "$src"; }
trap cleanup EXIT
cleanup # a browser left by an interrupted run would point at a dead server

# the base build: its files from git (no worktree), with this checkout's packages and fonts
rm -rf "$sheet" && mkdir -p "$src/.cache" "$sheet"
git archive "$base" pitch tools/pitch/build.mjs tools/pitch/paint-parts.mjs api src | tar -x -C "$src" || { echo "Couldn't copy $base's files: it may be older than the paint pitch" >&2; exit 1; }
# this branch first: its build fetches the fonts once into .cache/fonts, which the base build borrows (a fresh worktree has none yet)
node tools/pitch/build.mjs >/dev/null || { echo "This branch's build failed. To see why: mise run pitch:build" >&2; exit 1; }
ln -s "$root/node_modules" "$src/node_modules"; ln -s "$root/.cache/fonts" "$src/.cache/fonts"
node "$src/tools/pitch/build.mjs" >/dev/null || { echo "The build of $base failed. To see why: git switch $base && mise run pitch:build" >&2; exit 1; }

free_port() { python3 -I -c 'import socket; s = socket.socket(); s.bind(("127.0.0.1", 0)); print(s.getsockname()[1])'; }
shoot() { # build (base|branch), screen (laptop|phone), hour; a failed shoot leaves <dir>.fail with the reason
  local dir port tport tags srv result s="sheet-$1-$2-$3" js="$sheet/$1-$2-$3.js" out="$sheet/$1/$2-h$3"
  [ "$1" = base ] && dir="$src/.cache/pitch" || dir="$root/.cache/pitch"
  port=$(free_port) tport=$(free_port)
  ADMIN_KEY=local-pitch-admin-key-0123456789abcdef node tools/tags/local.mjs "$tport" >/dev/null 2>&1 & tags=$! # its own tag store, as in run.sh
  TAGS_PORT="$tport" SERVE_DIR="$dir" python3 -I tools/serve.py 127.0.0.1 "$port" >/dev/null 2>&1 & srv=$!
  for _ in $(seq 1 50); do curl -fs "http://127.0.0.1:$port/paint.html" >/dev/null 2>&1 && curl -fs "http://127.0.0.1:$port/api/tags" >/dev/null 2>&1 && break; sleep 0.1; done
  mkdir -p "$out"
  sed -e "s#__URL__#http://127.0.0.1:$port/paint.html?hour=$3#" -e "s#__OUT__#$out/#" tools/pitch/sheet.js > "$js"
  if [ "$2" = phone ]; then playwright-cli -s="$s" open --mobile >/dev/null 2>&1
  else playwright-cli -s="$s" open >/dev/null 2>&1 && playwright-cli -s="$s" resize 1440 900 >/dev/null; fi
  playwright-cli -s="$s" route "**/api/github" --status=200 --body='{}' >/dev/null 2>&1 # no live numbers: see run.sh
  result=$(playwright-cli --raw -s="$s" run-code --filename="$js" 2>&1 | grep -v '^$' | tail -1)
  playwright-cli -s="$s" close >/dev/null 2>&1; kill "$srv" "$tags" 2>/dev/null; rm -f "$js"
  case "$result" in '"{\"errs\":[]}"') ;; *) echo "$result" > "$out.fail"; echo "$1 $2 hour $3 failed: $result" ;; esac
}
running=0
for b in base branch; do for w in laptop phone; do for h in 23 12; do
  [ "$running" -ge 4 ] && { wait -n; running=$((running - 1)); }
  shoot "$b" "$w" "$h" & running=$((running + 1))
done; done; done
while [ "$running" -gt 0 ]; do wait -n; running=$((running - 1)); done

python3 -I tools/pitch/sheet_page.py "$sheet" "$base" "$(git rev-parse --abbrev-ref HEAD)"
failed=$(find "$sheet" -name '*.fail' | wc -l)
host=$(tailscale ip -4 2>/dev/null | head -n 1)
echo "Sheet: .cache/pitch/sheet/index.html${host:+ · with mise run pitch running: http://$host:${PORT:-8124}/sheet/}"
[ "$failed" -eq 0 ] || { echo "$failed of 8 runs failed; their pictures say missing" >&2; exit 1; }

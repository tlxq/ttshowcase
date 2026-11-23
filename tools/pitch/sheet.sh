#!/usr/bin/env bash
# The whole-walk sheet (Tom 11-23, "hand in hand"): the same moments of the walk on a base build (default master) and on this
# branch, laptop 1440 x 900 + phone, by night (?hour=23) and by day (?hour=12), side by side, changed pictures marked. Shown to
# Tom and the design reviewer before every visual step, so a change in one moment can't quietly hurt another.
# Pictures and page: .cache/pitch/sheet/ (served by `mise run pitch` at /sheet/). Runs on the graphics card, 4 browsers at a time.
# Usage: sheet.sh [base-ref]
set -u
base="${1:-master}"
cd "$(dirname "$0")/../.."
root="$PWD" sheet="$PWD/.cache/pitch/sheet" src="$PWD/.cache/sheet-base"
. tools/walk/graphics.sh || exit 1
git rev-parse --verify -q "$base^{commit}" >/dev/null || { echo "Couldn't find $base. Name a branch or commit." >&2; exit 2; }

# the base build: its files from git (no worktree), with this checkout's packages and fonts
rm -rf "$src" "$sheet" && mkdir -p "$src/.cache" "$sheet"
git archive "$base" pitch tools/pitch/build.mjs api src | tar -x -C "$src"
ln -s "$root/node_modules" "$src/node_modules"; ln -s "$root/.cache/fonts" "$src/.cache/fonts"
node "$src/tools/pitch/build.mjs" >/dev/null || { echo "The base build ($base) failed" >&2; exit 1; }
node tools/pitch/build.mjs >/dev/null || { echo "This branch's build failed" >&2; exit 1; }

free_port() { python3 -I -c 'import socket; s = socket.socket(); s.bind(("127.0.0.1", 0)); print(s.getsockname()[1])'; }
shoot() { # build (base|branch), screen (laptop|phone), hour
  local dir port tport tags srv s="sheet-$1-$2-$3" js="$sheet/$1-$2-$3.js"
  [ "$1" = base ] && dir="$src/.cache/pitch" || dir="$root/.cache/pitch"
  port=$(free_port) tport=$(free_port)
  ADMIN_KEY=local-pitch-admin-key-0123456789abcdef node tools/tags/local.mjs "$tport" >/dev/null 2>&1 & tags=$! # its own tag store, as in run.sh
  TAGS_PORT="$tport" SERVE_DIR="$dir" python3 -I tools/serve.py 127.0.0.1 "$port" >/dev/null 2>&1 & srv=$!
  for _ in $(seq 1 50); do curl -fs "http://127.0.0.1:$port/paint.html" >/dev/null 2>&1 && curl -fs "http://127.0.0.1:$port/api/tags" >/dev/null 2>&1 && break; sleep 0.1; done
  mkdir -p "$sheet/$1/$2-h$3"
  sed -e "s#__URL__#http://127.0.0.1:$port/paint.html?hour=$3#" -e "s#__OUT__#$sheet/$1/$2-h$3/#" tools/pitch/sheet.js > "$js"
  if [ "$2" = phone ]; then playwright-cli -s="$s" open --mobile >/dev/null 2>&1
  else playwright-cli -s="$s" open >/dev/null 2>&1 && playwright-cli -s="$s" resize 1440 900 >/dev/null; fi
  playwright-cli -s="$s" route "https://api.github.com/**" --status=200 --body='[]' >/dev/null 2>&1 # no live numbers: see run.sh
  playwright-cli -s="$s" route "https://raw.githubusercontent.com/**" --status=200 --body='' >/dev/null 2>&1
  echo "$1 $2 hour $3: $(playwright-cli --raw -s="$s" run-code --filename="$js" 2>&1 | grep -v '^$' | tail -1)"
  playwright-cli -s="$s" close >/dev/null 2>&1; kill "$srv" "$tags" 2>/dev/null; rm -f "$js"
}
n=0
for b in base branch; do for w in laptop phone; do for h in 23 12; do
  shoot "$b" "$w" "$h" & n=$((n + 1)); [ $((n % 4)) -eq 0 ] && wait
done; done; done; wait
rm -rf "$src"
python3 -I tools/pitch/sheet_page.py "$sheet" "$base" "$(git rev-parse --abbrev-ref HEAD)"
host=$(tailscale ip -4 2>/dev/null | head -n 1)
echo "Sheet: .cache/pitch/sheet/index.html${host:+ · with mise run pitch running: http://$host:${PORT:-8124}/sheet/}"

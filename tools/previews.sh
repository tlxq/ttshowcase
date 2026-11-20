#!/usr/bin/env bash
# Films the sites in src/content/recordings.json scrolling, on a laptop (1440 x 900) and/or a phone
# (390 x 844), kept at full size so they stay sharp, for the Live part's screens where a site can't be shown live. Each film becomes a
# small WebM (VP9) and MP4 (H.264, for browsers without VP9), the browser fetching one of them, and a
# still of its first frame in public/projects, and its date
# goes into recordings.json; the walk fails once a recording is more than 30 days old.
# Usage: tools/previews.sh [name], e.g. tools/previews.sh app-utveckling. Needs playwright-cli and ffmpeg.
set -euo pipefail
cd "$(dirname "$0")/.."
list=src/content/recordings.json
only="${1:-}"
work=$(mktemp -d)
trap 'playwright-cli -s=previews close >/dev/null 2>&1 || true; rm -rf "$work"' EXIT

# name url films (one site per line; films: laptop and/or phone, only the ones the page shows)
sites=$(python3 -I -c 'import json,sys; [print(r["name"], r["url"], " ".join(r["films"])) for r in json.load(open(sys.argv[1]))]' "$list")

film() { # name url kind width height outwidth
  local name=$1 url=$2 kind=$3 w=$4 h=$5 out=$6 raw="$work/$1-$3.webm"
  playwright-cli -s=previews resize "$w" "$h" >/dev/null
  playwright-cli -s=previews goto "$url" >/dev/null
  sleep 3 # the site's first scene settles
  playwright-cli -s=previews video-start "$raw" --size "${w}x${h}" >/dev/null
  # Down the page at an even pace for about 8 s, the way a visitor reads it
  playwright-cli -s=previews run-code "async page => { for (let i = 0; i < 80; i++) { await page.mouse.wheel(0, $((h / 20))); await page.waitForTimeout(100); } await page.waitForTimeout(400); }" >/dev/null
  playwright-cli -s=previews video-stop >/dev/null
  ffmpeg -nostdin -v error -y -ss 0.3 -i "$raw" -t 8.5 -an -vf "scale=$out:-2,fps=25" \
    -c:v libx264 -preset slow -crf 24 -pix_fmt yuv420p -movflags +faststart \
    "public/projects/$name-$kind.mp4"
  ffmpeg -nostdin -v error -y -ss 0.3 -i "$raw" -t 8.5 -an -vf "scale=$out:-2,fps=25" \
    -c:v libvpx-vp9 -crf 33 -b:v 0 -row-mt 1 -deadline good \
    "public/projects/$name-$kind.webm"
  ffmpeg -nostdin -v error -y -ss 0.3 -i "$raw" -frames:v 1 -vf "scale=$out:-2" -quality 86 \
    "public/projects/$name-$kind.webp"
  echo "$name-$kind: mp4 $(du -h "public/projects/$name-$kind.mp4" | cut -f1), webm $(du -h "public/projects/$name-$kind.webm" | cut -f1)"
}

playwright-cli -s=previews open about:blank >/dev/null
while read -r name url films <&3; do
  [ -z "$only" ] || [ "$only" = "$name" ] || continue
  for kind in $films; do
    case $kind in
      laptop) film "$name" "$url" laptop 1440 900 1440 ;;
      phone) film "$name" "$url" phone 390 844 390 ;;
    esac
  done
  python3 -I - "$list" "$name" <<'PY'
import datetime, json, sys
path, name = sys.argv[1], sys.argv[2]
rows = json.load(open(path))
for r in rows:
    if r["name"] == name:
        r["recorded"] = datetime.date.today().isoformat()
open(path, "w").write(json.dumps(rows, indent=2) + "\n")
PY
done 3<<< "$sites"

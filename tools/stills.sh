#!/usr/bin/env bash
# Takes the sites in src/content/stills.json as sharp stills for the front page's work part, at twice the
# screen's density, so they stay crisp on a laptop's sharp screen and on a phone:
#   laptop      1440 x 900 at 2x  -> public/projects/<name>-laptop.webp, 1920 wide
#   phone-full  the page from the top at 390 wide, 2x, about 3 screens long (it ends before the sign-up form) -> public/projects/<name>-phone.webp, 780 wide
# "hide" lists what must never be in a picture (people's names, comments, a town): taken out of the page before the shot.
# Usage: tools/stills.sh [name]. Needs playwright-cli and python3 with Pillow.
set -euo pipefail
cd "$(dirname "$0")/.."
list=src/content/stills.json
only="${1:-}"
work=$(mktemp -d)
trap 'playwright-cli -s=stills close >/dev/null 2>&1 || true; rm -rf "$work"' EXIT

playwright-cli -s=stills open about:blank >/dev/null
python3 -I -c 'import json,sys
for r in json.load(open(sys.argv[1])):
    for k in r["stills"]: print(r["name"], k, r["url"], json.dumps(r["hide"]))' "$list" |
while read -r name kind url hide; do
  [ -z "$only" ] || [ "$only" = "$name" ] || continue
  case $kind in
    laptop) w=1440 h=900 full=false out=1920 ;;
    phone-full) w=390 h=844 full=true out=780 ;;
    *) echo "Unknown still: $kind" >&2; exit 1 ;;
  esac
  raw="$work/$name-$kind.png"
  playwright-cli -s=stills run-code "async page => {
    const ctx = await page.context().browser().newContext({ viewport: { width: $w, height: $h }, deviceScaleFactor: 2, isMobile: $full, hasTouch: $full });
    const p = await ctx.newPage();
    await p.goto('$url', { waitUntil: 'networkidle' });
    await p.waitForTimeout(2500);
    const hide = $hide;
    if (hide.length) await p.addStyleTag({ content: hide.map((s) => s + '{display:none!important}').join('') });
    if ($full) { for (let y = 0; y < 30; y++) { await p.mouse.wheel(0, 800); await p.waitForTimeout(120); } await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(800); }
    await p.screenshot({ path: '$raw', fullPage: $full });
    await ctx.close();
  }" >/dev/null
  python3 -I - "$raw" "public/projects/$name-${kind%-full}.webp" "$out" <<'PY'
import sys
from PIL import Image
src, dst, w = sys.argv[1], sys.argv[2], int(sys.argv[3])
im = Image.open(src).convert("RGB")
im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
im = im.crop((0, 0, w, min(im.height, round(w * 844 / 390 * 3.1))))  # a long phone page: its first 3 screens
im.save(dst, quality=86, method=6)
print(dst, im.size)
PY
done

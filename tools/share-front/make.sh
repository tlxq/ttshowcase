#!/usr/bin/env bash
# Makes the front's share card (pitch/assets/share.jpg) from tools/share-front/card.html, with the front's own fonts
# (read from the build) and the site's tokens. Run it when the card, the role line or the photo changes, then build.
# The go-live PR moves the card to public/share.jpg, where the front's og:image points.
set -euo pipefail
cd "$(dirname "$0")/../.."
root="$PWD"
[ -f out/next/front.html ] || { echo "Couldn't find the front in out/next/. Run: mise run build" >&2; exit 1; }
work=.cache/share-front
mkdir -p "$work"
cp tools/share-front/assets/tom.webp "$work/"
python3 -I - "$root" <<'PY'
import re, sys
root = sys.argv[1]
front = open(f"{root}/out/next/front.html").read()
faces = [f for f in re.findall(r"@font-face\{[^}]*\}", front) if "'Archivo'" in f or "'JetBrains Mono'" in f]
if len(faces) != 2:
    sys.exit(f"Found {len(faces)} of the front's 2 fonts (Archivo, JetBrains Mono) in out/next/front.html")
page = open(f"{root}/tools/share-front/card.html").read()
page = page.replace("__FONTS__", "\n".join(faces)).replace("__TOKENS__", open(f"{root}/src/design/tokens.css").read())
open(f"{root}/.cache/share-front/card.html", "w").write(page)
PY
export PLAYWRIGHT_MCP_CONFIG="${PLAYWRIGHT_MCP_CONFIG:-$HOME/.claude/playwright-cli.config.json}"
if [ ! -f "$PLAYWRIGHT_MCP_CONFIG" ]; then
  printf '{"browser":{"browserName":"chromium","launchOptions":{"headless":true}}}\n' > "$work/cli.json"
  export PLAYWRIGHT_MCP_CONFIG="$root/$work/cli.json"
fi
port=$(python3 -I -c 'import socket; s = socket.socket(); s.bind(("127.0.0.1", 0)); print(s.getsockname()[1])')
python3 -I -m http.server "$port" --bind 127.0.0.1 --directory "$work" >/dev/null 2>&1 &
server=$!
trap 'kill "$server" 2>/dev/null; playwright-cli -s=share-front close >/dev/null 2>&1 || true' EXIT
for _ in $(seq 1 50); do curl -fs "http://127.0.0.1:$port/card.html" >/dev/null 2>&1 && break; sleep 0.1; done
cat > "$work/shot.js" <<JS
async page => {
  await page.setViewportSize({ width: 1200, height: 630 });
  await page.goto('http://127.0.0.1:$port/card.html');
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  await page.screenshot({ path: '$root/pitch/assets/share.jpg', type: 'jpeg', quality: 88 });
  return 'saved';
}
JS
playwright-cli -s=share-front open >/dev/null
playwright-cli -s=share-front --raw run-code --filename="$root/$work/shot.js" >/dev/null
echo "Saved pitch/assets/share.jpg ($(du -k pitch/assets/share.jpg | cut -f1) KB)"

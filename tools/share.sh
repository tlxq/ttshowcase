#!/usr/bin/env bash
# Makes the share card (public/share.jpg): the first screen of /look at 1200 × 630, after the tag
# has written itself and its drips have run (Tom picked C 11-14). Run it again when the first
# screen changes, then build. It reads the build in out/.
set -euo pipefail
cd "$(dirname "$0")/.."
root="$PWD"
[ -f out/index.html ] || { echo "Couldn't find the build in out/. Run: mise run build" >&2; exit 1; }
mkdir -p .cache/share
export PLAYWRIGHT_MCP_CONFIG="${PLAYWRIGHT_MCP_CONFIG:-$HOME/.claude/playwright-cli.config.json}"
if [ ! -f "$PLAYWRIGHT_MCP_CONFIG" ]; then
  printf '{"browser":{"browserName":"chromium","launchOptions":{"headless":true}}}\n' > .cache/share/cli.json
  export PLAYWRIGHT_MCP_CONFIG="$root/.cache/share/cli.json"
fi
port=$(python3 -I -c 'import socket; s = socket.socket(); s.bind(("127.0.0.1", 0)); print(s.getsockname()[1])')
python3 -I -m http.server "$port" --bind 127.0.0.1 --directory out >/dev/null 2>&1 &
server=$!
trap 'kill "$server" 2>/dev/null; playwright-cli -s=share close >/dev/null 2>&1 || true' EXIT
for _ in $(seq 1 50); do curl -fs "http://127.0.0.1:$port/" >/dev/null 2>&1 && break; sleep 0.1; done
# The tag starts at 400 ms, writes for about 2.7 s and its drips run 2.6 s more.
cat > .cache/share/shot.js <<JS
async page => {
  await page.setViewportSize({ width: 1200, height: 630 });
  await page.goto('http://127.0.0.1:$port/');
  await page.waitForTimeout(7000);
  await page.screenshot({ path: '$root/public/share.jpg', type: 'jpeg', quality: 85 });
  return 'saved';
}
JS
playwright-cli -s=share open >/dev/null
playwright-cli -s=share --raw run-code --filename="$root/.cache/share/shot.js" >/dev/null
echo "Saved public/share.jpg ($(du -k public/share.jpg | cut -f1) KB)"

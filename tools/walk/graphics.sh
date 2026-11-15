# Sourced by the walks and the pictures: picks the browser config and proves the browser draws on the
# graphics card. The shared config (~/.1dot, both PCs) turns the card on; this stops the run when the
# browser fell back to software drawing, say after a driver update, instead of testing on it quietly.
# WALK_SOFTWARE_OK=1 allows software drawing on purpose (a PC with no graphics card).
export PLAYWRIGHT_MCP_CONFIG="${PLAYWRIGHT_MCP_CONFIG:-$HOME/.claude/playwright-cli.config.json}"
if [ ! -f "$PLAYWRIGHT_MCP_CONFIG" ]; then
  mkdir -p .cache/walk
  printf '{"browser":{"browserName":"chromium","launchOptions":{"headless":true,"args":["--use-angle=vulkan","--ignore-gpu-blocklist","--enable-gpu-rasterization"]}}}\n' > .cache/walk/cli.json
  export PLAYWRIGHT_MCP_CONFIG="$PWD/.cache/walk/cli.json"
fi
playwright-cli -s=graphics-check open about:blank >/dev/null 2>&1
graphics=$(playwright-cli --raw -s=graphics-check eval '() => { const g = document.createElement("canvas").getContext("webgl2"); if (!g) return "none"; const e = g.getExtension("WEBGL_debug_renderer_info"); return e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : "unknown" }' 2>&1 | grep -v '^$' | tail -1 | tr -d '"')
playwright-cli -s=graphics-check close >/dev/null 2>&1
echo "graphics: $graphics"
case "$graphics" in
  *SwiftShader*|none|unknown|"")
    if [ "${WALK_SOFTWARE_OK:-0}" != 1 ]; then
      echo "The browser is drawing in software, not on the graphics card ($(hostname)). Check the GPU flags in $PLAYWRIGHT_MCP_CONFIG, or run with WALK_SOFTWARE_OK=1 on purpose." >&2
      return 1
    fi ;;
esac

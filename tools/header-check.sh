#!/usr/bin/env bash
# Proves the security rules are on the built site (out/), served by tools/serve.py with vercel.json's headers: the page
# rules (CSP: no framing, no plugins, scripts only from here and pinned three, and every inline script by its hash, never 'unsafe-inline'), Permissions-Policy, nosniff; /next's own
# script rule matches its inline script by hash; security.txt is there and not out of date. Part of `mise run check`.
set -euo pipefail
cd "$(dirname "$0")/.."
[ -f out/next.html ] || { echo "header-check: no out/next.html. Run: mise run build" >&2; exit 1; }

port=$(python3 -I -c 'import socket; s = socket.socket(); s.bind(("127.0.0.1", 0)); print(s.getsockname()[1])')
key="check-$RANDOM$RANDOM"
PREVIEW_KEY="$key" SERVE_DIR=out python3 -I tools/serve.py 127.0.0.1 "$port" >/dev/null 2>&1 &
server=$!
trap 'kill "$server" 2>/dev/null' EXIT
base="http://127.0.0.1:$port"
for _ in $(seq 1 50); do curl -fs "$base/" >/dev/null 2>&1 && break; sleep 0.1; done

fail=0
no() { echo "header-check: $*" >&2; fail=1; }
jar=$(mktemp)
trap 'kill "$server" 2>/dev/null; rm -f "$jar"' EXIT
curl -s -o /dev/null -c "$jar" "$base/next?key=$key"
for p in / /admin /no-such-page /next; do
  h=$(curl -sI -b "$jar" "$base$p" | tr -d '\r')
  csp=$(grep -i '^content-security-policy:' <<<"$h" || true)
  [ -n "$csp" ] || { no "$p has no Content-Security-Policy"; continue; }
  for want in "frame-ancestors 'none'" "object-src 'none'" "base-uri 'self'" "default-src 'self'"; do
    grep -qF "$want" <<<"$csp" || no "$p: the CSP lacks $want"
  done
  grep -qi '^permissions-policy:.*camera=()' <<<"$h" || no "$p has no Permissions-Policy"
  grep -qi '^x-content-type-options: nosniff' <<<"$h" || no "$p has no nosniff"
  grep -qi '^x-frame-options: DENY' <<<"$h" || no "$p can be framed (no X-Frame-Options: DENY)"
done

# every page's header CSP: no 'unsafe-inline' for scripts, and the hash of every inline script it carries (the build's
# manifest is not trusted: the hashes are worked out again here from the page itself)
python3 -I - out "$base" "$key" <<'PY' || fail=1
import base64, hashlib, pathlib, re, sys, urllib.request
out, base, key = pathlib.Path(sys.argv[1]), sys.argv[2], sys.argv[3]
bad = []
def head(path):
    req = urllib.request.Request(base + path, headers={"Cookie": "next_key=" + key})
    try:
        r = urllib.request.urlopen(req)
    except urllib.error.HTTPError as e:
        r = e
    return r.headers.get("Content-Security-Policy", "")
def script_src(csp):
    m = re.search(r"(?:^|;)\s*script-src ([^;]*)", csp)
    return m.group(1) if m else None
pages = sorted(out.rglob("*.html"))
for f in pages:
    rel = f.relative_to(out).as_posix()[:-5]
    path = "/" if rel == "index" else "/" + re.sub(r"/index$", "", rel)
    page = f.read_text(encoding="utf-8")
    want = set()
    for attrs, body in re.findall(r"<script\b([^>]*)>([\s\S]*?)</script>", page, re.I):
        kind = re.search(r"\stype\s*=\s*[\"']?([^\"'\s>]*)", attrs, re.I)
        runs = not kind or re.fullmatch(r"|module|(?:text|application)/(?:x-)?javascript", kind.group(1), re.I)
        if re.search(r"\ssrc\s*=", attrs) or not runs:
            continue
        want.add("sha256-" + base64.b64encode(hashlib.sha256(body.encode()).digest()).decode())
    # the page's file address too (/wall.html, /index.html): the walks open pages by it
    for at in (path, "/index.html" if path == "/" else path + ".html"):
        src = script_src(head(at))
        if src is None:
            bad.append(f"{at}: no script-src in its CSP")
            continue
        if "'unsafe-inline'" in src or "'unsafe-eval'" in src:
            bad.append(f"{at}: script-src allows any inline script")
        named = set(re.findall(r"'(sha256-[^']+)'", src))
        if want - named:
            bad.append(f"{at}: {len(want - named)} of its {len(want)} inline scripts have no hash in the CSP")
for path in ("/no-such-page", "/no/such/page/"):
    src = script_src(head(path)) or ""
    if not src or "'unsafe-inline'" in src:
        bad.append(f"{path}: the CSP of an unknown address allows inline scripts or is missing")
if not pages:
    bad.append("no pages in out/")
if bad:
    sys.exit("header-check: " + "\n".join(bad))
PY

# /next: its meta rule names the hash of exactly the inline script it carries
python3 -I - out/next.html <<'PY' || fail=1
import base64, hashlib, re, sys
page = open(sys.argv[1], encoding="utf-8").read()
rule = re.search(r'<meta http-equiv="Content-Security-Policy" content="([^"]+)">', page)
if not rule:
    sys.exit("header-check: /next has no script rule of its own")
named = set(re.findall(r"'(sha256-[^']+)'", rule.group(1)))
inline = {"sha256-" + base64.b64encode(hashlib.sha256(s.encode()).digest()).decode() for s in re.findall(r"<script>([\s\S]*?)</script>", page)}
if not inline or named != inline:
    sys.exit("header-check: /next's script rule doesn't match its inline scripts (tools/pitch/build.mjs)")
import json
if "url(data:font" in page and not re.search(r"font-src [^;]*data:", json.load(open("out/csp-manifest.json", encoding="utf-8"))["/next"]):
    sys.exit("header-check: /next embeds its fonts as data:, but the site's font-src doesn't allow data: (tools/csp/manifest.mjs)")
if "'unsafe-inline'" in rule.group(1) or "'unsafe-eval'" in rule.group(1):
    sys.exit("header-check: /next's script rule allows any inline script")
PY

txt=$(curl -s -w '\n%{http_code}' "$base/.well-known/security.txt")
[ "$(tail -1 <<<"$txt")" = 200 ] || no "/.well-known/security.txt is missing"
expires=$(grep -oP '^Expires: \K\S+' <<<"$txt" || true)
if [ -z "$expires" ] || [ "$(date -d "$expires" +%s)" -lt "$(date -d '+30 days' +%s)" ]; then
  no "security.txt's Expires (${expires:-none}) is less than 30 days away: move it a year on"
fi
grep -q '^Contact: https://' <<<"$txt" || no "security.txt has no Contact line"

# Vercel BotID: the path its browser part loads the checker from must be the one vercel.json sends to Vercel
node -e '
const core = require("fs").readFileSync("node_modules/botid/dist/client/core/index.mjs", "utf8");
const base = core.match(/"(\/[0-9a-f-]{36}\/[0-9a-f-]{36})"/)?.[1], rw = require("./vercel.json").rewrites ?? [];
const has = (src, to) => rw.some(r => r.source === src && r.destination.startsWith(to));
if (!base || !has(base + "/a-4-a/c.js", "https://api.vercel.com/bot-protection/") || !has(base + "/:path*", "https://api.vercel.com/bot-protection/"))
  { console.error("header-check: BotID loads from " + base + ", but vercel.json has no rewrite for it (README of botid)"); process.exit(1); }' ||
  no "BotID's rewrites"

[ "$fail" = 0 ] && echo "header-check: page rules, /next's script hash, security.txt and BotID's rewrites in place"
exit "$fail"

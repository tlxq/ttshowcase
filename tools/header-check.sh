#!/usr/bin/env bash
# Proves the security rules are on the built site (out/), served by tools/serve.py with vercel.json's headers: the page
# rules (CSP: no framing, no plugins, scripts only from here and pinned three), Permissions-Policy, nosniff; /next's own
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
for p in / /admin /no-such-page; do
  h=$(curl -sI "$base$p" | tr -d '\r')
  csp=$(grep -i '^content-security-policy:' <<<"$h" || true)
  [ -n "$csp" ] || { no "$p has no Content-Security-Policy"; continue; }
  for want in "frame-ancestors 'none'" "object-src 'none'" "base-uri 'self'" "default-src 'self'"; do
    grep -qF "$want" <<<"$csp" || no "$p: the CSP lacks $want"
  done
  grep -qi '^permissions-policy:.*camera=()' <<<"$h" || no "$p has no Permissions-Policy"
  grep -qi '^x-content-type-options: nosniff' <<<"$h" || no "$p has no nosniff"
  grep -qi '^x-frame-options: DENY' <<<"$h" || no "$p can be framed (no X-Frame-Options: DENY)"
done

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

[ "$fail" = 0 ] && echo "header-check: page rules, /next's script hash and security.txt in place"
exit "$fail"

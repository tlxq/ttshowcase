#!/usr/bin/env bash
# Proves /next is closed on the built site (out/), served by tools/serve.py with a made-up key (the same rules as
# middleware.ts on Vercel): no key, a wrong key or next.html/next.txt = 404 with the site's 404 page; the right key =
# a cookie, then 200 with noindex; no other page links to /next. Part of `mise run check`, so GitHub runs it too.
set -euo pipefail
cd "$(dirname "$0")/.."
[ -f out/next.html ] || { echo "next-check: no out/next.html. Run: mise run build" >&2; exit 1; }

port=$(python3 -I -c 'import socket; s = socket.socket(); s.bind(("127.0.0.1", 0)); print(s.getsockname()[1])')
key="check-$RANDOM$RANDOM"
PREVIEW_KEY="$key" SERVE_DIR=out python3 -I tools/serve.py 127.0.0.1 "$port" >/dev/null 2>&1 &
server=$!
jar=$(mktemp)
trap 'kill "$server" 2>/dev/null; rm -f "$jar"' EXIT
base="http://127.0.0.1:$port"
for _ in $(seq 1 50); do curl -fs "$base/" >/dev/null 2>&1 && break; sleep 0.1; done

fail=0
no() { echo "next-check: $*" >&2; fail=1; }
code() { curl -s -o /dev/null -w '%{http_code}' "$@"; }

for p in /next /next/ /next.html /next.txt "/next?key=wrong" "/next?key=" "/next?key=%C3%A9" \
  /%6Eext /%6Eext.html /%6Eext.txt /./next.html /a/../next.html /%2e/next.html "/next%2Ehtml"; do
  [ "$(code "$base$p")" = 404 ] || no "$p should be 404 without the key"
done
curl -s "$base/next" | grep -q 'Nothing painted here' || no "/next without the key should show the site's 404 page"
[ "$(code -c "$jar" "$base/next?key=$key")" = 303 ] || no "the right key should answer 303 with a cookie"
grep -q next_key "$jar" || no "the right key should set the next_key cookie"
page=$(curl -s -b "$jar" -w '\n%{http_code}' "$base/next")
[ "$(tail -1 <<<"$page")" = 200 ] || no "/next with the cookie should be 200"
grep -q 'noindex' <<<"$page" || no "/next should say noindex"
[ "$(code "$base/")" = 200 ] || no "the home page should still be 200"
if grep -rlE 'href="/next([/?#".])' out --include='*.html' | grep -v '^out/next' >/dev/null; then
  no "a page links to /next: $(grep -rlE 'href="/next([/?#".])' out --include='*.html' | grep -v '^out/next' | tr '\n' ' ')"
fi
[ "$fail" = 0 ] && echo "next-check: /next closed without the key, open with it, noindex, linked from nowhere"
exit "$fail"

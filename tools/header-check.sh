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
  # only names Chromium knows: an unknown one is a console warning on the live site ("Unrecognized feature: 'bluetooth'", 11-26).
  # Checked against the W3C feature registry and MDN's Permissions-Policy table; bluetooth is not here because the live site's console
  # warned it is unrecognized. A feature goes in this list only after it is checked there again.
  known="camera microphone geolocation payment usb serial hid display-capture browsing-topics"
  for name in $(grep -i '^permissions-policy:' <<<"$h" | sed 's/^[^:]*: *//' | tr ',' '\n' | sed 's/=.*//; s/ //g'); do
    case " $known " in *" $name "*) ;; *) no "$p: Permissions-Policy names '$name', which the browser may not know. Remove it or add it to the known list in tools/header-check.sh after checking it" ;; esac
  done
  grep -qi '^x-content-type-options: nosniff' <<<"$h" || no "$p has no nosniff"
  grep -qi '^x-frame-options: DENY' <<<"$h" || no "$p can be framed (no X-Frame-Options: DENY)"
done

# the CSP manifest is code the middleware imports, never a public file: one would list /next, /next/front, /admin and /wall (audit N-42)
find out -name 'csp-manifest*' | grep -q . && no "a CSP manifest file is in out/ (it would be public): $(find out -name 'csp-manifest*' | head -3 | tr '\n' ' ')"
[ "$(curl -s -o /dev/null -w '%{http_code}' "$base/csp-manifest.json")" = 404 ] || no "/csp-manifest.json is served (the manifest must be built into the middleware, not a public file)"
grep -rlE '"/(next/front|admin|wall)":' out --include='*.json' | grep -q . && no "a public .json file lists the private paths (/next/front, /admin, /wall): $(grep -rlE '"/(next/front|admin|wall)":' out --include='*.json' | head -3 | tr '\n' ' ')"

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
if "url(data:font" in page and not re.search(r"font-src [^;]*data:", json.load(open(".cache/csp-manifest.json", encoding="utf-8"))["/next"]):
    sys.exit("header-check: /next embeds its fonts as data:, but the site's font-src doesn't allow data: (tools/csp/manifest.mjs)")
if "'unsafe-inline'" in rule.group(1) or "'unsafe-eval'" in rule.group(1):
    sys.exit("header-check: /next's script rule allows any inline script")
PY

# caching (N-31): only the content-hashed files under /_next/static/ are cached for good; every page stays "ask again"
# (the walk's /next/assets, /projects and /images keep fixed names, so a repainted picture must reach returning visitors: no long cache for them)
hashed=$(cd out && find _next/static -type f -name '*.js' | sort | head -1)
[ -n "$hashed" ] || no "no hashed script in out/_next/static to check the cache rule on"
cc=$(curl -sI "$base/$hashed" | tr -d '\r' | grep -i '^cache-control:' || true)
grep -qiE 'max-age=31536000' <<<"$cc" && grep -qi 'immutable' <<<"$cc" || no "/$hashed (content-hashed) is not cached for good: '${cc:-no Cache-Control}'"
for p in / /privacy /index.html /privacy.html; do
  cc=$(curl -sI "$base$p" | tr -d '\r' | grep -i '^cache-control:' || true)
  grep -qiE 'immutable|max-age=([1-9])' <<<"$cc" && no "$p (a page) must not be cached for good: '$cc'"
  grep -qiE 'no-cache|no-store|max-age=0' <<<"$cc" || no "$p (a page) has no revalidating Cache-Control: '${cc:-none}'"
done

# the page head: titles, noindex, the sitemap, the structured data, the bar colour and the old icon address (src/head/head.ts)
desc=$(node -e 'import("./src/head/head.ts").then((m) => process.stdout.write(m.DESCRIPTION))')
[ -n "$desc" ] || no "could not read DESCRIPTION from src/head/head.ts"
alt=$(node -e 'import("./src/head/head.ts").then((m) => process.stdout.write(m.SHARE_ALT))')
[ -n "$alt" ] || no "could not read SHARE_ALT from src/head/head.ts"
# favicon.ico is made from the approved mark pictures, which were made from the built icon.svg; a changed icon with old pictures fails here
want=$(cat tools/icons/favicon.source.sha256 2>/dev/null || true)
[ "$(sha256sum out/icon.svg | cut -d' ' -f1)" = "$want" ] ||
  no "public/favicon.ico is stale: the tab icon changed. Run: npm run build; node tools/icons/favicon.mjs --render (re-makes tools/icons/assets/mark-16.png and mark-32.png, the hash and public/favicon.ico); cp out/icon.svg tools/icons/mark.svg; have Tom approve the new marks; commit all of them. The 48 px piece (tools/icons/assets/piece-48.png) and the apple piece (app/apple-icon.png/assets/piece-180.png) are approved pictures: they stay until Tom approves new ones"
DESC="$desc" ALT="$alt" python3 -I - out <<'PY' || fail=1
import html as htmllib, os, pathlib, re, sys, json
out = pathlib.Path(sys.argv[1])
bad = []
front = (out / "index.html").read_text(encoding="utf-8")
for tag in ('name="description"', 'property="og:description"', 'name="twitter:description"'):
    m = re.search(r'<meta ' + tag + r' content="([^"]*)"', front)
    if not m or htmllib.unescape(m.group(1)) != os.environ["DESC"]:
        bad.append(f"index.html: {tag} is not the DESCRIPTION of src/head/head.ts")
def page(name):
    return (out / name).read_text(encoding="utf-8")
def title(html):
    m = re.search(r"<title>([^<]*)</title>", html)
    return m.group(1) if m else ""
def noindex(html):
    return any("noindex" in t for t in re.findall(r'<meta name="robots" content="([^"]*)"', html))
for name, private in [("index.html", False), ("privacy.html", False), ("admin.html", True), ("wall.html", True), ("404.html", True)]:
    html = page(name)
    t = title(html)
    if name == "index.html":
        if t != "Tom Larsson, product engineer": bad.append(f"{name}: title is '{t}'")
    elif not re.fullmatch(r"[^·<>]+ · Tom Larsson", t):
        bad.append(f"{name}: title '{t}' is not 'Page · Tom Larsson'")
    if noindex(html) != private:
        bad.append(f"{name}: " + ("private page without noindex" if private else "public page with noindex"))
    if '<meta name="theme-color" content="#' not in html: bad.append(f"{name}: no theme-color")
    blocks = re.findall(r'<script type="application/ld\+json">([^<]*)</script>', html)
    if len(blocks) != (1 if name == "index.html" else 0):
        bad.append(f"{name}: {len(blocks)} structured data blocks")
    for b in blocks:
        if json.loads(b).get("@type") != "Person": bad.append("the structured data is not a Person")
# the share picture and the icons, as the built front names them (src/head/head.ts, app/layout.tsx)
def meta(html, key, val):
    m = re.search(r'<meta ' + key + r'="' + re.escape(val) + r'" content="([^"]*)"', html)
    return htmllib.unescape(m.group(1)) if m else None
if meta(front, "property", "og:image") is None or not meta(front, "property", "og:image").endswith("/share.jpg"):
    bad.append("index.html: og:image is not /share.jpg")
for key, val in (("property", "og:image:width"), ("property", "og:image:height")):
    want = "1200" if val.endswith("width") else "630"
    if meta(front, key, val) != want: bad.append(f"index.html: {val} is not {want}")
for key, val in (("property", "og:image:alt"), ("name", "twitter:image:alt")):
    if meta(front, key, val) != os.environ["ALT"]: bad.append(f"index.html: {val} is not SHARE_ALT of src/head/head.ts")
for rel, href in (("icon", "/favicon.ico"), ("icon", "/icon.svg"), ("apple-touch-icon", "/apple-icon.png")):
    if not re.search(r'<link rel="' + rel + r'" href="' + re.escape(href) + r'[^"]*"', front) and not re.search(r'<link [^>]*href="' + re.escape(href) + r'[^"]*"[^>]*rel="' + rel + r'"', front):
        bad.append(f"index.html: no {rel} link to {href}")
share = (out / "share.jpg").read_bytes()
if share[:2] != b"\xff\xd8" or len(share) > 300_000: bad.append(f"share.jpg is not a JPEG under 300 KB ({len(share)} bytes)")
for f in [out / "icon.svg", *sorted((out / "icon-drip").glob("*.svg"))]:
    if "#ff4f1a" in f.read_text(encoding="utf-8").lower(): bad.append(f"{f.name} still has the old orange")
if len(list((out / "icon-drip").glob("*.svg"))) < 8: bad.append("the drip frames are missing")
if (out / "icon.svg").read_bytes() != pathlib.Path("tools/icons/mark.svg").read_bytes(): bad.append("icon.svg is not the approved tools/icons/mark.svg")
if (out / "apple-icon.png").read_bytes() != pathlib.Path("app/apple-icon.png/assets/piece-180.png").read_bytes(): bad.append("apple-icon.png is not the approved piece-180.png")
if (out / "share.jpg").read_bytes() != pathlib.Path("pitch/assets/share.jpg").read_bytes(): bad.append("share.jpg differs from the new front's pitch/assets/share.jpg")
locs = re.findall(r"<loc>([^<]*)</loc>", (out / "sitemap.xml").read_text(encoding="utf-8"))
if sorted(locs) != ["https://ttdevs.com/", "https://ttdevs.com/privacy"]:
    bad.append(f"sitemap.xml lists {locs}")
ico = (out / "favicon.ico").read_bytes()
if ico[:4] != b"\0\0\1\0" or ico[4] != 3: bad.append("favicon.ico is not an icon with 3 sizes")
if bad: sys.exit("header-check: " + "\n".join(bad))
PY
for p in /admin /next; do
  grep -qi 'noindex' <(curl -sI -b "$jar" "$base$p" | tr -d '\r' | grep -i '^x-robots-tag:') || no "$p sends no noindex header"
done
cc=$(curl -sI "$base/favicon.ico" | tr -d '\r' | grep -i '^cache-control:' || true)
grep -qiE 'max-age=([1-9][0-9]{4,})' <<<"$cc" || no "/favicon.ico has no long cache: '${cc:-none}'"

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

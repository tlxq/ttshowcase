"""Serves a folder (SERVE_DIR, default out/) like http.server, but browsers always check for a newer build.
/next is guarded like on Vercel (middleware.ts, same rules): `/next?key=<PREVIEW_KEY>` once sets a
cookie, without it /next is the site's 404 page. No PREVIEW_KEY: /next is closed.
The response headers in vercel.json (security rules, noindex) and each page's Content-Security-Policy (out/csp-manifest.json) are sent here too, so the checks run under them.
/api/tags, /api/admin and /api/github go to the local tag store (tools/tags/local.mjs) when TAGS_PORT is set (the pitch); /api/tags-local only from this PC.
SERVE_RELOAD_FILE (the local pitch only, set by serve.sh when SERVE_WATCH is): pages get tools/pitch/reload.js, which waits on /__reload
until tools/pitch/watch.mjs writes a new version into that file. Without it none of this exists, and nothing is ever added to a build.
Usage: serve.py <host> <port>"""

import functools
import hmac
import http.client
import http.cookies
import http.server
import json
import os
import re
import posixpath
import sys
import time
import urllib.parse

COOKIE = "next_key"
KEY = os.environ.get("PREVIEW_KEY", "")
DIR = os.environ.get("SERVE_DIR", "out")
TAGS_PORT = int(os.environ.get("TAGS_PORT") or 0)
RELOAD_FILE = os.environ.get("SERVE_RELOAD_FILE", "")
RELOAD_JS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "pitch", "reload.js")

# vercel.json's header blocks; a block that depends on the host ("has"/"missing") is Vercel's own and left out here
with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "vercel.json"), encoding="utf-8") as f:
    HEADER_BLOCKS = [(b["source"], b["headers"]) for b in json.load(f).get("headers", [])
                     if "has" not in b and "missing" not in b]
# Only plain paths and a "(.*)" end mean the same here as in Vercel's path-to-regexp; anything else stops the server
# instead of quietly matching something else.
for source, _ in HEADER_BLOCKS:
    if not re.fullmatch(r"/[A-Za-z0-9/_-]*(\(\.\*\))?", source):
        sys.exit(f"serve.py: vercel.json header source {source} isn't a plain path or path(.*): teach serve.py how Vercel reads it")
HEADER_BLOCKS = [(re.compile(re.escape(s.removesuffix("(.*)")) + (".*" if s.endswith("(.*)") else "")), h) for s, h in HEADER_BLOCKS]


def clean(path):
    """The path as the file server will see it: decoded and normalised until it stops changing (/%6Eext, /x/../next)."""
    while True:
        new = posixpath.normpath(urllib.parse.unquote(path))
        new = "/" + new.lstrip("/")
        if new == path:
            return path
        path = new


def is_next(path):
    path = clean(path)
    return path == "/next" or path.startswith("/next/") or path.startswith("/next.")


def same(a, b):
    """Constant-time compare that also takes non-ASCII input."""
    return hmac.compare_digest(a.encode("utf-8", "surrogateescape"), b.encode("utf-8", "surrogateescape"))


# the path BotID's browser part loads its checker from (botid/dist/client/core; tools/header-check.sh keeps vercel.json on it)
BOTID = re.compile(r"/[0-9a-f-]{36}/[0-9a-f-]{36}/a-4-a/c\.js")


def csp_for(path):
    """The page's Content-Security-Policy from the build's manifest (tools/csp/manifest.mjs), like middleware.ts sends it
    on Vercel: the page's own, or the 404 page's for a path without a page. None when the folder has no manifest."""
    try:
        with open(os.path.join(DIR, "csp-manifest.json"), encoding="utf-8") as f:
            manifest = json.load(f)
    except (OSError, ValueError):
        return None
    # a file's own address (/wall.html, /index.html) is the page's: the same inline scripts run there
    key = re.sub(r"(^|/)index$", "", re.sub(r"\.html$", "", path.rstrip("/"))) or "/"
    return manifest[key] if key in manifest and key != "default" else manifest.get("default")


class NoStale(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        path = clean(urllib.parse.urlsplit(self.path).path)
        sent = set()
        csp = csp_for(path)
        if csp:
            self.send_header("Content-Security-Policy", csp)
        for source, headers in HEADER_BLOCKS:
            if source.fullmatch(path):
                for h in headers:
                    self.send_header(h["key"], h["value"])
                    sent.add(h["key"].lower())
        if "cache-control" not in sent:
            self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def translate_path(self, path):
        # clean addresses like Vercel's cleanUrls: /next serves next.html, not the next/ folder
        local = super().translate_path(path)
        if not os.path.isfile(local) and os.path.isfile(local.rstrip("/") + ".html"):
            return local.rstrip("/") + ".html"
        return local

    def gate(self):
        """True when the request may go on; otherwise the answer is already sent."""
        url = urllib.parse.urlsplit(self.path)
        if not is_next(url.path):
            return True
        query = urllib.parse.parse_qs(url.query, keep_blank_values=True)
        if KEY and "key" in query:
            if same(query["key"][0], KEY):
                rest = urllib.parse.urlencode([(k, v) for k, vs in query.items() if k != "key" for v in vs])
                self.send_response(303)
                self.send_header("Location", url.path + ("?" + rest if rest else ""))
                self.send_header("Set-Cookie", f"{COOKIE}={urllib.parse.quote(KEY)}; Path=/next; Max-Age=31536000; HttpOnly; SameSite=Lax")
                self.end_headers()
                return False
        elif KEY:
            jar = http.cookies.SimpleCookie(self.headers.get("Cookie", ""))
            if COOKIE in jar and same(urllib.parse.unquote(jar[COOKIE].value), KEY):
                return True
        body = open(os.path.join(DIR, "404.html"), "rb").read()
        self.send_response(404)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)
        return False

    def tags(self):
        """True when the request was for the tag store and is answered (or refused) here."""
        path = urllib.parse.urlsplit(self.path).path
        if not TAGS_PORT or not (path in ("/api/tags", "/api/admin", "/api/github") or path.startswith("/api/tags-local/")):
            return False
        if path not in ("/api/tags", "/api/admin", "/api/github") and self.client_address[0] not in ("127.0.0.1", "::1"):
            self.send_error(404)  # the checks' doors are for this PC only
            return True
        # the loopback check above trusts the TCP peer: this server must never sit behind a local proxy (tailscale serve would make every peer look like loopback)
        try:
            size = int(self.headers.get("Content-Length") or 0)
        except ValueError:
            size = -1
        if size < 0 or size > 1_000_000:
            self.send_error(413 if size > 0 else 400)
            return True
        body = self.rfile.read(size) if size else None
        headers = {"Content-Type": self.headers.get("Content-Type", "application/json"),
                   "X-Forwarded-For": self.client_address[0], "Host": self.headers.get("Host", "")}
        for key in ("Cookie", "Origin", "X-Admin"):  # Tom's cookie, and the two things an admin call must show
            if self.headers.get(key):
                headers[key] = self.headers.get(key)
        try:
            link = http.client.HTTPConnection("127.0.0.1", TAGS_PORT, timeout=10)
            link.request(self.command, self.path, body, headers)
            answer = link.getresponse()
            data = answer.read()
        except OSError:
            self.send_error(502, "The local tag store isn't running")
            return True
        self.send_response(answer.status)
        for key in ("Content-Type", "Cache-Control", "Set-Cookie"):
            if answer.getheader(key):
                self.send_header(key, answer.getheader(key))
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)
        return True

    def version(self):
        try:
            with open(RELOAD_FILE, encoding="utf-8") as f:
                return f.read().strip()
        except OSError:
            return ""

    def reload(self):
        """True when the request was for the live reload's script or its wait, and is answered here."""
        url = urllib.parse.urlsplit(self.path)
        if url.path == "/__reload.js":
            with open(RELOAD_JS, "rb") as f:
                body = f.read()
            self.send_response(200)
            self.send_header("Content-Type", "text/javascript; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return True
        if url.path != "/__reload":
            return False
        seen = urllib.parse.parse_qs(url.query).get("v", [""])[0]
        end = time.time() + 20
        try:
            while time.time() < end:
                now = self.version()
                if now != seen:
                    body = (now + "\n").encode()
                    self.send_response(200)
                    self.send_header("Content-Type", "text/plain; charset=utf-8")
                    self.send_header("Content-Length", str(len(body)))
                    self.end_headers()
                    self.wfile.write(body)
                    return True
                time.sleep(0.25)
            self.send_response(204)  # nothing new yet: the page asks again
            self.end_headers()
        except (BrokenPipeError, ConnectionResetError):
            pass  # the page was closed while it waited
        return True

    def reload_page(self):
        """True when this was an html page and it went out with the reload script added."""
        local = self.translate_path(self.path)
        if os.path.isdir(local):
            local = os.path.join(local, "index.html")
        if not (local.endswith(".html") and os.path.isfile(local)):
            return False
        with open(local, "rb") as f:
            body = f.read()
        tag = f'<script src="/__reload.js?v={urllib.parse.quote(self.version())}"></script>'.encode()
        end = body.rfind(b"</body>")
        body = body[:end] + tag + body[end:] if end >= 0 else body + tag
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)
        return True

    def do_POST(self):
        if not self.tags():
            self.send_error(405)

    def do_GET(self):
        if self.tags():
            return
        if RELOAD_FILE and self.reload():
            return
        if BOTID.fullmatch(urllib.parse.urlsplit(self.path).path):
            # Vercel BotID's checker lives only on Vercel (vercel.json's rewrites). Here a stand-in hands the page a
            # "checked" answer at once, so the forms send as they do live, and the local tag store ignores the header.
            body = b"(window.V_C=window.V_C||[]).push({b:1,local:true});"
            self.send_response(200)
            self.send_header("Content-Type", "text/javascript; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        if urllib.parse.urlsplit(self.path).path == "/favicon.ico" and not os.path.isfile(os.path.join(DIR, "favicon.ico")):
            self.send_response(204)  # the pitch has no icon; a browser asking for one is not an error in the checks' console
            self.end_headers()
            return
        if self.gate():
            if RELOAD_FILE and self.reload_page():
                return
            super().do_GET()

    def do_HEAD(self):
        if self.gate():
            super().do_HEAD()


host, port = sys.argv[1], int(sys.argv[2])
handler = functools.partial(NoStale, directory=DIR)
http.server.ThreadingHTTPServer((host, port), handler).serve_forever()

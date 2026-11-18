"""Serves a folder (SERVE_DIR, default out/) like http.server, but browsers always check for a newer build.
/next is guarded like on Vercel (middleware.ts, same rules): `/next?key=<PREVIEW_KEY>` once sets a
cookie, without it /next is the site's 404 page. No PREVIEW_KEY: /next is closed.
/api/tags goes to the local tag store (tools/tags/local.mjs) when TAGS_PORT is set (the pitch); /api/tags-local only from this PC.
Usage: serve.py <host> <port>"""

import functools
import hmac
import http.client
import http.cookies
import http.server
import os
import posixpath
import sys
import urllib.parse

COOKIE = "next_key"
KEY = os.environ.get("PREVIEW_KEY", "")
DIR = os.environ.get("SERVE_DIR", "out")
TAGS_PORT = int(os.environ.get("TAGS_PORT") or 0)


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


class NoStale(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
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
        if not TAGS_PORT or not (path == "/api/tags" or path.startswith("/api/tags-local/")):
            return False
        if path != "/api/tags" and self.client_address[0] not in ("127.0.0.1", "::1"):
            self.send_error(404)  # the checks' doors are for this PC only
            return True
        size = int(self.headers.get("Content-Length") or 0)
        body = self.rfile.read(size) if size else None
        headers = {"Content-Type": self.headers.get("Content-Type", "application/json"),
                   "X-Forwarded-For": self.client_address[0], "Host": self.headers.get("Host", "")}
        try:
            link = http.client.HTTPConnection("127.0.0.1", TAGS_PORT, timeout=10)
            link.request(self.command, self.path, body, headers)
            answer = link.getresponse()
            data = answer.read()
        except OSError:
            self.send_error(502, "The local tag store isn't running")
            return True
        self.send_response(answer.status)
        for key in ("Content-Type", "Cache-Control"):
            if answer.getheader(key):
                self.send_header(key, answer.getheader(key))
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)
        return True

    def do_POST(self):
        if not self.tags():
            self.send_error(405)

    def do_GET(self):
        if self.tags():
            return
        if self.gate():
            super().do_GET()

    def do_HEAD(self):
        if self.gate():
            super().do_HEAD()


host, port = sys.argv[1], int(sys.argv[2])
handler = functools.partial(NoStale, directory=DIR)
http.server.ThreadingHTTPServer((host, port), handler).serve_forever()

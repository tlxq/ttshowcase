"""Serves a folder (SERVE_DIR, default out/) like http.server, but browsers always check for a newer build.
/next is guarded like on Vercel (middleware.ts, same rules): `/next?key=<PREVIEW_KEY>` once sets a
cookie, without it /next is the site's 404 page. No PREVIEW_KEY: /next is closed.
Usage: serve.py <host> <port>"""

import functools
import hmac
import http.cookies
import http.server
import os
import sys
import urllib.parse

COOKIE = "next_key"
KEY = os.environ.get("PREVIEW_KEY", "")
DIR = os.environ.get("SERVE_DIR", "out")


def is_next(path):
    return path == "/next" or path.startswith("/next/") or path.startswith("/next.")


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
            if hmac.compare_digest(query["key"][0], KEY):
                rest = urllib.parse.urlencode([(k, v) for k, vs in query.items() if k != "key" for v in vs])
                self.send_response(303)
                self.send_header("Location", url.path + ("?" + rest if rest else ""))
                self.send_header("Set-Cookie", f"{COOKIE}={urllib.parse.quote(KEY)}; Path=/next; Max-Age=31536000; HttpOnly; SameSite=Lax")
                self.end_headers()
                return False
        elif KEY:
            jar = http.cookies.SimpleCookie(self.headers.get("Cookie", ""))
            if COOKIE in jar and hmac.compare_digest(urllib.parse.unquote(jar[COOKIE].value), KEY):
                return True
        body = open(os.path.join(DIR, "404.html"), "rb").read()
        self.send_response(404)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)
        return False

    def do_GET(self):
        if self.gate():
            super().do_GET()

    def do_HEAD(self):
        if self.gate():
            super().do_HEAD()


host, port = sys.argv[1], int(sys.argv[2])
handler = functools.partial(NoStale, directory=DIR)
http.server.ThreadingHTTPServer((host, port), handler).serve_forever()

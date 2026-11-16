"""Serves a folder (SERVE_DIR, default out/) like http.server, but browsers always check for a newer build.
Usage: serve.py <host> <port>"""

import functools
import os
import http.server
import sys


class NoStale(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()


host, port = sys.argv[1], int(sys.argv[2])
handler = functools.partial(NoStale, directory=os.environ.get("SERVE_DIR", "out"))
http.server.ThreadingHTTPServer((host, port), handler).serve_forever()

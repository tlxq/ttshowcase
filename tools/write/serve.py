"""The writing page: Tom writes the site's words with the S Pen, and each is saved into the site.

Usage: serve.py <host> <port>. Serves tools/write/index.html; POST /save keeps one word as
src/content/hand/<word>.json; GET /saved lists the words written so far, GET /word/<word> gives one back.
"""

import http.server
import json
import re
import urllib.parse
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
PAGE = pathlib.Path(__file__).with_name("index.html")
HAND = ROOT / "src" / "content" / "hand"
# The pens, shared with the site (src/look/handPaint.ts), so both draw the same mark.
PENS = ROOT / "src" / "content" / "pens.json"
# The words the site writes by hand: the tag first, then any word or short line Tom adds (11-13).
WORDS = [
    "tlxq",
    "hi, I'm Tom",
    "my daily tools",
    "still running →",
    "circle",
    # The Live part, Questions and the end (Tom 11-13).
    "try it →",
    "my own server",
    "work in progress",
    "ask me",
    "signature",
    # The page that isn't there, and the browser tab's small mark (Tom 11-14).
    "404",
    "icon",
]
# What a new word may hold: letters, digits, spaces and a little punctuation, up to 40.
NEW_WORD = re.compile(r"^[\w ,.'!?&+:→-]{1,40}$")
# A word's file is at most this big (a long word at full detail is well under it).
LARGEST = 2_000_000


def file_for(word: str) -> pathlib.Path:
    slug = re.sub(r"[^\w]+", "-", word.lower(), flags=re.UNICODE).strip("-") or "word"
    return HAND / f"{slug}.json"


def all_words() -> list[str]:
    """The tag, then every other word written so far, oldest first."""
    found = []
    for file in sorted(HAND.glob("*.json"), key=lambda f: f.stat().st_mtime):
        try:
            word = json.loads(file.read_text()).get("word")
        except ValueError:
            continue
        if isinstance(word, str) and word not in WORDS and word not in found:
            found.append(word)
    return WORDS + found


class Writing(http.server.BaseHTTPRequestHandler):
    def send(self, code: int, body: bytes, kind: str) -> None:
        self.send_response(code)
        self.send_header("Content-Type", kind)
        self.send_header("Cache-Control", "no-cache")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def answer(self, code: int, data: object) -> None:
        self.send(code, json.dumps(data).encode(), "application/json")

    def do_GET(self) -> None:
        if self.path.split("?")[0] in ("/", "/index.html"):
            self.send(200, PAGE.read_bytes(), "text/html; charset=utf-8")
        elif self.path == "/pens":
            self.send(200, PENS.read_bytes(), "application/json")
        elif self.path == "/saved":
            words = all_words()
            self.answer(200, {"words": words, "saved": [w for w in words if file_for(w).exists()]})
        elif self.path.startswith("/word/") and NEW_WORD.match(urllib.parse.unquote(self.path[6:])):
            file = file_for(urllib.parse.unquote(self.path[6:]))
            if file.exists():
                self.send(200, file.read_bytes(), "application/json")
            else:
                self.answer(404, {"error": "Not written yet"})
        else:
            self.answer(404, {"error": "Not here"})

    def do_POST(self) -> None:
        if self.path != "/save":
            self.answer(404, {"error": "Not here"})
            return
        # Only the writing page's own JSON: another page can't send it without asking first.
        if self.headers.get("Content-Type", "").split(";")[0] != "application/json":
            self.answer(415, {"error": "Send the writing as JSON"})
            return
        try:
            size = int(self.headers.get("Content-Length") or 0)
        except ValueError:
            size = 0
        if not 0 < size <= LARGEST:
            self.answer(413, {"error": "That writing is too big to save"})
            return
        try:
            data = json.loads(self.rfile.read(size))
        except ValueError:
            self.answer(400, {"error": "Couldn't read that writing"})
            return
        if not isinstance(data, dict):
            self.answer(400, {"error": "Couldn't read that writing"})
            return
        word = data.get("word")
        strokes = data.get("strokes")
        if not isinstance(word, str) or not NEW_WORD.match(word):
            self.answer(400, {"error": "Use up to 40 letters, digits and spaces for the word"})
            return
        if not isinstance(strokes, list) or not strokes:
            self.answer(400, {"error": "Write the word first"})
            return
        # Each stroke: x, y, ms, pressure per point, all numbers; the site is built from these.
        if not all(
            isinstance(s, list)
            and len(s) >= 4
            and len(s) % 4 == 0
            and all(isinstance(v, (int, float)) and not isinstance(v, bool) for v in s)
            for s in strokes
        ):
            self.answer(400, {"error": "Couldn't read the strokes. Clear and write it again"})
            return
        pens = json.loads(PENS.read_text())
        if data.get("pen") not in pens["pens"]:
            self.answer(400, {"error": "Pick a pen first"})
            return
        # How much it spills and drips, if not the normal: a level from pens.json's "levels".
        paint = data.get("paint", {})
        if not isinstance(paint, dict) or not all(
            kind in pens["levels"] and level in pens["levels"][kind]
            for kind, level in paint.items()
        ):
            self.answer(400, {"error": "Pick the spill and drips again"})
            return
        HAND.mkdir(parents=True, exist_ok=True)
        file_for(word).write_text(json.dumps(data, separators=(",", ":")) + "\n")
        self.answer(200, {"saved": word})

    def log_message(self, format: str, *args: object) -> None:
        if self.command == "POST":
            sys.stderr.write(f"Saved {self.path} {args[1] if len(args) > 1 else ''}\n")


host, port = sys.argv[1], int(sys.argv[2])
print(f"Writing page at http://{host}:{port} (Ctrl+C to stop)", flush=True)
http.server.ThreadingHTTPServer((host, port), Writing).serve_forever()

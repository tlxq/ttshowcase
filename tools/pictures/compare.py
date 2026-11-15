"""Compares the pictures of a run with the baseline and writes a before/after page.
Usage: compare.py <baseline dir> <run dir> <page.html> <branch> [note]. Prints which pictures changed."""

import base64
import html
import io
import sys
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw

# A picture counts as changed when more than SHARE of its pixels differ by more than STEP (of 255)
# in any one colour, so a new hue at the same brightness counts too.
STEP = 6
SHARE = 0.0001


def share(a, b):
    """How much of the picture changed, and the box round the change (None when nothing did)."""
    if a.size != b.size:
        return 1.0, None
    r, g, bl = ImageChops.difference(a.convert("RGB"), b.convert("RGB")).split()
    most = ImageChops.lighter(ImageChops.lighter(r, g), bl)
    over = most.point(lambda v: 255 if v > STEP else 0)
    return sum(over.histogram()[STEP + 1 :]) / (a.size[0] * a.size[1]), over.getbbox()


def thumb(img, box=None):
    img = img.convert("RGB")
    if box:
        # The change, outlined, so a small one can be found on the small picture.
        ImageDraw.Draw(img).rectangle(box, outline=(217, 164, 0), width=max(4, img.size[0] // 200))
    img.thumbnail((640, 1400))
    buf = io.BytesIO()
    img.save(buf, "JPEG", quality=70)
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()


base, run, page, branch = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3]), sys.argv[4]
note = sys.argv[5] if len(sys.argv) > 5 else ""
names = sorted({p.name for p in base.glob("*.png")} | {p.name for p in run.glob("*.png")})
rows = []
for name in names:
    b, r = base / name, run / name
    if b.exists() and r.exists():
        ia, ib = Image.open(b), Image.open(r)
        s, box = share(ia, ib)
        changed = s > SHARE
        status = f"changed, {s * 100:.2f} % of the picture" if changed else "same"
        box = box if changed else None
        left, right = f'<img src="{thumb(ia, box)}" alt="">', f'<img src="{thumb(ib, box)}" alt="">'
    elif r.exists():
        changed, status = True, "new"
        left, right = "<p>Not on master</p>", f'<img src="{thumb(Image.open(r))}" alt="">'
    else:
        changed, status = True, "gone"
        left, right = f'<img src="{thumb(Image.open(b))}" alt="">', "<p>Not in this run</p>"
    rows.append((changed, name[:-4], status, left, right))
rows.sort(key=lambda x: not x[0])
count = sum(1 for x in rows if x[0])
cards = "".join(
    f'<section class="{"changed" if c else "same"}"><h2>{html.escape(n)} <span>{html.escape(s)}</span></h2>'
    f'<div class="pair"><figure>{l}<figcaption>master</figcaption></figure>'
    f"<figure>{r}<figcaption>{html.escape(branch)}</figcaption></figure></div></section>"
    for c, n, s, l, r in rows
)
page.write_text(
    f"""<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Pictures, {html.escape(branch)}</title>
<style>
:root {{ color-scheme: dark light; --warn: #d9a400; --line: #8884; }}
body {{ margin: 0; font: 15px/1.5 system-ui, sans-serif; }}
main {{ max-width: 1100px; margin: 0 auto; padding: 24px 16px 64px; display: grid; gap: 20px; }}
h1 {{ margin: 0; font-size: 24px; }} h2 {{ margin: 0; font-size: 17px; }} h2 span {{ font-size: 13px; opacity: .7; }}
section {{ border: 1px solid var(--line); border-radius: 12px; padding: 16px; display: grid; gap: 12px; }}
section.changed {{ border-color: var(--warn); }} section.same {{ opacity: .6; }}
.changed h2 span {{ color: var(--warn); opacity: 1; }}
.pair {{ display: grid; grid-template-columns: 1fr 1fr; gap: 12px; align-items: start; }}
figure {{ margin: 0; }} img {{ width: 100%; height: auto; border-radius: 6px; }} figcaption {{ font-size: 13px; opacity: .7; }}
</style><main><h1>{count} of {len(rows)} pictures changed</h1><p>{html.escape(note)}</p>{cards}</main></html>""",
    encoding="utf-8",
)
print(f"{count} of {len(rows)} pictures changed")
for c, n, s, _, _ in rows:
    if c:
        print(f"  {n}: {s}")

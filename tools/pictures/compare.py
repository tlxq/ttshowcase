"""Compares the pictures of a run with the baseline and writes a before/after page.
Usage: compare.py <baseline dir> <run dir> <page.html> <branch>. Prints which pictures changed."""

import base64
import html
import io
import sys
from pathlib import Path

from PIL import Image, ImageChops

# A picture counts as changed when more than SHARE of its pixels differ by more than STEP (of 255).
STEP = 12
SHARE = 0.0005


def share(a, b):
    if a.size != b.size:
        return 1.0
    diff = ImageChops.difference(a.convert("RGB"), b.convert("RGB")).convert("L")
    return sum(diff.histogram()[STEP + 1 :]) / (a.size[0] * a.size[1])


def thumb(img):
    img = img.convert("RGB")
    img.thumbnail((640, 1400))
    buf = io.BytesIO()
    img.save(buf, "JPEG", quality=70)
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()


base, run, page, branch = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3]), sys.argv[4]
names = sorted({p.name for p in base.glob("*.png")} | {p.name for p in run.glob("*.png")})
rows = []
for name in names:
    b, r = base / name, run / name
    if b.exists() and r.exists():
        ia, ib = Image.open(b), Image.open(r)
        s = share(ia, ib)
        changed = s > SHARE
        status = f"changed, {s * 100:.2f} % of the picture" if changed else "same"
        left, right = f'<img src="{thumb(ia)}" alt="">', f'<img src="{thumb(ib)}" alt="">'
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
</style><main><h1>{count} of {len(rows)} pictures changed</h1>{cards}</main></html>""",
    encoding="utf-8",
)
print(f"{count} of {len(rows)} pictures changed")
for c, n, s, _, _ in rows:
    if c:
        print(f"  {n}: {s}")

"""Makes the whole-walk sheet's page (tools/pitch/sheet.sh): one row per moment, for each screen and light the base build's
picture beside this branch's, a changed pair marked. Changed = the mean difference is over LIMIT after a light blur, so the
camera's handheld drift and the random paint runs don't count. Usage: sheet_page.py <sheet dir> <base name> <branch name>"""

import html
import pathlib
import subprocess
import sys

LIMIT = 0.04  # mean difference after a blur: drift and the random paint runs stay under ~0.035 (the pole's close-up); #77's new light aim was 0.05-0.06

root = pathlib.Path(sys.argv[1])
base, branch = sys.argv[2], sys.argv[3]
views = [(f"{w}-h{h}", f"{w}, {'night' if h == '23' else 'day'}") for w in ("laptop", "phone") for h in ("23", "12")]
moments = sorted(p.stem for p in (root / "branch" / views[0][0]).glob("*.png"))


def diff(a, b):
    if not (a.exists() and b.exists()):
        return 1.0
    r = subprocess.run(["magick", str(a), str(b), "-blur", "0x3", "-compare", "-metric", "MAE", "-format", "%[distortion]", "info:"],
                       capture_output=True, text=True)
    try:
        return float(r.stdout.strip())
    except (IndexError, ValueError):
        return 1.0


rows, changed = [], []
for m in moments:
    cells = []
    for v, label in views:
        a, b = root / "base" / v / f"{m}.png", root / "branch" / v / f"{m}.png"
        d = diff(a, b)
        hit = d > LIMIT
        if hit:
            changed.append(f"{m} ({label})")
        cells.append(f'<td class="{"hit" if hit else ""}"><div class="pair">'
                     f'<a href="base/{v}/{m}.png"><img src="base/{v}/{m}.png" loading="lazy" alt=""></a>'
                     f'<a href="branch/{v}/{m}.png"><img src="branch/{v}/{m}.png" loading="lazy" alt=""></a></div>'
                     f'<small>{"changed" if hit else "same"} · {d:.3f}</small></td>')
    rows.append(f"<tr><th>{html.escape(m[3:])}</th>{''.join(cells)}</tr>")

head = "".join(f"<th>{label}<br><small>{html.escape(base)} | {html.escape(branch)}</small></th>" for _, label in views)
summary = ("Changed: " + ", ".join(changed)) if changed else "Nothing changed beyond the camera's drift."
page = f"""<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Whole-walk sheet</title>
<style>body{{background:#111;color:#ddd;font:14px system-ui;margin:16px}}table{{border-collapse:collapse}}
td,th{{padding:6px;vertical-align:top;border:1px solid #333}}.pair{{display:flex;gap:4px}}img{{width:220px;display:block}}
td.hit{{outline:3px solid #ff5a1f;outline-offset:-3px}}small{{color:#999}}.wrap{{overflow-x:auto}}</style>
<h1>Whole-walk sheet</h1><p>Left of each pair: {html.escape(base)}. Right: {html.escape(branch)}. Orange = changed.</p>
<p>{html.escape(summary)}</p><div class="wrap"><table><tr><th>moment</th>{head}</tr>{''.join(rows)}</table></div>"""
(root / "index.html").write_text(page, encoding="utf-8")
print(summary)

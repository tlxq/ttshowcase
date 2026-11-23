"""Makes the whole-walk sheet's page (tools/pitch/sheet.sh): one row per moment, for each screen and light the base build's
picture beside this branch's, a changed pair marked. Changed = the mean difference is over LIMIT after a blur, so the
camera's handheld drift and the random paint runs don't count. A run that failed (its <view>.fail) is named at the top.
Usage: sheet_page.py <sheet dir> <base name> <branch name>"""

import html
import pathlib
import subprocess
import sys

LIMIT = 0.04  # mean difference after a blur: drift and the random paint runs stay under ~0.035 (the pole's close-up); #77's new light aim was 0.05-0.06

root = pathlib.Path(sys.argv[1])
base, branch = sys.argv[2], sys.argv[3]
views = [(f"{w}-h{h}", f"{w}, {'night' if h == '23' else 'day'}") for w in ("laptop", "phone") for h in ("23", "12")]
moments = sorted({p.stem for p in root.glob("*/*/*.png")})
fails = [f"{f.parent.name} {f.stem}: {f.read_text().strip()}" for f in sorted(root.glob("*/*.fail"))]


def diff(a, b):
    r = subprocess.run(["magick", str(a), str(b), "-blur", "0x3", "-compare", "-metric", "MAE", "-format", "%[distortion]", "info:"],
                       capture_output=True, text=True)
    try:
        return float(r.stdout.strip())
    except ValueError:
        return None


def img(who, v, m, label):
    p = root / who / v / f"{m}.png"
    if not p.exists():
        return '<span class="gap">missing</span>'
    alt = html.escape(f"{base if who == 'base' else branch}, {label}, {m[3:]}")
    return f'<a href="{who}/{v}/{m}.png"><img src="{who}/{v}/{m}.png" loading="lazy" alt="{alt}"></a>'


rows, changed = [], []
for m in moments:
    cells = []
    for v, label in views:
        a, b = root / "base" / v / f"{m}.png", root / "branch" / v / f"{m}.png"
        d = diff(a, b) if a.exists() and b.exists() else None
        word = "missing" if d is None else "changed" if d > LIMIT else "same"
        if word == "changed":
            changed.append(f"{m[3:]} ({label})")
        title = "" if d is None else f' title="difference {d:.3f}, marked over {LIMIT}"'
        cells.append(f'<td class="{word}"><div class="pair">{img("base", v, m, label)}{img("branch", v, m, label)}</div>'
                     f"<small{title}>{word}</small></td>")
    rows.append(f"<tr><th>{html.escape(m[3:])}</th>{''.join(cells)}</tr>")

head = "".join(f"<th>{label}<br><small>{html.escape(base)} | {html.escape(branch)}</small></th>" for _, label in views)
summary = ("Changed: " + ", ".join(changed)) if changed else "Nothing changed beyond the camera's drift."
failed = "".join(f"<li>{html.escape(f)}</li>" for f in fails)
page = f"""<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Whole-walk sheet</title>
<style>body{{background:#111;color:#ddd;font:14px system-ui;margin:16px}}table{{border-collapse:collapse}}
td,th{{padding:6px;vertical-align:top;border:1px solid #333}}.pair{{display:flex;gap:4px}}img{{width:220px;display:block}}
td.changed,td.missing{{outline:3px solid #ff5a1f;outline-offset:-3px}}small{{color:#999}}.wrap{{overflow-x:auto}}
.gap{{display:block;width:220px;color:#ff5a1f}}.fail{{color:#ff5a1f}}</style>
<h1>Whole-walk sheet</h1><p>Left of each pair: {html.escape(base)}. Right: {html.escape(branch)}. Orange = changed or missing.</p>
<p>{html.escape(summary)}</p>{f'<p class="fail">Runs that failed:</p><ul class="fail">{failed}</ul>' if fails else ''}
<div class="wrap"><table><tr><th>moment</th>{head}</tr>{''.join(rows)}</table></div>"""
(root / "index.html").write_text(page, encoding="utf-8")
print(summary + (f" · {len(fails)} runs failed" if fails else ""))

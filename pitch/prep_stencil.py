# epaRadar screenshot -> stencil layers: base + 6 masks packed in two RGB PNGs, palette as JSON
import json, sys
import numpy as np
from PIL import Image, ImageFilter
src, out = sys.argv[1], sys.argv[2]
im = Image.open(src).convert('RGB').resize((2048, 1280), Image.LANCZOS)
a = np.asarray(im).astype(np.float32) / 255
L = a @ np.array([.2126, .7152, .0722])
r, g, b = a[..., 0], a[..., 1], a[..., 2]
# four layers by brightness, darkest first, the white text last (Tom 11-16: 4 calm layers)
lab = np.digitize(L, [.13, .33, .62])
lab = np.asarray(Image.fromarray(lab.astype(np.uint8)).filter(ImageFilter.ModeFilter(3)))
pal = []
for k in range(4):
    m = lab == k; c = a[m].mean(0) if m.any() else np.zeros(3)
    pal.append([round(float(v), 4) for v in c]); print(k, round(float(m.mean()), 3), (c * 255).round())
masks = [(lab == k).astype(np.uint8) * 255 for k in range(1, 7)]  # 4..6 stay empty
Image.fromarray(np.stack(masks[:3], -1)).save(out + '/epa_m1.png', optimize=True)
Image.fromarray(np.stack(masks[3:], -1)).save(out + '/epa_m2.png', optimize=True)
json.dump(pal, open(out + '/epa_pal.json', 'w'))
prev = (np.array(pal)[lab] * 255).astype(np.uint8)
Image.fromarray(prev).resize((1024, 640), Image.LANCZOS).save(out + '/stencil_preview.png')

"""
Generates the alpha mask used by AuthWaveHeader.tsx.

The mask is the region ABOVE a smooth wave boundary (alpha = 1 above, 0 below).
The React Native component recolors it with tintColor and stretches it to
the header size, so the boundary is defined in fractions of width/height.

    f(u) = base(u) - A * exp(-((u - PEAK) / s(u))^2)

  u      : 0..1 across the width
  base   : linear tilt, LEFT_Y -> RIGHT_Y (fraction of height)
  bump   : asymmetric gaussian crest, wide/gentle on the left, tight/steep on the right
"""
import base64, io, math
from PIL import Image, ImageDraw

W, H = 900, 368          # output size
SS = 4                    # supersampling for smooth anti-aliasing

LEFT_Y, RIGHT_Y = 0.58, 0.80
PEAK, CREST_Y = 0.60, 0.22
S_LEFT, S_RIGHT = 0.34, 0.17

def base(u): return LEFT_Y + (RIGHT_Y - LEFT_Y) * u
A = base(PEAK) - CREST_Y

def f(u):
    s = S_LEFT if u < PEAK else S_RIGHT
    return base(u) - A * math.exp(-(((u - PEAK) / s) ** 2))

def build():
    w, h = W * SS, H * SS
    img = Image.new("L", (w, h), 0)
    d = ImageDraw.Draw(img)
    pts = [(0, 0), (w, 0)]
    steps = 1200
    for i in range(steps, -1, -1):
        u = i / steps
        pts.append((u * w, f(u) * h))
    d.polygon(pts, fill=255)
    alpha = img.resize((W, H), Image.LANCZOS)
    out = Image.new("LA", (W, H), (255, 0))
    out.putalpha(alpha)
    # white colour + alpha; the component recolours it with tintColor
    return out

if __name__ == "__main__":
    im = build()
    buf = io.BytesIO()
    im.save(buf, "PNG", optimize=True)
    data = buf.getvalue()
    open("wave_mask.png", "wb").write(data)
    b64 = base64.b64encode(data).decode()
    open("wave_mask.b64", "w").write(b64)
    print("png bytes:", len(data), "b64 chars:", len(b64))
    for u in (0, .07, .185, .3, .42, .6, .8, .9, 1):
        print(f"u={u:.3f} boundary y={f(u):.3f}")
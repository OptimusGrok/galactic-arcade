# Galactic Arcade icons: nested neon hexagons on black.
from PIL import Image, ImageDraw, ImageFilter
import math, os
def make(size, scale, name):
    im = Image.new('RGB', (size, size), (7, 4, 12)); glow = Image.new('RGB', (size, size), (0, 0, 0)); d = ImageDraw.Draw(glow)
    c = size / 2
    for r, col in [(0.42, (255, 43, 214)), (0.32, (34, 216, 255)), (0.22, (255, 165, 58))]:
        pts = [(c + r * scale * size * math.cos(math.pi / 3 * k + math.pi / 6), c + r * scale * size * math.sin(math.pi / 3 * k + math.pi / 6)) for k in range(7)]
        d.line(pts, fill=col, width=max(3, size // 28))
    blur = glow.filter(ImageFilter.GaussianBlur(size / 30))
    im = Image.blend(im, blur, 0.8); im.paste(glow, mask=glow.convert('L').point(lambda v: 255 if v > 40 else 0))
    im.save(name)
o = os.path.dirname(os.path.abspath(__file__))
make(192, 1, o + '/icon-192.png'); make(512, 1, o + '/icon-512.png'); make(512, 0.75, o + '/icon-maskable-512.png'); make(180, 1, o + '/apple-touch-icon.png')

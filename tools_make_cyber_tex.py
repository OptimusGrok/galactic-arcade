# Makes tex/cc_side.jpg (500x1000) and tex/cc_marquee.jpg (640x200) from Dave's approved Cybercity cabinet mockup.
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance
import random, sys
SRC = sys.argv[1] if len(sys.argv) > 1 else 'tex/cybercity_cabinet_mockup.jpg'
M = Image.open(SRC).convert('RGB'); k = M.width / 768
c = lambda b: M.crop(tuple(int(v * k) for v in b))
ImageEnhance.Contrast(c((282, 72, 556, 182)).resize((640, 200), Image.LANCZOS)).enhance(1.15).save('tex/cc_marquee.jpg', quality=90)
W, H = 500, 1000; random.seed(7)
s = Image.new('RGB', (W, H)); d = ImageDraw.Draw(s)
for y in range(H): t = y / H; d.line([(0, y), (W, y)], fill=(int(18 + 20 * t), int(8 + 4 * t), int(40 + 25 * (1 - t))))
city = c((142, 140, 236, 360)).resize((W, 560), Image.LANCZOS)
m = Image.new('L', city.size); md = ImageDraw.Draw(m)
for yy in range(city.size[1]): md.line([(0, yy), (W, yy)], fill=int(230 * min(1, (city.size[1] - yy) / 260, (yy + 40) / 120)))
s.paste(city, (0, 30), m)
for i in range(60):   # printed circuit traces (flat ink, no glow)
    x = random.randrange(W); y = random.randrange(380, H); col = random.choice([(170, 60, 190), (60, 130, 200), (120, 60, 190)]); pts = [(x, y)]
    for j in range(random.randint(2, 5)):
        if j % 2: y += random.choice([-1, 1]) * random.randint(30, 140)
        else: x += random.choice([-1, 1]) * random.randint(20, 120)
        pts.append((x, y))
    d.line(pts, fill=col, width=2); d.ellipse([x - 4, y - 4, x + 4, y + 4], outline=col, width=2)
nyx = c((136, 365, 270, 905)).resize((270, 560), Image.LANCZOS)
nm = Image.new('L', nyx.size); ImageDraw.Draw(nm).rectangle([14, 14, 256, 546], fill=255); nm = nm.filter(ImageFilter.GaussianBlur(12))
s.paste(nyx, (W - 290, H - 600), nm); s.save('tex/cc_side.jpg', quality=88)
print('ok')

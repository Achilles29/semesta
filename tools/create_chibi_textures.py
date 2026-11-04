from PIL import Image, ImageDraw
from pathlib import Path
import random

OUT = Path(__file__).resolve().parents[1] / 'public/models/characters/textures'
OUT.mkdir(parents=True, exist_ok=True)
SIZE = 512

def weave(name, base, spread, seed, diagonal=False, flecks=8500):
    random.seed(seed)
    image = Image.new('RGB', (SIZE, SIZE), base)
    pix = image.load()
    for y in range(SIZE):
        row = random.randint(-spread, spread)
        for x in range(SIZE):
            n = random.randint(-spread, spread) + row // 3
            pix[x, y] = tuple(max(0, min(255, channel+n)) for channel in base)
    draw = ImageDraw.Draw(image, 'RGBA')
    if diagonal:
        for offset in range(-SIZE, SIZE * 2, 5):
            color = (190, 210, 220, 22) if offset % 10 == 0 else (12, 28, 42, 20)
            draw.line((offset, 0, offset+SIZE, SIZE), fill=color, width=1)
    for _ in range(flecks):
        x, y = random.randrange(SIZE), random.randrange(SIZE)
        v = random.choice((12, -10, 7, -6))
        color = tuple(max(0, min(255, c+v)) for c in base) + (random.randint(12, 36),)
        draw.point((x,y), fill=color)
    image.save(OUT / name, optimize=True)

weave('denim-weave.png', (48, 89, 121), 9, 814, diagonal=True, flecks=7000)
weave('canvas-brown.png', (113, 65, 36), 8, 192, flecks=6000)
weave('cotton-cream.png', (222, 211, 184), 6, 361, flecks=3500)
weave('uniform-cream.png', (224, 215, 192), 5, 102, flecks=3200)
weave('skin-soft.png', (185, 111, 77), 4, 44, flecks=1700)
weave('hair-chestnut.png', (80, 39, 19), 9, 122, diagonal=True, flecks=5000)

"""One-off generator for the tile / player art shipped in assets/.

Run with `python tools/gen_assets.py` from the repo root whenever the art
needs to be regenerated. Not part of the runtime (the game just loads the
resulting PNGs), kept here so the pixel art is reproducible instead of being
a set of binary blobs nobody can touch again.
"""
import math
import random

from PIL import Image, ImageDraw

TILE = 32
random.seed(20260811)


def new_tile(base):
    img = Image.new("RGBA", (TILE, TILE), base)
    return img, ImageDraw.Draw(img)


def speckle(draw, color, count, size=(1, 2)):
    for _ in range(count):
        x = random.randint(0, TILE - 1)
        y = random.randint(0, TILE - 1)
        s = random.randint(*size)
        draw.ellipse([x, y, x + s, y + s], fill=color)


def shade_noise(img, base, variants, cell=4):
    """Fills a coarse grid of cells with slight tone variations for texture."""
    px = img.load()
    for cy in range(0, TILE, cell):
        for cx in range(0, TILE, cell):
            c = random.choice(variants)
            for y in range(cy, min(cy + cell, TILE)):
                for x in range(cx, min(cx + cell, TILE)):
                    px[x, y] = c


# ---------------------------------------------------------------------
# grass
# ---------------------------------------------------------------------
def make_grass():
    img, draw = new_tile((90, 190, 60, 255))
    shade_noise(img, (90, 190, 60, 255), [
        (86, 184, 57, 255), (94, 196, 63, 255), (90, 190, 60, 255), (98, 200, 66, 255),
    ], cell=8)
    for _ in range(26):
        x = random.randint(1, TILE - 2)
        y = random.randint(1, TILE - 2)
        h = random.randint(2, 4)
        draw.line([x, y, x, y - h], fill=(60, 150, 40, 255), width=1)
        draw.line([x, y, x - 1, y - h + 1], fill=(120, 210, 80, 255), width=1)
    return img


# ---------------------------------------------------------------------
# earth
# ---------------------------------------------------------------------
def make_earth():
    img, draw = new_tile((139, 105, 46, 255))
    shade_noise(img, (139, 105, 46, 255), [
        (130, 97, 40, 255), (146, 111, 50, 255), (139, 105, 46, 255), (124, 90, 36, 255),
    ], cell=6)
    speckle(draw, (90, 65, 25, 255), 18, (1, 3))
    for _ in range(6):
        x1 = random.randint(2, TILE - 3)
        y1 = random.randint(2, TILE - 3)
        draw.line([x1, y1, x1 + random.randint(-4, 4), y1 + random.randint(-4, 4)],
                   fill=(100, 72, 30, 255), width=1)
    return img


# ---------------------------------------------------------------------
# sand
# ---------------------------------------------------------------------
def make_sand():
    img, draw = new_tile((222, 186, 90, 255))
    shade_noise(img, (222, 186, 90, 255), [
        (215, 178, 82, 255), (228, 194, 98, 255), (222, 186, 90, 255),
    ], cell=8)
    for y in range(4, TILE, 8):
        offset = random.randint(-2, 2)
        draw.arc([offset - 4, y - 3, offset + TILE, y + 3], start=200, end=340,
                  fill=(196, 160, 70, 255), width=1)
    speckle(draw, (241, 214, 140, 255), 10, (1, 2))
    return img


# ---------------------------------------------------------------------
# water
# ---------------------------------------------------------------------
def make_water():
    img, draw = new_tile((58, 132, 209, 255))
    shade_noise(img, (58, 132, 209, 255), [
        (52, 124, 200, 255), (64, 140, 216, 255), (58, 132, 209, 255),
    ], cell=8)
    for y in range(3, TILE, 6):
        phase = random.uniform(0, math.pi)
        pts = []
        for x in range(0, TILE + 1, 4):
            yy = y + math.sin(phase + x * 0.6) * 1.6
            pts.append((x, yy))
        draw.line(pts, fill=(150, 210, 245, 200), width=1)
    return img


# ---------------------------------------------------------------------
# wall
# ---------------------------------------------------------------------
def make_wall():
    img, draw = new_tile((150, 150, 156, 255))
    brick_h = 8
    row = 0
    for y in range(0, TILE, brick_h):
        offset = 0 if row % 2 == 0 else 8
        for x in range(-8, TILE + 8, 16):
            x0 = x + offset
            draw.rectangle([x0 + 1, y + 1, x0 + 14, y + brick_h - 2],
                            fill=(158 + random.randint(-6, 6),) * 1 + (0,) * 0 if False else
                            (158 + random.randint(-6, 6), 158 + random.randint(-6, 6), 162 + random.randint(-6, 6), 255),
                            outline=(96, 96, 102, 255))
        row += 1
    draw.rectangle([0, 0, TILE - 1, TILE - 1], outline=(80, 80, 86, 255))
    return img


# ---------------------------------------------------------------------
# tree (solid, destructible)
# ---------------------------------------------------------------------
def make_tree():
    img = make_grass()
    draw = ImageDraw.Draw(img)
    cx = TILE // 2
    draw.rectangle([cx - 2, 22, cx + 2, 29], fill=(96, 62, 30, 255))
    for i, (top, wide) in enumerate([(6, 11), (11, 9), (16, 7)]):
        draw.polygon(
            [(cx, top), (cx - wide, top + 9), (cx + wide, top + 9)],
            fill=(34, 110, 46, 255), outline=(20, 80, 32, 255),
        )
        draw.polygon(
            [(cx, top), (cx, top + 9), (cx + wide, top + 9)],
            fill=(46, 132, 58, 255),
        )
    return img


# ---------------------------------------------------------------------
# bush (solid, destructible) - new tile
# ---------------------------------------------------------------------
def make_bush():
    img = make_grass()
    draw = ImageDraw.Draw(img)
    cx, cy = TILE // 2, 20
    for dx, dy, r in [(-7, 0, 8), (7, 0, 8), (0, -6, 9), (0, 4, 8)]:
        x, y = cx + dx, cy + dy
        draw.ellipse([x - r, y - r, x + r, y + r], fill=(52, 140, 60, 255), outline=(30, 96, 40, 255))
    draw.ellipse([cx - 6, cy - 4, cx + 2, cy + 3], fill=(76, 168, 82, 255))
    return img


# ---------------------------------------------------------------------
# rock (solid, NOT destructible) - new tile
# ---------------------------------------------------------------------
def make_rock():
    img = make_grass()
    draw = ImageDraw.Draw(img)
    draw.polygon(
        [(8, 26), (6, 18), (11, 10), (20, 8), (27, 14), (26, 24), (20, 28), (12, 28)],
        fill=(150, 148, 146, 255), outline=(96, 94, 92, 255),
    )
    draw.polygon([(11, 10), (20, 8), (18, 16), (11, 16)], fill=(178, 176, 174, 255))
    draw.line([(13, 20), (19, 22)], fill=(110, 108, 106, 255), width=1)
    return img


# ---------------------------------------------------------------------
# flower (decorative, non-solid) - new tile
# ---------------------------------------------------------------------
def make_flower():
    img = make_grass()
    draw = ImageDraw.Draw(img)
    colors = [(230, 90, 100, 255), (250, 210, 60, 255), (240, 240, 240, 255), (200, 110, 220, 255)]
    for _ in range(5):
        x = random.randint(5, TILE - 6)
        y = random.randint(5, TILE - 6)
        color = random.choice(colors)
        for ang in range(0, 360, 72):
            px = x + round(2.6 * math.cos(math.radians(ang)))
            py = y + round(2.6 * math.sin(math.radians(ang)))
            draw.ellipse([px - 1, py - 1, px + 1, py + 1], fill=color)
        draw.ellipse([x - 1, y - 1, x + 1, y + 1], fill=(255, 224, 90, 255))
    return img


# ---------------------------------------------------------------------
# path (decorative, non-solid) - new tile
# ---------------------------------------------------------------------
def make_path():
    img, draw = new_tile((196, 172, 132, 255))
    shade_noise(img, (196, 172, 132, 255), [
        (188, 164, 124, 255), (202, 178, 138, 255), (196, 172, 132, 255),
    ], cell=8)
    for _ in range(9):
        x = random.randint(2, TILE - 8)
        y = random.randint(2, TILE - 8)
        w = random.randint(5, 8)
        h = random.randint(4, 7)
        draw.ellipse([x, y, x + w, y + h], outline=(150, 128, 92, 255), width=1)
    return img


TILES = {
    "grass": make_grass,
    "earth": make_earth,
    "sand": make_sand,
    "water": make_water,
    "wall": make_wall,
    "tree": make_tree,
    "bush": make_bush,
    "rock": make_rock,
    "flower": make_flower,
    "path": make_path,
}


def gen_tiles():
    for name, fn in TILES.items():
        img = fn()
        img.save(f"assets/tiles/{name}.png")
        print("wrote", f"assets/tiles/{name}.png", img.size)


# ---------------------------------------------------------------------
# player walk-cycle: the source sprites are a plain circle with a face and
# have no feet, so a walk cycle needs new silhouette detail, not just a
# recolor. We add a pair of little shoes under the body -- centered for the
# idle/frame-1 pose, staggered (and the whole body bobbed up a pixel) for
# frame 2 -- so switching between the two frames reads as footsteps.
# ---------------------------------------------------------------------
SHOE = (60, 45, 40, 255)
SHOE_OUTLINE = (30, 22, 20, 255)


def _draw_shoe(draw, cx, cy, dy=0):
    x, y = cx, cy + dy
    draw.ellipse([x - 3, y - 2, x + 3, y + 2], fill=SHOE, outline=SHOE_OUTLINE)


def gen_player_frames():
    for direction in ["front", "back", "left", "right"]:
        src_path = f"assets/player/WalkingPlayer_{direction}.png"
        base = Image.open(src_path).convert("RGBA")
        bbox = base.getbbox()
        left, top, right, bottom = bbox
        foot_y = bottom - 2
        foot_l_x = left + round((right - left) * 0.32)
        foot_r_x = left + round((right - left) * 0.68)

        frame1 = base.copy()
        d1 = ImageDraw.Draw(frame1)
        _draw_shoe(d1, foot_l_x, foot_y)
        _draw_shoe(d1, foot_r_x, foot_y)
        frame1.save(src_path)
        print("wrote", src_path, frame1.size)

        frame2 = Image.new("RGBA", base.size, (0, 0, 0, 0))
        frame2.paste(base, (0, -1), base)
        d2 = ImageDraw.Draw(frame2)
        _draw_shoe(d2, foot_l_x, foot_y, dy=-3)
        _draw_shoe(d2, foot_r_x, foot_y, dy=2)
        out_path = f"assets/player/WalkingPlayer_{direction}_2.png"
        frame2.save(out_path)
        print("wrote", out_path, frame2.size)


if __name__ == "__main__":
    gen_tiles()
    gen_player_frames()

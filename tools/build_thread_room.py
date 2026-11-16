"""Builds the thread room's traced data from the coordinates below (plate pixels):

  assets/plates/thread-room.json       calibration, cutout layers, lights, spawns
  assets/plates/thread-room-mask.png   walkable mask (white floor, grey raised landing, black not walkable)

Run from the project folder:  python3 tools/build_thread_room.py [preview.png]
Needs Pillow. The game itself never runs this; it only reads the two files.
Running it again overwrites the calibration, so if the calibration was tuned in
the debug overlay, copy the new corners into CORNERS below first.
"""
import json, math, sys
from PIL import Image, ImageDraw

W, H = 1536, 1024
PLATE = 'assets/plates/thread-room.png'

# ---- grid calibration: the four corners of the grid on the painted floor ----
# The four handles sit on the corners of RECT, a rectangle of cells [x0, z0, x1, z1].
# CORNERS=None derives them from the axes below; paste tuned corners here to keep them.
RECT = [6, 6, 20, 20]
CORNERS = None
U = (36.8, 15.6)    # one cell toward the lower right
V = (-33.5, 21.8)   # one cell toward the lower left

# ---- walkable outline of the main floor, and the raised door landing ----
FLOOR = [(485, 345), (640, 322), (700, 335), (760, 340), (1000, 332), (1100, 348), (1160, 372),
         (1200, 392), (1345, 447), (1405, 470), (1410, 590), (1345, 640), (1340, 700), (1250, 735),
         (1160, 760), (1125, 820), (960, 905), (745, 905), (700, 872), (550, 852), (505, 770),
         (445, 655), (440, 560), (400, 505), (425, 455), (445, 400)]
LANDING = [(1203, 390), (1300, 340), (1415, 392), (1342, 445)]
LANDING_LIFT = 12

# ---- obstacles ----
# posts on the main floor: (base x, base y, top of the brass ball y)
POSTS = [(603, 337, 225), (446, 472, 362), (603, 452, 352), (545, 572, 480), (605, 705, 612),
         (885, 392, 313), (987, 357, 270), (1015, 496, 408), (1133, 452, 373), (886, 582, 478),
         (1100, 620, 518), (940, 707, 612)]
LANDING_POSTS = [(1183, 393, 333), (1360, 452, 393)]
# bases that block the floor but need no cutout (characters never stand behind them)
EXTRA_BASES = [(690, 342, 30, 14), (790, 338, 30, 14), (1025, 338, 30, 14), (1105, 340, 30, 14),
               (1168, 348, 30, 14), (562, 335, 34, 14)]
# crates: outline (6 points) and ground footprint (4 points)
CRATES = [
    ([(852, 372), (910, 348), (968, 372), (968, 440), (912, 470), (852, 445)],
     [(852, 445), (912, 470), (968, 440), (908, 418)]),
    ([(742, 520), (800, 488), (875, 515), (872, 600), (812, 648), (745, 608)],
     [(745, 608), (812, 648), (872, 600), (805, 565)]),
    ([(1232, 480), (1305, 448), (1393, 478), (1390, 565), (1320, 613), (1235, 578)],
     [(1235, 578), (1320, 613), (1390, 565), (1305, 535)]),
]
PILLAR = [(610, 0), (770, 0), (770, 150), (745, 175), (740, 430), (762, 445), (762, 482), (735, 505),
          (690, 514), (645, 505), (618, 482), (618, 445), (642, 430), (640, 175), (612, 150)]
PILLAR_BASE = (690, 478, 72, 34)
# large spools: (top ellipse cx, cy, rx, ry), (base ellipse cx, cy, rx, ry)
SPOOLS = [
    ('spool_gold', (1247, 650, 90, 41), (1241, 768, 92, 33)),
    ('spool_rose', (1398, 606, 47, 19), (1398, 695, 49, 21)),
    ('spool_blue', (1465, 410, 72, 28), (1465, 590, 77, 31)),
]
LANTERN_POST = [(495, 862), (523, 877), (551, 862), (551, 840), (545, 835), (545, 765), (558, 755),
                (558, 700), (545, 665), (523, 648), (502, 665), (490, 700), (490, 755), (503, 765),
                (503, 835), (495, 840)]
# front railing: tall posts (base x, base y, top y) and the bars between them
RAIL_POSTS = [(735, 925, 808), (955, 925, 795), (1118, 838, 700), (1340, 772, 652)]
RAIL_BARS = [
    [(735, 850), (955, 846), (955, 864), (735, 868)],          # top rail, left span
    [(735, 914), (955, 914), (955, 934), (735, 934)],          # bottom rail, left span
    [(784, 864), (797, 864), (797, 916), (784, 916)], [(829, 864), (842, 864), (842, 916), (829, 916)],
    [(879, 864), (892, 864), (892, 916), (879, 916)],
    [(972, 836), (1104, 796), (1104, 812), (972, 852)],        # top rail, right span
    [(1013, 836), (1026, 832), (1026, 882), (1013, 888)], [(1056, 824), (1069, 820), (1069, 862), (1056, 868)],
    [(972, 904), (1104, 850), (1104, 866), (972, 922)],        # bottom rail, right span
]
LANDING_RAIL = [(1362, 408), (1440, 366), (1440, 381), (1362, 423)]

# ---- live light effects ----
GLOWS = [(447, 133, 70), (853, 80, 70), (1265, 240, 75), (1440, 292, 75), (523, 705, 95)]
POOLS = [(600, 800, 230), (1300, 410, 200), (880, 560, 330)]

# ---- the thread puzzle (Stage 3) ----
# Active pegs: indexes into POSTS, plus the pillar. Every other post is a plain obstacle.
ACTIVE_POSTS = {'post_5': 4, 'post_10': 9, 'post_12': 11}
THREAD_LENGTH = 32       # cells of thread, the whole budget
SPAWN_CELLS = dict(player=[16, 20], partner=[20, 13])
# How the thread is tangled at the start: one end stays with the player while the other is
# carried through these grid points to the partner. Stored in the layout as plate pixels.
TANGLE = [(11.5, 21.2), (6, 14), (6.3, 10), (9, 9.6), (11.5, 11), (14.5, 11.3), (16, 13),
          (16.5, 16.5), (18.5, 17.5), (21, 15.5), (20.5, 13.5)]
DOOR = [(1327, 326), (1327, 228), (1333, 210), (1346, 198), (1360, 193), (1376, 198), (1390, 212),
        (1401, 232), (1402, 351)]
CHARACTER_HEIGHT = 210  # the man's height in plate pixels, mid floor


def ellipse_pts(cx, cy, rx, ry, a0, a1, n=14):
    return [(cx + rx * math.cos(math.radians(a0 + (a1 - a0) * i / n)),
             cy + ry * math.sin(math.radians(a0 + (a1 - a0) * i / n))) for i in range(n + 1)]


def post_outline(bx, by, top, body=18, ball=20, base=31):
    cy = top + ball
    pts = ellipse_pts(bx, by, base, 16, 0, 180)                        # front of the base
    pts += [(bx - base, by - 14), (bx - body, by - 24), (bx - body, cy + 14)]
    pts += ellipse_pts(bx, cy, ball, ball, 135, 405, 16)               # the brass ball
    pts += [(bx + body, cy + 14), (bx + body, by - 24), (bx + base, by - 14)]
    return pts


def spool_outline(top, base):
    return ellipse_pts(*base, 0, 180) + ellipse_pts(*top, 180, 360)


def main():
    # place the grid so it covers the whole floor
    det = U[0] * V[1] - U[1] * V[0]
    to_grid = lambda p: ((p[0] * V[1] - p[1] * V[0]) / det, (U[0] * p[1] - U[1] * p[0]) / det)
    pts = [to_grid(p) for p in FLOOR + LANDING]
    gx0, gz0 = math.floor(min(p[0] for p in pts)) - 1, math.floor(min(p[1] for p in pts)) - 1
    origin = (gx0 * U[0] + gz0 * V[0], gx0 * U[1] + gz0 * V[1])
    cols = math.ceil(max(p[0] for p in pts)) + 1 - gx0
    rows = math.ceil(max(p[1] for p in pts)) + 1 - gz0
    at = lambda gx, gz: [round(origin[0] + gx * U[0] + gz * V[0], 1), round(origin[1] + gx * U[1] + gz * V[1], 1)]
    x0, z0, x1, z1 = RECT
    corners = CORNERS or [at(x0, z0), at(x1, z0), at(x1, z1), at(x0, z1)]
    cell = lambda p: [int(to_grid(p)[0] - gx0), int(to_grid(p)[1] - gz0)]

    # walkable mask
    mask = Image.new('L', (W, H), 0)
    d = ImageDraw.Draw(mask)
    d.polygon(FLOOR, fill=255)
    d.polygon(LANDING, fill=150)
    for bx, by, _ in POSTS + LANDING_POSTS:
        d.ellipse([bx - 27, by - 13, bx + 27, by + 13], fill=0)
    for cx, cy, rx, ry in EXTRA_BASES + [PILLAR_BASE] + [s[2] for s in SPOOLS]:
        d.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=0)
    for _, foot in CRATES:
        d.polygon(foot, fill=0)
    d.ellipse([523 - 30, 855 - 16, 523 + 30, 855 + 16], fill=0)
    mask.save('assets/plates/thread-room-mask.png')

    # cutout layers. sortY is the ground line: a character whose feet are above it is behind the layer.
    cut = []
    add = lambda name, sort_y, points: cut.append(dict(name=name, sortY=sort_y, points=[[round(x), round(y)] for x, y in points]))
    add('pillar', PILLAR_BASE[1], PILLAR)
    for i, (bx, by, top) in enumerate(POSTS):
        add(f'post_{i + 1}', by, post_outline(bx, by, top))
    for i, (bx, by, top) in enumerate(LANDING_POSTS):
        add(f'landing_post_{i + 1}', by, post_outline(bx, by, top, body=16, ball=18, base=24))
    add('landing_rail', 460, LANDING_RAIL)
    for i, (outline, foot) in enumerate(CRATES):
        add(f'crate_{i + 1}', round(sum(p[1] for p in foot) / 4), outline)
    for name, top, base in SPOOLS:
        add(name, base[1], spool_outline(top, base))
    add('lantern_post', 855, LANTERN_POST)
    for i, (bx, by, top) in enumerate(RAIL_POSTS):
        add(f'rail_post_{i + 1}', 2000, post_outline(bx, by, top, body=23, ball=23, base=30))
    for i, bar in enumerate(RAIL_BARS):
        add(f'rail_bar_{i + 1}', 2000, bar)

    layout = dict(
        size=[W, H],
        calibration=dict(cols=cols, rows=rows, rect=RECT, corners=corners),
        raisedLift=LANDING_LIFT,
        characterHeight=CHARACTER_HEIGHT,
        spawns=SPAWN_CELLS,
        thread=dict(
            maxLength=THREAD_LENGTH,
            # x, y: the peg's base on the plate. r: thickness in cells. height: where the thread sits, in pixels.
            pegs=[dict(id=name, x=POSTS[i][0], y=POSTS[i][1], r=0.35, height=46, top=POSTS[i][2] + 20) for name, i in ACTIVE_POSTS.items()],
            pillar=dict(x=PILLAR_BASE[0], y=PILLAR_BASE[1], radius=1.05, sides=8, height=64),
            tangle=[at(gx, gz) for gx, gz in TANGLE],
        ),
        door=dict(points=[list(p) for p in DOOR], sortY=340, glow=dict(x=1364, y=285, r=150)),
        # a faint ghost of a parent is drawn over this cutout when they stand behind it
        hideBehind=dict(x=PILLAR_BASE[0], halfWidth=120, sortY=PILLAR_BASE[1]),
        glows=[dict(x=x, y=y, r=r) for x, y, r in GLOWS],
        pools=[dict(x=x, y=y, r=r) for x, y, r in POOLS],
        cutouts=cut,
    )
    text = json.dumps(layout, indent=1)
    # keep each point list on one line so the file stays readable
    import re
    text = re.sub(r'\[\s+(-?[\d.]+),\s+(-?[\d.]+)\s+\]', r'[\1, \2]', text)
    text = re.sub(r'\],\s+\[', '], [', text)
    open('assets/plates/thread-room.json', 'w').write(text + '\n')
    print('grid', cols, 'x', rows, 'corners', corners, 'spawns', layout['spawns'])

    if len(sys.argv) > 1:  # preview: plate with the mask tint and outlines
        im = Image.open(PLATE).convert('RGB')
        tint = Image.new('RGB', (W, H), (0, 255, 120))
        grey = Image.new('RGB', (W, H), (0, 120, 255))
        im = Image.composite(tint, im, mask.point(lambda v: 70 if v > 200 else 0))
        im = Image.composite(grey, im, mask.point(lambda v: 90 if 100 < v <= 200 else 0))
        dr = ImageDraw.Draw(im)
        for c in cut:
            dr.line([tuple(p) for p in c['points']] + [tuple(c['points'][0])], fill=(255, 255, 0), width=1)
        for i in range(cols + 1):
            dr.line([tuple(at(i, 0)), tuple(at(i, rows))], fill=(255, 255, 255), width=1)
        for j in range(rows + 1):
            dr.line([tuple(at(0, j)), tuple(at(cols, j))], fill=(255, 255, 255), width=1)
        im.save(sys.argv[1])


main()
